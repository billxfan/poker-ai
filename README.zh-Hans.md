# 德扑 AI 训练器

[English README](./README.md)

一款面向 iOS 17+ 的离线德州扑克训练应用，围绕 6 人桌训练、差异化 AI 对手、手牌复盘与长期打法画像展开。

## 核心特性

- 6 人桌无限注德州扑克训练
- 5 个不同基础风格的 AI 对手
- 最近手牌、行动记录、AI 画像与历史统计
- 每日奖励与激励广告虚拟筹码体系
- 支持英文与简体中文本地化

## 技术栈

- Swift 5.9+
- SwiftUI
- XcodeGen
- JSON 文件 + `UserDefaults` 本地持久化
- Firebase Analytics + AdMob 激励广告

## 项目结构

```text
src/
  App/           应用入口
  Core/          德扑规则引擎、AI、数据模型
  Features/      主页面、对局页、福利页、统计页
  Services/      广告、分析、存储、存档
  Shared/        共享 UI 组件与扩展
PokerAI/         iOS Target 资源与 plist
Tests/           单元测试与回归测试
docs/            产品、架构、上架、App Store 文档
  site/          对外公开的隐私政策与支持页
```

## 构建方式

1. 安装 XcodeGen：

```bash
brew install xcodegen
```

2. 生成工程：

```bash
xcodegen generate
```

3. 打开项目：

```bash
open PokerAI.xcodeproj
```

4. 构建或测试：

```bash
xcodebuild build -project PokerAI.xcodeproj -scheme PokerAI
xcodebuild test -project PokerAI.xcodeproj -scheme PokerAI -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

## 公开文档

公开仓库中保留的项目说明文档：

- 架构说明：[`docs/architecture.md`](./docs/architecture.md)
- 设计说明：[`docs/DESIGN.md`](./docs/DESIGN.md)
- 隐私政策/支持页的 GitHub Pages 说明：[`docs/site/README.md`](./docs/site/README.md)

## 说明

- 应用仅使用虚拟训练积分。
- 不支持真钱赌博、提现或多人下注对战。
