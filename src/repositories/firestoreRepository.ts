import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import { addMinutes, format, parse } from "date-fns";
import type { Booking, Repository } from "../types";

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
    await setDoc(doc(this.db, this.collectionName, item.id), item);
    return item;
  }
  async remove(id: string) {
    await deleteDoc(doc(this.db, this.collectionName, id));
  }
}

export function bookingLockIds(
  date: string,
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  bufferMinutes: number,
) {
  const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = addMinutes(
    parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date()),
    bufferMinutes,
  );
  const ids: string[] = [];
  for (
    let cursor = start;
    cursor < end;
    cursor = addMinutes(cursor, intervalMinutes)
  )
    ids.push(`${date}_${format(cursor, "HHmm")}`);
  return ids;
}

/** Admin-only status update; public clients cannot satisfy the Firestore rule. */
export async function updateBookingWithLockCleanup(
  db: Firestore,
  booking: Booking,
  nextStatus: Booking["status"],
) {
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, "bookings", booking.id);
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists()) throw new Error("Booking no longer exists.");
    const stored = snapshot.data() as Booking;
    transaction.update(bookingRef, {
      status: nextStatus,
      followUpDue: nextStatus === "completed",
    });
    if (["cancelled", "expired"].includes(nextStatus))
      (stored.lockIds || []).forEach((id) =>
        transaction.delete(doc(db, "bookingHolds", id)),
      );
  });
}
