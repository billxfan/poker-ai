# Module: Simulation and Critic Gate

## Entry and exit

- Entry: a named scenario suite, seed range, policy/memory version and expected
  invariants or behavioural envelopes.
- Exit: machine-readable metrics, failing replays and a critic report ranked by
  severity.

## Main path

1. Run fixed poker-rule fixtures.
2. Run hidden-information metamorphic tests.
3. Simulate thousands of decisions/hands per persona with deterministic seeds.
4. Measure legality, completion, chip conservation, action mix, sizing, position
   sensitivity, opponent sensitivity and adaptation drift.
5. Compare metrics with persona envelopes and baseline tolerances.
6. Give the independent critic replay examples and product screenshots.
7. Block release on Critical/High findings; rerun relevant suites after fixes.

## Alternate paths

- Performance-only change: require exact decision/replay equivalence.
- Intentional policy calibration: update behavioural baselines only with a
  written rationale and before/after metrics.
- Visual-only change: preserve core replay hashes and run browser screenshots.

## Exception paths

- Nondeterministic replay: fail immediately and print the first divergent step.
- Simulation loop: print seed, hand and last transitions; treat as Critical.
- Missing browser capture: core gates continue, but release remains unapproved.
- Baseline update without rationale: reject it as test laundering.

## State machine

`queued → rules → information-safety → simulation → browser → critic →
passed | rejected → fixed → queued`

## Dependencies

- Deterministic engine and policy
- Replay serialization
- Node test runner
- Browser verification harness
- Critic rubric

## Verification echo

“All Agents are impressed” is not a feeling-based stop condition. It means the
critic has no Critical/High defect and all quantitative gates pass on reproducible
evidence.

