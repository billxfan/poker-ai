# Adversarial Review — Steam Desktop Architecture — 2026-08-09

## Context

- Product: offline single-player poker game
- Stack: React, Vinext/Vite, Electron
- Delivery target: Steam Windows x64 candidate
- Stage: desktop architecture increment

## Dynamic review

| Question | Operation | Evidence and conclusion |
|---|---|---|
| Would an embedded local server preserve saves across launches? | CHALLENGE | A random port changes the web origin and a fixed port can collide. Replaced the server plan with the stable `poker-ai://app` origin. |
| Can the existing production build remain the source of truth? | AGREE | The adapter delegates routes to the packaged Vinext worker and serves the same `dist/client` assets; no poker or presentation fork is introduced. |
| Does the desktop shell expand an XSS into filesystem access? | CONNECT | The renderer has no Node integration, preload bridge or IPC. Context isolation and sandboxing stay enabled, and navigation/window creation are denied. |
| Is the custom protocol an accidental network surface? | AGREE | No socket is opened. All responses come from packaged assets or the packaged worker. Permission requests are denied. |
| Can a crafted URL escape the packaged client directory? | SURFACE | The adapter must decode once, reject invalid encoding and null bytes, resolve against the client root, and verify the resolved path stays inside that root. Unit tests are required before implementation is accepted. |

## Verdict

**Pass with implementation gates.** The architecture is acceptable only if the
path-containment tests, packaged route smoke test, sandbox settings and
navigation denial all pass.
