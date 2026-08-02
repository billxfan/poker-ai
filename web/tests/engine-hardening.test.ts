import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAction,
  createGame,
  legalActions,
  startNewHand,
} from "../core/engine.ts";
import type { GameState } from "../core/types.ts";

function prepareFlop(game: GameState, activeIds = [0, 1, 2]): GameState {
  const state = structuredClone(game);
  const active = new Set(activeIds);
  state.street = "flop";
  state.communityCards = state.deck.splice(0, 3);
  state.currentBet = 0;
  state.minimumRaiseIncrement = 20;
  state.actedSinceRaise = [];
  state.currentActor = activeIds[0];
  state.players.forEach((player) => {
    player.status = active.has(player.id) ? "active" : "folded";
    player.bet = 0;
    player.lastActedBet = null;
  });
  return state;
}

test("an incomplete opening all-in neither overstates the minimum raise nor reopens a checker", () => {
  let game = prepareFlop(createGame(201));
  game.players[1].chips = 10;

  game = applyAction(game, { playerId: 0, type: "check" });
  game = applyAction(game, { playerId: 1, type: "all-in" });

  const facingShortOpen = legalActions(game, 2);
  assert.equal(facingShortOpen.minRaiseTarget, 20);
  assert.equal(facingShortOpen.canRaise, true);

  game = applyAction(game, { playerId: 2, type: "call" });
  const checkerFacingShortOpen = legalActions(game, 0);
  assert.equal(checkerFacingShortOpen.toCall, 10);
  assert.equal(checkerFacingShortOpen.canCall, true);
  assert.equal(checkerFacingShortOpen.canRaise, false);
  assert.equal(checkerFacingShortOpen.canAllIn, false);
});

test("completing an incomplete opening all-in to a full bet reopens action", () => {
  let game = prepareFlop(createGame(203));
  game.players[1].chips = 10;

  game = applyAction(game, { playerId: 0, type: "check" });
  game = applyAction(game, { playerId: 1, type: "all-in" });
  game = applyAction(game, { playerId: 2, type: "raise", amount: 20 });

  assert.equal(game.currentBet, 20);
  assert.equal(game.currentActor, 0);
  assert.equal(legalActions(game, 0).canRaise, true);
});

test("a player cannot raise into an all-in opponent who cannot respond", () => {
  const game = prepareFlop(createGame(205), [0, 1]);
  game.players[1].status = "all-in";
  game.players[1].chips = 0;
  game.players[1].bet = 100;
  game.players[1].totalContribution = 100;
  game.currentBet = 100;
  game.currentActor = 0;

  const legal = legalActions(game, 0);
  assert.equal(legal.canCall, true);
  assert.equal(legal.canRaise, false);
  assert.equal(legal.canAllIn, false);

  const shortCaller = structuredClone(game);
  shortCaller.players[0].chips = 75;
  assert.equal(legalActions(shortCaller, 0).canAllIn, true);
});

test("raise targets are strict and the action log reports the accepted target", () => {
  const game = createGame(207);
  const playerId = game.currentActor!;
  const legal = legalActions(game, playerId);

  for (const amount of [undefined, 1, legal.maxRaiseTarget + 1, 40.5, NaN]) {
    const rejected = applyAction(game, { playerId, type: "raise", amount });
    assert.equal(rejected, game);
  }

  const raised = applyAction(game, {
    playerId,
    type: "raise",
    amount: legal.minRaiseTarget,
  });
  assert.equal(raised.currentBet, legal.minRaiseTarget);
  assert.equal(raised.players[playerId].lastAction, `加注至 ${legal.minRaiseTarget}`);
});

test("the authoritative action log is not truncated at eighty entries", () => {
  const game = createGame(209);
  const template = game.actionLog[0];
  game.actionLog = Array.from({ length: 80 }, (_, index) => ({
    ...template,
    id: `fixture-${index}`,
  }));
  game.actionSequence = 80;
  const actor = game.currentActor!;

  const updated = applyAction(game, { playerId: actor, type: "call" });
  assert.equal(updated.actionLog.length, 81);
  assert.equal(updated.actionSequence, 81);
});

test("a new hand is rejected when fewer than two funded seats remain", () => {
  const game = createGame(211);
  game.players.forEach((player) => {
    if (!player.isHuman) {
      player.chips = 0;
      player.status = "out";
    }
  });

  const rejected = startNewHand(game, 213, true, false);
  assert.equal(rejected, game);
});

test("four- and five-handed tables assign the seat before the button as cutoff", () => {
  const fiveHanded = createGame(215);
  fiveHanded.players[5].chips = 0;
  fiveHanded.players[5].status = "out";
  const five = startNewHand(fiveHanded, 217, false, false);
  assert.deepEqual(
    five.players.map((player) => player.position),
    ["BTN", "SB", "BB", "UTG", "CO", "OUT"],
  );

  const fourHanded = structuredClone(fiveHanded);
  fourHanded.players[4].chips = 0;
  fourHanded.players[4].status = "out";
  const four = startNewHand(fourHanded, 219, false, false);
  assert.deepEqual(
    four.players.map((player) => player.position),
    ["BTN", "SB", "BB", "CO", "OUT", "OUT"],
  );
});

test("the default hand seed is deterministic for identical prior state", () => {
  const prior = createGame(221);
  const first = startNewHand(prior, undefined, true, false);
  const second = startNewHand(prior, undefined, true, false);
  assert.deepEqual(first, second);
});

test("session and hand identifiers are deterministic and hand rotation preserves the session", () => {
  const first = createGame(223);
  const replay = createGame(223);
  const differentSession = createGame(227);

  assert.equal(first.sessionId, replay.sessionId);
  assert.equal(first.handId, replay.handId);
  assert.notEqual(first.sessionId, differentSession.sessionId);
  assert.notEqual(first.handId, differentSession.handId);

  const next = startNewHand(first, 229, true, false);
  assert.equal(next.sessionId, first.sessionId);
  assert.notEqual(next.handId, first.handId);
  assert.match(next.handId, new RegExp(`hand-${next.handNumber}$`));
});
