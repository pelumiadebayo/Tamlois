import { parseISO } from "date-fns";
import { endTime } from "../lib/availability";
import { calculateBookingTotals } from "../lib/booking";
import { db, firebaseEnabled } from "../lib/firebase";
import type {
  Booking,
  BookingRepositoryContract,
  CreateBookingInput,
  RescheduleBookingInput,
} from "../types";
import { bookingRepository as localBookings } from "./localRepository";
import { FirebaseBookingRepository } from "./firebaseBookingRepository";

class DemoBookingRepository implements BookingRepositoryContract {
  list() {
    return localBookings.list();
  }

  get(id: string) {
    return localBookings.get(id);
  }

  async createBooking(input: CreateBookingInput) {
    const totals = calculateBookingTotals(
      input.service,
      input.extras,
      "clinic",
      {
        enabledModes: ["clinic"],
        defaultMode: "clinic",
        depositPercentage: 0,
        fixedDepositAmount: 0,
        balanceDue: "at-clinic",
        holdMinutes: 0,
        approvalRequired: true,
      },
    );
    const booking: Booking = {
      id: input.bookingId,
      reference: input.bookingReference,
      category: input.service.category,
      schedulingMode: input.service.schedulingMode,
      serviceId: input.service.id,
      serviceName: input.service.name,
      serviceSnapshot: {
        id: input.service.id,
        name: input.service.name,
        category: input.service.category,
        price: input.service.price,
        duration: input.service.duration,
        preparation: input.service.preparation,
      },
      extras: input.extras.map(({ id, name, price, duration }) => ({
        id,
        name,
        price,
        duration,
      })),
      addressSnapshot: input.addressSnapshot,
      policyVersion: input.policyConsentRecord.version,
      preparationSnapshot: input.service.preparation,
      date: input.date,
      startTime: input.startTime,
      endTime: endTime(
        input.startTime,
        parseISO(input.date),
        totals.totalDuration,
      ),
      totalDuration: totals.totalDuration,
      subtotal: totals.subtotal,
      amountDueNow: 0,
      balanceDue: totals.subtotal,
      ...input.details,
      intakeResponses: input.intakeResponses,
      policyConsent: true,
      policyConsentRecord: input.policyConsentRecord,
      paymentMode: "clinic",
      paymentStatus: "not-required",
      status: input.approvalRequired ? "pending-confirmation" : "confirmed",
      internalNotes: "",
      createdAt: new Date().toISOString(),
      followUpDue: false,
      lockIds: [],
    };
    return localBookings.save(booking);
  }

  async cancelBookingAsAdmin(bookingId: string) {
    const booking = await localBookings.get(bookingId);
    if (!booking) throw new Error("Booking no longer exists.");
    await localBookings.save({ ...booking, status: "cancelled" });
  }

  async rescheduleBookingAsAdmin(
    bookingId: string,
    input: RescheduleBookingInput,
  ) {
    const booking = await localBookings.get(bookingId);
    if (!booking) throw new Error("Booking no longer exists.");
    await localBookings.save({
      ...booking,
      date: input.date,
      startTime: input.startTime,
      endTime: endTime(
        input.startTime,
        parseISO(input.date),
        booking.totalDuration,
      ),
    });
  }

  async updateStatusAsAdmin(
    bookingId: string,
    status: Booking["status"],
  ) {
    if (status === "cancelled") return this.cancelBookingAsAdmin(bookingId);
    const booking = await localBookings.get(bookingId);
    if (!booking) throw new Error("Booking no longer exists.");
    await localBookings.save({
      ...booking,
      status,
      followUpDue: status === "completed",
    });
  }

  async saveInternalNotesAsAdmin(bookingId: string, internalNotes: string) {
    const booking = await localBookings.get(bookingId);
    if (!booking) throw new Error("Booking no longer exists.");
    await localBookings.save({ ...booking, internalNotes });
  }
}

export const bookingOperationsRepository: BookingRepositoryContract =
  firebaseEnabled && db
    ? new FirebaseBookingRepository(db)
    : new DemoBookingRepository();
