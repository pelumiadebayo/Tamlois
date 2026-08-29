import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { Repository, Service } from "../types";
import { serviceFromFirestore, serviceToFirestore } from "./firestoreModels";
import { recordAdminAudit } from "./auditRepository";

export class FirestoreServiceRepository implements Repository<Service> {
  constructor(private firestore: Firestore) {}

  async list() {
    const snapshot = await getDocs(collection(this.firestore, "services"));
    return snapshot.docs.map((item) => serviceFromFirestore(item.id, item.data()));
  }

  async get(id: string) {
    const snapshot = await getDoc(doc(this.firestore, "services", id));
    return snapshot.exists() ? serviceFromFirestore(snapshot.id, snapshot.data()) : null;
  }

  async save(service: Service) {
    const reference = doc(this.firestore, "services", service.id);
    const existing = await getDoc(reference);
    await setDoc(reference, serviceToFirestore(service, !existing.exists()), { merge: true });
    await recordAdminAudit(
      this.firestore,
      existing.exists() ? "service.updated" : "service.created",
      "services",
      service.id,
    );
    return service;
  }

  async remove(id: string) {
    await deleteDoc(doc(this.firestore, "services", id));
    await recordAdminAudit(this.firestore, "service.deleted", "services", id);
  }
}
