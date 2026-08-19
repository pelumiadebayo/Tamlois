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
import type { BlockedPeriod, Booking, BusinessSettings } from "../types";

export const defaultSettings: BusinessSettings = {
  timezone: "Africa/Lagos",
  address: "[Clinic address to be confirmed]",
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
