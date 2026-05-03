# App Privacy 填写参考

> 这份文档是提交 `App Store Connect > App Privacy` 时的填写参考，不替代最终法律或平台合规确认。

## 当前代码可确认的第三方能力

- `FirebaseAnalytics`
- `GoogleMobileAds / AdMob`
- `UserMessagingPlatform (UMP)`

对应实现文件：
- [AnalyticsService.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Services/Analytics/AnalyticsService.swift)
- [AnalyticsEvent.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Services/Analytics/AnalyticsEvent.swift)
- [AdMobService.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Services/AdMob/AdMobService.swift)

## App Store Connect 中必须准备的内容

- Privacy Policy URL
- App Privacy 问卷
- 如适用，User Privacy Choices URL

## 建议填写思路

### 1. Tracking

当前工程内的 `PrivacyInfo.xcprivacy` 标记为：
- `NSPrivacyTracking = false`

建议你在 App Store Connect 中再次核对两件事：
- 是否接入了 ATT 授权弹窗
- AdMob 是否用于跨 App / 跨网站追踪或个性化广告

如果你没有做 ATT，也没有开启需要按 Apple 定义归为 tracking 的跨 App 追踪能力，通常不应声明为 tracking。

### 2. Likely Collected Data To Review

基于当前 SDK 组合，建议重点核对以下数据类型是否需要披露：
- `Identifiers`
- `Usage Data`
- `Diagnostics`

### 3. Purposes To Review

基于当前实现，最可能涉及的用途是：
- `Analytics`
- `App Functionality`
- `Advertising`

## 建议你逐项核对的真实行为

### Analytics

当前事件包括：
- app launch / background
- game start / end
- hand result / action
- tutorial complete
- first game time

这些更接近：
- `Usage Data`
- 用途：`Analytics`

### AdMob / Rewarded Ads

当前实现包括：
- 奖励广告加载与展示
- UMP 同意流程

这些更接近：
- `Identifiers` 或广告相关数据
- 用途：`Advertising`

### Local Storage

当前本地存储包括：
- 筹码
- 游戏存档
- AI 学习数据
- 历史手牌

这些数据主要保存在本地，是否需要在 App Privacy 中披露，取决于是否被上传或被第三方 SDK 收集。

## 提交前最终核对建议

在 App Store Connect 里，按“最全面、最保守”的原则填写：
- 如果某类数据由第三方 SDK 代表你收集，也要披露
- 如果只在部分地区、部分场景触发，也要考虑纳入
- 如果你不确定某项数据类型，优先对照 Firebase / AdMob 官方隐私说明

## 审核备注可补充的说明

This app is a single-player offline poker training app. It uses Firebase Analytics for product analytics and AdMob rewarded ads for optional virtual-point rewards. It does not offer real-money gambling, cash-out, deposits, or multiplayer betting.
