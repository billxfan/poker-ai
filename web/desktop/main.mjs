import { pathToFileURL } from "node:url";
import path from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  protocol,
  session,
} from "electron";

import {
  APP_ORIGIN,
  APP_SCHEME,
  createDesktopRequestHandler,
} from "./protocol.mjs";
import {
  createWindowOptions,
  shouldAllowNavigation,
} from "./window-options.mjs";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      codeCache: true,
    },
  },
]);

app.enableSandbox();

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

let mainWindow = null;

function appPaths() {
  const root = app.getAppPath();
  return {
    clientRoot: path.join(root, "dist", "client"),
    icon: path.join(root, "dist", "client", "poker-ai-icon.png"),
    workerEntry: path.join(root, "dist", "server", "index.js"),
  };
}

async function registerApplicationProtocol() {
  const paths = appPaths();
  const workerModule = await import(pathToFileURL(paths.workerEntry).href);
  const handle = createDesktopRequestHandler({
    clientRoot: paths.clientRoot,
    worker: workerModule.default,
  });
  await protocol.handle(APP_SCHEME, handle);
  return paths;
}

function lockRendererCapabilities(targetSession) {
  targetSession.setPermissionCheckHandler(() => false);
  targetSession.setPermissionRequestHandler((_webContents, _permission, reply) => {
    reply(false);
  });
  targetSession.on("will-download", (event) => event.preventDefault());
}

function createMainWindow(icon) {
  const window = new BrowserWindow(createWindowOptions(icon));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!shouldAllowNavigation(url)) event.preventDefault();
  });
  window.webContents.on("did-fail-load", (_event, code, description, url) => {
    if (code === -3) return;
    dialog.showErrorBox(
      "游戏启动失败",
      `${description} (${code})\n${url}`,
    );
  });
  window.once("ready-to-show", () => window.show());
  if (process.env.POKER_AI_DESKTOP_SMOKE === "1") {
    window.webContents.once("did-finish-load", async () => {
      const snapshot = await window.webContents.executeJavaScript(
        "({ title: document.title, text: document.body.innerText.slice(0, 300) })",
        true,
      );
      process.stdout.write(`[desktop-smoke]${JSON.stringify(snapshot)}\n`);
      app.quit();
    });
  }
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

async function startDesktopApplication() {
  Menu.setApplicationMenu(null);
  const paths = await registerApplicationProtocol();
  lockRendererCapabilities(session.defaultSession);
  mainWindow = createMainWindow(paths.icon);
  await mainWindow.loadURL(`${APP_ORIGIN}/`);
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(startDesktopApplication).catch((error) => {
    dialog.showErrorBox("游戏启动失败", error?.stack ?? String(error));
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const { icon } = appPaths();
      mainWindow = createMainWindow(icon);
      void mainWindow.loadURL(`${APP_ORIGIN}/`);
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
