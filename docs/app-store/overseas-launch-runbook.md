# 海外上架执行清单

更新日期：2026-05-03

适用项目：`Poker AI Trainer / 德扑AI训练器`

## 0. 当前结论

当前代码与素材准备已经接近可提审状态，但在正式提交海外 App Store 前，仍需完成以下 6 类动作：

1. `App Store Connect` 基础信息配置
2. 年龄分级与模拟赌博内容申报
3. `App Privacy` 与隐私政策 URL 发布
4. 中英文商店素材上传
5. 归档包上传与版本提审
6. 提审后消息跟进与地区策略复核

---

## 1. 代码与构建确认

### 必须确认

- [x] iOS 包能正常构建
- [x] 单元测试通过
- [x] 真机已完成一轮基础回归
- [x] App Icon 已替换为无文字统一版
- [x] 中英文本地化资源已接入
- [x] 奖励广告接入了 UMP 同意流程
- [x] `PrivacyInfo.xcprivacy` 已存在

### 提审前最后再确认一次

- [ ] `Release` 包使用正式 AdMob 广告位
- [ ] 英文系统下主流程无中文漏网
- [ ] 中文系统下主流程无英文漏网
- [ ] `继续游戏`、奖励广告、历史统计、AI 画像都正常

相关文件：
- [AdMobService.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Services/AdMob/AdMobService.swift)
- [L10n.swift](/Users/kobe/Vaults/SecondBrain/项目/poker_game/src/Shared/Extensions/L10n.swift)
- [PrivacyInfo.xcprivacy](/Users/kobe/Vaults/SecondBrain/项目/poker_game/PokerAI/PrivacyInfo.xcprivacy)
- [AppIcon.png](/Users/kobe/Vaults/SecondBrain/项目/poker_game/PokerAI/Assets.xcassets/AppIcon.appiconset/AppIcon.png)

---

## 2. App Store Connect 基础信息

### App Information

- [ ] App 名称填写完成
- [ ] Subtitle 填写完成
- [ ] 主分类设置为 `Games`
- [ ] 次分类设置为 `Card` 或你最终决定的次分类
- [ ] Bundle ID、SKU、平台信息核对完成

### 具体建议

- 英文名：`Poker AI Trainer`
- 英文副标题：`Offline Hold'em Practice`
- 中文名：`德扑AI训练器`

### 官方要求

- Apple 当前文档显示：
  - `Name` 最多 `30` 个字符
  - `Subtitle` 最多 `30` 个字符

参考来源：
- [Apple App Information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)

---

## 3. 年龄分级与模拟赌博申报

这是你这个项目最需要认真填的一项。

### 必做

- [ ] 在 `App Information > Age Ratings` 完成年龄分级问卷
- [ ] 对“Simulated Gambling”如实申报
- [ ] 如最终得到 `17+` 或更高评级，确认你是否接受该结果
- [ ] 如果某些地区出现特殊评级，按地区要求处理

### 重要说明

Apple 当前的年龄评级逻辑明确包含：
- `Simulated Gambling`
- 如果模拟赌博内容达到不同频率，可能影响评级
- `Unrated` 不能发布到 App Store

对你这个产品，我建议：
- 不要试图弱化“德州扑克”属性
- 但要明确它是 `single-player training app`
- 绝不出现真钱赌博、充值提现、真人下注、社交赌局等表述

### 审核口径建议

在 App Review 备注中强调：
- 单机
- 离线
- 虚拟训练积分
- 无真钱
- 无充值提现
- 无多人对战下注

参考来源：
- [Apple Set an App Age Rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating)
- [Apple Age Ratings Values and Definitions](https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions/)

---

## 4. App Privacy 与隐私政策

### 必做

- [ ] 发布公开可访问的 `Privacy Policy URL`
- [ ] 在 `App Privacy` 页面填写数据收集情况
- [ ] 如果需要，补充 `User Privacy Choices URL`
- [ ] 发布后点击 `Publish`

### 你当前已经具备的素材

- 隐私政策页
- 支持页
- App Privacy 填写参考

对应文档：
- [privacy-policy.html](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/site/privacy-policy.html)
- [support.html](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/site/support.html)
- [app-privacy-reference.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-privacy-reference.md)

### GitHub Pages 启用后建议填写

- `Privacy Policy URL`
  - `https://billxfan.github.io/poker-ai/site/privacy-policy.html`
- `Support URL`
  - `https://billxfan.github.io/poker-ai/site/support.html`

### 当前代码侧意味着你大概率需要申报

- `Firebase Analytics`
- `AdMob`
- `UMP`

所以 `App Privacy` 不太可能填成 “No, we do not collect data from this app”。

参考来源：
- [Apple Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Apple App Privacy Reference](https://developer.apple.com/help/app-store-connect/reference/app-privacy)

---

## 5. 商店素材上传

### 文案

- [ ] 英文描述填入 App Store Connect
- [ ] 中文描述填入 App Store Connect
- [ ] 英文关键词填入
- [ ] 中文关键词如你启用简中本地化则一并准备
- [ ] 审核备注填入

现成底稿：
- [app-store-metadata-en.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-en.md)
- [app-store-metadata-zh-Hans.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-zh-Hans.md)

### 截图

- [ ] 英文截图准备完成
- [ ] 中文截图准备完成
- [ ] 截图中没有出现真钱/充值/提现/赌博误导词
- [ ] 至少一张图明确出现 `Virtual Training Points` 或等价中文语义
- [ ] 没有调试信息、测试广告、系统弹窗遮挡

现成拍摄清单：
- [screenshot-shotlist.md](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/screenshot-shotlist.md)

### 官方规则

Apple 当前文档说明：
- 可以在可编辑状态下上传截图与 App Preview
- 若 UI 在各尺寸一致，可只提供最高分辨率截图，由系统自动缩放

参考来源：
- [Apple Upload App Previews and Screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots)

---

## 6. 归档、上传、提审

### Xcode / Transporter

- [ ] 使用 `Release` 配置生成归档
- [ ] 成功上传到 App Store Connect
- [ ] 在对应版本选择正确的 build

### 提审步骤

- [ ] 进入目标版本页面
- [ ] 校验 Build 绑定正确
- [ ] 点击 `Add for Review`
- [ ] 检查当前 submission 中包含的项目
- [ ] 点击 `Submit for Review`

### 官方参考

- [Apple Submit an App](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Apple Submit for Review Overview](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-for-review/)

---

## 7. App Review 备注建议

建议你在 `App Review Information` 中放这段英文说明：

```text
This app is a single-player offline poker training app. It does not support real-money gambling, cash-out, deposits, multiplayer betting, chat, or social wagering. All chips are virtual training points only. Rewarded ads grant additional virtual training points and have no cash value.
```

### 建议一并补充

- [ ] 如果审核需要测试说明，写清奖励广告入口位置
- [ ] 如果审核问到模拟赌博，强调“training only”与“no real money”
- [ ] 如果审核问到数据收集，说明使用 Firebase Analytics、AdMob、UMP

---

## 8. 地区与合规策略

### 你要自己决定的上架范围

- [ ] 是否首发全球
- [ ] 是否先排除少数高风险地区
- [ ] 是否暂不上中国大陆
- [ ] 是否针对韩国、巴西等地区单独复核评级要求

### 建议

如果这是第一次上架，建议采用：
- 第一阶段：英语国家 + 主要海外市场
- 第二阶段：根据审核反馈和转化数据再扩大地区

原因：
- 德州扑克题材对各地区审核敏感度不同
- 模拟赌博评级、用户预期、素材措辞可能存在地区差异

---

## 9. 上线后立即要做的事

- [ ] 检查产品页已显示正确名称、图标、截图、隐私政策链接
- [ ] 验证海外商店页显示的年龄评级是否符合预期
- [ ] 检查奖励广告在正式环境是否正常
- [ ] 关注首轮 App Review Message
- [ ] 如被拒，整理 rejection reason 与修改方案

---

## 10. 你现在最实际的下一步

按优先级，建议马上做这 5 件事：

1. 开启 `GitHub Pages`
2. 在 `App Store Connect` 填 `Privacy Policy URL` 和 `Support URL`
3. 完成年龄分级问卷
4. 上传中英文截图与元数据
5. 上传归档包并提交审核

---

## 附：本项目现有可直接复用的上架素材

- [英文元数据](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-en.md)
- [中文元数据](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-store-metadata-zh-Hans.md)
- [截图拍摄清单](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/screenshot-shotlist.md)
- [App Privacy 参考](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/app-store/app-privacy-reference.md)
- [隐私政策页](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/site/privacy-policy.html)
- [支持页](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/site/support.html)
- [GitHub Pages 说明](/Users/kobe/Vaults/SecondBrain/项目/poker_game/docs/site/README.md)
