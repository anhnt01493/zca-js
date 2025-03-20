import { apiFactory } from "../utils.js";
export const getAllFriendsFactory = apiFactory()((api, _, utils) => {
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.profile[0]}/api/social/friend/getfriends`);
    return async function getAllFriends() {
        const response = await utils.request(serviceURL, {
            method: "GET",
        });
        return utils.resolve(response);
    };
});
