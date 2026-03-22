import { Prisma } from "../../../generated/prisma/client";
import { createConversation } from "../../repositories/conversation.repo";
import { runStep } from "./runStep";
import { RunStepResult, SmsFlow, getFlowExpiresAt } from "./types";

type StartFlowInput = {
  flow: SmsFlow;
  userPhoneNumber: string;
  servicePhoneNumber: string;
};

export async function startFlow(input: StartFlowInput): Promise<RunStepResult> {
  const now = new Date();

  const conversation = await createConversation({
    userPhoneNumber: input.userPhoneNumber,
    servicePhoneNumber: input.servicePhoneNumber,
    flowId: input.flow.id,
    flowVersion: input.flow.version,
    currentStep: input.flow.startStep,
    contextJson: {} as Prisma.InputJsonValue,
    startedAt: now,
    lastMessageAt: now,
    expiresAt: getFlowExpiresAt(input.flow, now)
  });

  return runStep({
    flow: input.flow,
    conversationId: conversation.id,
    currentStep: conversation.currentStep,
    context: {},
    inboundBody: null
  });
}
