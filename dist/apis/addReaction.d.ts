import { UserMessage } from "../models/Message.js";
import { Reactions } from "../models/Reaction.js";
export type AddReactionResponse = {
    msgIds: string;
};
export declare const addReactionFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (icon: Reactions, message: UserMessage) => Promise<AddReactionResponse>;
