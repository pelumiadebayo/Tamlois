import type { Firestore } from 'firebase/firestore';
import type { Booking, Repository, Service } from '../types';
import { bookingRepository, serviceRepository } from './localRepository';
import { FirestoreRepository } from './firestoreRepository';

export function createRepositories(mode: 'demo' | 'firebase', firestore?: Firestore): { services: Repository<Service>; bookings: Repository<Booking> } {
  if (mode === 'firebase') {
    if (!firestore) throw new Error('Firestore is required in firebase mode.');
    return { services: new FirestoreRepository<Service>(firestore, 'services'), bookings: new FirestoreRepository<Booking>(firestore, 'bookings') };
  }
  return { services: serviceRepository, bookings: bookingRepository };
}
