import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";

export type GetRequestedFriendsResponse = {
    userId: string;
    username: string;
    displayName: string;
    zaloName: string;
    avatar: string;
    bgavatar: string;
    cover: string;
    gender: number;
    dob: number;
    sdob: string;
    status: string;
    phoneNumber: string;
    isFr: number;
    isBlocked: number;
    lastActionTime: number;
    lastUpdateTime: number;
    isActive: number;
    key: number;
    type: number;
    isActivePC: number;
    isActiveWeb: number;
    isValid: number;
    userKey: string;
    accountStatus: number;
    oaInfo: any;
    user_mode: number;
    globalId: string;
    bizPkg: {
        label: any;
        pkgId: number;
    };
    createdTs: number;
    oa_status: any;
}[];

export const getRequestedFriendsFactory = apiFactory<GetRequestedFriendsResponse>()((api, ctx, utils) => {
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
        if (!encryptedParams) throw new ZaloApiError("Failed to encrypt message");

        const url = utils.makeURL(serviceURL, {
            params: encryptedParams,
        })

        const response = await utils.request(
            url,
            {
                method: "GET",
            },
        );

        return utils.resolve(response);
    };
});
