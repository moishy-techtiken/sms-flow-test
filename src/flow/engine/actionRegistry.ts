import { appointmentBookingActions } from "../flows/appointmentBooking/actions";
import { exampleActions } from "../flows/example/actions";
import { rebMeirActions } from "../flows/rebMeir/actions";
import { ActionHandlerMap } from "./types";

export const actionRegistry: ActionHandlerMap = {
  ...appointmentBookingActions,
  ...exampleActions,
  ...rebMeirActions
};
