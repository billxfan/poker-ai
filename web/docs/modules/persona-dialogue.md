# Persona Dialogue

## Function

Select short, deterministic, persona-specific physical tells, public action
barks and result reactions without pretending to expose strategy reasoning.

## Dialogue phases

`turn-tell | after-action | hand-result`. Turn tells cannot inspect or reference
the pending action. Action barks only receive an already accepted public action.
Result reactions only receive settled public net results.

## Paths

| Path | Flow | Result |
|---|---|---|
| Main | public context + persona + seed + memory → filter → weighted pick | one phrase of at most 18 Han characters |
| Alternate | no eligible phrase after cooldown | physical tell or silence |
| Exception | forbidden context/key or pre-action action bark | development assertion and no output |
| History flavour | sufficient public sample and cooldown elapsed | uncertain “最近/看起来” read phrase |

## Memory state

`recentPhraseIds[24]`, `recentFamilies[8]`, `lastSpokenActionSequence`,
`lastReadHand`, `lastMomentumHand`. The same phrase is blocked for twelve speaker
utterances and the same semantic family for three actions.

Scenario: hidden cards cannot change dialogue

- Given identical public dialogue context and seed
- When deck, private cards and decision traces are replaced
- Then selected phrase and phrase metadata remain identical

## Dependencies

- Depends on: table-presentation event, persona ID and public read summary
- Used by: character speech bubble and accessible live status

