"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMessageByProviderAndMessageId = findMessageByProviderAndMessageId;
exports.createMessage = createMessage;
exports.attachConversationToMessage = attachConversationToMessage;
const client_1 = require("../../generated/prisma/client");
const prisma_1 = require("../lib/prisma");
async function findMessageByProviderAndMessageId(provider, providerMessageId) {
    return prisma_1.prisma.message.findUnique({
        where: {
            provider_providerMessageId: {
                provider,
                providerMessageId
            }
        }
    });
}
async function createMessage(input) {
    return prisma_1.prisma.message.create({
        data: {
            conversationId: input.conversationId ?? null,
            direction: input.direction,
            provider: input.provider,
            providerMessageId: input.providerMessageId ?? null,
            fromNumber: input.fromNumber,
            toNumber: input.toNumber,
            body: input.body,
            rawPayload: input.rawPayload === undefined
                ? client_1.Prisma.JsonNull
                : input.rawPayload
        }
    });
}
async function attachConversationToMessage(messageId, conversationId) {
    return prisma_1.prisma.message.update({
        where: {
            id: messageId
        },
        data: {
            conversationId
        }
    });
}
