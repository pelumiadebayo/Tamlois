import { BUSINESS_SCHEDULE } from "../config/businessSchedule";

export const BOOKING_TIME_UNIT_MINUTES =
  BUSINESS_SCHEDULE.bookingIntervalMinutes;
export const MAX_BOOKABLE_DURATION_MINUTES = 240;
export const MAX_TRICHOLOGY_LOCKS = Math.ceil(
  (MAX_BOOKABLE_DURATION_MINUTES +
    BUSINESS_SCHEDULE.appointmentBufferMinutes) /
    BOOKING_TIME_UNIT_MINUTES,
);

export type SalonSessionId =
  (typeof BUSINESS_SCHEDULE.salonSessions)[number]["id"];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY = /^([01]\d|2[0-3]):[0-5]\d$/;

export function assertDateKey(date: string) {
  if (!DATE_KEY.test(date)) throw new Error("INVALID_BOOKING_DATE");
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    throw new Error("INVALID_BOOKING_DATE");
}

export function timeToMinutes(time: string) {
  if (!TIME_KEY.test(time)) throw new Error("INVALID_BOOKING_TIME");
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60)
    throw new Error("INVALID_BOOKING_TIME");
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function lagosDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_SCHEDULE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function lagosTime(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_SCHEDULE.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function dayOfWeekForDateKey(date: string) {
  assertDateKey(date);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isSunday(date: string) {
  return dayOfWeekForDateKey(date) === 0;
}

function dateOrdinal(date: string) {
  assertDateKey(date);
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function isBookableDate(date: string, now = new Date()) {
  const today = lagosDateKey(now);
  const daysAhead = dateOrdinal(date) - dateOrdinal(today);
  return (
    !isSunday(date) &&
    daysAhead >= 0 &&
    daysAhead <= BUSINESS_SCHEDULE.maximumAdvanceDays
  );
}

export function meetsMinimumNotice(
  date: string,
  startTime: string,
  now = new Date(),
) {
  const today = lagosDateKey(now);
  const differenceMinutes =
    (dateOrdinal(date) - dateOrdinal(today)) * 24 * 60 +
    timeToMinutes(startTime) -
    timeToMinutes(lagosTime(now));
  return differenceMinutes >= BUSINESS_SCHEDULE.minimumNoticeHours * 60;
}

export function salonSeatLockIds(
  date: string,
  sessionId: SalonSessionId,
) {
  assertDateKey(date);
  return [1, 2, 3].map(
    (seat) => `${date}_${sessionId}_seat-${seat}`,
  );
}

export function trichologyUnitLockIds(
  date: string,
  startTime: string,
  durationMinutes: number,
  bufferMinutes = BUSINESS_SCHEDULE.appointmentBufferMinutes,
) {
  assertDateKey(date);
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > MAX_BOOKABLE_DURATION_MINUTES ||
    !Number.isInteger(bufferMinutes) ||
    bufferMinutes < 0 ||
    bufferMinutes > 60
  )
    throw new Error("INVALID_BOOKING_DURATION");
  const start = timeToMinutes(startTime);
  const occupiedEnd = start + durationMinutes + bufferMinutes;
  const ids: string[] = [];
  for (
    let minute = start;
    minute < occupiedEnd;
    minute += BOOKING_TIME_UNIT_MINUTES
  ) {
    const unit = minutesToTime(minute).replace(":", "-");
    ids.push(`${date}_${unit}`);
  }
  if (ids.length > MAX_TRICHOLOGY_LOCKS)
    throw new Error("INVALID_BOOKING_DURATION");
  return ids;
}

export function blockUnitIds(
  date: string,
  startTime: string,
  endTime: string,
) {
  assertDateKey(date);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) throw new Error("INVALID_BLOCK_RANGE");
  const ids: string[] = [];
  for (
    let minute = start;
    minute < end;
    minute += BOOKING_TIME_UNIT_MINUTES
  )
    ids.push(`${date}_${minutesToTime(minute).replace(":", "-")}`);
  return ids;
}

export function overlappingBlockUnitIds(
  date: string,
  startTime: string = BUSINESS_SCHEDULE.openingTime,
  endTime: string = BUSINESS_SCHEDULE.closingTime,
) {
  assertDateKey(date);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) throw new Error("INVALID_BLOCK_RANGE");
  const firstUnit =
    Math.floor(start / BOOKING_TIME_UNIT_MINUTES) * BOOKING_TIME_UNIT_MINUTES;
  const ids: string[] = [];
  for (
    let minute = firstUnit;
    minute < end;
    minute += BOOKING_TIME_UNIT_MINUTES
  )
    ids.push(`${date}_${minutesToTime(minute).replace(":", "-")}`);
  return ids;
}

export function sessionById(id: string) {
  return BUSINESS_SCHEDULE.salonSessions.find((session) => session.id === id);
}

export function sessionByStartTime(startTime: string) {
  return BUSINESS_SCHEDULE.salonSessions.find(
    (session) => session.startTime === startTime,
  );
}

export function trichologyCandidateStartTimes(
  date: string,
  durationMinutes: number,
  occupiedLockIds: ReadonlySet<string>,
  blockedUnitIds: ReadonlySet<string>,
  now = new Date(),
) {
  if (!isBookableDate(date, now)) return [];
  if (
    durationMinutes <= 0 ||
    durationMinutes > MAX_BOOKABLE_DURATION_MINUTES
  )
    return [];
  const opening = timeToMinutes(BUSINESS_SCHEDULE.openingTime);
  const closing = timeToMinutes(BUSINESS_SCHEDULE.closingTime);
  const result: string[] = [];
  for (
    let minute = opening;
    minute + durationMinutes <= closing;
    minute += BOOKING_TIME_UNIT_MINUTES
  ) {
    const startTime = minutesToTime(minute);
    if (!meetsMinimumNotice(date, startTime, now)) continue;
    const lockIds = trichologyUnitLockIds(
      date,
      startTime,
      durationMinutes,
    );
    if (
      lockIds.some(
        (id) => occupiedLockIds.has(id) || blockedUnitIds.has(id),
      )
    )
      continue;
    result.push(startTime);
  }
  return result;
}
