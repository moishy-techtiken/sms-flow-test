import {
  ActionHandlerMap,
  ChoiceOption,
  FlowContext
} from "../../engine/types";

const PAGE_SIZE = 9;

type LocationChoiceValue =
  | {
      kind: "location";
      locationId: number;
      locationName: string;
    }
  | {
      kind: "more";
    };

type DayChoiceValue =
  | {
      kind: "day";
      scheduleId: number;
      date: string;
    }
  | {
      kind: "more";
    };

type TimeChoiceValue =
  | {
      kind: "time";
      timeSlotId: number;
      displayTime: string;
    }
  | {
      kind: "more";
    };

type AppointmentLocation = {
  id: number;
  locationName: string;
};

type AppointmentSchedule = {
  id: number;
  date: string;
};

type AppointmentTimeSlot = {
  id: number;
  displayTime: string;
};

function getNumberValue(context: FlowContext, key: string, fallback = 0): number {
  const value = context[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringValue(context: FlowContext, key: string): string | null {
  const value = context[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getLocations(context: FlowContext): AppointmentLocation[] {
  const value = context.appointmentLocations;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AppointmentLocation => {
    return (
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      "locationName" in item &&
      typeof item.id === "number" &&
      typeof item.locationName === "string"
    );
  });
}

function getSchedules(context: FlowContext): AppointmentSchedule[] {
  const value = context.appointmentSchedules;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AppointmentSchedule => {
    return (
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      "date" in item &&
      typeof item.id === "number" &&
      typeof item.date === "string"
    );
  });
}

function getTimeSlots(context: FlowContext): AppointmentTimeSlot[] {
  const value = context.appointmentTimeSlots;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AppointmentTimeSlot => {
    return (
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      "displayTime" in item &&
      typeof item.id === "number" &&
      typeof item.displayTime === "string"
    );
  });
}

function getLocationChoice(context: FlowContext): LocationChoiceValue | null {
  const value = context.appointmentLocationChoice;

  if (!value || typeof value !== "object" || !("kind" in value)) {
    return null;
  }

  if (value.kind === "more") {
    return { kind: "more" };
  }

  if (
    value.kind === "location" &&
    "locationId" in value &&
    "locationName" in value &&
    typeof value.locationId === "number" &&
    typeof value.locationName === "string"
  ) {
    return {
      kind: "location",
      locationId: value.locationId,
      locationName: value.locationName
    };
  }

  return null;
}

function getDayChoice(context: FlowContext): DayChoiceValue | null {
  const value = context.appointmentDayChoice;

  if (!value || typeof value !== "object" || !("kind" in value)) {
    return null;
  }

  if (value.kind === "more") {
    return { kind: "more" };
  }

  if (
    value.kind === "day" &&
    "scheduleId" in value &&
    "date" in value &&
    typeof value.scheduleId === "number" &&
    typeof value.date === "string"
  ) {
    return {
      kind: "day",
      scheduleId: value.scheduleId,
      date: value.date
    };
  }

  return null;
}

function getTimeChoice(context: FlowContext): TimeChoiceValue | null {
  const value = context.appointmentTimeChoice;

  if (!value || typeof value !== "object" || !("kind" in value)) {
    return null;
  }

  if (value.kind === "more") {
    return { kind: "more" };
  }

  if (
    value.kind === "time" &&
    "timeSlotId" in value &&
    "displayTime" in value &&
    typeof value.timeSlotId === "number" &&
    typeof value.displayTime === "string"
  ) {
    return {
      kind: "time",
      timeSlotId: value.timeSlotId,
      displayTime: value.displayTime
    };
  }

  return null;
}

function buildPagedOptions<T>(input: {
  items: T[];
  page: number;
  nextStep: string;
  getLabel: (item: T) => string;
  getValue: (item: T) => unknown;
}): {
  options: ChoiceOption[];
  text: string;
  page: number;
} {
  const safePage = input.page >= 0 ? input.page : 0;
  const startIndex = safePage * PAGE_SIZE;
  const pageItems = input.items.slice(startIndex, startIndex + PAGE_SIZE);

  const options = pageItems.map((item, index) => ({
    input: String(index + 1),
    next: input.nextStep,
    value: input.getValue(item)
  }));

  const lines = pageItems.map(
    (item, index) => `${index + 1}. ${input.getLabel(item)}`
  );

  if (startIndex + PAGE_SIZE < input.items.length) {
    options.push({
      input: "0",
      next: input.nextStep,
      value: { kind: "more" }
    });
    lines.push("0. More");
  }

  return {
    options,
    text: lines.join("\n"),
    page: safePage
  };
}

function getBookingErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Booking API request failed.";
}

export const appointmentBookingActions: ActionHandlerMap = {
  async loadAppointmentLocations({ services }) {
    try {
      const locations = await services.onlineBooking.getOpenLocations();

      if (locations.length === 0) {
        return {
          ok: true,
          next: "noLocationsAvailable"
        };
      }

      const normalizedLocations = locations.map((location) => ({
        id: location.id,
        locationName: location.locationName
      }));

      const page = buildPagedOptions({
        items: normalizedLocations,
        page: 0,
        nextStep: "handleLocationSelection",
        getLabel: (location) => location.locationName,
        getValue: (location): LocationChoiceValue => ({
          kind: "location",
          locationId: location.id,
          locationName: location.locationName
        })
      });

      return {
        ok: true,
        next: "chooseLocation",
        contextPatch: {
          appointmentLocations: normalizedLocations,
          appointmentLocationPage: page.page,
          appointmentLocationOptions: page.options,
          appointmentLocationOptionsText: page.text,
          appointmentLocationPromptText:
            "Let's book your appointment. Reply with a location number.",
          appointmentLocationChoice: null,
          appointmentCount: null,
          appointmentSchedules: [],
          appointmentDayChoice: null,
          appointmentDayPage: 0,
          appointmentDayOptions: [],
          appointmentDayOptionsText: "",
          appointmentDayPromptText: "",
          appointmentTimeSlots: [],
          appointmentTimeChoice: null,
          appointmentTimePage: 0,
          appointmentTimeOptions: [],
          appointmentTimeOptionsText: "",
          appointmentTimePromptText: "",
          selectedLocationId: null,
          selectedLocationName: null,
          selectedScheduleId: null,
          selectedDate: null,
          selectedTimeSlotId: null,
          selectedDisplayTime: null,
          bookingErrorMessage: null
        }
      };
    } catch (error) {
      return {
        ok: false,
        next: "bookingError",
        contextPatch: {
          bookingErrorMessage: getBookingErrorMessage(error)
        }
      };
    }
  },

  async handleLocationSelection({ context }) {
    const selectedChoice = getLocationChoice(context);

    if (!selectedChoice) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    if (selectedChoice.kind === "more") {
      const locations = getLocations(context);
      const nextPageNumber = getNumberValue(context, "appointmentLocationPage") + 1;
      const page = buildPagedOptions({
        items: locations,
        page: nextPageNumber,
        nextStep: "handleLocationSelection",
        getLabel: (location) => location.locationName,
        getValue: (location): LocationChoiceValue => ({
          kind: "location",
          locationId: location.id,
          locationName: location.locationName
        })
      });

      return {
        ok: true,
        next: "chooseLocation",
        contextPatch: {
          appointmentLocationPage: page.page,
          appointmentLocationOptions: page.options,
          appointmentLocationOptionsText: page.text,
          appointmentLocationPromptText:
            "Reply with a location number.",
          appointmentLocationChoice: null
        }
      };
    }

    return {
      ok: true,
      next: "getPeopleCount",
      contextPatch: {
        appointmentLocationChoice: null,
        selectedLocationId: selectedChoice.locationId,
        selectedLocationName: selectedChoice.locationName,
        appointmentDayChoice: null,
        appointmentDayPage: 0,
        appointmentDayOptions: [],
        appointmentDayOptionsText: "",
        appointmentDayPromptText: "",
        appointmentTimeChoice: null,
        appointmentTimePage: 0,
        appointmentTimeOptions: [],
        appointmentTimeOptionsText: "",
        appointmentTimePromptText: "",
        selectedScheduleId: null,
        selectedDate: null,
        selectedTimeSlotId: null,
        selectedDisplayTime: null,
        bookingErrorMessage: null
      }
    };
  },

  async loadAppointmentDays({ context, services }) {
    const selectedLocationId = getNumberValue(context, "selectedLocationId", -1);
    const selectedLocationName =
      getStringValue(context, "selectedLocationName") ?? "the selected location";

    if (selectedLocationId <= 0) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    try {
      const schedules = await services.onlineBooking.getSchedules(selectedLocationId, 1);

      if (schedules.length === 0) {
        return {
          ok: true,
          next: "noDaysAvailable",
          contextPatch: {
            appointmentSchedules: [],
            appointmentDayOptions: [],
            appointmentDayOptionsText: "",
            appointmentDayPromptText: ""
          }
        };
      }

      const normalizedSchedules = schedules.map((schedule) => ({
        id: schedule.id,
        date: schedule.date
      }));

      const page = buildPagedOptions({
        items: normalizedSchedules,
        page: 0,
        nextStep: "handleDaySelection",
        getLabel: (schedule) => schedule.date,
        getValue: (schedule): DayChoiceValue => ({
          kind: "day",
          scheduleId: schedule.id,
          date: schedule.date
        })
      });

      return {
        ok: true,
        next: "chooseDay",
        contextPatch: {
          appointmentSchedules: normalizedSchedules,
          appointmentDayPage: page.page,
          appointmentDayOptions: page.options,
          appointmentDayOptionsText: page.text,
          appointmentDayPromptText: `Reply with a day number for ${selectedLocationName}.`,
          appointmentDayChoice: null,
          appointmentTimeSlots: [],
          appointmentTimeChoice: null,
          appointmentTimePage: 0,
          appointmentTimeOptions: [],
          appointmentTimeOptionsText: "",
          appointmentTimePromptText: "",
          selectedScheduleId: null,
          selectedDate: null,
          selectedTimeSlotId: null,
          selectedDisplayTime: null,
          bookingErrorMessage: null
        }
      };
    } catch (error) {
      return {
        ok: false,
        next: "bookingError",
        contextPatch: {
          bookingErrorMessage: getBookingErrorMessage(error)
        }
      };
    }
  },

  async handleDaySelection({ context }) {
    const selectedChoice = getDayChoice(context);

    if (!selectedChoice) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    if (selectedChoice.kind === "more") {
      const schedules = getSchedules(context);
      const nextPageNumber = getNumberValue(context, "appointmentDayPage") + 1;
      const selectedLocationName =
        getStringValue(context, "selectedLocationName") ?? "this location";

      const page = buildPagedOptions({
        items: schedules,
        page: nextPageNumber,
        nextStep: "handleDaySelection",
        getLabel: (schedule) => schedule.date,
        getValue: (schedule): DayChoiceValue => ({
          kind: "day",
          scheduleId: schedule.id,
          date: schedule.date
        })
      });

      return {
        ok: true,
        next: "chooseDay",
        contextPatch: {
          appointmentDayPage: page.page,
          appointmentDayOptions: page.options,
          appointmentDayOptionsText: page.text,
          appointmentDayPromptText: `Reply with a day number for ${selectedLocationName}.`,
          appointmentDayChoice: null
        }
      };
    }

    return {
      ok: true,
      next: "loadTimes",
      contextPatch: {
        appointmentDayChoice: null,
        selectedScheduleId: selectedChoice.scheduleId,
        selectedDate: selectedChoice.date,
        appointmentTimeChoice: null,
        appointmentTimePage: 0,
        appointmentTimeOptions: [],
        appointmentTimeOptionsText: "",
        appointmentTimePromptText: "",
        selectedTimeSlotId: null,
        selectedDisplayTime: null,
        bookingErrorMessage: null
      }
    };
  },

  async loadAppointmentTimes({ context, services }) {
    const selectedScheduleId = getNumberValue(context, "selectedScheduleId", -1);
    const selectedDate = getStringValue(context, "selectedDate") ?? "the selected day";

    if (selectedScheduleId <= 0) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    try {
      const timeSlots = await services.onlineBooking.getTimeSlots(selectedScheduleId, 1);

      if (timeSlots.length === 0) {
        return {
          ok: true,
          next: "loadDays",
          contextPatch: {
            appointmentTimeSlots: [],
            appointmentTimeOptions: [],
            appointmentTimeOptionsText: "",
            appointmentTimePromptText: "",
            appointmentDayPromptText: `No times are available on ${selectedDate}. Reply with another day number.`,
            appointmentTimeChoice: null,
            selectedTimeSlotId: null,
            selectedDisplayTime: null
          }
        };
      }

      const normalizedTimeSlots = timeSlots.map((timeSlot) => ({
        id: timeSlot.id,
        displayTime: timeSlot.displayTime
      }));

      const page = buildPagedOptions({
        items: normalizedTimeSlots,
        page: 0,
        nextStep: "handleTimeSelection",
        getLabel: (timeSlot) => timeSlot.displayTime,
        getValue: (timeSlot): TimeChoiceValue => ({
          kind: "time",
          timeSlotId: timeSlot.id,
          displayTime: timeSlot.displayTime
        })
      });

      return {
        ok: true,
        next: "chooseTime",
        contextPatch: {
          appointmentTimeSlots: normalizedTimeSlots,
          appointmentTimePage: page.page,
          appointmentTimeOptions: page.options,
          appointmentTimeOptionsText: page.text,
          appointmentTimePromptText: `Reply with a time number for ${selectedDate}.`,
          appointmentTimeChoice: null,
          selectedTimeSlotId: null,
          selectedDisplayTime: null,
          bookingErrorMessage: null
        }
      };
    } catch (error) {
      return {
        ok: false,
        next: "bookingError",
        contextPatch: {
          bookingErrorMessage: getBookingErrorMessage(error)
        }
      };
    }
  },

  async handleTimeSelection({ context }) {
    const selectedChoice = getTimeChoice(context);

    if (!selectedChoice) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    if (selectedChoice.kind === "more") {
      const timeSlots = getTimeSlots(context);
      const nextPageNumber = getNumberValue(context, "appointmentTimePage") + 1;
      const selectedDate = getStringValue(context, "selectedDate") ?? "this day";

      const page = buildPagedOptions({
        items: timeSlots,
        page: nextPageNumber,
        nextStep: "handleTimeSelection",
        getLabel: (timeSlot) => timeSlot.displayTime,
        getValue: (timeSlot): TimeChoiceValue => ({
          kind: "time",
          timeSlotId: timeSlot.id,
          displayTime: timeSlot.displayTime
        })
      });

      return {
        ok: true,
        next: "chooseTime",
        contextPatch: {
          appointmentTimePage: page.page,
          appointmentTimeOptions: page.options,
          appointmentTimeOptionsText: page.text,
          appointmentTimePromptText: `Reply with a time number for ${selectedDate}.`,
          appointmentTimeChoice: null
        }
      };
    }

    return {
      ok: true,
      next: "confirm",
      contextPatch: {
        appointmentTimeChoice: null,
        selectedTimeSlotId: selectedChoice.timeSlotId,
        selectedDisplayTime: selectedChoice.displayTime,
        bookingErrorMessage: null
      }
    };
  },

  async createAppointmentBooking({ context, conversation, services }) {
    const selectedTimeSlotId = getNumberValue(context, "selectedTimeSlotId", -1);
    const appointmentCount = getNumberValue(context, "appointmentCount", -1);

    if (selectedTimeSlotId <= 0 || appointmentCount <= 0) {
      return {
        ok: false,
        next: "bookingError"
      };
    }

    try {
      const booking = await services.onlineBooking.createBooking({
        timeSlotId: selectedTimeSlotId,
        phoneNumber: conversation.userPhoneNumber,
        appointments: appointmentCount
      });

      return {
        ok: true,
        next: "bookingSuccess",
        contextPatch: {
          bookingId: booking.id,
          bookingErrorMessage: null
        }
      };
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : null;

      if (status === 422) {
        const selectedDate = getStringValue(context, "selectedDate") ?? "that day";

        return {
          ok: true,
          next: "loadTimes",
          contextPatch: {
            appointmentTimePromptText: `That time is no longer available on ${selectedDate}. Reply with another time number.`,
            selectedTimeSlotId: null,
            selectedDisplayTime: null
          }
        };
      }

      if (status === 403) {
        return {
          ok: true,
          next: "welcome",
          contextPatch: {
            appointmentLocationPromptText:
              "That location is closed for bookings. Reply with another location number.",
            selectedLocationId: null,
            selectedLocationName: null,
            selectedScheduleId: null,
            selectedDate: null,
            selectedTimeSlotId: null,
            selectedDisplayTime: null
          }
        };
      }

      return {
        ok: false,
        next: "bookingError",
        contextPatch: {
          bookingErrorMessage: getBookingErrorMessage(error)
        }
      };
    }
  }
};
