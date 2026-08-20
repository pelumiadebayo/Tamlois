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
6. Enable Email/Password authentication.
7. Create the owner's account.
8. Assign the `admin: true` custom claim using trusted Admin SDK code. The browser must never assign claims.
9. Deploy `firestore.rules` and `firestore.indexes.json`.
10. Seed `services`, `packages`, the four ordered `homeOfferings`, approved `gallery` records and private `businessSettings` using an Admin SDK process.
11. Register the final domain with App Check, add the site key and test before enforcement.
12. Add the GitHub Pages and custom domains to authorised domains.
13. Use the emulator to test denied public booking reads, allowed active-content reads, booking creation and admin writes.
14. Test two simultaneous booking submissions for overlapping durations and confirm one transaction fails.

Firebase's web API key and project identifiers are browser configuration, not database security. Service-account JSON, private keys and Admin SDK credentials are secrets and must stay in a trusted server or CI secret store.

## GitHub Pages

1. Create the repository and push `main`.
2. Select GitHub Actions as the Pages source.
3. Allow Pages deployment permissions.
4. Add any browser-safe `VITE_*` values as repository variables. `SITE_URL` is optional while using the built-in `https://pelumiadebayo.github.io/Tamlois` fallback; set it when the custom domain is ready.
5. Run `.github/workflows/deploy-pages.yml`.
6. Confirm the `base: './'` build works at the repository subpath.
7. If using a custom domain, add `public/CNAME`, configure DNS, wait for verification and enable HTTPS.
8. Update Firebase authorised domains and App Check.
9. Verify every hash route and the booking/admin journeys on the deployed URL.

## Shopify

- Add `VITE_SHOPIFY_STORE_DOMAIN`.
- For Storefront API, add a least-privilege public Storefront token to `VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
- For Buy Button, add the collection ID to `VITE_SHOPIFY_BUY_BUTTON_COLLECTION_ID` and place the embed behind the commerce adapter.
- Confirm product/variant mapping, currency, inventory, delivery, tax, returns and allowed domains.
- Implement and test error, empty and loading states against the live store.
- Remove demo products only when live product retrieval and checkout are verified.
- Never expose Shopify Admin API secrets.

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
| Care Loop offering copy, focal points and CTA destinations           | Admin Content / `homeOfferings`                                           | Replace licensed placeholder media and verify all four destinations; the canonical four-path order is protected                                |
| Gallery media and captions                                           | Admin Content / `gallery`                                                 | Replace placeholders with clinic-owned media; mark a genuine client result only with documented consent                                        |
| Source logo exports                                                  | missing input, then `public/` and `src/components/Layout.tsx`             | Replace temporary `T` mark and `public/favicon.svg`; produce transparent full logo, icon PNG, favicon and optimised sizes from the real source |
| Services, prices, durations, packages, clinical copy                 | `src/data/content.ts` then Firestore `services`/`packages`                | Replace every record marked `placeholder: true`                                                                                                |
| Service images                                                       | `src/data/content.ts` / admin media integration                           | `image`, `imageAlt`                                                                                                                            |
| Concern education and referral copy                                  | `src/data/content.ts`                                                     | `concerns` after clinical review                                                                                                               |
| Products and prices                                                  | `src/data/content.ts` or Shopify                                          | `products` and commerce provider                                                                                                               |
| Testimonials                                                         | `src/data/content.ts` then `testimonials`                                 | Replace all illustrative records                                                                                                               |
| Result stories and before/after media                                | `src/pages/ContentPages.tsx` then `results`                               | Add consented stories and capture context                                                                                                      |
| Address, phone, WhatsApp, email, Instagram, map                      | `src/data/content.ts` and environment variables                           | `contact` object and `VITE_BUSINESS_*`                                                                                                         |
| FAQ and policy answers                                               | `src/data/content.ts`                                                     | `faqs`                                                                                                                                         |
| Privacy, terms and cancellation                                      | `src/pages/ContentPages.tsx` / Firestore content                          | `LegalPage` content after legal review                                                                                                         |
| Booking interval, hours, closed days, notice, buffer, advance window | Admin Availability / `businessSettings/public`                            | Confirm clinic rules, then save through admin                                                                                                  |
| Blocked periods                                                      | Admin Availability / Firestore `blockedPeriods` plus public-safe settings | Add/remove blocks; private reasons stay out of the public settings document                                                                    |
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
