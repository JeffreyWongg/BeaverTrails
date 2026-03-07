# Design System

BeaverTrails follows a minimal, dark-first design language with Canadian red and white as complementary accents.

## Principles

- **Minimal** — every element earns its place. Remove before adding.
- **Dark-first** — the base is always dark zinc; colour is used to guide attention.
- **Purposeful colour** — red and white are reserved for selection states, progress, and primary actions. They are not decorative.
- **Legible hierarchy** — font weight and size carry hierarchy; colour reinforces but does not replace it.

## Colour Palette

| Token | Value | Usage |
|---|---|---|
| `zinc-950` | `#09090b` | Page background |
| `zinc-900` | `#18181b` | Surface / card |
| `zinc-800` | `#27272a` | Subtle border, hover state |
| `zinc-400` | `#a1a1aa` | Secondary text |
| `white` | `#ffffff` | Primary text, CTA label |
| `canada-red` | `#C8102E` | Selected state, progress bar, primary action |
| `canada-red-light` | `#E8294E` | Hover state, icon accent |
| `canada-red-dark` | `#A00C24` | Active/pressed state |

Canadian red and white are **complementary** colours — they highlight and guide, not dominate.

## Typography

- **Display** — `font-black`, tight tracking (`tracking-tighter`)
- **Heading** — `font-bold`
- **Body** — `font-light` or default weight
- **Label / Caption** — `text-xs`, `uppercase`, `tracking-wider`, `font-bold`

Font family: Geist Sans (primary), Geist Mono (code/coordinates).

## Spacing

Follow the Tailwind 4-point scale. Standard section gaps are `mb-12` or `mb-16`. Padding inside cards is `p-4` to `p-6`.

## Components

### Cards

```
bg-zinc-900 border border-zinc-800 rounded-2xl
```

Selected state adds `border-canada-red bg-canada-red-muted`.

### Buttons — Primary

```
bg-white text-zinc-950 rounded-full font-medium
hover:bg-zinc-100 hover:scale-105 active:scale-95
```

### Buttons — Accent

```
bg-canada-red text-white rounded-full font-medium
hover:bg-canada-red-light
```

### Progress Bar

Height: `2px`. Fill: `bg-canada-red`. Background track: `bg-zinc-800`.

### Focus Ring

```
focus:ring-2 focus:ring-canada-red/50
```

## Motion

Use `framer-motion` for all animated transitions. Prefer `opacity` + `y` translate on mount. Keep durations between `0.3s` and `0.8s`. Avoid bounce; use `easeOut` or `easeInOut`.
