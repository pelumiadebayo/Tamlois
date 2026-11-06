---
name: "Tamlois Naturals & Trichology Clinic"
description: "A calm, trust-first natural-hair clinic expressed as an editorial care ledger."
colors:
  brand-primary: "#174b35"
  brand-deep: "#0c3022"
  commerce-primary: "#a95035"
  commerce-hover: "#8d412d"
  commerce-pressed: "#713223"
  accent-ochre: "#d6a23e"
  surface-product: "#f0c8b5"
  surface-editorial: "#e7c9cc"
  surface-botanical: "#dce8dd"
  surface-botanical-soft: "color-mix(in srgb, #dce8dd 58%, #faf8f2)"
  surface-page: "#faf8f2"
  surface-raised: "#ffffff"
  surface-admin: "#f4f6f3"
  text-strong: "#29342f"
  text-muted: "#68746e"
  border-subtle: "#c5d2c9"
  border-interactive: "#87988e"
  state-error: "#8f302f"
  state-error-surface: "#fff0ec"
  state-warning: "#713f1b"
  state-warning-surface: "#fff0df"
  text-disabled: "#8d9992"
  surface-disabled: "#f1f3ef"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(3.2rem, 7vw, 6.3rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(2.65rem, 7vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  title:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(2.15rem, 5vw, 4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  sm: "8px"
  control: "12px"
  surface: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  content: "20px"
  panel: "32px"
  shell-gutter: "1rem"
  section: "clamp(4rem, 8vw, 7.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
  button-commerce:
    backgroundColor: "{colors.commerce-primary}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "48px"
  button-commerce-hover:
    backgroundColor: "{colors.commerce-hover}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
  button-commerce-active:
    backgroundColor: "{colors.commerce-pressed}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-botanical-soft}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.pill}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.pill}"
    padding: "12px 4.8px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.control}"
    padding: "11.5px 13.6px"
    height: "48px"
  surface:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.surface}"
  status:
    backgroundColor: "{colors.surface-botanical}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.pill}"
    padding: "3.2px 9.92px"
    height: "28px"
  selection-panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.surface}"
    padding: "17.6px"
    height: "48px"
  selection-panel-selected:
    backgroundColor: "{colors.surface-botanical-soft}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.surface}"
  time-slot:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.control}"
    height: "48px"
  time-slot-selected:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
  notice-info:
    backgroundColor: "{colors.surface-botanical-soft}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.control}"
    padding: "16px"
  notice-error:
    backgroundColor: "{colors.state-error-surface}"
    textColor: "{colors.state-error}"
    rounded: "{rounded.control}"
    padding: "16px"
  notice-warm:
    backgroundColor: "{colors.state-warning-surface}"
    textColor: "{colors.state-warning}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Tamlois Naturals & Trichology Clinic

## Overview

**Creative North Star: "The Calm Care Ledger"**

Tamlois feels like an appointment ledger prepared by a thoughtful clinic: calm enough to lower anxiety, ordered enough to inspire trust, and human enough to welcome questions. Editorial serif statements explain the purpose of care while compact sans-serif controls make each next step practical and unambiguous.

The visual world is natural without becoming rustic. Official forest greens carry care and trust; terracotta distinguishes commerce without displacing the clinic; peach, rose, sage, ivory, and crisp white establish a deliberate editorial rhythm. Fine ruled dividers and direct portraiture keep the atmosphere composed. Public pages breathe generously; booking and admin surfaces increase density while using a deliberately narrower subset of the same system.

Depth is restrained and motion is purposeful. The system relies on tone, rules, spacing, and typography before shadow; movement is brief feedback rather than spectacle. It rejects gradients, glassmorphism, ornamental wellness clichés, excessive decoration, and nested-card clutter.

**Key Characteristics:**

- Trust-first, calm, credible, and welcoming.
- Editorial reassurance paired with operational clarity.
- Forest-led care, terracotta-led commerce, and semantic peach, rose, sage, ivory, and white fields.
- Flat ledger structures with selective 12-14px rounding and pill actions.
- Direct, consent-aware imagery centred on Black women and textured natural hair.
- Stable editorial promises paired with manually controllable, state-changing care routes.

## Colors

The palette combines botanical authority with warm editorial fields. Forest owns brand and care, terracotta owns commerce, and ochre remains a scarce focus or highlight signal; peach, rose, sage, ivory, and white organize content by meaning rather than decoration.

### Primary

- **Clinic Forest** (`brand-primary`): The official care and brand color for booking, saving, selected care controls, meaningful links, progress, and important icons.
- **Deep Consultation Forest** (`brand-deep`): Major headings, navigation text, decisive inverse sections, and the dark footer.
- **Quiet Botanical** (`surface-botanical`, `surface-botanical-soft`): Education, reassurance, care paths, booking summaries, and selected care backgrounds.

### Secondary

- **Commerce Terracotta** (`commerce-primary`, `commerce-hover`, `commerce-pressed`): Buy actions, storefront entry, product filters, and product operations. It creates a recognisable shop path while clinic and booking actions remain green.
- **Product Peach** (`surface-product`): Product-led feature fields, shop introductions, and promotional product panels; pair it with dark forest or charcoal text.
- **Editorial Rose** (`surface-editorial`): Gallery, founder, client-story, and consent-aware editorial fields; keep it restrained and professional.

### Tertiary

- **Sunlit Ochre** (`accent-ochre`): A scarce keyboard-focus ring, featured badge, small icon, underline, or editorial highlight. It is not a normal action fill or small text color.
- **Clinical Danger** (`state-error`, `state-error-surface`): Validation and destructive meaning only.
- **Warm Notice Field** (`state-warning`, `state-warning-surface`): Policy provenance, changed-choice notices, review states, and expiring holds.

### Neutral

- **Warm Ivory** (`surface-page`): The default page canvas and translucent navigation base.
- **Working White** (`surface-raised`): Forms, records, focused cards, and inverse button text.
- **Quiet Admin Canvas** (`surface-admin`): Dense admin backgrounds behind white work surfaces.
- **Soft Charcoal** (`text-strong`): Primary body and operational copy; avoid pure black.
- **Sage Grey** (`text-muted`): Supporting explanation, captions, and metadata where contrast remains sufficient.
- **Subtle Sage Border** (`border-subtle`): Non-interactive rules, dividers, card edges, and progress rails.
- **Interactive Sage Border** (`border-interactive`): The firmer control boundary for white inputs, selects, and button-like choices; it preserves visible non-text contrast before focus.
- **Disabled Pair** (`text-disabled`, `surface-disabled`): Explicit disabled control treatment that stays legible without relying on arbitrary opacity alone.

### Named Rules

**The Forest Is Structural Rule.** Use deep green for identity, hierarchy, selection, and the next safe action; do not scatter it as decoration.

**The Care and Commerce Rule.** Care, booking, saving, and general primary actions use forest; buying, storefront navigation, product filtering, and product operations use terracotta. A screen still has one obvious primary action.

**The Warm Note Rule.** Ochre appears only for visible focus, featured status, or a small editorial highlight; never use it as ordinary body text on a light field.

**The Semantic Field Rule.** Use peach for products, rose for editorial and gallery content, sage for education and reassurance, ivory for the page canvas, and white for focused work. Do not alternate fields mechanically.

## Typography

**Display Font:** DM Serif Display (with Georgia and serif fallbacks)  
**Body Font:** Manrope (with UI sans-serif and system fallbacks)

**Character:** DM Serif Display gives care language editorial dignity and softness; Manrope keeps navigation, forms, prices, metadata, and operations crisp. The contrast is deliberate: the serif reassures, the sans-serif helps people act.

### Hierarchy

- **Display** (400, fluid hero scale, 0.92 line-height): Homepage statements only; balance the wrap and keep the block broad enough to avoid a tall ribbon of words.
- **Headline** (400, fluid page scale, 0.98 line-height): Route introductions and confirmation moments.
- **Title** (400, fluid section scale, 1 line-height): Major section headings with a maximum measure near 760px.
- **Body** (400, 1rem base, 1.75 line-height): Educational and operational copy; long passages stay near 62ch.
- **Label** (700, 0.82rem, compact line-height): Form labels, categories, navigation, metadata, and state language; sentence case is preferred.

### Named Rules

**The Reassure, Then Operate Rule.** Serif type names the concern or promise; Manrope carries every instruction, value, control, and piece of evidence beneath it.

**The Serif Boundary Rule.** Never use display type inside fields, buttons, tables, prices, or dense admin controls.

## Layout

The system uses a centred shell capped at 1240px with 1rem gutters on each side. Public sections receive a fluid 64-120px vertical rhythm, allowing the long-form journey to read as a sequence of appointments and explanations instead of a dashboard. Page introductions use their own 56-104px vertical band and terminate in a ruled divider.

Desktop compositions pair unequal columns rather than defaulting to symmetrical cards: editorial copy sits beside photography, a ledger list, or a working panel. Repeated collections use two columns for service cards and three for concerns or products where room permits. White space and section-level background changes establish hierarchy before containers do.

The homepage Care Loop is a signature expression of that asymmetric grammar: stable positioning copy occupies the narrower editorial column while a minimum-520px media-and-copy stage carries the changing offering. Below 900px, including tablet portrait, the split stacks into one column: promise, active stage, actions, horizontal selector, then controls. The Gallery applies a dense 12-column editorial grid, allowing featured records to span eight columns beside four-column records before collapsing to one column below 900px.

Homepage color follows a content-led rhythm: ivory Care Loop, sage care paths, peach products, white concerns, sage services, deep-forest process, rose founder story, white results, sage questions, and a deep-forest close. This sequence is intentional but not a template for mechanically alternating every future page.

At 1024px, primary navigation collapses and the persistent booking summary becomes sticky beside the task. Below 900px the Care Loop stacks. At 768px, card media and content can sit side-by-side; below that point service cards stack, the six-step rail is replaced by a compact current-step line, and the booking summary becomes a collapsible details surface above the form. At 640px, field grids and desktop booking copy collapse while 48px controls, horizontally scrollable calendar dates, and short slot labels remain usable. Dense admin surfaces may add columns at wider breakpoints but retain the same shell and controls.

**The One Container Rule.** Prefer one surface around a complete task or record; divide its contents with rules and spacing instead of adding cards inside cards.

## Elevation & Depth

The system is flat by default. Ivory, sage, peach, rose, white, and deep forest create depth through semantic tonal layering; one-pixel rules provide structural separation. Subtle borders are for passive division, while the darker interactive border preserves visible control boundaries on white. Shadows are reserved for a surface that physically overlaps content, such as the appointment note over the hero image or a modal over the page, plus the Care Loop's singular editorial stage where media and copy behave as one changing object. Sticky navigation uses a lightly translucent ivory fill and restrained backdrop blur only to preserve legibility during scroll.

### Shadow Vocabulary

- **Hero Note** (`0 18px 55px rgba(12,48,34,.14)`): The small appointment note floating over hero photography.
- **Modal Lift** (`0 24px 80px rgba(12,48,34,.24)`): Dialog and bottom-sheet separation from a darkened page scrim.
- **Care Loop Stage** (`0 24px 70px rgba(12,48,34,.14)`): Diffuse separation for the single changing media-and-copy stage; the stacked form reduces this to `0 18px 48px rgba(12,48,34,.12)`.

### Named Rules

**The Flat Ledger Rule.** Resting content is separated by tone, a one-pixel rule, or spacing; shadow means physical overlap, not importance.

## Shapes

The form language is gently clinical rather than soft or bubbly. Working surfaces and image crops use a 14px radius; inputs, selections, notices, and the temporary brand tile use 12px; small utility surfaces may use 8px. Buttons, statuses, step markers, and icon actions are fully pill or circular. Fine borders remain visible on white surfaces and give the system its ruled-ledger precision.

Photography is clipped cleanly to 14px frames, except where it intentionally fills a hero or service-card edge. Cards do not receive extra shells, decorative notches, or mixed radii.

**The Radius Discipline Rule.** Use 12px for controls and 14px for content surfaces; reserve full pills for actions and compact status, not for large containers.

## Components

Components are restrained, tactile, and explicit. Every state should communicate whether the visitor is reading, choosing, or advancing.

### Buttons

- **Shape:** Fully pill-shaped with a 48px minimum height and compact horizontal padding.
- **Care Primary:** Clinic Forest fill with Working White text; use for booking, saving, selected care progression, and the preferred non-commerce action.
- **Commerce Primary:** Commerce Terracotta fill with Working White text; use for buying, storefront entry, product filters, and product synchronization. Hover and press darken through the dedicated commerce states.
- **Hover / Focus:** Care hover deepens to Deep Consultation Forest; press scales to 0.97. Every button uses the global three-pixel ochre focus ring with a three-pixel offset.
- **Secondary:** Transparent with a Clinic Forest border and dark green text; hover gains a Quiet Botanical fill.
- **Quiet:** Text-forward green action with minimal horizontal padding; use for back, cancel, and inline progression where a filled button would overstate the action.

### Chips

- **Style:** Compact 28px pills use Quiet Botanical with Deep Consultation Forest text and bold 0.72rem labels. Featured commerce badges use an ochre fill with deep-forest text.
- **State:** Status communicates mode, availability, or record state. Placeholder badges use an explicit warm treatment and label so they cannot be mistaken for verified clinic content.

### Cards / Containers

- **Corner Style:** Gently curved content surfaces (14px).
- **Background:** Working White for tasks and records; sage for care and reassurance; peach for product-led groupings; rose for gallery and editorial groupings.
- **Shadow Strategy:** Flat at rest; see the Flat Ledger Rule.
- **Border:** One-pixel Subtle Sage Border around passive surfaces; interactive choices and fields use the firmer Interactive Sage Border at rest.
- **Internal Padding:** Usually 20px on compact cards and 24-32px on major task panels.
- **Service Card:** Image and details share one border; metadata stays small, actions sit at the end, and no inner card frames are introduced.

### Inputs / Fields

- **Style:** Working White fill, the Interactive Sage Border as a visible one-pixel stroke, 12px radius, and 48px minimum height.
- **Focus:** Border shifts to Clinic Forest while the global three-pixel ochre focus-visible ring with three-pixel offset provides the keyboard indicator.
- **Error / Disabled:** Invalid fields set `aria-invalid`, reference a compact red-brown message immediately below the control, and repeat blocking form-level errors in a 12px notice. Disabled actions retain their form and drop to 55% opacity.

### Navigation

Desktop navigation sits in a 72px sticky translucent ivory bar. Manrope labels are small and semibold in Soft Charcoal; the active route shifts to Clinic Forest with a restrained terracotta underline while the dominant booking action stays Clinic Forest. At mobile widths, the booking action becomes a circular green icon button and navigation opens as a solid-ivory ruled list with 48px rows.

### Footer

The footer is a full Deep Consultation Forest surface with ivory or white text and low-contrast white rules. Links remain quiet at rest and use ochre only as a hover emphasis. The dark footer closes the public page rhythm; do not replace it with a pale commerce field.

### Operational Surfaces

Booking uses the restrained care subset: ivory canvas, white tasks, sage summaries and notices, forest selection and progression, ochre focus, and explicit error text. Peach and rose do not become booking selection colors. Admin uses a quiet neutral-sage canvas, white work surfaces, forest navigation and primary operations; only product sync, import, and other clearly commercial actions may use terracotta. Dense admin UI prioritizes scanability over the public site's full editorial color rhythm.

### Booking Progress

The six-step rail is a signature operational pattern: Category, Service, Schedule, Details, Summary, and Payment. A generic booking begins at Category. A Care Loop link carrying `category=salon` or `category=trichology` still presents policy acknowledgement first, then begins at Service with only that category’s canonical cards because the category decision is already known. Optional extras belong within Service, directly beneath the selected main service, and never receive a progress segment of their own. Each rail segment has a ruled baseline and a 32px circular marker; current and complete steps use Clinic Forest, while future steps use Quiet Botanical. Completed steps remain available and future steps remain disabled. Below 768px the rail disappears in favour of a concise “Step n of 6 — Label” line, avoiding an unreadable miniature tracker.

### Policy Gate

Booking begins with a dedicated consent stage before any clinic time can be reserved. Policy summaries sit in one scrollable, ruled 14px surface with expandable full text; acknowledgement sits in an inverse Deep Consultation Forest panel that becomes sticky on large screens. The action stays disabled until the checkbox is selected, and the recorded policy version remains visible in the later summary.

The booking catalogue exposes exactly six main services in canonical order: Scalp analysis, Trichology consultation, Scalp therapy, Hair-loss management, Hair treatments, and Natural hair care. Packages, inactive records, and internal demo-only services do not enter the main-service picker.

### Selection Panels

Category, service, extras, and payment choices reuse a full-width 14px panel with at least 48px height and 17.6px padding. Resting choices are white with an Interactive Sage Border; hover shifts the border to Clinic Forest. Selected choices add Quiet Botanical fill, a Clinic Forest border, and a one-pixel inset selection ring. Use radio or checkbox semantics where the choice belongs to a form; use `aria-pressed` for button-like category and service selection.

### Calendar & Time Slots

The date picker is a seven-column, horizontally scrollable grid with 12px day cells and a minimum 84px height. Each cell stacks weekday, date, and month; closed dates stay legible but disabled and struck through. Time slots use 48px, 12px controls in a responsive three-to-four-column grid. Selected dates and times invert to Clinic Forest with Working White text, and availability feedback occupies the adjacent panel rather than appearing as a detached toast.

### Hold Countdown & Notices

Once a schedule advances, an inline notice states that the slot is held and shows a tabular `mm:ss` countdown. The normal hold uses Quiet Botanical; the final two minutes switch to the warm notice field. Expiry or conflicts return the visitor to scheduling with an error notice. Information, warm, and error notices share a 12px radius, 16px padding, a compact icon, and explicit status or alert semantics.

### Booking Summary

The summary is persistent but adaptive. At 1024px and above it is a sticky pale-botanical aside with ruled label/value rows; below that breakpoint it becomes a collapsible white details surface above the task. Both versions show category, service, extras, schedule, duration, subtotal, amount due, and clinic address from the same content model. The dedicated review step adds edit links, policy version, preparation, and print/download actions without introducing a second visual language.

### Care Loop

The Care Loop is the homepage's signature editorial navigator. Its promise and introductory copy remain stable while media, offering label, headline, description, and actions change together. The canonical route order is **Salon, Trichology, Products, Gallery**; Salon is the default and the order does not change with imagery, campaign emphasis, or content availability. The Gallery route uses the bundled woven natural-hair image at `/gallery-image.jpg`.

Desktop uses an asymmetric split with a vertical, ruled, numbered rail (`01`–`04`) beside one 14px stage. The active row receives a pale botanical wash, dark text, and a two-pixel progress line; a visible position counter and Pause/Play control sit below. Arrow keys move through the roving selector. Care stages remain forest or sage-led, Products moves to peach with a terracotta commerce action, and Gallery moves to rose; the media-over-copy structure and action hierarchy remain stable.

Autoplay advances every 6.5 seconds on desktop and mobile. It pauses on hover where available, keyboard focus, hidden browser tabs, explicit pause, and after manual selection; Play or the next arrow restarts it. Mobile places the compact active stage within the landing viewport before a horizontally scrolling numbered selector and also permits deliberate swipe navigation. Focus, pause, and manual selection are behavioral states, not decorative animation triggers.

Image entry uses a 620ms `clip-path` reveal with slight blur and scale; copy enters over 520ms with opacity and a 10px rise. Both use the system ease-out curve. Reduced motion disables autoplay and progress animation, makes the selector manual, and reduces change feedback to a short 160ms opacity crossfade.

**The Stable Promise Rule.** The Care Loop may change evidence and routes, but never replace the page's core promise or force motion before the visitor can understand it.

**The Care Path Order Rule.** Salon, Trichology, Products, then Gallery is a trust and navigation invariant; preserve that sequence across desktop rail, mobile selector, keyboard movement, analytics, and admin ordering.

### Two-Path Decision

The clinical-versus-salon choice is a flat, tone-led decision section rather than a pair of floating cards. It uses one botanical-sage field, shared block rules, a single vertical divider on desktop, and equal editorial weight. Each path contains a small uppercase label, serif need statement, short explanation, one forest booking action, and one quiet exploration link. On mobile the divider becomes a horizontal rule and the paths remain in clinical-then-salon order.

### Gallery

Gallery records use an editorial image grid rather than uniform commerce tiles. Featured or every-third records span eight columns with 420px media; standard records span four columns with 320px media. All collapse to one column with a 4:3 image on mobile. Public filters are All, Trichology, Natural Hair, and Clinic in a horizontally scrollable ruled row with a two-pixel active underline; product records remain outside the public gallery.

Every temporary image carries an on-image **Licensed placeholder** badge. Page introduction and captions explicitly state that the imagery is not a verified Tamlois client result; future result media requires consent and honest context. Captions use an uppercase category, compact serif title, and an optional quiet route to related care.

### Care Ledger

Ordered care sequences use a single white, ruled 14px panel with generous row height and green circular numerals. The ledger line texture or explicit dividers should structure the reading path without creating a card per step.

### Motion

Ordinary state transitions use the project ease-out curve (`cubic-bezier(.23, 1, .32, 1)`) and stay between 150-200ms. Motion is limited to color, border, opacity, small translation, image scale, and short disclosure height. Product imagery may scale to 1.02 on hover; links may translate an arrow by 4px; hoverable items may lift by no more than 3px. The Care Loop is the deliberate exception: a 6.5-second reading interval drives 520-620ms transform, opacity, and clip-path transitions with explicit pause and manual control. Reduced motion removes autoplay and progress movement, leaving only a short crossfade.

**The One Obvious Next Step Rule.** Within a task or card, one action may be filled; alternatives remain outlined or quiet.

**The Reservation Integrity Rule.** Policy acknowledgement, selected care, slot hold status, expiry, amount due, and confirmation state must remain explicit; never imply that time or payment is secured before the system says so.

## Do's and Don'ts

### Do:

- **Do** begin with the concern a client recognises and pair reassurance with a concrete next action.
- **Do** use large serif headings against generous paper space, then switch to Manrope for every operational detail.
- **Do** group related steps inside one ruled surface and use tonal section fields to organise long pages.
- **Do** keep care, booking, saving, and general primary actions forest-led while reserving terracotta for commerce actions and product operations.
- **Do** assign peach to products, rose to editorial or gallery content, sage to education or reassurance, ivory to the canvas, and white to focused work.
- **Do** preserve the homepage's content-led rhythm of ivory, sage, peach, white, sage, deep forest, rose, white, sage, and a deep-forest close without turning it into mechanical striping.
- **Do** preserve 48px control heights, visible focus, clear selected states, and reduced-motion behavior.
- **Do** use the interactive sage boundary on white controls and reserve the lighter sage line for passive division.
- **Do** show policy version, slot-hold countdown, and confirmation state at the point where each affects the booking decision.
- **Do** keep the same booking summary available as a sticky desktop aside and a collapsible mobile surface.
- **Do** use direct, consent-aware imagery that primarily represents Black women and textured natural hair.
- **Do** label placeholder claims, prices, testimonials, contact details, and media visibly until verified.
- **Do** preserve Salon, Trichology, Products, Gallery as the Care Loop's canonical path order on every input and viewport.
- **Do** pause timed media when the visitor hovers, focuses, changes tabs, requests reduced motion, or selects a route manually.
- **Do** keep Gallery placeholder badges and non-result language visible until consented, contextual client media exists.

### Don't:

- **Don't** introduce gradients, glassmorphism, decorative blobs, floating ornaments, or generic spa motifs.
- **Don't** nest cards inside cards or place every paragraph in a rounded container.
- **Don't** use shadows on resting content; reserve them for true overlap such as notes, dialogs, and sheets.
- **Don't** use the serif for controls, admin density, metadata, or body-length instructions.
- **Don't** use terracotta for clinic booking, general care progression, destructive states, or unavailable states.
- **Don't** use peach or rose as booking selection colors or carry the full public editorial palette into dense admin work.
- **Don't** use ochre for normal body text or as a competing primary action color.
- **Don't** promise diagnosis, regrowth, guaranteed outcomes, or verification through visual styling.
- **Don't** present licensed stock, inspiration, or gallery imagery as a Tamlois client result.
