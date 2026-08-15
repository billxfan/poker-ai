import assert from "node:assert/strict";
import test from "node:test";
import {
  currentAILearningRate,
  defaultAILearningState,
  getAIDecisionTuning,
  updateAILearningAfterHand,
  type AIDecisionTuning,
} from "../core/aiLearning.ts";
import { aiStyleForPlayerId } from "../core/aiProfiles.ts";
import { createGame } from "../core/engine.ts";
import type { OpponentRead } from "../core/types.ts";

function read(overrides: Partial<OpponentRead>): OpponentRead {
  return {
    handsObserved: 100,
    vpipHands: 42,
    pfrHands: 18,
    aggressiveActions: 20,
    totalActions: 100,
    pressureOpportunities: 100,
    foldsToAggression: 50,
    continuesVsAggression: 50,
    pressureWins: 0,
    pressureFailures: 0,
    ...overrides,
  };
}

test("adaptable rivals exploit public overfold and calling-station evidence in opposite directions", () => {
  const style = aiStyleForPlayerId(5);
  const baselineMemory = defaultAILearningState();
  baselineMemory.handsPlayed = 100;
  const overfoldMemory = structuredClone(baselineMemory);
  overfoldMemory.opponentReads[0] = read({
    foldsToAggression: 78,
    continuesVsAggression: 22,
  });
  const stationMemory = structuredClone(baselineMemory);
  stationMemory.opponentReads[0] = read({
    vpipHands: 72,
    foldsToAggression: 18,
    continuesVsAggression: 82,
  });

  const baseline = getAIDecisionTuning(style, baselineMemory, "river|BTN|unopened|weak|hu|deep", {
    activeIds: [],
  });
  const overfold = getAIDecisionTuning(style, overfoldMemory, "river|BTN|unopened|weak|hu|deep", {
    activeIds: [0],
    primaryId: 0,
  });
  const station = getAIDecisionTuning(style, stationMemory, "river|BTN|unopened|weak|hu|deep", {
    activeIds: [0],
    primaryId: 0,
  });

  assert.ok(overfold.bluffChance > baseline.bluffChance);
  assert.ok(overfold.aggressionChance > baseline.aggressionChance);
  assert.ok(station.bluffChance < baseline.bluffChance);
  assert.ok(station.bluffThreshold > baseline.bluffThreshold);
});

test("all learned tuning remains inside each persona identity envelope", () => {
  const style = aiStyleForPlayerId(3);
  const learning = defaultAILearningState();
  learning.handsPlayed = 10_000;
  learning.aggressionBias = 1;
  learning.tightnessBias = -1;
  learning.bluffBias = 1;
  learning.opponentReads[0] = read({
    vpipHands: 2,
    foldsToAggression: 100,
    continuesVsAggression: 0,
  });
  learning.contextPolicies.extreme = {
    foldScore: -1,
    passiveScore: -1,
    aggressiveScore: 1,
    sampleCount: 100_000,
  };

  const tuned = getAIDecisionTuning(style, learning, "extreme", {
    activeIds: [0],
    primaryId: 0,
  });
  const keys: (keyof AIDecisionTuning)[] = [
    "aggressiveThreshold",
    "passiveThreshold",
    "aggressionChance",
    "continueChance",
    "bluffThreshold",
    "bluffChance",
  ];
  keys.forEach((key) => {
    assert.ok(
      Math.abs(tuned[key] - style[key]) <= style.adjustmentCap + 1e-9,
      `${key} escaped ${style.label}'s identity envelope`,
    );
  });
});

test("learning keeps a nonzero adaptation floor after very long sessions", () => {
  const style = aiStyleForPlayerId(5);
  const learning = defaultAILearningState();
  learning.handsPlayed = 1_000_000;

  assert.equal(
    currentAILearningRate(style, learning),
    style.learningRate * 0.15,
  );
});

test("loss emotion stays transient and persona-specific without a lifetime rebuy ratchet", () => {
  const lagStyle = aiStyleForPlayerId(2);
  const tightStyle = aiStyleForPlayerId(3);
  const stable = defaultAILearningState();
  stable.handsPlayed = 100;
  const lifetimeRebuysOnly = structuredClone(stable);
  lifetimeRebuysOnly.bustCount = 80;
  lifetimeRebuysOnly.rebuyCount = 80;
  const recentLoss = structuredClone(lifetimeRebuysOnly);
  recentLoss.recentProfit = -1_200;
  recentLoss.recentBustPressure = 2;
  recentLoss.consecutiveLosses = 6;

  const lagBaseline = getAIDecisionTuning(
    lagStyle,
    stable,
    "preflop|CO|facing-bet|marginal|mw|deep",
  );
  const lagRebuysOnly = getAIDecisionTuning(
    lagStyle,
    lifetimeRebuysOnly,
    "preflop|CO|facing-bet|marginal|mw|deep",
  );
  const lagTilt = getAIDecisionTuning(
    lagStyle,
    recentLoss,
    "preflop|CO|facing-bet|marginal|mw|deep",
  );
  const tightBaseline = getAIDecisionTuning(
    tightStyle,
    stable,
    "preflop|CO|facing-bet|marginal|mw|deep",
  );
  const tightTilt = getAIDecisionTuning(
    tightStyle,
    recentLoss,
    "preflop|CO|facing-bet|marginal|mw|deep",
  );

  assert.deepEqual(lagRebuysOnly, lagBaseline);
  assert.ok(lagTilt.aggressiveThreshold < lagBaseline.aggressiveThreshold);
  assert.ok(lagTilt.aggressionChance > lagBaseline.aggressionChance);
  assert.ok(tightTilt.passiveThreshold > tightBaseline.passiveThreshold);
  assert.ok(tightTilt.continueChance < tightBaseline.continueChance);
  assert.ok(Math.abs(lagTilt.aggressionChance - lagStyle.aggressionChance) < 0.03);
});

test("recent public pressure results make a bot wary of shown-down winners, not permanently afraid", () => {
  const style = aiStyleForPlayerId(5);
  const baselineMemory = defaultAILearningState();
  baselineMemory.handsPlayed = 100;
  const winnerMemory = structuredClone(baselineMemory);
  winnerMemory.opponentReads[0] = read({ pressureWins: 4 });
  const failedMemory = structuredClone(baselineMemory);
  failedMemory.opponentReads[0] = read({ pressureFailures: 4 });
  const opponents = { activeIds: [0], primaryId: 0 };

  const baseline = getAIDecisionTuning(style, baselineMemory, "river|BTN|facing-bet|marginal|hu|deep", opponents);
  const winner = getAIDecisionTuning(style, winnerMemory, "river|BTN|facing-bet|marginal|hu|deep", opponents);
  const failed = getAIDecisionTuning(style, failedMemory, "river|BTN|facing-bet|marginal|hu|deep", opponents);

  assert.ok(winner.continueChance < baseline.continueChance);
  assert.ok(failed.continueChance > baseline.continueChance);
  assert.ok(winner.passiveThreshold > failed.passiveThreshold);
});

test("a public high-equity showdown loss creates a bounded, decaying bad-beat signal", () => {
  const game = createGame(919);
  const bot = game.players[2];
  bot.totalContribution = 100;
  bot.chips -= 100;
  game.result = {
    title: "showdown",
    detail: "",
    winnerIds: [1],
    payouts: { 1: 200 },
    humanDelta: 0,
    showdown: true,
  };
  game.actionLog = [{
    id: "bot-call",
    playerId: 2,
    playerName: bot.name,
    street: "river",
    action: "call",
    amount: 100,
    label: "跟注",
    aiDecision: {
      contextKey: "river|BTN|facing-bet|strong|hu|deep",
      strengthBucket: "strong",
      actionKind: "passive",
      usedExploration: false,
      publicFactors: {
        pressure: 0.4,
        positionBonus: 0,
        boardWetness: 0.2,
        stackToPotRatio: 2,
        activePlayerCount: 2,
        hasInitiative: false,
        estimatedEquity: 0.7,
      },
    },
  }];

  const learned = updateAILearningAfterHand(
    game,
    2,
    aiStyleForPlayerId(2),
    defaultAILearningState(),
  );
  assert.equal(learned.recentBadBeatPressure, 1);
  assert.ok(learned.recentMomentum < 0);

  const recoveryGame = structuredClone(game);
  recoveryGame.result = {
    ...game.result,
    winnerIds: [2],
    payouts: { 2: 200 },
  };
  recoveryGame.players[2].totalContribution = 100;
  recoveryGame.players[2].chips = 1_900;
  recoveryGame.actionLog = [];
  const recovered = updateAILearningAfterHand(
    recoveryGame,
    2,
    aiStyleForPlayerId(2),
    learned,
  );
  assert.equal(recovered.recentBadBeatPressure, 0.7);
  assert.ok(recovered.recentMomentum > learned.recentMomentum);
});
