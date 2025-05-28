export class ZaloApiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = message || "ZcaApiError";
        this.code = code || null;
    }
}
