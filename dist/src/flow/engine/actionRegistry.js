"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionRegistry = void 0;
const actions_1 = require("../flows/appointmentBooking/actions");
const actions_2 = require("../flows/example/actions");
const actions_3 = require("../flows/rebMeir/actions");
exports.actionRegistry = {
    ...actions_1.appointmentBookingActions,
    ...actions_2.exampleActions,
    ...actions_3.rebMeirActions
};
