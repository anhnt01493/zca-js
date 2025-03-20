import { GroupMessage, UserMessage } from "../models/index.js";
export type DeleteMessageResponse = {
    status: number;
};
export declare const deleteMessageFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (message: UserMessage | GroupMessage, onlyMe?: boolean) => Promise<DeleteMessageResponse>;
