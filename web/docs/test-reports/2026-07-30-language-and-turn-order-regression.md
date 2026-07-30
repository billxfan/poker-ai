# AI Language and Turn-Order Regression

Date: 2026-07-30

## Scope and approach

- Verify the six-handed and heads-up blind assignments.
- Verify the first actor and clockwise action order on preflop, flop, turn, and
  river.
- Verify dealer rotation preserves the standard position order.
- Verify short-stack blind labels are based on the assigned blind, not the
  amount the player could afford to post.
- Verify AI presentation copy uses only public information, varies by persona
  and pressure, and avoids recently displayed copy for the same seat.
- Run the complete deterministic poker suite, TypeScript validation, lint,
  production build, and a real-browser opening-hand check.

## Expected sequences

With six active seats and seat 5 on the button:

- Positions by seat 0–5: `SB, BB, UTG, HJ, CO, BTN`
- Preflop actors: `2 → 3 → 4 → 5 → 0 → 1`
- Flop, turn, and river actors: `0 → 1 → 2 → 3 → 4 → 5`

Heads-up:

- Dealer is `BTN/SB` and acts first preflop.
- The big blind acts first after the flop.

## Results

- The engine matched every expected action sequence.
- Dealer rotation moved the button clockwise and recomputed all six positions.
- An underfunded small blind now remains labelled `小盲`, including an all-in
  blind smaller than 10.
- The AI presentation library contains 264 curated base phrases.
- Each AI seat remembers its most recent 36 visible cues and excludes them from
  the next plan whenever fresh copy is available.
- Forty consecutive generated plans reused none of the supplied recent cues and
  produced at least 80 distinct visible lines for one persona in one fixed
  table context.
- Browser verification showed `狐狸 BTN`, `你 SB 10`, `老 K BB 20`, followed
  by the correct first actor `小马 UTG`. The console contained zero errors and
  zero warnings.

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

The betting-order implementation is consistent with standard no-limit Texas
Hold'em for the covered six-handed and heads-up paths.
