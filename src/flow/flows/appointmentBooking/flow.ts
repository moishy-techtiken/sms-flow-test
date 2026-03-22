import { SmsFlow } from "../../engine/types";

export const flow: SmsFlow = {
  id: "appointmentBooking",
  version: 1,
  triggerKeywords: ["book"],
  startStep: "welcome",
  settings: {
    expiresAfterMinutes: 60
  },
  steps: {
    welcome: {
      type: "action",
      action: "loadAppointmentLocations",
      onSuccess: "chooseLocation",
      onFail: "bookingError"
    },
    chooseLocation: {
      type: "choice",
      messageTemplate:
        "{{appointmentLocationPromptText}}\n{{appointmentLocationOptionsText}}",
      dynamicOptionsFromContext: "appointmentLocationOptions",
      saveAs: "appointmentLocationChoice",
      invalidMessage: "Reply with one of the location numbers."
    },
    handleLocationSelection: {
      type: "action",
      action: "handleLocationSelection",
      onSuccess: "getPeopleCount",
      onFail: "bookingError"
    },
    getPeopleCount: {
      type: "input",
      message: "How many people?",
      saveAs: "appointmentCount",
      validate: "integer",
      next: "validatePeopleCount",
      invalidMessage: "Please enter a whole number."
    },
    validatePeopleCount: {
      type: "condition",
      condition: "appointmentCountIsPositive",
      onSuccess: "loadDays",
      onFail: "invalidPeopleCount"
    },
    invalidPeopleCount: {
      type: "message",
      message: "Please enter a number greater than 0.",
      next: "getPeopleCount"
    },
    loadDays: {
      type: "action",
      action: "loadAppointmentDays",
      onSuccess: "chooseDay",
      onFail: "bookingError"
    },
    chooseDay: {
      type: "choice",
      messageTemplate: "{{appointmentDayPromptText}}\n{{appointmentDayOptionsText}}",
      dynamicOptionsFromContext: "appointmentDayOptions",
      saveAs: "appointmentDayChoice",
      invalidMessage: "Reply with one of the day numbers."
    },
    handleDaySelection: {
      type: "action",
      action: "handleDaySelection",
      onSuccess: "loadTimes",
      onFail: "bookingError"
    },
    loadTimes: {
      type: "action",
      action: "loadAppointmentTimes",
      onSuccess: "chooseTime",
      onFail: "bookingError"
    },
    chooseTime: {
      type: "choice",
      messageTemplate:
        "{{appointmentTimePromptText}}\n{{appointmentTimeOptionsText}}",
      dynamicOptionsFromContext: "appointmentTimeOptions",
      saveAs: "appointmentTimeChoice",
      invalidMessage: "Reply with one of the time numbers."
    },
    handleTimeSelection: {
      type: "action",
      action: "handleTimeSelection",
      onSuccess: "confirm",
      onFail: "bookingError"
    },
    confirm: {
      type: "choice",
      messageTemplate:
        "Please confirm your booking:\nLocation: {{selectedLocationName}}\nPeople: {{appointmentCount}}\nDay: {{selectedDate}}\nTime: {{selectedDisplayTime}}\n\nReply 1 to confirm or 2 to pick another time.",
      options: [
        { input: "1", next: "createBooking", value: true },
        { input: "2", next: "loadTimes", value: false }
      ],
      saveAs: "appointmentConfirmed",
      invalidMessage: "Reply 1 to confirm or 2 to pick another time."
    },
    createBooking: {
      type: "action",
      action: "createAppointmentBooking",
      onSuccess: "bookingSuccess",
      onFail: "bookingError"
    },
    noLocationsAvailable: {
      type: "end",
      message:
        "There are no booking locations open right now. Please try again later."
    },
    noDaysAvailable: {
      type: "end",
      messageTemplate:
        "There are no available days for {{selectedLocationName}} right now. Please try again later."
    },
    bookingSuccess: {
      type: "end",
      messageTemplate:
        "Your appointment is booked.\nLocation: {{selectedLocationName}}\nPeople: {{appointmentCount}}\nDay: {{selectedDate}}\nTime: {{selectedDisplayTime}}"
    },
    bookingError: {
      type: "end",
      message:
        "We could not complete your booking right now. Please try again later."
    }
  }
};
