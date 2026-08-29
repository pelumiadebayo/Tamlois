import { db, firebaseEnabled } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type {
  IntakeQuestion,
  Repository,
  ServiceExtra,
} from "../types";
import { FirestoreRepository } from "./firestoreRepository";
import {
  intakeQuestionRepository as localQuestions,
  serviceExtraRepository as localExtras,
} from "./localRepository";
import {
  FirestoreBookingPolicyRepository,
  LocalBookingPolicyRepository,
} from "./bookingPolicyRepository";

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
  policies:
    firebaseEnabled && db
      ? new FirestoreBookingPolicyRepository(db)
      : new LocalBookingPolicyRepository(),
};

async function listActive<T extends { id: string }>(
  collectionName: string,
  fallback: Repository<T>,
) {
  if (!firebaseEnabled || !db) return fallback.list();
  const result = await getDocs(
    query(
      collection(db, collectionName),
      where("active", "==", true),
      where("placeholder", "==", false),
    ),
  );
  return result.docs.map((item) => item.data() as T);
}

export const publicBookingConfiguration = {
  extras: () => listActive<ServiceExtra>("serviceExtras", localExtras),
  // Stable intake copy ships with the application. Policies are deliberately
  // never seeded; every public policy is an administrator-created record.
  questions: () => localQuestions.list(),
  policies: () => bookingConfigurationRepositories.policies.list(),
};
