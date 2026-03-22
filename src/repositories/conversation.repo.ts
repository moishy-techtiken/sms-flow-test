import {
  Conversation,
  ConversationStatus,
  Prisma
} from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

type CreateConversationInput = {
  userPhoneNumber: string;
  servicePhoneNumber: string;
  flowId: string;
  flowVersion: number;
  currentStep: string;
  contextJson: Prisma.InputJsonValue;
  startedAt: Date;
  lastMessageAt: Date;
  expiresAt: Date | null;
};

export async function findActiveConversation(
  userPhoneNumber: string,
  servicePhoneNumber: string
): Promise<Conversation | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      userPhoneNumber,
      servicePhoneNumber,
      status: ConversationStatus.active
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!conversation) {
    return null;
  }

  if (conversation.expiresAt && conversation.expiresAt.getTime() <= Date.now()) {
    await prisma.conversation.update({
      where: {
        id: conversation.id
      },
      data: {
        status: ConversationStatus.expired
      }
    });

    return null;
  }

  return conversation;
}

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  return prisma.conversation.create({
    data: {
      userPhoneNumber: input.userPhoneNumber,
      servicePhoneNumber: input.servicePhoneNumber,
      flowId: input.flowId,
      flowVersion: input.flowVersion,
      currentStep: input.currentStep,
      contextJson: input.contextJson,
      startedAt: input.startedAt,
      lastMessageAt: input.lastMessageAt,
      expiresAt: input.expiresAt
    }
  });
}

export async function updateConversation(
  conversationId: string,
  data: Prisma.ConversationUpdateInput
): Promise<Conversation> {
  return prisma.conversation.update({
    where: {
      id: conversationId
    },
    data
  });
}

export async function completeConversation(
  conversationId: string,
  data: Prisma.ConversationUpdateInput = {}
): Promise<Conversation> {
  return prisma.conversation.update({
    where: {
      id: conversationId
    },
    data: {
      ...data,
      status: ConversationStatus.completed,
      completedAt: new Date()
    }
  });
}

export async function cancelConversation(
  conversationId: string,
  data: Prisma.ConversationUpdateInput = {}
): Promise<Conversation> {
  return prisma.conversation.update({
    where: {
      id: conversationId
    },
    data: {
      ...data,
      status: ConversationStatus.cancelled,
      completedAt: new Date()
    }
  });
}
