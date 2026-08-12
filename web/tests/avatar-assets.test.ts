import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AI_PROFILE_AVATAR_SOURCES,
  AVATAR_SOURCES,
} from "../app/characterAssets.ts";

test("every AI profile avatar is available and preloaded by the root layout", async () => {
  assert.deepEqual(
    AI_PROFILE_AVATAR_SOURCES,
    [1, 2, 3, 4, 5].map((seatId) => AVATAR_SOURCES[seatId]),
  );
  assert.equal(new Set(AI_PROFILE_AVATAR_SOURCES).size, 5);

  await Promise.all(
    AI_PROFILE_AVATAR_SOURCES.map((source) =>
      access(
        fileURLToPath(new URL(`../public${source}`, import.meta.url)),
      ),
    ),
  );

  const layoutSource = await readFile(
    fileURLToPath(new URL("../app/layout.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(layoutSource, /AI_PROFILE_AVATAR_SOURCES\.map/);
  assert.match(layoutSource, /rel="preload"/);
  assert.match(layoutSource, /as="image"/);

  const gameSource = await readFile(
    fileURLToPath(new URL("../app/PokerGame.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(gameSource, /player-avatar-fallback/);
});
