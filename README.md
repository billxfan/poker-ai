# 🤖 德扑 AI 训练场

本地单人德扑游戏，支持多个具有独特性格的 AI Bot，并能根据历史牌局自我迭代打法。

## 运行方式

```bash
# 直接用浏览器打开 index.html

# 或启动本地服务器
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## Bot 性格系统

| Bot | 性格 | 激进度 | 诈唬频率 | 松紧度 |
|-----|------|--------|---------|--------|
| 🐍 Oscar | 紧凶型 | 高 | 中 | 紧 |
| 🦊 Felix | 松凶型 | 高 | 高 | 松 |
| 🐻 Bruno | 跟注站 | 低 | 低 | 中 |
| 🦅 Aria | 平衡型 | 中 | 中 | 动态 |

## Q-Learning 迭代

每局结束后，Bot 根据胜负更新 Q 表，状态 = (手牌强度, 位置, 底池赔率, 对手数)，动作 = (弃牌/跟注/加注)。

## 文件结构

```
poker-ai/
├── index.html      # 主入口
├── styles.css      # 样式
├── poker-engine.js # 德扑核心逻辑
├── bot.js          # Bot AI（含性格 + Q-Learning）
├── game.js         # 游戏状态管理
├── storage.js      # 历史记录持久化
└── app.js          # UI 渲染 & 主循环
```
