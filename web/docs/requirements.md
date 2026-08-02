# Poker AI — Humanlike Local Table Requirements

## Product promise

Poker AI is a private, local-first six-handed no-limit Texas Hold'em game for a
player who wants the psychological texture of a long-running home game without
waiting for other people. Five persistent opponents have stable identities,
reason from the same observable information a human at the table would have,
remember public behaviour across hands, and adapt gradually through bounded
reinforcement learning.

This is a game first and a training instrument second. It must feel like a table
of recurring characters, not a solver UI and not five difficulty sliders.

## Primary user

A desktop or mobile poker player who wants 10–30 minute private sessions,
recognisable opponents, credible betting pressure, and a sense that the table
remembers how they play. No account, network connection, poker database, or
real-money feature is required.

## Core loop

1. Resume the local table with the same five opponents and their accumulated
   memories.
2. Read hole cards, public board, position, stacks, pot, price and public action
   history.
3. Take one legal poker action.
4. Watch opponents deliberate and act at distinct, context-sensitive rhythms.
5. Reach fold resolution or showdown with correct main/side-pot settlement.
6. See a concise hand result and optional post-hand table read.
7. Opponents update bounded beliefs and action values from the completed hand.
8. Rotate the button and continue, preserving stacks, memories and identities.

## The five opponents

Each opponent has immutable identity anchors plus learnable parameters bounded
inside an identity envelope.

| Opponent | Identity anchor | Characteristic pressure | Adaptation ceiling |
|---|---|---|---|
| 老 K | disciplined tight-aggressive regular | strong ranges, delayed traps, value pressure | medium |
| 小马 | loose-aggressive tempo player | steals, isolation raises, multi-street pressure | medium-high |
| 大叔 | risk-averse nit | position discipline, pot control, rare credible aggression | low |
| 小鱼 | curious calling station | wide calls, sticky pairs/draws, little bluffing | low |
| 狐狸 | balanced exploitative regular | changes sizing and bluff/value mix from table reads | high |

Success requires distributional separation, not different labels over one
shared threshold function.

## Information boundary

For every decision, a bot may receive only:

- its own hole cards;
- community cards;
- dealer/button and positions;
- all public stacks, committed chips, statuses and effective stack;
- pot, current bet, legal actions, minimum raise and pot odds;
- the chronological public action history for the current hand;
- its own persisted observations derived from earlier public actions and
  revealed showdown cards;
- an explicit deterministic random source.

It may never receive the deck order, unrevealed opponent hole cards, future
board cards, another bot's private memory, or a preselected winning action.

## Decision quality

The policy must account for, at minimum:

- preflop range strength and position;
- made-hand strength, draw equity approximation and board texture;
- number of active players;
- pot odds, stack-to-pot ratio and effective stack;
- initiative, number and size of previous bets/raises, and whether action is
  checked to the bot;
- opponent tendencies with confidence weighted by sample size;
- persona-specific risk, aggression, deception and sizing preferences;
- bounded exploration.

Every action returns an inspectable decision trace containing public factors,
persona factors, considered action scores, selected action and seed cursor.
Production UI exposes only a safe post-hand summary, not hidden live reasoning.

## Local reinforcement learning

MVP learning is a deterministic, persisted contextual-bandit system rather than
a neural network:

- context buckets describe street, position family, pressure, hand-strength
  bucket, heads-up/multiway state, SPR and opponent tendency;
- the bot selects among fold/passive/aggressive intents using persona priors,
  public-state features, learned action values and bounded exploration;
- after a hand, the selected actions receive a normalized chip-EV reward with
  a small showdown-information signal;
- learning rate and exploration decay with evidence;
- all learned offsets are clamped to the bot's identity envelope;
- schema is versioned and resettable independently from the chip session.

Learning must never guarantee improvement after every hand. It should become
more exploitative only when evidence accumulates, while retaining uncertainty
and personality.

## MVP modules

- Correct deterministic six-handed no-limit engine
- Public/private observation boundary
- Five persona policy engines and bet-sizing policies
- Per-bot opponent model from public history and showdowns
- Persisted contextual-bandit learning state and replay ledger
- Deterministic headless simulation harness
- Humanlike turn cadence tied to decision complexity
- Post-hand decision/story summary and opponent memory indicators
- Browser-local save, reset-table and reset-memories controls
- Responsive, accessible Web/PWA table

## Success criteria

### Poker correctness

- 10,000 seeded headless hands complete without an illegal action, deadlock,
  negative stack, duplicate card or chip conservation error.
- Blind order, heads-up order, minimum raises, short all-ins, cumulative reopen,
  split pots and multiple side pots have exact regression fixtures.

### Fair information

- Automated tests prove decision input contains no deck or opponent hole cards.
- With identical bot-visible state and seed, changing an unrevealed opponent hand
  or future deck cannot change the chosen action or trace.

### Personality

- Over fixed scenario suites, each pair of bots has a measurable action-profile
  distance and no two profiles collapse into the same distribution.
- Expected ordering holds across at least 2,000 decisions: 小马 is the most
  aggressive/widest, 大叔 the tightest, 小鱼 the most call-heavy, 狐狸 the most
  context-responsive, and 老 K the most value-selective.

### Learning

- Repeated public evidence that the human over-folds increases bluff pressure
  for adaptable bots; repeated calling reduces it.
- Updates are deterministic, sample-confidence weighted and remain inside each
  persona envelope after 10,000 synthetic hands.
- Resetting memories restores factory policy without resetting chips.

### Experience

- A player can complete consecutive hands entirely offline after first load.
- AI turn pacing is neither instantaneous noise nor a fixed timer; simple checks
  are fast and high-pressure river decisions are visibly slower.
- The table is usable at 360 px mobile width and standard desktop widths with
  keyboard, touch and reduced-motion support.

## Release bar

MVP uses real poker rules, policy, learning and persistence—no scripted action
sequences in the main loop. Critical and High findings from the independent
critic must be zero. Medium issues may remain only when recorded with a bounded
impact and a vNext owner.

## Out of scope

- Multiplayer, matchmaking, chat, spectators or leaderboards
- Accounts, cloud sync, remote inference or telemetry
- Real-money wagering, purchases, ads or rewards
- GTO solver integration, CFR training, GPU neural-network training
- Importing third-party hand histories or HUD databases
- Simultaneous rewrite of the preserved iOS client

## Version plan

- v0.2 Humanlike Core: observation boundary, distinct policies, deterministic
  contextual learning, replay harness and safe post-hand explanations.
- v0.3 Table Life: richer physical tells, dialogue restraint, session arcs and
  longitudinal opponent profile views.
- v1.0: calibrated large-sample policies, migration-safe saves, cross-browser
  performance and accessibility release gate.
