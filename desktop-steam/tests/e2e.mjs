import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import electronPath from "electron";
import { _electron as electron } from "playwright-core";

const outputDir = path.resolve(
  process.env.POKER_AI_E2E_OUTPUT ?? "output/desktop-e2e",
);
const userData = await mkdtemp(path.join(tmpdir(), "poker-ai-e2e-"));
await mkdir(outputDir, { recursive: true });

const application = await electron.launch({
  executablePath: electronPath,
  args: ["."],
  cwd: process.cwd(),
  env: {
    ...process.env,
    POKER_AI_DESKTOP_USER_DATA: userData,
  },
});

const externalRequests = []; // Must remain empty for the offline Steam candidate.
try {
  const page = await application.firstWindow();
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) externalRequests.push(request.url());
  });

  await page.getByRole("button", { name: "新开始", exact: true }).waitFor();
  await page.waitForFunction(() => {
    const dailyCard = document.querySelector(".daily-card");
    const actions = document.querySelector(".home-actions");
    return (
      dailyCard &&
      actions &&
      Number.parseFloat(getComputedStyle(dailyCard).opacity) > 0.99 &&
      Number.parseFloat(getComputedStyle(actions).opacity) > 0.99
    );
  });
  const homeLayout = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("新开始"),
    );
    const rect = button?.getBoundingClientRect();
    return {
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      button: rect ? [rect.x, rect.y, rect.width, rect.height] : null,
    };
  });
  await page.screenshot({ path: path.join(outputDir, "steam-desktop-home.png") });

  const isolation = await page.evaluate(() => ({
    nodeProcess: typeof globalThis.process,
    requireFunction: typeof globalThis.require,
  }));
  assert.deepEqual(isolation, {
    nodeProcess: "undefined",
    requireFunction: "undefined",
  });

  await page.getByRole("button", { name: "新开始", exact: true }).click();
  await page
    .getByRole("button", { name: "确认新开始", exact: true })
    .click();
  await page.getByText("第 1 局", { exact: true }).waitFor();
  await page.getByRole("button", { name: /弃牌/ }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.screenshot({ path: path.join(outputDir, "steam-desktop-table.png") });

  assert.equal(externalRequests.length, 0, externalRequests.join("\n"));
  assert.equal(
    await page.evaluate(() => window.open("https://example.com")),
    null,
  );
  process.stdout.write(
    `${JSON.stringify({
      title: await page.title(),
      screenshots: [
        path.join(outputDir, "steam-desktop-home.png"),
        path.join(outputDir, "steam-desktop-table.png"),
      ],
      externalRequests,
      isolation,
      homeLayout,
      viewport: await page.evaluate(() => [innerWidth, innerHeight]),
    })}\n`,
  );
} finally {
  await application.close();
  await rm(userData, { recursive: true, force: true });
}
