# 德扑 AI 训练器

[English README](./README.md)

一个包含两套独立客户端的离线德州扑克训练项目：原有 iOS App，以及本次新增的浏览器单机版。

## 选择版本

| 版本 | 位置 | 技术栈 | 定位 |
| --- | --- | --- | --- |
| **iOS · 原版** | 仓库根目录 | Swift 5.9+、SwiftUI、XcodeGen | 原有 iOS 17+ 训练 App |
| **Web · 单机版** | [`web/`](./web/) | React、TypeScript、可安装 PWA | 无账号、无后端、无广告的本地网页游戏 |

两套客户端都提供 6 人桌无限注德州扑克、5 个差异化 AI 对手、结算、
历史统计和设备本地存档。它们共享产品设定，但源码、构建工具和运行时
存储相互独立。

## 仓库结构

```text
src/                 原有 iOS App 源码
PokerAI/             iOS Target 资源与 plist
PokerAI.xcodeproj/   生成后的 Xcode 工程
Tests/               iOS 单元测试与回归测试
docs/                iOS 产品文档与公开支持页面
web/                 本次新增的离线网页端
  app/               React 页面与界面组件
  core/              德扑规则、AI、牌型计算与本地存储
  public/            PWA 配置、Service Worker、图标与头像
  tests/             确定性德扑回归测试
```

## 运行 iOS 原版

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

可选本地配置：

- `GoogleService-Info.plist` 不会提交到公开仓库。
- 如果你希望在本地启用 Firebase Analytics，请自行在项目根目录放入对应配置文件。

## 运行 Web 单机版

```bash
cd web
npm install
npm run dev
```

验证生产构建与德扑规则回归测试：

```bash
cd web
npm test
```

网页端的全部游戏数据只保存在当前浏览器中，不包含账号、登录、后端、
云同步、统计 SDK、广告或真钱功能。更多说明见
[`web/README.zh-Hans.md`](./web/README.zh-Hans.md)。

## 公开文档

公开仓库中保留的项目说明文档：

- 架构说明：[`docs/architecture.md`](./docs/architecture.md)
- 设计说明：[`docs/DESIGN.md`](./docs/DESIGN.md)
- 隐私政策/支持页的 GitHub Pages 说明：[`docs/site/README.md`](./docs/site/README.md)

## 说明

- 两套客户端都只使用虚拟训练积分。
- 两套客户端都不支持真钱赌博、提现或多人下注对战。
- 原 iOS 工程中的移动端专属集成不会被网页端引用。
