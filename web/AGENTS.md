# Poker AI Web

## Product

Build an offline-first, single-player Texas Hold'em web game. One human plays
against five local AI opponents. The web version must not require accounts,
authentication, a backend, cloud sync, or real-money features.

## Delivery

- Delivery mode: MVP
- Platform: responsive web / installable PWA
- Primary language: Simplified Chinese
- Secondary language: English-ready
- Persistence: browser-local only

## Engineering rules

- Keep poker rules and AI decisions independent from React components.
- Treat the browser as untrusted only for future multiplayer work; this MVP has
  no multiplayer.
- Add deterministic tests for hand evaluation, betting order, raises, all-ins,
  split pots, and side pots.
- Preserve accessibility for keyboard, touch, and reduced-motion users.
- Do not introduce sign-in, identity headers, D1, R2, analytics, or ad SDKs.

## Commands

- `npm run dev` starts the local preview.
- `npm run build` validates the production bundle.
- `npm test` runs the project verification suite.
