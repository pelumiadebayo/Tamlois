# Firebase setup

## 1. Web configuration

Copy the public Firebase Web app values to `.env.local` and the matching GitHub repository variables:

```dotenv
VITE_APP_MODE=firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=tamlois
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_ADMIN_UID=0CZw1AFTjMXudXtvFST0z2ufET02
VITE_DEFAULT_PAYMENT_MODE=clinic
```

Firebase Web identifiers are browser-visible configuration, not secrets. Never put a service account, Paystack secret or mail-provider key in a `VITE_*` variable. `VITE_BOOKING_API_URL` is not used.

## 2. Enable Authentication providers

In Firebase Console → **Authentication → Sign-in method**:

1. Enable **Email/Password** for the owner admin.
2. Enable **Anonymous** for public booking ownership.

If Anonymous is disabled, customers receive “Online booking is not enabled yet” and no availability or booking write is attempted. Existing anonymous sessions are reused. The public UI never asks a customer to register.

Create the sole owner in **Authentication → Users → Add user**, then copy the User UID. Put the UID in both:

- `ownerUid()` in `firestore.rules` — authoritative;
- `VITE_FIREBASE_ADMIN_UID` — routing and feedback only.

Firestore Rules cannot read Vite, `.env.local` or GitHub variables. Creating another Email/Password user does not grant access because its UID differs. There is no custom claim or signup bootstrap.

## 3. Firestore

The existing target is `(default)`, Standard edition, `africa-south1`. Do not seed production and do not manually create empty collections. They appear after their first successful write.

The normal Africa/Lagos schedule and Salon sessions are typed in `src/config/businessSchedule.ts`. Firestore persists `services`, `bookingPolicies`, `bookings`, `bookingLocks`, `blockedPeriods`, `blockedPeriodDetails`, `capacityOverrides`, `capacityOverrideDetails`, `businessSettings`, `publicBookingSettings`, `auditLogs`, `leads` and `enquiries`. Booking PII exists only in `bookings`; lock and public operational documents contain no customer PII. A full-day `blockedPeriods` unit repeats a bounded `publicReason` so the customer calendar can explain the closure. Do not enter names, contact details or other private information in that field. Timed-block and capacity-adjustment reasons remain in owner-only detail collections. Gallery stays static.

### Payment and hold settings

**Admin → Settings** writes payment choices, percentage and fixed-deposit amounts, balance timing, approval requirement and the 5–30 minute hold duration atomically to `businessSettings/booking` and `publicBookingSettings/current`. The first document is owner-only and authoritative for a trusted payment backend. The second contains the same non-sensitive values for the customer booking interface. Signed-out visitors may directly read only `publicBookingSettings/current`; collection listing is denied.

Fixed deposit is a supported payment mode and must have a positive whole-Naira amount when enabled. Saving requires at least one enabled choice, and a non-disabled default must also be enabled. The current browser-only Firebase flow remains pay-at-clinic; restoring the trusted Paystack backend is what turns the stored online-payment and hold values into gateway behavior.

`Clinic approval required` controls the initial status of new bookings. When enabled, a new booking is `pending-confirmation` until the owner confirms or cancels it. When disabled, a valid booking is immediately `confirmed`. The booking transaction and Firestore Rules both read the administrator-controlled public settings document; the customer cannot choose or forge this status. Changing the switch does not retroactively change existing bookings.

### Booking policies

Do not seed production policies. After signing in as the configured owner, open **Admin → Settings** and create the first policy. Until at least one policy exists, the customer booking flow remains closed.

Each `bookingPolicies/{policyId}` document contains only `id`, `title`, `summary`, `displayOrder`, numeric `version`, `createdAt` and `updatedAt`. Every existing document is publicly readable. Only the owner UID may create, edit, reorder or permanently delete a policy. There is no active, hidden, archived or soft-deleted state.

Editing title or summary increments the numeric version. Reordering changes only `displayOrder`. Permanent deletion removes only the policy document; it does not update bookings. Each new booking embeds the accepted policy IDs, titles, summaries and versions in `policyConsentRecord.policies`, so historical consent remains intact after later edits or deletion.

Review the Rules, select the intended project, then deploy only Rules and indexes:

```bash
firebase use
firebase deploy --only firestore:rules,firestore:indexes
```

This does not deploy collections, seed data, Functions or frontend code.

## 4. App Check

1. Register the web app with reCAPTCHA Enterprise or another supported web provider.
2. Add `pelumiadebayo.github.io` and the eventual custom domain to Firebase authorized domains and the App Check provider.
3. Set `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
4. Start in monitoring mode and verify legitimate production requests.
5. Enable Firestore enforcement only after valid traffic is healthy.

App Check reduces automated abuse. It does not replace Authentication, Rules or a trusted backend.

## 5. Tests

Install Java 21 for emulator tests, then run:

```bash
npm run lint
npm run test
npm run test:rules
npm run test:e2e
npm run build
```

CI already installs Java 21. Rules tests cover anonymous ownership, denied booking lists, cross-customer denial, forbidden customer status/payment changes, immutable policy snapshots, public policy reads, owner-only policy management, permanent deletion, PII-free locks, owner access and default denial.

## 6. Replacing the owner

1. Create the replacement Email/Password user and copy its UID.
2. Replace `ownerUid()` in `firestore.rules`.
3. Replace `VITE_FIREBASE_ADMIN_UID` locally and in GitHub variables.
4. Deploy the Rules and rebuild the frontend.
5. Verify the new owner is allowed and the old UID is denied.
6. Only then disable/delete the previous owner account.

## 7. Deliberate limitations

No Cloud Functions, paid backend, billing upgrade or Google Cloud API enablement is required. Normal concurrent capacity is protected by Firestore transactions. Rules cannot fully prove that a malicious browser created every consecutive Trichology unit derived from duration; a trusted backend is required for absolute enforcement later.

Real Paystack verification/webhooks and production email are also unavailable without a trusted backend. Firebase mode stays pay-at-clinic and always shows an on-screen booking confirmation.
