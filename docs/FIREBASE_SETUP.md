# Firebase setup

## Secure booking boundary

The included Firestore rules permit public reads only for active catalogue, intake and policy records plus the sanitised public business settings document. Anonymous browsers cannot create or read `bookingHolds`, `bookings`, `bookingIntakeResponses`, `payments`, `paymentEvents` or `notifications`. The included `bookingApi` Cloud Function validates the complete active policy bundle, service/extras compatibility, duration, price, required contact details, availability and hold state before committing a booking. Service intake responses remain optional.

For Paystack, the function initializes transactions with its server secret, independently verifies amount/reference/hold metadata before booking creation, and validates webhook HMAC signatures. Release holds after cancellation or expiry. Store no Paystack secret in Vite or any browser-delivered configuration.

For optional client photos, keep `VITE_ENABLE_CLIENT_PHOTO_UPLOADS=false` until private Storage rules, file validation, retention/deletion, explicit consent, malware handling and short-lived signed access are implemented. Demo mode creates only an in-memory preview URL and never uploads the file.

1. Create a Firebase project owned by the clinic.
2. Register a Web app and copy its public web configuration into a local `.env` based on `.env.example`.
3. Set `VITE_APP_MODE=firebase`.
4. Set `VITE_BOOKING_API_URL` to the deployed `bookingApi` URL. Create the `PAYSTACK_SECRET_KEY` secret with `firebase functions:secrets:set PAYSTACK_SECRET_KEY`. Set `PUBLIC_SITE_ORIGIN` and `BOOKING_ALLOWED_ORIGIN` to the exact public web origin when prompted during deployment. Set `REQUIRE_APP_CHECK=true` after the client App Check key has been verified.
5. Create Cloud Firestore in a region close to the clinic's users. Region choice is difficult to change later.
6. Enable Email/Password under Authentication.
7. Create the owner's account.
8. Set a custom claim such as `{ "admin": true }` using a trusted Admin SDK script or server environment. Never let the browser grant itself admin status.
9. Deploy functions, rules and indexes:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use YOUR_PROJECT_ID
   npm --prefix functions install
   npm --prefix functions run build
   firebase deploy --only functions,firestore:rules,firestore:indexes
   ```

10. Seed active services, service extras, service intake schemas, all active policies, the four canonical `homeOfferings` records and approved `gallery` records. Their enforced IDs/order are Salon 1, Trichology 2, Products 3 and Gallery 4. Save public-safe availability and payment settings through the admin. Gallery records marked `isClientResult: true` must also carry `consentConfirmed: true`, `placeholder: false` and a non-empty clinic-held consent reference.
11. Add the production host and any custom domain to Authentication authorised domains.
12. Enable App Check for the final web domain, add `VITE_FIREBASE_APP_CHECK_SITE_KEY`, and enforce it only after verification.
13. Point the Paystack webhook to the deployed `paystackWebhook` URL and test successful and failed verification with Paystack test keys. The API stores idempotent `paymentEvents`; a success received after hold expiry is marked `requires-refund-or-manual-rebooking` and must be handled by clinic operations.
14. Test public reads, admin-claim sign-in, concurrent hold collisions, expiration/release, paid and clinic-due bookings, stale-policy rejection and every admin action with the Firebase emulator before production.

Firebase API keys, auth domains, project IDs and app IDs are designed to appear in web apps. They identify the project but do not authorise data access. Security depends on Authentication, Firestore rules, App Check and trusted server code. Admin SDK keys, service-account JSON, Paystack secrets, Shopify Admin tokens and email-provider secrets must never enter `VITE_*` variables or source control.

The included rules deny all public booking and hold reads/writes; the Admin SDK in Cloud Functions bypasses those rules only after server validation. Public users may read active `homeOfferings` and active `gallery` records, while only admins can write them. The gallery rule rejects a client-result claim without confirmed consent. `businessSettings/public` intentionally exposes operating rules and reason-free blocks, while private operational records remain admin-only. Before production, enable App Check or equivalent request attestation and rate limiting, configure retention for intake data, and test cancellation cleanup and concurrent submissions against the emulator.
