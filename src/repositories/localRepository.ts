import type { Booking, IntakeQuestion, Repository, Service, ServiceExtra } from '../types';
import { intakeQuestions, serviceExtras, services as seedServices } from '../data/content';

export class LocalRepository<T extends { id: string }> implements Repository<T> {
  constructor(private key: string, private seed: T[] = []) {}
  private read(): T[] {
    const value = localStorage.getItem(this.key);
    if (!value) { localStorage.setItem(this.key, JSON.stringify(this.seed)); return structuredClone(this.seed); }
    return JSON.parse(value) as T[];
  }
  async list() { return this.read(); }
  async get(id: string) { return this.read().find((item) => item.id === id) ?? null; }
  async save(item: T) {
    const items = this.read();
    const index = items.findIndex((candidate) => candidate.id === item.id);
    if (index >= 0) items[index] = item; else items.push(item);
    localStorage.setItem(this.key, JSON.stringify(items));
    return item;
  }
  async remove(id: string) { localStorage.setItem(this.key, JSON.stringify(this.read().filter((item) => item.id !== id))); }
}

export const serviceRepository = new LocalRepository<Service>('tamlois-services', seedServices);
export const bookingRepository = new LocalRepository<Booking>('tamlois-bookings', []);
export const serviceExtraRepository = new LocalRepository<ServiceExtra>('tamlois-service-extras', serviceExtras);
export const intakeQuestionRepository = new LocalRepository<IntakeQuestion>('tamlois-intake-questions', intakeQuestions);
