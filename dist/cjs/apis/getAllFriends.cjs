'use strict';

var utils = require('../utils.cjs');

const getAllFriendsFactory = utils.apiFactory()((api, _, utils) => {
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.profile[0]}/api/social/friend/getfriends`);
    return async function getAllFriends() {
        const response = await utils.request(serviceURL, {
            method: "GET",
        });
        return utils.resolve(response);
    };
});

exports.getAllFriendsFactory = getAllFriendsFactory;
