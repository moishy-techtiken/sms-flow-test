import { z } from "zod";

const BOOKING_API_BASE_URL = "http://localhost:3000/api/online";

const locationSchema = z.object({
  id: z.number(),
  locationName: z.string(),
  phoneNumber: z.string().optional(),
  allowBookings: z.boolean(),
  onlineInfo: z.string().nullable().optional()
});

const locationsResponseSchema = z.object({
  locations: z.array(locationSchema)
});

const scheduleSchema = z.object({
  id: z.number(),
  locationId: z.number(),
  date: z.string()
});

const timeSlotSchema = z.object({
  id: z.number(),
  time: z.string(),
  displayTime: z.string()
});

const bookingResponseSchema = z.object({
  id: z.number(),
  timeSlotId: z.number(),
  phoneNumber: z.string(),
  appointments: z.number()
});

export type OnlineBookingLocation = z.infer<typeof locationSchema>;
export type OnlineBookingSchedule = z.infer<typeof scheduleSchema>;
export type OnlineBookingTimeSlot = z.infer<typeof timeSlotSchema>;
export type OnlineBookingResult = z.infer<typeof bookingResponseSchema>;

export type OnlineBookingService = {
  getOpenLocations(): Promise<OnlineBookingLocation[]>;
  getSchedules(
    locationId: number,
    level?: number
  ): Promise<OnlineBookingSchedule[]>;
  getTimeSlots(
    scheduleId: number,
    level?: number
  ): Promise<OnlineBookingTimeSlot[]>;
  createBooking(input: {
    timeSlotId: number;
    phoneNumber: string;
    appointments: number;
  }): Promise<OnlineBookingResult>;
};

function createApiError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

async function fetchJson<T>(
  path: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${BOOKING_API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const rawBody = await response.text();
    let message = rawBody || `Booking API request failed with status ${response.status}.`;

    try {
      const parsed = JSON.parse(rawBody) as { message?: string };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message;
      }
    } catch {
      // Leave the raw response body as the message.
    }

    throw createApiError(response.status, message);
  }

  const json = await response.json();
  return schema.parse(json);
}

function normalizeBookingPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const lastTenDigits = digits.slice(-10);

  if (lastTenDigits.length !== 10) {
    throw new Error("Booking phone number must contain at least 10 digits.");
  }

  return lastTenDigits;
}

export const onlineBookingService: OnlineBookingService = {
  async getOpenLocations() {
    const response = await fetchJson("/locations", locationsResponseSchema);
    return response.locations.filter((location) => location.allowBookings);
  },

  async getSchedules(locationId, level = 1) {
    return fetchJson(
      `/schedules/${encodeURIComponent(String(locationId))}?level=${encodeURIComponent(
        String(level)
      )}`,
      z.array(scheduleSchema)
    );
  },

  async getTimeSlots(scheduleId, level = 1) {
    return fetchJson(
      `/timeSlots/${encodeURIComponent(String(scheduleId))}?level=${encodeURIComponent(
        String(level)
      )}`,
      z.array(timeSlotSchema)
    );
  },

  async createBooking(input) {
    return fetchJson(
      "/booking",
      bookingResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({
          timeSlotId: input.timeSlotId,
          phoneNumber: normalizeBookingPhoneNumber(input.phoneNumber),
          appointments: input.appointments
        })
      }
    );
  }
};
