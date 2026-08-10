import assert from "node:assert/strict";
import test from "node:test";
import {
  gameSoundsForPresentationEvent,
  outcomeSoundForHumanDelta,
} from "../app/gameAudio.ts";
import { performancesForEvent } from "../app/characterPresentation.ts";
import {
  choosePersonaDialogue,
  dialogueCatalogSize,
  FORBIDDEN_LIVE_DIALOGUE_TERMS,
  type DialogueTrigger,
} from "../core/dialogue.ts";
import {
  advancePersonaState,
  defaultPersonaState,
} from "../core/characterState.ts";
import { applyAction, createGame } from "../core/engine.ts";
import {
  buildPublicPresentationSnapshot,
  derivePresentationEvents,
  type PresentationEvent,
} from "../core/presentation.ts";
import type { AIArchetype, Card } from "../core/types.ts";

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
