# 德扑 AI 训练器 · iOS

[English README](./README.md)

原有的 iOS 17+ 德州扑克训练 App，使用 Swift 5.9+、SwiftUI 与 XcodeGen，
对局记录保存在设备本地。

## 目录结构

```text
src/                 App 源码
PokerAI/             Target 资源与 plist
PokerAI.xcodeproj/   生成后的 Xcode 工程
Tests/               单元测试与回归测试
docs/                产品和公开支持文档
project.yml          XcodeGen 配置
```

## 运行

```bash
brew install xcodegen
xcodegen generate
open PokerAI.xcodeproj
```

## 验证

```bash
xcodebuild build -project PokerAI.xcodeproj -scheme PokerAI
xcodebuild test -project PokerAI.xcodeproj -scheme PokerAI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

`GoogleService-Info.plist` 不会提交到仓库；只有本地需要 Firebase
Analytics 时，才将自己的配置文件放在此 `ios/` 目录。

## 公开文档

- [架构说明](./docs/architecture.md)
- [设计说明](./docs/DESIGN.md)
- [隐私政策/支持页发布说明](./docs/site/README.md)
