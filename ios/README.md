# Poker AI Trainer for iOS

[中文说明](./README.zh-Hans.md)

The original iOS 17+ Texas Hold'em training app. It uses Swift 5.9+, SwiftUI,
and XcodeGen, and stores gameplay records on the device.

## Structure

```text
src/                 Application source
PokerAI/             Target resources and plist files
PokerAI.xcodeproj/   Generated Xcode project
Tests/               Unit and regression tests
docs/                Product and public support docs
project.yml          XcodeGen specification
```

## Run

```bash
brew install xcodegen
xcodegen generate
open PokerAI.xcodeproj
```

## Verify

```bash
xcodebuild build -project PokerAI.xcodeproj -scheme PokerAI
xcodebuild test -project PokerAI.xcodeproj -scheme PokerAI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

`GoogleService-Info.plist` is intentionally not committed. Add your own file
to this `ios/` directory only if you need Firebase Analytics locally.

## Public docs

- [Architecture](./docs/architecture.md)
- [Design](./docs/DESIGN.md)
- [Privacy/support site publishing](./docs/site/README.md)
