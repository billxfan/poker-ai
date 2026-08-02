# Module: Local Session and Controls

## Entry and exit

- Entry: load table and learning records from separate versioned keys.
- Exit: save after each stable engine transition and completed learning update.

## Main path

1. Validate/migrate the table snapshot.
2. Validate/migrate each bot's memory independently.
3. Resume the exact actor and visible table state.
4. Persist immutable snapshots after legal transitions.
5. Offer separate controls for new table, reset memories and export a local
   diagnostic replay.

## Alternate paths

- No snapshot: start factory stacks and empty memories.
- Table valid, memory invalid: preserve the hand and reset only affected memory.
- Memory valid, table invalid: start a new table while retaining learned rivals.

## Exception paths

- Storage unavailable: remain playable in memory and show a quiet warning.
- Reset requested: require explicit confirmation describing exactly what is
  removed.
- Imported diagnostic data: never execute code or accept non-versioned records.
- No permissions or network requests are used.

## State machine

`unknown → loading → restored | partial-reset | fresh → ready ↔ saving`

Supporting confirmations are `confirm-new-table` and `confirm-reset-memories`.

## Dependencies

- Table serializer and validator
- Learning serializer, validator and migrations
- Browser `localStorage`
- Non-blocking status UI

## Verification echo

The recurring opponents survive a new chip session unless the player explicitly
resets their memories. Everything remains on the current device.

