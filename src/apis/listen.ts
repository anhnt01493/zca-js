import EventEmitter from "events";
import WebSocket from "ws";
import { type GroupEvent, initializeGroupEvent, type TGroupEvent } from "../models/GroupEvent.js";
import { type FriendEvent, initializeFriendEvent, type TFriendEvent } from "../models/FriendEvent.js";
import {
    GroupMessage,
    UserMessage,
    Message,
    Reaction,
    Undo,
    ThreadType,
    GroupTyping,
    Typing,
    UserTyping,
} from "../models/index.js";
import { decodeEventData, getFriendEventType, getGroupEventType, logger } from "../utils.js";
import { ZaloApiError } from "../Errors/ZaloApiError.js";
import type { ContextSession } from "../context.js";
import { type SeenMessage, GroupSeenMessage, UserSeenMessage } from "../models/SeenMessage.js";
import { type DeliveredMessage, UserDeliveredMessage, GroupDeliveredMessage } from "../models/DeliveredMessage.js";

type UploadEventData = {
    fileUrl: string;
    fileId: string;
};

export type WsPayload<T = Record<string, unknown>> = {
    version: number;
    cmd: number;
    subCmd: number;
    data: T;
};

export type OnMessageCallback = (message: Message) => any;

export enum CloseReason {
    ManualClosure = 1000,
    DuplicateConnection = 3000,
    KickConnection = 3003
}

interface ListenerEvents {
    connected: [];
    closed: [reason: CloseReason];
    error: [error: any];
    typing: [typing: Typing];
    message: [message: Message];
    old_messages: [messages: Message[]];
    seen_messages: [messages: SeenMessage[]];
    delivered_messages: [messages: DeliveredMessage[]];
    reaction: [reaction: Reaction];
    upload_attachment: [data: UploadEventData];
    undo: [data: Undo];
    friend_event: [data: FriendEvent];
    group_event: [data: GroupEvent];
    cipher_key: [key: string];
}

export class Listener extends EventEmitter<ListenerEvents> {
    private url: string;
    private cookie: string;
    private userAgent: string;

    private ws: WebSocket | null;

    private onConnectedCallback: Function;
    private onClosedCallback: Function;
    private onErrorCallback: Function;
    private onMessageCallback: OnMessageCallback;
    private cipherKey?: string;

    private selfListen;
    private pingInterval?: Timer;

    private id = 0;

    constructor(
        private ctx: ContextSession,
        url: string,
    ) {
        super();
        if (!ctx.cookie) throw new Error("Cookie is not available");
        if (!ctx.userAgent) throw new Error("User agent is not available");

        this.url = url;
        this.cookie = ctx.cookie.getCookieStringSync("https://chat.zalo.me");
        this.userAgent = ctx.userAgent;

        this.selfListen = ctx.options.selfListen;

        this.ws = null;

        this.onConnectedCallback = () => {};
        this.onClosedCallback = () => {};
        this.onErrorCallback = () => {};
        this.onMessageCallback = () => {};
    }

    public onConnected(cb: Function) {
        this.onConnectedCallback = cb;
    }

    public onClosed(cb: Function) {
        this.onClosedCallback = cb;
    }

    public onError(cb: Function) {
        this.onErrorCallback = cb;
    }

    public onMessage(cb: OnMessageCallback) {
        this.onMessageCallback = cb;
    }

    public start() {
        if (this.ws) throw new ZaloApiError("Already started");
        const ws = new WebSocket(this.url, {
            headers: {
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                connection: "Upgrade",
                host: new URL(this.url).host,
                origin: "https://chat.zalo.me",
                prgama: "no-cache",
                "sec-websocket-extensions": "permessage-deflate; client_max_window_bits",
                "sec-websocket-version": "13",
                upgrade: "websocket",
                "user-agent": this.userAgent,
                cookie: this.cookie,
            },
        });
        this.ws = ws;

        ws.onopen = () => {
            this.onConnectedCallback();
            this.emit("connected");
        };

        ws.onclose = (event) => {
            this.onClosedCallback(event.reason);
            this.emit("closed", event.code as CloseReason);
        };

        ws.onerror = (event) => {
            this.onErrorCallback(event);
            this.emit("error", event);
        };

        ws.onmessage = async (event) => {
            const { data } = event;
            if (!(data instanceof Buffer)) return;

            const encodedHeader = data.subarray(0, 4);
            const [version, cmd, subCmd] = getHeader(encodedHeader);

            try {
                const dataToDecode = data.subarray(4);
                const decodedData = new TextDecoder("utf-8").decode(dataToDecode);
                if (decodedData.length == 0) return;

                const parsed = JSON.parse(decodedData);

                if (version == 1 && cmd == 1 && subCmd == 1 && parsed.hasOwnProperty("key")) {
                    this.cipherKey = parsed.key;
                    this.emit("cipher_key", parsed.key);

                    if (this.pingInterval) clearInterval(this.pingInterval);

                    const ping = () => {
                        const payload = {
                            version: 1,
                            cmd: 2,
                            subCmd: 1,
                            data: { eventId: Date.now() },
                        };
                        this.sendWs(payload, false);
                    };

                    this.pingInterval = setInterval(
                        () => {
                            ping();
                        },
                        3 * 60 * 1000,
                    );
                }

                if (version == 1 && cmd == 501 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { msgs } = parsedData;
                    for (const msg of msgs) {
                        if (typeof msg.content == "object" && msg.content.hasOwnProperty("deleteMsg")) {
                            const undoObject = new Undo(this.ctx.uid, msg, false);
                            if (undoObject.isSelf && !this.selfListen) continue;
                            this.emit("undo", undoObject);
                        } else {
                            const messageObject = new UserMessage(this.ctx.uid, msg);
                            if (messageObject.isSelf && !this.selfListen) continue;
                            this.onMessageCallback(messageObject);
                            this.emit("message", messageObject);
                        }
                    }
                }

                if (version == 1 && cmd == 521 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { groupMsgs } = parsedData;
                    for (const msg of groupMsgs) {
                        if (typeof msg.content == "object" && msg.content.hasOwnProperty("deleteMsg")) {
                            const undoObject = new Undo(this.ctx.uid, msg, true);
                            if (undoObject.isSelf && !this.selfListen) continue;
                            this.emit("undo", undoObject);
                        } else {
                            const messageObject = new GroupMessage(this.ctx.uid, msg);
                            if (messageObject.isSelf && !this.selfListen) continue;
                            this.onMessageCallback(messageObject);
                            this.emit("message", messageObject);
                        }
                    }
                }

                if (version == 1 && cmd == 601 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { controls } = parsedData;
                    for (const control of controls) {
                        if (control.content.act_type == "file_done") {
                            const data = {
                                fileUrl: control.content.data.url,
                                fileId: control.content.fileId,
                            };

                            const uploadCallback = this.ctx.uploadCallbacks.get(String(control.content.fileId));
                            if (uploadCallback) uploadCallback(data);
                            this.ctx.uploadCallbacks.delete(String(control.content.fileId));

                            this.emit("upload_attachment", data);
                        } else if (control.content.act_type == "group") {
                            // 31/08/2024
                            // for some reason, Zalo send both join and join_reject event when admin approve join requests
                            // Zalo itself doesn't seem to handle this properly either, so we gonna ignore the join_reject event

                            if (control.content.act == "join_reject") continue;

                            const groupEventData: TGroupEvent =
                                typeof control.content.data == "string"
                                    ? JSON.parse(control.content.data)
                                    : control.content.data;

                            const groupEvent = initializeGroupEvent(
                                this.ctx.uid,
                                groupEventData,
                                getGroupEventType(control.content.act),
                            );
                            if (groupEvent.isSelf && !this.selfListen) continue;
                            this.emit("group_event", groupEvent);
                        } else if (control.content.act_type == "fr") {
                            // 28/02/2025
                            // Zalo send both req and req_v2 event when user send friend request
                            // Zalo itself doesn't seem to handle this properly either, so we gonna ignore the req event

                            if (control.content.act == "req") continue;

                            const friendEventData: TFriendEvent =
                                typeof control.content.data == "string"
                                    ? JSON.parse(control.content.data)
                                    : control.content.data;

                            // Handles the case when act is "pin_create" and params is a string
                            if (
                                typeof friendEventData == "object" &&
                                "topic" in friendEventData &&
                                typeof friendEventData.topic == "object" &&
                                "params" in friendEventData.topic
                            ) {
                                friendEventData.topic.params = JSON.parse(`${friendEventData.topic.params}`);
                            }

                            const friendEvent = initializeFriendEvent(
                                this.ctx.uid,
                                friendEventData,
                                getFriendEventType(control.content.act),
                            );
                            if (friendEvent.isSelf && !this.selfListen) continue;
                            this.emit("friend_event", friendEvent);
                        }
                    }
                }

                if (cmd == 612) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { reacts, reactGroups } = parsedData;

                    for (const react of reacts) {
                        react.content = JSON.parse(react.content);
                        const reactionObject = new Reaction(this.ctx.uid, react, false);
                        if (reactionObject.isSelf && !this.selfListen) continue;

                        this.emit("reaction", reactionObject);
                    }

                    for (const reactGroup of reactGroups) {
                        reactGroup.content = JSON.parse(reactGroup.content);
                        const reactionObject = new Reaction(this.ctx.uid, reactGroup, true);
                        if (reactionObject.isSelf && !this.selfListen) continue;

                        this.emit("reaction", reactionObject);
                    }
                }

                if (version == 1 && cmd == 3000 && subCmd == 0) {
                    console.log();
                    logger(this.ctx).error("Another connection is opened, closing this one");
                    console.log();
                    if (ws.readyState !== WebSocket.CLOSED) ws.close(CloseReason.DuplicateConnection);
                }

                if (cmd == 510 && subCmd == 1) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { msgs } = parsedData;
                    const responseMsgs = msgs.map((msg: any) => new UserMessage(this.ctx.uid, msg));
                    this.emit("old_messages", responseMsgs);
                }

                if (cmd == 511 && subCmd == 1) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { groupMsgs } = parsedData;
                    const responseMsgs = groupMsgs.map((msg: any) => new GroupMessage(this.ctx.uid, msg));
                    this.emit("old_messages", responseMsgs);
                }

                if (cmd == 602 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { actions } = parsedData;

                    for (const action of actions) {
                        const data = JSON.parse(`{${action.data}}`);
                        if (action.act_type == "typing") {
                            if (action.act == "typing") {
                                const typingObject = new UserTyping(data);
                                this.emit("typing", typingObject);
                            } else if (action.act == "gtyping") {
                                // 26/02/2025
                                // For a group with only two people, Zalo doesn't send a typing event.

                                const typingObject = new GroupTyping(data);
                                this.emit("typing", typingObject);
                            }
                        }
                    }
                }

                if (cmd == 502 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { delivereds: deliveredMsgs, seens: seenMsgs } = parsedData;

                    if (Array.isArray(deliveredMsgs) && deliveredMsgs.length > 0) {
                        let deliveredObjects = deliveredMsgs.map(
                            (delivered: any) => new UserDeliveredMessage(delivered),
                        );
                        this.emit("delivered_messages", deliveredObjects);
                    }

                    if (Array.isArray(seenMsgs) && seenMsgs.length > 0) {
                        let seenObjects = seenMsgs.map((seen: any) => new UserSeenMessage(seen));
                        this.emit("seen_messages", seenObjects);
                    }
                }

                if (cmd == 522 && subCmd == 0) {
                    const parsedData = (await decodeEventData(parsed, this.cipherKey)).data;
                    const { delivereds: deliveredMsgs, groupSeens: groupSeenMsgs } = parsedData;

                    if (Array.isArray(deliveredMsgs) && deliveredMsgs.length > 0) {
                        let deliveredObjects = deliveredMsgs.map(
                            (delivered: any) => new GroupDeliveredMessage(this.ctx.uid, delivered),
                        );
                        if (!this.selfListen)
                            deliveredObjects = deliveredObjects.filter((delivered) => !delivered.isSelf);
                        this.emit("delivered_messages", deliveredObjects);
                    }

                    if (Array.isArray(groupSeenMsgs) && groupSeenMsgs.length > 0) {
                        let seenObjects = groupSeenMsgs.map((seen: any) => new GroupSeenMessage(this.ctx.uid, seen));
                        if (!this.selfListen) seenObjects = seenObjects.filter((seen) => !seen.isSelf);
                        this.emit("seen_messages", seenObjects);
                    }
                }
            } catch (error) {
                this.onErrorCallback(error);
                this.emit("error", error);
            }
        };
    }

    public stop() {
        if (this.ws) {
            this.ws.close(CloseReason.ManualClosure);
            this.ws = null;
        }
    }

    public sendWs(payload: WsPayload, requireId: boolean = true) {
        if (this.ws) {
            if (requireId) payload.data["req_id"] = `req_${this.id++}`;

            const encodedData = new TextEncoder().encode(JSON.stringify(payload.data));
            const dataLength = encodedData.length;

            const data = new DataView(Buffer.alloc(4 + dataLength).buffer);
            data.setUint8(0, payload.version);
            data.setInt32(1, payload.cmd, true);
            data.setInt8(3, payload.subCmd);

            encodedData.forEach((e, i) => {
                data.setUint8(4 + i, e);
            });

            this.ws.send(data);
        }
    }

    /**
     * Request old messages
     *
     * @param lastMsgId
     */
    public requestOldMessages(threadType: ThreadType, lastMsgId: string | null = null) {
        const payload = {
            version: 1,
            cmd: threadType === ThreadType.User ? 510 : 511,
            subCmd: 1,
            data: { first: true, lastId: lastMsgId, preIds: [] },
        };
        this.sendWs(payload);
    }

    public getConnectionInfo() {
        let data = {
            secretKey: this.ctx.secretKey,
            uuid: this.ctx.uid,
            zpwServiceMap: this.ctx.zpwServiceMap
        }

        return data
    }
}

function getHeader(buffer: Buffer) {
    if (buffer.byteLength < 4) {
        throw new Error("Invalid header");
    }

    return [buffer[0], buffer.readUInt16LE(1), buffer[3]];
}
