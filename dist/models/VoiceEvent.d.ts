export type VoiceEvent = {
    event: string;
    uid: string;
    callId: string;
    status: string;
    ts: string;
    call_direction: string;
};
export type TVoiceEvent = {
    uidN: string;
    callId: string;
    status: string;
    ts: string;
    codec: any;
};
export declare function initVoiceEvent(act: string, data: TVoiceEvent): VoiceEvent;
