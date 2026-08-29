import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from '../lib/firebase';
import type { Lead } from '../types';
import { withoutUndefined } from './firestoreRepository';

function appendLocal<T>(key: string, value: T) {
  const items = JSON.parse(localStorage.getItem(key) || '[]') as T[];
  items.push(value);
  localStorage.setItem(key, JSON.stringify(items));
}

export interface Enquiry { id: string; fullName: string; email: string; message: string; consent: boolean; createdAt: string; }

export const submissionRepository = {
  async saveLead(lead: Lead) {
    if (!firebaseEnabled || !db) { appendLocal('tamlois-leads', lead); return; }
    await setDoc(doc(db, 'leads', lead.id), withoutUndefined({
      ...lead,
      createdAt: serverTimestamp(),
    }));
  },
  async saveEnquiry(enquiry: Enquiry) {
    if (!firebaseEnabled || !db) { appendLocal('tamlois-enquiries', enquiry); return; }
    await setDoc(doc(db, 'enquiries', enquiry.id), withoutUndefined({
      ...enquiry,
      createdAt: serverTimestamp(),
    }));
  }
};
