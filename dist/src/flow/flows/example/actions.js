"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleActions = void 0;
exports.exampleActions = {
    async notifyExampleAdmin({ context, conversation, services }) {
        const adminPhone = process.env.EXAMPLE_ADMIN_PHONE;
        const name = typeof context.name === "string" ? context.name : "Unknown";
        if (!adminPhone) {
            return {
                ok: true,
                contextPatch: {
                    notifiedAdmin: false
                }
            };
        }
        await services.sendSms({
            from: conversation.servicePhoneNumber,
            to: adminPhone,
            body: `Example flow signup: ${name}`
        });
        return {
            ok: true,
            contextPatch: {
                notifiedAdmin: true
            }
        };
    }
};
