# Module: Persistent Learning and Memory

## Entry and exit

- Entry: receive a completed public hand record plus the bot's own private
  episode steps and final chip delta.
- Exit: return a new versioned memory snapshot; persist it independently from
  the live table snapshot.

## Main path

1. Update opponent observations only from public actions and showdown reveals.
2. Compute confidence-weighted VPIP, PFR, aggression, fold-to-pressure, sizing
   and showdown tendencies by relevant context.
3. Normalize final reward by effective stack and distribute discounted credit
   across the bot's episode steps.
4. Update only the selected contextual-bandit action value and visit count.
5. Clamp the learned contribution to the persona's identity envelope.
6. Append a compact replay/audit entry and prune bounded histories.

## Alternate paths

- Hand ends without showdown: learn from action/reward but not imaginary hole
  cards.
- Showdown: incorporate only cards actually revealed.
- Tiny sample: preserve high uncertainty and stay close to persona priors.
- Memory reset: restore factory values while leaving the current table intact.

## Exception paths

- Unknown schema: migrate known versions or reset memory with a visible notice.
- Storage quota/failure: continue with in-memory learning and expose a
  non-blocking warning.
- Extreme/invalid reward: clamp and record the anomaly in development replay.
- Corrupt context bucket: drop that bucket rather than the whole table session.

## State machine

`empty | restored → observing → hand-complete → rewarding → updating → clamping
→ persisted`

Failure states are `persisted → memory-only` and `restoring → reset-with-notice`.

## Dependencies

- Public hand history
- Private per-bot episode ledger
- Persona identity envelopes
- Versioned browser storage
- Deterministic migration functions

## Verification echo

Learning means evidence-based, bounded adaptation—not omniscience and not a
personality rewrite. Resetting memories and resetting chips are separate acts.

