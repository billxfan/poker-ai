import { isTrustedAppUrl } from "./protocol.mjs";

export function createWindowOptions(icon) {
  return {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#071714",
    ...(icon ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
    },
  };
}

export function shouldAllowNavigation(url) {
  return Boolean(isTrustedAppUrl(url));
}
