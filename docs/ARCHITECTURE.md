# Architecture

## Booking domain

The booking client owns only anonymous, temporary workflow state. `BookingDraft` is kept in session storage, expires after 24 hours, and `BookingHold` is modelled locally for the demo. In Firebase mode, `functions/src/index.ts` exposes secure routes for atomic hold creation/release, booking submission, Paystack initialisation, server-side verification and signed webhook processing.

The canonical Firestore collections are `services`, `serviceExtras`, `serviceIntakeSchemas`, `businessSettings`, `bookingPolicies`, `blockedPeriods`, `bookingHolds`, `bookings`, `bookingIntakeResponses`, `payments`, `paymentEvents`, `notifications`, `homeOfferings`, `gallery`, and `auditLogs`. Final bookings snapshot the service, extras, address, policy version, deposit calculation and preparation guidance so future catalogue edits do not rewrite historical records.

Guest management must use an unguessable management token through a rate-limited backend. There is intentionally no public lookup by reference, email or phone and no customer-auth route.

## Application shape

`src/App.tsx` owns lazy route boundaries. Public pages render inside the shared header/footer layout, while admin pages use a separate protected operational shell. `HashRouter` prevents GitHub Pages refresh failures.

The application has three layers:

1. **UI and routes** in `src/pages` and `src/components`.
2. **Domain logic and adapters** in `src/lib`.
3. **Data access** in `src/repositories`.

UI components do not make privileged Firestore writes. Demo repositories use local storage; Firebase configuration repositories implement the same typed read contract, while bookings and holds go through `HttpBookingGateway`.

`CareLoop` receives sorted active `HomeOffering` records from `homeContentRepository`; it owns only presentation state, autoplay and input handling. Manual selection stops autoplay, while reduced-motion and mobile media queries keep the experience manual from the start. `Gallery` consumes active `GalleryItem` records through the same repository boundary. Firestore permits public reads of active records but reserves writes for admins, including a rule-level consent check when a gallery item is marked as a client result.

## Booking availability

Available times are computed, not stored. Trichology uses `getAvailableSlots`, which combines administrator-managed operating hours, closed days, service duration, booking interval, buffer time, minimum notice, advance window, full-day blocks, partial blocks and active bookings. Salon uses `getSalonSessionAvailability`: fixed 9:00–12:00, 12:00–15:00 and 15:00–18:00 sessions each expose three capacity spaces, subtract matching active bookings and checkout holds, and roll the result into the monthly calendar's per-day count. Demo values persist locally; Firebase mode reads a public-safe `businessSettings/public` document while block reasons remain in the admin-only collection.

In demo mode the browser revalidates availability and creates local locks. In Firebase mode the public-safe availability route returns exact Trichology start times or Salon session counts. The server reloads service, extras and public settings, rejects past, closed, blocked, off-grid, short-notice and over-advance requests, and recomputes duration and price. Trichology atomically claims deterministic interval documents for the appointment plus buffer; Salon atomically claims one of three deterministic capacity documents for the selected session. Release is transactionally session-owned and cannot delete converted booking locks. Booking submission revalidates the active policy bundle and the required full name, phone and email, accepts optional conditional intake, independently verifies Paystack when payment is due, creates the booking, and converts every lock in one transaction. App Check can be enforced and a persistent per-origin/IP quota protects the public routes.

## Providers

- Payments: deterministic demo handling plus the `bookingApi` and `paystackWebhook` Cloud Functions.
- Notifications: `MockNotificationProvider` and a production interface.
- Commerce: `MockCommerceProvider` and an environment-selected Shopify Storefront API collection/cart provider.
- Analytics: typed `AnalyticsProvider` and development console implementation.

No secret key belongs in Vite variables because all `VITE_*` values are included in the browser bundle.

## Data collections

`services`, `serviceExtras`, `serviceIntakeSchemas`, `bookingPolicies`, `businessSettings`, `blockedPeriods`, `bookingHolds`, `bookings`, `bookingIntakeResponses`, `payments`, `paymentEvents`, `notifications`, `homeOfferings`, `gallery`, `faqs`, `testimonials`, `results`, `content`, `leads`, `enquiries`, `productsCache`, and `auditLogs`.

## SEO and hosting limits

Titles, descriptions, canonical URLs, Open Graph data, JSON-LD, robots and a generated sitemap are included. GitHub Pages still serves a client-rendered SPA. For stronger organic search, migrate to prerendering or an SSR-capable host while preserving current slugs.
