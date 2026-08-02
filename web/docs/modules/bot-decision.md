# Module: Bot Decision and Personality

## Entry and exit

- Entry: the table requests an action with a frozen `BotObservation`, persona,
  private memory snapshot and deterministic random source.
- Exit: return one legal `PlayerAction`, a private episode step and an auditable
  trace. The engine alone applies the action.

## Main path

1. Validate the observation schema and legal-action set.
2. Derive public features: position, pot odds, effective stack, SPR, initiative,
   street aggression, active opponents, board texture and action sequence.
3. Estimate private hand strength/range bucket without reading other hands.
4. Combine persona priors, hand/public features, opponent beliefs and learned
   context values into scores for fold, passive and aggressive intents.
5. Use bounded exploration, then map the intent into a persona-specific legal
   action and raise size.
6. Produce a safe presentation cue based on complexity; do not choose the
   action from the cue or use a fixed delay.

## Alternate paths

- Only one legal non-fold action: return it immediately with a forced trace.
- No call price: fold intent degrades to check.
- Aggression selected but raising unavailable: degrade to call/check rather
  than emit an illegal raise.
- Insufficient chips for desired sizing: choose legal all-in only when allowed.

## Exception paths

- Observation contains forbidden fields: fail closed in tests/development.
- Persona or memory missing: use the versioned factory persona with empty memory.
- Non-finite score/value: discard the learned offset and use persona prior.
- Decision exceeds time budget: local deterministic fallback selects the
  highest-scoring legal action; no network fallback exists.

## State machine

`received → validated → featurized → scored → explored | exploited → sized →
legalized → returned`

## Dependencies

- Public/private observation contract
- Persona registry
- Hand-strength and draw evaluator
- Opponent model and contextual value table
- Seeded random stream

## Verification echo

Five opponents use shared primitives but not one shared personality threshold.
Identical visible information and seed always yields the same action, regardless
of unrevealed cards elsewhere in the engine.

