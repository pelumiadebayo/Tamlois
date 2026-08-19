import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { defaultSettings } from "../lib/availability";
import { db, firebaseEnabled } from "../lib/firebase";
import type { BlockedPeriod, BusinessSettings } from "../types";

const SETTINGS_KEY = "tamlois-booking-settings";
const BLOCKS_KEY = "tamlois-blocks";

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

export const availabilityRepository = {
  async getPublic(): Promise<BusinessSettings> {
    if (!firebaseEnabled || !db) return localSettings();
    const snapshot = await getDoc(doc(db, "businessSettings", "public"));
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
    const [settingsSnapshot, blocksSnapshot] = await Promise.all([
      getDoc(doc(db, "businessSettings", "public")),
      getDocs(collection(db, "blockedPeriods")),
    ]);
    const blocks = blocksSnapshot.docs.map(
      (item) => item.data() as BlockedPeriod,
    );
    return {
      settings: settingsSnapshot.exists()
        ? mergeSettings({
            ...settingsSnapshot.data(),
            blockedPeriods: blocks,
          } as Partial<BusinessSettings>)
        : { ...defaultSettings, blockedPeriods: blocks },
      blocks,
    };
  },
  async saveSettings(settings: BusinessSettings) {
    const safeBlocks = settings.blockedPeriods.map(
      ({ id, date, start, end }) => ({
        id,
        date,
        start: start || null,
        end: end || null,
        reason: "",
      }),
    );
    if (!firebaseEnabled || !db) {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...settings, blockedPeriods: undefined }),
      );
      return;
    }
    await setDoc(
      doc(db, "businessSettings", "public"),
      { ...settings, blockedPeriods: safeBlocks },
      { merge: true },
    );
  },
  async addBlock(block: BlockedPeriod, settings: BusinessSettings) {
    const next = [...settings.blockedPeriods, block];
    if (!firebaseEnabled || !db)
      localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    else await setDoc(doc(db, "blockedPeriods", block.id), block);
    await this.saveSettings({ ...settings, blockedPeriods: next });
    return next;
  },
  async removeBlock(id: string, settings: BusinessSettings) {
    const next = settings.blockedPeriods.filter((block) => block.id !== id);
    if (!firebaseEnabled || !db)
      localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    else await deleteDoc(doc(db, "blockedPeriods", id));
    await this.saveSettings({ ...settings, blockedPeriods: next });
    return next;
  },
};
