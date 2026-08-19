# Design system

## Design read

This is a calm, trust-first natural-hair clinic for clients who may be uncertain about what to book. The public site uses a modern clinic appointment-ledger language: ruled separators, clear care sequences, green paper-like surfaces and decisive photography. The admin uses the same tokens with greater density and less expression.

Public dials: design variance 6, motion intensity 3, visual density 3. Admin density is 6.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Deep forest | `#0d2d21` | headings, strongest surfaces |
| Logo-family green | `#174b35` | primary actions and identity pending logo extraction |
| Active green | `#1e6144` | links and focus-adjacent states |
| Botanical green | `#dce9df` | quiet surfaces |
| Paper | `#f7f8f3` | page background |
| Warm cream | `#f1efe4` | secondary surface only |
| Ink | `#202823` | body copy |
| Muted | `#647168` | secondary copy |
| Border | `#ccd5ce` | rules and fields |
| Warm accent | `#bd7a42` | focus and restrained status emphasis |

The source logo was unavailable, so the primary green must be rechecked against the real file before launch.

## Type

- DM Serif Display: hero and section headings only.
- Manrope: navigation, body, forms, labels, buttons and all admin UI.
- Body measure: approximately 62-70 characters.
- Display type uses tight but non-clipping line-height and never appears in operational fields.

Fonts are self-hosted by `@fontsource` and use `font-display: swap`.

## Shape, spacing and motion

- Content surfaces: 14px radius.
- Inputs: 12px radius.
- Buttons and compact statuses: pill shape.
- Major section space: 64-120px responsive.
- UI transitions stay under 200ms and animate only transform, opacity or color.
- Press feedback uses `scale(.97)`.
- Reduced-motion disables movement and keeps state changes immediate.

## Accessibility

The system includes a skip link, visible three-pixel focus ring, 48px controls, semantic landmarks, labelled forms, text status labels, responsive tables, accessible details elements and live booking feedback. Final content and media still require accessibility review after replacement.
