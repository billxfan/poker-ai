# Poker AI Trainer

[中文说明](./README.zh-Hans.md)

An offline Texas Hold'em trainer with three isolated delivery targets:

- [`ios/`](./ios/) — the original iOS 17+ app, built with SwiftUI and XcodeGen.
- [`web/`](./web/) — an installable, browser-local single-player game built with
  React and TypeScript.
- [`desktop-steam/`](./desktop-steam/) — an Electron/Steam delivery shell that
  reuses the Web production build. **Status: pending optimization; not ready for
  public Steam release.**

All clients use virtual training chips only. They have no account, real-money,
or multiplayer features.

## Run a client

```bash
cd ios && xcodegen generate
```

```bash
cd web && npm install && npm run dev
```

See each folder's README for platform-specific setup and verification commands.

## Docker / NAS

Docker packages the Web client for self-hosting; it is not a third game
codebase. The isolated deployment files and NAS instructions are in
[`deploy/docker/`](./deploy/docker/), and the image build excludes `ios/`.
