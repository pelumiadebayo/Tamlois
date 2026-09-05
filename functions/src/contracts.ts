import { z } from "zod";

const boundedText = (max: number) => z.string().trim().max(max);
const requiredText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const paymentOptionSchema = z.enum([
  "full",
  "deposit_percentage",
  "deposit_fixed",
  "clinic",
]);
export type PaymentOption = z.infer<typeof paymentOptionSchema>;

export const policySnapshotSchema = z
  .object({
    id: requiredText(1, 128),
    title: requiredText(1, 160),
    summary: requiredText(1, 3000),
    version: z.number().int().min(1).max(1_000_000),
  })
  .strict();

export const policyConsentSchema = z
  .object({
    accepted: z.literal(true),
    version: requiredText(1, 80),
    acceptedAt: z.iso.datetime({ offset: true }),
    sessionId: requiredText(1, 128),
    policies: z.array(policySnapshotSchema).min(1).max(20),
  })
  .strict();

export const customerDetailsSchema = z
  .object({
    fullName: requiredText(2, 100),
    phone: requiredText(7, 30),
    email: z.email().max(160).transform((value) => value.toLowerCase()),
    preferredContact: z.enum(["", "phone", "whatsapp", "email"]),
    concern: boundedText(2000),
    hopes: boundedText(2000),
    concernDuration: boundedText(200),
    priorProfessionalTreatment: boundedText(500),
    productsTreatments: boundedText(800),
    note: boundedText(2000),
  })
  .strict();

export const reserveBookingSchema = z
  .object({
    requestId: z.uuid(),
    serviceId: requiredText(1, 128),
    extraIds: z.array(requiredText(1, 128)).max(20),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    details: customerDetailsSchema,
    intakeResponses: z.record(
      z.string().max(128),
      z.union([
        boundedText(2000),
        z.array(boundedText(200)).max(20),
        z.boolean(),
      ]),
    ),
    policyConsent: policyConsentSchema,
    paymentOption: paymentOptionSchema,
  })
  .strict();

export type ReserveBookingRequest = z.infer<typeof reserveBookingSchema>;

export const paymentReferenceSchema = z
  .object({
    bookingId: z.uuid(),
    paystackReference: z
      .string()
      .trim()
      .min(8)
      .max(100)
      .regex(/^[A-Za-z0-9.=-]+$/),
  })
  .strict();

export type PaymentReferenceRequest = z.infer<
  typeof paymentReferenceSchema
>;

export const bookingStatusLookupSchema = z
  .object({ bookingId: z.uuid() })
  .strict();

export const reverifySchema = z
  .object({
    bookingId: z.uuid(),
    reason: requiredText(5, 500),
  })
  .strict();

export const adminCancellationSchema = z
  .object({
    bookingId: z.uuid(),
    reason: requiredText(5, 500),
  })
  .strict();

export const cleanupExpiredReservationsSchema = z
  .object({ limit: z.number().int().min(1).max(50).default(25) })
  .strict();

export interface ReservationResponse {
  bookingId: string;
  bookingReference: string;
  paystackReference?: string;
  authorizationUrl?: string;
  accessCode?: string;
  expectedAmountKobo: number;
  currency: "NGN";
  paymentOption: PaymentOption;
  holdExpiresAt?: string;
  bookingStatus: string;
  paymentStatus: string;
  idempotentReplay: boolean;
}

export interface PaymentStatusResponse {
  bookingId: string;
  bookingReference: string;
  bookingStatus: string;
  paymentStatus: string;
  expectedAmountKobo: number;
  amountPaidKobo: number;
  currency: "NGN";
  paymentOption: PaymentOption;
  paystackReference?: string;
  holdExpiresAt?: string;
  paidAt?: string;
  verifiedAt?: string;
  requiresAdminAction: boolean;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  preparation: string;
  address: string;
}
