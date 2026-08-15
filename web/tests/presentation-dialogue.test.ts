import assert from "node:assert/strict";
import test from "node:test";
import {
  gameSoundsForPresentationEvent,
  outcomeSoundForHumanDelta,
} from "../app/gameAudio.ts";
import { performancesForEvent } from "../app/characterPresentation.ts";
import {
  chooseInteractionDialogue,
  choosePersonaDialogue,
  dialogueCatalogSize,
  FORBIDDEN_LIVE_DIALOGUE_TERMS,
  type DialogueTrigger,
  type TableInteractionKind,
} from "../core/dialogue.ts";
import {
  advancePersonaState,
  defaultPersonaState,
  reactToTableInteraction,
} from "../core/characterState.ts";
import { applyAction, createGame } from "../core/engine.ts";
import {
  buildPublicPresentationSnapshot,
  derivePresentationEvents,
  type PresentationEvent,
} from "../core/presentation.ts";
import type { AIArchetype, Card } from "../core/types.ts";
import { automatedInteractionAfterResult } from "../core/tableSocial.ts";

const PERSONAS: AIArchetype[] = [
  "tight-aggressive",
  "loose-aggressive",
  "tight-weak",
  "loose-weak",
  "balanced",
];
const TRIGGERS: DialogueTrigger[] = [
  "turn",
  "check",
  "call",
  "raise",
  "all-in",
  "fold",
  "win",
  "lose",
];

test("public presentation snapshots strip every private poker field", () => {
  const game = createGame(401);
  const altered = structuredClone(game);
  altered.deck.reverse();
  altered.players.forEach((player, index) => {
    player.holeCards = [
      { rank: 2 + index, suit: "clubs" },
      { rank: 14 - index, suit: "diamonds" },
    ] as Card[];
  });

  const snapshot = buildPublicPresentationSnapshot(game);
  const changed = buildPublicPresentationSnapshot(altered);
  assert.deepEqual(snapshot, changed);
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /holeCards|deck|aiDecision|strengthBucket/);
});

test("an accepted action emits one stable public event and a rejected action emits none", () => {
  const game = createGame(403);
  const before = buildPublicPresentationSnapshot(game);
  const acceptedGame = applyAction(game, {
    playerId: game.currentActor!,
    type: "fold",
  });
  const accepted = derivePresentationEvents(
    before,
    buildPublicPresentationSnapshot(acceptedGame),
  ).filter((event) => event.kind === "action");
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].id, acceptedGame.actionLog[0].id);
  assert.equal(accepted[0].kind === "action" && accepted[0].action, "fold");
  assert.equal(accepted[0].kind === "action" && accepted[0].label, "弃牌");
  if (accepted[0].kind === "action") {
    assert.equal(
      performancesForEvent(accepted[0])[accepted[0].seatId]?.actionLabel,
      "弃牌",
    );
  }

  const rejectedGame = applyAction(game, { playerId: 0, type: "fold" });
  assert.equal(rejectedGame, game);
  assert.deepEqual(
    derivePresentationEvents(
      before,
      buildPublicPresentationSnapshot(rejectedGame),
    ),
    [],
  );
});

test("win and loss presentation cannot exist before public settlement", () => {
  let game = createGame(405);
  let previous = buildPublicPresentationSnapshot(game);
  for (const playerId of [2, 3, 4, 5]) {
    game = applyAction(game, { playerId, type: "fold" });
    const events = derivePresentationEvents(
      previous,
      buildPublicPresentationSnapshot(game),
    );
    assert.equal(
      events.some((event) => event.kind === "result"),
      false,
    );
    previous = buildPublicPresentationSnapshot(game);
  }
  game = applyAction(game, { playerId: 0, type: "fold" });
  const events = derivePresentationEvents(
    previous,
    buildPublicPresentationSnapshot(game),
  );
  const result = events.find((event) => event.kind === "result");
  assert.ok(result && result.kind === "result");
  assert.deepEqual(result.winnerIds, [1]);
});

test("settlement gives the human character visible win and loss feedback", () => {
  const event: PresentationEvent = {
    id: "hand:result",
    kind: "result",
    handId: "hand",
    winnerIds: [1],
    netBySeat: { 0: -90, 1: 110, 2: -20 },
    showdown: true,
    humanDelta: -90,
  };
  const performances = performancesForEvent(event);
  assert.equal(performances[0]?.gesture, "loss");
  assert.equal(performances[1]?.gesture, "win");
});

test("five persona catalogs are substantial, recognizable, safe, and deterministic", () => {
  const sampled = new Map<AIArchetype, Set<string>>();
  for (const persona of PERSONAS) {
    assert.ok(dialogueCatalogSize(persona) >= 32);
    const phrases = new Set<string>();
    for (const trigger of TRIGGERS) {
      for (let seed = 1; seed <= 80; seed += 1) {
        const first = choosePersonaDialogue({
          archetype: persona,
          trigger,
          seed,
        });
        const second = choosePersonaDialogue({
          archetype: persona,
          trigger,
          seed,
        });
        assert.deepEqual(first, second);
        if (!first) continue;
        assert.equal(first.kind, "speech");
        assert.ok([...first.text].length <= 18);
        FORBIDDEN_LIVE_DIALOGUE_TERMS.forEach((term) =>
          assert.equal(first.text.includes(term), false),
        );
        phrases.add(first.text);
      }
    }
    assert.ok(phrases.size >= 30);
    sampled.set(persona, phrases);
  }
  for (let left = 0; left < PERSONAS.length; left += 1) {
    for (let right = left + 1; right < PERSONAS.length; right += 1) {
      const overlap = [...sampled.get(PERSONAS[left])!].filter((phrase) =>
        sampled.get(PERSONAS[right])!.has(phrase),
      );
      // A few shared words such as “过” and “行” make the table sound human.
      // Most of each seat's sampled vocabulary must still belong to that seat.
      assert.ok(overlap.length <= 4);
      assert.ok(
        overlap.length / Math.min(
          sampled.get(PERSONAS[left])!.size,
          sampled.get(PERSONAS[right])!.size,
        ) < 0.14,
      );
    }
  }
});

test("quiet and chatty personas have deterministic but different silence rates", () => {
  const spokenTurns = (archetype: AIArchetype) =>
    Array.from({ length: 500 }, (_, index) =>
      choosePersonaDialogue({ archetype, trigger: "turn", seed: index + 1 }),
    ).filter(Boolean).length;

  const oldK = spokenTurns("tight-aggressive");
  const littleFish = spokenTurns("loose-weak");
  assert.ok(littleFish > oldK + 100);
  assert.ok(oldK > 100 && littleFish < 450);
});

test("English dialogue mode keeps every persona response in English", () => {
  for (const persona of PERSONAS) {
    for (const trigger of TRIGGERS) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const choice = choosePersonaDialogue({
          archetype: persona,
          trigger,
          seed,
          locale: "en",
          allowSilence: false,
        });
        assert.ok(choice);
        assert.equal(/\p{Script=Han}/u.test(choice.text), false);
        ["range", "combos", "effective stack", "pot control", "betting line"].forEach(
          (term) => assert.equal(choice.text.toLowerCase().includes(term), false),
        );
      }
    }
  }
});

test("contextual dialogue adds street, heads-up, and short-stack vocabulary", () => {
  const lines = new Set(
    Array.from({ length: 300 }, (_, index) =>
      choosePersonaDialogue({
        archetype: "balanced",
        trigger: "turn",
        seed: index + 1,
        allowSilence: false,
        context: {
          street: "river",
          activePlayerCount: 2,
          stackInBigBlinds: 14,
        },
      }),
    ).flatMap((choice) => (choice ? [choice.text] : [])),
  );

  assert.ok(lines.has("河牌了，最后一次。"));
  assert.ok(lines.has("就剩我们俩。"));
  assert.ok(lines.has("我后面不多。"));
});

test("action dialogue adds natural lines for public pressure and late-street contexts", () => {
  const collect = (trigger: DialogueTrigger, context: Parameters<typeof choosePersonaDialogue>[0]["context"]) =>
    new Set(
      Array.from({ length: 320 }, (_, index) =>
        choosePersonaDialogue({
          archetype: "balanced",
          trigger,
          seed: index + 901,
          allowSilence: false,
          context,
        })?.text,
      ).filter((line): line is string => !!line),
    );

  assert.ok(
    collect("call", { pressure: 0.7 }).has("这个价，得看一眼。"),
  );
  const late = collect("fold", {
    pressure: 0.7,
    street: "river",
    activePlayerCount: 2,
    stackInBigBlinds: 12,
  });
  assert.ok(late.has("这次不替你买单。"));
  assert.ok(late.has("河牌的账，河牌算。"));
  assert.ok(late.has("就咱俩，别绕圈子。"));
  assert.ok(late.has("这点筹码也有脾气。"));
});

test("all four interactions have distinct bilingual sender and receiver lines", () => {
  const kinds: TableInteractionKind[] = ["egg", "tomato", "flower", "slipper"];
  for (const locale of ["zh-CN", "en"] as const) {
    for (const persona of PERSONAS) {
      for (const kind of kinds) {
        const sender = new Set(
          Array.from({ length: 40 }, (_, seed) =>
            chooseInteractionDialogue({
              archetype: persona,
              kind,
              role: "sender",
              seed,
              locale,
            }).text,
          ),
        );
        const receiver = new Set(
          Array.from({ length: 40 }, (_, seed) =>
            chooseInteractionDialogue({
              archetype: persona,
              kind,
              role: "receiver",
              seed,
              locale,
            }).text,
          ),
        );
        assert.ok(sender.size >= 5);
        assert.ok(receiver.size >= 5);
        assert.equal([...sender].some((line) => receiver.has(line)), false);
        if (locale === "en") {
          assert.equal(
            [...sender, ...receiver].some((line) => /\p{Script=Han}/u.test(line)),
            false,
          );
        }
      }
    }
  }
});

test("settlement interactions let bots target both the user and another bot", () => {
  const players = createGame(407).players;
  const findInteraction = (winnerId: number) => {
    for (let index = 0; index < 500; index += 1) {
      const event: Extract<PresentationEvent, { kind: "result" }> = {
        id: `social-${winnerId}-${index}:result`,
        kind: "result",
        handId: `social-${index}`,
        winnerIds: [winnerId],
        netBySeat: Object.fromEntries(
          players.map((player) => [player.id, player.id === winnerId ? 500 : -100]),
        ),
        showdown: true,
        humanDelta: winnerId === 0 ? 500 : -100,
      };
      const interaction = automatedInteractionAfterResult(event, players);
      if (interaction) return interaction;
    }
    return null;
  };

  const towardUser = findInteraction(0);
  const towardBot = findInteraction(2);
  assert.ok(towardUser);
  assert.equal(towardUser.targetId, 0);
  assert.notEqual(towardUser.sourceId, 0);
  assert.ok(towardBot);
  assert.equal(towardBot.targetId, 2);
  assert.notEqual(towardBot.sourceId, 0);
  assert.notEqual(towardBot.sourceId, towardBot.targetId);
});

test("public results create short-lived emotion and an ongoing mutter topic", () => {
  const largeLoss: PresentationEvent = {
    id: "hand:result",
    kind: "result",
    handId: "hand",
    winnerIds: [0],
    netBySeat: { 0: 320, 4: -320 },
    showdown: true,
    humanDelta: 320,
  };
  let state = advancePersonaState(defaultPersonaState(), largeLoss, 4);
  assert.equal(state.emotion, "irritated");
  assert.equal(state.monologueTopic, "rough-run");
  assert.equal(state.topicHandsLeft, 3);

  const lines = new Set(
    Array.from({ length: 80 }, (_, index) =>
      choosePersonaDialogue({
        archetype: "loose-weak",
        trigger: "turn",
        seed: index + 1,
        allowSilence: false,
        context: { personaState: state },
      }),
    ).flatMap((choice) => (choice ? [choice.text] : [])),
  );
  assert.ok(lines.has("我都输好几手啦。"));
  assert.ok(lines.has("怎么还不来呀。"));

  const nextDeal: PresentationEvent = {
    id: "next:deal",
    kind: "deal",
    handId: "next",
    cardCount: 12,
  };
  state = advancePersonaState(state, nextDeal, 4);
  assert.equal(state.topicHandsLeft, 2);
  state = advancePersonaState(state, nextDeal, 4);
  state = advancePersonaState(state, nextDeal, 4);
  assert.equal(state.monologueTopic, null);
});

test("table interactions change only a bot's short-lived social presentation", () => {
  const neutral = defaultPersonaState();
  const needled = reactToTableInteraction(neutral, "tomato");
  assert.equal(needled.emotion, "irritated");
  assert.equal(needled.monologueTopic, "rough-run");
  assert.equal(needled.topicHandsLeft, 1);
  assert.ok(needled.arousal > neutral.arousal);

  const encouraged = reactToTableInteraction(needled, "flower");
  assert.equal(encouraged.emotion, "confident");
  assert.equal(encouraged.monologueTopic, "rough-run");
  assert.ok(encouraged.arousal > needled.arousal);
});

test("dialogue selector respects recent phrase and semantic-family cooldowns", () => {
  const first = choosePersonaDialogue({
    archetype: "balanced",
    trigger: "raise",
    seed: 11,
  })!;
  const second = choosePersonaDialogue({
    archetype: "balanced",
    trigger: "raise",
    seed: 11,
    recentIds: [first.id],
    recentFamilies: [first.family],
  })!;
  assert.notEqual(second.id, first.id);
  assert.notEqual(second.family, first.family);
});

test("presentation events cover fourteen distinguishable semantic audio cues", () => {
  const base = { handId: "audio-hand" };
  const events: PresentationEvent[] = [
    { ...base, id: "deal", kind: "deal", cardCount: 12 },
    ...(["check", "call", "raise", "fold", "all-in"] as const).map(
      (action) => ({
        ...base,
        id: `action:${action}`,
        kind: "action" as const,
        seatId: 1,
        action,
        amount: 20,
        street: "flop" as const,
      }),
    ),
    ...(["flop", "turn", "river"] as const).map((street) => ({
      ...base,
      id: `street:${street}`,
      kind: "street" as const,
      street,
      cardCount: street === "flop" ? 3 : 1,
    })),
    { ...base, id: "your-turn", kind: "your-turn", seatId: 0 as const },
    {
      ...base,
      id: "result:win",
      kind: "result",
      winnerIds: [0],
      netBySeat: { 0: 100 },
      showdown: true,
      humanDelta: 100,
    },
    {
      ...base,
      id: "result:lose",
      kind: "result",
      winnerIds: [1],
      netBySeat: { 0: -100, 1: 100 },
      showdown: false,
      humanDelta: -100,
    },
  ];
  const sounds = new Set(events.flatMap(gameSoundsForPresentationEvent));
  assert.deepEqual(
    [...sounds].sort(),
    [
      "all-in",
      "call",
      "check",
      "deal",
      "flop",
      "fold",
      "lose",
      "pot-award",
      "raise",
      "river",
      "showdown",
      "street-turn",
      "win",
      "your-turn",
    ].sort(),
  );
});

test("win jingles scale with the size of the human result", () => {
  assert.equal(outcomeSoundForHumanDelta(-1), "lose");
  assert.equal(outcomeSoundForHumanDelta(120), "win");
  assert.equal(outcomeSoundForHumanDelta(480), "win-medium");
  assert.equal(outcomeSoundForHumanDelta(1_200), "win-big");
});
