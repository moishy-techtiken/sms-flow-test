"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStep = runStep;
const conversation_repo_1 = require("../../repositories/conversation.repo");
const onlineBooking_service_1 = require("../../services/onlineBooking.service");
const sms_service_1 = require("../../services/sms.service");
const actionRegistry_1 = require("./actionRegistry");
const globals_1 = require("./globals");
const renderMessage_1 = require("./renderMessage");
const validatorRegistry_1 = require("./validatorRegistry");
const types_1 = require("./types");
function normalizeInput(value) {
    return value.trim().toLowerCase();
}
function getChoiceOptions(context, dynamicOptionsFromContext, staticOptions) {
    if (dynamicOptionsFromContext) {
        const dynamicValue = context[dynamicOptionsFromContext];
        if (Array.isArray(dynamicValue)) {
            return dynamicValue.filter((item) => {
                return (!!item &&
                    typeof item === "object" &&
                    "input" in item &&
                    "next" in item);
            });
        }
    }
    return staticOptions ?? [];
}
async function runStep(input) {
    let currentStepKey = input.currentStep;
    let context = input.context;
    let inboundBody = input.inboundBody;
    while (true) {
        const step = input.flow.steps[currentStepKey];
        if (!step) {
            throw new Error(`Step "${currentStepKey}" was not found in flow "${input.flow.id}".`);
        }
        const now = new Date();
        const expiresAt = (0, types_1.getFlowExpiresAt)(input.flow, now);
        switch (step.type) {
            case "message": {
                const outboundBody = (0, renderMessage_1.renderMessage)(step, context);
                const conversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: step.next,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                return {
                    conversation,
                    outboundBody
                };
            }
            case "input": {
                if (!inboundBody) {
                    const outboundBody = (0, renderMessage_1.renderMessage)(step, context);
                    const conversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                        currentStep: currentStepKey,
                        contextJson: context,
                        lastMessageAt: now,
                        expiresAt
                    });
                    return {
                        conversation,
                        outboundBody
                    };
                }
                const validator = validatorRegistry_1.validatorRegistry[step.validate];
                if (!validator) {
                    throw new Error(`Validator "${step.validate}" is not registered.`);
                }
                const validationResult = validator(inboundBody);
                if (!validationResult.ok) {
                    const conversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                        currentStep: currentStepKey,
                        contextJson: context,
                        lastMessageAt: now,
                        expiresAt
                    });
                    return {
                        conversation,
                        outboundBody: step.invalidMessage
                    };
                }
                context = {
                    ...context,
                    [step.saveAs]: validationResult.value
                };
                await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: step.next,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                currentStepKey = step.next;
                inboundBody = null;
                continue;
            }
            case "choice": {
                const options = getChoiceOptions(context, step.dynamicOptionsFromContext, step.options);
                if (!inboundBody) {
                    const outboundBody = (0, renderMessage_1.renderMessage)(step, context);
                    const conversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                        currentStep: currentStepKey,
                        contextJson: context,
                        lastMessageAt: now,
                        expiresAt
                    });
                    return {
                        conversation,
                        outboundBody
                    };
                }
                const matchedOption = options.find((option) => normalizeInput(option.input) === normalizeInput(inboundBody));
                if (!matchedOption) {
                    const conversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                        currentStep: currentStepKey,
                        contextJson: context,
                        lastMessageAt: now,
                        expiresAt
                    });
                    return {
                        conversation,
                        outboundBody: step.invalidMessage
                    };
                }
                if (step.saveAs) {
                    context = {
                        ...context,
                        [step.saveAs]: matchedOption.value !== undefined
                            ? matchedOption.value
                            : matchedOption.input
                    };
                }
                await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: matchedOption.next,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                currentStepKey = matchedOption.next;
                inboundBody = null;
                continue;
            }
            case "action": {
                const handler = actionRegistry_1.actionRegistry[step.action];
                if (!handler) {
                    throw new Error(`Action "${step.action}" is not registered.`);
                }
                const currentConversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: currentStepKey,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                const actionResult = await handler({
                    conversation: currentConversation,
                    flow: input.flow,
                    context,
                    inboundBody,
                    services: {
                        sendSms: sms_service_1.sendSms,
                        onlineBooking: onlineBooking_service_1.onlineBookingService
                    }
                });
                context = {
                    ...context,
                    ...(actionResult.contextPatch ?? {})
                };
                const nextStep = actionResult.next ??
                    (actionResult.ok ? step.onSuccess ?? step.next : step.onFail ?? step.next);
                if (!nextStep) {
                    throw new Error(`Action step "${currentStepKey}" did not resolve a next step.`);
                }
                await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: nextStep,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                currentStepKey = nextStep;
                inboundBody = null;
                continue;
            }
            case "condition": {
                const handler = globals_1.conditionRegistry[step.condition];
                if (!handler) {
                    throw new Error(`Condition "${step.condition}" is not registered.`);
                }
                const currentConversation = await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: currentStepKey,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                const nextStep = handler({
                    conversation: currentConversation,
                    flow: input.flow,
                    context
                })
                    ? step.onSuccess
                    : step.onFail;
                await (0, conversation_repo_1.updateConversation)(input.conversationId, {
                    currentStep: nextStep,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt
                });
                currentStepKey = nextStep;
                inboundBody = null;
                continue;
            }
            case "end": {
                const outboundBody = (0, renderMessage_1.renderMessage)(step, context);
                const conversation = await (0, conversation_repo_1.completeConversation)(input.conversationId, {
                    currentStep: currentStepKey,
                    contextJson: context,
                    lastMessageAt: now,
                    expiresAt: null
                });
                return {
                    conversation,
                    outboundBody
                };
            }
        }
    }
}
