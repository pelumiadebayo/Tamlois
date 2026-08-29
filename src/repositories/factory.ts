import type { Firestore } from 'firebase/firestore';
import type { BookingRepositoryContract, Repository, Service } from '../types';
import { serviceRepository } from './localRepository';
import { bookingOperationsRepository } from './bookingRepository';
import { FirestoreServiceRepository } from './serviceRepository';

export function createRepositories(mode: 'demo' | 'firebase', firestore?: Firestore): { services: Repository<Service>; bookings: BookingRepositoryContract } {
  if (mode === 'firebase') {
    if (!firestore) throw new Error('Firestore is required in firebase mode.');
    return { services: new FirestoreServiceRepository(firestore), bookings: bookingOperationsRepository };
  }
  return { services: serviceRepository, bookings: bookingOperationsRepository };
}
