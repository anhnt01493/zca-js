import type { Agent } from "http";
import type { CookieJar } from "tough-cookie";
type UploadEventData = {
    fileUrl: string;
    fileId: string;
};
export type UploadCallback = (data: UploadEventData) => any;
type ShareFileSettings = {
    big_file_domain_list: string[];
    max_size_share_file_v2: number;
    max_size_share_file_v3: number;
    file_upload_show_icon_1GB: boolean;
    restricted_ext: string;
    next_file_time: number;
    max_file: number;
    max_size_photo: number;
    max_size_share_file: number;
    max_size_resize_photo: number;
    max_size_gif: number;
    max_size_original_photo: number;
    chunk_size_file: number;
    restricted_ext_file: string[];
};
type ExtraVer = {
    phonebook: number;
    conv_label: string;
    friend: string;
    ver_sticker_giphy_suggest: number;
    ver_giphy_cate: number;
    alias: string;
    ver_sticker_cate_list: number;
    block_friend: string;
};
export type AppContextBase = {
    uid: string;
    imei: string;
    cookie: CookieJar;
    userAgent: string;
    language: string;
    secretKey: string | null;
    zpwServiceMap: Record<string, string[]>;
    settings: {
        [key: string]: any;
        features: {
            [key: string]: any;
            sharefile: ShareFileSettings;
        };
    };
    extraVer: ExtraVer;
};
export type Options = {
    selfListen: boolean;
    checkUpdate: boolean;
    logging: boolean;
    apiType: number;
    apiVersion: number;
    /**
     * Optional agent configuration.
     * - When using `Bun`, this should be a string.
     * - In other environments, this should be an `Agent` instance.
     */
    agent?: Agent | string;
    /**
     * Optional fetch implementation for polyfills in non-standard environments.
     * If using proxy, `node-fetch` is highly recommended.
     */
    polyfill: typeof fetch;
};
declare class CallbacksMap extends Map<string, UploadCallback> {
    /**
     * @param ttl Time to live in milliseconds. Default is 5 minutes.
     */
    set(key: string, value: UploadCallback, ttl?: number): this;
}
export type AppContextExtended = {
    uploadCallbacks: CallbacksMap;
    options: Options;
    readonly API_TYPE: number;
    readonly API_VERSION: number;
};
export type ContextBase = Partial<AppContextBase> & AppContextExtended;
export declare const createContext: (apiType?: number, apiVersion?: number) => ContextBase;
export type ContextSession = AppContextBase & AppContextExtended & {
    secretKey: string;
};
export declare function isContextSession(ctx: ContextBase): ctx is ContextSession;
export declare const MAX_MESSAGES_PER_SEND = 50;
export {};
