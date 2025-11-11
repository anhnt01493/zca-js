export function initVoiceEvent(act, data) {
    var _a;
    let direction = "";
    if (act === "answer") {
        if (+data.status === 3) {
            direction = ((_a = data.codec) === null || _a === void 0 ? void 0 : _a.length) === 0 ? "out" : "in";
        }
        else if (+data.status === 0) {
            direction = "out";
        }
    }
    return {
        event: act,
        uid: data.uidN,
        callId: data.callId,
        status: data.status,
        ts: data.ts,
        call_direction: direction
    };
}
