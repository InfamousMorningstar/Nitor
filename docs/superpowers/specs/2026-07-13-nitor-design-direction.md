# Nitor — Visual Design Direction (authoritative for all UI tasks)

This document defines Nitor's visual identity. **It overrides any color, font, gradient, or
"generic" styling value in the implementation plan.** The plan's component architecture, file
structure, `<Glass>` tier logic, and APIs still stand — this governs how things *look and feel*.

Goal (from the user): the UI must be **better than existing habit trackers and must not look like a
generic AI front end.** No default Tailwind indigo/gray, no stock card grids, no purple
glassmorphism cliché.

---

## Thesis: momentum is *light*, not a streak

Nitor (Latin *"to shine / to strive"*). Competitors make consistency a brittle **streak** that
*shatters*. Nitor makes it **luminance** that *brightens and dims*. This is the anti-streak-anxiety
product thesis expressed as a visual system: the more consistent you are, the warmer and brighter
the ambient light behind the glass. Slipping doesn't turn things red and alarming — it goes cool and
quiet (calm, restful), never punitive. (Validated by Gentler Streak's Apple-Design-Award "consistency
over intensity" approach.)

---

## Signature element (the one memorable thing): the Momentum Aura

A soft radial light that lives **behind** the glass — both app-wide and per habit card — whose
**warmth and brightness are driven by the habit's momentum value (0–100)**:

- **0–33 (resting):** dim, cool teal glow, low opacity. Calm, not failure.
- **34–66 (building):** balanced, neutral-warm.
- **67–100 (radiant):** bright warm amber-gold glow, higher opacity. The habit "shines."

The glass refracts this living light (Tier 1) or sits over it as a soft blurred wash (Tier 2/3).
Spend the design's boldness here; keep everything else quiet. Implement as a helper
`auraFor(momentum: number): { color: string; opacity: number }` used by cards and the app background.

Supporting signature: **every number is an instrument reading** — momentum %, correlation `r=`,
streak counts, calendar day numbers, dates, and eyebrow labels are set in a **monospace** face with
tabular figures. The product measures your life; the type should feel like a measurement.

---

## Color tokens

Warm luminous accent on a deep cool ink — deliberately warm in a category that defaults to cool
blue. Not purple, not acid-green-on-black, not cream.

### Dark (primary aesthetic)
```
--bg:            #0B1116   /* deep cool ink, not pure black */
--bg-elev:       #121C24   /* solid elevated card (non-glass) */
--text:          #ECF2F0   /* warm-cool off-white */
--muted:         #7C8A94   /* desaturated slate */
--nitor:         #FFC24B   /* SIGNATURE warm shine (amber-gold) */
--nitor-2:       #FF8E6B   /* gradient partner (warm coral) */
--calm:          #46D0B4   /* cool teal (resting / secondary) */
--calm-2:        #2E8FB0   /* deep cyan (aura cool end) */
--hairline:      rgb(255 255 255 / 0.10)
```

### Light (cool porcelain, NOT cream)
```
--bg:            #EDF1F2   /* cool porcelain / frost */
--bg-elev:       #FBFCFC   /* near-white porcelain, not pure #fff */
--text:          #101720
--muted:         #5A6B74
--nitor:         #E8A21F   /* deepened amber for contrast on light */
--nitor-2:       #F0785A
--calm:          #1FA78C
--calm-2:        #1E7E9C
--hairline:      rgb(16 23 32 / 0.10)
```

### Aura gradients
- warm (high momentum): `--nitor` → `--nitor-2`
- cool (low momentum): `--calm` → `--calm-2`

### App background (replaces the plan's 3 generic purple/blue/green blobs)
A single slow **"aurora horizon"**: a warm amber glow rising from the bottom (dawn / shine) meeting a
cool teal wash from the top. Very low saturation so it reads as *lit air*, not a rainbow. Slow drift
(~30s) that **freezes under `prefers-reduced-motion`**. This is what the glass refracts.

### Habit palette (per-habit user colors) — retuned, luminous jewel tones (not stock primaries)
`#F5B841` (amber) · `#5AD1B4` (teal) · `#7FA6FF` (periwinkle) · `#FF8E6B` (coral) ·
`#C69CF0` (soft violet) · `#8FD16A` (leaf) · `#F58AB0` (rose) · `#57C6E0` (sky)

---

## Typography

Three roles (display speaker + UI workhorse + data/utility mono). **No Inter.**

- **Display** (app name, screen titles, big momentum numbers): **Bricolage Grotesque** (variable) via
  `next/font/google` (`Bricolage_Grotesque`). Characterful humanist-grotesque; used with restraint,
  tight tracking on large sizes.
- **UI / body workhorse:** Apple **system stack** first for authentic iOS feel, with **Geist Sans**
  as the cross-platform fallback: `-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-geist-sans), system-ui, sans-serif`.
- **Data / numerals / eyebrows / captions:** **Geist Mono** with tabular figures
  (`font-variant-numeric: tabular-nums`). Use for every stat, count, date, `r=`, `%`, and small
  uppercase-tracked labels.

Setup: `npm install geist`; import `GeistSans` from `geist/font/sans` and `GeistMono` from
`geist/font/mono`; load Bricolage via `next/font/google`. Expose all three as CSS variables on
`<body>`. (This replaces the plan's `Inter` import in Task 7.)

Type scale (fluid, generous, Apple-ish): display 34–44px / titles 22–28px / body 15–16px /
caption-mono 11–13px uppercase with +0.08em tracking.

---

## Form, space, motion

- **Shape:** generous Apple radii — cards/pills ~24–32px, inputs ~16–20px. Hairline 1px borders +
  the specular highlight from the `<Glass>` primitive.
- **Space:** roomy. Comfortable vertical rhythm (major sections ~24–32px apart), never dense.
- **Glass usage (unchanged from plan):** only nav bar, modals, primary CTA, insight/story cards.
  Never on every list row.
- **Motion (spring, restrained):** a page-load "settle" where cards rise ~8px + fade in (staggered
  ≤40ms) while the aura blooms once; momentum bar eases width over ~500ms; tap = soft scale(0.97).
  Everything collapses to instant under `prefers-reduced-motion`.

---

## Calendar recolor (anti-punitive — overrides the plan's red "missed")

- **complete:** filled with the habit color.
- **grace day:** the amber **"protected"** glow (ring/soft fill in `--nitor`), framed as forgiven,
  not failed.
- **missed (scheduled):** a **quiet hollow** — faint hairline outline, muted text. No red, no alarm.
- **not scheduled:** barely-there / low opacity.

---

## Copy voice

Calm, plain, encouraging, active voice, sentence case. Frame momentum and slips gently: "You're
building momentum," "Protected by a grace day," "Resting — pick it back up when you're ready." Never
guilt. Errors/empties give direction, not mood.

---

## Explicit DON'Ts (the generic-AI tells to avoid)

- ❌ Indigo/purple `#6366F1`-family accents or purple glassmorphism.
- ❌ Inter as the primary/only font.
- ❌ Rainbow radial-blob backgrounds.
- ❌ Alarming red for missed days.
- ❌ Stock evenly-gridded cards with default `gap-4` and no hierarchy.
- ❌ Big-number-with-tiny-label + gradient-accent template hero without the aura/mono treatment.
- ❌ Pure `#000` / pure `#fff` surfaces.
