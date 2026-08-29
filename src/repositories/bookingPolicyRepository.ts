import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type {
  BookingPolicy,
  BookingPolicyRepository,
  CreateBookingPolicyInput,
  UpdateBookingPolicyInput,
} from "../types";

const COLLECTION_NAME = "bookingPolicies";

function normalizeText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function policyFromFirestore(id: string, data: Record<string, unknown>) {
  return {
    id,
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    displayOrder: Number(data.displayOrder ?? 0),
    version: Number(data.version ?? 1),
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  } satisfies BookingPolicy;
}

function sortPolicies(policies: BookingPolicy[]) {
  return policies.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
  );
}

export class FirestoreBookingPolicyRepository
  implements BookingPolicyRepository
{
  constructor(private readonly firestore: Firestore) {}

  async list() {
    const snapshot = await getDocs(
      collection(this.firestore, COLLECTION_NAME),
    );
    return sortPolicies(
      snapshot.docs.map((item) =>
        policyFromFirestore(item.id, item.data()),
      ),
    );
  }

  async createAsAdmin(input: CreateBookingPolicyInput) {
    const policies = await this.list();
    const id = crypto.randomUUID();
    const reference = doc(this.firestore, COLLECTION_NAME, id);
    await setDoc(reference, {
      id,
      title: normalizeText(input.title, "Policy title"),
      summary: normalizeText(input.summary, "Policy summary"),
      displayOrder:
        policies.reduce(
          (highest, policy) => Math.max(highest, policy.displayOrder),
          -1,
        ) + 1,
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(reference);
    if (!created.exists()) throw new Error("The policy could not be created.");
    return policyFromFirestore(created.id, created.data());
  }

  async updateAsAdmin(id: string, input: UpdateBookingPolicyInput) {
    const reference = doc(this.firestore, COLLECTION_NAME, id);
    const title = normalizeText(input.title, "Policy title");
    const summary = normalizeText(input.summary, "Policy summary");
    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("This policy no longer exists.");
      if (
        snapshot.data().title === title &&
        snapshot.data().summary === summary
      )
        return;
      transaction.update(reference, {
        title,
        summary,
        version: Number(snapshot.data().version ?? 0) + 1,
        updatedAt: serverTimestamp(),
      });
    });
    const updated = await getDoc(reference);
    if (!updated.exists()) throw new Error("The policy could not be updated.");
    return policyFromFirestore(updated.id, updated.data());
  }

  async reorderAsAdmin(ids: string[]) {
    const policies = await this.list();
    const existingIds = policies.map((policy) => policy.id).sort();
    const requestedIds = [...new Set(ids)].sort();
    if (
      requestedIds.length !== existingIds.length ||
      requestedIds.some((id, index) => id !== existingIds[index])
    )
      throw new Error("The policy list changed. Reload before reordering.");
    const batch = writeBatch(this.firestore);
    ids.forEach((id, displayOrder) => {
      batch.update(doc(this.firestore, COLLECTION_NAME, id), {
        displayOrder,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  async deleteAsAdmin(id: string) {
    await deleteDoc(doc(this.firestore, COLLECTION_NAME, id));
  }
}

function timestampFromStored(value: unknown) {
  if (value instanceof Timestamp) return value;
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    "nanoseconds" in value
  )
    return new Timestamp(
      Number((value as { seconds: unknown }).seconds),
      Number((value as { nanoseconds: unknown }).nanoseconds),
    );
  return Timestamp.now();
}

export class LocalBookingPolicyRepository implements BookingPolicyRepository {
  constructor(private readonly key = "tamlois-booking-policies") {}

  private read() {
    const stored = localStorage.getItem(this.key);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<Partial<BookingPolicy>>;
    return sortPolicies(
      parsed
        .filter((policy) => policy.id && policy.title && policy.summary)
        .map((policy, index) => ({
          id: String(policy.id),
          title: String(policy.title),
          summary: String(policy.summary),
          displayOrder: Number(policy.displayOrder ?? index),
          version:
            typeof policy.version === "number" && policy.version > 0
              ? policy.version
              : 1,
          createdAt: timestampFromStored(policy.createdAt),
          updatedAt: timestampFromStored(policy.updatedAt),
        })),
    );
  }

  private write(policies: BookingPolicy[]) {
    localStorage.setItem(this.key, JSON.stringify(policies));
  }

  async list() {
    return this.read();
  }

  async createAsAdmin(input: CreateBookingPolicyInput) {
    const policies = this.read();
    const now = Timestamp.now();
    const created: BookingPolicy = {
      id: crypto.randomUUID(),
      title: normalizeText(input.title, "Policy title"),
      summary: normalizeText(input.summary, "Policy summary"),
      displayOrder: policies.length,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.write([...policies, created]);
    return created;
  }

  async updateAsAdmin(id: string, input: UpdateBookingPolicyInput) {
    const policies = this.read();
    const existing = policies.find((policy) => policy.id === id);
    if (!existing) throw new Error("This policy no longer exists.");
    const title = normalizeText(input.title, "Policy title");
    const summary = normalizeText(input.summary, "Policy summary");
    if (existing.title === title && existing.summary === summary)
      return existing;
    const updated: BookingPolicy = {
      ...existing,
      title,
      summary,
      version: existing.version + 1,
      updatedAt: Timestamp.now(),
    };
    this.write(
      policies.map((policy) => (policy.id === id ? updated : policy)),
    );
    return updated;
  }

  async reorderAsAdmin(ids: string[]) {
    const policies = this.read();
    const byId = new Map(policies.map((policy) => [policy.id, policy]));
    if (new Set(ids).size !== policies.length || ids.some((id) => !byId.has(id)))
      throw new Error("The policy list changed. Reload before reordering.");
    const now = Timestamp.now();
    this.write(
      ids.map((id, displayOrder) => ({
        ...byId.get(id)!,
        displayOrder,
        updatedAt: now,
      })),
    );
  }

  async deleteAsAdmin(id: string) {
    const policies = this.read();
    if (!policies.some((policy) => policy.id === id))
      throw new Error("This policy no longer exists.");
    this.write(
      policies
        .filter((policy) => policy.id !== id)
        .map((policy, displayOrder) => ({ ...policy, displayOrder })),
    );
  }
}
