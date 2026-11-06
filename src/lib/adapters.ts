import type { Booking } from "../types";

export interface PaymentProvider {
  createPayment(
    booking: Booking,
    amount: number,
  ): Promise<{ status: "paid" | "pending"; reference: string }>;
}
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(booking: Booking) {
    return { status: "paid" as const, reference: `MOCK-${booking.reference}` };
  }
}
export class PaystackPaymentProvider implements PaymentProvider {
  async createPayment(): Promise<never> {
    throw new Error(
      "Paystack is disabled. Configure a secure verification backend before enabling it.",
    );
  }
}

export interface NotificationProvider {
  bookingReceived(booking: Booking): Promise<void>;
}
export class MockNotificationProvider implements NotificationProvider {
  async bookingReceived(_booking: Booking) {
    return Promise.resolve();
  }
}
