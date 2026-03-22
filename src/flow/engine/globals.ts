import { ConditionHandler } from "./types";

export const GLOBAL_COMMANDS = {
  STOP: "STOP",
  HELP: "HELP",
  RESTART: "RESTART",
  CANCEL: "CANCEL"
} as const;

export const HELP_MESSAGE =
  "Reply START to begin. Reply STOP to opt out. Reply CANCEL to end the current conversation.";
export const STOP_MESSAGE =
  "You have been opted out and will no longer receive messages.";
export const OPTED_OUT_MESSAGE =
  "You are opted out. Contact support to be re-enabled.";
export const CANCEL_MESSAGE = "Your active conversation has been cancelled.";
export const NO_ACTIVE_CONVERSATION_MESSAGE = "There is no active conversation.";
export const RESTARTED_MESSAGE =
  "Your conversation was restarted. Send a trigger keyword to begin again.";

export const conditionRegistry: Record<string, ConditionHandler> = {
  isNameConfirmed({ context }) {
    return context.nameConfirmed === true;
  },
  appointmentCountIsPositive({ context }) {
    return (
      typeof context.appointmentCount === "number" && context.appointmentCount > 0
    );
  }
};

export function getGlobalCommand(body: string): string | null {
  const normalized = body.trim().toUpperCase();

  if (normalized in GLOBAL_COMMANDS) {
    return normalized;
  }

  return null;
}
