# AI Persona and Learning Regression — 2026-07-29

## Scope

- Five native-inspired AI persona profiles
- Distinct decision policies and bet sizing
- Per-context reinforcement memory and bounded learning curves
- Public opponent observation and exploration decay
- Variable seat-local thinking sequences
- Full-hand rules regression

## Automated verification

- 30 deterministic tests pass.
- 200 seeded full-hand simulations settle without loops, illegal actions, chip
  creation, or chip loss.
- Persona distribution test uses the same public spot and same cards for every
  AI. The loose-aggressive player raises materially more than the
  tight-aggressive player; the tight-weak player folds materially more than the
  calling station; the calling station calls materially more than the balanced
  player.
- A 120-hand repeated-feedback test confirms that context memory is created,
  biases remain within `[-1, 1]`, snapshots are capped at 60, and exploration
  decays without crossing the persona minimum.
- 160 seeded thinking plans produce all lengths from 3–6 stages, more than 130
  distinct copy sequences, more than 140 distinct total timings, and a timing
  spread greater than 2.2 seconds.

## Build checks

- Production build passes.
- TypeScript no-emit check passes.
- ESLint passes.

## Compatibility

- Existing saved sessions receive the current persona definitions on restore.
- Existing AI statistics without learning fields receive an empty compatible
  learning state instead of failing to render.
