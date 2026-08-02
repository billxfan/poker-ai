# Poker AI Rethink Contract

## Product truth

Build a local-first, single-player six-handed no-limit Texas Hold'em game that
feels like playing against five persistent human regulars. There are no
accounts, servers, real-money mechanics, ads, or multiplayer dependencies.

The product succeeds when opponents are recognisably different, make legal and
context-aware decisions from public information, remember exploitable player
patterns across hands, and adapt gradually without collapsing into one optimal
or erratic policy.

## Active delivery target

- Platform: responsive Web/PWA in `web/`
- Mode: MVP with production-grade poker rules and deterministic verification
- Language: Simplified Chinese first, English-ready
- Persistence: browser-local only
- `ios/` is a preserved reference client, not part of the active rewrite

## Hard engineering rules

1. Poker rules, legal actions, settlement, AI policy, learning, persistence,
   and presentation remain separate modules.
2. Every AI decision must be reproducible from an explicit seed and an
   inspectable decision trace; do not use ambient `Math.random()` in the core.
3. Bots may reason only from their hole cards, public table state, public action
   history, and their own persisted observations. Never leak hidden cards.
4. Learning changes bounded opponent beliefs and style parameters; it may not
   mutate poker rules or silently overwrite a bot's identity.
5. All decisions must be legal under the engine-provided action set.
6. Changes to rules, state schema, learning schema, or decision contracts require
   architecture and regression-test updates in the same change.
7. Visual polish may never hide turn state, bet size, pot composition, or the
   reason the player can/cannot act.

## Ownership map for focused agents

| Concern | Primary paths |
|---|---|
| Poker engine and public information model | `web/core/engine.ts`, `web/core/types.ts`, `web/core/evaluator.ts` |
| Bot policy, personality and decision traces | `web/core/ai*.ts`, `web/core/ai/` |
| Persistent learning and replay | `web/core/learning/`, `web/core/storage.ts` |
| Table experience and explainability UI | `web/app/` |
| Verification harness and critic fixtures | `web/tests/`, `web/tools/`, `web/docs/test-reports/` |

Agents must not make overlapping edits concurrently. Coupled changes are owned
sequentially by one integrator after specialist recommendations are collected.

## Quality gates

- `npm test` passes from `web/`.
- Fixed-seed scenarios are bit-for-bit deterministic.
- Hidden-information leak tests pass.
- Each bot passes identity-separation and adaptation-bound tests.
- A scripted multi-hand session completes without illegal actions or deadlocks.
- Browser verification covers desktop and mobile table layouts.
- A critic review has no unresolved Critical or High findings.

