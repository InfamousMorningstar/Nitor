# Nitor — Design System Reference

Source of truth for the redesign. Minimal, premium, editorial, MATTE (flat).
One warm amber accent. Characterful typography. Restrained glitch.

The old look (glassmorphism on dark, colored glows) was **rejected by the
client**. Never again:

- No `backdrop-filter`, no blur panels, no colored glows / gradient halos.
- Flat matte surfaces: cards = 1px hairline border (~8% white) + a single
  bg step. Shadow never heavier than `0 1px 2px rgba(0,0,0,.4)`.
- ONE accent color, used only for primary actions, active states, streak
  flames, and pet glow. Everything else is grayscale.

## Tokens (`src/app/globals.css`)

All colors are space-separated RGB triplets, composed as `rgb(var(--x) / a)`.

### Dark (default)

| Token           | Value           | Hex       | Use                          |
|-----------------|-----------------|-----------|-------------------------------|
| `--bg`          | `10 10 11`      | `#0A0A0B` | page background               |
| `--surface`     | `17 17 19`      | `#111113` | card                           |
| `--surface-2`   | `23 23 26`      | `#17171A` | hover / elevated               |
| `--text`        | `237 237 239`   | `#EDEDEF` | primary text                   |
| `--text-dim`    | `161 161 166`   | `#A1A1A6` | secondary text                 |
| `--text-mute`   | `130 130 138`   | `#82828A` | tertiary / disabled, AA on dark surfaces |
| `--hairline`    | `255 255 255`   | —         | borders, use at `/0.08`        |
| `--accent`      | `245 176 39`    | `#F5B027` | signature amber                |
| `--accent-glow` | `255 194 75`    | `#FFC24B` | accent hover/emphasis variant  |
| `--accent-contrast` | `10 10 11`  | `#0A0A0B` | text/icons on accent fills     |

### Light (`[data-theme="light"]`) — warm paper, not sterile white

| Token           | Value           | Hex       | Use                          |
|-----------------|-----------------|-----------|-------------------------------|
| `--bg`          | `244 241 234`   | `#F4F1EA` | warm paper page background    |
| `--surface`     | `251 250 246`   | `#FBFAF6` | card                           |
| `--surface-2`   | `255 255 255`   | `#FFFFFF` | tiny inset accents only — avoid large pure-white fields |
| `--text`        | `23 23 26`      | —         | primary text                   |
| `--text-dim`    | `90 90 96`      | —         | secondary text                 |
| `--text-mute`   | `105 105 112`   | `#696970` | tertiary / disabled, AA on paper surfaces |
| `--hairline`    | `16 16 20`      | —         | borders, use at `/0.10`        |
| `--accent`      | `154 96 5`      | `#9A6005` | deepened amber for AA contrast |
| `--accent-glow` | `145 88 0`      | `#915800` | AA accent hover variant        |
| `--accent-contrast` | `255 255 255` | `#FFFFFF` | text/icons on accent fills   |

Dark is the default theme (`:root` = dark values); `[data-theme="light"]`
overrides.

### Motion tokens (`:root`)

```
--ease: cubic-bezier(0.22, 1, 0.36, 1);
--dur-micro: 150ms;   /* hovers, taps */
--dur: 250ms;         /* standard transitions */
--dur-max: 400ms;     /* page-level / larger moves, ceiling */
```

Global `@media (prefers-reduced-motion: reduce)` zeroes all animation and
transition durations app-wide.

## Fonts (`src/app/layout.tsx`)

| Var                 | Font           | Role                                                |
|----------------------|----------------|------------------------------------------------------|
| `--font-display`     | Space Grotesk  | Wordmark + headlines. Sharp grotesk, technical edge.  |
| `--font-geist-sans`  | Geist Sans     | Body copy. Highly legible.                            |
| `--font-mono`        | JetBrains Mono | Numbers, stats, streaks. Terminal-flavored, digits align. |

All three variables are applied on `<body className>` in `layout.tsx`.

## Wordmark (`src/components/brand/Wordmark.tsx`)

Renders **NITOR** in `--font-display`, uppercase, tight/negative tracking.
The final **R is mirrored horizontally** (`transform: scaleX(-1)`), so it
reads **NITOЯ**. This is a permanent brand quirk — never "fix" it, never
un-mirror it, keep it in every future rebuild of the wordmark. Accepts
`size` (Tailwind text-size class passthrough) and `className`. Color
inherits from context (no hardcoded color — respects the grayscale rule).

## Glitch (`src/components/brand/Glitch.tsx`)

A restrained, budgeted effect — NOT a decorative flourish to sprinkle
around. `<Glitch>text</Glitch>` plays a single ≤300ms RGB channel-split +
tiny horizontal slice offset on `:hover`, then resolves crisp. A `trigger`
prop fires the same one-shot effect imperatively (for non-hover contexts).
Fully disabled under `prefers-reduced-motion` — reduces to plain text only.

**Glitch budget: exactly four uses in the whole app.** Do not exceed this
without updating this document:

1. Nav hover (wordmark or nav item)
2. Loader / loading state
3. Footer
4. 404 page

## Rules for future redesign tasks

- Grayscale by default; reach for `--accent` only for primary actions,
  active/selected states, streak flames, and the pet's glow.
- Cards: `bg-[rgb(var(--surface))]` + `border border-[rgb(var(--hairline)/0.08)]`
  (or `/0.10` on light). No shadow beyond `0 1px 2px rgba(0,0,0,.4)`.
- No `backdrop-filter`, no blur, no gradient glows — flat matte only.
- Respect the 8pt spacing scale and a ~1200px max content width.
- Old `Glass.tsx` / `aura.ts` and their glass-tinted call sites remain
  temporarily (other pages still import them) — they are removed as each
  page is rebuilt on the new token system, not before.
