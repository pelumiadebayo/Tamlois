# Architecture

## Booking domain

The booking client owns only anonymous, temporary workflow state. `BookingDraft` is kept in session storage, expires after 24 hours, and `BookingHold` is modelled locally for the demo. In Firebase mode, `functions/src/index.ts` exposes secure routes for atomic hold creation/release, booking submission, Paystack initialisation, server-side verification and signed webhook processing.

The canonical Firestore collections are `services`, `serviceExtras`, `serviceIntakeSchemas`, `businessSettings`, `bookingPolicies`, `blockedPeriods`, `bookingHolds`, `bookings`, `bookingIntakeResponses`, `payments`, `paymentEvents`, `notifications`, and `auditLogs`. Final bookings snapshot the service, extras, address, policy version, deposit calculation and preparation guidance so future catalogue edits do not rewrite historical records.

Guest management must use an unguessable management token through a rate-limited backend. There is intentionally no public lookup by reference, email or phone and no customer-auth route.

## Application shape

`src/App.tsx` owns lazy route boundaries. Public pages render inside the shared header/footer layout, while admin pages use a separate protected operational shell. `HashRouter` prevents GitHub Pages refresh failures.

The application has three layers:

1. **UI and routes** in `src/pages` and `src/components`.
2. **Domain logic and adapters** in `src/lib`.
3. **Data access** in `src/repositories`.

UI components do not make privileged Firestore writes. Demo repositories use local storage; Firebase configuration repositories implement the same typed read contract, while bookings and holds go through `HttpBookingGateway`.

## Booking availability

Available times are computed, not stored. `getAvailableSlots` combines administrator-managed operating hours, closed days, service duration, booking interval, buffer time, minimum notice, advance window, full-day blocks, partial blocks and active bookings. Demo values persist locally; Firebase mode reads a public-safe `businessSettings/public` document while block reasons remain in the admin-only collection.

In demo mode the browser revalidates availability and creates local interval locks. In Firebase mode the public-safe availability route returns only currently free start times. The server reloads service, extras and public settings, rejects past, closed, blocked, off-grid, short-notice and over-advance requests, recomputes duration and price, then atomically claims deterministic interval documents for the appointment plus buffer. Release is transactionally session-owned and cannot delete converted booking locks. Booking submission revalidates the active policy bundle and required conditional intake, independently verifies Paystack when payment is due, creates the booking, and converts every lock in one transaction. App Check can be enforced and a persistent per-origin/IP quota protects the public routes.

## Providers

- Payments: deterministic demo handling plus the `bookingApi` and `paystackWebhook` Cloud Functions.
- Notifications: `MockNotificationProvider` and a production interface.
- Commerce: `MockCommerceProvider` and an environment-selected Shopify Storefront API collection/cart provider.
- Analytics: typed `AnalyticsProvider` and development console implementation.

No secret key belongs in Vite variables because all `VITE_*` values are included in the browser bundle.

## Data collections

`services`, `serviceExtras`, `serviceIntakeSchemas`, `bookingPolicies`, `businessSettings`, `blockedPeriods`, `bookingHolds`, `bookings`, `bookingIntakeResponses`, `payments`, `paymentEvents`, `notifications`, `faqs`, `testimonials`, `results`, `content`, `leads`, `enquiries`, `productsCache`, and `auditLogs`.

## SEO and hosting limits

Titles, descriptions, canonical URLs, Open Graph data, JSON-LD, robots and a generated sitemap are included. GitHub Pages still serves a client-rendered SPA. For stronger organic search, migrate to prerendering or an SSR-capable host while preserving current slugs.
