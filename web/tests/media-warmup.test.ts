import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const gameSource = fs.readFileSync(
  path.join(projectRoot, "app", "PokerGame.tsx"),
  "utf8",
);
const audioSource = fs.readFileSync(
  path.join(projectRoot, "app", "gameAudio.ts"),
  "utf8",
);

test("warms the illustrated deck from the home screen in bounded batches", () => {
  assert.match(gameSource, /CAT_CARD_ART_SOURCES/);
  assert.match(gameSource, /warmImageCache\(TABLE_CHARACTER_ASSET_SOURCES/);
  assert.match(gameSource, /warmImageCache\(CAT_CARD_ART_SOURCES/);
  assert.match(gameSource, /concurrency:\s*4/);
  assert.match(gameSource, /card-art-fallback/);
  assert.match(gameSource, /onLoad=\{\(\) => setArtLoaded\(true\)\}/);
});

test("defers synthesized sounds until the browser audio context is running", () => {
  assert.match(audioSource, /function runWhenAudioReady/);
  assert.match(audioSource, /\.resume\(\)[\s\S]*\.then\(\(\) =>/);
  assert.match(audioSource, /runWhenAudioReady\(\(context\) =>/);
});
