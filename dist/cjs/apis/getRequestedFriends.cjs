'use strict';

var ZaloApiError = require('../Errors/ZaloApiError.cjs');
var utils = require('../utils.cjs');

const getRequestedFriendsFactory = utils.apiFactory()((api, ctx, utils) => {
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.friend[0]}/api/friend/recommendsv2/list`);
    /**
     * Get requested friends
     *
     *
     * @throws ZaloApiError
     */
    return async function getRequestedFriends() {
        const params = {
            imei: ctx.imei,
        };
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError.ZaloApiError("Failed to encrypt message");
        const url = utils.makeURL(serviceURL, {
            params: encryptedParams,
        });
        console.log(url);
        const response = await utils.request(url, {
            method: "GET",
        });
        console.log(response);
        return utils.resolve(response);
    };
});

exports.getRequestedFriendsFactory = getRequestedFriendsFactory;
