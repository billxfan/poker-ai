# Poker AI Web — Technical Architecture

## Decision inputs

The requirements specify an MVP, a single web platform, local-only data, no
accounts, and a game product. The architecture therefore uses a real local
gameplay core with no backend, database service, authentication layer, or
cross-platform runtime abstraction.

## Technology stack

- TypeScript 5.9
- React 19
- vinext / Next-compatible app surface on Vite
- CSS for the responsive table and motion
- Browser `localStorage` for versioned local snapshots
- Web App Manifest and a small service worker for offline shell caching
- Node's built-in test runner for core-rule tests

The app is a single route. Rendering is interactive and client-side; no
server-rendered identity or user-specific data is required.

## Module boundaries

```text
app/
  page.tsx                 product route
  PokerGame.tsx            client game shell
  globals.css              responsive visual system
core/
  types.ts                 cards, players, actions, game state
  cards.ts                 deck and card helpers
  evaluator.ts             five/seven-card hand comparison
  engine.ts                dealing, turns, streets, pot, settlement
  ai.ts                    local AI action policy
  storage.ts               versioned browser persistence
public/
  manifest.webmanifest
  sw.js
tests/
  poker-core.test.mjs
```

React components may dispatch game commands but do not calculate winners or
legal actions.

## State and data

`PokerGame` owns one serializable `GameState`. Core commands return the next
state rather than mutating React state in place. The state includes:

- players, positions, stacks, status, and hole cards
- deck, board, street, pot, current bet, and per-street contributions
- current actor, dealer button, hand number, and action log
- current result and session win/loss counters

Snapshots use a versioned envelope:

```ts
type SessionSnapshot = {
  version: 1;
  savedAt: string;
  game: GameState;
};
```

Invalid snapshots are ignored. Local save failure downgrades to an in-memory
session without blocking play.

## Internal contracts

```ts
createGame(seed?): GameState
startHand(state, seed?): GameState
legalActions(state, playerId): LegalActions
applyAction(state, action): GameState
advanceGame(state): GameState
evaluateBest(cards): EvaluatedHand
chooseAIAction(state, playerId): PlayerAction
loadSession(): GameState | null
saveSession(state): SaveResult
```

The AI receives only public table state plus its own hole cards. Randomness is
injectable so tests can be deterministic.

## Security and privacy boundary

- No authentication, cookies, identity headers, analytics, ads, or API calls
- No real-money or cash-out semantics
- Saved data never leaves the device
- Parsed local data is validated before use
- The app never asks for camera, microphone, location, notifications, or file
  access
- Resetting the session is the only destructive user action and requires
  confirmation

## Cache and offline strategy

The production shell and static assets are cache-first after the initial load.
The service worker uses a versioned cache and removes old cache versions on
activation. Gameplay state is not stored in the service-worker cache; it remains
in local storage.

## Architecture decisions

### ADR-001: TypeScript port instead of Swift-in-browser

Accepted. The SwiftUI presentation and observable game orchestration are
platform-specific. A TypeScript core gives a small browser bundle and familiar
open-source contribution path. Shared JSON fixtures will provide behavior
parity instead of shared source.

### ADR-002: No backend

Accepted. The requested game is offline and single-player. A backend would add
availability, privacy, deployment, and account concerns without improving the
core loop.

### ADR-003: Local storage for MVP

Accepted. The serialized session is small and written sequentially. IndexedDB
can replace it if detailed hand history becomes large in a later version.

### ADR-004: DOM/CSS table

Accepted. The table consists of semantic controls, cards, labels, and seats.
DOM/CSS provides better accessibility and responsive behavior than a canvas for
this MVP.

## Explicitly deferred

- Accounts, authentication, cloud sync, API routes, D1, and R2
- Multiplayer sockets and server-authoritative state
- Shared Rust/WASM engine
- Large hand-history database
- Ads, payments, and analytics

