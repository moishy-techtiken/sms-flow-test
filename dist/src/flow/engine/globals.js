"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionRegistry = exports.RESTARTED_MESSAGE = exports.NO_ACTIVE_CONVERSATION_MESSAGE = exports.CANCEL_MESSAGE = exports.OPTED_OUT_MESSAGE = exports.STOP_MESSAGE = exports.HELP_MESSAGE = exports.GLOBAL_COMMANDS = void 0;
exports.getGlobalCommand = getGlobalCommand;
exports.GLOBAL_COMMANDS = {
    STOP: "STOP",
    HELP: "HELP",
    RESTART: "RESTART",
    CANCEL: "CANCEL"
};
exports.HELP_MESSAGE = "Reply START to begin. Reply STOP to opt out. Reply CANCEL to end the current conversation.";
exports.STOP_MESSAGE = "You have been opted out and will no longer receive messages.";
exports.OPTED_OUT_MESSAGE = "You are opted out. Contact support to be re-enabled.";
exports.CANCEL_MESSAGE = "Your active conversation has been cancelled.";
exports.NO_ACTIVE_CONVERSATION_MESSAGE = "There is no active conversation.";
exports.RESTARTED_MESSAGE = "Your conversation was restarted. Send a trigger keyword to begin again.";
exports.conditionRegistry = {
    isNameConfirmed({ context }) {
        return context.nameConfirmed === true;
    },
    appointmentCountIsPositive({ context }) {
        return (typeof context.appointmentCount === "number" && context.appointmentCount > 0);
    }
};
function getGlobalCommand(body) {
    const normalized = body.trim().toUpperCase();
    if (normalized in exports.GLOBAL_COMMANDS) {
        return normalized;
    }
    return null;
}
