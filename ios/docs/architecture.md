# 德扑AI训练器 - 技术架构文档

## 1. 技术栈决策

### 技术选型评估矩阵

| 维度 | 方案 A（当前选择） | 方案 B | 方案 C |
|------|-------------------|--------|--------|
| **实现复杂度** | 中 | 中 | 高 |
| **交付速度** | 快 | 中 | 慢 |
| **可维护性** | 高 | 高 | 高 |
| **AI 能力** | 规则+统计 | 规则+统计 | Core ML |
| **iOS 兼容性** | 完美 | 完美 | 受限（无法训练） |
| **离线支持** | 完全离线 | 完全离线 | 需要网络 |
| **推荐** | ✓ | | |

### 最终技术栈

| 类别 | 选择 | 理由 |
|------|------|------|
| **语言** | Swift 5.9+ | iOS 原生，类型安全 |
| **UI 框架** | SwiftUI | iOS 16+ 主流声明式 UI |
| **数据库** | SQLite (GRDB) | 轻量级、跨平台、SQL 查询能力 |
| **状态管理** | SwiftUI @State / @StateObject / @EnvironmentObject | 原生响应式 |
| **图表** | Swift Charts | iOS 16+ 原生图表库 |
| **项目生成** | XcodeGen | 命令行生成 Xcode 项目 |
| **AI 方案** | 规则引擎 + 统计分析 | 离线可用，无训练需求 |

### 技术栈决策依据

1. **SwiftUI over UIKit**：声明式 UI 与现代 iOS 开发主流一致，状态管理更简洁
2. **SQLite over Core Data**：更轻量、SQL 查询灵活、无苹果生态锁定
3. **规则引擎 over Core ML**：ANE 不支持模型训练，纯规则+统计即可满足 AI 对手需求
4. **完全离线**：无服务器成本、无网络依赖、用户隐私保障

---

## 2. 架构风格

### 推荐：MVVM + Repository Pattern

```
┌─────────────────────────────────────┐
│           View (SwiftUI)            │
│    MainView, GameView, WelfareView  │
├─────────────────────────────────────┤
│         ViewModel (@Observable)       │
│   MainVM, GameVM, WelfareVM, StatsVM │
├─────────────────────────────────────┤
│          Repository Layer            │
│      ChipRepository, GameRepository   │
├─────────────────────────────────────┤
│           Service Layer              │
│   PokerEngine, AIEngine, Database   │
├─────────────────────────────────────┤
│            Model Layer               │
│     Card, Player, Hand, Action       │
└─────────────────────────────────────┘
```

### 层级职责

| 层级 | 职责 | 典型组件 |
|------|------|---------|
| **View** | UI 展示、用户交互 | SwiftUI Views |
| **ViewModel** | 状态管理、业务逻辑编排 | @Observable classes |
| **Repository** | 数据访问抽象 | Protocol + Implementation |
| **Service** | 核心业务逻辑 | PokerEngine, AIEngine |
| **Model** | 实体定义、数据结构 | Card, Player, Hand |

### 替代架构风格

| 风格 | 适用场景 | 本项目适用性 |
|------|---------|------------|
| MVC | 轻量级 UIKit 项目 | 不选（SwiftUI 更适合 VM） |
| **MVVM** | **SwiftUI 主流** | **✓ 采用** |
| Clean Architecture | 复杂业务逻辑 | 过度设计 |
| VIP | 协议驱动 | SwiftUI 不自然 |

---

## 3. 模块划分

### 目录结构

```
poker-ai/
├── App/
│   └── PokerAIApp.swift           # @main 入口
├── Core/
│   ├── Models/                    # 核心实体
│   │   ├── Card.swift
│   │   ├── Player.swift
│   │   ├── Hand.swift
│   │   ├── HandType.swift
│   │   ├── Action.swift
│   │   ├── Position.swift
│   │   └── Street.swift
│   ├── Engine/                    # 核心引擎
│   │   ├── PokerEngine.swift      # 发牌、下注、结算
│   │   ├── HandEvaluator.swift     # 牌型判定
│   │   ├── PotCalculator.swift     # 底池/边池计算
│   │   └── SidePotCalculator.swift
│   └── AI/
│       ├── AIEngine.swift         # AI 决策入口
│       ├── AIDecisionMaker.swift  # ε-greedy 决策
│       ├── AIPatternMatcher.swift  # 对手画像匹配
│       └── AIAvatars.swift        # AI 角色配置
├── Features/
│   ├── Main/
│   │   ├── MainView.swift
│   │   └── MainViewModel.swift
│   ├── Game/
│   │   ├── GameView.swift
│   │   ├── GameViewModel.swift
│   │   ├── Components/
│   │   │   ├── PlayerCard.swift
│   │   │   ├── TableView.swift
│   │   │   ├── CommunityCardsView.swift
│   │   │   ├── ActionButtonsView.swift
│   │   │   ├── QuickBetView.swift
│   │   │   └── ActionLogView.swift
│   │   └── GameRoundEndView.swift
│   ├── Welfare/
│   │   ├── WelfareView.swift
│   │   └── WelfareViewModel.swift
│   └── Statistics/
│       ├── StatisticsView.swift
│       ├── StatisticsViewModel.swift
│       ├── StatsTabView.swift
│       └── RecentHandsTabView.swift
├── Services/
│   ├── Database/
│   │   ├── DatabaseManager.swift   # GRDB 初始化
│   │   ├── GameRecordRepository.swift
│   │   └── AIPatternRepository.swift
│   ├── Storage/
│   │   └── ChipStorage.swift       # UserDefaults 筹码
│   └── Archive/
│       └── GameArchiveManager.swift # 断点保存/恢复
├── Shared/
│   ├── Components/
│   │   ├── ChipLabel.swift
│   │   └── CardView.swift
│   ├── Extensions/
│   │   └── Color+Theme.swift
│   └── Constants/
│       └── GameConstants.swift
└── Resources/
    └── Assets.xcassets
```

### 模块契约

| 上游模块 | 下游模块 | 依赖接口 | 调用方式 |
|---------|---------|---------|---------|
| MainView | GameViewModel | IGameRepository | 初始化传入 |
| GameViewModel | PokerEngine | 协议化调用 | 直接依赖 |
| GameViewModel | AIEngine | IAIDecisionMaker | 协议化调用 |
| StatisticsViewModel | GameRecordRepository | IGameRecordRepository | 依赖注入 |
| WelfareViewModel | ChipStorage | IChipStorage | 依赖注入 |

---

## 4. 数据模型

### Card（一张牌）

```swift
struct Card: Hashable, Codable {
    let suit: Suit      // ♠ ♥ ♦ ♣
    let rank: Int       // 2-14 (2=2, ..., 14=A)
}

enum Suit: String, Codable, CaseIterable {
    case spades, hearts, diamonds, clubs
}
```

### Player（玩家）

```swift
struct Player: Identifiable, Codable {
    let id: Int
    let name: String
    let avatar: String          // emoji 头像
    let position: Position      // UTG/MP/CO/BTN/SB/BB
    var chips: Int              // 剩余筹码
    var holeCards: (Card, Card)? // 底牌
    var status: PlayerStatus    // active/folded/allIn/out
}

enum PlayerStatus: String, Codable {
    case active, folded, allIn, out
}

enum Position: String, Codable, CaseIterable {
    case utg, mp, co, btn, sb, bb
}
```

### Hand（手牌）

```swift
struct Hand {
    let holeCards: (Card, Card)?
    let bestFive: [Card]
    let handType: HandType
    let kickers: [Int]  // 踢子牌（用于比大小）
}
```

### HandType（牌型枚举）

```swift
enum HandType: Int, Codable, Comparable {
    case highCard = 1
    case onePair = 2
    case twoPair = 3
    case threeOfAKind = 4
    case straight = 5
    case flush = 6
    case fullHouse = 7
    case fourOfAKind = 8
    case straightFlush = 9
    case royalFlush = 10

    static func < (lhs: HandType, rhs: HandType) -> Bool {
        lhs.rawValue > rhs.rawValue  // 10 > 9 > ... > 1
    }
}
```

### Action（行动）

```swift
struct Action: Codable {
    let playerId: Int
    let street: Street
    let type: ActionType
    let amount: Int?      // 投入筹码（若有）
}

enum ActionType: String, Codable {
    case fold, call, raise, allIn, check, bet
}

enum Street: String, Codable, CaseIterable {
    case preFlop, flop, turn, river
}
```

### GameState（游戏状态）

```swift
struct GameState: Codable {
    var players: [Player]
    var communityCards: [Card]
    var currentStreet: Street
    var pot: Int
    var sidePots: [Int]
    var currentBet: Int              // 当前轮最大下注
    var playerBets: [Int: Int]       // 玩家已下筹码
    var buttonPosition: Position
    var actionLog: [Action]
    var currentActorIndex: Int       // 当前行动玩家索引
}
```

### HandRecord（单局记录）

```swift
struct HandRecord: Codable, Identifiable {
    let id: Int
    let result: Result              // 胜/负/平
    let profit: Int
    let communityCards: [Card]
    let pot: Int
    let playerHoleCards: (Card, Card)?
    let playerHandType: HandType?
    let actions: [Action]
    let winnerId: Int?
    let showdown: Bool
}

enum Result: String, Codable {
    case win, lose, tie
}
```

---

## 5. 状态管理

### 状态管理方案

| 模块 | 方案 | 数据来源 | 持久化 |
|------|------|---------|--------|
| 筹码 | @AppStorage (UserDefaults) | 每日重置/福利领取 | ✓ |
| 存档 | @StateObject + Codable | 游戏中断恢复 | ✓ |
| AI 画像 | SQLite (GRDB) | 对局学习积累 | ✓ |
| 统计数据 | SQLite (GRDB) | 历史对局 | ✓ |
| UI 状态 | @State / @Binding | 内存 | ✗ |

### 状态流转

```
MainView:
  idle → checkingChips → idle
  idle → confirming → idle

GameView:
  idle → dealing → waitingForAction ↔ playerActing
                  ↕                      ↓
            roundTransition        aiThinking → checkingRoundEnd
                  ↓
             roundEnd

WelfareView:
  idle → loading → success / error

StatisticsView:
  idle → loading → tab1 / tab2
```

---

## 6. 数据库设计

### GRDB 表结构

```swift
// HandRecord 表
CREATE TABLE handRecords (
    id INTEGER PRIMARY KEY,
    result TEXT NOT NULL,          -- win/lose/tie
    profit INTEGER NOT NULL,
    communityCards TEXT NOT NULL,  -- JSON: [Card]
    pot INTEGER NOT NULL,
    playerHoleCards TEXT,          -- JSON: (Card, Card)?
    playerHandType INTEGER,        -- HandType rawValue
    actions TEXT NOT NULL,         -- JSON: [Action]
    winnerId INTEGER,
    showdown INTEGER NOT NULL,
    createdAt TEXT NOT NULL
);

// AIPattern 表（AI 对手画像）
CREATE TABLE aiPatterns (
    playerId INTEGER PRIMARY KEY,
    vpip REAL NOT NULL,            -- 入局率
    pfr REAL NOT NULL,             -- 预翻牌加注率
    threeBet REAL NOT NULL,        -- 3bet 率
    af REAL NOT NULL,              -- 激进频率
    handsPlayed INTEGER NOT NULL,  -- 参与手数
    lastUpdated TEXT NOT NULL
);
```

---

## 7. 安全性设计

### 本地应用安全

| 项目 | 方案 |
|------|------|
| 数据存储 | 所有数据本地存储，不上传网络 |
| 筹码系统 | 纯虚拟积分，无真实货币价值 |
| 存档完整性 | Codable + JSON 文件存储 |

### 输入验证

| 场景 | 校验 |
|------|------|
| 加注金额 | ≥ 最小加注额，≤ 自身筹码 |
| 跟注金额 | ≤ 自身筹码 |
| 存档恢复 | try? 捕获解码错误 |

---

## 8. 缓存策略

### 缓存层级

| 层级 | 工具 | TTL | 适用场景 |
|------|------|-----|---------|
| 内存 | @State | 会话内 | UI 临时状态 |
| 持久 | UserDefaults | 永久 | 筹码余额、每日状态 |
| 持久 | SQLite | 永久 | 对局记录、AI 画像 |

### 更新策略

| 策略 | 适用场景 | 实现 |
|------|---------|------|
| Write-Through | 筹码变化 | 立即写入 UserDefaults |
| Lazy | AI 画像 | 按需读写 |
| 归档 | 游戏存档 | 每次行动后自动保存 |

---

## 9. 架构决策记录（ADR）

### ADR-001: 技术栈选型

**状态**: Accepted

**决策**: SwiftUI + SQLite(GRDB) + 规则引擎

**考量**:
- SwiftUI 声明式 UI 与现代 iOS 开发一致
- GRDB 提供 SQLite 全部能力且 Swift 原生
- 规则引擎满足 AI 对手需求，无需 Core ML

### ADR-002: 状态管理方案

**状态**: Accepted

**决策**: SwiftUI 原生状态 + Repository Pattern

**考量**:
- @State/@StateObject 与 SwiftUI 深度集成
- Repository 抽象数据访问，便于测试和替换
- 避免引入 RxSwift 等额外复杂度

### ADR-003: 数据持久化策略

**状态**: Accepted

**决策**: UserDefaults（筹码配置）+ SQLite（对局数据）

**考量**:
- 筹码配置简单，UserDefaults 足够
- 对局记录需 SQL 查询，SQLite 更适合
- GRDB 支持 Codable，类型安全

### ADR-004: AI 决策方案

**状态**: Accepted

**决策**: ε-greedy 探索 + 规则引擎 + 统计分析

**考量**:
- 纯离线，无需网络或云端
- 规则引擎确保 AI 行为合理
- 统计分析让 AI 随对局学习进化
- iOS ANE 不支持 Core ML 训练

### ADR-005: 存档系统方案

**状态**: Accepted

**决策**: Codable JSON 文件存储

**考量**:
- Codable 原生支持，零依赖
- 自动存档避免意外丢失
- 断点恢复用户体验好

---

## 10. 部署方案

### 构建工具

| 项目 | 方案 |
|------|------|
| 项目生成 | XcodeGen |
| 依赖管理 | Swift Package Manager |
| 构建 | xcodebuild |
| 签名 | Xcode 自动管理 |

### 环境配置

```bash
# Swift Package Manager 依赖
- GRDB.swift: SQLite 数据库
- （其他均为苹果原生库）
```

### 发布

| 项目 | 方案 |
|------|------|
| 平台 | iOS App Store |
| 最低版本 | iOS 16.0 |
| 设备 | iPhone（竖屏） |
| CI/CD | Xcode Cloud / GitHub Actions |

### App Store 配置

| 项目 | 值 |
|------|---|
| Bundle ID | com.pokerai.trainer |
| 应用名 | 德扑AI训练器 |
| Category | Games > Card |
| Age Rating | 4+ |

---

## Verification Echo

>>> 确认技术方案：

- **技术栈**: Swift 5.9 + SwiftUI + SQLite(GRDB) + Swift Charts + XcodeGen
- **架构风格**: MVVM + Repository Pattern
- **模块数**: 4 个功能模块（Main/Game/Welfare/Statistics）+ 3 个核心模块（Core/Features/Services）
- **模块层级**: View / ViewModel / Repository / Service / Model
- **数据模型**: 9 个核心实体（Card, Player, Hand, HandType, Action, GameState, HandRecord, Position, Street）
- **状态管理**: @State/@StateObject + UserDefaults + SQLite
- **安全方案**: 本地存储，数据不上传
- **缓存策略**: UserDefaults（配置）+ SQLite（业务数据）+ 内存（UI状态）
- **ADR 记录**: 5 个已完成
- **发布**: iOS App Store，iOS 16.0+

---

*文档版本: v1.0*
*创建日期: 2026-04-09*
