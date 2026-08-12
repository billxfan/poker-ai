# Desktop / Steam Architecture — ⚠️ 待优化

## Delivery boundary

The desktop package is a delivery adapter around the Web production build:

```text
web/ source --vinext build--> web/dist
                                  |
                                  v
desktop-steam package --resource--> web-dist
                                  |
                                  v
BrowserWindow --poker-ai://app--> protocol adapter --> Vinext worker/assets
```

`desktop-steam/` owns Electron and platform packaging. `web/` owns all game
rules, AI, UI, media and persistence semantics. `ios/` is independent of both.

## Security decisions

- Stable custom origin instead of a localhost listener, preserving local saves
  without exposing a port.
- Sandboxed renderer, context isolation, Node integration disabled.
- No preload bridge or IPC surface.
- Permissions, downloads, new windows and external navigation denied.
- Packaged asset paths are decoded once, checked for traversal and constrained
  to the read-only Web production resource directory.

## Release status

Architecture and automated desktop checks pass for a development candidate.
Native Windows execution, signing and Steam-client validation are not proven and
remain release-blocking work.
