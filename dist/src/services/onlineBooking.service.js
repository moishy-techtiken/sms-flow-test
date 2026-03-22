"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineBookingService = void 0;
const zod_1 = require("zod");
const BOOKING_API_BASE_URL = "http://localhost:3000/api/online";
const locationSchema = zod_1.z.object({
    id: zod_1.z.number(),
    locationName: zod_1.z.string(),
    phoneNumber: zod_1.z.string().optional(),
    allowBookings: zod_1.z.boolean(),
    onlineInfo: zod_1.z.string().nullable().optional()
});
const locationsResponseSchema = zod_1.z.object({
    locations: zod_1.z.array(locationSchema)
});
const scheduleSchema = zod_1.z.object({
    id: zod_1.z.number(),
    locationId: zod_1.z.number(),
    date: zod_1.z.string()
});
const timeSlotSchema = zod_1.z.object({
    id: zod_1.z.number(),
    time: zod_1.z.string(),
    displayTime: zod_1.z.string()
});
const bookingResponseSchema = zod_1.z.object({
    id: zod_1.z.number(),
    timeSlotId: zod_1.z.number(),
    phoneNumber: zod_1.z.string(),
    appointments: zod_1.z.number()
});
function createApiError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}
async function fetchJson(path, schema, init) {
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
            const parsed = JSON.parse(rawBody);
            if (typeof parsed.message === "string" && parsed.message.trim()) {
                message = parsed.message;
            }
        }
        catch {
            // Leave the raw response body as the message.
        }
        throw createApiError(response.status, message);
    }
    const json = await response.json();
    return schema.parse(json);
}
function normalizeBookingPhoneNumber(phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, "");
    const lastTenDigits = digits.slice(-10);
    if (lastTenDigits.length !== 10) {
        throw new Error("Booking phone number must contain at least 10 digits.");
    }
    return lastTenDigits;
}
exports.onlineBookingService = {
    async getOpenLocations() {
        const response = await fetchJson("/locations", locationsResponseSchema);
        return response.locations.filter((location) => location.allowBookings);
    },
    async getSchedules(locationId, level = 1) {
        return fetchJson(`/schedules/${encodeURIComponent(String(locationId))}?level=${encodeURIComponent(String(level))}`, zod_1.z.array(scheduleSchema));
    },
    async getTimeSlots(scheduleId, level = 1) {
        return fetchJson(`/timeSlots/${encodeURIComponent(String(scheduleId))}?level=${encodeURIComponent(String(level))}`, zod_1.z.array(timeSlotSchema));
    },
    async createBooking(input) {
        return fetchJson("/booking", bookingResponseSchema, {
            method: "POST",
            body: JSON.stringify({
                timeSlotId: input.timeSlotId,
                phoneNumber: normalizeBookingPhoneNumber(input.phoneNumber),
                appointments: input.appointments
            })
        });
    }
};
