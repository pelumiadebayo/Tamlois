import type {
  BookingFormData,
} from "../lib/booking";
import type {
  PaymentMode,
  PolicyConsentRecord,
} from "../types";

export type ProductionPaymentOption = Exclude<PaymentMode, "disabled">;

export interface ReservePaymentRequest {
  requestId: string;
  serviceId: string;
  extraIds: string[];
  date: string;
  startTime: string;
  details: BookingFormData;
  intakeResponses: Record<string, string | string[] | boolean>;
  policyConsent: PolicyConsentRecord;
  paymentOption: ProductionPaymentOption;
}

export interface ReservationResult {
  bookingId: string;
  bookingReference: string;
  paystackReference?: string;
  authorizationUrl?: string;
  accessCode?: string;
  expectedAmountKobo: number;
  currency: "NGN";
  paymentOption: ProductionPaymentOption;
  holdExpiresAt?: string;
  bookingStatus: string;
  paymentStatus: string;
  idempotentReplay: boolean;
}

export interface PaymentStatusResult {
  bookingId: string;
  bookingReference: string;
  bookingStatus: string;
  paymentStatus: string;
  expectedAmountKobo: number;
  amountPaidKobo: number;
  currency: "NGN";
  paymentOption: ProductionPaymentOption;
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

export interface PaymentProvider {
  reserve(request: ReservePaymentRequest): Promise<ReservationResult>;
  verify(
    bookingId: string,
    paystackReference: string,
  ): Promise<PaymentStatusResult>;
  status(bookingId: string): Promise<PaymentStatusResult>;
  reverify(bookingId: string, reason: string): Promise<PaymentStatusResult>;
  cancel(bookingId: string, reason: string): Promise<PaymentStatusResult>;
  cleanupExpired(limit?: number): Promise<{ scanned: number; expired: number }>;
}
