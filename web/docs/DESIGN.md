# Poker AI Web — Visual Design

## Direction

“Tactile strategy table”: a warm, editorial poker room rather than a dashboard.
The table is the hero, with a layered walnut-and-brass bezel, luminous emerald
felt, cream cards, compact seat pods, and a floating table-side action console.
Information panels behave like a slim scorecard and never compete with the hand.

The Humanlike Core revision preserves this material direction. Its new visual
goal is “recurring rivals, not visible algorithms”: memory and adaptation appear
as restrained character knowledge, while live solver scores, equity meters and
debug traces stay out of the active hand.

## Table Theatre v0.3 extension

The reference is a compact character-driven bluffing table, adapted to the
existing cat cast rather than copied literally. The visual archetype is a
**Z-axis stage**: each seat is a small physical scene made of independent floor
shadow, rim light, body, clipped head/paw duplicates, reaction effects and
dialogue. Depth comes from parallax, occlusion, light and gesture timing.

### Seat layer stack

| Layer | Role | Allowed animation |
|---|---|---|
| floor shadow | contact and weight | scale + opacity |
| rim/aura | active, pressure and result focus | scale + opacity |
| body | breathing and torso posture | translate/rotate/scale |
| clipped head | gaze, recoil and personality | rotate/translate |
| clipped paws | check/call/raise/fold gesture | translate/rotate |
| reaction FX | blink, sweat, sparks, loss lines | opacity/transform |
| bubble/badge | accessible public language | opacity/transform |

The same source art may be layered and clipped for pseudo-3D. An animation that
only rocks the entire cutout fails this specification.

### Gesture matrix

| State | Shared meaning | Persona variation |
|---|---|---|
| idle | slow breath, rare blink | different breath amplitude and gaze |
| thinking | looks between board and chips | 老 K precise, 小马 restless, 大叔 double-checks, 小鱼 leans in, 狐狸 becomes still |
| check/call | small paw beat toward felt | speed and overshoot follow persona |
| raise | paws/chips travel forward, seat light tightens | 小马 snaps, 老 K presses, 狐狸 glides |
| all-in | stronger forward move and table shock ring | 850–1100ms, no result colour yet |
| fold | cards/seat move away, body recoils | 500–700ms, then persistent muted posture |
| win | gold collection arc and uplift | restrained to exuberant by persona |
| loss | lowered light and posture | no humiliation; folded players stay quietly folded |

### Motion physics

- Animate transform/opacity only with `cubic-bezier(.22,.8,.2,1)` for weighted
  entry and `cubic-bezier(.34,1.56,.64,1)` only for elastic persona accents.
- Public-action response starts within 150ms. Normal gestures finish within
  900ms; result choreography within 1800ms.
- Desktop travel is 6–18px; mobile travel is 3–10px. Nothing may cross the
  community board, pot price or human action bar.
- Reduced motion disables travel, shake and parallax while retaining rim light,
  an expression badge and 120–180ms opacity feedback.

### Dialogue and results

- Speech is a short post-action bark, not a thought transcript: at most two
  lines and 18 Han characters.
- `turn-tell` uses neutral felt glass; `after-action` receives a persona accent;
  `result` uses gold for a win and desaturated plum for a loss.
- The result modal waits for a short table beat. Winners receive a gold rim and
  pot-collection arc; showdown losers lower posture and light. A compact center
  banner announces the public result before details cover the table.
- Never show percentages, ranges, hand names or claims about hidden cards.

### Audio signature

The table uses dry card cloth/noise, warm wood/chip transients and restrained
musical intervals. Call, raise and all-in never share one cue. Flop, turn,
river, showdown and pot award each have their own temporal signature. High-
frequency cues use deterministic micro-variations.

## Humanlike core experience

### Rival memory

- Each opponent profile carries one quiet memory line, such as “看了你 18 手 ·
  觉得你面对再加注偏谨慎”. It always includes sample size or uncertainty.
- During a hand, the seat may show a short public-information cue (“重新看了一眼
  你的加注尺寸”), never an exact equity, hidden card reference or claim of mind
  reading.
- Learning maturity is rendered as an evidence ring with discrete labels
  `观察中 / 有些把握 / 熟悉你的节奏`; it is not a progress bar toward perfection.

### Post-hand table read

- The result overlay remains focused on winner and chip movement.
- An optional secondary sheet, “这手他们看到了什么”, lists at most three
  public factors per acting bot: position, price, board, public sequence and
  established opponent tendency.
- Explanations describe influence, not false certainty: “大额跟注压力让他收紧”
  rather than “因为你在诈唬所以弃牌”.
- A bot's private strength bucket is shown only when its cards were revealed at
  showdown. Otherwise it stays private.

### Memory controls

- “新牌桌” and “清除对手记忆” are separate menu rows with different icons and
  confirmations.
- Memory reset confirmation says chips and current session remain unchanged.
- Local-save or memory migration warnings use a small amber status pill; they
  never block a live hand.

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
- Persona is communicated through cadence, sizing and concise copy; persistent
  badges do not label opponents as “fish”, “nit” or expose internal policy names

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
- Developer decision traces live behind a development-only diagnostics panel;
  production scorecards show safe narrative summaries only after a hand

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
- Express confidence with sample size and uncertainty
- Keep live tells causally downstream of the completed decision

## Don’t

- Do not use casino neon, flashing jackpots, coin showers, or promotional ads
- Do not show account, login, cloud, or social controls
- Do not overuse suit icons or giant wordmarks as decoration
- Do not obscure the table with persistent onboarding
- Do not rely on hover for important information
- Do not show live equity, Q-values, context keys or unrevealed hand-strength buckets
- Do not imply that a single result proves learning or that opponents know hidden cards
