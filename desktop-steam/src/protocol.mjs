import path from "node:path";
import { readFile, stat } from "node:fs/promises";

export const APP_SCHEME = "poker-ai";
export const APP_HOST = "app";
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function isTrustedAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST;
  } catch {
    return false;
  }
}

export function resolveClientAsset(clientRoot, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname).replaceAll("\\", "/");
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "..")) return null;

  const root = path.resolve(clientRoot);
  const candidate = path.resolve(root, ...segments);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return candidate;
}

function securityHeaders(source) {
  const headers = new Headers(source);
  headers.set("content-security-policy", CONTENT_SECURITY_POLICY);
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  return headers;
}

function secureResponse(response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: securityHeaders(response.headers),
  });
}

async function packagedAssetResponse(clientRoot, url) {
  const filePath = resolveClientAsset(clientRoot, url.pathname);
  if (!filePath) return null;
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) return null;
    const body = await readFile(filePath);
    const headers = securityHeaders({
      "content-type":
        CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ??
        "application/octet-stream",
    });
    if (url.pathname === "/sw.js") headers.set("service-worker-allowed", "/");
    return new Response(body, { status: 200, headers });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

function workerEnvironment(clientRoot) {
  return {
    ASSETS: {
      async fetch(request) {
        const response = await packagedAssetResponse(
          clientRoot,
          new URL(request.url),
        );
        return response ?? new Response("Not Found", { status: 404 });
      },
    },
    IMAGES: {
      input(body) {
        return {
          transform() {
            return {
              output() {
                return Promise.resolve({
                  response: () => new Response(body),
                });
              },
            };
          },
        };
      },
    },
  };
}

export function createDesktopRequestHandler({ clientRoot, worker }) {
  const env = workerEnvironment(clientRoot);
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  };

  return async function handleDesktopRequest(request) {
    if (!isTrustedAppUrl(request.url)) {
      return secureResponse(new Response("Forbidden", { status: 403 }));
    }

    const asset = await packagedAssetResponse(clientRoot, new URL(request.url));
    if (asset) return asset;

    const response = await worker.fetch(request, env, context);
    return secureResponse(response);
  };
}
