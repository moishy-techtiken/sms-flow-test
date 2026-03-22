import { SmsFlow } from "../../engine/types";

export const flow: SmsFlow = {
  id: "rebMeirDonation",
  version: 1,
  triggerKeywords: ["donath"],
  startStep: "welcome",
  settings: {
    expiresAfterMinutes: 60
  },
  steps: {
    welcome: {
      type: "message",
      message:
        "Thank you for donating to Reb Meir. Reply with the donation amount.",
      next: "getAmount"
    },
    getAmount: {
      type: "input",
      message: "Please enter the donation amount.",
      saveAs: "donationAmount",
      validate: "amount",
      next: "getDonorName",
      invalidMessage: "Please enter a valid amount."
    },
    getDonorName: {
      type: "input",
      message: "Please reply with the donor name.",
      saveAs: "donorName",
      validate: "text",
      next: "confirmDonation",
      invalidMessage: "Please enter a valid name."
    },
    confirmDonation: {
      type: "choice",
      messageTemplate:
        "You are donating ${{donationAmount}} under {{donorName}}. Reply 1 to confirm or 2 to start over.",
      saveAs: "donationConfirmed",
      options: [
        { input: "1", next: "createDonation", value: true },
        { input: "2", next: "getAmount", value: false }
      ],
      invalidMessage: "Reply 1 to confirm or 2 to start over."
    },
    createDonation: {
      type: "action",
      action: "createRebMeirDonation",
      onSuccess: "notifyTeam",
      onFail: "donationFailed"
    },
    notifyTeam: {
      type: "action",
      action: "notifyRebMeirTeam",
      onSuccess: "done",
      onFail: "done"
    },
    donationFailed: {
      type: "end",
      message:
        "We could not save the donation right now. Please try again later."
    },
    done: {
      type: "end",
      messageTemplate:
        "Thank you. Your donation of ${{donationAmount}} for {{donorName}} was recorded."
    }
  }
};
