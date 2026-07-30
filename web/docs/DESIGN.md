# Poker AI Web — Visual Design

## Direction

“Tactile strategy table”: a warm, editorial poker room rather than a dashboard.
The table is the hero, with a layered walnut-and-brass bezel, luminous emerald
felt, cream cards, compact seat pods, and a floating table-side action console.
Information panels behave like a slim scorecard and never compete with the hand.

## Color tokens

| Token | Value | Use |
|---|---:|---|
| `night` | `#080D0C` | page background |
| `night-soft` | `#101816` | elevated surfaces |
| `felt-deep` | `#063F31` | felt edge |
| `felt` | `#096247` | main table |
| `felt-light` | `#14805E` | felt highlight |
| `cream` | `#F6F0E4` | primary type and cards |
| `muted` | `#94A69F` | secondary type |
| `brass` | `#D9B46C` | pot, focus, premium accent |
| `copper` | `#8B5A32` | outer table bezel |
| `signal` | `#65D6A2` | turn and call state |
| `danger` | `#D2655D` | fold and loss |
| `raise` | `#E3A84F` | raise action |

## Typography

- Display and UI family: `Avenir Next`, `DIN Alternate`, `PingFang SC`,
  `SF Pro Rounded`, then `ui-sans-serif`
- Instrument labels and values: `SFMono-Regular`, `Menlo`, then `ui-monospace`
- Product mark uses strong contrast between the large name and quiet descriptor
- Table values use tabular numerals; minimum readable label size is 10px
- No remote fonts are loaded, preserving complete offline behavior

## Components

### Poker table

- Wide asymmetric capsule with three layers: walnut rail, brass hairline, felt
- Soft lighting and woven CSS texture create depth without image downloads
- A compact status pill floats over the rail instead of consuming a full row
- Pot and cards form the only high-contrast content at the optical center
- Branding is reduced to a quiet embossed spade, never a large watermark

### Player seat

- Small score pods with avatar medallion, name, position, stack, and action
- Cards tuck into the pod edge so seats read as one coherent object
- Active seat uses a bright signal ring plus “thinking” copy
- Folded seats desaturate; the human pod is anchored to the near edge

### Playing card

- Warm ivory paper with a fine inner keyline, corner indices, a central suit
  pip, and a quiet diagonal paper sheen
- Rank and suit use compact top-left and mirrored bottom-right indices; red
  suits use muted vermilion rather than bright casino red
- Card back uses a woven emerald micro-pattern, double brass keyline, and a
  small Poker AI medallion; never use a question mark as the back design
- Board and human cards are larger than opponent card backs
- Board cards reveal with a short lift-and-turn sequence. Hole cards enter in
  the same clockwise order as the real deal

### Action controls

- Floating console overlaps the near table rail and stays visually connected
- Stack and call amount occupy a small instrument cluster on the left
- Check/call is the primary signal-green action; raise is warm amber
- Fold and all-in remain clearly distinct but visually secondary
- Tactile highlights, pressed states, explicit focus rings, 48px touch targets

### Scorecard and overlays

- Desktop rail is a single quiet scorecard stack with restrained separators
- Session profit is the visual anchor; action history becomes a compact timeline
- Strategy note uses a warm inset rather than another generic panel
- “Local / offline” remains visible and confirms device-only storage

### Home

- The balance panel is a quiet membership-card hero with a one-shot light sweep
  on entry, engraved chip mark, and restrained brass glint
- Main actions share one material system: deep gradient, inset keyline, fixed
  icon well, and function-specific icon response on hover/press
- Entry motion follows reading order: title, balance, daily reward, then actions
- Avoid continuous decorative movement after the initial reveal

### Statistics and AI profiles

- Tabs behave like a compact instrument switcher with icons and a selected
  surface, not plain text navigation
- AI selection uses avatar chips with a strong selected ring, persona color
  accent, and immediate profile crossfade
- Profile identity uses a larger avatar medallion and clearer separation from
  metrics
- Learning curves draw in once, retain a visible center grid, use layered
  stroke widths so coincident series remain distinguishable, and expose the
  same information in labels
- Metric and history cards enter in a short stagger. Hover/tap feedback must
  never shift surrounding layout

## Layout

- Desktop: compact masthead, hero table, 270px scorecard rail
- The table and controls fit within a typical laptop viewport
- Tablet: full-width table with a horizontal scorecard below
- Mobile: tall table, two-row sticky controls, history below
- Preserve a 12–18px gutter and safe-area padding

## Responsive rules

- `≥ 1120px`: table and scorecard rail side by side
- `760–1119px`: full-width table with information strip below
- `< 760px`: tall table, compact seats, two-row action grid
- `< 430px`: hide decorative copy and secondary style labels
- Short viewports may scroll; legal actions stay reachable

## Motion

- Standard interaction curve: `cubic-bezier(.2,.8,.2,1)`
- Expressive deal curve: `cubic-bezier(.16,1,.3,1)`
- Micro feedback: 140–180ms; panels and page entry: 240–360ms; cards and
  settlement: 360–620ms
- Hover uses light, inset keyline, and material response rather than generic
  bouncing
- Page entry is one-shot and staggered; no decorative infinite loops outside
  active-turn/thinking indicators
- Pot and contribution numbers briefly settle when they change
- Active seat receives one quiet ring pulse when turn state changes
- `prefers-reduced-motion` removes deal travel, line drawing, stagger, and
  transforms while keeping every final state immediately visible

## Do

- Keep pot, current bet, turn, and legal actions immediately legible
- Use color together with text and shape, never as the only state signal
- Maintain touch targets of at least 44px
- Keep the human hand and action console in a stable location

## Don’t

- Do not use casino neon, flashing jackpots, coin showers, or promotional ads
- Do not show account, login, cloud, or social controls
- Do not overuse suit icons or giant wordmarks as decoration
- Do not obscure the table with persistent onboarding
- Do not rely on hover for important information
