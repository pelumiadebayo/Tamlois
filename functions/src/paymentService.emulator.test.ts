import { deleteApp, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ReserveBookingRequest } from "./contracts.js";
import { OWNER_UID } from "./domain.js";
import { PaymentService } from "./paymentService.js";
import type {
  PaymentGateway,
  PaystackInitializeRequest,
  VerifiedPaystackTransaction,
} from "./paystack.js";

const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const suite = describe.runIf(emulatorAvailable);
const projectId = "demo-tamlois-payments";
const app = initializeApp({ projectId }, "payment-tests");
const firestore = getFirestore(app);
let now = new Date("2026-08-29T09:00:00.000Z");

class MockGateway implements PaymentGateway {
  readonly initialized: PaystackInitializeRequest[] = [];
  failInitialization = false;
  verified = new Map<string, VerifiedPaystackTransaction>();

  async initialize(request: PaystackInitializeRequest) {
    this.initialized.push(request);
    if (this.failInitialization) throw new Error("GATEWAY_DOWN");
    return {
      authorizationUrl: `https://checkout.paystack.com/${request.reference}`,
      accessCode: `access-${request.reference}`,
      reference: request.reference,
    };
  }

  async verify(reference: string) {
    const value = this.verified.get(reference);
    if (!value) throw new Error("NOT_FOUND");
    return value;
  }
}

beforeAll(async () => {
  if (!emulatorAvailable) return;
  firestore.settings({ ignoreUndefinedProperties: true });
});

beforeEach(async () => {
  if (!emulatorAvailable) return;
  now = new Date("2026-08-29T09:00:00.000Z");
  await firestore.recursiveDelete(firestore.collection("bookings"));
  await firestore.recursiveDelete(firestore.collection("bookingLocks"));
  await firestore.recursiveDelete(firestore.collection("paymentAttempts"));
  await firestore.recursiveDelete(firestore.collection("paymentEvents"));
  await firestore.recursiveDelete(firestore.collection("auditLogs"));
  await firestore.recursiveDelete(firestore.collection("services"));
  await firestore.recursiveDelete(firestore.collection("serviceExtras"));
  await firestore.recursiveDelete(firestore.collection("bookingPolicies"));
  await firestore.recursiveDelete(firestore.collection("businessSettings"));
  await firestore.doc("services/salon").set(service("salon", "salon", 24_000, 60));
  await firestore.doc("services/trich").set(service("trich", "trichology", 30_000, 90));
  await firestore.doc("bookingPolicies/appointments").set({
    id: "appointments",
    title: "Appointment-only care",
    summary: "Appointments must be booked in advance.",
    displayOrder: 0,
    version: 1,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  await firestore.doc("businessSettings/booking").set({
    address: "Tamlois clinic",
    payment: {
      enabledModes: ["full", "deposit_percentage", "clinic"],
      defaultMode: "deposit_percentage",
      depositPercentage: 50,
      fixedDepositAmount: 10_000,
      balanceDue: "at-clinic",
      holdMinutes: 15,
      approvalRequired: true,
    },
  });
});

afterAll(async () => {
  await deleteApp(app);
});

suite("Firebase payment booking transactions", () => {
  it("uses the Firestore price and ignores any client-side amount", async () => {
    const gateway = new MockGateway();
    const result = await paymentService(gateway).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000001", "salon", "full"),
    );
    expect(result.expectedAmountKobo).toBe(2_400_000);
    expect(gateway.initialized[0]?.amountKobo).toBe(2_400_000);
  });

  it("rejects inactive services and disabled payment options", async () => {
    await firestore.doc("services/salon").update({ active: false });
    await expect(
      paymentService(new MockGateway()).reserveAndInitialize(
        "customer-a",
        input("00000000-0000-4000-8000-000000000002", "salon", "full"),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    await firestore.doc("services/salon").update({ active: true });
    await expect(
      paymentService(new MockGateway()).reserveAndInitialize(
        "customer-a",
        input(
          "00000000-0000-4000-8000-000000000003",
          "salon",
          "deposit_fixed",
        ),
      ),
    ).rejects.toMatchObject({ code: "PAYMENT_OPTION_DISABLED" });
  });

  it("allocates three salon seats and atomically rejects the fourth", async () => {
    const attempts = [1, 2, 3, 4].map((value) => {
      const gateway = new MockGateway();
      return paymentService(gateway).reserveAndInitialize(
        `customer-${value}`,
        input(
          `00000000-0000-4000-8000-00000000000${value}`,
          "salon",
          "full",
        ),
      );
    });
    const results = await Promise.allSettled(attempts);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await firestore.collection("bookingLocks").get()).size).toBe(3);
  });

  it("rejects simultaneous overlapping trichology intervals without partial locks", async () => {
    const overlap = input(
      "00000000-0000-4000-8000-000000000011",
      "trich",
      "full",
    );
    overlap.startTime = "10:00";
    const results = await Promise.allSettled([
      paymentService(new MockGateway()).reserveAndInitialize(
        "customer-a",
        input("00000000-0000-4000-8000-000000000010", "trich", "full"),
      ),
      paymentService(new MockGateway()).reserveAndInitialize(
        "customer-b",
        overlap,
      ),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await firestore.collection("bookings").get()).size).toBe(1);
  });

  it("keeps a verified payment pending when clinic approval is required", async () => {
    const gateway = new MockGateway();
    const reservation = await paymentService(gateway).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000020", "salon", "full"),
    );
    const verified = successfulTransaction(reservation, "customer-a");
    gateway.verified.set(reservation.paystackReference!, verified);
    const service = paymentService(gateway);
    const [first, duplicate] = await Promise.all([
      service.verifyAndFinalize(
        "customer-a",
        reservation.bookingId,
        reservation.paystackReference!,
      ),
      service.verifyAndFinalize(
        "customer-a",
        reservation.bookingId,
        reservation.paystackReference!,
      ),
    ]);
    expect(first.bookingStatus).toBe("pending-confirmation");
    expect(duplicate.paymentStatus).toBe("paid");
    expect((await firestore.collection("paymentEvents").get()).size).toBe(1);
  });

  it("confirms clinic and verified online bookings when approval is disabled", async () => {
    await firestore.doc("businessSettings/booking").update({
      "payment.approvalRequired": false,
    });

    const clinic = await paymentService(new MockGateway()).reserveAndInitialize(
      "customer-clinic",
      input("00000000-0000-4000-8000-000000000021", "salon", "clinic"),
    );
    expect(clinic.bookingStatus).toBe("confirmed");

    const gateway = new MockGateway();
    const reservation = await paymentService(gateway).reserveAndInitialize(
      "customer-online",
      input("00000000-0000-4000-8000-000000000022", "salon", "full"),
    );
    gateway.verified.set(
      reservation.paystackReference!,
      successfulTransaction(reservation, "customer-online"),
    );
    const verified = await paymentService(gateway).verifyAndFinalize(
      "customer-online",
      reservation.bookingId,
      reservation.paystackReference!,
    );
    expect(verified.bookingStatus).toBe("confirmed");
  });

  it("keeps pay-at-clinic bookings pending when approval is required", async () => {
    const reservation = await paymentService(
      new MockGateway(),
    ).reserveAndInitialize(
      "customer-clinic",
      input("00000000-0000-4000-8000-000000000023", "salon", "clinic"),
    );
    expect(reservation.bookingStatus).toBe("pending-confirmation");
  });

  it("records an amount mismatch without confirming the booking", async () => {
    const gateway = new MockGateway();
    const reservation = await paymentService(gateway).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000030", "salon", "full"),
    );
    const verified = successfulTransaction(reservation, "customer-a");
    verified.amountKobo -= 100;
    gateway.verified.set(reservation.paystackReference!, verified);
    const result = await paymentService(gateway).verifyAndFinalize(
      "customer-a",
      reservation.bookingId,
      reservation.paystackReference!,
    );
    expect(result.paymentStatus).toBe("amount-mismatch");
    expect(result.requiresAdminAction).toBe(true);
    const booking = (
      await firestore.doc(`bookings/${reservation.bookingId}`).get()
    ).data();
    expect(booking?.paymentStatus).toBe("amount-mismatch");
    expect(booking?.status).not.toBe("confirmed");
  });

  it("records currency and customer relationship mismatches for review", async () => {
    const currencyGateway = new MockGateway();
    const currencyReservation = await paymentService(
      currencyGateway,
    ).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000031", "salon", "full"),
    );
    const wrongCurrency = successfulTransaction(
      currencyReservation,
      "customer-a",
    );
    wrongCurrency.currency = "USD";
    currencyGateway.verified.set(
      currencyReservation.paystackReference!,
      wrongCurrency,
    );
    const currencyResult = await paymentService(
      currencyGateway,
    ).verifyAndFinalize(
      "customer-a",
      currencyReservation.bookingId,
      currencyReservation.paystackReference!,
    );
    expect(currencyResult.paymentStatus).toBe("amount-mismatch");

    const identityGateway = new MockGateway();
    const identityReservation = await paymentService(
      identityGateway,
    ).reserveAndInitialize(
      "customer-b",
      input("00000000-0000-4000-8000-000000000032", "salon", "full"),
    );
    const wrongIdentity = successfulTransaction(
      identityReservation,
      "another-customer",
    );
    identityGateway.verified.set(
      identityReservation.paystackReference!,
      wrongIdentity,
    );
    const identityResult = await paymentService(
      identityGateway,
    ).verifyAndFinalize(
      "customer-b",
      identityReservation.bookingId,
      identityReservation.paystackReference!,
    );
    expect(identityResult.paymentStatus).toBe("amount-mismatch");
    expect(identityResult.requiresAdminAction).toBe(true);
  });

  it("distinguishes pending from terminal gateway states and releases only a failed hold", async () => {
    const gateway = new MockGateway();
    const reservation = await paymentService(gateway).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000033", "salon", "full"),
    );
    const failed = successfulTransaction(reservation, "customer-a");
    failed.status = "failed";
    gateway.verified.set(reservation.paystackReference!, failed);
    const result = await paymentService(gateway).verifyAndFinalize(
      "customer-a",
      reservation.bookingId,
      reservation.paystackReference!,
    );
    expect(result.paymentStatus).toBe("failed");
    expect(result.bookingStatus).toBe("payment-failed");
    const booking = await firestore.doc(`bookings/${reservation.bookingId}`).get();
    const lockId = String(booking.data()?.lockIds[0]);
    expect((await firestore.doc(`bookingLocks/${lockId}`).get()).exists).toBe(
      false,
    );

    const pendingGateway = new MockGateway();
    const pendingReservation = await paymentService(
      pendingGateway,
    ).reserveAndInitialize(
      "customer-b",
      input("00000000-0000-4000-8000-000000000034", "salon", "full"),
    );
    const pending = successfulTransaction(pendingReservation, "customer-b");
    pending.status = "pending";
    pendingGateway.verified.set(pendingReservation.paystackReference!, pending);
    const pendingResult = await paymentService(
      pendingGateway,
    ).verifyAndFinalize(
      "customer-b",
      pendingReservation.bookingId,
      pendingReservation.paystackReference!,
    );
    expect(pendingResult.paymentStatus).toBe("processing");
    expect(pendingResult.bookingStatus).toBe("awaiting-payment");
    const pendingBooking = await firestore
      .doc(`bookings/${pendingReservation.bookingId}`)
      .get();
    const pendingLockId = String(pendingBooking.data()?.lockIds[0]);
    expect(
      (await firestore.doc(`bookingLocks/${pendingLockId}`).get()).exists,
    ).toBe(true);
  });

  it("reclaims an expired hold and sends a late payment to manual resolution", async () => {
    const firstGateway = new MockGateway();
    const first = await paymentService(firstGateway).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000040", "salon", "full"),
    );
    now = new Date(now.getTime() + 16 * 60_000);
    await paymentService(new MockGateway()).reserveAndInitialize(
      "customer-b",
      input("00000000-0000-4000-8000-000000000041", "salon", "full"),
    );
    const verified = successfulTransaction(first, "customer-a");
    verified.paidAt = now.toISOString();
    firstGateway.verified.set(first.paystackReference!, verified);
    const result = await paymentService(firstGateway).verifyAndFinalize(
      "customer-a",
      first.bookingId,
      first.paystackReference!,
    );
    expect(result.bookingStatus).toBe("payment-received-slot-unavailable");
    expect(result.requiresAdminAction).toBe(true);
  });

  it("lets only the owner run bounded expired-hold housekeeping", async () => {
    const reservation = await paymentService(
      new MockGateway(),
    ).reserveAndInitialize(
      "customer-a",
      input("00000000-0000-4000-8000-000000000045", "salon", "full"),
    );
    now = new Date(now.getTime() + 16 * 60_000);
    await expect(
      paymentService(new MockGateway()).cleanupExpiredReservationsAsAdmin(
        "ordinary-user",
        25,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await paymentService(
      new MockGateway(),
    ).cleanupExpiredReservationsAsAdmin(OWNER_UID, 25);
    expect(result).toEqual({ scanned: 1, expired: 1 });
    expect(
      (await firestore.doc(`bookings/${reservation.bookingId}`).get()).data()
        ?.status,
    ).toBe("expired");
    expect((await firestore.collection("bookingLocks").get()).empty).toBe(true);
  });

  it("compensates a failed Paystack initialization and releases the hold", async () => {
    const gateway = new MockGateway();
    gateway.failInitialization = true;
    const request = input(
      "00000000-0000-4000-8000-000000000050",
      "salon",
      "full",
    );
    await expect(
      paymentService(gateway).reserveAndInitialize("customer-a", request),
    ).rejects.toMatchObject({ code: "PAYMENT_INITIALIZATION_FAILED" });
    expect((await firestore.collection("bookingLocks").get()).empty).toBe(true);
    expect((await firestore.doc(`bookings/${request.requestId}`).get()).data()?.status).toBe(
      "payment-failed",
    );
  });
});

function paymentService(gateway: PaymentGateway) {
  return new PaymentService(
    firestore,
    gateway,
    "https://example.com/Tamlois",
    () => now,
  );
}

function input(
  requestId: string,
  serviceId: "salon" | "trich",
  paymentOption: "full" | "deposit_percentage" | "clinic",
): ReserveBookingRequest {
  return {
    requestId,
    serviceId,
    extraIds: [],
    date: "2026-09-02",
    startTime: "09:00",
    details: {
      fullName: "Ada Okafor",
      phone: "08012345678",
      email: "ada@example.com",
      preferredContact: "email",
      concern: "",
      hopes: "",
      concernDuration: "",
      priorProfessionalTreatment: "",
      productsTreatments: "",
      note: "",
    },
    intakeResponses: {},
    policyConsent: {
      accepted: true,
      version: "bundle-v1",
      acceptedAt: "2026-08-29T09:00:00.000Z",
      sessionId: "test-session",
      policies: [
        {
          id: "appointments",
          title: "Appointment-only care",
          summary: "Appointments must be booked in advance.",
          version: 1,
        },
      ],
    },
    paymentOption,
  };
}

function service(
  id: string,
  category: "salon" | "trichology",
  price: number,
  duration: number,
) {
  return {
    id,
    name: id === "salon" ? "Natural hair care" : "Trichology consultation",
    category,
    active: true,
    archived: false,
    placeholder: false,
    price,
    durationMinutes: duration,
    preparation: "Arrive prepared.",
  };
}

function successfulTransaction(
  reservation: Awaited<ReturnType<PaymentService["reserveAndInitialize"]>>,
  customerUid: string,
): VerifiedPaystackTransaction {
  return {
    id: `txn-${reservation.bookingId}`,
    status: "success",
    reference: reservation.paystackReference!,
    amountKobo: reservation.expectedAmountKobo,
    currency: "NGN",
    customerEmail: "ada@example.com",
    paidAt: "2026-08-29T09:05:00.000Z",
    channel: "card",
    gatewayStatus: "Successful",
    metadata: {
      bookingId: reservation.bookingId,
      customerUid,
    },
    authorizationSummary: { brand: "visa", last4: "4081" },
  };
}
