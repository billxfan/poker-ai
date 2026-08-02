# Poker AI Humanlike Core — Technical Architecture

## Architecture derivation

Requirements signals are: MVP, one Web/PWA platform, game product, local-only
data, no account and no backend. Following the mapping rules, the architecture
keeps a real deterministic TypeScript gameplay core, browser persistence and a
thin React presentation. It deliberately does not introduce APIs, remote model
inference, authentication, cloud databases or a cross-platform shared runtime.

## Stack

- TypeScript 5.9 and Node's built-in test runner
- React 19 on the existing vinext/Vite client surface
- Semantic DOM/CSS for accessible responsive table presentation
- Versioned `localStorage` records for table and bot memories
- Service worker only for application-shell assets

## Ownership and dependency direction

```text
React table ──commands──> poker engine ──events──> table snapshot
     │                         │
     │                         └──> observation builder
     │                                  │
     └──safe cues/traces <── bot orchestrator <── persona + memory + RNG
                                             │
hand-complete public record + private episode ──> learning reducer
                                             │
                                      memory repository

simulation/critic harness depends on every core contract; core never depends on UI.
```

## Modules

### `core/engine.ts` — authoritative poker transition system

Owns blinds, seats, legal actions, immutable action application, street closure,
all-ins, pots and settlement. It may hold the full deck and every hole card.
Nothing outside the engine may apply chip or actor transitions.

### `core/observation.ts` — hidden-information anti-corruption layer

Builds a frozen `BotObservation` from `GameState`. The type contains the bot's
own hole cards and public state but cannot represent the deck or opponent hole
cards. It is the only state accepted by the new policy entry point.

```ts
type BotObservation = {
  observerId: number;
  holeCards: readonly Card[];
  board: readonly Card[];
  street: Street;
  seats: readonly PublicSeatState[];
  pot: number;
  currentBet: number;
  legal: LegalActions;
  actionHistory: readonly PublicAction[];
};
```

### `core/ai/` — policy and personality

- `features.ts`: pure public/private-observer feature extraction
- `personas.ts`: immutable priors, identity envelope and sizing vocabulary
- `policy.ts`: action scoring, contextual values and bounded exploration
- `trace.ts`: inspectable numerical trace plus safe post-hand summary
- `index.ts`: validate → score → legalize orchestration

The transitional `core/ai.ts` remains a compatibility facade until callers and
tests move to the observation contract.

### `core/learning/` — deterministic local reinforcement learning

- `types.ts`: versioned memory, opponent beliefs and contextual values
- `opponents.ts`: public-event observation and confidence metrics
- `reward.ts`: normalized final reward and temporal credit weights
- `reducer.ts`: incremental selected-action update with clamping
- `migrations.ts`: pure schema migration/reset

Learning is an offline contextual bandit. For context `c`, selected intent `a`,
reward `r`, visit count `n` and bounded learning rate `α`:

`Q(c,a) ← Q(c,a) + α × (r − Q(c,a))`

Only the chosen action value is updated. Persona contribution and learned
contribution are calculated separately, and the latter is clamped by the
persona's adaptation envelope.

### Persistence

Use separate records so a corrupt hand cannot destroy long-term rivals and a
memory reset cannot destroy chip state:

```ts
type TableEnvelope = { version: 2; savedAt: string; game: GameState };
type MemoryEnvelope = {
  version: 2;
  savedAt: string;
  bots: Record<number, BotMemory>;
};
```

Writes occur only after stable reducers. Unknown/corrupt records reset the
smallest affected boundary. IndexedDB is deferred until replay volume requires
it.

### Simulation and critic harness

`tests/` owns exact rules and metamorphic information-safety tests. `tools/`
owns long-running seeded simulations and behavioural metric reports. A failing
case serializes seed plus transition/decision trace so it is directly replayable.

## Decision request contract

```ts
type BotDecisionRequest = {
  observation: BotObservation;
  persona: Persona;
  memory: BotMemory;
  random: RandomSource;
};

type BotDecisionResult = {
  action: PlayerAction;
  trace: DecisionTrace;
  episodeStep: EpisodeStep;
};
```

The random source is explicit and seedable. Core policy code has no default
`Math.random()` path. React may use nondeterministic timing for presentation,
but timing never changes the selected poker action.

## State strategy

- Engine commands return the next serializable state.
- Bot decision and learning reducers are pure for the same inputs and seed.
- React owns orchestration state and presentation timers, not policy math.
- Public action history is chronological in decision contracts even if the UI
  renders newest-first.
- Decision traces are private during a hand; safe summaries become visible only
  after resolution.

## Security and fairness boundary

- No remote requests, telemetry, account, payment or real-money semantics
- Structural observation type excludes deck and opposing private cards
- Runtime development assertion rejects forbidden keys recursively
- Metamorphic test changes hidden state while holding observation/seed constant
- Parsed local data is range-checked and versioned
- Diagnostic export contains local game data and requires an explicit action

## Cache and performance

- Cache static shell/assets only; never cache gameplay or memory in the service worker.
- Feature extraction is linear in six seats and current-hand events.
- Bound action history, context buckets, opponent reads and snapshots.
- Long simulations run headlessly under Node, outside React.

## ADRs

### ADR-001 — Contextual bandit over neural-network RL

Accepted for MVP. It learns online from small local samples, is deterministic,
inspectable, cheap and clampable. Neural policies would be data-starved and
harder to prove free of hidden-information leaks.

### ADR-002 — Structural observation boundary

Accepted. Passing `GameState` plus a warning is insufficient because accidental
access remains possible. The policy accepts only a type that cannot represent
forbidden state.

### ADR-003 — Shared primitives, separate persona priors/envelopes

Accepted. Completely separate engines would duplicate poker math; one universal
threshold engine collapses identity. Shared features feed persona-specific score
weights, sizing vocabularies, exploration bounds and learning caps.

### ADR-004 — Separate table and memory persistence

Accepted. Opponents should survive a new chip session, and corruption/reset must
have the narrowest blast radius.

### ADR-005 — Keep the current UI shell during core replacement

Accepted. Existing responsive assets and table work are useful. Core contracts
are replaced first; visual changes follow only where they improve decisions,
memory visibility and humanlike cadence.

## Explicitly deferred

- CFR/GTO solving, neural-network training and WebGPU
- Cloud sync, accounts, remote inference and telemetry
- IndexedDB hand-history warehouse and third-party imports
- Multiplayer and server-authoritative anti-cheat
- iOS parity during the Humanlike Core milestone

