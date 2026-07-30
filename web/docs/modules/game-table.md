# Module: Game Table

## Entry and exit

- Entry: the root route restores the local session or creates a new six-seat
  table.
- Exit: the user may close the page at any time; the latest stable game state is
  already persisted.

## Main path

1. Deal two cards clockwise from the dealer's left. On a table with three or
   more players, the dealer's left posts the small blind and the next active
   seat posts the big blind. Heads-up, the dealer posts the small blind.
2. Advance through legal actors clockwise. Preflop starts left of the big
   blind (heads-up: the dealer/small blind); flop, turn, and river start at the
   first active seat left of the dealer (heads-up: the big blind).
3. The human chooses fold, check/call, raise, or all-in.
4. Each AI chooses a legal action through its own persona policy after a
   variable, seat-local behavior sequence. The sequence mixes snap decisions,
   normal deliberation, and rare tanks according to persona, street, price
   pressure, public preceding actions, and learned public tendencies. Its
   presentation corpus contains more than 250 curated public-information
   phrases, and each seat avoids reusing its most recent 36 visible cues.
5. When betting is closed, reveal the next board street.
6. Resolve folds or showdown, distribute the pot, and show the result.
7. Start the next hand while preserving stacks and rotating positions.
8. Persist per-AI context rewards and the public-action model each AI has built
   of the human player.

## Alternate path

- When every remaining opponent is all-in, run out the board without asking for
  redundant actions.
- When only one player remains, award the pot without showdown.
- When a player has insufficient chips to call, treat the action as all-in.

## Exception path

- An illegal or stale action is ignored and the legal-action set is recomputed.
- A malformed saved table falls back to a fresh session rather than blocking
  the page.
- Network loss does not interrupt a loaded hand because rules and AI are local.
- The module requests no device permissions.

## State machine

`restoring → dealing → awaiting-player | ai-thinking → ai-acting →
street-transition → showdown → hand-result → ai-learning → dealing`

Terminal session states are `player-busted` and `reset`.

`ai-thinking` has three presentation substates: `snap`, `measured`, and `tank`.
They change only the visible cadence and seat-local tells; the legal action
still comes from the independent AI policy engine.

## Dependencies

- Poker core: cards, hand evaluator, legal actions, settlement
- Local AI: five persona engines (value pressure, wide-range aggression, risk
  control, pot-odds calling, contextual mix)
- Local learning: per-street/position/pressure/strength/head-count policy
  memory, exploration decay, bounded personality adjustments, and public
  opponent observations
- Local session storage
- Table presentation and action controls

## Verification echo

The MVP is a continuous local practice table, not a scripted demo. It must
support multiple consecutive hands, legal action gating, automatic AI turns,
all-in runouts, and deterministic hand settlement. With the same cards and
price, the five personas must produce observably different action
distributions. Learning may tune a persona within its configured cap but must
not collapse all five opponents into the same strategy. Visible thinking must
not become a fixed loading timer: low-pressure decisions may be nearly
immediate, while river decisions and large prices may produce a longer,
occasionally self-correcting sequence. It may react to public actions, but
never private cards or a preselected action. Deterministic regression must lock
the exact six-handed and heads-up blind/action sequences, including short-stack
blind labels.
