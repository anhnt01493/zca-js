import EventEmitter from "events";
import { type GroupEvent } from "../models/GroupEvent.js";
import { type FriendEvent } from "../models/FriendEvent.js";
import { Message, Reaction, Undo, ThreadType, Typing } from "../models/index.js";
import type { ContextSession } from "../context.js";
import { type SeenMessage } from "../models/SeenMessage.js";
import { type DeliveredMessage } from "../models/DeliveredMessage.js";
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
export declare enum CloseReason {
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
export declare class Listener extends EventEmitter<ListenerEvents> {
    private ctx;
    private url;
    private cookie;
    private userAgent;
    private ws;
    private onConnectedCallback;
    private onClosedCallback;
    private onErrorCallback;
    private onMessageCallback;
    private cipherKey?;
    private selfListen;
    private pingInterval?;
    private id;
    constructor(ctx: ContextSession, url: string);
    onConnected(cb: Function): void;
    onClosed(cb: Function): void;
    onError(cb: Function): void;
    onMessage(cb: OnMessageCallback): void;
    start(): void;
    stop(): void;
    sendWs(payload: WsPayload, requireId?: boolean): void;
    /**
     * Request old messages
     *
     * @param lastMsgId
     */
    requestOldMessages(threadType: ThreadType, lastMsgId?: string | null): void;
}
export {};
