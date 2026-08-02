# Audio Director

## Function

Turn deduplicated presentation events into compact procedural sounds with table,
alert, outcome and ambience layers controlled by one sound preference.

## Paths

| Path            | Flow                                                        | Result                                           |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Main            | presentation event → semantic cue → deterministic variation | one sound per event ID                           |
| Exception       | audio locked before first gesture                           | queue nothing; visual/text feedback remains      |
| Mute/background | sound off or page hidden                                    | cancel scheduled sources and suspend every layer |

## Director state

| Current   | Trigger                | Action                      | Next      |
| --------- | ---------------------- | --------------------------- | --------- |
| locked    | first user gesture     | resume AudioContext         | ready     |
| ready     | semantic event         | play through bus/compressor | ready     |
| ready     | mute/page hidden       | cancel and suspend          | suspended |
| suspended | unmute/visible gesture | resume                      | ready     |

Semantic cues: `deal`, `check`, `call`, `raise`, `fold`, `all-in`, `flop`,
`turn`, `river`, `showdown`, `pot-award`, `your-turn`, `win`, `lose`, `ui`.

Scenario: direct all-in settlement does not collide

- Given an all-in action immediately settles a hand
- When presentation events are consumed
- Then all-in receives a short lead-in
- And outcome cancels lower-priority table cues before playing once

## Dependencies

- Depends on: table-presentation events and browser AudioContext
- Used by: game screen sound controls
