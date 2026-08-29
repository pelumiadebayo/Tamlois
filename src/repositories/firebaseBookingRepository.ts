import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
  type Timestamp,
  type Transaction,
} from "firebase/firestore";
import { BUSINESS_SCHEDULE } from "../config/businessSchedule";
import { endTime } from "../lib/availability";
import {
  MAX_BOOKABLE_DURATION_MINUTES,
  blockUnitIds,
  isBookableDate,
  meetsMinimumNotice,
  salonSeatLockIds,
  sessionByStartTime,
  trichologyUnitLockIds,
} from "../lib/bookingCapacity";
import { auth, ensureAnonymousBookingUser } from "../lib/firebase";
import type {
  Booking,
  BookingRepositoryContract,
  BookingStatus,
  CreateBookingInput,
  RescheduleBookingInput,
  Service,
  ServiceExtra,
} from "../types";
import { serviceFromFirestore } from "./firestoreModels";

export type BookingCapacityErrorCode =
  | "SESSION_FULL"
  | "SLOT_UNAVAILABLE"
  | "BLOCKED"
  | "SERVICE_UNAVAILABLE"
  | "INVALID_DURATION"
  | "UNAUTHENTICATED"
  | "POLICY_CHANGED"
  | "BOOKING_FAILED";

export class BookingCapacityError extends Error {
  constructor(
    public readonly code: BookingCapacityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingCapacityError";
  }
}

type ResolvedBooking = {
  service: Service;
  extras: ServiceExtra[];
  totalDuration: number;
  subtotal: number;
};

function timestampToIso(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  )
    return (value as Timestamp).toDate().toISOString();
  return typeof value === "string" ? value : new Date().toISOString();
}

export function bookingFromFirestore(id: string, data: DocumentData): Booking {
  const customer = (data.customer ?? {}) as Record<string, unknown>;
  const serviceSnapshot = (data.serviceSnapshot ?? {}) as Booking["serviceSnapshot"];
  return {
    id,
    reference: String(data.reference ?? ""),
    ownerUid: String(data.ownerUid ?? ""),
    category: data.serviceType === "salon" ? "salon" : "trichology",
    schedulingMode:
      data.schedulingMode === "salon-session"
        ? "salon-session"
        : "precise-time",
    serviceId: String(data.serviceId ?? ""),
    serviceName: String(data.serviceNameSnapshot ?? ""),
    serviceSnapshot,
    extras: (data.extrasSnapshot ?? []) as Booking["extras"],
    addressSnapshot: String(data.addressSnapshot ?? ""),
    policyVersion: String(data.policyVersion ?? ""),
    preparationSnapshot: String(data.preparationSnapshot ?? ""),
    date: String(data.date ?? ""),
    startTime: String(data.startTime ?? ""),
    endTime: String(data.endTime ?? ""),
    salonSessionId:
      data.sessionId === "morning" ||
      data.sessionId === "afternoon" ||
      data.sessionId === "evening"
        ? data.sessionId
        : undefined,
    totalDuration: Number(data.totalDuration ?? 0),
    subtotal: Number(data.subtotal ?? 0),
    amountDueNow: 0,
    balanceDue: Number(data.subtotal ?? 0),
    fullName: String(customer.fullName ?? ""),
    phone: String(customer.phone ?? ""),
    email: String(customer.email ?? ""),
    preferredContact: (customer.preferredContactMethod ?? "") as Booking["preferredContact"],
    concern: String(customer.concern ?? ""),
    hopes: String(customer.hopes ?? ""),
    concernDuration: String(customer.concernDuration ?? ""),
    priorProfessionalTreatment: String(customer.priorProfessionalTreatment ?? ""),
    productsTreatments: String(customer.productsTreatments ?? ""),
    note: String(customer.note ?? ""),
    intakeResponses: (data.intakeResponses ?? {}) as Booking["intakeResponses"],
    policyConsent: data.policyConsent === true,
    policyConsentRecord: data.policyConsentRecord as Booking["policyConsentRecord"],
    paymentMode: "clinic",
    paymentStatus: (data.paymentStatus ?? "not-required") as Booking["paymentStatus"],
    status: (data.status ?? "pending-confirmation") as BookingStatus,
    internalNotes: String(data.internalNotes ?? ""),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: data.updatedAt,
    followUpDue: data.followUpDue === true,
    lockIds: Array.isArray(data.lockIds) ? (data.lockIds as string[]) : [],
  };
}

function publicError(error: unknown) {
  if (error instanceof BookingCapacityError) return error;
  if (import.meta.env.DEV)
    console.error("Firestore booking transaction failed", error);
  return new BookingCapacityError(
    "BOOKING_FAILED",
    "We could not verify and reserve that appointment. Please retry.",
  );
}

async function resolveBooking(
  transaction: Transaction,
  firestore: Firestore,
  input: Pick<CreateBookingInput, "service" | "extras">,
): Promise<ResolvedBooking> {
  const serviceSnapshot = await transaction.get(
    doc(firestore, "services", input.service.id),
  );
  if (!serviceSnapshot.exists())
    throw new BookingCapacityError(
      "SERVICE_UNAVAILABLE",
      "This service is no longer available.",
    );
  const service = serviceFromFirestore(
    serviceSnapshot.id,
    serviceSnapshot.data(),
  );
  if (!service.active || service.archived)
    throw new BookingCapacityError(
      "SERVICE_UNAVAILABLE",
      "This service is no longer available.",
    );
  const requestedExtraIds = [...new Set(input.extras.map((extra) => extra.id))];
  const extraSnapshots = await Promise.all(
    requestedExtraIds.map((id) =>
      transaction.get(doc(firestore, "serviceExtras", id)),
    ),
  );
  const extras = extraSnapshots
    .filter((item) => item.exists())
    .map((item) => ({ id: item.id, ...item.data() }) as ServiceExtra)
    .filter(
      (extra) =>
        extra.active && extra.compatibleServiceIds.includes(service.id),
    );
  if (extras.length !== requestedExtraIds.length)
    throw new BookingCapacityError(
      "SERVICE_UNAVAILABLE",
      "One of the selected extras is no longer available.",
    );
  const totalDuration =
    service.duration + extras.reduce((sum, extra) => sum + extra.duration, 0);
  if (totalDuration > MAX_BOOKABLE_DURATION_MINUTES)
    throw new BookingCapacityError(
      "INVALID_DURATION",
      "This service and extras exceed the four-hour online booking limit. Contact the clinic for help.",
    );
  return {
    service,
    extras,
    totalDuration,
    subtotal: service.price + extras.reduce((sum, extra) => sum + extra.price, 0),
  };
}

async function verifyCurrentPolicies(
  transaction: Transaction,
  firestore: Firestore,
  policies: CreateBookingInput["policyConsentRecord"]["policies"],
) {
  const ids = policies.map((policy) => policy.id);
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new BookingCapacityError(
      "POLICY_CHANGED",
      "Review and accept the current booking policies before submitting.",
    );
  const snapshots = await Promise.all(
    ids.map((id) =>
      transaction.get(doc(firestore, "bookingPolicies", id)),
    ),
  );
  const current = snapshots.every((snapshot, index) => {
    if (!snapshot.exists()) return false;
    const accepted = policies[index];
    const data = snapshot.data();
    return (
      data.title === accepted.title &&
      data.summary === accepted.summary &&
      data.version === accepted.version
    );
  });
  if (!current)
    throw new BookingCapacityError(
      "POLICY_CHANGED",
      "The booking policies changed. Review and accept them again before submitting.",
    );
}

async function clinicApprovalRequired(
  transaction: Transaction,
  firestore: Firestore,
) {
  const snapshot = await transaction.get(
    doc(firestore, "publicBookingSettings", "current"),
  );
  if (!snapshot.exists()) return true;
  return snapshot.data().payment?.approvalRequired !== false;
}

function makeAudit(
  transaction: Transaction,
  firestore: Firestore,
  actorUid: string,
  action: string,
  bookingId: string,
) {
  const auditId = crypto.randomUUID();
  transaction.set(doc(firestore, "auditLogs", auditId), {
    id: auditId,
    action,
    actorUid,
    targetCollection: "bookings",
    targetId: bookingId,
    createdAt: serverTimestamp(),
  });
}

function bookingEnd(service: Service, date: string, startTime: string, duration: number) {
  if (service.category === "salon") {
    const session = sessionByStartTime(startTime);
    if (!session)
      throw new BookingCapacityError(
        "SLOT_UNAVAILABLE",
        "Choose one of the available Salon sessions.",
      );
    return session.endTime;
  }
  return endTime(startTime, new Date(`${date}T00:00:00`), duration);
}

async function readOperationalState(
  transaction: Transaction,
  firestore: Firestore,
  date: string,
  startTime: string,
  service: Service,
  totalDuration: number,
  currentBookingId?: string,
) {
  if (!isBookableDate(date) || !meetsMinimumNotice(date, startTime))
    throw new BookingCapacityError(
      "BLOCKED",
      "That appointment is outside the available booking window.",
    );

  if (service.category === "salon") {
    const session = sessionByStartTime(startTime);
    if (!session)
      throw new BookingCapacityError(
        "SLOT_UNAVAILABLE",
        "Choose one of the available Salon sessions.",
      );
    const blockIds = blockUnitIds(date, session.startTime, session.endTime);
    const seatIds = salonSeatLockIds(date, session.id);
    const [blockSnapshots, seatSnapshots, overrideSnapshot] = await Promise.all([
      Promise.all(
        blockIds.map((id) =>
          transaction.get(doc(firestore, "blockedPeriods", id)),
        ),
      ),
      Promise.all(
        seatIds.map((id) => transaction.get(doc(firestore, "bookingLocks", id))),
      ),
      transaction.get(
        doc(firestore, "capacityOverrides", `${date}_${session.id}`),
      ),
    ]);
    if (blockSnapshots.some((snapshot) => snapshot.exists()))
      throw new BookingCapacityError(
        "BLOCKED",
        "That Salon session is blocked. Please choose another session.",
      );
    const capacity = overrideSnapshot.exists()
      ? Math.max(0, Math.min(3, Number(overrideSnapshot.data().capacity)))
      : session.capacity;
    const availableSeat = seatSnapshots
      .slice(0, capacity)
      .find(
        (snapshot) =>
          !snapshot.exists() || snapshot.data().bookingId === currentBookingId,
      );
    if (!availableSeat)
      throw new BookingCapacityError(
        "SESSION_FULL",
        "That session has just become fully booked. Please choose another session.",
      );
    return {
      lockIds: [availableSeat.id],
      sessionId: session.id,
      endTime: session.endTime,
    };
  }

  const lockIds = trichologyUnitLockIds(date, startTime, totalDuration);
  const [lockSnapshots, blockSnapshots] = await Promise.all([
    Promise.all(
      lockIds.map((id) => transaction.get(doc(firestore, "bookingLocks", id))),
    ),
    Promise.all(
      lockIds.map((id) => transaction.get(doc(firestore, "blockedPeriods", id))),
    ),
  ]);
  if (blockSnapshots.some((snapshot) => snapshot.exists()))
    throw new BookingCapacityError(
      "BLOCKED",
      "That time is blocked. Please choose another appointment.",
    );
  if (
    lockSnapshots.some(
      (snapshot) =>
        snapshot.exists() && snapshot.data().bookingId !== currentBookingId,
    )
  )
    throw new BookingCapacityError(
      "SLOT_UNAVAILABLE",
      "That time has just been booked. Please choose another appointment.",
    );
  return {
    lockIds,
    sessionId: undefined,
    endTime: bookingEnd(service, date, startTime, totalDuration),
  };
}

function lockRecord(
  lockId: string,
  bookingId: string,
  ownerUid: string,
  service: Service,
  date: string,
  startTime: string,
  endTimeValue: string,
  sessionId?: "morning" | "afternoon" | "evening",
) {
  return {
    lockId,
    bookingId,
    ownerUid,
    serviceType: service.category,
    date,
    ...(sessionId ? { sessionId } : { unitTime: lockId.slice(-5) }),
    startTime,
    endTime: endTimeValue,
    status: "active",
    createdAt: serverTimestamp(),
  };
}

export class FirebaseBookingRepository implements BookingRepositoryContract {
  constructor(
    private firestore: Firestore,
    private getBookingUser: () => Promise<{ uid: string }> =
      ensureAnonymousBookingUser,
    private getCurrentUid: () => string = () => auth?.currentUser?.uid ?? "",
  ) {}

  async list() {
    const snapshot = await getDocs(collection(this.firestore, "bookings"));
    return snapshot.docs.map((item) =>
      bookingFromFirestore(item.id, item.data()),
    );
  }

  async get(id: string) {
    const snapshot = await getDoc(doc(this.firestore, "bookings", id));
    return snapshot.exists()
      ? bookingFromFirestore(snapshot.id, snapshot.data())
      : null;
  }

  async createBooking(input: CreateBookingInput) {
    let user;
    try {
      user = await this.getBookingUser();
    } catch (error) {
      throw error instanceof Error
        ? error
        : new BookingCapacityError(
            "UNAUTHENTICATED",
            "A secure booking session could not be started.",
          );
    }
    const bookingRef = doc(this.firestore, "bookings", input.bookingId);
    try {
      return await runTransaction(this.firestore, async (transaction) => {
        await verifyCurrentPolicies(
          transaction,
          this.firestore,
          input.policyConsentRecord.policies,
        );
        const approvalRequired = await clinicApprovalRequired(
          transaction,
          this.firestore,
        );
        const resolved = await resolveBooking(transaction, this.firestore, input);
        const operational = await readOperationalState(
          transaction,
          this.firestore,
          input.date,
          input.startTime,
          resolved.service,
          resolved.totalDuration,
        );
        const customer = {
          fullName: input.details.fullName.trim(),
          phone: input.details.phone.trim(),
          email: input.details.email.trim().toLowerCase(),
          preferredContactMethod: input.details.preferredContact,
          concern: input.details.concern.trim(),
          hopes: input.details.hopes.trim(),
          concernDuration: input.details.concernDuration.trim(),
          priorProfessionalTreatment:
            input.details.priorProfessionalTreatment.trim(),
          productsTreatments: input.details.productsTreatments.trim(),
          note: input.details.note.trim(),
        };
        const bookingRecord = {
          id: input.bookingId,
          reference: input.bookingReference,
          ownerUid: user.uid,
          serviceId: resolved.service.id,
          serviceNameSnapshot: resolved.service.name,
          serviceType: resolved.service.category,
          schedulingMode: resolved.service.schedulingMode,
          date: input.date,
          startTime: input.startTime,
          endTime: operational.endTime,
          ...(operational.sessionId
            ? { sessionId: operational.sessionId }
            : {}),
          lockIds: operational.lockIds,
          customer,
          serviceSnapshot: {
            id: resolved.service.id,
            name: resolved.service.name,
            category: resolved.service.category,
            price: resolved.service.price,
            duration: resolved.service.duration,
            preparation: resolved.service.preparation,
          },
          extrasSnapshot: resolved.extras.map(
            ({ id, name, price, duration }) => ({ id, name, price, duration }),
          ),
          totalDuration: resolved.totalDuration,
          subtotal: resolved.subtotal,
          addressSnapshot: input.addressSnapshot,
          preparationSnapshot: resolved.service.preparation,
          policyVersion: input.policyConsentRecord.version,
          policyConsent: true,
          policyConsentRecord: input.policyConsentRecord,
          intakeResponses: input.intakeResponses,
          status: approvalRequired ? "pending-confirmation" : "confirmed",
          paymentStatus: "not-required",
          followUpDue: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        transaction.set(bookingRef, bookingRecord);
        operational.lockIds.forEach((lockId) =>
          transaction.set(
            doc(this.firestore, "bookingLocks", lockId),
            lockRecord(
              lockId,
              input.bookingId,
              user.uid,
              resolved.service,
              input.date,
              input.startTime,
              operational.endTime,
              operational.sessionId,
            ),
          ),
        );
        return bookingFromFirestore(input.bookingId, {
          ...bookingRecord,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (error) {
      // If the transaction committed but its response was interrupted, the
      // stable booking ID lets the same anonymous owner recover the result.
      // A pre-create get cannot be used because Rules cannot prove ownership
      // for a document that does not exist yet.
      try {
        const existing = await getDoc(bookingRef);
        if (existing.exists()) {
          const stored = bookingFromFirestore(existing.id, existing.data());
          if (
            stored.ownerUid === user.uid &&
            stored.reference === input.bookingReference
          )
            return stored;
        }
      } catch {
        // Expected when no owned booking exists; retain the original error.
      }
      throw publicError(error);
    }
  }

  async cancelBookingAsAdmin(bookingId: string) {
    await runTransaction(this.firestore, async (transaction) => {
      const bookingRef = doc(this.firestore, "bookings", bookingId);
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists()) throw new Error("Booking no longer exists.");
      const data = snapshot.data();
      if (
        ![
          "pending-confirmation",
          "request-submitted",
          "confirmed",
          "reschedule-requested",
          "cancellation-requested",
        ].includes(String(data.status))
      )
        throw new Error("This booking can no longer be cancelled.");
      const lockIds = Array.isArray(data.lockIds) ? (data.lockIds as string[]) : [];
      await Promise.all(
        lockIds.map((id) =>
          transaction.get(doc(this.firestore, "bookingLocks", id)),
        ),
      );
      transaction.update(bookingRef, {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      lockIds.forEach((id) =>
        transaction.delete(doc(this.firestore, "bookingLocks", id)),
      );
      makeAudit(
        transaction,
        this.firestore,
        this.getCurrentUid(),
        "booking.status.cancelled",
        bookingId,
      );
    });
  }

  async updateStatusAsAdmin(bookingId: string, status: BookingStatus) {
    if (status === "cancelled") return this.cancelBookingAsAdmin(bookingId);
    await runTransaction(this.firestore, async (transaction) => {
      const bookingRef = doc(this.firestore, "bookings", bookingId);
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists()) throw new Error("Booking no longer exists.");
      transaction.update(bookingRef, {
        status,
        followUpDue: status === "completed",
        updatedAt: serverTimestamp(),
      });
      makeAudit(
        transaction,
        this.firestore,
        this.getCurrentUid(),
        `booking.status.${status}`,
        bookingId,
      );
    });
  }

  async saveInternalNotesAsAdmin(bookingId: string, internalNotes: string) {
    if (internalNotes.length > 2_000)
      throw new Error("Internal notes must be 2,000 characters or fewer.");
    await runTransaction(this.firestore, async (transaction) => {
      const bookingRef = doc(this.firestore, "bookings", bookingId);
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists()) throw new Error("Booking no longer exists.");
      transaction.update(bookingRef, {
        internalNotes,
        updatedAt: serverTimestamp(),
      });
      makeAudit(
        transaction,
        this.firestore,
        this.getCurrentUid(),
        "booking.notes.updated",
        bookingId,
      );
    });
  }

  async rescheduleBookingAsAdmin(
    bookingId: string,
    input: RescheduleBookingInput,
  ) {
    await runTransaction(this.firestore, async (transaction) => {
      const bookingRef = doc(this.firestore, "bookings", bookingId);
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists()) throw new Error("Booking no longer exists.");
      const stored = bookingFromFirestore(snapshot.id, snapshot.data());
      if (["cancelled", "completed", "no-show", "expired"].includes(stored.status))
        throw new Error("This booking can no longer be rescheduled.");
      const serviceSnapshot = await transaction.get(
        doc(this.firestore, "services", stored.serviceId),
      );
      if (!serviceSnapshot.exists()) throw new Error("Service no longer exists.");
      const service = serviceFromFirestore(
        serviceSnapshot.id,
        serviceSnapshot.data(),
      );
      const operational = await readOperationalState(
        transaction,
        this.firestore,
        input.date,
        input.startTime,
        service,
        stored.totalDuration,
        bookingId,
      );
      await Promise.all(
        (stored.lockIds || []).map((id) =>
          transaction.get(doc(this.firestore, "bookingLocks", id)),
        ),
      );
      operational.lockIds.forEach((lockId) =>
        transaction.set(
          doc(this.firestore, "bookingLocks", lockId),
          lockRecord(
            lockId,
            bookingId,
            stored.ownerUid ?? "",
            service,
            input.date,
            input.startTime,
            operational.endTime,
            operational.sessionId,
          ),
        ),
      );
      (stored.lockIds || [])
        .filter((id) => !operational.lockIds.includes(id))
        .forEach((id) =>
          transaction.delete(doc(this.firestore, "bookingLocks", id)),
        );
      transaction.update(bookingRef, {
        date: input.date,
        startTime: input.startTime,
        endTime: operational.endTime,
        lockIds: operational.lockIds,
        ...(operational.sessionId
          ? { sessionId: operational.sessionId }
          : {}),
        updatedAt: serverTimestamp(),
      });
      makeAudit(
        transaction,
        this.firestore,
        this.getCurrentUid(),
        "booking.rescheduled",
        bookingId,
      );
    });
  }
}
