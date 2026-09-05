import { createHash } from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import type {
  PaymentStatusResponse,
  ReservationResponse,
  ReserveBookingRequest,
} from "./contracts.js";
import {
  BUSINESS_SCHEDULE,
  CURRENCY,
  DEFAULT_PAYMENT_SETTINGS,
  MAX_HOLD_MINUTES,
  OWNER_UID,
  calculatePayableAmountKobo,
  endTime,
  internalBookingReference,
  nairaToKobo,
  operationalUnitIds,
  paystackReference,
  salonSeatIds,
  trichologyLockIds,
  type AuthoritativePaymentSettings,
} from "./domain.js";
import type {
  PaymentGateway,
  VerifiedPaystackTransaction,
} from "./paystack.js";

export type PaymentErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_OPTION_DISABLED"
  | "POLICY_CHANGED"
  | "SLOT_UNAVAILABLE"
  | "PAYMENT_INITIALIZATION_FAILED"
  | "PAYMENT_NOT_SUCCESSFUL"
  | "PAYMENT_MISMATCH"
  | "REFERENCE_MISMATCH"
  | "BOOKING_NOT_FOUND";

export class PaymentServiceError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

type ServiceRecord = {
  id: string;
  name: string;
  category: "salon" | "trichology";
  active: boolean;
  archived?: boolean;
  placeholder?: boolean;
  price: number;
  durationMinutes: number;
  preparation?: string;
};

type ExtraRecord = {
  id: string;
  name: string;
  active: boolean;
  placeholder?: boolean;
  price: number;
  duration: number;
  compatibleServiceIds: string[];
};

type AllocatedSlot = {
  lockIds: string[];
  sessionId?: "morning" | "afternoon" | "evening";
  endTime: string;
};

export interface FinalizeOptions {
  source: "callback" | "webhook" | "admin-reverify";
  eventId?: string;
  adminUid?: string;
  adminReason?: string;
}

export class PaymentService {
  constructor(
    private readonly firestore: Firestore,
    private readonly gateway: PaymentGateway,
    private readonly appPublicUrl: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async reserveAndInitialize(
    uid: string,
    input: ReserveBookingRequest,
  ): Promise<ReservationResponse> {
    const now = this.clock();
    const prepared = await this.firestore.runTransaction(async (transaction) =>
      this.reserveTransaction(transaction, uid, input, now),
    );

    if (prepared.response.idempotentReplay) {
      if (input.paymentOption === "clinic") return prepared.response;
      if (!prepared.response.paystackReference)
        throw new PaymentServiceError(
          "REFERENCE_MISMATCH",
          "The existing reservation has no Paystack reference.",
        );
      const attempt = await this.firestore
        .doc(`paymentAttempts/${prepared.response.paystackReference}`)
        .get();
      const attemptData = attempt.data();
      if (
        attempt.exists &&
        typeof attemptData?.authorizationUrl === "string" &&
        typeof attemptData.accessCode === "string"
      )
        return {
          ...prepared.response,
          authorizationUrl: attemptData.authorizationUrl,
          accessCode: attemptData.accessCode,
        };
      throw new PaymentServiceError(
        "PAYMENT_INITIALIZATION_FAILED",
        "The previous payment attempt cannot be resumed. Select the appointment again and retry.",
      );
    }
    if (input.paymentOption === "clinic")
      return prepared.response;

    try {
      const initialized = await this.gateway.initialize({
        email: input.details.email,
        amountKobo: prepared.response.expectedAmountKobo,
        reference: prepared.response.paystackReference!,
        callbackUrl: callbackUrl(this.appPublicUrl),
        metadata: {
          bookingId: prepared.response.bookingId,
          bookingReference: prepared.response.bookingReference,
          customerUid: uid,
          paymentOption: input.paymentOption,
        },
      });
      if (initialized.reference !== prepared.response.paystackReference)
        throw new Error("PAYSTACK_REFERENCE_MISMATCH");

      await this.firestore.runTransaction(async (transaction) => {
        const bookingRef = this.firestore.doc(
          `bookings/${prepared.response.bookingId}`,
        );
        const attemptRef = this.firestore.doc(
          `paymentAttempts/${prepared.response.paystackReference}`,
        );
        const [bookingSnapshot, attemptSnapshot] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(attemptRef),
        ]);
        if (!bookingSnapshot.exists || !attemptSnapshot.exists)
          throw new Error("RESERVATION_DISAPPEARED");
        const booking = bookingSnapshot.data()!;
        if (
          booking.ownerUid !== uid ||
          booking.paystackReference !== initialized.reference ||
          booking.paymentStatus !== "not-started"
        )
          throw new Error("RESERVATION_STATE_CHANGED");
        transaction.update(bookingRef, {
          paymentStatus: "initialised",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(attemptRef, {
          status: "initialised",
          accessCode: initialized.accessCode,
          authorizationUrl: initialized.authorizationUrl,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return {
        ...prepared.response,
        authorizationUrl: initialized.authorizationUrl,
        accessCode: initialized.accessCode,
        paymentStatus: "initialised",
      };
    } catch (error) {
      await this.compensateInitializationFailure(
        prepared.response.bookingId,
        prepared.response.paystackReference!,
      );
      throw new PaymentServiceError(
        "PAYMENT_INITIALIZATION_FAILED",
        "We could not start Paystack checkout. Your appointment hold was released; choose the appointment again and retry.",
      );
    }
  }

  private async reserveTransaction(
    transaction: Transaction,
    uid: string,
    input: ReserveBookingRequest,
    now: Date,
  ) {
    const bookingRef = this.firestore.doc(`bookings/${input.requestId}`);
    const existing = await transaction.get(bookingRef);
    if (existing.exists) {
      const data = existing.data()!;
      if (data.ownerUid !== uid)
        throw new PaymentServiceError(
          "FORBIDDEN",
          "This booking request belongs to another session.",
        );
      if (
        data.serviceId !== input.serviceId ||
        data.date !== input.date ||
        data.startTime !== input.startTime ||
        (data.paymentOption ?? data.paymentMode) !== input.paymentOption
      )
        throw new PaymentServiceError(
          "INVALID_REQUEST",
          "This request ID was already used for different booking details.",
        );
      return {
        response: reservationResponse(existing.id, data, true),
      };
    }

    const uniqueExtraIds = [...new Set(input.extraIds)];
    if (uniqueExtraIds.length !== input.extraIds.length)
      throw new PaymentServiceError(
        "INVALID_REQUEST",
        "Duplicate extras are not allowed.",
      );

    const serviceRef = this.firestore.doc(`services/${input.serviceId}`);
    const settingsRef = this.firestore.doc("businessSettings/booking");
    const serviceSnapshot = await transaction.get(serviceRef);
    const settingsSnapshot = await transaction.get(settingsRef);
    if (!serviceSnapshot.exists)
      throw new PaymentServiceError(
        "SERVICE_UNAVAILABLE",
        "This service is no longer available.",
      );
    const service = parseService(serviceSnapshot.data()!);
    if (!service.active || service.archived || service.placeholder)
      throw new PaymentServiceError(
        "SERVICE_UNAVAILABLE",
        "This service is no longer available.",
      );
    const settings = parseSettings(settingsSnapshot.data());
    if (!settings.enabledModes.includes(input.paymentOption))
      throw new PaymentServiceError(
        "PAYMENT_OPTION_DISABLED",
        "That payment option is no longer available.",
      );

    const extraSnapshots = await Promise.all(
      uniqueExtraIds.map((id) =>
        transaction.get(this.firestore.doc(`serviceExtras/${id}`)),
      ),
    );
    const extras = extraSnapshots.map((snapshot) => {
      if (!snapshot.exists)
        throw new PaymentServiceError(
          "SERVICE_UNAVAILABLE",
          "One selected extra is no longer available.",
        );
      return parseExtra(snapshot.data()!);
    });
    if (
      extras.some(
        (extra) =>
          !extra.active ||
          extra.placeholder ||
          !extra.compatibleServiceIds.includes(service.id),
      )
    )
      throw new PaymentServiceError(
        "SERVICE_UNAVAILABLE",
        "One selected extra is no longer available for this service.",
      );

    const currentPolicySnapshot = await transaction.get(
      this.firestore.collection("bookingPolicies"),
    );
    const acceptedPolicies = new Map(
      input.policyConsent.policies.map((policy) => [policy.id, policy]),
    );
    const policiesCurrent =
      currentPolicySnapshot.size > 0 &&
      currentPolicySnapshot.size === acceptedPolicies.size &&
      currentPolicySnapshot.docs.every((snapshot) => {
        const accepted = acceptedPolicies.get(snapshot.id);
        if (!accepted) return false;
        const data = snapshot.data();
        return (
          data.title === accepted.title &&
          data.summary === accepted.summary &&
          data.version === accepted.version
        );
      });
    if (!policiesCurrent)
      throw new PaymentServiceError(
        "POLICY_CHANGED",
        "The booking policies changed. Review and accept the current policies again.",
      );

    const totalDuration =
      service.durationMinutes +
      extras.reduce((sum, extra) => sum + extra.duration, 0);
    if (totalDuration < 15 || totalDuration > 240)
      throw new PaymentServiceError(
        "SERVICE_UNAVAILABLE",
        "The selected service duration cannot be booked online.",
      );
    assertBookingWindow(input.date, input.startTime, totalDuration, now);

    const allocation = await allocateSlot(
      transaction,
      this.firestore,
      service,
      input.date,
      input.startTime,
      totalDuration,
      now,
    );
    const subtotalKobo =
      nairaToKobo(service.price) +
      extras.reduce((sum, extra) => sum + nairaToKobo(extra.price), 0);
    let expectedAmountKobo: number;
    try {
      expectedAmountKobo = calculatePayableAmountKobo(
        subtotalKobo,
        input.paymentOption,
        settings,
      );
    } catch {
      throw new PaymentServiceError(
        "PAYMENT_OPTION_DISABLED",
        "That payment option is not configured correctly.",
      );
    }
    const isClinicPayment = input.paymentOption === "clinic";
    const bookingReference = internalBookingReference(now);
    const gatewayReference = isClinicPayment
      ? undefined
      : paystackReference(input.requestId);
    const holdExpiresAt = isClinicPayment
      ? undefined
      : Timestamp.fromMillis(
          now.getTime() + settings.holdMinutes * 60_000,
        );
    const bookingStatus = isClinicPayment
      ? settings.approvalRequired
        ? "pending-confirmation"
        : "confirmed"
      : "awaiting-payment";
    const paymentStatus = isClinicPayment ? "not-required" : "not-started";
    const customer = {
      fullName: input.details.fullName,
      phone: input.details.phone,
      email: input.details.email,
      preferredContactMethod: input.details.preferredContact,
      concern: input.details.concern,
      hopes: input.details.hopes,
      concernDuration: input.details.concernDuration,
      priorProfessionalTreatment: input.details.priorProfessionalTreatment,
      productsTreatments: input.details.productsTreatments,
      note: input.details.note,
    };
    const bookingRecord = {
      id: input.requestId,
      reference: bookingReference,
      bookingReference,
      ownerUid: uid,
      customerUid: uid,
      customer,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      serviceType: service.category,
      schedulingMode:
        service.category === "salon" ? "salon-session" : "precise-time",
      serviceSnapshot: {
        id: service.id,
        name: service.name,
        category: service.category,
        priceKobo: nairaToKobo(service.price),
        duration: service.durationMinutes,
        preparation: service.preparation ?? "Contact Tamlois if you need preparation guidance.",
      },
      extrasSnapshot: extras.map((extra) => ({
        id: extra.id,
        name: extra.name,
        priceKobo: nairaToKobo(extra.price),
        duration: extra.duration,
      })),
      date: input.date,
      startTime: input.startTime,
      endTime: allocation.endTime,
      ...(allocation.sessionId ? { sessionId: allocation.sessionId } : {}),
      lockIds: allocation.lockIds,
      seatOrIntervalAllocation: allocation.lockIds,
      totalDuration,
      subtotalKobo,
      expectedAmountKobo,
      amountPaidKobo: 0,
      balanceDueKobo: subtotalKobo - expectedAmountKobo,
      currency: CURRENCY,
      paymentOption: input.paymentOption,
      paymentMode: input.paymentOption,
      paymentStatus,
      ...(gatewayReference ? { paystackReference: gatewayReference } : {}),
      ...(holdExpiresAt ? { holdExpiresAt } : {}),
      status: bookingStatus,
      bookingStatus,
      approvalRequired: settings.approvalRequired,
      requiresAdminAction: false,
      policyVersion: input.policyConsent.version,
      policyConsent: true,
      policyConsentRecord: {
        ...input.policyConsent,
        // The trusted backend owns the durable acceptance timestamp.
        acceptedAt: now.toISOString(),
      },
      acceptedPoliciesSnapshot: input.policyConsent.policies,
      intakeResponses: input.intakeResponses,
      addressSnapshot: settings.address,
      preparationSnapshot:
        service.preparation ?? "Contact Tamlois if you need preparation guidance.",
      internalNotes: "",
      followUpDue: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.create(bookingRef, bookingRecord);
    for (const lockId of allocation.lockIds) {
      const lockRef = this.firestore.doc(`bookingLocks/${lockId}`);
      transaction.set(lockRef, {
        lockId,
        bookingId: input.requestId,
        ownerUid: uid,
        serviceType: service.category,
        date: input.date,
        ...(allocation.sessionId
          ? { sessionId: allocation.sessionId }
          : { unitTime: lockId.slice(-5) }),
        startTime: input.startTime,
        endTime: allocation.endTime,
        status: isClinicPayment ? "confirmed" : "provisional",
        ...(holdExpiresAt ? { expiresAt: holdExpiresAt } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (gatewayReference) {
      transaction.create(
        this.firestore.doc(`paymentAttempts/${gatewayReference}`),
        {
          id: gatewayReference,
          bookingId: input.requestId,
          ownerUid: uid,
          provider: "paystack",
          status: "created",
          expectedAmountKobo,
          currency: CURRENCY,
          paymentOption: input.paymentOption,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      );
    }
    transaction.create(this.firestore.collection("auditLogs").doc(), {
      action: "booking.reserved",
      actorUid: uid,
      targetCollection: "bookings",
      targetId: input.requestId,
      source: "function",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      response: reservationResponse(
        input.requestId,
        {
          ...bookingRecord,
          holdExpiresAt,
          createdAt: Timestamp.fromDate(now),
        },
        false,
      ),
    };
  }

  private async compensateInitializationFailure(
    bookingId: string,
    reference: string,
  ) {
    await this.firestore.runTransaction(async (transaction) => {
      const bookingRef = this.firestore.doc(`bookings/${bookingId}`);
      const attemptRef = this.firestore.doc(`paymentAttempts/${reference}`);
      const [bookingSnapshot, attemptSnapshot] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(attemptRef),
      ]);
      if (!bookingSnapshot.exists) return;
      const booking = bookingSnapshot.data()!;
      if (
        booking.paystackReference !== reference ||
        !["not-started", "initialised"].includes(String(booking.paymentStatus))
      )
        return;
      const lockRefs = lockReferences(this.firestore, booking.lockIds);
      const lockSnapshots = await Promise.all(
        lockRefs.map((lockRef) => transaction.get(lockRef)),
      );
      lockSnapshots.forEach((snapshot) => {
        if (snapshot.exists && snapshot.data()?.bookingId === bookingId)
          transaction.delete(snapshot.ref);
      });
      transaction.update(bookingRef, {
        status: "payment-failed",
        bookingStatus: "payment-failed",
        paymentStatus: "failed",
        failureCode: "initialization-failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (attemptSnapshot.exists)
        transaction.update(attemptRef, {
          status: "initialization-failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
    });
  }

  async verifyAndFinalize(
    uid: string,
    bookingId: string,
    reference: string,
    source: "callback" | "admin-reverify" = "callback",
    adminReason?: string,
  ) {
    const snapshot = await this.firestore.doc(`bookings/${bookingId}`).get();
    if (!snapshot.exists)
      throw new PaymentServiceError(
        "BOOKING_NOT_FOUND",
        "That booking could not be found.",
      );
    const booking = snapshot.data()!;
    const isAdmin = uid === OWNER_UID;
    if (booking.ownerUid !== uid && !isAdmin)
      throw new PaymentServiceError(
        "FORBIDDEN",
        "You cannot verify another customer's payment.",
      );
    if (booking.paystackReference !== reference)
      throw new PaymentServiceError(
        "REFERENCE_MISMATCH",
        "The payment reference does not match this booking.",
      );
    const verified = await this.gateway.verify(reference);
    return this.finalizeVerifiedPayment(verified, {
      source,
      adminUid: isAdmin ? uid : undefined,
      adminReason,
    });
  }

  async finalizeVerifiedPayment(
    verified: VerifiedPaystackTransaction,
    options: FinalizeOptions,
  ): Promise<PaymentStatusResponse> {
    const attemptRef = this.firestore.doc(
      `paymentAttempts/${verified.reference}`,
    );
    const attempt = await attemptRef.get();
    if (!attempt.exists)
      throw new PaymentServiceError(
        "REFERENCE_MISMATCH",
        "No booking is associated with this Paystack reference.",
      );
    const bookingId = String(attempt.data()!.bookingId);
    const eventId =
      options.eventId ??
      createHash("sha256")
        .update(`${options.source}:${verified.reference}:${verified.id}`)
        .digest("hex");
    return this.firestore.runTransaction(async (transaction) => {
      const bookingRef = this.firestore.doc(`bookings/${bookingId}`);
      const eventRef = this.firestore.doc(`paymentEvents/${eventId}`);
      const [bookingSnapshot, attemptSnapshot, eventSnapshot] =
        await Promise.all([
          transaction.get(bookingRef),
          transaction.get(attemptRef),
          transaction.get(eventRef),
        ]);
      if (!bookingSnapshot.exists || !attemptSnapshot.exists)
        throw new PaymentServiceError(
          "BOOKING_NOT_FOUND",
          "The reservation no longer exists.",
        );
      const booking = bookingSnapshot.data()!;
      if (eventSnapshot.exists || booking.paymentStatus === "paid")
        return paymentStatusResponse(bookingSnapshot.id, booking);
      if (
        booking.paystackReference !== verified.reference ||
        attemptSnapshot.data()!.bookingId !== bookingId
      )
        throw new PaymentServiceError(
          "REFERENCE_MISMATCH",
          "The Paystack reference is not attached to this booking.",
        );

      const expectedAmountKobo = Number(booking.expectedAmountKobo);
      const expectedEmail = String(booking.customer?.email ?? "").toLowerCase();
      const metadataBookingId = String(verified.metadata.bookingId ?? "");
      const metadataUid = String(verified.metadata.customerUid ?? "");
      const relationshipValid =
        verified.reference === booking.paystackReference &&
        metadataBookingId === bookingId &&
        metadataUid === booking.ownerUid &&
        verified.customerEmail === expectedEmail;
      const exactMoney =
        Number.isSafeInteger(verified.amountKobo) &&
        verified.amountKobo === expectedAmountKobo &&
        verified.currency === CURRENCY;
      const lockRefs = lockReferences(this.firestore, booking.lockIds);
      const lockSnapshots = await Promise.all(
        lockRefs.map((lockRef) => transaction.get(lockRef)),
      );
      const bookingCanBeConfirmed = ![
        "cancelled",
        "completed",
        "no-show",
      ].includes(String(booking.status ?? booking.bookingStatus));

      if (verified.status !== "success") {
        const gatewayStatus = sanitizeStatus(verified.status);
        const isPending = ["ongoing", "pending", "processing", "queued"].includes(
          gatewayStatus.toLowerCase(),
        );
        if (!isPending)
          lockSnapshots.forEach((lockSnapshot) => {
            if (
              lockSnapshot.exists &&
              lockSnapshot.data()?.bookingId === bookingId &&
              lockSnapshot.data()?.status === "provisional"
            )
              transaction.delete(lockSnapshot.ref);
          });
        transaction.update(attemptRef, {
          status: gatewayStatus,
          lastVerifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(bookingRef, {
          paymentStatus: isPending ? "processing" : "failed",
          status: isPending ? "awaiting-payment" : "payment-failed",
          bookingStatus: isPending ? "awaiting-payment" : "payment-failed",
          gatewayStatus,
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return paymentStatusResponse(bookingSnapshot.id, {
          ...booking,
          paymentStatus: isPending ? "processing" : "failed",
          status: isPending ? "awaiting-payment" : "payment-failed",
          bookingStatus: isPending ? "awaiting-payment" : "payment-failed",
          gatewayStatus,
        });
      }
      if (!relationshipValid || !exactMoney) {
        const mismatch = !relationshipValid
          ? "reference-or-customer"
          : verified.currency !== CURRENCY
            ? "currency"
            : "amount";
        transaction.update(attemptRef, {
          status: "mismatch",
          mismatch,
          verifiedAmountKobo: safeKobo(verified.amountKobo),
          verifiedCurrency: sanitizeStatus(verified.currency),
          lastVerifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(bookingRef, {
          paymentStatus: "amount-mismatch",
          paymentMismatch: mismatch,
          amountPaidKobo: safeKobo(verified.amountKobo),
          requiresAdminAction: true,
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.create(eventRef, paymentEventRecord(
          eventId,
          bookingId,
          verified,
          options.source,
          "mismatch",
        ));
        return paymentStatusResponse(bookingSnapshot.id, {
          ...booking,
          paymentStatus: "amount-mismatch",
          paymentMismatch: mismatch,
          amountPaidKobo: safeKobo(verified.amountKobo),
          requiresAdminAction: true,
        });
      }

      const ownsAllLocks =
        bookingCanBeConfirmed &&
        lockSnapshots.length > 0 &&
        lockSnapshots.every(
          (lockSnapshot) =>
            lockSnapshot.exists &&
            lockSnapshot.data()?.bookingId === bookingId,
        );
      const finalBookingStatus = ownsAllLocks
        ? booking.approvalRequired === false
          ? "confirmed"
          : "pending-confirmation"
        : "payment-received-slot-unavailable";
      const nowTimestamp = FieldValue.serverTimestamp();
      transaction.update(bookingRef, {
        status: finalBookingStatus,
        bookingStatus: finalBookingStatus,
        paymentStatus: "paid",
        amountPaidKobo: verified.amountKobo,
        paystackTransactionId: verified.id,
        paymentChannel: sanitizeStatus(verified.channel ?? "unknown"),
        paidAt: verified.paidAt
          ? Timestamp.fromDate(new Date(verified.paidAt))
          : nowTimestamp,
        verifiedAt: nowTimestamp,
        verificationSource: options.source,
        gatewayStatus: sanitizeStatus(
          verified.gatewayStatus ?? verified.status,
        ),
        authorizationSummary: sanitizeAuthorization(
          verified.authorizationSummary,
        ),
        requiresAdminAction: !ownsAllLocks,
        updatedAt: nowTimestamp,
      });
      transaction.update(attemptRef, {
        status: "paid",
        transactionId: verified.id,
        amountPaidKobo: verified.amountKobo,
        channel: sanitizeStatus(verified.channel ?? "unknown"),
        verifiedAt: nowTimestamp,
        verificationSource: options.source,
        updatedAt: nowTimestamp,
      });
      if (ownsAllLocks)
        lockSnapshots.forEach((lockSnapshot) =>
          transaction.update(lockSnapshot.ref, {
            status: "confirmed",
            expiresAt: FieldValue.delete(),
            updatedAt: nowTimestamp,
          }),
        );
      transaction.create(
        eventRef,
        paymentEventRecord(
          eventId,
          bookingId,
          verified,
          options.source,
          ownsAllLocks ? "applied" : "paid-slot-unavailable",
        ),
      );
      transaction.create(this.firestore.collection("auditLogs").doc(), {
        action: ownsAllLocks
          ? "payment.verified"
          : "payment.paid-slot-unavailable",
        actorUid: options.adminUid ?? "system",
        targetCollection: "bookings",
        targetId: bookingId,
        source: options.source,
        ...(options.adminReason
          ? { reason: options.adminReason.slice(0, 500) }
          : {}),
        createdAt: nowTimestamp,
      });
      return paymentStatusResponse(bookingId, {
        ...booking,
        status: finalBookingStatus,
        bookingStatus: finalBookingStatus,
        paymentStatus: "paid",
        amountPaidKobo: verified.amountKobo,
        paymentChannel: sanitizeStatus(verified.channel ?? "unknown"),
        paidAt: verified.paidAt,
        verifiedAt: this.clock().toISOString(),
        requiresAdminAction: !ownsAllLocks,
      });
    });
  }

  async status(uid: string, bookingId: string) {
    await this.expireUnpaidReservation(bookingId);
    const snapshot = await this.firestore.doc(`bookings/${bookingId}`).get();
    if (!snapshot.exists)
      throw new PaymentServiceError(
        "BOOKING_NOT_FOUND",
        "That booking could not be found.",
      );
    const data = snapshot.data()!;
    if (data.ownerUid !== uid && uid !== OWNER_UID)
      throw new PaymentServiceError(
        "FORBIDDEN",
        "You cannot view another customer's booking.",
      );
    return paymentStatusResponse(snapshot.id, data);
  }

  async cleanupExpiredReservationsAsAdmin(
    uid: string,
    limit: number,
  ): Promise<{ scanned: number; expired: number }> {
    if (uid !== OWNER_UID)
      throw new PaymentServiceError(
        "FORBIDDEN",
        "Only the configured Tamlois owner can clean expired reservations.",
      );
    const expiredCandidates = await this.firestore
      .collection("bookings")
      .where("status", "==", "awaiting-payment")
      .where("holdExpiresAt", "<=", Timestamp.fromDate(this.clock()))
      .orderBy("holdExpiresAt", "asc")
      .limit(limit)
      .get();
    let expired = 0;
    for (const candidate of expiredCandidates.docs) {
      await this.expireUnpaidReservation(candidate.id);
      const refreshed = await candidate.ref.get();
      if (refreshed.data()?.status === "expired") expired += 1;
    }
    return { scanned: expiredCandidates.size, expired };
  }

  private async expireUnpaidReservation(bookingId: string) {
    await this.firestore.runTransaction(async (transaction) => {
      const bookingRef = this.firestore.doc(`bookings/${bookingId}`);
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) return;
      const booking = bookingSnapshot.data()!;
      const holdExpiresAt = booking.holdExpiresAt;
      if (
        booking.status !== "awaiting-payment" ||
        booking.paymentStatus === "paid" ||
        !(holdExpiresAt instanceof Timestamp) ||
        holdExpiresAt.toMillis() > this.clock().getTime()
      )
        return;
      const lockRefs = lockReferences(this.firestore, booking.lockIds);
      const attemptRef = booking.paystackReference
        ? this.firestore.doc(`paymentAttempts/${booking.paystackReference}`)
        : null;
      const [lockSnapshots, attemptSnapshot] = await Promise.all([
        Promise.all(lockRefs.map((lockRef) => transaction.get(lockRef))),
        attemptRef ? transaction.get(attemptRef) : Promise.resolve(null),
      ]);
      lockSnapshots.forEach((lockSnapshot) => {
        if (
          lockSnapshot.exists &&
          lockSnapshot.data()?.bookingId === bookingId &&
          lockSnapshot.data()?.status === "provisional"
        )
          transaction.delete(lockSnapshot.ref);
      });
      transaction.update(bookingRef, {
        status: "expired",
        bookingStatus: "expired",
        paymentStatus: "expired",
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (attemptRef && attemptSnapshot?.exists)
        transaction.update(attemptRef, {
          status: "expired",
          updatedAt: FieldValue.serverTimestamp(),
        });
    });
  }

  async cancelAsAdmin(uid: string, bookingId: string, reason: string) {
    if (uid !== OWNER_UID)
      throw new PaymentServiceError(
        "FORBIDDEN",
        "Only the configured Tamlois owner can cancel this booking.",
      );
    return this.firestore.runTransaction(async (transaction) => {
      const bookingRef = this.firestore.doc(`bookings/${bookingId}`);
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists)
        throw new PaymentServiceError(
          "BOOKING_NOT_FOUND",
          "That booking could not be found.",
        );
      const booking = bookingSnapshot.data()!;
      if (["cancelled", "completed", "no-show"].includes(String(booking.status)))
        return paymentStatusResponse(bookingId, booking);
      const lockRefs = lockReferences(this.firestore, booking.lockIds);
      const lockSnapshots = await Promise.all(
        lockRefs.map((lockRef) => transaction.get(lockRef)),
      );
      lockSnapshots.forEach((lockSnapshot) => {
        if (lockSnapshot.exists && lockSnapshot.data()?.bookingId === bookingId)
          transaction.delete(lockSnapshot.ref);
      });
      transaction.update(bookingRef, {
        status: "cancelled",
        bookingStatus: "cancelled",
        cancellationReason: reason.slice(0, 500),
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(this.firestore.collection("auditLogs").doc(), {
        action: "booking.cancelled",
        actorUid: uid,
        targetCollection: "bookings",
        targetId: bookingId,
        source: "admin-function",
        reason: reason.slice(0, 500),
        createdAt: FieldValue.serverTimestamp(),
      });
      return paymentStatusResponse(bookingId, {
        ...booking,
        status: "cancelled",
        bookingStatus: "cancelled",
      });
    });
  }
}

async function allocateSlot(
  transaction: Transaction,
  firestore: Firestore,
  service: ServiceRecord,
  date: string,
  startTime: string,
  totalDuration: number,
  now: Date,
): Promise<AllocatedSlot> {
  if (service.category === "salon") {
    const session = BUSINESS_SCHEDULE.salonSessions.find(
      (item) => item.startTime === startTime,
    );
    if (!session)
      throw new PaymentServiceError(
        "SLOT_UNAVAILABLE",
        "Choose an available Salon session.",
      );
    const blockIds = operationalUnitIds(date).filter((id) => {
      const unit = id.slice(-5).replace("-", ":");
      return unit >= session.startTime && unit < session.endTime;
    });
    const [blockSnapshots, capacitySnapshot, seatSnapshots] =
      await Promise.all([
        Promise.all(
          blockIds.map((id) =>
            transaction.get(firestore.doc(`blockedPeriods/${id}`)),
          ),
        ),
        transaction.get(
          firestore.doc(`capacityOverrides/${date}_${session.id}`),
        ),
        Promise.all(
          salonSeatIds(date, session.id).map((id) =>
            transaction.get(firestore.doc(`bookingLocks/${id}`)),
          ),
        ),
      ]);
    if (blockSnapshots.some((snapshot) => snapshot.exists))
      throw new PaymentServiceError(
        "SLOT_UNAVAILABLE",
        "That Salon session is blocked.",
      );
    const capacity = capacitySnapshot.exists
      ? Math.max(0, Math.min(3, Number(capacitySnapshot.data()?.capacity)))
      : session.capacity;
    const available = seatSnapshots
      .slice(0, capacity)
      .find((snapshot) => !isActiveLock(snapshot.data(), now));
    if (!available)
      throw new PaymentServiceError(
        "SLOT_UNAVAILABLE",
        "That Salon session has just become fully booked.",
      );
    return {
      lockIds: [available.id],
      sessionId: session.id,
      endTime: session.endTime,
    };
  }

  const ids = trichologyLockIds(date, startTime, totalDuration);
  const [locks, blocks] = await Promise.all([
    Promise.all(
      ids.map((id) => transaction.get(firestore.doc(`bookingLocks/${id}`))),
    ),
    Promise.all(
      ids.map((id) => transaction.get(firestore.doc(`blockedPeriods/${id}`))),
    ),
  ]);
  if (blocks.some((snapshot) => snapshot.exists))
    throw new PaymentServiceError(
      "SLOT_UNAVAILABLE",
      "That appointment time is blocked.",
    );
  if (locks.some((snapshot) => isActiveLock(snapshot.data(), now)))
    throw new PaymentServiceError(
      "SLOT_UNAVAILABLE",
      "That appointment time has just been reserved.",
    );
  return {
    lockIds: ids,
    endTime: endTime(startTime, totalDuration),
  };
}

function isActiveLock(data: DocumentData | undefined, now: Date) {
  if (!data) return false;
  if (data.status === "confirmed" || data.status === "active") return true;
  const expiresAt = data.expiresAt;
  return (
    data.status === "provisional" &&
    expiresAt instanceof Timestamp &&
    expiresAt.toMillis() > now.getTime()
  );
}

function parseService(data: DocumentData): ServiceRecord {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    category: data.category === "salon" ? "salon" : "trichology",
    active: data.active === true,
    archived: data.archived === true,
    placeholder: data.placeholder === true,
    price: Number(data.price),
    durationMinutes: Number(data.durationMinutes ?? data.duration),
    preparation: typeof data.preparation === "string" ? data.preparation : "",
  };
}

function parseExtra(data: DocumentData): ExtraRecord {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    active: data.active === true,
    placeholder: data.placeholder === true,
    price: Number(data.price),
    duration: Number(data.duration),
    compatibleServiceIds: Array.isArray(data.compatibleServiceIds)
      ? data.compatibleServiceIds.map(String)
      : [],
  };
}

function parseSettings(data: DocumentData | undefined): AuthoritativePaymentSettings {
  if (!data) return DEFAULT_PAYMENT_SETTINGS;
  const payment = (data.payment ?? data) as DocumentData;
  const enabledModes = Array.isArray(payment.enabledModes)
    ? payment.enabledModes.filter((value): value is AuthoritativePaymentSettings["enabledModes"][number] =>
        ["full", "deposit_percentage", "deposit_fixed", "clinic"].includes(
          String(value),
        ),
      )
    : DEFAULT_PAYMENT_SETTINGS.enabledModes;
  const depositPercentage = Number(payment.depositPercentage);
  const fixedDepositAmountKobo =
    "fixedDepositAmountKobo" in payment
      ? Number(payment.fixedDepositAmountKobo)
      : nairaToKobo(
          payment.fixedDepositAmount ??
            DEFAULT_PAYMENT_SETTINGS.fixedDepositAmountKobo / 100,
        );
  const holdMinutes = Math.max(
    5,
    Math.min(MAX_HOLD_MINUTES, Number(payment.holdMinutes) || 15),
  );
  return {
    enabledModes: enabledModes.length
      ? enabledModes
      : DEFAULT_PAYMENT_SETTINGS.enabledModes,
    depositPercentage:
      Number.isInteger(depositPercentage) &&
      depositPercentage >= 1 &&
      depositPercentage <= 100
        ? depositPercentage
        : DEFAULT_PAYMENT_SETTINGS.depositPercentage,
    fixedDepositAmountKobo,
    holdMinutes,
    address:
      typeof data.address === "string" && data.address.trim()
        ? data.address.trim().slice(0, 500)
        : DEFAULT_PAYMENT_SETTINGS.address,
    approvalRequired: payment.approvalRequired !== false,
  };
}

function assertBookingWindow(
  date: string,
  startTime: string,
  duration: number,
  now: Date,
) {
  const appointment = new Date(`${date}T${startTime}:00+01:00`);
  if (Number.isNaN(appointment.getTime()))
    throw new PaymentServiceError(
      "INVALID_REQUEST",
      "Choose a valid appointment date and time.",
    );
  const weekday = appointment.getUTCDay();
  const minimum = now.getTime() + BUSINESS_SCHEDULE.minimumNoticeHours * 60 * 60_000;
  const maximum = now.getTime() + BUSINESS_SCHEDULE.maximumAdvanceDays * 86_400_000;
  if (
    !BUSINESS_SCHEDULE.openDays.includes(weekday as 1 | 2 | 3 | 4 | 5 | 6) ||
    appointment.getTime() < minimum ||
    appointment.getTime() > maximum ||
    startTime < BUSINESS_SCHEDULE.openingTime ||
    endTime(startTime, duration) > BUSINESS_SCHEDULE.closingTime
  )
    throw new PaymentServiceError(
      "SLOT_UNAVAILABLE",
      "That appointment is outside the available booking window.",
    );
}

function reservationResponse(
  id: string,
  data: DocumentData,
  replay: boolean,
): ReservationResponse {
  return {
    bookingId: id,
    bookingReference: String(data.bookingReference ?? data.reference ?? ""),
    ...(data.paystackReference
      ? { paystackReference: String(data.paystackReference) }
      : {}),
    ...(data.authorizationUrl
      ? { authorizationUrl: String(data.authorizationUrl) }
      : {}),
    expectedAmountKobo: Number(data.expectedAmountKobo ?? 0),
    currency: CURRENCY,
    paymentOption: data.paymentOption ?? data.paymentMode ?? "clinic",
    ...(data.holdExpiresAt
      ? { holdExpiresAt: timestampIso(data.holdExpiresAt) }
      : {}),
    bookingStatus: String(data.bookingStatus ?? data.status ?? ""),
    paymentStatus: String(data.paymentStatus ?? ""),
    idempotentReplay: replay,
  };
}

function paymentStatusResponse(
  id: string,
  data: DocumentData,
): PaymentStatusResponse {
  return {
    bookingId: id,
    bookingReference: String(data.bookingReference ?? data.reference ?? ""),
    bookingStatus: String(data.bookingStatus ?? data.status ?? ""),
    paymentStatus: String(data.paymentStatus ?? "not-started"),
    expectedAmountKobo: Number(data.expectedAmountKobo ?? 0),
    amountPaidKobo: Number(data.amountPaidKobo ?? 0),
    currency: CURRENCY,
    paymentOption: data.paymentOption ?? data.paymentMode ?? "clinic",
    ...(data.paystackReference
      ? { paystackReference: String(data.paystackReference) }
      : {}),
    ...(data.holdExpiresAt
      ? { holdExpiresAt: timestampIso(data.holdExpiresAt) }
      : {}),
    ...(data.paidAt ? { paidAt: timestampIso(data.paidAt) } : {}),
    ...(data.verifiedAt
      ? { verifiedAt: timestampIso(data.verifiedAt) }
      : {}),
    requiresAdminAction: data.requiresAdminAction === true,
    serviceName: String(
      data.serviceNameSnapshot ?? data.serviceSnapshot?.name ?? "",
    ),
    appointmentDate: String(data.date ?? ""),
    startTime: String(data.startTime ?? ""),
    endTime: String(data.endTime ?? ""),
    preparation: String(data.preparationSnapshot ?? ""),
    address: String(data.addressSnapshot ?? ""),
  };
}

function paymentEventRecord(
  id: string,
  bookingId: string,
  verified: VerifiedPaystackTransaction,
  source: string,
  outcome: string,
) {
  return {
    id,
    bookingId,
    provider: "paystack",
    paystackReference: verified.reference,
    paystackTransactionId: verified.id,
    eventType: "charge.success",
    source,
    outcome,
    amountKobo: safeKobo(verified.amountKobo),
    currency: sanitizeStatus(verified.currency),
    gatewayStatus: sanitizeStatus(verified.status),
    createdAt: FieldValue.serverTimestamp(),
  };
}

function lockReferences(firestore: Firestore, ids: unknown) {
  return (Array.isArray(ids) ? ids : [])
    .filter((id): id is string => typeof id === "string" && id.length <= 80)
    .map((id) => firestore.doc(`bookingLocks/${id}`));
}

function timestampIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

function callbackUrl(appPublicUrl: string) {
  return `${appPublicUrl.replace(/\/$/, "")}/#/booking/payment-callback`;
}

function sanitizeStatus(value: string) {
  return value.replace(/[^A-Za-z0-9 _.-]/g, "").slice(0, 100);
}

function safeKobo(value: number) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function sanitizeAuthorization(
  value: VerifiedPaystackTransaction["authorizationSummary"],
) {
  if (!value) return {};
  return {
    ...(value.brand ? { brand: sanitizeStatus(value.brand).slice(0, 40) } : {}),
    ...(value.last4 && /^\d{4}$/.test(value.last4)
      ? { last4: value.last4 }
      : {}),
    reusable: value.reusable === true,
  };
}
