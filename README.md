# Tamlois Naturals & Trichology Clinic

A production-oriented React website and appointment application for **Tamlois Natural & More | Tamlois Trichology Clinic**. It includes the public marketing site, concern education, services and packages, a Shopify-ready demo shop, end-to-end booking, a working demo admin area, Firebase integration boundaries, tests, and GitHub Pages deployment.

All prices, durations, policies, testimonials, result stories, contact details and media are explicitly placeholder content until the clinic confirms them.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Firebase modular SDK and Cloud Functions, React Hook Form, Zod, date-fns, Lucide, Vitest, React Testing Library and Playwright.

## Local setup

```bash
npm install
npm run dev
```

Open the URL Vite prints. Hash routing keeps deep links compatible with GitHub Pages.

## Demo admin

- Route: `/#/admin/login`
- Email: `owner@tamlois.demo`
- Password: `demo1234`

Demo changes and bookings remain in the current browser's local storage. They are not sent to the real clinic. Public booking is guest-only: there is no customer login, account, cart, promo-code, location or first-time/returning-client step.

## Guest booking flow

Policy acknowledgement precedes a seven-step flow: Category → Service → Extras → Schedule → Details → Summary → Payment. The draft survives refresh in the current tab, compatible extras update duration and price, schedule selection creates a 15-minute demo hold, and the final booking snapshots the chosen service, extras, address, preparation, policy version and payment breakdown.

The demo payment provider supports full payment, a 50% deposit, pay-at-clinic, and deterministic failure/retry. It never collects card data. Live Paystack and photo uploads remain off by default. When Firebase mode is enabled, the browser uses the included privileged booking API and cannot write booking or payment records directly.

## Verification

```bash
npm run test
npm run test:e2e
npm run build
npm --prefix functions run build
```

## Configuration status

- Firebase: client adapters, restrictive rules and a deployable booking API are included; project credentials and deployment are not configured in the repository.
- Authentication: demo session works; Firebase Email/Password and admin-claim checks are implemented and await project credentials.
- Payments: deterministic mock in demo mode; the included Cloud Function initializes and independently verifies Paystack payments and validates signed webhooks in live mode. `PAYSTACK_SECRET_KEY` is a Firebase secret and never a `VITE_` variable.
- Notifications: mock only. A server-side email adapter is required.
- Commerce: complete demo catalogue plus an environment-selected Shopify Storefront collection and cart adapter.
- Analytics: typed event adapter logs in development. Add the production provider later.
- Logo: the source image described in the brief was not included in the accessible attachments. A temporary `T` favicon and text mark are used.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Firebase setup](docs/FIREBASE_SETUP.md)
- [Shopify setup](docs/SHOPIFY_SETUP.md)
- [GitHub Pages deployment](docs/GITHUB_PAGES_DEPLOYMENT.md)
- [Manual setup and handover](docs/MANUAL_SETUP_AND_HANDOVER.md)
