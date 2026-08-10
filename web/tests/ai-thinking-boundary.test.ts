import assert from "node:assert/strict";
import test from "node:test";
import {
  createAIThinkingPlan,
  createAIThinkingPlanFromObservation,
  type AIThinkingPlan,
} from "../core/aiThinking.ts";
import { chooseAIAction } from "../core/ai.ts";
import { defaultAILearningState } from "../core/aiLearning.ts";
import { seededRandom } from "../core/cards.ts";
import { createGame } from "../core/engine.ts";
import { buildBotObservation } from "../core/observation.ts";
import type {
  AIDecisionTrace,
  AIStyle,
  BotObservation,
  Card,
  GameState,
} from "../core/types.ts";

const ACTOR_ID = 2;

function alternateCard(index: number): Card {
  const suits: Card["suit"][] = ["diamonds", "clubs", "spades", "hearts"];
  return {
    rank: 2 + (index % 13),
    suit: suits[index % suits.length],
  };
}

function thinkingFixture(seed = 307): GameState {
  const game = createGame(seed);
  game.currentActor = ACTOR_ID;
  game.currentBet = 120;
  game.pot = 340;
  game.players[ACTOR_ID].bet = 20;
  game.players[ACTOR_ID].lastActedBet = null;
  game.players[ACTOR_ID].status = "active";
  return game;
}

function replaceHiddenState(game: GameState): GameState {
  const changed = structuredClone(game);
  changed.deck = changed.deck
    .map((_, index) => alternateCard(index + 29))
    .reverse();
  changed.players.forEach((player, index) => {
    if (player.id !== ACTOR_ID) {
      player.holeCards = [alternateCard(index * 3), alternateCard(index * 3 + 1)];
    }
  });
  const privateTrace: AIDecisionTrace = {
    contextKey: "hidden-thinking-context",
    strengthBucket: "weak",
    actionKind: "fold",
    usedExploration: false,
  };
  changed.actionLog.forEach((entry) => {
    entry.aiDecision = { ...privateTrace };
  });
  return changed;
}

test("thinking plans are invariant to opponent cards, deck, and private traces", () => {
  const game = thinkingFixture();
  const changed = replaceHiddenState(game);
  const observation = buildBotObservation(game, ACTOR_ID);
  const changedObservation = buildBotObservation(changed, ACTOR_ID);
  const style = game.players[ACTOR_ID].style!;
  const learning = defaultAILearningState();
  const recentSteps = ["扫了一眼桌上的筹码"];

  assert.deepEqual(changedObservation, observation);

  for (let seed = 1; seed <= 128; seed += 1) {
    const randomSeed = seed * 130_363;
    const expected = createAIThinkingPlanFromObservation(
      observation,
      style,
      seededRandom(randomSeed),
      learning,
      recentSteps,
    );
    assert.deepEqual(
      createAIThinkingPlanFromObservation(
        changedObservation,
        style,
        seededRandom(randomSeed),
        learning,
        recentSteps,
      ),
      expected,
      `observation plan leaked hidden state for seed ${seed}`,
    );
    assert.deepEqual(
      createAIThinkingPlan(
        changed,
        ACTOR_ID,
        seededRandom(randomSeed),
        learning,
        recentSteps,
      ),
      createAIThinkingPlan(
        game,
        ACTOR_ID,
        seededRandom(randomSeed),
        learning,
        recentSteps,
      ),
      `compatibility plan leaked hidden state for seed ${seed}`,
    );
  }
});

test("policy-driven timing cannot leak an opponent's hidden state", () => {
  const game = thinkingFixture(309);
  const changed = replaceHiddenState(game);

  for (let seed = 1; seed <= 64; seed += 1) {
    const action = chooseAIAction(
      game,
      ACTOR_ID,
      seededRandom(seed * 17),
      undefined,
      seed,
    );
    const changedAction = chooseAIAction(
      changed,
      ACTOR_ID,
      seededRandom(seed * 17),
      undefined,
      seed,
    );
    assert.equal(
      changedAction.aiDecision?.decisionDifficulty,
      action.aiDecision?.decisionDifficulty,
    );
    assert.ok((action.aiDecision?.decisionDifficulty ?? -1) >= 0);
    assert.ok((action.aiDecision?.decisionDifficulty ?? 2) <= 1);

    const context = {
      decisionDifficulty: action.aiDecision?.decisionDifficulty,
    };
    const changedContext = {
      decisionDifficulty: changedAction.aiDecision?.decisionDifficulty,
    };
    assert.deepEqual(
      createAIThinkingPlan(
        changed,
        ACTOR_ID,
        seededRandom(seed * 31),
        undefined,
        [],
        changedContext,
      ),
      createAIThinkingPlan(
        game,
        ACTOR_ID,
        seededRandom(seed * 31),
        undefined,
        [],
        context,
      ),
    );
  }
});

test("thinking plan keeps a deliberate bounded cadence and requires explicit randomness", () => {
  const game = thinkingFixture(311);
  const observation = buildBotObservation(game, ACTOR_ID);
  const style = game.players[ACTOR_ID].style!;

  for (let seed = 1; seed <= 160; seed += 1) {
    const plan = createAIThinkingPlanFromObservation(
      observation,
      style,
      seededRandom(seed),
    );
    const expectedMaximumSteps =
      plan.mode === "tank" ? 3 : plan.mode === "measured" ? 2 : 1;
    const expectedMaximumMs =
      plan.mode === "tank" ? 4_700 : plan.mode === "measured" ? 2_050 : 760;
    assert.ok(plan.steps.length <= expectedMaximumSteps);
    assert.ok(plan.totalMs <= expectedMaximumMs);
  }

  const callWithoutRandom = createAIThinkingPlanFromObservation as unknown as (
    observation: BotObservation,
    style: AIStyle,
  ) => AIThinkingPlan;
  assert.throws(
    () => callWithoutRandom(observation, style),
    /random is not a function/,
  );
});

test("close decisions tank more often than routine decisions", () => {
  const game = thinkingFixture(313);
  const observation = buildBotObservation(game, ACTOR_ID);
  const style = game.players[ACTOR_ID].style!;
  const countTanks = (decisionDifficulty: number) =>
    Array.from({ length: 500 }, (_, index) =>
      createAIThinkingPlanFromObservation(
        observation,
        style,
        seededRandom(index + 1),
        undefined,
        [],
        { decisionDifficulty },
      ),
    ).filter((plan) => plan.mode === "tank").length;

  assert.ok(countTanks(1) > countTanks(0) + 70);
});
