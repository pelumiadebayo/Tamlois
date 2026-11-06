# Tamlois Naturals & Trichology Clinic

A React website, booking application and sole-owner administration area for Tamlois. Prices, policies, contact details and unconfirmed media remain placeholder content until the clinic approves them.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Firebase Web/Admin SDKs, Firebase Functions v2, Firestore, Zod, Paystack Transaction API, Vitest and Playwright.

## Local setup

```bash
npm install
npm run dev
```

Hash routing keeps deep links compatible with GitHub Pages. Demo mode uses browser-local fixtures. Firebase mode never falls back to demo data.

## Booking architecture

Policy acknowledgement precedes Category → Service → Schedule → Details → Summary → Payment. Policies are owner-created Firestore records with no seeded, hidden or archived state; booking remains closed until at least one exists. Each booking preserves the accepted policy titles, summaries and versions. Salon and Trichology Care Loop links retain the policy gate and skip the already-known category. Extras remain inside Service.

The ordinary schedule is typed source configuration: Africa/Lagos, Monday–Saturday, 09:00–18:00; Sunday closed. Salon has three three-hour sessions with capacity three. Trichology keeps duration-aware start times in 30-minute intervals.

In Firebase mode, an invisible Anonymous Authentication session owns each public booking. Availability reads only non-sensitive deterministic lock and operational-exception documents. A Firebase Functions v2 backend rechecks the active service, policies, authoritative payment settings, blocks, capacity override and every lock before atomically creating a private provisional booking and its lock(s). Online-payment holds default to 15 minutes; expired provisional locks are reclaimable transactionally, so correctness does not depend on cleanup.

Salon lock IDs are `{date}_{sessionId}_seat-1` through `seat-3`. Trichology locks each required unit as `{date}_{HH-MM}`, including the configured buffer. Server-controlled cancellation releases locks; completion and no-show preserve historical occupancy.

Production payment uses Paystack Redirect Checkout initialized by Firebase Functions. Amounts are recalculated in integer kobo; callbacks never confirm payment; the signed webhook and callback verification share one idempotent finalization transaction. Full payment, configured deposits and owner-approved pay-at-clinic are supported. No Paystack secret ships to the browser. See [Paystack setup](docs/PAYSTACK_SETUP.md).

Live retail products are managed in the official [Tamlois Paystack Storefront](https://paystack.shop/tamls). Owner-authenticated Firebase Functions synchronize a safe Firestore display cache; the homepage and `/shop` read visible cached products while checkout remains on Paystack. Tamlois presentation overrides survive synchronization, and the site has no local retail cart or retail-order system. See [Paystack Storefront setup](docs/PAYSTACK_STOREFRONT_SETUP.md).

## Admin authentication

Firebase Email/Password administration is restricted to the single configured owner UID. There is no public signup or customer-account UI, and another authenticated user is not an administrator. Firestore Rules are authoritative; the matching Vite UID is only routing feedback.

## Homepage and gallery

The Care Loop starts with Natural Hair Salon, followed by Trichology Care, Products and Gallery. Gallery uses optimized static WebP assets, typed metadata, responsive source sets and Load More. It has no Firebase collection, storage provider or admin editor. Follow [the gallery workflow](docs/GALLERY_WORKFLOW.md).

### Christmas homepage campaign

The Christmas treatment is an optional presentation layer and is disabled by default. It does not change carousel content, routes, booking logic or Firebase data.

- Local enablement: set `VITE_CHRISTMAS_THEME_ENABLED=true` in `.env.local`, then restart `npm run dev`.
- Local disablement: set the value to `false` (or remove it), then restart the development server.
- GitHub Pages: create or update the repository variable `VITE_CHRISTMAS_THEME_ENABLED`, push or rerun the Pages workflow, and allow the site to rebuild and redeploy. Use `true` to enable it and `false` to restore the standard homepage.
- Campaign wording and links live in `src/components/seasonal/christmasTheme.ts`; reusable campaign components and styles live beside it in `src/components/seasonal/`.
- Optimized decorative assets live in `public/seasonal/`. They are decorative only and never replace carousel media.

To remove the campaign permanently, first set the variable to `false` and deploy. The seasonal component directory and `public/seasonal/` assets can then be removed together with their two imports in `Home.tsx`/`main.tsx` and the optional `christmasTheme` prop in `CareLoop.tsx`. Run `npm test` and `npm run build` before redeploying.

## Verification

```bash
npm run lint
npm run test
npm run test:functions
npm run test:functions:emulator
npm run test:rules
npm run test:e2e
npm run build
npm run build:functions
```

Java 21 is required for Firestore emulator tests. Production Functions require the Firebase Blaze plan; budget alerts and Artifact Registry cleanup are documented before deployment.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Firebase setup](docs/FIREBASE_SETUP.md)
- [Paystack setup](docs/PAYSTACK_SETUP.md)
- [Paystack Storefront setup](docs/PAYSTACK_STOREFRONT_SETUP.md)
- [Manual setup and handover](docs/MANUAL_SETUP_AND_HANDOVER.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Gallery workflow](docs/GALLERY_WORKFLOW.md)
- [GitHub Pages deployment](docs/GITHUB_PAGES_DEPLOYMENT.md)
