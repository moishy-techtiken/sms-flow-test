"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFlow = startFlow;
const conversation_repo_1 = require("../../repositories/conversation.repo");
const runStep_1 = require("./runStep");
const types_1 = require("./types");
async function startFlow(input) {
    const now = new Date();
    const conversation = await (0, conversation_repo_1.createConversation)({
        userPhoneNumber: input.userPhoneNumber,
        servicePhoneNumber: input.servicePhoneNumber,
        flowId: input.flow.id,
        flowVersion: input.flow.version,
        currentStep: input.flow.startStep,
        contextJson: {},
        startedAt: now,
        lastMessageAt: now,
        expiresAt: (0, types_1.getFlowExpiresAt)(input.flow, now)
    });
    return (0, runStep_1.runStep)({
        flow: input.flow,
        conversationId: conversation.id,
        currentStep: conversation.currentStep,
        context: {},
        inboundBody: null
    });
}
