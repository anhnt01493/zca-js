import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";
export const getRequestedFriendsFactory = apiFactory()((api, ctx, utils) => {
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
            throw new ZaloApiError("Failed to encrypt message");
        const url = utils.makeURL(serviceURL, {
            params: encryptedParams,
        });
        const response = await utils.request(url, {
            method: "GET",
        });
        return utils.resolve(response);
    };
});
