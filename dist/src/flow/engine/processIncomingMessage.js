"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIncomingMessage = processIncomingMessage;
const client_1 = require("../../../generated/prisma/client");
const conversation_repo_1 = require("../../repositories/conversation.repo");
const message_repo_1 = require("../../repositories/message.repo");
const optOut_repo_1 = require("../../repositories/optOut.repo");
const sms_service_1 = require("../../services/sms.service");
const continueFlow_1 = require("./continueFlow");
const globals_1 = require("./globals");
const flowRegistry_1 = require("./flowRegistry");
const startFlow_1 = require("./startFlow");
async function sendOutboundReply(input) {
    if (!input.body) {
        return null;
    }
    const result = await (0, sms_service_1.sendSms)({
        from: input.fromNumber,
        to: input.toNumber,
        body: input.body
    });
    await (0, message_repo_1.createMessage)({
        conversationId: input.conversationId ?? null,
        direction: client_1.MessageDirection.outbound,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        fromNumber: input.fromNumber,
        toNumber: input.toNumber,
        body: input.body,
        rawPayload: result
    });
    return input.body;
}
function isDuplicateMessageError(error) {
    return (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002");
}
async function processIncomingMessage(input) {
    console.info("process_incoming_message", {
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        userPhoneNumber: input.fromNumber,
        servicePhoneNumber: input.toNumber
    });
    if (input.providerMessageId) {
        const existingMessage = await (0, message_repo_1.findMessageByProviderAndMessageId)(input.provider, input.providerMessageId);
        if (existingMessage) {
            return {
                status: "duplicate",
                conversationId: existingMessage.conversationId,
                outboundBody: null
            };
        }
    }
    let inboundMessage;
    try {
        inboundMessage = await (0, message_repo_1.createMessage)({
            direction: client_1.MessageDirection.inbound,
            provider: input.provider,
            providerMessageId: input.providerMessageId,
            fromNumber: input.fromNumber,
            toNumber: input.toNumber,
            body: input.body,
            rawPayload: input.rawPayload
        });
    }
    catch (error) {
        if (!input.providerMessageId || !isDuplicateMessageError(error)) {
            throw error;
        }
        const existingMessage = await (0, message_repo_1.findMessageByProviderAndMessageId)(input.provider, input.providerMessageId);
        if (!existingMessage) {
            throw error;
        }
        console.info("duplicate_inbound_message", {
            provider: input.provider,
            providerMessageId: input.providerMessageId,
            conversationId: existingMessage.conversationId
        });
        return {
            status: "duplicate",
            conversationId: existingMessage.conversationId,
            outboundBody: null
        };
    }
    const command = (0, globals_1.getGlobalCommand)(input.body);
    if (command === "HELP") {
        const outboundBody = await sendOutboundReply({
            fromNumber: input.toNumber,
            toNumber: input.fromNumber,
            body: globals_1.HELP_MESSAGE
        });
        return {
            status: "global",
            command,
            outboundBody
        };
    }
    if (command === "STOP") {
        const activeConversation = await (0, conversation_repo_1.findActiveConversation)(input.fromNumber, input.toNumber);
        if (activeConversation) {
            await (0, conversation_repo_1.cancelConversation)(activeConversation.id);
            await (0, message_repo_1.attachConversationToMessage)(inboundMessage.id, activeConversation.id);
        }
        await (0, optOut_repo_1.createOrUpdateOptOut)(input.fromNumber, input.toNumber, "STOP");
        const outboundBody = await sendOutboundReply({
            conversationId: activeConversation?.id ?? null,
            fromNumber: input.toNumber,
            toNumber: input.fromNumber,
            body: globals_1.STOP_MESSAGE
        });
        return {
            status: "global",
            command,
            conversationId: activeConversation?.id ?? null,
            outboundBody
        };
    }
    if (command === "CANCEL") {
        const activeConversation = await (0, conversation_repo_1.findActiveConversation)(input.fromNumber, input.toNumber);
        if (!activeConversation) {
            const outboundBody = await sendOutboundReply({
                fromNumber: input.toNumber,
                toNumber: input.fromNumber,
                body: globals_1.NO_ACTIVE_CONVERSATION_MESSAGE
            });
            return {
                status: "global",
                command,
                outboundBody
            };
        }
        await (0, conversation_repo_1.cancelConversation)(activeConversation.id);
        await (0, message_repo_1.attachConversationToMessage)(inboundMessage.id, activeConversation.id);
        const outboundBody = await sendOutboundReply({
            conversationId: activeConversation.id,
            fromNumber: input.toNumber,
            toNumber: input.fromNumber,
            body: globals_1.CANCEL_MESSAGE
        });
        return {
            status: "global",
            command,
            conversationId: activeConversation.id,
            outboundBody
        };
    }
    let activeConversation = await (0, conversation_repo_1.findActiveConversation)(input.fromNumber, input.toNumber);
    if (command === "RESTART" && activeConversation) {
        await (0, conversation_repo_1.cancelConversation)(activeConversation.id);
        await (0, message_repo_1.attachConversationToMessage)(inboundMessage.id, activeConversation.id);
        activeConversation = null;
    }
    const optedOut = await (0, optOut_repo_1.findOptOut)(input.fromNumber, input.toNumber);
    if (optedOut) {
        const outboundBody = await sendOutboundReply({
            fromNumber: input.toNumber,
            toNumber: input.fromNumber,
            body: globals_1.OPTED_OUT_MESSAGE
        });
        return {
            status: "opted_out",
            outboundBody
        };
    }
    if (activeConversation && command !== "RESTART") {
        await (0, message_repo_1.attachConversationToMessage)(inboundMessage.id, activeConversation.id);
        const result = await (0, continueFlow_1.continueFlow)({
            conversation: activeConversation,
            inboundBody: input.body
        });
        const outboundBody = await sendOutboundReply({
            conversationId: result.conversation.id,
            fromNumber: input.toNumber,
            toNumber: input.fromNumber,
            body: result.outboundBody
        });
        return {
            status: "continued",
            flowId: result.conversation.flowId,
            conversationId: result.conversation.id,
            outboundBody
        };
    }
    const flow = (0, flowRegistry_1.findFlowByKeyword)(input.body);
    if (!flow) {
        if (command === "RESTART") {
            const outboundBody = await sendOutboundReply({
                fromNumber: input.toNumber,
                toNumber: input.fromNumber,
                body: globals_1.RESTARTED_MESSAGE
            });
            return {
                status: "global",
                command,
                outboundBody
            };
        }
        return {
            status: "no_match",
            outboundBody: null
        };
    }
    const result = await (0, startFlow_1.startFlow)({
        flow,
        userPhoneNumber: input.fromNumber,
        servicePhoneNumber: input.toNumber
    });
    await (0, message_repo_1.attachConversationToMessage)(inboundMessage.id, result.conversation.id);
    const outboundBody = await sendOutboundReply({
        conversationId: result.conversation.id,
        fromNumber: input.toNumber,
        toNumber: input.fromNumber,
        body: result.outboundBody
    });
    return {
        status: "started",
        flowId: result.conversation.flowId,
        conversationId: result.conversation.id,
        outboundBody
    };
}
