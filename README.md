# 德扑AI训练器

iOS 17+ 德州扑克 AI 训练应用

## 技术栈

- **语言**: Swift 5.9+
- **UI**: SwiftUI
- **数据持久化**: JSON 文件 + UserDefaults
- **项目生成**: XcodeGen
- **最低版本**: iOS 17.0

## 项目结构

```
poker-ai/
├── App/                      # 应用入口
├── Core/
│   ├── Models/              # 核心数据模型
│   ├── Engine/              # 扑克引擎（发牌、下注、结算）
│   └── AI/                  # AI 决策系统
├── Features/
│   ├── Main/                # 主页
│   ├── Game/               # 对局页面
│   ├── Welfare/             # 福利中心
│   └── Statistics/          # 统计页面
├── Services/
│   ├── Database/            # JSON 数据文件读写
│   ├── Storage/             # UserDefaults 存储
│   └── Archive/             # 游戏存档
└── Shared/                  # 共享组件
```

## 构建步骤

1. 确保已安装 XcodeGen:
   ```bash
   brew install xcodegen
   ```

2. 生成 Xcode 项目:
   ```bash
   cd poker_game
   xcodegen generate
   ```

3. 打开项目:
   ```bash
   open PokerAI.xcodeproj
   ```

4. 在 Xcode 中选择模拟器并运行

## 主要功能

- 6人局德州扑克对战
- 5个不同风格的 AI 对手
- 每日免费筹码领取
- 历史统计与回放
- 断点存档恢复

## AI 对手

| AI | 昵称 | 风格 |
|----|------|------|
| AI-1 | 老K | 紧凶型 |
| AI-2 | 小马 | 松凶型 |
| AI-3 | 大叔 | 紧弱型 |
| AI-4 | 小鱼 | 松弱型 |
| AI-5 | 狐狸 | 平衡型 |

## 游戏规则

- 小盲: 10 筹码
- 大盲: 20 筹码
- 初始筹码: 2000
- 6人固定桌
