import { Prisma } from "../../../generated/prisma/client";
import {
  completeConversation,
  updateConversation
} from "../../repositories/conversation.repo";
import { onlineBookingService } from "../../services/onlineBooking.service";
import { sendSms } from "../../services/sms.service";
import { actionRegistry } from "./actionRegistry";
import { conditionRegistry } from "./globals";
import { renderMessage } from "./renderMessage";
import { validatorRegistry } from "./validatorRegistry";
import {
  ChoiceOption,
  FlowContext,
  RunStepResult,
  SmsFlow,
  getFlowExpiresAt
} from "./types";

type RunStepInput = {
  flow: SmsFlow;
  conversationId: string;
  currentStep: string;
  context: FlowContext;
  inboundBody: string | null;
};

function normalizeInput(value: string): string {
  return value.trim().toLowerCase();
}

function getChoiceOptions(
  context: FlowContext,
  dynamicOptionsFromContext?: string,
  staticOptions?: ChoiceOption[]
): ChoiceOption[] {
  if (dynamicOptionsFromContext) {
    const dynamicValue = context[dynamicOptionsFromContext];

    if (Array.isArray(dynamicValue)) {
      return dynamicValue.filter((item): item is ChoiceOption => {
        return (
          !!item &&
          typeof item === "object" &&
          "input" in item &&
          "next" in item
        );
      });
    }
  }

  return staticOptions ?? [];
}

export async function runStep(input: RunStepInput): Promise<RunStepResult> {
  let currentStepKey = input.currentStep;
  let context = input.context;
  let inboundBody = input.inboundBody;

  while (true) {
    const step = input.flow.steps[currentStepKey];

    if (!step) {
      throw new Error(
        `Step "${currentStepKey}" was not found in flow "${input.flow.id}".`
      );
    }

    const now = new Date();
    const expiresAt = getFlowExpiresAt(input.flow, now);

    switch (step.type) {
      case "message": {
        const outboundBody = renderMessage(step, context);
        const conversation = await updateConversation(input.conversationId, {
          currentStep: step.next,
          contextJson: context as Prisma.InputJsonValue,
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
          const outboundBody = renderMessage(step, context);
          const conversation = await updateConversation(input.conversationId, {
            currentStep: currentStepKey,
            contextJson: context as Prisma.InputJsonValue,
            lastMessageAt: now,
            expiresAt
          });

          return {
            conversation,
            outboundBody
          };
        }

        const validator = validatorRegistry[step.validate];

        if (!validator) {
          throw new Error(`Validator "${step.validate}" is not registered.`);
        }

        const validationResult = validator(inboundBody);

        if (!validationResult.ok) {
          const conversation = await updateConversation(input.conversationId, {
            currentStep: currentStepKey,
            contextJson: context as Prisma.InputJsonValue,
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

        await updateConversation(input.conversationId, {
          currentStep: step.next,
          contextJson: context as Prisma.InputJsonValue,
          lastMessageAt: now,
          expiresAt
        });

        currentStepKey = step.next;
        inboundBody = null;
        continue;
      }

      case "choice": {
        const options = getChoiceOptions(
          context,
          step.dynamicOptionsFromContext,
          step.options
        );

        if (!inboundBody) {
          const outboundBody = renderMessage(step, context);
          const conversation = await updateConversation(input.conversationId, {
            currentStep: currentStepKey,
            contextJson: context as Prisma.InputJsonValue,
            lastMessageAt: now,
            expiresAt
          });

          return {
            conversation,
            outboundBody
          };
        }

        const matchedOption = options.find(
          (option) => normalizeInput(option.input) === normalizeInput(inboundBody as any)
        );

        if (!matchedOption) {
          const conversation = await updateConversation(input.conversationId, {
            currentStep: currentStepKey,
            contextJson: context as Prisma.InputJsonValue,
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
            [step.saveAs]:
              matchedOption.value !== undefined
                ? matchedOption.value
                : matchedOption.input
          };
        }

        await updateConversation(input.conversationId, {
          currentStep: matchedOption.next,
          contextJson: context as Prisma.InputJsonValue,
          lastMessageAt: now,
          expiresAt
        });

        currentStepKey = matchedOption.next;
        inboundBody = null;
        continue;
      }

      case "action": {
        const handler = actionRegistry[step.action];

        if (!handler) {
          throw new Error(`Action "${step.action}" is not registered.`);
        }

        const currentConversation = await updateConversation(input.conversationId, {
          currentStep: currentStepKey,
          contextJson: context as Prisma.InputJsonValue,
          lastMessageAt: now,
          expiresAt
        });

        const actionResult = await handler({
          conversation: currentConversation,
          flow: input.flow,
          context,
          inboundBody,
          services: {
            sendSms,
            onlineBooking: onlineBookingService
          }
        });

        context = {
          ...context,
          ...(actionResult.contextPatch ?? {})
        };

        const nextStep =
          actionResult.next ??
          (actionResult.ok ? step.onSuccess ?? step.next : step.onFail ?? step.next);

        if (!nextStep) {
          throw new Error(`Action step "${currentStepKey}" did not resolve a next step.`);
        }

        await updateConversation(input.conversationId, {
          currentStep: nextStep,
          contextJson: context as Prisma.InputJsonValue,
          lastMessageAt: now,
          expiresAt
        });

        currentStepKey = nextStep;
        inboundBody = null;
        continue;
      }

      case "condition": {
        const handler = conditionRegistry[step.condition];

        if (!handler) {
          throw new Error(`Condition "${step.condition}" is not registered.`);
        }

        const currentConversation = await updateConversation(input.conversationId, {
          currentStep: currentStepKey,
          contextJson: context as Prisma.InputJsonValue,
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

        await updateConversation(input.conversationId, {
          currentStep: nextStep,
          contextJson: context as Prisma.InputJsonValue,
          lastMessageAt: now,
          expiresAt
        });

        currentStepKey = nextStep;
        inboundBody = null;
        continue;
      }

      case "end": {
        const outboundBody = renderMessage(step, context);
        const conversation = await completeConversation(input.conversationId, {
          currentStep: currentStepKey,
          contextJson: context as Prisma.InputJsonValue,
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
