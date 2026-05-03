# Poker AI Trainer

[中文说明](./README.zh-Hans.md)

Offline Texas Hold'em training app for iOS 17+, built around a six-handed table, distinct AI play styles, hand history review, and long-term player profiling.

## Highlights

- Six-handed no-limit Texas Hold'em training
- Five AI opponents with different baseline styles
- Hand history, recent-hands review, and AI profiling
- Daily rewards and rewarded-ad virtual chip flow
- English and Simplified Chinese localization

## Tech Stack

- Swift 5.9+
- SwiftUI
- XcodeGen
- Local persistence with JSON files and `UserDefaults`
- Firebase Analytics + AdMob rewarded ads

## Project Structure

```text
src/
  App/           App entry
  Core/          Poker engine, AI, and models
  Features/      Main, Game, Welfare, Statistics
  Services/      Ads, analytics, persistence, archive
  Shared/        Shared UI components and extensions
PokerAI/         iOS target resources and plist files
Tests/           Unit and regression tests
docs/            Product, architecture, release, and App Store docs
```

## Build

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

## App Store Assets

App Store submission materials live in [`docs/app-store`](./docs/app-store/), including:

- metadata copy
- screenshot checklist
- app privacy reference
- overseas launch runbook

GitHub Pages files for the privacy policy and support page live in [`docs/site`](./docs/site/README.md).

## Notes

- This app uses virtual training points only.
- It does not support real-money gambling, cash-out, or multiplayer betting.
