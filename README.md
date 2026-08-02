# Poker AI Trainer

[中文说明](./README.zh-Hans.md)

An offline Texas Hold'em trainer with two independent clients:

- [`ios/`](./ios/) — the original iOS 17+ app, built with SwiftUI and XcodeGen.
- [`web/`](./web/) — an installable, browser-local single-player game built with
  React and TypeScript.

Both clients use virtual training chips only. They have no account, real-money,
or multiplayer features.

## Run a client

```bash
cd ios && xcodegen generate
```

```bash
cd web && npm install && npm run dev
```

See each folder's README for platform-specific setup and verification commands.
