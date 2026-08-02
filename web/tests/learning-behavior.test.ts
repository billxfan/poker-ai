import assert from "node:assert/strict";
import test from "node:test";
import {
  currentAILearningRate,
  defaultAILearningState,
  getAIDecisionTuning,
  type AIDecisionTuning,
} from "../core/aiLearning.ts";
import { aiStyleForPlayerId } from "../core/aiProfiles.ts";
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
