import { generateBookingReference } from "../lib/booking";
import type { BookingDraft } from "../types";

const DRAFT_KEY = "tamlois-booking-draft-v2";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BOOKING_FLOW_VERSION = 4;

const migrateLegacyStep = (step: number) =>
  [0, 1, 1, 2, 3, 4, 5][Math.max(0, Math.min(6, step))] ?? 0;

const newDraft = (): BookingDraft => ({
  sessionId: crypto.randomUUID(),
  bookingId: crypto.randomUUID(),
  bookingReference: generateBookingReference(),
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
      if (
        parsed.flowVersion === BOOKING_FLOW_VERSION &&
        parsed.bookingId &&
        parsed.bookingReference
      )
        return parsed;
      const migrated = {
        ...parsed,
        bookingId: parsed.bookingId || crypto.randomUUID(),
        bookingReference:
          parsed.bookingReference || generateBookingReference(),
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
