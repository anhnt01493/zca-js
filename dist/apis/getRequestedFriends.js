import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";
export const getRequestedFriendsFactory = apiFactory()((api, ctx, utils) => {
    console.log(`${api.zpwServiceMap.friend[0]}/api/friend/requested/list`);
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.friend[0]}/api/friend/requested/list`);
    /**
     * Get all friends
     *
     * @param count Page size (default: 20000)
     * @param page Page number (default: 1)
     *
     * @throws ZaloApiError
     */
    return async function getRequestedFriends() {
        const params = {
            imei: ctx.imei,
        };
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError("Failed to encrypt message");
        const response = await utils.request(utils.makeURL(serviceURL, {
            params: encryptedParams,
        }), {
            method: "GET",
        });
        return utils.resolve(response);
    };
});
