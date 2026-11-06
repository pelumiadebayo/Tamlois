# Tamlois design system

## Design direction

Tamlois uses a calm editorial-clinic visual language: dignified serif statements, practical sans-serif interfaces, direct natural-hair imagery, generous spacing and ruled structure. Colour communicates purpose before decoration. Care remains green-led; commerce is terracotta-led; peach and rose create warm product and editorial fields; sage supports education and reassurance.

Public pages use design variance 6, motion intensity 3 and visual density 3. Admin pages use the same tokens at density 6. Booking stays especially restrained so policy, availability, price and confirmation states remain unambiguous.

## Official palette and semantic roles

All source values live in `src/styles.css`. Components should consume semantic tokens, not repeat hex values.

| Token | Value | Role |
| --- | --- | --- |
| `--color-brand-primary` | `#174B35` | Primary booking actions, selected care states, identity |
| `--color-brand-deep` | `#0C3022` | Strong headings, footer and inverse closing sections |
| `--color-commerce-primary` | `#A95035` | Buy, storefront, product-sync and selected commerce actions |
| `--color-accent-ochre` | `#D6A23E` | Focus rings, small highlights and featured badges only |
| `--color-surface-product` | `#F0C8B5` | Product-led hero and feature fields |
| `--color-surface-editorial` | `#E7C9CC` | Gallery, founder and story-led sections |
| `--color-surface-botanical` | `#DCE8DD` | Education, reassurance, booking summaries and care paths |
| `--color-surface-page` | `#FAF8F2` | Default page canvas |
| `--color-surface-raised` | `#FFFFFF` | Forms, records and focused cards |
| `--color-text-strong` | `#29342F` | Body text and operational labels |
| `--color-text-muted` | `#68746E` | Secondary copy and metadata |
| `--color-border` | `#C5D2C9` | Rules, fields and quiet separation |
| `--color-border-interactive` | `#87988E` | 3:1 control boundaries on white |

State colours for errors, warnings, disabled controls, overlays and shadows are also centralized in `src/styles.css`. Legacy `--forest-*`, `--paper`, `--cream`, `--ink`, `--muted`, `--line`, `--warm` and `--danger` names remain compatibility aliases while older components migrate.

Tailwind v4 theme aliases are available as `tamlois-primary`, `tamlois-deep`, `tamlois-commerce`, `tamlois-ochre`, `tamlois-peach`, `tamlois-rose`, `tamlois-sage`, `tamlois-ivory`, `tamlois-charcoal`, `tamlois-muted` and `tamlois-border`.

## Colour rules

- Use forest green for clinic care, booking, saving and selected service states.
- Use terracotta for purchasing, storefront links, product synchronization and commerce filters.
- Use ochre only for focus, featured status and small emphasis. Never use ochre text on ivory or white.
- Use peach as a field behind products, not as body text or a default button colour.
- Use rose for galleries, founder stories and consent-aware editorial content.
- Use sage for education, care paths, booking summaries and reassuring notices.
- Use deep forest with ivory or white text for footer and decisive closing calls to action.
- Do not introduce gradients, decorative blobs, glass effects or unassigned accent colours.

## Typography

- DM Serif Display: page promises, route introductions and major section headings.
- Manrope: navigation, body, forms, prices, metadata, buttons and all admin UI.
- Keep body copy near 62 characters where practical. Display text uses tight, non-clipping line-height and balanced wrapping.
- Serif type never appears inside controls, tables, prices or dense operations.

## Layout, shape and depth

- Main shell: maximum 1240px with responsive 1rem gutters.
- Major public section rhythm: 64-120px.
- Content surfaces and image crops: 14px radius.
- Inputs and notices: 12px radius.
- Buttons, statuses and compact icon actions: pill or circle.
- Resting content is flat. Use borders, spacing and semantic section fields before shadow.
- Shadows are reserved for physical overlap: the Care Loop note, dialog, sheet or sticky overlay.
- Avoid nested cards. One border should contain one task or record.

## Buttons and interaction states

- `.btn-primary`: forest fill, white text; booking, saving and the preferred care action.
- `.btn-commerce`: terracotta fill, white text; purchasing and product operations.
- `.btn-secondary`: transparent, forest border; alternatives and reversible actions.
- `.btn-quiet`: text-forward tertiary action.
- Minimum control height is 48px. Press feedback uses `scale(.97)`.
- Keyboard focus uses a 3px ochre outline with 3px offset. Hover and pressed colours use the centralized state tokens.
- Selected booking choices use forest and sage; selected commerce controls use terracotta.
- Every state must remain understandable without colour alone through labels, icons, borders or `aria` state.

## Section rhythm

Use the semantic section classes deliberately:

- `.section-page`: default ivory narrative surface.
- `.section-raised`: focused white information surface.
- `.section-botanical`: education, reassurance and care pathways.
- `.section-product`: product discovery and shopping entry points.
- `.section-editorial`: gallery, founder and story-led content.
- `.section-inverse`: deep-forest closing or process section with ivory text.

The homepage sequence intentionally moves through ivory hero, sage care paths, peach products, white concerns, ivory services, deep-green process, rose founder story, white results, sage questions and deep-green close. Do not mechanically alternate colours without a content role.

## Component guidance

### Header and footer

The sticky header uses translucent ivory and a terracotta active underline while retaining forest navigation text and booking action. The mobile menu uses solid ivory. The footer is deep forest with ivory/white text; ochre appears only as hover emphasis.

### Care Loop

The stable promise and route order remain Salon, Trichology, Products, Gallery. Product stages use peach and terracotta commerce actions; gallery stages use rose; care stages use green/sage. Autoplay, pause, keyboard movement, swipe and reduced-motion behavior must not change when restyling.

### Cards

Service cards use white task surfaces and green booking actions. Product cards use white panels on peach/ivory fields, terracotta buy actions and ochre featured badges. Gallery records sit on rose fields and retain provenance/consent labels.

### Booking

Booking is calm and operational: ivory canvas, white tasks, sage summaries, forest selection and ochre keyboard focus. Peach and rose are not booking selection colours. Error, unavailable, held and confirmed states must include explicit text.

### Admin

Admin uses a quiet neutral-sage canvas, white work surfaces and the same forest navigation. Product sync/import surfaces may use terracotta for the primary commerce action; other operational actions remain forest. Admin controls prioritize density and clarity over editorial expression.

## Accessibility and contrast

Approved core pairings:

- white or ivory on forest and deep forest;
- white on terracotta;
- deep forest or charcoal on peach, rose, sage, ivory and white;
- muted sage-grey for secondary text on ivory/white at normal body sizes;
- charcoal text on ochre badges.

Do not use terracotta or ochre for small body text on ivory without checking contrast. Do not use colour as the only selected, error or availability signal. Preserve visible focus, 48px touch targets, semantic landmarks, labelled forms, reduced motion and accessible dialogs.

## QA checklist

Before merging visual changes:

1. Run `npm run lint`, `npm test` and `npm run build`.
2. Verify home, services, concerns, shop, gallery, booking and admin at 390px, 768px, 1024px and 1440px where practical.
3. Check keyboard focus, mobile menu, Care Loop play/pause/next, product links, booking selections, dialogs and admin forms.
4. Confirm text contrast and that selected/error states have a non-colour cue.
5. Capture representative desktop and mobile screenshots in `.impeccable/review/` for visual review.
