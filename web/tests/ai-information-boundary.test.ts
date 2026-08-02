import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseAIAction,
  chooseAIActionFromObservation,
} from "../core/ai.ts";
import { defaultAILearningState } from "../core/aiLearning.ts";
import { seededRandom } from "../core/cards.ts";
import { createGame, legalActions } from "../core/engine.ts";
import { buildBotObservation } from "../core/observation.ts";
import type {
  AIDecisionTrace,
  AIStyle,
  BotObservation,
  Card,
  GameState,
  PlayerAction,
} from "../core/types.ts";

const ACTOR_ID = 2;

function decisionFixture(seed = 211): GameState {
  const game = createGame(seed);
  game.currentActor = ACTOR_ID;
  game.currentBet = 80;
  game.minimumRaiseIncrement = 60;
  game.pot = 260;
  game.actedSinceRaise = [];
  game.players[ACTOR_ID].bet = 0;
  game.players[ACTOR_ID].lastActedBet = null;
  game.players[ACTOR_ID].status = "active";
  game.players[ACTOR_ID].holeCards = [
    { rank: 12, suit: "spades" },
    { rank: 7, suit: "hearts" },
  ];
  return game;
}

function alternateCard(index: number): Card {
  const suits: Card["suit"][] = ["clubs", "diamonds", "hearts", "spades"];
  return {
    rank: 2 + (index % 13),
    suit: suits[index % suits.length],
  };
}

function changeOnlyHiddenState(game: GameState): GameState {
  const changed = structuredClone(game);
  changed.deck = changed.deck
    .map((_, index) => alternateCard(index + 17))
    .reverse();
  changed.players.forEach((player, index) => {
    if (player.id !== ACTOR_ID) {
      player.holeCards = [alternateCard(index * 2), alternateCard(index * 2 + 1)];
    }
  });
  const privateTrace: AIDecisionTrace = {
    contextKey: "private-policy-context",
    strengthBucket: "premium",
    actionKind: "aggressive",
    usedExploration: true,
  };
  changed.actionLog.forEach((entry) => {
    entry.aiDecision = { ...privateTrace };
  });
  return changed;
}

test("BotObservation is an allowlisted copy without deck, opponent cards, or traces", () => {
  const game = decisionFixture();
  const observation = buildBotObservation(changeOnlyHiddenState(game), ACTOR_ID);
  const serialized = JSON.stringify(observation);

  assert.equal(Object.hasOwn(observation, "deck"), false);
  assert.equal(observation.opponents.some((player) => "holeCards" in player), false);
  assert.equal(serialized.includes('"aiDecision"'), false);
  assert.deepEqual(observation.self.holeCards, game.players[ACTOR_ID].holeCards);
  assert.deepEqual(observation.legalActions, legalActions(game, ACTOR_ID));

  assert.notStrictEqual(
    observation.self.holeCards[0],
    game.players[ACTOR_ID].holeCards[0],
  );
  assert.notStrictEqual(observation.communityCards, game.communityCards);
  assert.notStrictEqual(observation.actionLog, game.actionLog);
});

test("changing every hidden card and private decision trace cannot change bot policy", () => {
  const game = decisionFixture(223);
  const changed = changeOnlyHiddenState(game);
  const observation = buildBotObservation(game, ACTOR_ID);
  const changedObservation = buildBotObservation(changed, ACTOR_ID);
  const style = game.players[ACTOR_ID].style!;
  const learning = defaultAILearningState();

  assert.deepEqual(changedObservation, observation);

  for (let seed = 1; seed <= 128; seed += 1) {
    const fromOriginal = chooseAIActionFromObservation(
      observation,
      style,
      seededRandom(seed * 104_729),
      learning,
    );
    const fromChanged = chooseAIActionFromObservation(
      changedObservation,
      style,
      seededRandom(seed * 104_729),
      learning,
    );
    assert.deepEqual(fromChanged, fromOriginal, `policy changed for seed ${seed}`);

    assert.deepEqual(
      chooseAIAction(game, ACTOR_ID, seededRandom(seed * 104_729), learning),
      chooseAIAction(changed, ACTOR_ID, seededRandom(seed * 104_729), learning),
      `compatibility boundary leaked hidden state for seed ${seed}`,
    );
  }
});

test("observation policy is deterministic and requires an explicit random source", () => {
  const game = decisionFixture(227);
  const observation = buildBotObservation(game, ACTOR_ID);
  const style = game.players[ACTOR_ID].style!;
  const learning = defaultAILearningState();

  const first = chooseAIActionFromObservation(
    observation,
    style,
    seededRandom(991),
    learning,
  );
  const second = chooseAIActionFromObservation(
    observation,
    style,
    seededRandom(991),
    learning,
  );
  assert.deepEqual(second, first);

  const callWithoutRandom = chooseAIActionFromObservation as unknown as (
    observation: BotObservation,
    style: AIStyle,
  ) => PlayerAction;
  assert.throws(
    () => callWithoutRandom(observation, style),
    /random is not a function/,
  );
});
