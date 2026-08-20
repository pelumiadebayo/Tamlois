---
version: 1
slug: "src-pages-home-tsx"
primary_target: "src/pages/Home.tsx"
related_targets:
  [
    "src/components/CareLoop.tsx",
    "src/pages/Gallery.tsx",
    "src/pages/Admin.tsx",
  ]
---

## Purpose

The homepage should explain Tamlois as one connected care ecosystem, then help a guest choose between clinical scalp/hair-loss support and professional natural-hair care without needing service vocabulary.

## Stable first view

Keep the H1 “Understand your scalp. Care for your hair with confidence.” and its short description persistent. Present the four Care Loop offerings in this exact order: Salon, Trichology, Products, Gallery. Natural Hair Salon is the default opening offering.

## Interaction

Desktop uses a viewport-contained asymmetric editorial layout with changing media/copy/CTAs and 6.5-second autoplay. Keep the active primary and secondary actions in the stable left editorial column. The right stage is a full-height image with a compact translucent active-offering card at the bottom-right; this card occupies well under half the image and includes a compact icon link to the offering’s primary action. Use a calendar for Trichology and Salon booking, a shopping bag for Products, and an outward arrow for Gallery. Resolve the bundled woven natural-hair image through the deployed Vite base path so it works at `/Tamlois/`. The control row contains only an icon-only Pause/Play control and a separate next-offering arrow; give both the same quiet transparent outline treatment and do not show a numeric position. Clicking next advances immediately and resumes autoplay. Do not show the four-item offering rail on desktop; the active title, description, and CTAs must remain visible without scrolling at a 1366 × 768 viewport. Pause for hover, focus, hidden tabs, and the user-controlled pause button. Mobile also autoplays every 6.5 seconds, keeps the compact promise and active stage together in the landing viewport, retains the horizontally scrolling selector, and permits touch swipe changes. Reduced motion remains manual and uses only a short crossfade.

## Conversion

Trichology and Salon primary CTAs deep-link to booking with the correct category; after the mandatory policy gate, booking must skip Category and open directly on the matching Service cards. Secondary CTAs filter the service catalogue. Products goes to `/shop`; Gallery goes to `/gallery`. The two-path decision section immediately follows the Care Loop.

## Trust and content

All temporary photography must be visibly labelled as licensed placeholder imagery and must not imply verified client outcomes. Gallery client-result records require explicit consent confirmation. Core Care Loop and gallery fields remain typed and admin-editable.
