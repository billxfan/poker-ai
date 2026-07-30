# Human-like AI and menu icon regression — 2026-07-29

## Scope

- AI snap, measured, and tank presentation rhythms
- Persona-specific timing and seat-local mannerisms
- Pressure-sensitive timing on large prices and later streets
- Public-action reactions without private-card leakage
- Home menu icon consistency and alignment
- Desktop and mobile interaction regressions

## Automated verification

- 31/31 core tests passed.
- 200 seeded full-hand simulations settled without action loops, illegal chip
  loss, or negative stacks.
- Thinking plans covered every length from 1–7 steps and all three rhythm
  modes.
- High-pressure river plans averaged at least 1.2 seconds longer than the same
  opponent in a relaxed spot.
- Loose-aggressive opponents produced materially more snap decisions than the
  cautious opponent; the cautious opponent's average decision time remained
  materially longer.
- TypeScript, ESLint, production build, and whitespace checks passed.

## Browser verification

- Desktop: 1440 × 900
  - Four home actions use a consistent rounded SVG icon container.
  - Icon columns and labels align across all actions.
  - New-session confirmation remains keyboard- and pointer-operable.
  - Seat-local measured/tank bubble renders beside the active opponent without
    covering the pot banner or action controls.
- Mobile: 390 × 844
  - Home actions remain within the viewport with aligned icons and 44px+
    targets.
  - The table, five opponent seats, human cards, and four legal actions remain
    visible and operable.
  - Long desktop thought copy degrades to a compact seat-local label.
- Browser console: 0 errors, 0 warnings.

## Result

Pass. No Critical, High, or Medium defects remain in this change set.
