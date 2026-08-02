import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, createGame } from "../core/engine.ts";
import {
  recordCompletedHand,
  resetLearningData,
  type LocalProfile,
} from "../core/profile.ts";
import { loadSession } from "../core/storage.ts";
import type { GameState } from "../core/types.ts";

function emptyProfile(): LocalProfile {
  return {
    version: 1,
    chips: 2000,
    lastDailyGrant: null,
    lastSignIn: null,
    history: [],
    aiProfiles: {},
  };
}

test("3Bet statistics count only the first preflop re-raiser, not later 4Bets", () => {
  let game = createGame(301);

  game = applyAction(game, { playerId: 2, type: "raise", amount: 40 });
  game = applyAction(game, { playerId: 3, type: "raise", amount: 60 });
  game = applyAction(game, { playerId: 4, type: "raise", amount: 80 });
  for (const playerId of [5, 0, 1, 2]) {
    game = applyAction(game, { playerId, type: "fold" });
  }
  game = applyAction(game, { playerId: 3, type: "raise", amount: 100 });
  game = applyAction(game, { playerId: 4, type: "fold" });

  assert.notEqual(game.result, null);
  const recorded = recordCompletedHand(emptyProfile(), game);

  assert.equal(recorded.aiProfiles[2].pfrHands, 1);
  assert.equal(recorded.aiProfiles[2].threeBetHands, 0);
  assert.equal(recorded.aiProfiles[3].threeBetHands, 1);
  assert.equal(recorded.aiProfiles[4].threeBetHands, 0);
  assert.equal(recorded.aiProfiles[5].threeBetHands, 0);
});

test("a full preflop all-in after an open counts as a 3Bet", () => {
  let game = createGame(303);

  game = applyAction(game, { playerId: 2, type: "raise", amount: 40 });
  game.players[3].chips = 60;
  game = applyAction(game, { playerId: 3, type: "all-in" });
  for (const playerId of [4, 5, 0, 1, 2]) {
    game = applyAction(game, { playerId, type: "fold" });
  }

  assert.notEqual(game.result, null);
  const recorded = recordCompletedHand(emptyProfile(), game);
  assert.equal(recorded.aiProfiles[2].threeBetHands, 0);
  assert.equal(recorded.aiProfiles[3].threeBetHands, 1);
});

test("resetLearningData clears AI profiles but preserves completed-hand history", () => {
  let game = createGame(305);
  for (const playerId of [2, 3, 4, 5, 0]) {
    game = applyAction(game, { playerId, type: "fold" });
  }
  const recorded = recordCompletedHand(emptyProfile(), game);
  assert.equal(recorded.history.length, 1);
  assert.ok(Object.keys(recorded.aiProfiles).length > 0);

  const reset = resetLearningData(recorded);
  assert.equal(reset.history, recorded.history);
  assert.deepEqual(reset.aiProfiles, {});
  assert.equal(reset.chips, recorded.chips);
});

function foldToBigBlindWin(seed: number) {
  let game = createGame(seed);
  for (const playerId of [2, 3, 4, 5, 0]) {
    game = applyAction(game, { playerId, type: "fold" });
  }
  return game;
}

test("first hands from different sessions are both recorded despite equal action counts", () => {
  const first = foldToBigBlindWin(307);
  const second = foldToBigBlindWin(309);
  assert.equal(first.handNumber, second.handNumber);
  assert.equal(first.actionSequence, second.actionSequence);
  assert.notEqual(first.handId, second.handId);

  const once = recordCompletedHand(emptyProfile(), first);
  const twice = recordCompletedHand(once, second);
  const idempotent = recordCompletedHand(twice, second);
  assert.equal(twice.history.length, 2);
  assert.equal(new Set(twice.history.map((record) => record.id)).size, 2);
  assert.equal(idempotent, twice);
});

test("loadSession deterministically migrates legacy snapshots without identifiers", () => {
  const legacy = createGame(311) as GameState & {
    sessionId?: string;
    handId?: string;
  };
  Reflect.deleteProperty(
    legacy as unknown as Record<string, unknown>,
    "sessionId",
  );
  Reflect.deleteProperty(
    legacy as unknown as Record<string, unknown>,
    "handId",
  );
  const snapshot = JSON.stringify({
    version: 1,
    savedAt: "2026-08-02T00:00:00.000Z",
    game: legacy,
  });
  const values = new Map<string, string>([["poker-ai-web/session", snapshot]]);
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });

  try {
    const first = loadSession();
    const second = loadSession();
    assert.notEqual(first, null);
    assert.equal(first?.sessionId, second?.sessionId);
    assert.equal(first?.handId, second?.handId);
    assert.match(first?.sessionId ?? "", /^legacy-session-/);
    assert.match(first?.handId ?? "", /-hand-1$/);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});
