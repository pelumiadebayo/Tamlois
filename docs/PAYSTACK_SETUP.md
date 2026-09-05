# Paystack and Firebase Functions setup

Tamlois uses Paystack Redirect Checkout. The React app never calls a secret-key endpoint. A Firebase callable reserves capacity and initializes the transaction; the callback and signed webhook independently verify the transaction, then share one idempotent Firestore finalization service.

## Frontend-safe configuration

The browser needs only the normal Firebase Web configuration, `VITE_APP_MODE=firebase`, App Check site key and owner UID used for routing feedback. This integration does not use Paystack Inline, so `VITE_PAYSTACK_PUBLIC_KEY` is not required. Never create `VITE_PAYSTACK_SECRET_KEY`.

Current temporary production URLs:

```text
Frontend: https://pelumiadebayo.github.io/Tamlois
Callback: https://pelumiadebayo.github.io/Tamlois/#/booking/payment-callback
Webhook:  https://africa-south1-tamlois.cloudfunctions.net/paystackWebhook
```

Replace the frontend/callback origins when the custom domain is approved.

## Server-only configuration

Upgrade the Firebase project to Blaze and attach the organization-controlled billing account before deploying Functions. Select project `tamlois`, then set secrets interactively (never place values on the command line or in Git):

```bash
firebase login
firebase use tamlois
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase functions:secrets:set PAYSTACK_WEBHOOK_SECRET
```

Paystack signs webhooks with the integration secret key. If the Paystack account has no separate webhook secret, set `PAYSTACK_WEBHOOK_SECRET` to the same value as `PAYSTACK_SECRET_KEY`; this keeps the code’s rotation boundary explicit without inventing a Paystack credential that does not exist.

The first deploy prompts for these non-secret Firebase parameters:

```text
APP_PUBLIC_URL=https://pelumiadebayo.github.io/Tamlois
ALLOWED_FRONTEND_ORIGINS=https://pelumiadebayo.github.io,http://127.0.0.1:4173,http://localhost:4173
ENFORCE_APP_CHECK=true
```

The Firebase CLI can save parameter values in a project-specific Functions environment file. `functions/.env*` is ignored by Git. Keep production App Check enforcement true. For emulator-only development, set `ENFORCE_APP_CHECK=false` in the emulator environment or use an App Check debug token registered in Firebase Console; never deploy that relaxation to production.

## Deploy

```bash
npm install
npm --prefix functions install
npm run build:functions
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
```

Combined deployment is also supported after both builds pass:

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes
```

The Functions are in `africa-south1`, use Node 22, 256 MiB, `minInstances: 0`, `maxInstances: 3`, and no scheduled polling job. The Bookings admin page exposes a bounded, owner-only **Clean expired holds** action (at most 25 candidates per click). It is optional housekeeping: every reservation transaction still treats expired provisional locks as available and reclaims them atomically, so correctness never depends on running cleanup.

## Paystack test mode

1. Get the Paystack **test secret key** from the organization’s Paystack dashboard.
2. Store it in `PAYSTACK_SECRET_KEY`; set `PAYSTACK_WEBHOOK_SECRET` to the same test key unless Paystack explicitly supplies a separate webhook-signing secret.
3. Deploy Functions.
4. Register the deployed `paystackWebhook` URL in Paystack test settings.
5. Keep `APP_PUBLIC_URL` on the GitHub Pages URL and perform Paystack test-card journeys.
6. Check `bookings`, `paymentAttempts`, `paymentEvents` and `auditLogs` in Firestore. Do not copy complete gateway payloads into Firestore or logs.
7. Verify duplicate webhook delivery produces one applied payment event, the fourth Salon seat fails, overlapping Trichology time fails, mismatch states require admin action, and a late payment cannot displace a newer booking.

Normal automated tests use an injected mock gateway and never contact Paystack. A live/test Paystack smoke test is deliberately manual because it requires the owner’s test account and credentials.

## Live mode

1. Finish Paystack business activation and obtain the live secret key.
2. Confirm production services, prices, policies, deposit modes, hold duration, cancellation/refund policy and support contact.
3. Rotate `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` to the live key values with `firebase functions:secrets:set`.
4. Confirm `APP_PUBLIC_URL`, `ALLOWED_FRONTEND_ORIGINS`, Firebase Authorized Domains and App Check use the production domain.
5. Deploy Functions again and register/confirm the production webhook URL in Paystack.
6. Run a low-value live transaction approved by the business, verify the booking and Firestore audit trail, then reconcile it in the Paystack dashboard.

## Callback, webhook and verification behavior

- Paystack may append `reference`/`trxref` to the callback URL. The page uses it only to ask the authenticated Function to verify; query parameters never mark a booking paid.
- `verifyPaystackPayment` calls Paystack’s verify endpoint with the secret key and checks success status, reference, exact integer-kobo amount, `NGN`, stored email, metadata booking ID/customer UID, lock ownership and idempotency state.
- `paystackWebhook` accepts POST only, caps request size, verifies `x-paystack-signature` with HMAC SHA-512 over the raw body using a timing-safe comparison, processes `charge.success`, then independently calls Paystack verification.
- Callback and webhook use the same finalization transaction. Duplicate callbacks/webhooks return the already-applied status rather than charging or confirming again.
- If the paid booking no longer owns every lock, it becomes `payment-received-slot-unavailable`, stays paid, and enters the admin manual-resolution queue. No automatic refund is attempted.

## Admin operations

The exact configured owner UID can inspect payment fields, filter problem states, reverify a Paystack reference with a recorded reason, clean a bounded batch of expired holds, and cancel a booking through server-controlled Functions. Reverification never calls Paystack from the browser. Cancellation does not refund a paid transaction automatically.

For paid-but-unavailable cases, the owner must review the audit trail and clinic policy, then arrange another free appointment, make a deliberately approved capacity override, or arrange a refund through the approved Paystack process. Record the resolution internally.

## Local emulator workflow

Install Java 21, then run:

```bash
firebase emulators:start --only auth,firestore,functions --project demo-tamlois-payments
```

In a second terminal:

```bash
npm run test
npm run test:functions
npm run test:functions:emulator
npm run test:rules
npm run test:e2e
```

Use injected gateway scenarios for successful, failed, abandoned, mismatched, duplicate and late payments. Do not put a real secret in emulator fixtures.

## Billing and artifact controls

In Google Cloud Console → Billing → **Budgets & alerts**, scope a monthly budget to project `tamlois`, set owner/finance recipients, and configure actual and forecast thresholds. Budget alerts notify people; ordinary alerts do **not** automatically stop billing. Review eligible spend-cap controls separately before relying on them.

After the first Functions deployment, configure Artifact Registry cleanup. Seven days retains a short inspection window while limiting storage growth:

```bash
firebase functions:artifacts:setpolicy --location africa-south1 --days 7
```

## Safe logs and secret rotation

- Logs intentionally omit keys, complete customer records, notes and full webhook bodies. Search by booking reference or the short hashed gateway reference recorded in warnings.
- If a secret is exposed, revoke/roll it in Paystack immediately, set the new Firebase secret version, redeploy every bound Function, send a signed test webhook, and review Paystack/Cloud logs for abuse.
- Do not paste secret values into issues, screenshots, GitHub variables intended for Vite, Firestore documents or support messages.

## Common failures

- `unauthenticated`: Anonymous Auth is disabled or the admin session is active in the booking browser.
- `permission-denied`: frontend origin, App Check token or owner UID is wrong.
- initialization failed: Paystack/network failed; the Function marks the attempt failed and releases provisional locks.
- amount/currency/customer mismatch: booking is not confirmed and enters manual review.
- callback retry: safe; verification is idempotent.
- webhook 401: wrong signing secret or altered raw body.
- hold expired: customer must select availability again; a verified late payment never takes another booking’s lock.

## Values still requiring owner input

| Value | Current state |
| --- | --- |
| Firebase project ID | `tamlois` |
| Firestore region | `africa-south1` |
| Functions region | `africa-south1` |
| Temporary frontend URL | `https://pelumiadebayo.github.io/Tamlois` |
| Allowed origins | GitHub Pages origin plus local development origins; add final custom origin later |
| Paystack test secret | **Required from owner** |
| Paystack live secret | **Required later from owner** |
| Webhook URL | Deploy-generated URL shown above; confirm after deployment |
| Callback URL | GitHub Pages hash URL shown above; replace with final domain later |
| Authorized Firebase admin UID | `0CZw1AFTjMXudXtvFST0z2ufET02` |
| Permitted payment modes | Currently full, 50% deposit and clinic; owner must approve |
| Deposit rules | Current 50%; fixed deposit value exists but mode is off; owner must approve |
| Payment hold | Current 15 minutes; owner must approve |
| Refund/cancellation rules | **Required from owner; no automatic refunds implemented** |
| Support phone/email | **Required from owner** |
