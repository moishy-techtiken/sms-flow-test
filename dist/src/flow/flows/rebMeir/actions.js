"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebMeirActions = void 0;
exports.rebMeirActions = {
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
