# Contributing

Thanks for your interest in contributing to Poker AI Trainer.

## Before You Start

- Keep changes focused and easy to review.
- Prefer small pull requests over large mixed changes.
- If you are changing gameplay rules, explain the expected poker behavior clearly.
- If you are changing public UI, include screenshots when possible.

## Local Setup

All commands below are run from the `ios/` directory.

1. Install XcodeGen:

```bash
brew install xcodegen
```

2. Generate the project:

```bash
xcodegen generate
```

3. Open the project:

```bash
open PokerAI.xcodeproj
```

## Build and Test

Run a local build:

```bash
xcodebuild build -project PokerAI.xcodeproj -scheme PokerAI
```

Run tests:

```bash
xcodebuild test -project PokerAI.xcodeproj -scheme PokerAI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

## Analytics and Ad Config

- `GoogleService-Info.plist` is not committed to the public repo.
- Contributors can still build the project without it.
- If you need Firebase locally, add your own config file at the project root.

## Pull Request Notes

- Describe the user-facing change.
- Mention any gameplay rule assumptions.
- Note any follow-up work or known limitations.

## Scope

Good contribution areas:
- poker engine correctness
- AI decision logic
- SwiftUI usability and layout
- tests and regression coverage
- localization improvements
