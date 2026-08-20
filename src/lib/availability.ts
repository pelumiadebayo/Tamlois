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
  BookingHold,
  BusinessSettings,
} from "../types";

export const SALON_SESSIONS = [
  {
    id: "morning",
    label: "Morning Session",
    startTime: "09:00",
    endTime: "12:00",
    capacity: 3,
  },
  {
    id: "afternoon",
    label: "Afternoon Session",
    startTime: "12:00",
    endTime: "15:00",
    capacity: 3,
  },
  {
    id: "evening",
    label: "Evening Session",
    startTime: "15:00",
    endTime: "18:00",
    capacity: 3,
  },
] as const;

export type SalonSessionAvailability = (typeof SALON_SESSIONS)[number] & {
  remaining: number;
  available: boolean;
};

export const defaultSettings: BusinessSettings = {
  timezone: "Africa/Lagos",
  address: "Road 2, Gowon Estate, Egbeda Lagos, Nigeria",
  bookingInterval: 30,
  bufferMinutes: 15,
  minimumNoticeHours: 4,
  maximumAdvanceDays: 60,
  openingHour: 9,
  closingHour: 18,
  closedDays: [0],
  blockedPeriods: [],
  payment: {
    enabledModes: ["full", "deposit_percentage", "clinic"],
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
  holds: BookingHold[] = [],
  now = new Date(),
  currentSessionId?: string,
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
    const heldSpaces = holds.filter(
      (hold) =>
        hold.status === "active" &&
        hold.sessionId !== currentSessionId &&
        hold.date === dateValue &&
        hold.startTime === session.startTime &&
        (hold.category === "salon" || hold.endTime === session.endTime),
    ).length;
    const remaining = Math.max(
      0,
      session.capacity - bookedSpaces - heldSpaces,
    );
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
