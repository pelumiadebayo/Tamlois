import { addMinutes, isAfter, parseISO } from "date-fns";
import type { BookingDraft, BookingHold } from "../types";
import { bookingLockIds } from "./firestoreRepository";

const DRAFT_KEY = "tamlois-booking-draft-v2";
const HOLD_KEY = "tamlois-booking-holds";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BOOKING_FLOW_VERSION = 3;

const migrateLegacyStep = (step: number) =>
  [0, 1, 1, 2, 3, 4, 5][Math.max(0, Math.min(6, step))] ?? 0;

const newDraft = (): BookingDraft => ({
  sessionId: crypto.randomUUID(),
  flowVersion: BOOKING_FLOW_VERSION,
  step: 0,
  extraIds: [],
  date: "",
  time: "",
  details: {},
  intakeResponses: {},
  updatedAt: new Date().toISOString(),
});

export const bookingDraftRepository = {
  load(): BookingDraft {
    try {
      const parsed = JSON.parse(
        sessionStorage.getItem(DRAFT_KEY) || "null",
      ) as BookingDraft | null;
      const updatedAt = parsed?.updatedAt
        ? new Date(parsed.updatedAt).getTime()
        : Number.NaN;
      if (
        !parsed?.sessionId ||
        !Number.isFinite(updatedAt) ||
        Date.now() - updatedAt > DRAFT_MAX_AGE_MS
      ) {
        sessionStorage.removeItem(DRAFT_KEY);
        return newDraft();
      }
      if (parsed.flowVersion === BOOKING_FLOW_VERSION) return parsed;
      const migrated = {
        ...parsed,
        flowVersion: BOOKING_FLOW_VERSION,
        step: migrateLegacyStep(parsed.step),
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return newDraft();
    }
  },
  save(draft: BookingDraft) {
    const next = {
      ...draft,
      flowVersion: BOOKING_FLOW_VERSION,
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  },
  clear() {
    sessionStorage.removeItem(DRAFT_KEY);
  },
  fresh: newDraft,
};

const readHolds = (): BookingHold[] => {
  const now = new Date();
  const holds = JSON.parse(
    localStorage.getItem(HOLD_KEY) || "[]",
  ) as BookingHold[];
  const next = holds.map((hold) =>
    hold.status === "active" && !isAfter(parseISO(hold.expiresAt), now)
      ? { ...hold, status: "expired" as const }
      : hold,
  );
  localStorage.setItem(HOLD_KEY, JSON.stringify(next));
  return next;
};

const writeHolds = (holds: BookingHold[]) =>
  localStorage.setItem(HOLD_KEY, JSON.stringify(holds));

export const bookingHoldRepository = {
  listActive(date?: string) {
    return readHolds().filter(
      (hold) => hold.status === "active" && (!date || hold.date === date),
    );
  },
  get(id: string) {
    return readHolds().find((hold) => hold.id === id) ?? null;
  },
  create(
    input: Omit<BookingHold, "id" | "expiresAt" | "status" | "lockIds">,
    intervalMinutes: number,
    bufferMinutes: number,
    holdMinutes: number,
    capacity = 1,
  ) {
    const holds = readHolds();
    const lockIds = bookingLockIds(
      input.date,
      input.startTime,
      input.endTime,
      intervalMinutes,
      bufferMinutes,
    );
    const competingHolds = holds.filter(
      (hold) =>
        hold.status === "active" && hold.sessionId !== input.sessionId,
    );
    const conflict =
      capacity > 1
        ? competingHolds.filter(
            (hold) =>
              hold.date === input.date &&
              hold.startTime === input.startTime &&
              (hold.category === input.category || hold.endTime === input.endTime),
          ).length >= capacity
        : competingHolds.some((hold) =>
            hold.lockIds.some((id) => lockIds.includes(id)),
          );
    if (conflict)
      throw new Error(
        "That time was just held by another guest. Choose another available time.",
      );
    const previous = holds.map((hold) =>
      hold.sessionId === input.sessionId && hold.status === "active"
        ? { ...hold, status: "released" as const }
        : hold,
    );
    const hold: BookingHold = {
      ...input,
      id: crypto.randomUUID(),
      lockIds,
      expiresAt: addMinutes(new Date(), holdMinutes).toISOString(),
      status: "active",
    };
    writeHolds([...previous, hold]);
    return hold;
  },
  release(id: string, status: "released" | "expired" = "released") {
    writeHolds(
      readHolds().map((hold) =>
        hold.id === id && hold.status === "active" ? { ...hold, status } : hold,
      ),
    );
  },
  convert(id: string) {
    writeHolds(
      readHolds().map((hold) =>
        hold.id === id ? { ...hold, status: "converted" as const } : hold,
      ),
    );
  },
};
