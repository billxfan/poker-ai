import assert from "node:assert/strict";
import test from "node:test";
import { chooseAIAction } from "../core/ai.ts";
import {
  defaultAILearningState,
  updateAILearningAfterHand,
} from "../core/aiLearning.ts";
import { aiStyleForPlayerId } from "../core/aiProfiles.ts";
import { seededRandom } from "../core/cards.ts";
import {
  applyAction,
  createGame,
  rebuyHumanAndStartNextHand,
  startNewHand,
} from "../core/engine.ts";

test("online adaptation stays anchored across a long continuous table", () => {
  const ids = [0, 1, 2, 3, 4, 5];
  const styles = Object.fromEntries(
    ids.map((id) => [id, id === 0 ? aiStyleForPlayerId(5) : aiStyleForPlayerId(id)]),
  );
  const learning = Object.fromEntries(
    ids.map((id) => [id, defaultAILearningState()]),
  );
  const first = Object.fromEntries(ids.map((id) => [id, 0]));
  const last = Object.fromEntries(ids.map((id) => [id, 0]));
  const random = seededRandom(1_031_771);
  let game = createGame(1_030_001);
  game.players[0].style = styles[0];

  for (let hand = 1; hand <= 800; hand += 1) {
    let actions = 0;
    while (game.phase === "playing" && actions < 300) {
      const playerId = game.currentActor!;
      game = applyAction(
        game,
        chooseAIAction(game, playerId, random, learning[playerId]),
      );
      actions += 1;
    }
    assert.ok(actions < 300);

    ids.forEach((playerId) => {
      const entered = game.actionLog.some(
        (entry) =>
          entry.playerId === playerId &&
          entry.street === "preflop" &&
          !entry.label.includes("盲") &&
          ["call", "raise", "all-in"].includes(entry.action),
      );
      if (hand <= 200 && entered) first[playerId] += 1;
      if (hand > 600 && entered) last[playerId] += 1;
      learning[playerId] = updateAILearningAfterHand(
        game,
        playerId,
        styles[playerId],
        learning[playerId],
      );
    });

    game =
      game.players[0].chips <= 0
        ? rebuyHumanAndStartNextHand(game, 2_000, 1_030_001 + hand)
        : startNewHand(game, 1_030_001 + hand, true, true);
    game.players[0].style = styles[0];
  }

  const bands: Record<number, [number, number]> = {
    1: [0.08, 0.3],
    2: [0.25, 0.55],
    3: [0.03, 0.2],
    4: [0.18, 0.45],
    5: [0.1, 0.35],
  };
  [1, 2, 3, 4, 5].forEach((playerId) => {
    const openingRate = first[playerId] / 200;
    const closingRate = last[playerId] / 200;
    const [minimum, maximum] = bands[playerId];
    assert.ok(closingRate >= minimum && closingRate <= maximum);
    assert.ok(Math.abs(closingRate - openingRate) <= 0.15);
    assert.equal(learning[playerId].aggressionBias, 0);
    assert.equal(learning[playerId].tightnessBias, 0);
    assert.equal(learning[playerId].bluffBias, 0);
    assert.deepEqual(learning[playerId].contextPolicies, {});
  });
});
