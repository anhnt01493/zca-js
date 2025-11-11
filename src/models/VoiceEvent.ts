export type VoiceEvent = {
    event: string,
    uid: string,
    callId: string,
    status: string,
    ts: string,
    call_direction: string
}

export type TVoiceEvent = {
    uidN: string,
    callId: string,
    status: string,
    ts: string,
    codec: any
}

export function initVoiceEvent (act: string, data: TVoiceEvent): VoiceEvent {
    let direction = "";
    if (act === "answer") {
        if (+data.status === 3) {
            direction = data.codec?.length === 0 ? "out" : "in"
        } else if (+data.status === 0) {
            direction = "out"
        }
    }
    return {
        event: act,
        uid: data.uidN,
        callId: data.callId,
        status: data.status,
        ts: data.ts,
        call_direction: direction
    }
}