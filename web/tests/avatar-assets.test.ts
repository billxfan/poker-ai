import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AI_PROFILE_AVATAR_SOURCES,
  AVATAR_SOURCES,
} from "../app/characterAssets.ts";

test("every AI profile avatar is embedded and requires no image request", async () => {
  assert.deepEqual(
    AI_PROFILE_AVATAR_SOURCES,
    [1, 2, 3, 4, 5].map((seatId) => AVATAR_SOURCES[seatId]),
  );
  assert.equal(new Set(AI_PROFILE_AVATAR_SOURCES).size, 5);

  for (const source of Object.values(AVATAR_SOURCES)) {
    assert.match(source, /^data:image\/webp;base64,/);
    const bytes = Buffer.from(source.split(",", 2)[1], "base64");
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok(bytes.byteLength < 3_000);
  }

  const gameSource = await readFile(
    fileURLToPath(new URL("../app/PokerGame.tsx", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(gameSource, /AI_PROFILE_AVATAR_SOURCES\.forEach/);
  assert.match(gameSource, /player-avatar-fallback/);
});

test("the poker table shows embedded character placeholders before full art loads", async () => {
  const gameSource = await readFile(
    new URL("../app/PokerGame.tsx", import.meta.url),
    "utf8",
  );
  const serviceWorkerSource = await readFile(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );

  assert.match(gameSource, /seat-character-placeholder/);
  assert.match(gameSource, /src=\{AVATAR_SOURCES\[player\.id\]\}/);
  assert.match(gameSource, /onLoad=\{\(\) => setTableArtLoaded\(true\)\}/);
  assert.match(gameSource, /!tableArtLoaded \?/);
  assert.match(gameSource, /TABLE_CHARACTER_ASSET_SOURCES\.forEach/);
  assert.match(gameSource, /fetchPriority="high"/);
  assert.match(serviceWorkerSource, /cache\.addAll\(APP_SHELL\)/);
  assert.doesNotMatch(serviceWorkerSource, /\.\.\.CAT_CARD_DECK/);
  assert.doesNotMatch(serviceWorkerSource, /\/characters\/v3\//);
});
