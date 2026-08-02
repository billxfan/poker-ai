# Module: Local Session

## Entry and exit

- Entry: load the versioned browser record during page initialization.
- Exit: save after every stable user or AI action and on hand completion.

## Main path

1. Read a versioned session snapshot.
2. Validate the expected shape and numeric ranges.
3. Restore stacks, cards, street, pot, action log, and session statistics.
4. Persist changes locally as gameplay advances.

## Alternate path

- If no snapshot exists, create a table with default stacks.
- The user can explicitly start a new session from the table menu.

## Exception path

- Corrupt or incompatible data is discarded and replaced with a fresh session.
- Browser storage failure keeps the current in-memory game playable and shows a
  non-blocking local-save warning.
- Reset requires explicit confirmation because it removes the current session.
- No network, account, or storage permission prompt is used.

## State machine

`unknown → loading → restored | fresh → saving ↔ ready`

Failure transitions are `loading → fresh` and `saving → memory-only`.

## Dependencies

- Browser `localStorage` for the first MVP
- Poker table state serializer
- Session version and validation helpers

## Verification echo

All user data remains on the current device. There is no identity, backend,
cloud sync, analytics stream, or remote save.

