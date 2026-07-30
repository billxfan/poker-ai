import assert from "node:assert/strict";
import test from "node:test";
import { AI_ENGINE_NAMES, chooseAIAction } from "../core/ai.ts";
import {
  currentAIExplorationRate,
  defaultAILearningState,
  updateAILearningAfterHand,
} from "../core/aiLearning.ts";
import { aiStyleForPlayerId } from "../core/aiProfiles.ts";
import { createAIThinkingPlan } from "../core/aiThinking.ts";
import { AI_THINKING_PHRASE_LIBRARY_SIZE } from "../core/aiThinkingPhrases.ts";
import { compareHands, evaluateBest, evaluateFive } from "../core/evaluator.ts";
import {
  applyAction,
  AI_REBUY_CHIPS,
  contributionPots,
  createGame,
  legalActions,
  rebuyHumanAndStartNextHand,
  settleShowdown,
  startNewHand,
  STARTING_CHIPS,
} from "../core/engine.ts";
import { rankLabel, seededRandom } from "../core/cards.ts";
import { recordCompletedHand, type LocalProfile } from "../core/profile.ts";
import type { Card } from "../core/types.ts";

function card(rank: number, suit: Card["suit"]): Card {
  return { rank, suit };
}

test("renders rank ten as 10 instead of poker shorthand T", () => {
  assert.equal(rankLabel(10), "10");
});

test("recognizes a royal-high straight flush", () => {
  const hand = evaluateBest([
    card(14, "spades"),
    card(13, "spades"),
    card(12, "spades"),
    card(11, "spades"),
    card(10, "spades"),
    card(2, "hearts"),
    card(3, "clubs"),
  ]);

  assert.equal(hand.category, 8);
  assert.deepEqual(hand.values, [14]);
});

test("recognizes the five-high wheel straight", () => {
  const hand = evaluateBest([
    card(14, "spades"),
    card(2, "hearts"),
    card(3, "clubs"),
    card(4, "diamonds"),
    card(5, "spades"),
  ]);

  assert.equal(hand.categoryName, "顺子");
  assert.deepEqual(hand.values, [5]);
});

test("recognizes every standard Hold'em hand category", () => {
  const cases: Array<{ name: string; cards: Card[] }> = [
    {
      name: "高牌",
      cards: [
        card(14, "spades"),
        card(11, "hearts"),
        card(9, "clubs"),
        card(6, "diamonds"),
        card(2, "spades"),
      ],
    },
    {
      name: "一对",
      cards: [
        card(14, "spades"),
        card(14, "hearts"),
        card(9, "clubs"),
        card(6, "diamonds"),
        card(2, "spades"),
      ],
    },
    {
      name: "两对",
      cards: [
        card(14, "spades"),
        card(14, "hearts"),
        card(9, "clubs"),
        card(9, "diamonds"),
        card(2, "spades"),
      ],
    },
    {
      name: "三条",
      cards: [
        card(14, "spades"),
        card(14, "hearts"),
        card(14, "clubs"),
        card(6, "diamonds"),
        card(2, "spades"),
      ],
    },
    {
      name: "顺子",
      cards: [
        card(10, "spades"),
        card(9, "hearts"),
        card(8, "clubs"),
        card(7, "diamonds"),
        card(6, "spades"),
      ],
    },
    {
      name: "同花",
      cards: [
        card(14, "spades"),
        card(11, "spades"),
        card(9, "spades"),
        card(6, "spades"),
        card(2, "spades"),
      ],
    },
    {
      name: "葫芦",
      cards: [
        card(14, "spades"),
        card(14, "hearts"),
        card(14, "clubs"),
        card(9, "diamonds"),
        card(9, "spades"),
      ],
    },
    {
      name: "四条",
      cards: [
        card(14, "spades"),
        card(14, "hearts"),
        card(14, "clubs"),
        card(14, "diamonds"),
        card(9, "spades"),
      ],
    },
    {
      name: "同花顺",
      cards: [
        card(10, "spades"),
        card(9, "spades"),
        card(8, "spades"),
        card(7, "spades"),
        card(6, "spades"),
      ],
    },
  ];

  assert.deepEqual(
    cases.map(({ cards }) => evaluateFive(cards).categoryName),
    cases.map(({ name }) => name),
  );
});

test("compares equal categories using all required kickers", () => {
  const aceKingKicker = evaluateFive([
    card(10, "spades"),
    card(10, "hearts"),
    card(14, "clubs"),
    card(13, "diamonds"),
    card(4, "spades"),
  ]);
  const aceQueenKicker = evaluateFive([
    card(10, "clubs"),
    card(10, "diamonds"),
    card(14, "hearts"),
    card(12, "spades"),
    card(9, "hearts"),
  ]);

  assert.equal(compareHands(aceKingKicker, aceQueenKicker), 1);
});

test("creates six seats, posts blinds, and deals private cards", () => {
  const game = createGame(42);

  assert.equal(game.players.length, 6);
  assert.equal(game.players.every((player) => player.holeCards.length === 2), true);
  assert.equal(game.pot, 30);
  assert.equal(
    game.players.reduce((sum, player) => sum + player.chips, 0) + game.pot,
    STARTING_CHIPS * 6,
  );
  assert.notEqual(game.currentActor, null);
});

test("six-handed blinds and action order follow standard Hold'em on every street", () => {
  let game = createGame(53);

  assert.equal(game.dealerId, 5);
  assert.deepEqual(
    game.players.map((player) => player.position),
    ["SB", "BB", "UTG", "HJ", "CO", "BTN"],
  );
  assert.equal(game.players[0].lastAction, "小盲 10");
  assert.equal(game.players[1].lastAction, "大盲 20");

  const actorOrderByStreet = {
    preflop: [] as number[],
    flop: [] as number[],
    turn: [] as number[],
    river: [] as number[],
  };

  while (game.phase === "playing") {
    const actor = game.currentActor;
    assert.notEqual(actor, null);
    actorOrderByStreet[game.street].push(actor!);
    const legal = legalActions(game, actor!);
    game = applyAction(game, {
      playerId: actor!,
      type: legal.canCheck ? "check" : "call",
    });
  }

  assert.deepEqual(actorOrderByStreet.preflop, [2, 3, 4, 5, 0, 1]);
  assert.deepEqual(actorOrderByStreet.flop, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(actorOrderByStreet.turn, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(actorOrderByStreet.river, [0, 1, 2, 3, 4, 5]);

  const nextHand = startNewHand(game, 59, true, false);
  assert.equal(nextHand.dealerId, 0);
  assert.deepEqual(
    nextHand.players.map((player) => player.position),
    ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  );
  assert.equal(nextHand.currentActor, 3);
});

test("heads-up dealer posts the small blind and acts first preflop", () => {
  let game = createGame(61);
  game.players.forEach((player) => {
    if (player.id !== 0 && player.id !== 5) {
      player.chips = 0;
      player.status = "out";
    }
  });
  game.dealerId = 0;

  game = startNewHand(game, 67, false, false);

  assert.equal(game.players[0].position, "BTN/SB");
  assert.equal(game.players[0].bet, 10);
  assert.equal(game.players[0].lastAction, "小盲 10");
  assert.equal(game.players[5].position, "BB");
  assert.equal(game.players[5].bet, 20);
  assert.equal(game.players[5].lastAction, "大盲 20");
  assert.equal(game.currentActor, 0);

  game = applyAction(game, { playerId: 0, type: "call" });
  assert.equal(game.currentActor, 5);
  game = applyAction(game, { playerId: 5, type: "check" });
  assert.equal(game.street, "flop");
  assert.equal(game.currentActor, 5);
});

test("rejects an action from a player who is not the current actor", () => {
  const game = createGame(7);
  const wrongId = game.currentActor === 0 ? 1 : 0;
  const updated = applyAction(game, { playerId: wrongId, type: "fold" });

  assert.equal(updated, game);
});

test("folding moves action to the next eligible seat", () => {
  const game = createGame(19);
  const actor = game.currentActor!;
  const updated = applyAction(game, { playerId: actor, type: "fold" });

  assert.equal(updated.players[actor].status, "folded");
  assert.notEqual(updated.currentActor, actor);
});

test("all-in never creates negative chips", () => {
  const game = createGame(29);
  const actor = game.currentActor!;
  const legal = legalActions(game, actor);
  assert.equal(legal.canAllIn, true);

  const updated = applyAction(game, { playerId: actor, type: "all-in" });
  assert.equal(updated.players[actor].chips, 0);
  assert.equal(updated.players[actor].status, "all-in");
  assert.equal(updated.players.every((player) => player.chips >= 0), true);
});

test("a complete check-call hand reaches settlement and conserves chips", () => {
  let game = createGame(83);
  let actions = 0;

  while (game.phase === "playing" && actions < 100) {
    const actor = game.currentActor;
    assert.notEqual(actor, null);
    const legal = legalActions(game, actor!);
    if (legal.canCheck) {
      game = applyAction(game, { playerId: actor!, type: "check" });
    } else if (legal.canCall) {
      game = applyAction(game, { playerId: actor!, type: "call" });
    } else {
      game = applyAction(game, { playerId: actor!, type: "fold" });
    }
    actions += 1;
  }

  assert.equal(game.phase, "result");
  assert.notEqual(game.result, null);
  assert.equal(game.communityCards.length, 5);
  assert.equal(game.pot, 0);
  assert.equal(
    game.players.reduce((sum, player) => sum + player.chips, 0),
    STARTING_CHIPS * 6,
  );
  assert.ok(actions < 100);
});

test("a legal full raise reopens action at the correct target", () => {
  const game = createGame(101);
  const actor = game.currentActor!;
  const legal = legalActions(game, actor);
  const target = legal.minRaiseTarget;
  const raised = applyAction(game, {
    playerId: actor,
    type: "raise",
    amount: target,
  });

  assert.equal(raised.players[actor].bet, target);
  assert.equal(raised.currentBet, target);
  assert.equal(raised.minimumRaiseIncrement, target - 20);
  assert.notEqual(raised.currentActor, actor);
});

test("a short all-in raise does not reopen betting to a player who already acted", () => {
  let game = createGame(103);
  assert.equal(game.currentActor, 2);

  game = applyAction(game, { playerId: 2, type: "raise", amount: 100 });
  game.players[3].chips = 130;
  game = applyAction(game, { playerId: 3, type: "all-in" });
  assert.equal(game.currentBet, 130);
  assert.equal(game.minimumRaiseIncrement, 80);

  for (const playerId of [4, 5, 0, 1]) {
    assert.equal(game.currentActor, playerId);
    game = applyAction(game, { playerId, type: "call" });
  }

  assert.equal(game.currentActor, 2);
  assert.equal(legalActions(game, 2).canCall, true);
  assert.equal(legalActions(game, 2).canRaise, false);
  assert.equal(legalActions(game, 2).canAllIn, false);
});

test("cumulative short all-ins reopen betting after a full raise amount is reached", () => {
  let game = createGame(107);
  game = applyAction(game, { playerId: 2, type: "raise", amount: 100 });
  game.players[3].chips = 130;
  game = applyAction(game, { playerId: 3, type: "all-in" });
  game.players[4].chips = 180;
  game = applyAction(game, { playerId: 4, type: "all-in" });

  for (const playerId of [5, 0, 1]) {
    assert.equal(game.currentActor, playerId);
    game = applyAction(game, { playerId, type: "call" });
  }

  assert.equal(game.currentActor, 2);
  assert.equal(game.currentBet, 180);
  assert.equal(legalActions(game, 2).canRaise, true);
});

test("an underfunded big blind still establishes the full preflop bring-in", () => {
  let game = createGame(108);
  game.players[1].chips = 5;
  game = startNewHand(game, 108, false);

  assert.equal(game.players[1].position, "BB");
  assert.equal(game.players[1].bet, 5);
  assert.equal(game.players[1].status, "all-in");
  assert.equal(game.currentBet, 20);
  assert.equal(legalActions(game, 2).callAmount, 20);
});

test("an underfunded small blind is still labelled as the small blind", () => {
  let game = createGame(109);
  game.players[0].chips = 5;
  game = startNewHand(game, 109, false, false);

  assert.equal(game.players[0].position, "SB");
  assert.equal(game.players[0].bet, 5);
  assert.equal(game.players[0].status, "all-in");
  assert.equal(game.players[0].lastAction, "小盲 5");
});

test("side-pot layers include only eligible non-folded players", () => {
  const game = createGame(109);
  const contributions = [50, 100, 100, 0, 0, 0];
  game.players.forEach((player, index) => {
    player.totalContribution = contributions[index];
    player.status = index === 1 ? "folded" : index < 3 ? "all-in" : "out";
  });

  const pots = contributionPots(game);
  assert.deepEqual(
    pots.map((pot) => pot.amount),
    [150, 100],
  );
  assert.deepEqual(
    pots.map((pot) => pot.eligible.map((player) => player.id)),
    [[0, 2], [2]],
  );
});

test("showdown awards the main pot and side pot to different winners", () => {
  const game = createGame(113);
  game.communityCards = [
    card(2, "clubs"),
    card(3, "diamonds"),
    card(7, "hearts"),
    card(8, "spades"),
    card(9, "clubs"),
  ];
  const holeCards = [
    [card(14, "spades"), card(14, "hearts")],
    [card(13, "spades"), card(13, "hearts")],
    [card(12, "spades"), card(12, "hearts")],
  ];
  game.players.forEach((player, index) => {
    player.chips = 0;
    player.bet = 0;
    player.totalContribution = index === 0 ? 50 : index < 3 ? 100 : 0;
    player.status = index < 3 ? "all-in" : "out";
    player.holeCards = holeCards[index] ?? [];
  });
  game.pot = 250;

  const settled = settleShowdown(game);
  assert.equal(settled.result?.payouts[0], 150);
  assert.equal(settled.result?.payouts[1], 100);
  assert.equal(settled.result?.payouts[2] ?? 0, 0);
  assert.deepEqual(settled.result?.winnerIds, [0, 1]);
});

test("a tied showdown splits the pot and preserves every chip", () => {
  const game = createGame(127);
  game.communityCards = [
    card(14, "hearts"),
    card(13, "hearts"),
    card(12, "hearts"),
    card(11, "hearts"),
    card(10, "hearts"),
  ];
  game.players.forEach((player, index) => {
    player.chips = index < 2 ? 1900 : 2000;
    player.totalContribution = index < 2 ? 100 : 0;
    player.bet = 0;
    player.status = index < 2 ? "active" : "folded";
  });
  game.pot = 200;

  const settled = settleShowdown(game);
  assert.deepEqual(settled.result?.winnerIds, [0, 1]);
  assert.equal(settled.result?.payouts[0], 100);
  assert.equal(settled.result?.payouts[1], 100);
  assert.equal(
    settled.players.reduce((sum, player) => sum + player.chips, 0),
    STARTING_CHIPS * 6,
  );
});

test("odd split-pot chips are awarded clockwise from the dealer", () => {
  const game = createGame(131);
  game.dealerId = 3;
  game.communityCards = [
    card(14, "hearts"),
    card(13, "hearts"),
    card(12, "hearts"),
    card(11, "hearts"),
    card(10, "hearts"),
  ];
  game.players.forEach((player) => {
    player.chips = 2000;
    player.totalContribution = 0;
    player.bet = 0;
    player.status = "folded";
  });
  for (const playerId of [0, 1, 5]) {
    game.players[playerId].chips = 1995;
    game.players[playerId].totalContribution = 5;
  }
  game.players[0].status = "active";
  game.players[5].status = "active";
  game.pot = 15;

  const settled = settleShowdown(game);
  assert.equal(settled.result?.payouts[5], 8);
  assert.equal(settled.result?.payouts[0], 7);
  assert.equal(
    settled.players.reduce((sum, player) => sum + player.chips, 0),
    STARTING_CHIPS * 6,
  );
});

test("preflop and postflop action order advances through every street", () => {
  let game = createGame(137);
  const preflopOrder: number[] = [];

  while (game.street === "preflop") {
    const actor = game.currentActor!;
    preflopOrder.push(actor);
    const legal = legalActions(game, actor);
    game = applyAction(game, {
      playerId: actor,
      type: legal.canCheck ? "check" : "call",
    });
  }

  assert.deepEqual(preflopOrder, [2, 3, 4, 5, 0, 1]);
  assert.equal(game.street, "flop");
  assert.equal(game.communityCards.length, 3);
  assert.equal(game.currentActor, 0);

  for (const expectedStreet of ["turn", "river"] as const) {
    const order: number[] = [];
    const startingStreet: string = game.street;
    while (game.street === startingStreet) {
      const actor = game.currentActor!;
      order.push(actor);
      game = applyAction(game, { playerId: actor, type: "check" });
    }
    assert.deepEqual(order, [0, 1, 2, 3, 4, 5]);
    assert.equal(game.street, expectedStreet);
  }
});

test("folding down to one player settles immediately and conserves chips", () => {
  let game = createGame(139);
  for (const playerId of [2, 3, 4, 5, 0]) {
    assert.equal(game.currentActor, playerId);
    game = applyAction(game, { playerId, type: "fold" });
  }

  assert.equal(game.phase, "result");
  assert.equal(game.result?.showdown, false);
  assert.deepEqual(game.result?.winnerIds, [1]);
  assert.equal(game.result?.payouts[1], 30);
  assert.equal(game.result?.humanDelta, -10);
  assert.equal(
    game.players.reduce((sum, player) => sum + player.chips, 0),
    STARTING_CHIPS * 6,
  );
});

test("an eliminated AI automatically rebuys before the next hand", () => {
  let game = createGame(149);
  game = startNewHand(game, 151);
  assert.equal(game.dealerId, 0);
  game.players[1].chips = 0;
  game.players[1].status = "out";
  game = startNewHand(game, 157);

  assert.deepEqual(game.rebuyPlayerIds, [1]);
  assert.equal(game.players[1].chips, AI_REBUY_CHIPS);
  assert.equal(game.players[1].status, "active");
  assert.equal(game.players[1].position, "BTN");
  assert.equal(game.players[2].position, "SB");
  assert.equal(game.players[3].position, "BB");
});

test("a busted human can buy in and continue without resetting the table", () => {
  const game = createGame(159);
  const previousHand = game.handNumber;
  game.phase = "busted";
  game.players[0].chips = 0;
  game.players[0].status = "out";
  game.players[1].chips = 777;

  const continued = rebuyHumanAndStartNextHand(game, STARTING_CHIPS, 161);

  assert.equal(continued.phase, "playing");
  assert.equal(continued.handNumber, previousHand + 1);
  assert.equal(
    continued.players[0].chips + continued.players[0].totalContribution,
    STARTING_CHIPS,
  );
  assert.equal(
    continued.players[1].chips + continued.players[1].totalContribution,
    777,
  );
  assert.notEqual(continued, game);
  assert.equal(continued.result, null);

  const activeGame = createGame(162);
  assert.equal(
    rebuyHumanAndStartNextHand(activeGame, STARTING_CHIPS, 163),
    activeGame,
  );
});

test("completed hand history retains settlement and street-by-street actions", () => {
  let game = createGame(164);
  for (const playerId of [2, 3, 4, 5, 0]) {
    game = applyAction(game, { playerId, type: "fold" });
  }
  const profile: LocalProfile = {
    version: 1,
    chips: STARTING_CHIPS,
    lastDailyGrant: null,
    lastSignIn: null,
    history: [],
    aiProfiles: {},
  };

  const recorded = recordCompletedHand(profile, game);
  const history = recorded.history[0];

  assert.ok(history.actions.length >= 7);
  assert.equal(history.actions[0].label.startsWith("小盲"), true);
  assert.ok(history.participants.length >= 2);
  assert.equal(
    history.participants.some(
      (participant) =>
        participant.playerId === 1 &&
        participant.payout === 30 &&
        participant.isWinner,
    ),
    true,
  );
});

test("AI thinking copy varies in timing, stays public, and is perceivable", () => {
  const game = createGame(163);
  const actor = game.currentActor!;
  const first = createAIThinkingPlan(game, actor, seededRandom(11));
  const second = createAIThinkingPlan(game, actor, seededRandom(11));
  const different = createAIThinkingPlan(game, actor, seededRandom(37));

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.ok(first.steps.length >= 1 && first.steps.length <= 7);
  assert.equal(first.stepDurations.length, first.steps.length);
  assert.equal(
    first.totalMs,
    first.stepDurations.reduce((sum, value) => sum + value, 0),
  );
  assert.ok(first.totalMs >= 320 && first.totalMs <= 7700);
  assert.equal(
    first.steps.some((step) => /同花|对子|手牌/.test(step)),
    false,
  );
});

test("AI thought plans vary broadly without becoming a fixed timer", () => {
  const game = createGame(167);
  const actor = 2;
  const plans = Array.from({ length: 160 }, (_, index) =>
    createAIThinkingPlan(game, actor, seededRandom(index + 1)),
  );
  const uniqueCopy = new Set(plans.map((plan) => plan.steps.join("|")));
  const uniqueTimings = new Set(plans.map((plan) => plan.totalMs));
  const lengths = new Set(plans.map((plan) => plan.steps.length));
  const modes = new Set(plans.map((plan) => plan.mode));

  assert.ok(uniqueCopy.size > 130);
  assert.ok(uniqueTimings.size > 140);
  assert.deepEqual([...lengths].sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([...modes].sort(), ["measured", "snap", "tank"]);
  assert.ok(
    Math.max(...plans.map((plan) => plan.totalMs)) -
      Math.min(...plans.map((plan) => plan.totalMs)) >
      6000,
  );
});

test("AI thinking uses a large phrase library and avoids each seat's recent copy", () => {
  assert.ok(AI_THINKING_PHRASE_LIBRARY_SIZE >= 250);

  const game = createGame(166);
  const actor = game.currentActor!;
  let recentSteps: string[] = [];
  const observed = new Set<string>();

  for (let index = 0; index < 40; index += 1) {
    const plan = createAIThinkingPlan(
      game,
      actor,
      seededRandom(index + 200),
      undefined,
      recentSteps,
    );
    const recent = new Set(recentSteps);
    assert.equal(plan.steps.some((step) => recent.has(step)), false);
    plan.steps.forEach((step) => observed.add(step));
    recentSteps = [...recentSteps, ...plan.steps].slice(-36);
  }

  assert.ok(observed.size >= 80);
});

test("AI thinking rhythm responds to pressure and remains persona-specific", () => {
  const base = createGame(168);
  const lowPressure = structuredClone(base);
  lowPressure.currentActor = 5;
  lowPressure.currentBet = 0;
  lowPressure.pot = 40;
  lowPressure.players[5].bet = 0;

  const highPressure = structuredClone(base);
  highPressure.currentActor = 5;
  highPressure.street = "river";
  highPressure.currentBet = 900;
  highPressure.pot = 650;
  highPressure.players[5].bet = 0;
  highPressure.players[5].chips = 1000;

  const plansFor = (game: typeof base, playerId: number) =>
    Array.from({ length: 400 }, (_, index) =>
      createAIThinkingPlan(game, playerId, seededRandom(index + 1)),
    );
  const averageMs = (plans: ReturnType<typeof plansFor>) =>
    plans.reduce((sum, plan) => sum + plan.totalMs, 0) / plans.length;

  const relaxedFox = plansFor(lowPressure, 5);
  const pressuredFox = plansFor(highPressure, 5);
  assert.ok(averageMs(pressuredFox) > averageMs(relaxedFox) + 1200);

  const pony = plansFor(base, 2);
  const uncle = plansFor(base, 3);
  assert.ok(
    pony.filter((plan) => plan.mode === "snap").length >
      uncle.filter((plan) => plan.mode === "snap").length + 25,
  );
  assert.ok(averageMs(uncle) > averageMs(pony) + 900);

  const humanCues = new Set(
    [...relaxedFox, ...pressuredFox].flatMap((plan) =>
      plan.steps.filter((step) =>
        /筹码|底池|目光|停顿|桌面|行动顺序/.test(step),
      ),
    ),
  );
  assert.ok(humanCues.size >= 12);
});

test("the five native-inspired AI profiles use distinct engines and curves", () => {
  const styles = [1, 2, 3, 4, 5].map(aiStyleForPlayerId);
  assert.equal(new Set(styles.map((style) => style.key)).size, 5);
  assert.equal(new Set(styles.map((style) => AI_ENGINE_NAMES[style.key])).size, 5);
  assert.deepEqual(
    styles.map((style) => style.learningRate),
    [0.3, 0.5, 0.1, 0.05, 0.4],
  );
  assert.deepEqual(
    styles.map((style) => style.memoryWindow),
    [50, 30, 20, 10, 60],
  );
});

test("AI personas produce observably different action distributions", () => {
  const base = createGame(169);
  const counts = new Map<
    number,
    { fold: number; passive: number; aggressive: number }
  >();

  for (const playerId of [1, 2, 3, 4, 5]) {
    const game = structuredClone(base);
    game.currentActor = playerId;
    game.currentBet = 80;
    game.pot = 260;
    game.actedSinceRaise = [];
    game.players[playerId].bet = 0;
    game.players[playerId].lastActedBet = null;
    game.players[playerId].status = "active";
    game.players[playerId].holeCards = [
      card(12, "spades"),
      card(7, "hearts"),
    ];
    const result = { fold: 0, passive: 0, aggressive: 0 };
    for (let seed = 1; seed <= 240; seed += 1) {
      const action = chooseAIAction(
        game,
        playerId,
        seededRandom(seed * 1009),
      );
      if (action.type === "fold") result.fold += 1;
      else if (["raise", "all-in"].includes(action.type)) result.aggressive += 1;
      else result.passive += 1;
    }
    counts.set(playerId, result);
  }

  assert.ok(counts.get(2)!.aggressive > counts.get(1)!.aggressive * 3);
  assert.ok(counts.get(3)!.fold > counts.get(4)!.fold * 8);
  assert.ok(counts.get(4)!.passive > counts.get(5)!.passive * 1.7);
  assert.ok(counts.get(5)!.aggressive > counts.get(1)!.aggressive * 3);
});

test("AI learning records contexts and decays exploration within style bounds", () => {
  let game = createGame(173);
  const random = seededRandom(991);
  let actions = 0;
  while (game.phase === "playing" && actions < 200) {
    const actor = game.currentActor!;
    game = applyAction(game, chooseAIAction(game, actor, random));
    actions += 1;
  }
  assert.notEqual(game.result, null);

  const style = aiStyleForPlayerId(2);
  let learning = defaultAILearningState();
  for (let hand = 0; hand < 120; hand += 1) {
    learning = updateAILearningAfterHand(game, 2, style, learning);
  }

  assert.equal(learning.handsPlayed, 120);
  assert.equal(learning.snapshots.length, 60);
  assert.ok(Object.keys(learning.contextPolicies).length > 0);
  assert.ok(Math.abs(learning.aggressionBias) <= 1);
  assert.ok(Math.abs(learning.tightnessBias) <= 1);
  assert.ok(Math.abs(learning.bluffBias) <= 1);
  assert.ok(currentAIExplorationRate(style, learning) < style.initialExploration);
  assert.ok(
    currentAIExplorationRate(style, learning) >= style.minimumExploration,
  );
});

test("deterministic AI simulations complete without loops or chip loss", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    let game = createGame(seed);
    const random = seededRandom(seed * 997);
    let actions = 0;

    while (game.phase === "playing" && actions < 200) {
      const actor = game.currentActor;
      assert.notEqual(actor, null, `seed ${seed} has no actor`);
      const action = chooseAIAction(game, actor!, random);
      const next = applyAction(game, action);
      assert.notEqual(next, game, `seed ${seed} produced an illegal AI action`);
      game = next;
      actions += 1;
    }

    assert.ok(actions < 200, `seed ${seed} did not settle`);
    assert.notEqual(game.result, null, `seed ${seed} has no result`);
    assert.equal(game.pot, 0, `seed ${seed} left chips in the pot`);
    assert.equal(
      game.players.reduce((sum, player) => sum + player.chips, 0),
      STARTING_CHIPS * 6,
      `seed ${seed} lost or created chips`,
    );
  }
});
