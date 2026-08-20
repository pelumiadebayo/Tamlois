---
version: 1
slug: "src-pages-booking-tsx"
primary_target: "src/pages/Booking.tsx"
related_targets:
  [
    "src/lib/availability.ts",
    "src/repositories/bookingSessionRepository.ts",
    "src/styles.css",
  ]
---

## Purpose

The guest booking flow must make the difference between Salon capacity and Trichology appointment precision obvious without adding an account, location or client-status gate.

## Salon schedule

Use a true monthly calendar. Every in-range date cell shows the combined number of remaining Salon spaces. Selecting a date opens an accessible modal on desktop and a bottom sheet on mobile with Morning Session (9:00 a.m.–12:00 p.m.), Afternoon Session (12:00 p.m.–3:00 p.m.) and Evening Session (3:00 p.m.–6:00 p.m.). Each session has capacity three, displays its current remaining count, and cannot be selected when full, blocked or outside booking notice rules.

## Trichology schedule

Keep the duration-aware start-time calculator and exact interval buttons. Never translate Trichology care into shared three-hour sessions.

## State and trust

Revalidate capacity before creating the checkout hold. Active bookings and holds reduce availability; cancelled and expired bookings do not. Selected dates and sessions must remain clear in the persistent summary. Seed Salon services are visibly marked as demo placeholder content and must not be presented as confirmed clinic inventory.

The main-service picker contains exactly Scalp analysis, Trichology consultation, Scalp therapy and Hair-loss management for Trichology, plus Hair treatments and Natural hair care for Salon. Generic booking starts at Category. A Care Loop category deep link still shows policy acknowledgement first, then opens Service directly with only the known category’s cards.

## Responsive and accessible behavior

Calendar cells retain an accessible full-date/count label while mobile uses compact visible counts. The session surface traps focus through the native dialog, closes with Escape or its labelled close button, uses proper disabled states and keeps every action at least 42px high. Use Tamlois forest greens, light green and paper surfaces; do not inherit reference-site branding.
