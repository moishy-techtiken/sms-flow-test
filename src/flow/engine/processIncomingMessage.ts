import { MessageDirection, Prisma } from "../../../generated/prisma/client";
import {
  cancelConversation,
  findActiveConversation
} from "../../repositories/conversation.repo";
import {
  attachConversationToMessage,
  createMessage,
  findMessageByProviderAndMessageId
} from "../../repositories/message.repo";
import {
  createOrUpdateOptOut,
  findOptOut
} from "../../repositories/optOut.repo";
import { sendSms } from "../../services/sms.service";
import { continueFlow } from "./continueFlow";
import {
  CANCEL_MESSAGE,
  HELP_MESSAGE,
  NO_ACTIVE_CONVERSATION_MESSAGE,
  OPTED_OUT_MESSAGE,
  RESTARTED_MESSAGE,
  STOP_MESSAGE,
  getGlobalCommand
} from "./globals";
import { findFlowByKeyword } from "./flowRegistry";
import { startFlow } from "./startFlow";
import {
  ProcessIncomingMessageInput,
  ProcessIncomingMessageResult
} from "./types";

async function sendOutboundReply(input: {
  conversationId?: string | null;
  fromNumber: string;
  toNumber: string;
  body: string | null;
}): Promise<string | null> {
  if (!input.body) {
    return null;
  }

  const result = await sendSms({
    from: input.fromNumber,
    to: input.toNumber,
    body: input.body
  });

  await createMessage({
    conversationId: input.conversationId ?? null,
    direction: MessageDirection.outbound,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    fromNumber: input.fromNumber,
    toNumber: input.toNumber,
    body: input.body,
    rawPayload: result
  });

  return input.body;
}

function isDuplicateMessageError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function processIncomingMessage(
  input: ProcessIncomingMessageInput
): Promise<ProcessIncomingMessageResult> {
  console.info("process_incoming_message", {
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    userPhoneNumber: input.fromNumber,
    servicePhoneNumber: input.toNumber
  });

  if (input.providerMessageId) {
    const existingMessage = await findMessageByProviderAndMessageId(
      input.provider,
      input.providerMessageId
    );

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
    inboundMessage = await createMessage({
      direction: MessageDirection.inbound,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      fromNumber: input.fromNumber,
      toNumber: input.toNumber,
      body: input.body,
      rawPayload: input.rawPayload
    });
  } catch (error) {
    if (!input.providerMessageId || !isDuplicateMessageError(error)) {
      throw error;
    }

    const existingMessage = await findMessageByProviderAndMessageId(
      input.provider,
      input.providerMessageId
    );

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

  const command = getGlobalCommand(input.body);

  if (command === "HELP") {
    const outboundBody = await sendOutboundReply({
      fromNumber: input.toNumber,
      toNumber: input.fromNumber,
      body: HELP_MESSAGE
    });

    return {
      status: "global",
      command,
      outboundBody
    };
  }

  if (command === "STOP") {
    const activeConversation = await findActiveConversation(
      input.fromNumber,
      input.toNumber
    );

    if (activeConversation) {
      await cancelConversation(activeConversation.id);
      await attachConversationToMessage(inboundMessage.id, activeConversation.id);
    }

    await createOrUpdateOptOut(input.fromNumber, input.toNumber, "STOP");

    const outboundBody = await sendOutboundReply({
      conversationId: activeConversation?.id ?? null,
      fromNumber: input.toNumber,
      toNumber: input.fromNumber,
      body: STOP_MESSAGE
    });

    return {
      status: "global",
      command,
      conversationId: activeConversation?.id ?? null,
      outboundBody
    };
  }

  if (command === "CANCEL") {
    const activeConversation = await findActiveConversation(
      input.fromNumber,
      input.toNumber
    );

    if (!activeConversation) {
      const outboundBody = await sendOutboundReply({
        fromNumber: input.toNumber,
        toNumber: input.fromNumber,
        body: NO_ACTIVE_CONVERSATION_MESSAGE
      });

      return {
        status: "global",
        command,
        outboundBody
      };
    }

    await cancelConversation(activeConversation.id);
    await attachConversationToMessage(inboundMessage.id, activeConversation.id);

    const outboundBody = await sendOutboundReply({
      conversationId: activeConversation.id,
      fromNumber: input.toNumber,
      toNumber: input.fromNumber,
      body: CANCEL_MESSAGE
    });

    return {
      status: "global",
      command,
      conversationId: activeConversation.id,
      outboundBody
    };
  }

  let activeConversation = await findActiveConversation(
    input.fromNumber,
    input.toNumber
  );

  if (command === "RESTART" && activeConversation) {
    await cancelConversation(activeConversation.id);
    await attachConversationToMessage(inboundMessage.id, activeConversation.id);
    activeConversation = null;
  }

  const optedOut = await findOptOut(input.fromNumber, input.toNumber);

  if (optedOut) {
    const outboundBody = await sendOutboundReply({
      fromNumber: input.toNumber,
      toNumber: input.fromNumber,
      body: OPTED_OUT_MESSAGE
    });

    return {
      status: "opted_out",
      outboundBody
    };
  }

  if (activeConversation && command !== "RESTART") {
    await attachConversationToMessage(inboundMessage.id, activeConversation.id);

    const result = await continueFlow({
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

  const flow = findFlowByKeyword(input.body);

  if (!flow) {
    if (command === "RESTART") {
      const outboundBody = await sendOutboundReply({
        fromNumber: input.toNumber,
        toNumber: input.fromNumber,
        body: RESTARTED_MESSAGE
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

  const result = await startFlow({
    flow,
    userPhoneNumber: input.fromNumber,
    servicePhoneNumber: input.toNumber
  });

  await attachConversationToMessage(inboundMessage.id, result.conversation.id);

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
