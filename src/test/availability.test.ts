import { describe, expect, it } from 'vitest';
import {
  getAvailableSlots,
  defaultSettings,
  getSalonSessionAvailability,
} from '../lib/availability';
import type { Booking } from '../types';

const monday = new Date(2026, 7, 24);
const now = new Date(2026, 7, 23, 8, 0);
const booking: Booking = {
  id: 'b1', reference: 'TAM-TEST', category: 'trichology', serviceId: 's1', serviceName: 'Consultation', serviceSnapshot: { id: 's1', name: 'Consultation', category: 'trichology', price: 1000, duration: 60, preparation: 'Prepare' }, extras: [], addressSnapshot: 'Clinic', policyVersion: 'v1', preparationSnapshot: 'Prepare', date: '2026-08-24', startTime: '10:00', endTime: '11:00', totalDuration: 60, subtotal: 1000, amountDueNow: 0, balanceDue: 1000, fullName: 'Test Client', phone: '08000000000', email: 'test@example.com', preferredContact: 'email', concern: 'shedding', hopes: 'Plan', concernDuration: 'Months', priorProfessionalTreatment: 'No', productsTreatments: '', note: '', intakeResponses: {}, policyConsent: true, policyConsentRecord: { accepted: true, version: 'v1', acceptedAt: now.toISOString(), sessionId: 'session' }, paymentMode: 'clinic', paymentStatus: 'not-required', status: 'confirmed', internalNotes: '', createdAt: now.toISOString(), followUpDue: false
};

describe('availability calculation', () => {
  it('closes Sunday', () => expect(getAvailableSlots(new Date(2026, 7, 23), 60, defaultSettings, [], new Date(2026, 7, 20))).toEqual([]));
  it('closes a fully blocked date', () => expect(getAvailableSlots(monday, 60, { ...defaultSettings, blockedPeriods: [{ id: 'x', date: '2026-08-24', reason: 'Closed' }] }, [], now)).toEqual([]));
  it('removes overlapping partial blocks', () => {
    const slots = getAvailableSlots(monday, 60, { ...defaultSettings, minimumNoticeHours: 0, blockedPeriods: [{ id: 'x', date: '2026-08-24', start: '09:30', end: '11:00', reason: 'Meeting' }] }, [], now);
    expect(slots).not.toContain('09:00'); expect(slots).not.toContain('10:00'); expect(slots).toContain('11:00');
  });
  it('honours minimum notice', () => {
    const sameDayNow = new Date(2026, 7, 24, 9, 15);
    const slots = getAvailableSlots(monday, 45, { ...defaultSettings, minimumNoticeHours: 4 }, [], sameDayNow);
    expect(slots[0]).toBe('13:30');
  });
  it('accounts for duration, buffer and existing bookings', () => {
    const slots = getAvailableSlots(monday, 60, { ...defaultSettings, minimumNoticeHours: 0, bufferMinutes: 15 }, [booking], now);
    expect(slots).not.toContain('09:00'); expect(slots).not.toContain('09:30'); expect(slots).not.toContain('11:00'); expect(slots).toContain('11:30');
  });
});

describe('salon session capacity', () => {
  it('starts each open session with three spaces', () => {
    const sessions = getSalonSessionAvailability(
      monday,
      { ...defaultSettings, minimumNoticeHours: 0 },
      [],
      [],
      now,
    );
    expect(sessions.map((session) => session.remaining)).toEqual([3, 3, 3]);
    expect(sessions.every((session) => session.available)).toBe(true);
  });

  it('subtracts bookings and active holds from the matching session only', () => {
    const salonBooking: Booking = {
      ...booking,
      id: 'salon-1',
      category: 'salon',
      startTime: '09:00',
      endTime: '12:00',
    };
    const sessions = getSalonSessionAvailability(
      monday,
      { ...defaultSettings, minimumNoticeHours: 0 },
      [salonBooking],
      [
        {
          id: 'hold-1',
          sessionId: 'other-session',
          date: '2026-08-24',
          startTime: '09:00',
          endTime: '12:00',
          serviceId: 'svc-natural',
          category: 'salon',
          lockIds: [],
          expiresAt: '2026-08-24T12:00:00.000Z',
          status: 'active',
        },
      ],
      now,
    );
    expect(sessions.map((session) => session.remaining)).toEqual([1, 3, 3]);
  });

  it('disables a full session while leaving other sessions selectable', () => {
    const fullMorning = Array.from({ length: 3 }, (_, index) => ({
      ...booking,
      id: `salon-${index}`,
      category: 'salon' as const,
      startTime: '09:00',
      endTime: '12:00',
    }));
    const sessions = getSalonSessionAvailability(
      monday,
      { ...defaultSettings, minimumNoticeHours: 0 },
      fullMorning,
      [],
      now,
    );
    expect(sessions[0]).toMatchObject({ remaining: 0, available: false });
    expect(sessions[1]).toMatchObject({ remaining: 3, available: true });
  });
});
