# Table Presentation Events

## Function

Translate accepted public engine transitions into deterministic, deduplicated
presentation events. The poker engine remains unaware of animation, dialogue
and audio.

## Entry, exit and paths

| Path | Flow | Result |
|---|---|---|
| Main | accepted action → public snapshots differ → derive event | one action event with stable ID |
| Alternate | settlement follows all-in immediately | all-in lead-in, then higher-priority result event |
| Exception | illegal/rejected action or identical snapshots | no event, animation or sound |
| Recovery | restored save contains historical action log | establish baseline without replaying old events |

## Event state machine

| Current | Trigger | Action | Next |
|---|---|---|---|
| idle | accepted public action | enqueue stable event | queued |
| queued | consumer starts | mark event consumed | presenting |
| presenting | higher-priority result | cancel lower-priority gesture | presenting |
| presenting | duration complete | clear transient gesture | idle |
| any | new hand / leave table | cancel timers and queues | idle |

Scenario: rejected actions are silent

- Given an attempted action is rejected by `applyAction`
- When previous and next public snapshots are identical
- Then no `PresentationEvent` is emitted

## Allowed data

Seat statuses, public chip counts, current bet/pot, community cards, action log
without decision traces, current actor and settled payouts. Hole cards, deck,
policy traces and learning weights are forbidden.

## Dependencies

- Depends on: poker engine output and public action log
- Used by: character controller, dialogue engine and audio director

