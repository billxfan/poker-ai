# Poker AI Web — Core Regression Report

## Conclusion

**Pass**

The offline single-player flow was validated from the poker engine through the
browser UI. No known blocking gameplay defects remain in the tested scope.

## Automated core coverage

- 23 deterministic tests passed.
- 200 seeded AI-vs-AI hand simulations all settled in fewer than 200 actions.
- Core line coverage: 97.25%.
- Core branch coverage: 88.24%.
- Core function coverage: 96.77%.

Covered behavior:

- All nine standard Hold'em hand categories, wheel straight, and kicker
  comparison.
- Six-handed and heads-up blind assignment and action order.
- Preflop, flop, turn, and river progression.
- Full raises, short all-in raises, cumulative short all-ins, and raise rights.
- Underfunded blinds and partial all-in calls.
- Uncontested pots, showdowns, tied pots, side pots, and odd-chip order.
- Dealer rotation around eliminated seats.
- Chip conservation and loop detection across randomized complete hands.

## Browser regression

Validated on the local production bundle:

- Home, new-session confirmation, and continue-session flow.
- Fold, check, call, quick raise, all-in, and keyboard shortcuts.
- AI turn progression and automatic board runout.
- Full showdown settlement with board, hole cards, hand categories, payouts,
  and net results.
- Action-log drawer, Escape-to-close, return-to-home, and session restore.
- Bust and restart flow with a 2,000-chip minimum training bankroll.
- Welfare center contains only daily grant and sign-in; no ad entry.
- Sound toggle persists locally and remains usable at desktop and mobile sizes.
- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844.
- Browser console: 0 errors and 0 warnings.

## Defects found and fixed during this regression

1. A short all-in incorrectly reopened raising for players who had already
   acted.
2. An underfunded big blind incorrectly reduced the preflop bring-in below the
   full big blind.
3. Odd chips in split pots were assigned by player ID instead of clockwise from
   the dealer.
4. Restarting after bust created a one-chip session instead of restoring a
   playable training bankroll.

## Product boundary

This validates game-state correctness for the implemented MVP. The local AI is
still a lightweight training opponent, not a GTO solver, and multiplayer,
accounts, real-money play, analytics, ads, and remote services remain out of
scope.
