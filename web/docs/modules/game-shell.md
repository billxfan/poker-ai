# Module: Game Shell

## Entry and exit

- Entry: the root route opens directly into the game.
- Exit: browser or installed-app close.

## Main path

1. Show the table, hand number, pot, and local/offline status.
2. Keep the human action dock reachable on touch and desktop.
3. Provide recent actions and session statistics without leaving the hand.
4. Announce result and offer the next hand.

## Alternate path

- Compact mobile layout collapses secondary information while keeping cards,
  pot, and actions visible.
- Reduced-motion users receive instant state changes without chip or card
  movement.

## Exception path

- If the viewport is extremely short, the table becomes vertically scrollable
  and the action dock remains sticky.
- Unsupported PWA installation does not affect normal browser play.
- No login, notification, camera, location, or clipboard permission is asked.

## State machine

`booting → table → result-overlay → table`

Supporting overlays are `action-log`, `session-info`, and `reset-confirmation`.

## Dependencies

- Game-table state
- Local-session status
- Responsive CSS and accessible React controls

## Verification echo

The first screen is the game itself. Product chrome stays minimal, and no
authentication or onboarding blocks the first hand.

