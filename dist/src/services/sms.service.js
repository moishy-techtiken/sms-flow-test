"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
const env_1 = require("../lib/env");
function getSignalWireClient() {
    const { RestClient } = require("@signalwire/compatibility-api");
    return RestClient((0, env_1.getRequiredEnv)("SIGNALWIRE_PROJECT_ID"), (0, env_1.getRequiredEnv)("SIGNALWIRE_API_TOKEN"), {
        signalwireSpaceUrl: (0, env_1.getRequiredEnv)("SIGNALWIRE_SPACE_URL")
    });
}
async function sendSms(input) {
    const client = getSignalWireClient();
    const response = await client.messages.create({
        from: input.from,
        to: input.to,
        body: input.body
    });
    console.info("outbound_sms_sent", {
        provider: "signalwire",
        from: input.from,
        to: input.to,
        providerMessageId: response.sid ?? null
    });
    return {
        provider: "signalwire",
        providerMessageId: response.sid ?? null
    };
}
