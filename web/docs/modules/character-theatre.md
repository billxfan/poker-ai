# Character Theatre

## Function

Make five persistent opponents readable as distinct performers through posture,
pseudo-3D depth, gesture, light, expression overlays and result choreography.

## Character state

Two orthogonal layers avoid a combinatorial state machine:

- Posture: `idle | ready | thinking | all-in-wait | folded | out`
- Gesture: `none | check | call | raise | all-in | fold | win | loss`

Gesture priority is `win/loss > all-in > raise/fold > call/check`. A stable
event ID can start a gesture once; the next higher-priority event may interrupt.

## Paths

| Path | Flow | Result |
|---|---|---|
| Main | public event → persona motion recipe → transient gesture | visible response within 150 ms |
| Alternate | reduced-motion enabled | light, expression badge and short fade replace translation/rotation |
| Exception | asset unavailable | base character remains, state badge and table feedback still communicate action |
| Mobile | narrow table | smaller travel distance and effect radius | no overlap with cards or controls |

Scenario: result never leaks early

- Given the hand remains in `playing`
- When a player is all-in
- Then the player may enter `all-in-wait`
- And no player may enter `win` or `loss` until settlement is public

## Persona motion signatures

- 老 K: minimal whole-body tilt, precise chip pull, restrained gold result glow
- 小马: fast forward snap, energetic chip push, elastic recovery
- 大叔: connected double-take, shoulder tuck, relieved backward fold
- 小鱼: eager lean, small bounce, wide-eye surprise
- 狐狸: slow asymmetric lean, still gaze, controlled flourish

## Dependencies

- Depends on: table-presentation events and static character assets
- Used by: game table seat rendering and accessibility live region
