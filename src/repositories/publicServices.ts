import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db, firebaseEnabled } from '../lib/firebase';
import { serviceRepository } from './localRepository';
import type { Service } from '../types';

export async function listPublicServices() {
  if (firebaseEnabled && db) {
    const snapshot = await getDocs(query(collection(db, 'services'), where('active', '==', true), orderBy('order')));
    return snapshot.docs.map((item) => item.data() as Service);
  }
  return serviceRepository.list();
}
