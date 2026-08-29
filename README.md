# Tamlois Naturals & Trichology Clinic

A React website, booking application and sole-owner administration area for Tamlois. Prices, policies, contact details and unconfirmed media remain placeholder content until the clinic approves them.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Firebase modular Web SDK, React Hook Form, Zod, date-fns, Lucide, Vitest, React Testing Library and Playwright.

## Local setup

```bash
npm install
npm run dev
```

Hash routing keeps deep links compatible with GitHub Pages. Demo mode uses browser-local fixtures. Firebase mode never falls back to demo data.

## Booking architecture

Policy acknowledgement precedes Category → Service → Schedule → Details → Summary → Payment. Policies are owner-created Firestore records with no seeded, hidden or archived state; booking remains closed until at least one exists. Each booking preserves the accepted policy titles, summaries and versions. Salon and Trichology Care Loop links retain the policy gate and skip the already-known category. Extras remain inside Service.

The ordinary schedule is typed source configuration: Africa/Lagos, Monday–Saturday, 09:00–18:00; Sunday closed. Salon has three three-hour sessions with capacity three. Trichology keeps duration-aware start times in 30-minute intervals.

In Firebase mode, an invisible Anonymous Authentication session owns each public booking. Availability reads only non-sensitive deterministic lock and operational-exception documents. Final confirmation runs a Firestore transaction that rechecks the active service, blocks, capacity override and every lock before atomically creating the private booking plus its lock(s). There are no temporary checkout holds and no production seed.

Salon lock IDs are `{date}_{sessionId}_seat-1` through `seat-3`. Trichology locks each required unit as `{date}_{HH-MM}`, including the configured buffer. Cancellation deletes future locks atomically; completion and no-show preserve historical occupancy.

Production Firebase booking is pay-at-clinic only. Real Paystack verification, webhooks and email delivery remain disabled because they require a trusted backend. The browser-only design prevents normal transaction races, but Security Rules cannot mathematically derive every consecutive Trichology lock from service duration; see [Architecture](docs/ARCHITECTURE.md).

## Admin authentication

Firebase Email/Password administration is restricted to the single configured owner UID. There is no public signup or customer-account UI, and another authenticated user is not an administrator. Firestore Rules are authoritative; the matching Vite UID is only routing feedback.

## Homepage and gallery

The Care Loop starts with Natural Hair Salon, followed by Trichology Care, Products and Gallery. Gallery uses optimized static WebP assets, typed metadata, responsive source sets and Load More. It has no Firebase collection, storage provider or admin editor. Follow [the gallery workflow](docs/GALLERY_WORKFLOW.md).

## Verification

```bash
npm run lint
npm run test
npm run test:rules
npm run test:e2e
npm run build
```

Java 21 is required for Firestore emulator tests. No Cloud Functions or billing account is required.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Firebase setup](docs/FIREBASE_SETUP.md)
- [Manual setup and handover](docs/MANUAL_SETUP_AND_HANDOVER.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Gallery workflow](docs/GALLERY_WORKFLOW.md)
- [GitHub Pages deployment](docs/GITHUB_PAGES_DEPLOYMENT.md)
- [Shopify setup](docs/SHOPIFY_SETUP.md)
