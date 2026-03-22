"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOptOut = findOptOut;
exports.createOrUpdateOptOut = createOrUpdateOptOut;
const prisma_1 = require("../lib/prisma");
async function findOptOut(userPhoneNumber, servicePhoneNumber) {
    return prisma_1.prisma.optOut.findUnique({
        where: {
            userPhoneNumber_servicePhoneNumber: {
                userPhoneNumber,
                servicePhoneNumber
            }
        }
    });
}
async function createOrUpdateOptOut(userPhoneNumber, servicePhoneNumber, reason) {
    return prisma_1.prisma.optOut.upsert({
        where: {
            userPhoneNumber_servicePhoneNumber: {
                userPhoneNumber,
                servicePhoneNumber
            }
        },
        update: {
            reason
        },
        create: {
            userPhoneNumber,
            servicePhoneNumber,
            reason
        }
    });
}
