# Poker AI Trainer

[中文说明](./README.zh-Hans.md)

An offline Texas Hold'em training project with two clearly separated clients:
the original iOS app and a new browser-based single-player game.

## Choose a client

| Client | Location | Stack | Scope |
| --- | --- | --- | --- |
| **iOS · Original** | Repository root | Swift 5.9+, SwiftUI, XcodeGen | The original iOS 17+ training app |
| **Web · Single player** | [`web/`](./web/) | React, TypeScript, installable PWA | Account-free, backend-free, ad-free local play |

Both clients provide a six-handed no-limit Texas Hold'em table with five AI
opponents, hand settlement, history, statistics, and device-local persistence.
They share the same product concept, but their source code, build tooling, and
runtime storage are independent.

## Repository structure

```text
src/                 Original iOS application source
PokerAI/             iOS target resources and plist files
PokerAI.xcodeproj/   Generated Xcode project
Tests/               iOS unit and regression tests
docs/                iOS product and public support docs
web/                 New offline web client
  app/               React screens and presentation
  core/              Poker rules, AI, evaluation, and local storage
  public/            PWA manifest, service worker, icons, avatars
  tests/             Deterministic poker regression tests
```

## Run the iOS app

1. Install XcodeGen:

```bash
brew install xcodegen
```

2. Generate the Xcode project:

```bash
xcodegen generate
```

3. Open the project:

```bash
open PokerAI.xcodeproj
```

4. Build or test:

```bash
xcodebuild build -project PokerAI.xcodeproj -scheme PokerAI
xcodebuild test -project PokerAI.xcodeproj -scheme PokerAI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

Optional local setup:

- `GoogleService-Info.plist` is intentionally not committed.
- If you want Firebase Analytics enabled locally, add your own config file at the project root.

## Run the web game

```bash
cd web
npm install
npm run dev
```

Verify the production build and poker regression suite:

```bash
cd web
npm test
```

The web client stores all game state in the current browser. It has no account,
authentication, backend, cloud sync, analytics, ads, or real-money features.
See [`web/README.md`](./web/README.md) for details.

## Public docs

Public project-facing docs live here:

- architecture notes: [`docs/architecture.md`](./docs/architecture.md)
- design notes: [`docs/DESIGN.md`](./docs/DESIGN.md)
- GitHub Pages setup for privacy/support pages: [`docs/site/README.md`](./docs/site/README.md)

## Notes

- Both clients use virtual training points only.
- Neither client supports real-money gambling, cash-out, or multiplayer betting.
- Mobile-only integrations in the original iOS project are not used by the web client.
