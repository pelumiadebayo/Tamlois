import { addMinutes, isAfter, parseISO } from "date-fns";
import type { BookingDraft, BookingHold } from "../types";
import { bookingLockIds } from "./firestoreRepository";

const DRAFT_KEY = "tamlois-booking-draft-v2";
const HOLD_KEY = "tamlois-booking-holds";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const newDraft = (): BookingDraft => ({
  sessionId: crypto.randomUUID(),
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
      return parsed;
    } catch {
      return newDraft();
    }
  },
  save(draft: BookingDraft) {
    const next = { ...draft, updatedAt: new Date().toISOString() };
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
  ) {
    const holds = readHolds();
    const lockIds = bookingLockIds(
      input.date,
      input.startTime,
      input.endTime,
      intervalMinutes,
      bufferMinutes,
    );
    const conflict = holds.some(
      (hold) =>
        hold.status === "active" &&
        hold.sessionId !== input.sessionId &&
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
