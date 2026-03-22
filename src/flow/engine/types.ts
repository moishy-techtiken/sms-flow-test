import { Conversation, Prisma } from "../../../generated/prisma/client";
import { OnlineBookingService } from "../../services/onlineBooking.service";
import { SendSmsResult } from "../../services/sms.service";

export type ValidatorName =
  | "text"
  | "phone"
  | "amount"
  | "integer"
  | "yesNo";

export type FlowStepType =
  | "message"
  | "input"
  | "choice"
  | "action"
  | "condition"
  | "end";

export type FlowContext = Record<string, unknown>;

export type ChoiceOption = {
  input: string;
  next: string;
  value?: unknown;
};

export type MessageStep = {
  type: "message";
  message?: string;
  messageTemplate?: string;
  next: string;
};

export type InputStep = {
  type: "input";
  message?: string;
  messageTemplate?: string;
  saveAs: string;
  validate: ValidatorName;
  next: string;
  invalidMessage: string;
};

export type ChoiceStep = {
  type: "choice";
  message?: string;
  messageTemplate?: string;
  options?: ChoiceOption[];
  dynamicOptionsFromContext?: string;
  saveAs?: string;
  invalidMessage: string;
};

export type ActionStep = {
  type: "action";
  action: string;
  next?: string;
  onSuccess?: string;
  onFail?: string;
};

export type ConditionStep = {
  type: "condition";
  condition: string;
  onSuccess: string;
  onFail: string;
};

export type EndStep = {
  type: "end";
  message?: string;
  messageTemplate?: string;
};

export type FlowStep =
  | MessageStep
  | InputStep
  | ChoiceStep
  | ActionStep
  | ConditionStep
  | EndStep;

export type SmsFlow = {
  id: string;
  version: number;
  triggerKeywords: string[];
  startStep: string;
  settings?: {
    expiresAfterMinutes?: number;
  };
  steps: Record<string, FlowStep>;
};

export type ValidatorResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
    };

export type ValidatorFn = (input: string) => ValidatorResult;

export type SendSmsFn = (input: {
  from: string;
  to: string;
  body: string;
}) => Promise<SendSmsResult>;

export type ActionHandlerResult = {
  ok: boolean;
  next?: string;
  contextPatch?: FlowContext;
};

export type ActionHandler = (input: {
  conversation: Conversation;
  flow: SmsFlow;
  context: FlowContext;
  inboundBody: string | null;
  services: {
    sendSms: SendSmsFn;
    onlineBooking: OnlineBookingService;
  };
}) => Promise<ActionHandlerResult>;

export type ActionHandlerMap = Record<string, ActionHandler>;

export type ConditionHandler = (input: {
  conversation: Conversation;
  flow: SmsFlow;
  context: FlowContext;
}) => boolean;

export type RunStepResult = {
  conversation: Conversation;
  outboundBody: string | null;
};

export type ProcessIncomingMessageInput = {
  provider: string;
  providerMessageId: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  rawPayload?: unknown;
};

export type ProcessIncomingMessageResult = {
  status:
    | "duplicate"
    | "global"
    | "opted_out"
    | "continued"
    | "started"
    | "no_match";
  command?: string;
  flowId?: string | null;
  conversationId?: string | null;
  outboundBody?: string | null;
};

export function getFlowContext(value: Prisma.JsonValue): FlowContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as FlowContext;
}

export function getFlowExpiresAt(flow: SmsFlow, now = new Date()): Date | null {
  const minutes = flow.settings?.expiresAfterMinutes;

  if (!minutes) {
    return null;
  }

  return new Date(now.getTime() + minutes * 60 * 1000);
}
