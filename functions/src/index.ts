import { createHash } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import {
  defineBoolean,
  defineSecret,
  defineString,
} from "firebase-functions/params";
import {
  HttpsError,
  onCall,
  onRequest,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { z } from "zod";
import {
  adminCancellationSchema,
  bookingStatusLookupSchema,
  cleanupExpiredReservationsSchema,
  paymentReferenceSchema,
  reserveBookingSchema,
  reverifySchema,
} from "./contracts.js";
import { OWNER_UID } from "./domain.js";
import {
  PaymentService,
  PaymentServiceError,
} from "./paymentService.js";
import {
  PaystackPaymentGateway,
  type PaymentGateway,
} from "./paystack.js";
import { isValidPaystackSignature } from "./webhook.js";

if (!getApps().length) initializeApp();

const firestore = getFirestore();
firestore.settings({ ignoreUndefinedProperties: true });

const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");
const PAYSTACK_WEBHOOK_SECRET = defineSecret("PAYSTACK_WEBHOOK_SECRET");
const APP_PUBLIC_URL = defineString("APP_PUBLIC_URL");
const ALLOWED_FRONTEND_ORIGINS = defineString("ALLOWED_FRONTEND_ORIGINS");
const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", {
  default: true,
  description:
    "Require valid Firebase App Check tokens for customer payment callables.",
});

const commonOptions = {
  region: "africa-south1",
  memory: "256MiB" as const,
  minInstances: 0,
  maxInstances: 3,
  timeoutSeconds: 30,
};

function gateway() {
  return new PaystackPaymentGateway(PAYSTACK_SECRET_KEY.value());
}

function service(paymentGateway: PaymentGateway = gateway()) {
  return new PaymentService(
    firestore,
    paymentGateway,
    APP_PUBLIC_URL.value(),
  );
}

function requireAuthentication<T>(request: CallableRequest<T>) {
  if (!request.auth)
    throw new HttpsError(
      "unauthenticated",
      "A secure Firebase booking session is required.",
    );
  return request.auth.uid;
}

function enforceOrigin<T>(request: CallableRequest<T>) {
  const origin = request.rawRequest.headers.origin;
  if (!origin) return;
  const allowed = ALLOWED_FRONTEND_ORIGINS.value()
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!allowed.includes(origin.replace(/\/$/, "")))
    throw new HttpsError(
      "permission-denied",
      "This frontend origin is not authorized for payment operations.",
    );
}

function enforceCallableRequestSize<T>(request: CallableRequest<T>) {
  const rawLength = request.rawRequest.rawBody?.length;
  const declaredLength = Number(request.rawRequest.header("content-length") ?? 0);
  if (
    (typeof rawLength === "number" && rawLength > 128 * 1024) ||
    (Number.isFinite(declaredLength) && declaredLength > 128 * 1024)
  )
    throw new HttpsError(
      "resource-exhausted",
      "The payment request is larger than the supported limit.",
    );
}

function parseInput<T>(schema: z.ZodType<T>, data: unknown) {
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new HttpsError(
      "invalid-argument",
      "The payment request contains invalid or incomplete fields.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    );
  return parsed.data;
}

function toHttpsError(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  if (error instanceof PaymentServiceError) {
    const code =
      error.code === "UNAUTHENTICATED"
        ? "unauthenticated"
        : error.code === "FORBIDDEN"
          ? "permission-denied"
          : error.code === "BOOKING_NOT_FOUND"
            ? "not-found"
            : error.code === "SLOT_UNAVAILABLE" ||
                error.code === "POLICY_CHANGED" ||
                error.code === "SERVICE_UNAVAILABLE" ||
                error.code === "PAYMENT_OPTION_DISABLED"
              ? "failed-precondition"
              : error.code === "INVALID_REQUEST" ||
                  error.code === "REFERENCE_MISMATCH"
                ? "invalid-argument"
                : "aborted";
    throw new HttpsError(code, error.message, { reason: error.code });
  }
  logger.error("Payment function failed", {
    errorName: error instanceof Error ? error.name : "unknown",
  });
  throw new HttpsError(
    "internal",
    "The secure payment service is temporarily unavailable.",
  );
}

export const reserveBookingAndInitializePayment = onCall(
  {
    ...commonOptions,
    secrets: [PAYSTACK_SECRET_KEY],
    enforceAppCheck: ENFORCE_APP_CHECK,
    consumeAppCheckToken: true,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      const input = parseInput(reserveBookingSchema, request.data);
      return await service().reserveAndInitialize(uid, input);
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

export const verifyPaystackPayment = onCall(
  {
    ...commonOptions,
    secrets: [PAYSTACK_SECRET_KEY],
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      const input = parseInput(paymentReferenceSchema, request.data);
      return await service().verifyAndFinalize(
        uid,
        input.bookingId,
        input.paystackReference,
      );
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

export const getBookingPaymentStatus = onCall(
  {
    ...commonOptions,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      const input = parseInput(bookingStatusLookupSchema, request.data);
      const noGateway: PaymentGateway = {
        initialize: async () => {
          throw new Error("NOT_AVAILABLE");
        },
        verify: async () => {
          throw new Error("NOT_AVAILABLE");
        },
      };
      return await service(noGateway).status(uid, input.bookingId);
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

export const reverifyPaystackPayment = onCall(
  {
    ...commonOptions,
    secrets: [PAYSTACK_SECRET_KEY],
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      if (uid !== OWNER_UID)
        throw new PaymentServiceError(
          "FORBIDDEN",
          "Only the configured Tamlois owner can reverify a payment.",
        );
      const input = parseInput(reverifySchema, request.data);
      const booking = await firestore.doc(`bookings/${input.bookingId}`).get();
      if (!booking.exists || !booking.data()?.paystackReference)
        throw new PaymentServiceError(
          "BOOKING_NOT_FOUND",
          "This booking has no Paystack payment attempt.",
        );
      return await service().verifyAndFinalize(
        uid,
        input.bookingId,
        String(booking.data()!.paystackReference),
        "admin-reverify",
        input.reason,
      );
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

export const cancelBookingAsAdmin = onCall(
  {
    ...commonOptions,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      if (uid !== OWNER_UID)
        throw new PaymentServiceError(
          "FORBIDDEN",
          "Only the configured Tamlois owner can cancel a booking.",
        );
      const input = parseInput(adminCancellationSchema, request.data);
      const noGateway: PaymentGateway = {
        initialize: async () => {
          throw new Error("NOT_AVAILABLE");
        },
        verify: async () => {
          throw new Error("NOT_AVAILABLE");
        },
      };
      return await service(noGateway).cancelAsAdmin(
        uid,
        input.bookingId,
        input.reason,
      );
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

export const cleanupExpiredReservationsAsAdmin = onCall(
  {
    ...commonOptions,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request) => {
    try {
      enforceCallableRequestSize(request);
      enforceOrigin(request);
      const uid = requireAuthentication(request);
      if (uid !== OWNER_UID)
        throw new PaymentServiceError(
          "FORBIDDEN",
          "Only the configured Tamlois owner can clean expired reservations.",
        );
      const input = parseInput(cleanupExpiredReservationsSchema, request.data);
      const noGateway: PaymentGateway = {
        initialize: async () => {
          throw new Error("NOT_AVAILABLE");
        },
        verify: async () => {
          throw new Error("NOT_AVAILABLE");
        },
      };
      return await service(noGateway).cleanupExpiredReservationsAsAdmin(
        uid,
        input.limit,
      );
    } catch (error) {
      return toHttpsError(error);
    }
  },
);

const webhookEventSchema = z
  .object({
    event: z.string().max(100),
    data: z
      .object({
        reference: z.string().min(8).max(100),
      })
      .passthrough(),
  })
  .passthrough();

export const paystackWebhook = onRequest(
  {
    ...commonOptions,
    secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET],
    cors: false,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.set("Allow", "POST").status(405).send("Method Not Allowed");
      return;
    }
    if (request.rawBody.length > 256 * 1024) {
      response.status(413).send("Payload Too Large");
      return;
    }
    const signature = request.header("x-paystack-signature") ?? undefined;
    const webhookSecret =
      PAYSTACK_WEBHOOK_SECRET.value() || PAYSTACK_SECRET_KEY.value();
    if (
      !isValidPaystackSignature(request.rawBody, signature, webhookSecret)
    ) {
      response.status(401).send("Invalid signature");
      return;
    }
    const parsed = webhookEventSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).send("Invalid event");
      return;
    }
    if (parsed.data.event !== "charge.success") {
      response.status(200).send("Ignored");
      return;
    }
    const eventId = createHash("sha256")
      .update(request.rawBody)
      .digest("hex");
    try {
      const verified = await gateway().verify(parsed.data.data.reference);
      await service().finalizeVerifiedPayment(verified, {
        source: "webhook",
        eventId,
      });
      response.status(200).send("OK");
    } catch (error) {
      if (error instanceof PaymentServiceError) {
        logger.warn("Signed Paystack event was not applied", {
          reason: error.code,
          referenceHash: createHash("sha256")
            .update(parsed.data.data.reference)
            .digest("hex")
            .slice(0, 12),
        });
        response.status(200).send("Event recorded for review");
        return;
      }
      logger.error("Paystack webhook processing failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).send("Temporary processing failure");
    }
  },
);
