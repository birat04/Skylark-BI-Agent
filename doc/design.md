# Design.md — Visual Identity

## 0. Point of view
This is a tool a founder opens between board meetings, not a marketing site. The reference class is **Linear, Vercel dashboard, Mercury, Ramp** — not "AI chat app." Concretely, that means:

**Avoid, deliberately:**
- Purple-to-blue gradient text or gradient buttons (the single most recognizable "AI product" cliché of 2023–2025).
- Emoji in UI copy or empty states.
- Bubbly, oversized rounded chat bubbles with drop shadows.
- Glow/blur decorative background orbs.
- A hero-style landing page bolted onto what is actually a working tool — the chat *is* the product, it opens straight into the workspace, no marketing chrome.
- Generic "AI assistant" iconography (sparkles ✨, robot heads, glowing brains).

**Do instead:**
- Dense, confident, high-contrast information design. Numbers are the hero, not illustrations.
- Restraint: one accent color, used sparingly and consistently (links, active states, primary actions only).
- Real hierarchy through type weight and spacing, not color-coding everything.
- Monospace/tabular figures for anything numeric so tables don't jitter.

## 1. Theme — dark-first, light as a first-class second
Founders living in Linear/Vercel/GitHub dark mode all day expect this app to match. Ship dark as default; light must be equally deliberate, not an afterthought CSS invert.

### Dark (default)
| Token | Value | Use |
|---|---|---|
| `background` | `#0A0A0B` | App background |
| `surface` | `#131316` | Cards, sidebar, message bubbles |
| `surface-raised` | `#1B1B1F` | Modals, dropdowns, the leadership-brief card |
| `border` | `#26262B` | Hairline dividers only — 1px, never decorative |
| `text-primary` | `#F4F4F5` | Body/headings |
| `text-secondary` | `#A1A1AA` | Metadata, timestamps, captions |
| `text-tertiary` | `#65656B` | Disabled, placeholder |
| `accent` | `#3E63DD` | Primary actions, links, focus rings — a confident indigo-blue, not gradient |
| `accent-subtle` | `#1B2A52` | Accent backgrounds (selected state) |
| `success` | `#2FB344` | Healthy pipeline / on-track work orders |
| `warning` | `#D9A62E` | Data-quality caveats — this is the *most used* semantic color in this product, treat it as a first-class citizen not an afterthought |
| `danger` | `#E5484D` | At-risk/overdue, sync failures |

### Light
| Token | Value |
|---|---|
| `background` | `#FFFFFF` |
| `surface` | `#FAFAFA` |
| `surface-raised` | `#F4F4F5` |
| `border` | `#E4E4E7` |
| `text-primary` | `#18181B` |
| `text-secondary` | `#71717A` |
| `text-tertiary` | `#A1A1AA` |
| `accent` | `#3358D4` |
| `success` | `#1D8A34` |
| `warning` | `#A96A0A` |
| `danger` | `#CE2C31` |

The **warning** color deserves special mention: every caveat banner, every "3 rows excluded," every "match rate 78%" uses this consistently so a founder can visually scan a long answer and immediately spot where the data got shaky, without reading every word.

## 2. Typography
- **UI font:** `Geist Sans` (Vercel's typeface, free, pairs natively with the stack) — fallback `Inter`, then system-ui.
- **Numeric/data font:** `Geist Mono` for all figures, timestamps, IDs — tabular numerals everywhere numbers appear so columns align.
- **Scale** (rem, 16px base):

| Role | Size | Weight |
|---|---|---|
| Display (brief titles) | 1.5rem / 24px | 600 |
| Heading | 1.125rem / 18px | 600 |
| Body | 0.9375rem / 15px | 400 |
| Small / metadata | 0.8125rem / 13px | 400–500 |
| Micro (timestamps, badges) | 0.75rem / 12px | 500, letter-spacing +0.01em |

- Line height 1.5 for body, 1.2 for headings.
- No italics anywhere except inline citations of raw/original field values (e.g., *raw sector: "Energy - Solar/Wind"*) — this becomes a deliberate visual convention for "this is unnormalized source data."

## 3. Layout
- Two-pane shell: slim left sidebar (sync status, conversation history, "new conversation") + main chat column, max-width ~760px centered — readable line length, not full-bleed.
- Chat messages: no bubbles. User messages right-aligned, subtle `surface-raised` background, minimal padding. Assistant messages left-aligned, no background — reads like a written memo, not a messaging app.
- Caveat callouts render as a distinct bordered block (left border in `warning`, not a full colored background) inline within the assistant message, directly beneath the claim it qualifies — never collected at the bottom as a disclaimer dump.
- Leadership brief renders as a card with its own header (title + generated-at timestamp), section dividers, and a "Copy as Markdown" action — visually distinct from a normal chat turn so it reads as an artifact, not a message.
- Data tables (when the agent returns tabular results): real `<table>` with sticky header, right-aligned numeric columns, zebra-free (rely on hairline row borders, not background banding).

## 4. Components (shadcn conventions)
- Use shadcn's **"new-york"** style variant — tighter radii, less decorative shadow than "default."
- Border radius: 6px for inputs/buttons, 8px for cards — not the 16–24px "soft AI app" look.
- Buttons: solid `accent` for primary, ghost/outline for secondary — no gradient fills, no glow on hover, just a subtle brightness shift.
- Focus states: a visible 2px accent ring — accessibility and precision over invisible minimalism.
- Icons: Lucide (shadcn default), used sparingly — status/sync/warning only, never decorative.

## 5. Motion
- Minimal. Streaming text fades in per-token (already inherent to the AI SDK stream), no additional bounce/slide animation on message arrival.
- Sync status badge: a subtle pulsing dot only while sync is actively running, static otherwise.
- No page-transition animations — this is a tool, speed reads as quality.
