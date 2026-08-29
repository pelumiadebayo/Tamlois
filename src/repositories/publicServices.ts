import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, firebaseEnabled, firebaseMode } from '../lib/firebase';
import { serviceRepository } from './localRepository';
import type { Service } from '../types';
import { serviceFromFirestore } from './firestoreModels';

export async function listPublicServices() {
  if (firebaseEnabled && db) {
    const snapshot = await getDocs(query(
      collection(db, 'services'),
      where('active', '==', true),
      where('archived', '==', false),
    ));
    return snapshot.docs
      .map((item) => serviceFromFirestore(item.id, item.data()))
      .sort(
        (a, b) =>
          (a.displayOrder ?? a.order) - (b.displayOrder ?? b.order),
      );
  }
  if (firebaseMode) throw new Error('Firebase is not configured.');
  return serviceRepository.list();
}
