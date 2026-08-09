import assert from "node:assert/strict";
import { spawn } from "node:child_process";

import electronPath from "electron";

const marker = "[desktop-smoke]";
const child = spawn(electronPath, ["."], {
  cwd: process.cwd(),
  env: { ...process.env, POKER_AI_DESKTOP_SMOKE: "1" },
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

const timeout = setTimeout(() => {
  child.kill("SIGTERM");
}, 30_000);

const [code, signal] = await new Promise((resolve) => {
  child.once("exit", (...result) => resolve(result));
});
clearTimeout(timeout);

assert.equal(signal, null, `Electron smoke test terminated by ${signal}`);
assert.equal(code, 0, `Electron smoke test exited ${code}: ${stderr}`);
const markerIndex = stdout.lastIndexOf(marker);
assert.notEqual(markerIndex, -1, `Desktop readiness marker missing: ${stderr}`);
const snapshot = JSON.parse(stdout.slice(markerIndex + marker.length).trim());
assert.match(snapshot.title, /Poker AI/);
assert.match(snapshot.text, /德扑 AI 训练器/);
process.stdout.write(`${JSON.stringify(snapshot)}\n`);
