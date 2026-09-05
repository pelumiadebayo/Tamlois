import { httpsCallable } from "firebase/functions";
import {
  ensureAnonymousBookingUser,
  firebaseEnabled,
  functions,
} from "../lib/firebase";
import type {
  PaymentProvider,
  PaymentStatusResult,
  ReservationResult,
  ReservePaymentRequest,
} from "./contracts";

const RECOVERY_KEY = "tamlois-payment-reservation-v1";

export class FirebasePaystackPaymentProvider implements PaymentProvider {
  async reserve(request: ReservePaymentRequest) {
    await ensureAnonymousBookingUser();
    const result = await call<ReservePaymentRequest, ReservationResult>(
      "reserveBookingAndInitializePayment",
      request,
    );
    savePaymentRecovery(result);
    return result;
  }

  async verify(bookingId: string, paystackReference: string) {
    await ensureAnonymousBookingUser();
    const result = await call<
      { bookingId: string; paystackReference: string },
      PaymentStatusResult
    >("verifyPaystackPayment", { bookingId, paystackReference });
    savePaymentStatus(result);
    return result;
  }

  async status(bookingId: string) {
    await ensureAnonymousBookingUser();
    const result = await call<{ bookingId: string }, PaymentStatusResult>(
      "getBookingPaymentStatus",
      { bookingId },
    );
    savePaymentStatus(result);
    return result;
  }

  reverify(bookingId: string, reason: string) {
    return call<{ bookingId: string; reason: string }, PaymentStatusResult>(
      "reverifyPaystackPayment",
      { bookingId, reason },
    );
  }

  cancel(bookingId: string, reason: string) {
    return call<{ bookingId: string; reason: string }, PaymentStatusResult>(
      "cancelBookingAsAdmin",
      { bookingId, reason },
    );
  }

  cleanupExpired(limit = 25) {
    return call<{ limit: number }, { scanned: number; expired: number }>(
      "cleanupExpiredReservationsAsAdmin",
      { limit },
    );
  }
}

export class MockPaymentProvider implements PaymentProvider {
  async reserve(request: ReservePaymentRequest): Promise<ReservationResult> {
    return {
      bookingId: request.requestId,
      bookingReference: `DEMO-${request.requestId.slice(0, 8).toUpperCase()}`,
      paystackReference: `demo-${request.requestId}`,
      authorizationUrl: `/#/booking/payment-callback?booking=${request.requestId}&reference=demo-${request.requestId}`,
      accessCode: "demo-access-code",
      expectedAmountKobo: 0,
      currency: "NGN",
      paymentOption: request.paymentOption,
      holdExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      bookingStatus: "awaiting-payment",
      paymentStatus: "initialised",
      idempotentReplay: false,
    };
  }

  async verify(
    bookingId: string,
    paystackReference: string,
  ): Promise<PaymentStatusResult> {
    if (paystackReference.includes("failed"))
      throw new Error("The demo gateway could not verify this payment.");
    if (paystackReference.includes("cancelled"))
      throw new Error("The demo Paystack checkout was cancelled.");
    if (paystackReference.includes("late"))
      return {
        ...mockStatus(bookingId),
        bookingStatus: "payment-received-slot-unavailable",
        requiresAdminAction: true,
      };
    if (paystackReference.includes("mismatch"))
      return {
        ...mockStatus(bookingId),
        bookingStatus: "awaiting-payment",
        paymentStatus: "amount-mismatch",
        requiresAdminAction: true,
      };
    if (paystackReference.includes("expired"))
      return {
        ...mockStatus(bookingId),
        bookingStatus: "expired",
        paymentStatus: "expired",
      };
    if (paystackReference.includes("pending"))
      return {
        ...mockStatus(bookingId),
        bookingStatus: "awaiting-payment",
        paymentStatus: "processing",
      };
    return mockStatus(bookingId);
  }

  async status(bookingId: string): Promise<PaymentStatusResult> {
    return {
      ...mockStatus(bookingId),
      bookingStatus: "awaiting-payment",
      paymentStatus: "processing",
    };
  }

  async reverify(bookingId: string): Promise<PaymentStatusResult> {
    return mockStatus(bookingId);
  }

  async cancel(bookingId: string): Promise<PaymentStatusResult> {
    return { ...mockStatus(bookingId), bookingStatus: "cancelled" };
  }

  async cleanupExpired(): Promise<{ scanned: number; expired: number }> {
    return { scanned: 0, expired: 0 };
  }
}

async function call<Input, Output>(name: string, input: Input) {
  if (!functions)
    throw new Error("The secure payment service is not configured.");
  const callable = httpsCallable<Input, Output>(functions, name, {
    timeout: 30_000,
    // The reservation callable consumes a replay-protected App Check token.
    // Firebase requires the matching limited-use token option on the web client.
    limitedUseAppCheckTokens:
      name === "reserveBookingAndInitializePayment",
  });
  try {
    return (await callable(input)).data;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "The secure payment service is temporarily unavailable.";
    throw new Error(message.replace(/^Firebase:\s*/i, ""));
  }
}

function mockStatus(bookingId: string): PaymentStatusResult {
  return {
    bookingId,
    bookingReference: `DEMO-${bookingId.slice(0, 8).toUpperCase()}`,
    bookingStatus: "confirmed",
    paymentStatus: "paid",
    expectedAmountKobo: 0,
    amountPaidKobo: 0,
    currency: "NGN",
    paymentOption: "full",
    requiresAdminAction: false,
    serviceName: "Demo service",
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:00",
    preparation: "Demo preparation information.",
    address: "Tamlois clinic",
  };
}

export function savePaymentRecovery(result: ReservationResult) {
  sessionStorage.setItem(
    RECOVERY_KEY,
    JSON.stringify({
      bookingId: result.bookingId,
      paystackReference: result.paystackReference,
      holdExpiresAt: result.holdExpiresAt,
    }),
  );
}

function savePaymentStatus(result: PaymentStatusResult) {
  sessionStorage.setItem(
    RECOVERY_KEY,
    JSON.stringify({
      bookingId: result.bookingId,
      paystackReference: result.paystackReference,
      holdExpiresAt: result.holdExpiresAt,
    }),
  );
}

export function loadPaymentRecovery(): {
  bookingId: string;
  paystackReference?: string;
  holdExpiresAt?: string;
} | null {
  try {
    return JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || "null");
  } catch {
    return null;
  }
}

export const paymentProvider: PaymentProvider = firebaseEnabled
  ? new FirebasePaystackPaymentProvider()
  : new MockPaymentProvider();
