import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { GroupMessage, UserMessage, ThreadType } from "../models/index.js";
import { apiFactory, removeUndefinedKeys } from "../utils.js";
export const deleteMessageFactory = apiFactory()((api, ctx, utils) => {
    const serviceURL = {
        [ThreadType.User]: utils.makeURL(`${api.zpwServiceMap.chat[0]}/api/message/delete`),
        [ThreadType.Group]: utils.makeURL(`${api.zpwServiceMap.group[0]}/api/group/deletemsg`),
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
        if (!(message instanceof UserMessage) && !(message instanceof GroupMessage))
            throw new ZaloApiError("Expected Message or GroupMessage instance, got: " + ((_a = message === null || message === void 0 ? void 0 : message.constructor) === null || _a === void 0 ? void 0 : _a.name));
        if (message.isSelf && onlyMe === false)
            throw new ZaloApiError("To delete your message for everyone, use undo api instead");
        const params = {
            toid: message instanceof UserMessage ? message.threadId : undefined,
            grid: message instanceof GroupMessage ? message.threadId : undefined,
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
            imei: message instanceof UserMessage ? ctx.imei : undefined,
        };
        removeUndefinedKeys(params);
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError("Failed to encrypt message");
        const response = await utils.request(serviceURL[message.type], {
            method: "POST",
            body: new URLSearchParams({
                params: encryptedParams,
            }),
        });
        return utils.resolve(response);
    };
});
