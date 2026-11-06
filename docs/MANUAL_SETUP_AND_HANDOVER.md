# Manual setup and handover

This is the launch-blocking checklist. Every value below is absent, illustrative or awaiting confirmation.

## Business content still required

- Confirm the preferred name in each context: formal metadata/legal (`Tamlois Natural & More | Tamlois Trichology Clinic`), normal UI (`Tamlois Naturals & Trichology Clinic`) and compact mark (`Tamlois`).
- Final street address, city/state/country and Google Maps link.
- Phone, WhatsApp, email, Instagram and any other public social profiles.
- Final owner portrait, clinic photographs/video and written usage rights.
- Original high-resolution/vector logo. The described source logo was not available to this build, so background removal and icon export could not be done. Replace the temporary `T` mark and favicon only after receiving the original.
- Confirmed service names, descriptions, prices, durations, display order, variations and availability.
- Confirmed packages/combos and their sequencing.
- Clinician-approved preparation, aftercare and contraindication language.
- Client-approved testimonials and result stories.
- Before/after images with written consent, matching capture conditions and honest context.
- Minimum notice, advance window, buffer, rescheduling, late-arrival, cancellation, deposit and refund rules.
- Children/minimum-age and guardian policy.
- Final privacy notice, terms, cancellation policy and privacy contact, reviewed by qualified counsel.
- Target launch date and responsible owner for content updates.
- Confirmed products, ingredients, suitability, prices, stock, shipping, returns and product images.
- Final FAQ answers.

## Firebase setup

1. Create the Firebase project under an organisation-controlled account.
2. Register a web application.
3. Copy the public Firebase web configuration values to the matching variables in `.env.example`.
4. Set `VITE_APP_MODE=firebase`.
5. Create Firestore and choose the region deliberately.
6. Enable Email/Password authentication for the owner and Anonymous Authentication for invisible public booking ownership. There is no customer signup UI.
7. Create the owner's Email/Password account in Firebase Authentication and copy its User UID.
8. Set the owner UID in the `ownerUid()` function in `firestore.rules`, and set the same UID as `VITE_FIREBASE_ADMIN_UID` for frontend routing and feedback. Firestore Rules cannot read Vite environment variables; the rules value is authoritative.
9. Deploy `firestore.rules` and `firestore.indexes.json`. A different authenticated UID remains denied. Anonymous users may create only their own pending booking plus matching non-sensitive locks atomically; they cannot list bookings or set admin/payment outcomes.
10. Do not seed production catalogue data. Start empty and create the first service in the owner admin. Gallery changes are repository changes, not Firebase records.
11. Register the final domain with App Check, add the site key and test before enforcement.
12. Add the GitHub Pages and custom domains to authorised domains.
13. Use the Auth and Firestore emulators to test denied booking lists, cross-customer reads, active catalogue reads, atomic booking/lock creation, admin blocks and owner writes.
14. Test two simultaneous booking submissions for overlapping durations and confirm one transaction fails.

Firebase's web API key and project identifiers are browser configuration, not database security. Service-account JSON, private keys and Admin SDK credentials are secrets and must stay in a trusted server or CI secret store.

Cloud Functions and a billing-enabled Firebase project are required for Paystack booking payments and product synchronization. Collections appear after their first successful write.

## GitHub Pages

1. Create the repository and push `main`.
2. In **Settings > Pages > Build and deployment**, set **Source** to **GitHub Actions**. Do not choose branch deployment, `main`, or `/ (root)`; those publish the uncompiled Vite source instead of the `dist` artifact.
3. Allow Pages deployment permissions.
4. Add any browser-safe `VITE_*` values as repository variables. `SITE_URL` is optional while using the built-in `https://pelumiadebayo.github.io/Tamlois` fallback; set it when the custom domain is ready.
5. Run `.github/workflows/deploy-pages.yml`.
6. Confirm the `base: './'` build works at the repository subpath.
7. If using a custom domain, add `public/CNAME`, configure DNS, wait for verification and enable HTTPS.
8. Update Firebase authorised domains and App Check.
9. Verify every hash route and the booking/admin journeys on the deployed URL.

## Paystack Storefront products

1. Set `VITE_COMMERCE_PROVIDER=paystack` and the public Storefront URL.
2. Run `firebase functions:secrets:set PAYSTACK_SECRET_KEY`; never add the secret to Vite or Firestore.
3. Deploy Functions and Firestore Rules, then run the first sync in **Admin → Products**.
4. Review each new hidden product, add accessible alt text/category or an optional HTTPS image override, then publish or feature it.
5. Confirm product URLs, stock, delivery, returns and retail notifications in Paystack.
6. See `docs/PAYSTACK_STOREFRONT_SETUP.md` for exact commands and troubleshooting.

## Payments

Keep real payments disabled until all items are complete:

- Paystack public key may be used by the client.
- Paystack secret key must exist only in a secure backend/serverless environment.
- Initialise and verify every transaction server-side.
- Validate signed webhooks and make processing idempotent.
- Reconcile payment status to bookings using trusted references.
- Confirm refund, partial-payment, cancellation and expired-payment rules.
- Test success, failure, abandonment, retry and duplicate callbacks.

Never trust browser redirect parameters as proof of payment.

## Email and reminders

Choose a transactional provider such as Postmark, Resend, SendGrid or an approved local equivalent. Provider API keys must be stored in a secure backend, never Vite variables. Implement the `NotificationProvider` methods for booking received, confirmed, rescheduled, cancelled, reminder, follow-up and rebooking. Confirm sender domain verification, reply-to address, data processing terms, templates, unsubscribe rules where relevant, retries and delivery logs. Until then the application correctly shows on-screen confirmation without claiming an email was sent.

## Content replacement map

| Placeholder                                                          | File or collection                                                        | Field/action                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero, practitioner, consultation and result images                   | `src/data/content.ts`                                                     | `media.*` URLs and alt text                                                                                                                    |
| Care Loop offering copy, focal points and CTA destinations           | `src/data/content.ts`                                                     | Replace licensed placeholder media and verify all four source-controlled destinations                                                          |
| Gallery media and captions                                           | `assets/gallery-sources`, `public/gallery`, `src/data/gallery.ts`         | Follow `docs/GALLERY_WORKFLOW.md`; never mark a client result without confirmed written consent                                                  |
| Source logo exports                                                  | missing input, then `public/` and `src/components/Layout.tsx`             | Replace temporary `T` mark and `public/favicon.svg`; produce transparent full logo, icon PNG, favicon and optimised sizes from the real source |
| Services, prices, durations, packages, clinical copy                 | Admin Services / Firestore `services`                                     | Create and publish verified production records; demo fixtures are not copied into Firebase                                                      |
| Service images                                                       | `src/data/content.ts` / admin media integration                           | `image`, `imageAlt`                                                                                                                            |
| Concern education and referral copy                                  | `src/data/content.ts`                                                     | `concerns` after clinical review                                                                                                               |
| Products and prices                                                  | Paystack Storefront / Firestore `productsCache`                           | Sync in Admin Products; edit price/stock in Paystack and presentation fields in Tamlois                                                       |
| Testimonials                                                         | `src/data/content.ts` then `testimonials`                                 | Replace all illustrative records                                                                                                               |
| Result stories and before/after media                                | `src/pages/ContentPages.tsx` then `results`                               | Add consented stories and capture context                                                                                                      |
| Address, phone, WhatsApp, email, Instagram, map                      | `src/data/content.ts` and environment variables                           | `contact` object and `VITE_BUSINESS_*`                                                                                                         |
| FAQ answers                                                          | `src/data/content.ts`                                                     | `faqs`                                                                                                                                         |
| Booking policies                                                     | Admin Settings / Firestore `bookingPolicies`                              | Create reviewed title/summary records in the required public order; do not seed production or add active/archive fields                       |
| Privacy, terms and cancellation                                      | `src/pages/ContentPages.tsx` / Firestore content                          | `LegalPage` content after legal review                                                                                                         |
| Normal schedule                                                      | `src/config/businessSchedule.ts`                                          | Source-controlled Africa/Lagos Monday-Saturday schedule and Salon sessions                                                                      |
| Blocked periods and capacity changes                                 | Admin Availability / Firestore `blockedPeriods`, `capacityOverrides`     | Add dated exceptions; full-day closure reasons are public on the calendar, while timed-block and capacity-adjustment reasons remain owner-only |
| Owner biography                                                      | `src/pages/ContentPages.tsx`, `src/pages/Home.tsx`                        | Use only confirmed wording and credentials                                                                                                     |
| SEO base URL and sitemap                                             | repository variable and `scripts/generate-sitemap.mjs`                    | `SITE_URL`                                                                                                                                     |
| Robots sitemap URL                                                   | `public/robots.txt`                                                       | Replace placeholder GitHub URL                                                                                                                 |
| Social sharing image                                                 | `public/` and `src/components/SEO.tsx`                                    | Add final OG image and `og:image`                                                                                                              |
| Lead guide asset and delivery                                        | `src/components/LeadCapture.tsx` / Firestore `leads`                      | Add the final asset and server-side delivery provider                                                                                          |
| Contact enquiries                                                    | `src/pages/ContentPages.tsx` / Firestore `enquiries`                      | Add admin notification and response workflow                                                                                                   |

Current stock placeholders are free-to-use Pexels photographs by Umar Faruq, Chad Populis, Mikhail Nilov, Ali Drabo and Gaea CBD. Their source pages are documented in commit history and the central media configuration. Confirm the licence at launch and replace them with clinic-owned photography when available.

## Final launch verification

- Replace all bracketed placeholders and every `placeholder: true` record.
- Search for `placeholder`, `demo`, `example.com`, `+234 000`, `YOUR_`, and `Illustrative`.
- Re-run unit, E2E and production build.
- Test keyboard, screen-reader landmarks, mobile zoom, reduced motion and contrast after content replacement.
- Confirm bookings cannot be publicly queried.
- Confirm real payments and email only after secure backends are live.
