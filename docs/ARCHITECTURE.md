# Architecture

## Runtime separation

Demo mode uses typed fixtures and local repositories. Firebase mode requires complete Web SDK configuration and never falls back to fixtures or localStorage for services, availability, bookings or administration. Session storage is used only for unfinished form progress; a completed Firebase booking is read from Firestore and its immediate confirmation copy is cached for the confirmation route.

UI components call typed repository interfaces. They do not call Firestore directly. Booking policies use a dedicated repository because their create, edit, reorder and permanent-delete operations have different versioning guarantees from generic records. Gallery metadata and optimized assets remain static repository content.

## Authentication

Public booking silently reuses or creates a Firebase Anonymous Authentication session. Its UID becomes `bookings.ownerUid` and every related `bookingLocks.ownerUid`. Customers see no account or Firebase identity UI.

The sole administrator signs in separately with Email/Password. React restores state with `onAuthStateChanged` and checks the browser-visible owner UID for navigation feedback. Firestore Rules independently compare the authenticated UID with `ownerUid()` and are authoritative. Anonymous users and other Email/Password users cannot enter owner routes or collections.

## Static schedule

`src/config/businessSchedule.ts` owns the ordinary schedule:

- timezone: `Africa/Lagos`;
- Monday–Saturday: 09:00–18:00;
- Sunday: closed;
- Salon morning 09:00–12:00, afternoon 12:00–15:00, evening 15:00–18:00;
- Salon capacity: three per session;
- Trichology interval: 30 minutes;
- appointment buffer: 15 minutes;
- maximum online duration: four hours.

Firestore stores exceptions, not the normal week.

## Firestore model

- `services/{serviceId}`: owner-managed catalogue; only active, non-archived records are public.
- `bookingPolicies/{policyId}`: publicly readable title/summary records ordered by `displayOrder`; owner-only create, versioned edit, reorder and permanent delete. There is no visibility or archive state.
- `bookings/{bookingId}`: private customer identity, contact details, consent, historical service/extras snapshots, immutable accepted policy title/summary/version snapshots, status and `lockIds`.
- `bookingLocks/{lockId}`: non-sensitive owner UID, booking ID, service type, date/time, optional Salon session or Trichology unit, active status and timestamp. No name, email, phone, concern or note.
- `blockedPeriods/{date_unit}`: deterministic 30-minute blocked unit. Full-day
  units also contain the bounded `publicReason` displayed on the customer
  calendar; timed blocks do not expose their reason here.
- `blockedPeriodDetails/{groupId}`: owner-only complete reason and original range.
- `capacityOverrides/{date_session}`: non-sensitive capacity 0–3.
- `capacityOverrideDetails/{id}`: owner-only reason.
- `auditLogs/{id}`: immutable owner actions.
- `leads` and `enquiries`: constrained public submissions, owner-readable.

Collections appear only after their first write. Production is not seeded. Gallery is not a Firestore collection.

The booking route loads every policy and fails closed when none exist. Acceptance records a bundle version plus an ordered copy of each policy's ID, title, summary and numeric version. Immediately before final submission, the route reloads the policy collection; changed or deleted policies invalidate stale consent and return the customer to policy review. Deleting a policy never traverses or rewrites historical bookings.

## Capacity algorithms

Salon availability reads the three deterministic seats for each session. A transaction selects the first available permitted seat after re-reading the service, relevant block units and deterministic capacity override. The booking and one seat lock are written together. Firestore retries conflicts; the fourth simultaneous booking sees all three seats and fails with `SESSION_FULL`.

Trichology availability calculates every required 30-minute unit for duration plus buffer. A transaction re-reads all relevant block units and locks, then writes the booking and every lock together. Any overlap fails with `SLOT_UNAVAILABLE`; no partial lock set is committed.

Booking IDs and references are generated once per draft and reused for retry idempotency. There are no payment holds. Admin cancellation updates the booking, deletes its future locks and adds an audit event atomically. Rescheduling claims new locks, updates the snapshot and releases old locks in one transaction. Completion and no-show retain locks.

## Browser-only security limit

Rules validate authentication, ownership, active services, exact writable schemas, string/list limits, allowed customer statuses, deterministic Salon seat IDs, non-sensitive lock fields and booking/lock `getAfter()` relationships. Rules can require at least one matching Trichology lock and bound the list to nine units, but they cannot derive and prove that an arbitrary browser supplied exactly every consecutive unit required by service duration and buffer.

The normal application always derives and writes the complete set transactionally, so ordinary concurrent double-booking is prevented. A deliberately malicious custom client could potentially under-lock Trichology business coverage. App Check reduces abuse but does not make browser code trusted. Absolute server-authoritative enforcement would require a trusted backend later.

## Payment and notification boundary

Firebase mode is pay-at-clinic. No Paystack secret, redirect trust or client-side “paid” mutation exists. Real verification and webhooks require a trusted backend. On-screen confirmation works without email; production email also requires a securely configured backend/provider.
