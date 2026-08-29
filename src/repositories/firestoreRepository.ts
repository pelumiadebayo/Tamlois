import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import type { Repository } from "../types";

export function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value))
    return value.map((item) => withoutUndefined(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutUndefined(item)]),
    ) as T;
  }
  return value;
}

export class FirestoreRepository<T extends { id: string }>
  implements Repository<T>
{
  constructor(
    private db: Firestore,
    private collectionName: string,
  ) {}
  async list() {
    const result = await getDocs(collection(this.db, this.collectionName));
    return result.docs.map((item) => item.data() as T);
  }
  async get(id: string) {
    const result = await getDoc(doc(this.db, this.collectionName, id));
    return result.exists() ? (result.data() as T) : null;
  }
  async save(item: T) {
    const payload = withoutUndefined({
      ...item,
      createdAt: "createdAt" in item && item.createdAt ? item.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(this.db, this.collectionName, item.id), payload, {
      merge: true,
    });
    return item;
  }
  async remove(id: string) {
    await deleteDoc(doc(this.db, this.collectionName, id));
  }
}
