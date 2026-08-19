import { db, firebaseEnabled } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type {
  BookingPolicy,
  IntakeQuestion,
  Repository,
  ServiceExtra,
} from "../types";
import { FirestoreRepository } from "./firestoreRepository";
import {
  bookingPolicyRepository as localPolicies,
  intakeQuestionRepository as localQuestions,
  serviceExtraRepository as localExtras,
} from "./localRepository";

function select<T extends { id: string }>(
  local: Repository<T>,
  collectionName: string,
): Repository<T> {
  return firebaseEnabled && db
    ? new FirestoreRepository<T>(db, collectionName)
    : local;
}

export const bookingConfigurationRepositories = {
  extras: select<ServiceExtra>(localExtras, "serviceExtras"),
  questions: select<IntakeQuestion>(localQuestions, "serviceIntakeSchemas"),
  policies: select<BookingPolicy>(localPolicies, "bookingPolicies"),
};

async function listActive<T extends { id: string }>(
  collectionName: string,
  fallback: Repository<T>,
) {
  if (!firebaseEnabled || !db) return fallback.list();
  const result = await getDocs(
    query(collection(db, collectionName), where("active", "==", true)),
  );
  return result.docs.map((item) => item.data() as T);
}

export const publicBookingConfiguration = {
  extras: () => listActive<ServiceExtra>("serviceExtras", localExtras),
  questions: () =>
    listActive<IntakeQuestion>("serviceIntakeSchemas", localQuestions),
  policies: () => listActive<BookingPolicy>("bookingPolicies", localPolicies),
};
