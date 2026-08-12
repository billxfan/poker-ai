import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import electronPath from "electron";

const marker = "[desktop-smoke]";

async function launch(mode, userData) {
  const child = spawn(electronPath, ["."], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      POKER_AI_DESKTOP_SMOKE: mode,
      POKER_AI_DESKTOP_USER_DATA: userData,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGTERM"), 30_000);
  const [code, signal] = await new Promise((resolve) => {
    child.once("exit", (...result) => resolve(result));
  });
  clearTimeout(timeout);
  assert.equal(signal, null, `Electron smoke test terminated by ${signal}`);
  assert.equal(code, 0, `Electron smoke test exited ${code}: ${stderr}`);
  const markerIndex = stdout.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, `Desktop readiness marker missing: ${stderr}`);
  return JSON.parse(stdout.slice(markerIndex + marker.length).trim());
}

const userData = await mkdtemp(path.join(tmpdir(), "poker-ai-electron-"));
try {
  const firstLaunch = await launch("write", userData);
  const secondLaunch = await launch("read", userData);
  assert.match(firstLaunch.title, /德扑 AI 训练器/);
  assert.match(firstLaunch.text, /德扑 AI 训练器/);
  assert.equal(secondLaunch.storage, "persisted");
  process.stdout.write(`${JSON.stringify({ firstLaunch, secondLaunch })}\n`);
} finally {
  await rm(userData, { recursive: true, force: true });
}
