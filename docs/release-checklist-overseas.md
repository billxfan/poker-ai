# 海外上架 Checklist

## 当前结论

当前版本已经具备进入 `TestFlight` / `App Store Review` 准备阶段的条件。

代码侧当前没有明确的 P0 阻塞项，已经完成：
- 德扑核心对局流程修正与回归测试
- 广告奖励到账提示
- AdMob + UMP 同意流程接入
- 中英文本地化，默认跟随系统语言
- AI 画像视角修正

但在“公开上架海外”之前，仍有几项必须人工确认的发布项。

## 一、代码与功能验收

### 已完成
- [x] `xcodebuild build` 通过
- [x] `xcodebuild test` 通过，当前为 `74 tests, 0 failures`
- [x] 奖励广告奖励到账有 toast 提示
- [x] 隐私清单已补 `PokerAI/PrivacyInfo.xcprivacy`
- [x] 国际化资源已接入 `en` / `zh-Hans`

### 上架前建议再手测一次
- [ ] 全新安装后，主页面可以正常开始新对局
- [ ] `继续游戏` 在有存档时可点击、无存档时正确置灰
- [ ] 一整手牌流程符合规则：翻前、翻牌、转牌、河牌、结算
- [ ] 小盲 / 大盲每手正常轮转
- [ ] 奖励广告可展示，奖励到账 toast 正常出现
- [ ] 历史统计、AI 画像、最近 30 手页面可正常浏览
- [ ] 英文系统下主要页面文案无中文漏网
- [ ] 中文系统下主要页面文案无英文漏网

## 二、合规与隐私

### 必做
- [ ] App Store Connect 的 `App Privacy` 与实际 SDK 行为一致
- [ ] 隐私政策 URL 已上线，并覆盖广告、分析、存档、奖励机制说明
- [ ] AdMob 后台已经配置 EEA / UK / CH 的 UMP 同意消息
- [ ] 生产环境广告位 ID 已替换并确认可用

### 风险点
- 本应用是“德扑训练器”，不是现金赌博产品
- App Store 文案、截图、描述中不要出现真实赢钱、下注获利、现金兑换等表述
- 年龄分级、地区策略、关键词需要避免被误判为真钱赌博 App

## 三、国际化

### 当前策略
- 跟随系统语言
- 不做 App 内语言切换

### 上架前检查
- [ ] App 名称英文版本已在 `InfoPlist.strings` 生效
- [ ] App Store 截图至少准备英文版
- [ ] App Store 标题、副标题、描述、关键词准备英文版本
- [ ] 奖励、统计、AI 画像、行动记录等长文本在英文下不截断

## 四、商店素材

### 必备素材
- [ ] App Icon 最终版
- [ ] iPhone 截图
- [x] 英文应用描述草稿
- [x] 中文应用描述草稿
- [x] 隐私政策底稿
- [x] 支持页文案底稿

### 截图建议覆盖
- [ ] 主页面
- [ ] 对局中页面
- [ ] AI 画像页
- [ ] 历史统计页
- [ ] 福利中心 / 广告奖励页

## 五、发布前真机烟测

建议至少做下面两组：

### 设备环境 A
- [ ] iPhone 真机
- [ ] 系统语言英文
- [ ] 干净安装
- [ ] 完整体验一局、看一次广告、查看一次统计

### 设备环境 B
- [ ] iPhone 真机
- [ ] 系统语言简体中文
- [ ] 干净安装
- [ ] 验证继续游戏、轮次结算、历史记录

## 六、建议的发布顺序

1. 先提 `TestFlight`
2. 做一轮英文环境真机冒烟
3. 修正文案 / 截图 / 隐私标签问题
4. 再提交正式审核

## 七、当前仍建议关注的非阻塞项

- AI 学习机制仍有继续演进空间，当前更偏“可用训练器”而不是“强学习型机器人”
- 统计页还可以继续增强训练反馈闭环
- 如果后面引入更多海外用户，建议补 Crash 收集与更细粒度埋点

## 相关文件

- [AdMobService.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Services/AdMob/AdMobService.swift)
- [WelfareViewModel.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Features/Welfare/WelfareViewModel.swift)
- [L10n.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Shared/Extensions/L10n.swift)
- [PrivacyInfo.xcprivacy](/Users/kobe/Vaults/SecondBrain/项目/poker_game/PokerAI/PrivacyInfo.xcprivacy)
- [GameFlowRegressionTests.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/Tests/GameFlowRegressionTests.swift)
- [app-store-metadata-en.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-en.md)
- [app-store-metadata-zh-Hans.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-zh-Hans.md)
- [screenshot-shotlist.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/screenshot-shotlist.md)
- [app-privacy-reference.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-privacy-reference.md)
- [privacy-policy.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/privacy-policy.md)
- [support-page.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/support-page.md)
- [overseas-launch-runbook.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/overseas-launch-runbook.md)
