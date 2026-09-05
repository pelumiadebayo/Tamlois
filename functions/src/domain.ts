import { randomBytes } from "node:crypto";
import type { PaymentOption } from "./contracts.js";

export const OWNER_UID = "0CZw1AFTjMXudXtvFST0z2ufET02";
export const CURRENCY = "NGN" as const;
export const MAX_HOLD_MINUTES = 30;

export const BUSINESS_SCHEDULE = {
  timezone: "Africa/Lagos",
  openDays: [1, 2, 3, 4, 5, 6],
  openingTime: "09:00",
  closingTime: "18:00",
  bookingIntervalMinutes: 30,
  appointmentBufferMinutes: 15,
  minimumNoticeHours: 4,
  maximumAdvanceDays: 60,
  salonSessions: [
    {
      id: "morning",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 3,
    },
    {
      id: "afternoon",
      startTime: "12:00",
      endTime: "15:00",
      capacity: 3,
    },
    {
      id: "evening",
      startTime: "15:00",
      endTime: "18:00",
      capacity: 3,
    },
  ],
} as const;

export interface AuthoritativePaymentSettings {
  enabledModes: PaymentOption[];
  depositPercentage: number;
  fixedDepositAmountKobo: number;
  holdMinutes: number;
  address: string;
  approvalRequired: boolean;
}

export const DEFAULT_PAYMENT_SETTINGS: AuthoritativePaymentSettings = {
  enabledModes: ["full", "deposit_percentage", "deposit_fixed", "clinic"],
  depositPercentage: 50,
  fixedDepositAmountKobo: 1_000_000,
  holdMinutes: 15,
  address: "16, Road 21, Gowon Estate, Lagos, Nigeria",
  approvalRequired: true,
};

export function nairaToKobo(value: unknown): number {
  const naira = Number(value);
  if (!Number.isSafeInteger(naira) || naira < 0)
    throw new Error("PRICE_CONFIGURATION_INVALID");
  const kobo = naira * 100;
  if (!Number.isSafeInteger(kobo))
    throw new Error("PRICE_CONFIGURATION_INVALID");
  return kobo;
}

export function calculatePayableAmountKobo(
  subtotalKobo: number,
  option: PaymentOption,
  settings: AuthoritativePaymentSettings,
): number {
  if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo < 0)
    throw new Error("PRICE_CONFIGURATION_INVALID");
  if (!settings.enabledModes.includes(option))
    throw new Error("PAYMENT_OPTION_DISABLED");
  if (option === "clinic") return 0;
  if (option === "full") return subtotalKobo;
  if (option === "deposit_fixed")
    return Math.min(subtotalKobo, settings.fixedDepositAmountKobo);
  return Math.min(
    subtotalKobo,
    Math.round((subtotalKobo * settings.depositPercentage) / 100),
  );
}

export function endTime(startTime: string, durationMinutes: number) {
  const [hour = 0, minute = 0] = startTime.split(":").map(Number);
  const total = hour * 60 + minute + durationMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function trichologyLockIds(
  date: string,
  startTime: string,
  durationMinutes: number,
  bufferMinutes = BUSINESS_SCHEDULE.appointmentBufferMinutes,
) {
  const [hour = 0, minute = 0] = startTime.split(":").map(Number);
  const start = hour * 60 + minute;
  const ids: string[] = [];
  for (
    let cursor = start;
    cursor < start + durationMinutes + bufferMinutes;
    cursor += BUSINESS_SCHEDULE.bookingIntervalMinutes
  ) {
    ids.push(
      `${date}_${String(Math.floor(cursor / 60)).padStart(2, "0")}-${String(cursor % 60).padStart(2, "0")}`,
    );
  }
  return ids;
}

export function salonSeatIds(
  date: string,
  sessionId: "morning" | "afternoon" | "evening",
) {
  return [1, 2, 3].map(
    (seat) => `${date}_${sessionId}_seat-${seat}`,
  );
}

export function operationalUnitIds(date: string) {
  const ids: string[] = [];
  for (let cursor = 9 * 60; cursor < 18 * 60; cursor += 30)
    ids.push(
      `${date}_${String(Math.floor(cursor / 60)).padStart(2, "0")}-${String(cursor % 60).padStart(2, "0")}`,
    );
  return ids;
}

export function internalBookingReference(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  return `TAM-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function paystackReference(bookingId: string) {
  return `TAM-${bookingId.replaceAll("-", "").slice(0, 16)}-${randomBytes(6).toString("hex")}`;
}

export const BOOKING_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  "awaiting-payment": [
    "confirmed",
    "pending-confirmation",
    "expired",
    "payment-failed",
    "payment-received-slot-unavailable",
    "cancelled",
  ],
  confirmed: ["completed", "cancelled", "no-show"],
  "request-submitted": ["confirmed", "cancelled"],
  "pending-confirmation": ["confirmed", "cancelled"],
  expired: [],
  "payment-failed": [],
  "payment-received-slot-unavailable": ["confirmed", "cancelled"],
  completed: [],
  cancelled: [],
  "no-show": [],
};

export function canTransition(from: string, to: string) {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}
