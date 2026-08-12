import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  APP_ORIGIN,
  createDesktopRequestHandler,
  isTrustedAppUrl,
  resolveClientAsset,
} from "../src/protocol.mjs";
import {
  createWindowOptions,
  shouldAllowNavigation,
} from "../src/window-options.mjs";

test("desktop protocol accepts only the packaged application origin", () => {
  assert.equal(APP_ORIGIN, "poker-ai://app");
  assert.equal(isTrustedAppUrl("poker-ai://app/"), true);
  assert.equal(isTrustedAppUrl("poker-ai://app/assets/game.js"), true);
  assert.equal(isTrustedAppUrl("poker-ai://other/"), false);
  assert.equal(isTrustedAppUrl("https://app/"), false);
  assert.equal(isTrustedAppUrl("not a url"), false);
});

test("desktop window keeps renderer privileges disabled", () => {
  const options = createWindowOptions("/tmp/icon.png");
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.webviewTag, false);
  assert.equal(options.height, 900);
  assert.equal(options.minHeight, 700);
  assert.equal(options.icon, "/tmp/icon.png");
  assert.equal(shouldAllowNavigation("poker-ai://app/statistics"), true);
  assert.equal(shouldAllowNavigation("https://example.com"), false);
});

test("desktop asset resolution stays inside the packaged client directory", () => {
  const clientRoot = path.join(tmpdir(), "poker-ai-client");
  assert.equal(
    resolveClientAsset(clientRoot, "/assets/game.js"),
    path.join(clientRoot, "assets", "game.js"),
  );
  assert.equal(resolveClientAsset(clientRoot, "/../secret.txt"), null);
  assert.equal(resolveClientAsset(clientRoot, "/%2e%2e/secret.txt"), null);
  assert.equal(resolveClientAsset(clientRoot, "/%00secret.txt"), null);
  assert.equal(resolveClientAsset(clientRoot, "/%E0%A4%A"), null);
});

test("desktop handler serves packaged assets and delegates application routes", async () => {
  const clientRoot = await mkdtemp(path.join(tmpdir(), "poker-ai-desktop-"));
  await mkdir(path.join(clientRoot, "assets"));
  await writeFile(
    path.join(clientRoot, "assets", "game.js"),
    "globalThis.pokerAiLoaded = true;",
  );

  let delegated = 0;
  const worker = {
    async fetch() {
      delegated += 1;
      return new Response("<!doctype html><title>Poker AI</title>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  };
  const handle = createDesktopRequestHandler({ clientRoot, worker });

  try {
    const asset = await handle(
      new Request("poker-ai://app/assets/game.js"),
    );
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert.match(await asset.text(), /pokerAiLoaded/);
    assert.equal(delegated, 0);

    const page = await handle(new Request("poker-ai://app/"));
    assert.equal(page.status, 200);
    assert.equal(delegated, 1);
    assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'self'/);
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");

    const foreign = await handle(new Request("poker-ai://other/"));
    assert.equal(foreign.status, 403);
    assert.equal(delegated, 1);
  } finally {
    await rm(clientRoot, { recursive: true, force: true });
  }
});
