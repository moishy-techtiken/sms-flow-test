import { OptOut } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export async function findOptOut(
  userPhoneNumber: string,
  servicePhoneNumber: string
): Promise<OptOut | null> {
  return prisma.optOut.findUnique({
    where: {
      userPhoneNumber_servicePhoneNumber: {
        userPhoneNumber,
        servicePhoneNumber
      }
    }
  });
}

export async function createOrUpdateOptOut(
  userPhoneNumber: string,
  servicePhoneNumber: string,
  reason: string
): Promise<OptOut> {
  return prisma.optOut.upsert({
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
