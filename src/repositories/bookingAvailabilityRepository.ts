import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import { BUSINESS_SCHEDULE } from "../config/businessSchedule";
import {
  blockUnitIds,
  isBookableDate,
  meetsMinimumNotice,
  salonSeatLockIds,
  trichologyCandidateStartTimes,
  trichologyUnitLockIds,
  type SalonSessionId,
} from "../lib/bookingCapacity";
import { db, ensureAnonymousBookingUser, firebaseEnabled } from "../lib/firebase";
import { resolveSalonMonthDayAvailability } from "../lib/availability";
import type {
  AvailabilityRepositoryContract,
  BookingAvailabilityRequest,
  SalonAvailabilityResult,
  SalonMonthAvailabilityDay,
  ServiceExtra,
  TrichologyAvailabilityResult,
} from "../types";
import { serviceFromFirestore } from "./firestoreModels";

const READ_TIMEOUT_MS = 10_000;

export class AvailabilityReadError extends Error {
  constructor(
    public readonly code:
      | "AUTH_UNAVAILABLE"
      | "SERVICE_UNAVAILABLE"
      | "FIRESTORE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "AvailabilityReadError";
  }
}

function withReadTimeout<T>(promise: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new AvailabilityReadError(
            "FIRESTORE_UNAVAILABLE",
            "Availability is taking longer than expected. Please retry.",
          ),
        ),
      READ_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readExistingIds(
  firestore: Firestore,
  collectionName: "bookingLocks" | "blockedPeriods",
  ids: string[],
) {
  const snapshots = await Promise.all(
    ids.map((id) => getDoc(doc(firestore, collectionName, id))),
  );
  return new Set(
    snapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.id),
  );
}

async function loadServiceAndDuration(
  firestore: Firestore,
  request: BookingAvailabilityRequest,
) {
  const [snapshot, ...extraSnapshots] = await Promise.all([
    getDoc(doc(firestore, "services", request.serviceId)),
    ...[...new Set(request.extraIds)].map((id) =>
      getDoc(doc(firestore, "serviceExtras", id)),
    ),
  ]);
  if (!snapshot.exists())
    throw new AvailabilityReadError(
      "SERVICE_UNAVAILABLE",
      "This service is no longer available. Please choose another service.",
    );
  const service = serviceFromFirestore(snapshot.id, snapshot.data());
  if (!service.active || service.archived)
    throw new AvailabilityReadError(
      "SERVICE_UNAVAILABLE",
      "This service is no longer available. Please choose another service.",
    );
  const extras = extraSnapshots
    .filter((item) => item.exists())
    .map(
      (item): ServiceExtra =>
        ({ id: item.id, ...item.data() }) as ServiceExtra,
    )
    .filter(
      (extra) =>
        extra.active === true &&
        Array.isArray(extra.compatibleServiceIds) &&
        extra.compatibleServiceIds.includes(service.id),
    );
  if (extras.length !== new Set(request.extraIds).size)
    throw new AvailabilityReadError(
      "SERVICE_UNAVAILABLE",
      "One of the selected extras is no longer available.",
    );
  return {
    service,
    duration:
      service.duration + extras.reduce((sum, extra) => sum + extra.duration, 0),
  };
}

function operationalUnitIds(date: string) {
  return blockUnitIds(
    date,
    BUSINESS_SCHEDULE.openingTime,
    "18:30",
  );
}

export class FirebaseBookingAvailabilityRepository
  implements AvailabilityRepositoryContract
{
  constructor(private firestore: Firestore) {}

  private async authenticate() {
    try {
      await ensureAnonymousBookingUser();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new AvailabilityReadError(
        "AUTH_UNAVAILABLE",
        "A secure booking session could not be started. Please retry.",
      );
    }
  }

  async getSalonSessionAvailability(
    request: BookingAvailabilityRequest,
  ): Promise<SalonAvailabilityResult> {
    await this.authenticate();
    return withReadTimeout(this.readSalon(request));
  }

  private async readSalon(
    request: BookingAvailabilityRequest,
  ): Promise<SalonAvailabilityResult> {
    const { service } = await loadServiceAndDuration(this.firestore, request);
    if (service.category !== "salon")
      throw new AvailabilityReadError(
        "SERVICE_UNAVAILABLE",
        "The selected service does not use Salon sessions.",
      );
    const blockIds = operationalUnitIds(request.date);
    const seatIds = BUSINESS_SCHEDULE.salonSessions.flatMap((session) =>
      salonSeatLockIds(request.date, session.id),
    );
    const [blockedIds, occupiedIds, overrideSnapshots] = await Promise.all([
      readExistingIds(this.firestore, "blockedPeriods", blockIds),
      readExistingIds(this.firestore, "bookingLocks", seatIds),
      Promise.all(
        BUSINESS_SCHEDULE.salonSessions.map((session) =>
          getDoc(
            doc(
              this.firestore,
              "capacityOverrides",
              `${request.date}_${session.id}`,
            ),
          ),
        ),
      ),
    ]);
    const dateOpen = isBookableDate(request.date);
    const sessions = BUSINESS_SCHEDULE.salonSessions.map((session, index) => {
      const override = overrideSnapshots[index];
      const configuredCapacity = override.exists()
        ? Math.max(0, Math.min(3, Number(override.data().capacity)))
        : session.capacity;
      const permittedSeats = salonSeatLockIds(
        request.date,
        session.id,
      ).slice(0, configuredCapacity);
      const blocked = blockUnitIds(
        request.date,
        session.startTime,
        session.endTime,
      ).some((id) => blockedIds.has(id));
      const occupied = permittedSeats.filter((id) => occupiedIds.has(id)).length;
      const remaining = Math.max(0, configuredCapacity - occupied);
      return {
        ...session,
        capacity: configuredCapacity,
        remaining,
        blocked,
        available:
          dateOpen &&
          !blocked &&
          meetsMinimumNotice(request.date, session.startTime) &&
          remaining > 0,
      };
    });
    return {
      date: request.date,
      blocked: !dateOpen || sessions.every((session) => session.blocked),
      sessions,
    };
  }

  async getTrichologyAvailability(
    request: BookingAvailabilityRequest,
  ): Promise<TrichologyAvailabilityResult> {
    await this.authenticate();
    return withReadTimeout(this.readTrichology(request));
  }

  async getSalonMonthAvailability(month: string) {
    await this.authenticate();
    return withReadTimeout(this.readSalonMonth(month));
  }

  private async readSalonMonth(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month))
      throw new AvailabilityReadError(
        "FIRESTORE_UNAVAILABLE",
        "The calendar month could not be loaded.",
      );
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const firstDate = `${month}-01`;
    const lastDate = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    const inMonth = (collectionName: string) =>
      getDocs(
        query(
          collection(this.firestore, collectionName),
          where("date", ">=", firstDate),
          where("date", "<=", lastDate),
        ),
      );
    const [locksSnapshot, blocksSnapshot, overridesSnapshot] = await Promise.all([
      inMonth("bookingLocks"),
      inMonth("blockedPeriods"),
      inMonth("capacityOverrides"),
    ]);
    const locksByDate = new Map<string, Set<string>>();
    locksSnapshot.docs.forEach((item) => {
      if (item.data().serviceType !== "salon") return;
      const date = String(item.data().date ?? "");
      const ids = locksByDate.get(date) ?? new Set<string>();
      ids.add(item.id);
      locksByDate.set(date, ids);
    });
    const blocksByDate = new Map<string, Set<string>>();
    const fullDayBlockedDates = new Set<string>();
    const fullDayBlockReasons = new Map<string, string>();
    blocksSnapshot.docs.forEach((item) => {
      const data = item.data();
      const date = String(data.date ?? "");
      const ids = blocksByDate.get(date) ?? new Set<string>();
      ids.add(item.id);
      blocksByDate.set(date, ids);
      if (data.kind === "all-day") fullDayBlockedDates.add(date);
      if (data.kind === "all-day" && typeof data.publicReason === "string") {
        const reason = data.publicReason.trim();
        if (reason && !fullDayBlockReasons.has(date))
          fullDayBlockReasons.set(date, reason);
      }
    });
    const overrides = new Map(
      overridesSnapshot.docs.map((item) => [
        `${String(item.data().date)}_${String(item.data().sessionId)}`,
        Number(item.data().capacity),
      ]),
    );
    const result: Record<string, SalonMonthAvailabilityDay> = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const fullDayReason = fullDayBlockReasons.get(date);
      const locks = locksByDate.get(date) ?? new Set<string>();
      const blocks = blocksByDate.get(date) ?? new Set<string>();
      const sessions = BUSINESS_SCHEDULE.salonSessions.map((session) => {
        const blocked = blockUnitIds(
          date,
          session.startTime,
          session.endTime,
        ).some((id) => blocks.has(id));
        const capacity = Math.max(
          0,
          Math.min(
            3,
            overrides.get(`${date}_${session.id}`) ?? session.capacity,
          ),
        );
        const occupied = salonSeatLockIds(date, session.id)
          .slice(0, capacity)
          .filter((id) => locks.has(id)).length;
        return {
          capacity,
          occupied,
          blocked,
          meetsNotice: meetsMinimumNotice(date, session.startTime),
        };
      });
      result[date] = resolveSalonMonthDayAvailability(
        isBookableDate(date),
        sessions,
        fullDayReason,
        fullDayBlockedDates.has(date),
      );
    }
    return result;
  }

  private async readTrichology(
    request: BookingAvailabilityRequest,
  ): Promise<TrichologyAvailabilityResult> {
    const { service, duration } = await loadServiceAndDuration(
      this.firestore,
      request,
    );
    if (service.category !== "trichology")
      throw new AvailabilityReadError(
        "SERVICE_UNAVAILABLE",
        "The selected service does not use precise appointment times.",
      );
    const candidateTimes: string[] = [];
    for (let minute = 9 * 60; minute + duration <= 18 * 60; minute += 30)
      candidateTimes.push(
        `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      );
    const lockIds = [
      ...new Set(
        candidateTimes.flatMap((time) =>
          trichologyUnitLockIds(request.date, time, duration),
        ),
      ),
    ];
    const blockIds = operationalUnitIds(request.date);
    const [occupiedIds, blockedIds] = await Promise.all([
      readExistingIds(this.firestore, "bookingLocks", lockIds),
      readExistingIds(this.firestore, "blockedPeriods", blockIds),
    ]);
    const slots = trichologyCandidateStartTimes(
      request.date,
      duration,
      occupiedIds,
      blockedIds,
    );
    return {
      date: request.date,
      slots,
      blocked: !isBookableDate(request.date) || blockedIds.size >= 18,
    };
  }
}

export const firebaseBookingAvailabilityRepository =
  firebaseEnabled && db
    ? new FirebaseBookingAvailabilityRepository(db)
    : null;

export function salonSessionId(value: string): SalonSessionId | null {
  return BUSINESS_SCHEDULE.salonSessions.some((session) => session.id === value)
    ? (value as SalonSessionId)
    : null;
}
