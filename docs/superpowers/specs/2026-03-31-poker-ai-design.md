# 德扑 AI iOS 应用 - 设计文档

## 1. 项目概述

**项目名称**: PokerAI
**类型**: iOS 原生应用 (SwiftUI)
**核心功能**: 人类玩家与 AI Bot 对战的德州扑克游戏
**目标平台**: iOS Simulator (iOS 17.0+)

---

## 2. 技术栈

| 技术 | 选择 | 说明 |
|-----|------|-----|
| UI 框架 | SwiftUI | Apple 现代声明式 UI |
| 数据持久化 | SwiftData | Apple 最新数据框架 |
| 架构模式 | MVVM | ViewModel 作为中介 |
| AI 方案 | 简化 Q-Learning | 有限状态空间 + 简单 Q 表 |

---

## 3. 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│                     SwiftUI Views                    │
│  (GameTableView, MainMenuView, StatsView...)       │
└─────────────────────┬───────────────────────────────┘
                      │ @ObservedObject
┌─────────────────────▼───────────────────────────────┐
│                  GameViewModel                       │
│  (状态管理, 用户操作, UI 更新)                       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  PokerGameEngine                     │
│  (发牌, 下注, 流程控制, 手牌评估)                   │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ QLearning   │ │   Bot AI    │ │ SwiftData   │
│  Agent      │ │  Decision   │ │ Persistence │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 核心模块

| 模块 | 职责 | 文件 |
|-----|------|-----|
| **Models** | Card, Deck, Player, Bot, GameState | Card.swift, Player.swift, Bot.swift, GameState.swift |
| **Engine** | 游戏逻辑核心 | PokerEngine.swift, HandEvaluator.swift, BettingManager.swift |
| **AI** | Q-Learning + Bot决策 | QLearnEngine.swift, BotDecisionEngine.swift, PersonalityTemplates.swift |
| **ViewModels** | 状态与业务逻辑 | GameViewModel.swift, StatsViewModel.swift |
| **Views** | SwiftUI 界面 | MainMenuView, GameTableView, PlayerSeatView, CardView... |
| **Persistence** | SwiftData 存储 | HandRecord.swift, BotStatsRecord.swift |

---

## 4. 数据模型

### Card
```swift
struct Card {
    let suit: Suit      // ♠ ♥ ♦ ♣
    let rank: Rank       // 2-10, J, Q, K, A
    var isFaceUp: Bool
}
```

### Player (协议)
```swift
protocol Player {
    var id: String { get }
    var name: String { get }
    var stack: Double { get set }
    var holeCards: [Card] { get set }
    var isFolded: Bool { get set }
    var currentBet: Double { get set }
}
```

### Bot 特有
```swift
class Bot {
    var personality: PersonalityType  // tight, loose, aggressive, passive
    var qTable: [String: [Double]]   // Q-Learning 表
    var explorationRate: Double       // 探索率
    var stats: BotLifetimeStats      // 累计统计
}
```

### GameState
```swift
enum Street { case preflop, flop, turn, river, showdown }

struct GameState {
    var street: Street
    var pot: Double
    var communityCards: [Card]
    var dealerPosition: Int
    var currentBet: Double
    var toCall: Double
}
```

---

## 5. AI 系统

### Q-Learning 状态空间

**状态 key 格式**: `handStrength_position_street_opponentCount`

| 特征 | 离散值 |
|-----|--------|
| handStrength | 0-9 (0=弱, 9=强) |
| position | early/mid/late/blind |
| street | preflop/flop/turn/river |
| opponentCount | 1-5 |

**动作空间**: 5 个动作 - fold, call, raise_small, raise_big, allin

### Q-Learning 参数
```swift
struct QLearnConfig {
    let learningRate: Double = 0.1
    let discountFactor: Double = 0.9
    var explorationRate: Double = 0.2  // 初始探索率
    let minExploration: Double = 0.01  // 最低探索率
    let decayRate: Double = 0.999      // 衰减率
}
```

### Bot 人格模板

| 人格 | Emoji | 风格 |
|-----|-------|------|
| Tight-Aggressive | 🐍 | 紧凶 - 只玩好牌，下注激进 |
| Loose-Aggressive | 🦊 | 松凶 - 玩得多，下注激进 |
| Calling-Station | 🐻 | 跟注站 - 什么都跟，不爱加注 |
| Balanced | 🦅 | 平衡 - 标准策略 |
| Rock | 🦈 | 岩石 - 极紧，只玩超强牌 |
| Loose-Weak | 🐺 | 松弱 - 玩得多，但跟注多不敢加注 |

### 决策流程
1. 观察当前状态 (handStrength, position, potOdds...)
2. 生成状态 key
3. ε-greedy 策略选择动作
   - 概率 ε: 随机探索
   - 概率 1-ε: 选择 Q 值最高的动作
4. 执行动作，记录 trajectory
5. 手牌结束后，根据结果更新 Q 表

---

## 6. UI 界面

### 屏幕流程

```
MainMenuView
    │
    ├── GameTableView (主游戏界面)
    │       ├── 公共牌区 (CommunityCardsView)
    │       ├── 玩家座位 x6 (PlayerSeatView)
    │       │       └── 人类玩家在底部中央
    │       ├── 底池显示 (PotView)
    │       ├── 操作按钮 (ActionButtonView)
    │       └── 游戏日志 (GameLogView)
    │
    ├── StatsView (统计面板)
    │       ├── VPIP, PFR, AF 等数据
    │       └── 当前 session 统计
    │
    ├── HandHistoryView (手牌历史)
    │       └── 可查看历史牌局
    │
    └── BotLeaderboardView (Bot 排行榜)
            └── 按难度/胜率排序
```

### 视觉风格 - 经典赌场

| 元素 | 样式 |
|-----|------|
| 赌桌 | 深绿色 (#0a5c36) + 木质边框 (#8B4513) |
| 卡片 | 经典白色 + 圆角 + 阴影 |
| 金色装饰 | 按钮高亮、赢家光环 |
| 字体 | 系统默认 + 数字加粗 |

---

## 7. 持久化设计

### SwiftData 模型

**HandRecord** - 手牌历史
```swift
@Model
class HandRecord {
    var id: UUID
    var timestamp: Date
    var handNumber: Int
    var pot: Double
    var communityCards: [Card]
    var players: [PlayerHandInfo]
    var winnerId: String
    var streetHistory: [StreetBettingRecord]
}
```

**BotStatsRecord** - Bot 统计数据
```swift
@Model
class BotStatsRecord {
    var botId: String
    var handsPlayed: Int
    var vpip: Double      // Voluntary Put Money In Pot
    var pfr: Double       // Preflop Raise
    var af: Double        // Aggression Factor
    var winRate: Double
    var qTableSnapshot: Data  // JSON encoded
}
```

**SessionStats** - 当前session统计
```swift
@Model
class SessionStats {
    var startTime: Date
    var handsPlayed: Int
    var netProfit: Double
    var won: Int
    var lost: Int
}
```

---

## 8. 游戏规则

### Texas Hold'em 流程
1. **Preflop** - 发 2 张底牌，下大小盲
2. **Flop** - 发 3 张公共牌，第一轮下注
3. **Turn** - 发 1 张公共牌，第二轮下注
4. **River** - 发 1 张公共牌，第三轮下注
5. **Showdown** - 摊牌比大小

### 下注选项
- **Fold** - 弃牌
- **Check** - 过牌（仅在没有下注时）
- **Call** - 跟注
- **Bet** - 下注
- **Raise** - 加注
- **All-in** - 全下

### 游戏配置
- **玩家数**: 6人桌 (1 人类 + 5 Bot)
- **起始筹码**: 10000
- **大盲**: 50
- **小盲**: 25

---

## 9. 功能范围

### 中等功能集
- [x] 主菜单（开始游戏、Bot数量选择）
- [x] 单桌游戏（完整流程）
- [x] 基础统计（当前session）
- [x] 手牌历史记录
- [x] Bot 排行榜
- [x] 游戏设定（筹码量、大盲金额）
- [x] 详细统计数据 (VPIP, PFR, AF)

### 不包含
- 锦标赛模式
- Bot 学习曲线可视化
- 联机对战

---

## 10. 项目结构

```
PokerAI/
├── App/
│   ├── PokerAIApp.swift
│   └── ContentView.swift
├── Models/
│   ├── Card.swift
│   ├── Deck.swift
│   ├── Player.swift
│   ├── HumanPlayer.swift
│   ├── Bot.swift
│   ├── GameState.swift
│   └── Street.swift
├── Engine/
│   ├── PokerEngine.swift
│   ├── HandEvaluator.swift
│   └── BettingManager.swift
├── AI/
│   ├── QLearnEngine.swift
│   ├── BotDecisionEngine.swift
│   └── PersonalityTemplates.swift
├── ViewModels/
│   ├── GameViewModel.swift
│   └── StatsViewModel.swift
├── Views/
│   ├── MainMenuView.swift
│   ├── GameTableView.swift
│   ├── PlayerSeatView.swift
│   ├── CardView.swift
│   ├── CommunityCardsView.swift
│   ├── ActionButtonView.swift
│   ├── GameLogView.swift
│   ├── StatsView.swift
│   ├── HandHistoryView.swift
│   └── BotLeaderboardView.swift
├── Persistence/
│   ├── HandRecord.swift
│   ├── BotStatsRecord.swift
│   └── SessionStats.swift
└── Resources/
    └── Assets.xcassets
```

---

## 11. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|-----|------|-----|------|
| 手牌评估不一致 | 中 | 高 | Phase 2 单元测试验证 |
| Q-Learning 收敛慢 | 高 | 中 | 预设人格模板 baseline |
| UI 卡顿 | 中 | 中 | Task 异步 + MainActor |
| SwiftData 迁移 | 低 | 中 | 早期原型验证 |
