"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const processIncomingMessage_1 = require("../flow/engine/processIncomingMessage");
const env_1 = require("../lib/env");
const normalizePhone_1 = require("../lib/normalizePhone");
const router = (0, express_1.Router)();
const signalWireWebhookSchema = zod_1.z
    .object({
    MessageSid: zod_1.z.string().min(1),
    From: zod_1.z.string().min(1),
    To: zod_1.z.string().min(1),
    Body: zod_1.z.string().default("")
})
    .passthrough();
function getSignalWireRestClient() {
    const { RestClient } = require("@signalwire/compatibility-api");
    return RestClient;
}
function isSignalWireWebhookBody(body) {
    return !!body && typeof body === "object" && "From" in body && "To" in body;
}
function getRequestUrl(req) {
    return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}
function verifySignalWireSignature(req) {
    const signature = req.get("x-signalwire-signature");
    if (!signature) {
        return false;
    }
    const signalWire = getSignalWireRestClient();
    return signalWire.validateRequest((0, env_1.getRequiredEnv)("SIGNALWIRE_SIGNING_KEY"), signature, getRequestUrl(req), req.body);
}
router.post("/inbound", async (req, res) => {
    try {
        if (!isSignalWireWebhookBody(req.body)) {
            return res.status(400).json({
                ok: false,
                error: "Expected a SignalWire inbound webhook payload."
            });
        }
        // if (!verifySignalWireSignature(req)) {
        //   return res.status(401).json({
        //     ok: false,
        //     error: "Invalid SignalWire signature."
        //   });
        // }
        const parsed = signalWireWebhookSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                ok: false,
                error: "Invalid SignalWire webhook body.",
                issues: parsed.error.flatten()
            });
        }
        if (!parsed.data.Body.trim()) {
            return res.status(400).json({
                ok: false,
                error: "Message body cannot be empty."
            });
        }
        console.info("signalwire_inbound_received", {
            provider: "signalwire",
            providerMessageId: parsed.data.MessageSid,
            fromNumber: parsed.data.From,
            toNumber: parsed.data.To
        });
        const result = await (0, processIncomingMessage_1.processIncomingMessage)({
            provider: "signalwire",
            providerMessageId: parsed.data.MessageSid,
            fromNumber: (0, normalizePhone_1.normalizePhone)(parsed.data.From),
            toNumber: (0, normalizePhone_1.normalizePhone)(parsed.data.To),
            body: parsed.data.Body.trim(),
            rawPayload: parsed.data
        });
        return res.json({
            ok: true,
            ...result
        });
    }
    catch (error) {
        console.error("Failed to process inbound SMS", error);
        return res.status(500).json({
            ok: false,
            error: "Internal server error."
        });
    }
});
exports.default = router;
