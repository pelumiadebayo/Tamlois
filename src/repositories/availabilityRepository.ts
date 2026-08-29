import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { BUSINESS_SCHEDULE } from "../config/businessSchedule";
import { overlappingBlockUnitIds } from "../lib/bookingCapacity";
import { defaultSettings } from "../lib/availability";
import { auth, db, firebaseEnabled } from "../lib/firebase";
import type { BlockedPeriod, BusinessSettings, CapacityOverride } from "../types";
import { recordAdminAudit } from "./auditRepository";

const SETTINGS_KEY = "tamlois-booking-settings";
const BLOCKS_KEY = "tamlois-blocks";

export class AvailabilityBlockConflictError extends Error {
  readonly code = "block-overlap";

  constructor() {
    super(
      "This time overlaps an existing block. Remove the existing block before adding a replacement.",
    );
    this.name = "AvailabilityBlockConflictError";
  }
}

const mergeSettings = (value: Partial<BusinessSettings>): BusinessSettings => ({
  ...defaultSettings,
  ...value,
  payment: { ...defaultSettings.payment, ...(value.payment || {}) },
  blockedPeriods: value.blockedPeriods || [],
});

const localSettings = (): BusinessSettings =>
  mergeSettings({
    ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
    blockedPeriods: JSON.parse(
      localStorage.getItem(BLOCKS_KEY) || "[]",
    ) as BlockedPeriod[],
  });

async function recordAvailabilityAudit(
  action: string,
  targetCollection: string,
  targetId: string,
) {
  if (!db) return;
  try {
    await recordAdminAudit(db, action, targetCollection, targetId);
  } catch (error) {
    // The operational write has already committed at this point. Do not tell
    // the administrator that it failed merely because its supplementary audit
    // record could not be written.
    if (import.meta.env.DEV)
      console.warn("Availability audit record could not be saved", error);
  }
}

export const availabilityRepository = {
  async getPublic(): Promise<BusinessSettings> {
    if (!firebaseEnabled || !db) return localSettings();
    const snapshot = await getDoc(doc(db, "publicBookingSettings", "current"));
    return snapshot.exists()
      ? mergeSettings(snapshot.data() as Partial<BusinessSettings>)
      : defaultSettings;
  },
  async getAdmin(): Promise<{
    settings: BusinessSettings;
    blocks: BlockedPeriod[];
  }> {
    if (!firebaseEnabled || !db) {
      const settings = localSettings();
      return { settings, blocks: settings.blockedPeriods };
    }
    const [blocksSnapshot, detailsSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(collection(db, "blockedPeriods")),
      getDocs(collection(db, "blockedPeriodDetails")),
      getDoc(doc(db, "businessSettings", "booking")),
    ]);
    const details = new Map(
      detailsSnapshot.docs.map((item) => [item.id, item.data()]),
    );
    const groups = new Map<string, BlockedPeriod>();
    blocksSnapshot.docs.forEach((item) => {
      const value = item.data();
      const groupId = String(value.groupId ?? value.id ?? item.id);
      if (groups.has(groupId)) return;
      const detail = details.get(groupId);
      groups.set(groupId, {
        id: groupId,
        date: String(detail?.date ?? value.date ?? ""),
        start:
          typeof detail?.start === "string"
            ? detail.start
            : typeof value.start === "string"
              ? value.start
              : undefined,
        end:
          typeof detail?.end === "string"
            ? detail.end
            : typeof value.end === "string"
              ? value.end
              : undefined,
        reason: String(detail?.reason ?? value.reason ?? "Operational block"),
        kind: (detail?.kind ?? value.kind ?? "time-range") as BlockedPeriod["kind"],
      });
    });
    const blocks = [...groups.values()].sort((a, b) =>
      `${a.date}${a.start ?? ""}`.localeCompare(`${b.date}${b.start ?? ""}`),
    );
    return {
      settings: {
        ...mergeSettings(
          settingsSnapshot.exists()
            ? (settingsSnapshot.data() as Partial<BusinessSettings>)
            : {},
        ),
        blockedPeriods: blocks,
      },
      blocks,
    };
  },
  async saveSettings(settings: BusinessSettings) {
    if (!firebaseEnabled || !db) {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...settings, blockedPeriods: undefined }),
      );
      return;
    }
    const payload = {
      address: settings.address,
      payment: settings.payment,
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    batch.set(doc(db, "businessSettings", "booking"), payload, { merge: true });
    batch.set(doc(db, "publicBookingSettings", "current"), payload, {
      merge: true,
    });
    await batch.commit();
    await recordAvailabilityAudit(
      "booking-settings.updated",
      "businessSettings",
      "booking",
    );
  },
  async addBlock(block: BlockedPeriod, settings: BusinessSettings) {
    const next = [...settings.blockedPeriods, block];
    if (!firebaseEnabled || !db)
      localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    else {
      const kind = block.start ? "time-range" : "all-day";
      const unitIds = overlappingBlockUnitIds(
        block.date,
        block.start ?? BUSINESS_SCHEDULE.openingTime,
        block.end ?? BUSINESS_SCHEDULE.closingTime,
      );
      const unitReferences = unitIds.map((unitId) =>
        doc(db!, "blockedPeriods", unitId),
      );
      await runTransaction(db, async (transaction) => {
        const existingUnits = await Promise.all(
          unitReferences.map((reference) => transaction.get(reference)),
        );
        if (existingUnits.some((snapshot) => snapshot.exists()))
          throw new AvailabilityBlockConflictError();

        unitReferences.forEach((reference, index) => {
          const unitId = unitIds[index];
          transaction.set(reference, {
            id: unitId,
            date: block.date,
            unitTime: unitId.slice(-5),
            groupId: block.id,
            kind,
            ...(kind === "all-day"
              ? { publicReason: block.reason.trim() }
              : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        transaction.set(doc(db!, "blockedPeriodDetails", block.id), {
          id: block.id,
          date: block.date,
          ...(block.start ? { start: block.start, end: block.end } : {}),
          reason: block.reason,
          kind,
          adminUid: auth?.currentUser?.uid ?? "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await recordAvailabilityAudit(
        "availability.blocked",
        "blockedPeriods",
        block.id,
      );
    }
    await this.saveSettings({ ...settings, blockedPeriods: next });
    return next;
  },
  async removeBlock(id: string, settings: BusinessSettings) {
    const next = settings.blockedPeriods.filter((block) => block.id !== id);
    if (!firebaseEnabled || !db)
      localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    else {
      const snapshot = await getDocs(collection(db, "blockedPeriods"));
      const batch = writeBatch(db);
      snapshot.docs
        .filter((item) => String(item.data().groupId ?? item.id) === id)
        .forEach((item) => batch.delete(item.ref));
      batch.delete(doc(db, "blockedPeriodDetails", id));
      await batch.commit();
      await recordAvailabilityAudit(
        "availability.unblocked",
        "blockedPeriods",
        id,
      );
    }
    await this.saveSettings({ ...settings, blockedPeriods: next });
    return next;
  },
  async listCapacityOverrides(): Promise<CapacityOverride[]> {
    if (!firebaseEnabled || !db) return [];
    const [snapshot, detailsSnapshot] = await Promise.all([
      getDocs(collection(db, "capacityOverrides")),
      getDocs(collection(db, "capacityOverrideDetails")),
    ]);
    const details = new Map(
      detailsSnapshot.docs.map((item) => [item.id, item.data()]),
    );
    return snapshot.docs.map((item) => ({
      ...(item.data() as CapacityOverride),
      reason: String(details.get(item.id)?.reason ?? "Capacity adjustment"),
    }));
  },
  async saveCapacityOverride(override: CapacityOverride) {
    if (!firebaseEnabled || !db) return;
    const id = `${override.date}_${override.sessionId}`;
    const batch = writeBatch(db);
    batch.set(doc(db, "capacityOverrides", id), {
      id,
      date: override.date,
      sessionId: override.sessionId,
      capacity: override.capacity,
      createdAt: override.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(doc(db, "capacityOverrideDetails", id), {
      id,
      reason: override.reason,
      adminUid: auth?.currentUser?.uid ?? "",
      createdAt: override.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    await recordAvailabilityAudit(
      "capacity-override.saved",
      "capacityOverrides",
      id,
    );
  },
  async removeCapacityOverride(id: string) {
    if (firebaseEnabled && db) {
      const batch = writeBatch(db);
      batch.delete(doc(db, "capacityOverrides", id));
      batch.delete(doc(db, "capacityOverrideDetails", id));
      await batch.commit();
      await recordAvailabilityAudit(
        "capacity-override.deleted",
        "capacityOverrides",
        id,
      );
    }
  },
};
