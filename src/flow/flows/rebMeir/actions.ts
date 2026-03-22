import { ActionHandlerMap } from "../../engine/types";

export const rebMeirActions: ActionHandlerMap = {
  async createRebMeirDonation({ context }) {
    return {
      ok: true,
      contextPatch: {
        donationCreated: true,
        donationReference: "dummy-donation-ref",
        savedDonationAmount: context.donationAmount ?? null,
        savedDonorName: context.donorName ?? null
      }
    };
  },
  async notifyRebMeirTeam() {
    return {
      ok: true,
      contextPatch: {
        rebMeirTeamNotified: true
      }
    };
  }
};
