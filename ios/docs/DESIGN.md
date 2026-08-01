# Design System: 德扑AI训练器


**1. Visual Theme & Atmosphere**


整体风格：**专业扑克竞技 + 温暖亲和**。深蓝绿色调营造高端娱乐场氛围，emoji 头像增添亲和力与趣味性。界面简洁、筹码信息突出、操作按钮清晰可辨。竖屏单手操作友好。

---


**2. Color Palette & Roles**


— 主色调

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| primary | [[1E3A5F]] | 30, 58, 95 | 深蓝 - 筹码卡片主色 |
| secondary | [[2563EB]] | 37, 99, 235 | 蓝色 - 主要行动按钮 |
| accent | [[7C3AED]] | 124, 58, 237 | 紫色 - 新开始按钮 |
| welfare | [[DC2626]] | 220, 38, 38 | 红色 - 福利中心按钮 |
| statistics | [[64748B]] | 100, 116, 139 | 灰色 - 历史统计按钮 |

— 扑克桌面色

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| tableGreen | [[0D5C3F]] | 13, 92, 63 | 牌桌绿色 |
| tableFelt | [[0A4A31]] | 10, 74, 49 | 牌桌毛毡色 |
| chipGold | [[D4AF37]] | 212, 175, 55 | 筹码金色 |
| chipSilver | [[C0C0C0]] | 192, 192, 192 | 筹码银色 |

— 状态色

| Token | Hex | Role |
|-------|-----|------|
| success | [[2E7D32]] | 已领取/获胜 |
| warning | [[F59E0B]] | 警示/加注 |
| error | [[EF4444]] | 错误/弃牌 |
| folded | [[6B7280]] | 已弃牌状态 |

— 按钮色

| Token | Hex | Role |
|-------|-----|------|
| foldButton | [[EF4444]] | 弃牌按钮 - 红色 |
| callButton | [[10B981]] | 跟注按钮 - 绿色 |
| raiseButton | [[F59E0B]] | 加注按钮 - 黄色 |
| allInButton | [[EA580C]] | 全下按钮 - 橙色 |
| disabled | [[9CA3AF]] | 禁用状态 - 灰色 |

— 文字色

| Token | Hex | Role |
|-------|-----|------|
| textPrimary | [[1F2937]] | 主要文字 |
| textSecondary | [[6B7280]] | 次要文字 |
| textOnDark | [[FFFFFF]] | 深色背景上的文字 |
| textGold | [[D4AF37]] | 金色文字（筹码数字） |

— 背景色

| Token | Hex | Role |
|-------|-----|------|
| background | [[F3F4F6]] | 页面背景 |
| card | [[FFFFFF]] | 卡片背景 |
| modal | #00000080 | 弹窗遮罩 (50% opacity) |

---


**3. Typography Rules**


— 字体

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Large Title | SF Pro Display | 34pt | Bold | 1.2 |
| Title | SF Pro Display | 28pt | Bold | 1.2 |
| Headline | SF Pro Text | 17pt | Semibold | 1.3 |
| Body | SF Pro Text | 17pt | Regular | 1.5 |
| Callout | SF Pro Text | 16pt | Regular | 1.4 |
| Subheadline | SF Pro Text | 15pt | Regular | 1.4 |
| Footnote | SF Pro Text | 13pt | Regular | 1.3 |
| Caption | SF Pro Text | 12pt | Regular | 1.4 |

— 筹码数字

| Role | Font | Size | Weight |
|------|------|------|--------|
| Chip Amount | SF Pro Rounded | 36pt | Bold |
| Chip Amount Small | SF Pro Rounded | 24pt | Bold |
| Pot Amount | SF Pro Rounded | 20pt | Semibold |

— 花色符号

使用 Unicode 字符：
- ♠ (U+2660) - 黑桃
- ♥ (U+2665) - 红心
- ♦ (U+2666) - 方块
- ♣ (U+2663) - 梅花

---


**4. Component Stylings**


— Button (操作按钮)

**尺寸**: 宽度均分，高度 48pt，圆角 12pt

**变体**:

| 变体 | 背景色 | 文字色 | 边框 |
|------|--------|--------|------|
| Primary (继续游戏) | [[2563EB]] | [[FFFFFF]] | 无 |
| Secondary (新开始) | [[7C3AED]] | [[FFFFFF]] | 无 |
| Fold (弃牌) | [[EF4444]] | [[FFFFFF]] | 无 |
| Call (跟注) | [[10B981]] | [[FFFFFF]] | 无 |
| Raise (加注) | [[F59E0B]] | [[FFFFFF]] | 无 |
| All-In (全下) | [[EA580C]] | [[FFFFFF]] | 无 |
| Disabled | [[9CA3AF]] | [[FFFFFF]] | 无 |
| Ghost (取消) | 透明 | [[6B7280]] | 1px [[D1D5DB]] |

**状态**:

| 状态 | 变化 |
|------|------|
| Default | 正常显示 |
| Pressed | opacity 0.9 |
| Disabled | 灰色背景，不可点击 |

— Card (玩家信息卡)

```
背景: [[FFFFFF]]
圆角: 16pt
阴影: 0 2px 8px rgba(0,0,0,0.1)
内边距: 12pt
边框: 无
```

— Chip Card (筹码卡片)

```
背景: [[1E3A5F]] (深蓝)
圆角: 20pt
阴影: 0 4px 12px rgba(30,58,95,0.3)
内边距: 24pt
```

— Modal (弹窗)

```
背景: [[FFFFFF]]
圆角: 20pt
阴影: 0 8px 32px rgba(0,0,0,0.2)
内边距: 24pt
最大宽度: 320pt
遮罩: #000000 @ 50%
```

— Tab Bar

```
背景: [[FFFFFF]]
高度: 44pt
选中指示条: 2pt, [[2563EB]]
圆角: 无
```

---


**5. Layout Principles**


— 间距系统

基于 4pt 网格：

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4pt | 紧凑元素间距 |
| sm | 8pt | 小间距 |
| md | 16pt | 标准间距 |
| lg | 24pt | 大间距 |
| xl | 32pt | 区块间距 |
| 2xl | 48pt | 页面边距 |

— 页面边距

| 场景 | 值 |
|------|---|
| 页面水平边距 | 16pt |
| 卡片内边距 | 16pt |
| 按钮内边距 | 16pt horizontal, 12pt vertical |
| 列表项间距 | 8pt |

— 牌桌布局 (GameView)

```
竖屏布局 (iPhone 屏幕):
┌─────────────────────────┐
│     AI-1 (顶部居中)      │  ← y: 8%
└─────────────────────────┘
         │
┌───────┐    │    ┌───────┐
│ AI-5  │    │    │ AI-3  │  ← y: 25%
│ (左)  │    │    │ (右)  │
└───────┘    │    └───────┘
             │           │
        ┌────┴────────────┴────┐
        │     公共牌区域        │  ← y: 40%
        │     (上方区域)        │
        └─────────────────────┘
             │
        ┌────┴────────────┴────┐
        │     操作按钮区域      │  ← y: 75%
        │     (下方固定)        │
        └─────────────────────┘
```

— 玩家位置 (俯视椭圆桌)

```
        [AI-1] 老K
          UTG
            ↖
[AI-5] 狐狸    [AI-3] 大叔
   SB    ↖      ↗   CO
            ↘  ↗
        [玩家]  ← 底部居中
        BB

布局: 双列展示
上排: AI-1(顶部) / AI-2(右上) / AI-3(右下)
下排: AI-5(左下) / 玩家(底部居中) / AI-4(右下)
```

---


**6. Depth & Elevation**


| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | 平铺元素 |
| 1 | 0 2px 8px rgba(0,0,0,0.1) | 玩家卡片、按钮 |
| 2 | 0 4px 12px rgba(0,0,0,0.15) | 筹码卡片、Tab Bar |
| 3 | 0 8px 32px rgba(0,0,0,0.2) | 弹窗、Modal |
| 4 | 0 12px 48px rgba(0,0,0,0.25) | 全屏弹窗 |

— 圆角规范

| Element | Radius |
|---------|--------|
| 按钮 | 12pt |
| 卡片 | 16pt |
| 弹窗 | 20pt |
| 筹码数字容器 | 8pt |
| 头像 | 圆形 (9999pt) |
| 手牌 | 8pt |
| 公共牌 | 8pt |

---


**7. Do's and Don'ts**


— Do

- 使用 SF Pro 系列字体（iOS 系统字体）
- 按钮采用圆角设计 (12pt)
- 状态变化使用颜色区分（弃牌灰、跟注绿、加注黄）
- 筹码金额使用金色突出显示
- 保持界面简洁，核心信息突出
- 竖屏布局，单手可操作

— Don't

- 不要使用超过 3 种主要按钮颜色
- 不要混用多种字体
- 不要在扑克桌上使用过于花哨的渐变
- 不要让非活跃玩家干扰主视觉
- 不要隐藏关键信息（底池、需跟注金额）

---


**8. Responsive Behavior**


由于是 iOS 竖屏应用，响应式设计简化为设备适配：

| Device | 适配内容 |
|--------|---------|
| iPhone SE | 字号不缩小，间距保持 |
| iPhone 标准 | 直接适配 |
| iPhone Pro Max | 适当增加间距 |

— 手牌显示

| 场景 | 尺寸 |
|------|------|
| 正常 | 48pt × 64pt |
| 玩家手牌（选中） | 56pt × 72pt |

— 公共牌显示

| 场景 | 尺寸 |
|------|------|
| 单张 | 44pt × 60pt |
| 牌间距 | 4pt |
| 翻牌区域宽度 | 5 × 44pt + 4 × 4pt = 236pt |

---


**9. Agent Prompt Guide**


— Quick Reference

```
主色: [[1E3A5F]] (深蓝)
次色: [[2563EB]] (蓝)
按钮色: [[EF4444]](弃) [[10B981]](跟) [[F59E0B]](加) [[EA580C]](全下)
成功: [[2E7D32]]
牌桌绿: [[0D5C3F]]
字体: SF Pro (系统)
筹码数字: SF Pro Rounded Bold
间距基准: 4pt
按钮圆角: 12pt
卡片圆角: 16pt
弹窗圆角: 20pt
```

— 编码示例

**创建主按钮**:
```swift
Button(action: { }) {
    HStack {
        Image(systemName: "play.fill")
        Text("继续游戏")
    }
    .font(.headline)
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)
    .frame(height: 48)
    .background(Color(hex: "2563EB"))
    .cornerRadius(12)
}
```

**创建筹码卡片**:
```swift
VStack {
    Image(systemName: "bitcoinsign.circle.fill")
        .font(.system(size: 32))
    Text("3,500")
        .font(.system(size: 36, weight: .bold, design: .rounded))
    Text("虚拟训练积分")
        .font(.caption)
}
.padding(24)
.background(Color(hex: "1E3A5F"))
.cornerRadius(20)
```

**创建玩家卡片**:
```swift
VStack(spacing: 8) {
    Text("👴")
        .font(.system(size: 40))
    Text("老K")
        .font(.headline)
    Text("筹码: 3000")
        .font(.caption)
}
.padding(12)
.background(Color.white)
.cornerRadius(16)
.shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
```

— 设计规范执行检查

- [ ] 所有颜色使用 Color Extension 管理
- [ ] 字体使用系统字体 SF Pro
- [ ] 按钮圆角 12pt
- [ ] 卡片圆角 16pt
- [ ] 弹窗圆角 20pt
- [ ] 间距使用 4pt 倍数
- [ ] 阴影使用规范中的定义

---

*文档版本: v1.0*
*创建日期: 2026-04-09*
*基于: 主页面.md / 对局页面.md / 模块总览.md*
