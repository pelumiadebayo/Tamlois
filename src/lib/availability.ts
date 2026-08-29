import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  isEqual,
  parse,
  startOfDay,
} from "date-fns";
import type {
  BlockedPeriod,
  Booking,
  BusinessSettings,
  SalonMonthAvailabilityDay,
} from "../types";
import { BUSINESS_SCHEDULE } from "../config/businessSchedule";

export const SALON_SESSIONS = BUSINESS_SCHEDULE.salonSessions;

export type SalonSessionAvailability = (typeof SALON_SESSIONS)[number] & {
  remaining: number;
  available: boolean;
};

export function resolveSalonCalendarDayAvailability(
  bookable: boolean,
  remaining: number,
  fullDayReason?: string,
  fullDayBlocked = false,
): SalonMonthAvailabilityDay {
  const reason = fullDayReason?.trim();
  if (fullDayBlocked || reason)
    return {
      remaining: 0,
      status: "blocked",
      reason: reason || "Closed",
    };
  if (!bookable) return { remaining: 0, status: "unavailable" };
  return {
    remaining: Math.max(0, remaining),
    status: remaining > 0 ? "available" : "booked",
  };
}

export interface SalonMonthSessionCapacity {
  capacity: number;
  occupied: number;
  blocked: boolean;
  meetsNotice: boolean;
}

/**
 * Keeps capacity states distinct from schedule states. In particular, a date
 * is only "booked" when every configured Salon place is occupied. A date that
 * still has places but has passed the booking-notice window is unavailable,
 * not booked.
 */
export function resolveSalonMonthDayAvailability(
  bookableDate: boolean,
  sessions: readonly SalonMonthSessionCapacity[],
  fullDayReason?: string,
  fullDayBlocked = false,
): SalonMonthAvailabilityDay {
  if (fullDayBlocked || fullDayReason?.trim())
    return resolveSalonCalendarDayAvailability(
      bookableDate,
      0,
      fullDayReason,
      fullDayBlocked,
    );

  if (!bookableDate)
    return resolveSalonCalendarDayAvailability(false, 0);

  const totalCapacity = sessions.reduce(
    (sum, session) => sum + Math.max(0, session.capacity),
    0,
  );
  const totalRemaining = sessions.reduce(
    (sum, session) =>
      sum + Math.max(0, session.capacity - session.occupied),
    0,
  );

  if (totalCapacity > 0 && totalRemaining === 0)
    return resolveSalonCalendarDayAvailability(true, 0);

  const selectableRemaining = sessions.reduce((sum, session) => {
    if (session.blocked || !session.meetsNotice) return sum;
    return sum + Math.max(0, session.capacity - session.occupied);
  }, 0);

  if (selectableRemaining === 0)
    return resolveSalonCalendarDayAvailability(false, 0);

  return resolveSalonCalendarDayAvailability(true, selectableRemaining);
}

export const defaultSettings: BusinessSettings = {
  timezone: BUSINESS_SCHEDULE.timezone,
  address: "16, Road 21, Gowon Estate, Lagos, Nigeria",
  bookingInterval: BUSINESS_SCHEDULE.bookingIntervalMinutes,
  bufferMinutes: BUSINESS_SCHEDULE.appointmentBufferMinutes,
  minimumNoticeHours: BUSINESS_SCHEDULE.minimumNoticeHours,
  maximumAdvanceDays: BUSINESS_SCHEDULE.maximumAdvanceDays,
  openingHour: Number(BUSINESS_SCHEDULE.openingTime.slice(0, 2)),
  closingHour: Number(BUSINESS_SCHEDULE.closingTime.slice(0, 2)),
  closedDays: [0],
  blockedPeriods: [],
  payment: {
    enabledModes: ["full", "deposit_percentage", "deposit_fixed", "clinic"],
    defaultMode:
      (import.meta.env
        .VITE_DEFAULT_PAYMENT_MODE as BusinessSettings["payment"]["defaultMode"]) ||
      "deposit_percentage",
    depositPercentage: Number(
      import.meta.env.VITE_DEFAULT_DEPOSIT_PERCENTAGE || 50,
    ),
    fixedDepositAmount: 10000,
    balanceDue: "at-clinic",
    holdMinutes: Number(import.meta.env.VITE_BOOKING_HOLD_MINUTES || 15),
    approvalRequired: true,
  },
};

const atTime = (date: Date, time: string) =>
  parse(`${format(date, "yyyy-MM-dd")} ${time}`, "yyyy-MM-dd HH:mm", date);
const overlaps = (start: Date, end: Date, otherStart: Date, otherEnd: Date) =>
  isBefore(start, otherEnd) && isAfter(end, otherStart);
const wallClockInTimeZone = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return new Date(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
};

export function getSalonSessionAvailability(
  date: Date,
  settings: BusinessSettings = defaultSettings,
  bookings: Booking[] = [],
  now = new Date(),
): SalonSessionAvailability[] {
  const clinicNow = wallClockInTimeZone(now, settings.timezone);
  const dateValue = format(date, "yyyy-MM-dd");
  const outsideWindow =
    settings.closedDays.includes(date.getDay()) ||
    isBefore(startOfDay(date), startOfDay(clinicNow)) ||
    isAfter(
      startOfDay(date),
      addDays(startOfDay(clinicNow), settings.maximumAdvanceDays),
    );
  const fullDayBlock = settings.blockedPeriods.some(
    (block) => block.date === dateValue && !block.start,
  );
  const minimumStart = addMinutes(clinicNow, settings.minimumNoticeHours * 60);

  return SALON_SESSIONS.map((session) => {
    const start = atTime(date, session.startTime);
    const end = atTime(date, session.endTime);
    const blocked = settings.blockedPeriods.some((period) => {
      if (period.date !== dateValue || !period.start || !period.end)
        return false;
      return overlaps(
        start,
        end,
        atTime(date, period.start),
        atTime(date, period.end),
      );
    });
    const bookedSpaces = bookings.filter(
      (booking) =>
        booking.category === "salon" &&
        booking.date === dateValue &&
        booking.startTime === session.startTime &&
        !["cancelled", "expired"].includes(booking.status),
    ).length;
    const remaining = Math.max(0, session.capacity - bookedSpaces);
    const meetsNotice =
      isAfter(start, minimumStart) || isEqual(start, minimumStart);
    return {
      ...session,
      remaining,
      available:
        !outsideWindow &&
        !fullDayBlock &&
        !blocked &&
        meetsNotice &&
        remaining > 0,
    };
  });
}

export function salonSessionForTime(time: string) {
  return SALON_SESSIONS.find((session) => session.startTime === time);
}

export function getAvailableSlots(
  date: Date,
  duration: number,
  settings: BusinessSettings = defaultSettings,
  bookings: Booking[] = [],
  now = new Date(),
): string[] {
  const clinicNow = wallClockInTimeZone(now, settings.timezone);
  if (settings.closedDays.includes(date.getDay())) return [];
  if (
    isBefore(startOfDay(date), startOfDay(clinicNow)) ||
    isAfter(
      startOfDay(date),
      addDays(startOfDay(clinicNow), settings.maximumAdvanceDays),
    )
  )
    return [];
  const fullDayBlock = settings.blockedPeriods.some(
    (block) => block.date === format(date, "yyyy-MM-dd") && !block.start,
  );
  if (fullDayBlock) return [];

  const slots: string[] = [];
  let cursor = atTime(
    date,
    `${String(settings.openingHour).padStart(2, "0")}:00`,
  );
  const closing = atTime(
    date,
    `${String(settings.closingHour).padStart(2, "0")}:00`,
  );
  const minimumStart = addMinutes(clinicNow, settings.minimumNoticeHours * 60);

  while (!isAfter(addMinutes(cursor, duration), closing)) {
    const appointmentEnd = addMinutes(
      cursor,
      duration + settings.bufferMinutes,
    );
    const blocked = settings.blockedPeriods.some((period: BlockedPeriod) => {
      if (
        period.date !== format(date, "yyyy-MM-dd") ||
        !period.start ||
        !period.end
      )
        return false;
      return overlaps(
        cursor,
        appointmentEnd,
        atTime(date, period.start),
        atTime(date, period.end),
      );
    });
    const booked = bookings.some((booking) => {
      if (
        booking.date !== format(date, "yyyy-MM-dd") ||
        ["cancelled", "expired"].includes(booking.status)
      )
        return false;
      return overlaps(
        cursor,
        appointmentEnd,
        atTime(date, booking.startTime),
        addMinutes(atTime(date, booking.endTime), settings.bufferMinutes),
      );
    });
    if (
      (isAfter(cursor, minimumStart) || isEqual(cursor, minimumStart)) &&
      !blocked &&
      !booked
    )
      slots.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, settings.bookingInterval);
  }
  return slots;
}

export function endTime(
  startTime: string,
  date: Date,
  duration: number,
): string {
  return format(addMinutes(atTime(date, startTime), duration), "HH:mm");
}
