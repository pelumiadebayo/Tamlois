---
name: "Tamlois Naturals & Trichology Clinic"
description: "A calm, trust-first natural-hair clinic expressed as an editorial care ledger."
colors:
  forest-950: "#0d2d21"
  forest-900: "#123d2c"
  forest-800: "#174b35"
  forest-700: "#1e6144"
  forest-100: "#dce9df"
  forest-50: "#eef4ef"
  paper: "#f7f8f3"
  cream: "#f1efe4"
  white: "#ffffff"
  ink: "#202823"
  muted: "#647168"
  line: "#ccd5ce"
  warm: "#bd7a42"
  danger: "#a73535"
  field-border: "#aab7ae"
  error-bg: "#fff0ec"
  error-ink: "#7d3028"
  warm-bg: "#fff0df"
  warm-ink: "#713f1b"
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
    backgroundColor: "{colors.forest-800}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.forest-950}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.forest-50}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.pill}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.forest-800}"
    rounded: "{rounded.pill}"
    padding: "12px 4.8px"
    height: "44px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11.5px 13.6px"
    height: "48px"
  surface:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  status:
    backgroundColor: "{colors.forest-100}"
    textColor: "{colors.forest-950}"
    rounded: "{rounded.pill}"
    padding: "3.2px 9.92px"
    height: "28px"
  selection-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "17.6px"
    height: "48px"
  selection-panel-selected:
    backgroundColor: "{colors.forest-50}"
    textColor: "{colors.forest-950}"
    rounded: "{rounded.surface}"
  time-slot:
    backgroundColor: "{colors.white}"
    textColor: "{colors.forest-950}"
    rounded: "{rounded.control}"
    height: "48px"
  time-slot-selected:
    backgroundColor: "{colors.forest-800}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  notice-info:
    backgroundColor: "{colors.forest-50}"
    textColor: "{colors.forest-950}"
    rounded: "{rounded.control}"
    padding: "16px"
  notice-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-ink}"
    rounded: "{rounded.control}"
    padding: "16px"
  notice-warm:
    backgroundColor: "{colors.warm-bg}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Tamlois Naturals & Trichology Clinic

## Overview

**Creative North Star: "The Calm Care Ledger"**

Tamlois feels like an appointment ledger prepared by a thoughtful clinic: calm enough to lower anxiety, ordered enough to inspire trust, and human enough to welcome questions. Editorial serif statements explain the purpose of care while compact sans-serif controls make each next step practical and unambiguous.

The visual world is natural without becoming rustic. Deep forest ink, warm paper fields, crisp white working surfaces, fine ruled dividers, and direct portraiture create a composed clinic atmosphere. Public pages breathe generously; booking and admin surfaces increase density while preserving the same hierarchy and material language.

Depth is restrained and motion is purposeful. The system relies on tone, rules, spacing, and typography before shadow; movement is brief feedback rather than spectacle. It rejects gradients, glassmorphism, ornamental wellness clichés, excessive decoration, and nested-card clutter.

**Key Characteristics:**

- Trust-first, calm, credible, and welcoming.
- Editorial reassurance paired with operational clarity.
- Deep forest, paper, cream, and white surfaces separated by fine rules.
- Flat ledger structures with selective 12-14px rounding and pill actions.
- Direct, consent-aware imagery centred on Black women and textured natural hair.
- Stable editorial promises paired with manually controllable, state-changing care routes.

## Colors

The palette combines botanical authority with the quiet warmth of paper; green carries identity and action, while cream and pale green establish sections without visual noise.

### Primary

- **Clinic Forest** (`forest-800`): The principal identity and action color for primary buttons, selected controls, number markers, and compact brand fields.
- **Deep Consultation Forest** (`forest-950`): The strongest heading, announcement, selection, and inverse-surface tone.
- **Operating Forest** (`forest-700`): Links, category labels, active rules, icons, and focus-adjacent states.
- **Quiet Botanical** (`forest-100`, `forest-50`): Status fills, selection backgrounds, educational notices, and low-emphasis section fields.

### Secondary

- **Ledger Cream** (`cream`): A warm sectional surface for services, commerce, and the footer; it prevents long pages from becoming a stack of white cards.

### Tertiary

- **Consent Ochre** (`warm`): A scarce warm note for consent controls, placeholder provenance, and restrained status emphasis, not a competing call-to-action color.
- **Clinical Danger** (`danger`): Validation and destructive meaning only.
- **Warm Notice Field** (`warm-bg`, `warm-ink`): Policy provenance, changed-choice notices, and expiring holds.
- **Error Notice Field** (`error-bg`, `error-ink`): Blocking validation, failed payment, unavailable slots, and expired holds.

### Neutral

- **Clinic Paper** (`paper`): The default page canvas and translucent navigation base.
- **Working White** (`white`): Interactive fields, cards, ledger panels, and inverse buttons.
- **Soft Ink** (`ink`): Primary body and operational copy.
- **Sage Grey** (`muted`): Supporting explanation, metadata, and secondary copy.
- **Ruled Line** (`line`): Dividers, field strokes, card edges, and booking progress rails.
- **Field Stroke** (`field-border`): The slightly firmer default outline used by text inputs, selects, and text areas.

### Named Rules

**The Forest Is Structural Rule.** Use deep green for identity, hierarchy, selection, and the next safe action; do not scatter it as decoration.

**The Warm Note Rule.** Warm ochre appears only where provenance, consent, or caution needs a humane distinction from success and navigation states.

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

The homepage Care Loop is a signature expression of that asymmetric grammar: stable positioning copy occupies the narrower editorial column while a minimum-520px media-and-copy stage carries the changing offering. On mobile, a compact promise and active media stage share the landing viewport, followed by the offering selector and controls in one linear reading order. The Gallery applies a dense 12-column editorial grid, allowing featured records to span eight columns beside four-column records before collapsing to one column below 768px.

At 1024px, primary navigation collapses, the persistent booking summary becomes sticky beside the task, and major split layouts stack below that width. At 768px, card media and content can sit side-by-side; below that point service cards stack, the six-step rail is replaced by a compact current-step line, and the booking summary becomes a collapsible details surface above the form. At 640px, field grids and desktop booking copy collapse while 48px controls, horizontally scrollable calendar dates, and short slot labels remain usable. Dense admin surfaces may add columns at wider breakpoints but retain the same shell and controls.

**The One Container Rule.** Prefer one surface around a complete task or record; divide its contents with rules and spacing instead of adding cards inside cards.

## Elevation & Depth

The system is flat by default. Paper, cream, pale botanical, white, and deep forest create depth through tonal layering; one-pixel ruled borders provide structural separation. Shadows are reserved for a surface that physically overlaps content, such as the appointment note over the hero image or a modal over the page, plus the Care Loop's singular editorial stage where media and copy behave as one changing object. Sticky navigation uses a lightly translucent paper fill and restrained backdrop blur only to preserve legibility during scroll.

### Shadow Vocabulary

- **Hero Note** (`0 18px 55px rgba(13,45,33,.14)`): The small appointment note floating over hero photography.
- **Modal Lift** (`0 24px 80px rgba(13,45,33,.24)`): Dialog and bottom-sheet separation from a darkened page scrim.
- **Care Loop Stage** (`0 24px 70px rgba(13,45,33,.14)`): Diffuse separation for the single changing media-and-copy stage; mobile reduces this to `0 18px 48px rgba(13,45,33,.12)`.

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
- **Primary:** Clinic Forest fill with Working White text; use for booking, saving, buying, and the single preferred next action.
- **Hover / Focus:** Hover deepens to Deep Consultation Forest; press scales to 0.97. The global focus indicator is a 3px warm ring with a 3px offset.
- **Secondary:** Transparent with a Clinic Forest border and dark green text; hover gains a Quiet Botanical fill.
- **Quiet:** Text-forward green action with minimal horizontal padding; use for back, cancel, and inline progression where a filled button would overstate the action.

### Chips

- **Style:** Compact 28px pills use Quiet Botanical with Deep Consultation Forest text and bold 0.72rem labels.
- **State:** Status communicates mode, availability, or record state. Placeholder badges switch to a pale warm fill and brown text so they cannot be mistaken for verified clinic content.

### Cards / Containers

- **Corner Style:** Gently curved content surfaces (14px).
- **Background:** Working White for tasks and records; Quiet Botanical or Ledger Cream for grouped sections.
- **Shadow Strategy:** Flat at rest; see the Flat Ledger Rule.
- **Border:** One-pixel Ruled Line around working surfaces.
- **Internal Padding:** Usually 20px on compact cards and 24-32px on major task panels.
- **Service Card:** Image and details share one border; metadata stays small, actions sit at the end, and no inner card frames are introduced.

### Inputs / Fields

- **Style:** Working White fill, a muted green-grey one-pixel stroke, 12px radius, and 48px minimum height.
- **Focus:** Border shifts to Operating Forest with a three-pixel translucent green focus halo; the global warm focus-visible ring remains the keyboard fallback.
- **Error / Disabled:** Invalid fields set `aria-invalid`, reference a compact red-brown message immediately below the control, and repeat blocking form-level errors in a 12px notice. Disabled actions retain their form and drop to 55% opacity.

### Navigation

Desktop navigation sits in a 72px sticky paper bar. Manrope labels are small and semibold; the active route uses Clinic Forest plus a two-pixel underline offset from the text. At mobile widths, the booking action becomes a circular icon button and navigation opens as a ruled vertical list with 48px rows.

### Booking Progress

The six-step rail is a signature operational pattern: Category, Service, Schedule, Details, Summary, and Payment. A generic booking begins at Category. A Care Loop link carrying `category=salon` or `category=trichology` still presents policy acknowledgement first, then begins at Service with only that category’s canonical cards because the category decision is already known. Optional extras belong within Service, directly beneath the selected main service, and never receive a progress segment of their own. Each rail segment has a ruled baseline and a 32px circular marker; current and complete steps use Clinic Forest, while future steps use Quiet Botanical. Completed steps remain available and future steps remain disabled. Below 768px the rail disappears in favour of a concise “Step n of 6 — Label” line, avoiding an unreadable miniature tracker.

### Policy Gate

Booking begins with a dedicated consent stage before any clinic time can be reserved. Policy summaries sit in one scrollable, ruled 14px surface with expandable full text; acknowledgement sits in an inverse Deep Consultation Forest panel that becomes sticky on large screens. The action stays disabled until the checkbox is selected, and the recorded policy version remains visible in the later summary.

The booking catalogue exposes exactly six main services in canonical order: Scalp analysis, Trichology consultation, Scalp therapy, Hair-loss management, Hair treatments, and Natural hair care. Packages, inactive records, and internal demo-only services do not enter the main-service picker.

### Selection Panels

Category, service, extras, and payment choices reuse a full-width 14px panel with at least 48px height and 17.6px padding. Resting choices are white with a Ruled Line border; hover shifts the border to Operating Forest. Selected choices add Quiet Botanical fill, an Operating Forest border, and a one-pixel inset selection ring. Use radio or checkbox semantics where the choice belongs to a form; use `aria-pressed` for button-like category and service selection.

### Calendar & Time Slots

The date picker is a seven-column, horizontally scrollable grid with 12px day cells and a minimum 84px height. Each cell stacks weekday, date, and month; closed dates stay legible but disabled and struck through. Time slots use 48px, 12px controls in a responsive three-to-four-column grid. Selected dates and times invert to Clinic Forest with Working White text, and availability feedback occupies the adjacent panel rather than appearing as a detached toast.

### Hold Countdown & Notices

Once a schedule advances, an inline notice states that the slot is held and shows a tabular `mm:ss` countdown. The normal hold uses Quiet Botanical; the final two minutes switch to the warm notice field. Expiry or conflicts return the visitor to scheduling with an error notice. Information, warm, and error notices share a 12px radius, 16px padding, a compact icon, and explicit status or alert semantics.

### Booking Summary

The summary is persistent but adaptive. At 1024px and above it is a sticky pale-botanical aside with ruled label/value rows; below that breakpoint it becomes a collapsible white details surface above the task. Both versions show category, service, extras, schedule, duration, subtotal, amount due, and clinic address from the same content model. The dedicated review step adds edit links, policy version, preparation, and print/download actions without introducing a second visual language.

### Care Loop

The Care Loop is the homepage's signature editorial navigator. Its promise and introductory copy remain stable while media, offering label, headline, description, and actions change together. The canonical route order is **Salon, Trichology, Products, Gallery**; Salon is the default and the order does not change with imagery, campaign emphasis, or content availability. The Gallery route uses the bundled woven natural-hair image at `/gallery-image.jpg`.

Desktop uses an asymmetric split with a vertical, ruled, numbered rail (`01`–`04`) beside one 14px stage. The active row receives a pale botanical wash, dark text, and a two-pixel progress line; a visible position counter and Pause/Play control sit below. Arrow keys move through the roving selector. The stage changes tone by offering but preserves the same media-over-copy structure and action hierarchy.

Autoplay advances every 6.5 seconds on desktop and mobile. It pauses on hover where available, keyboard focus, hidden browser tabs, explicit pause, and after manual selection; Play or the next arrow restarts it. Mobile places the compact active stage within the landing viewport before a horizontally scrolling numbered selector and also permits deliberate swipe navigation. Focus, pause, and manual selection are behavioral states, not decorative animation triggers.

Image entry uses a 620ms `clip-path` reveal with slight blur and scale; copy enters over 520ms with opacity and a 10px rise. Both use the system ease-out curve. Reduced motion disables autoplay and progress animation, makes the selector manual, and reduces change feedback to a short 160ms opacity crossfade.

**The Stable Promise Rule.** The Care Loop may change evidence and routes, but never replace the page's core promise or force motion before the visitor can understand it.

**The Care Path Order Rule.** Salon, Trichology, Products, then Gallery is a trust and navigation invariant; preserve that sequence across desktop rail, mobile selector, keyboard movement, analytics, and admin ordering.

### Two-Path Decision

The clinical-versus-salon choice is a flat, tone-led decision section rather than a pair of floating cards. It uses one cream field, shared block rules, a single vertical divider on desktop, and equal editorial weight. Each path contains a small uppercase label, serif need statement, short explanation, one filled booking action, and one quiet exploration link. On mobile the divider becomes a horizontal rule and the paths remain in clinical-then-salon order.

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
- **Do** preserve 48px control heights, visible focus, clear selected states, and reduced-motion behavior.
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
- **Don't** use green and warm ochre as competing accents or add a new accent without a semantic role.
- **Don't** promise diagnosis, regrowth, guaranteed outcomes, or verification through visual styling.
- **Don't** present licensed stock, inspiration, or gallery imagery as a Tamlois client result.
