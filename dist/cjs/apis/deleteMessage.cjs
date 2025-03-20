'use strict';

var ZaloApiError = require('../Errors/ZaloApiError.cjs');
var Enum = require('../models/Enum.cjs');
require('../models/FriendEvent.cjs');
require('../models/GroupEvent.cjs');
var Message = require('../models/Message.cjs');
require('../models/Reaction.cjs');
var utils = require('../utils.cjs');

const deleteMessageFactory = utils.apiFactory()((api, ctx, utils$1) => {
    const serviceURL = {
        [Enum.ThreadType.User]: utils$1.makeURL(`${api.zpwServiceMap.chat[0]}/api/message/delete`),
        [Enum.ThreadType.Group]: utils$1.makeURL(`${api.zpwServiceMap.group[0]}/api/group/deletemsg`),
    };
    /**
     * Delete a message
     *
     * @param message Message or GroupMessage instance
     * @param onlyMe Delete message for only you
     *
     * @throws ZaloApiError
     */
    return async function deleteMessage(message, onlyMe = true) {
        var _a;
        if (!(message instanceof Message.UserMessage) && !(message instanceof Message.GroupMessage))
            throw new ZaloApiError.ZaloApiError("Expected Message or GroupMessage instance, got: " + ((_a = message === null || message === void 0 ? void 0 : message.constructor) === null || _a === void 0 ? void 0 : _a.name));
        if (message.isSelf && onlyMe === false)
            throw new ZaloApiError.ZaloApiError("To delete your message for everyone, use undo api instead");
        const params = {
            toid: message instanceof Message.UserMessage ? message.threadId : undefined,
            grid: message instanceof Message.GroupMessage ? message.threadId : undefined,
            cliMsgId: Date.now(),
            msgs: [
                {
                    cliMsgId: String(message.data.cliMsgId),
                    globalMsgId: String(message.data.msgId),
                    ownerId: String(message.data.uidFrom),
                    destId: String(message.threadId),
                },
            ],
            onlyMe: onlyMe ? 1 : 0,
            imei: message instanceof Message.UserMessage ? ctx.imei : undefined,
        };
        utils.removeUndefinedKeys(params);
        const encryptedParams = utils$1.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError.ZaloApiError("Failed to encrypt message");
        const response = await utils$1.request(serviceURL[message.type], {
            method: "POST",
            body: new URLSearchParams({
                params: encryptedParams,
            }),
        });
        return utils$1.resolve(response);
    };
});

exports.deleteMessageFactory = deleteMessageFactory;
