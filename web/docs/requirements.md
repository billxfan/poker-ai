# Poker AI Web — MVP Requirements

## User and positioning

The primary user is a poker learner who wants a fast, private practice table on
desktop or mobile. Poker AI Web is an offline-first, single-player Texas
Hold'em trainer: one human plays against five local AI opponents with virtual
training chips.

## Core gameplay loop

1. Open the game and continue the local table automatically.
2. Review hole cards, community cards, pot, position, and current action.
3. Fold, check/call, raise, or go all-in.
4. Watch the five AI opponents act locally.
5. Resolve the hand, review the result, and start the next hand.

## MVP modules

- Responsive six-seat poker table
- Card, deck, hand-evaluation, and winner logic
- Betting-round state for pre-flop, flop, turn, and river
- Five lightweight local AI personalities
- Player action controls and raise sizing
- Hand result, recent action log, and session statistics
- Device-local autosave and new-session reset
- Offline-capable installable web experience

## Differentiation

- No account, sign-in, backend, or cloud dependency
- Open-source and privacy-first
- Fast practice against recognizable AI styles
- Shared behavioral test fixtures can keep the web and iOS rules aligned

## Success criteria

- A user can complete consecutive hands without a network connection after the
  first load.
- All six seats rotate positions and maintain independent chip stacks.
- Legal actions, pot totals, and winners are deterministic and testable.
- Reloading restores the current local session.
- The core table is usable at 360px mobile width and standard desktop widths.
- No authentication, analytics, ads, or remote data calls are present.

## Out of scope

- Registration, login, profiles, or cloud sync
- Multiplayer, rooms, chat, matchmaking, spectators, or leaderboards
- Real-money wagering, deposits, withdrawals, or purchasable chips
- Ads, rewarded videos, subscriptions, or storefronts
- Server-authoritative anti-cheat

## Release bar

This is an MVP. The main gameplay loop must be real rather than mocked, the
production build must succeed, and no critical gameplay or persistence defect
may remain. Visual polish may be lighter than the native iOS app, but controls
must be accessible by keyboard and touch.

## Version plan

- v0.1: playable six-seat table, local AI, hand resolution, and autosave
- v0.2: hand-history review, richer AI styles, statistics, and bilingual copy
- v1.0: rule parity fixtures with iOS, polished PWA install flow, and public
  open-source documentation
