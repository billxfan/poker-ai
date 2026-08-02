# Module: Deterministic Game Table

## Entry and exit

- Entry: restore a validated stable snapshot or create a seeded six-seat table.
- Exit: persist only after a completed legal transition; the browser may close
  between any two actions.

## Main path

1. Rotate the dealer across funded seats and post correct six-handed or heads-up
   blinds.
2. Deal unique hole cards and expose each participant only to its observation.
3. Recompute legal actions from current commitments and raise rights.
4. Apply one immutable action transition, append a chronological public event,
   verify chip conservation, and select the next actor.
5. Close the betting round, burn/deal the next street, or run out the board when
   nobody can act.
6. Build contribution pots, determine eligible winners, distribute odd chips
   clockwise from the dealer, and emit a hand-complete record.
7. Hand the public record and private per-bot episode records to learning.

## Alternate paths

- One player remains: award the pot without revealing cards.
- All remaining players are all-in: run out the board without fake delays.
- Short all-in: increase the call price but reopen raising only after cumulative
  short raises reach a full raise.
- Eliminated bot: rebuy between hands without changing the current hand.

## Exception paths

- Stale/illegal action: reject with no partial state mutation and recompute the
  legal set.
- Invalid save: quarantine it, create a fresh session, retain learning only if
  its separate schema validates.
- Invariant failure in development: stop the simulation with seed, hand and
  transition trace; never silently continue a corrupt hand.
- Network loss: irrelevant after initial asset load; no gameplay request exists.

## State machine

`restoring → posting-blinds → dealing → awaiting-action ↔ applying-action →
street-transition → showdown | uncontested → hand-complete → next-hand`

`awaiting-action` has `human-input` and `bot-decision` substates. Settlement is
the only state allowed to convert contributions back into stacks.

## Dependencies

- Card/deck and best-hand evaluator
- Legal-action and settlement engine
- Bot observation builder
- Versioned local session
- Replay/invariant harness

## Verification echo

The engine is the source of truth. UI and bots request legal options but cannot
invent transitions, inspect future cards, or repair state opportunistically.
