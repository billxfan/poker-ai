import assert from "node:assert/strict";
import test from "node:test";
import { buildBotObservation } from "../core/observation.ts";
import { estimatePokerEquity } from "../core/pokerEquity.ts";
import { createGame } from "../core/engine.ts";

function observationWithCards(
  holeCards: ReturnType<typeof createGame>["players"][number]["holeCards"],
  communityCards: ReturnType<typeof createGame>["communityCards"] = [],
) {
  const game = createGame(4101);
  game.currentActor = 2;
  game.players[2].holeCards = holeCards;
  game.communityCards = communityCards;
  game.street =
    communityCards.length === 5
      ? "river"
      : communityCards.length === 4
        ? "turn"
        : communityCards.length === 3
          ? "flop"
          : "preflop";
  return buildBotObservation(game, 2);
}

test("preflop equity respects card quality and multiway dilution", () => {
  const aces = observationWithCards([
    { rank: 14, suit: "spades" },
    { rank: 14, suit: "hearts" },
  ]);
  const sevenDeuce = observationWithCards([
    { rank: 7, suit: "spades" },
    { rank: 2, suit: "hearts" },
  ]);
  const headsUpAces = structuredClone(aces);
  headsUpAces.opponents.forEach((opponent, index) => {
    if (index > 0) opponent.status = "folded";
  });

  const multiway = estimatePokerEquity(aces);
  const weak = estimatePokerEquity(sevenDeuce);
  const headsUp = estimatePokerEquity(headsUpAces);

  assert.ok(multiway.rawEquity > weak.rawEquity);
  assert.ok(headsUp.rawEquity > multiway.rawEquity);
  assert.equal(multiway.samples, 0);
});

test("postflop equity samples only canonical unseen cards and values the nuts", () => {
  const nuts = observationWithCards(
    [
      { rank: 14, suit: "spades" },
      { rank: 13, suit: "spades" },
    ],
    [
      { rank: 12, suit: "spades" },
      { rank: 11, suit: "spades" },
      { rank: 10, suit: "spades" },
      { rank: 2, suit: "diamonds" },
      { rank: 3, suit: "clubs" },
    ],
  );
  const estimate = estimatePokerEquity(nuts);

  assert.equal(estimate.rawEquity, 1);
  assert.equal(estimate.adjustedEquity, 1);
  assert.ok(estimate.samples >= 20);
});

test("public aggression narrows the inferred range without changing raw cards", () => {
  const passive = observationWithCards(
    [
      { rank: 14, suit: "hearts" },
      { rank: 12, suit: "hearts" },
    ],
    [
      { rank: 12, suit: "clubs" },
      { rank: 8, suit: "diamonds" },
      { rank: 4, suit: "spades" },
    ],
  );
  const raised = structuredClone(passive);
  raised.actionLog = [
    {
      id: "public-raise",
      playerId: 1,
      playerName: "Opponent",
      street: "flop",
      action: "raise",
      amount: 180,
      label: "加注到 180",
      isBlind: false,
    },
  ];

  const passiveEstimate = estimatePokerEquity(passive);
  const raisedEstimate = estimatePokerEquity(raised);

  assert.equal(raisedEstimate.rawEquity, passiveEstimate.rawEquity);
  assert.ok(raisedEstimate.rangePressure > passiveEstimate.rangePressure);
  assert.ok(raisedEstimate.adjustedEquity < passiveEstimate.adjustedEquity);
});
