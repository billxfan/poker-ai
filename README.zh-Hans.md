# 德扑 AI 训练器

[English README](./README.md)

这是一个离线德州扑克训练项目，两个客户端彼此独立：

- [`ios/`](./ios/)：原有 iOS 17+ App，使用 SwiftUI 与 XcodeGen。
- [`web/`](./web/)：使用 React 与 TypeScript 的可安装单机网页游戏。

两端均只使用虚拟训练积分，不包含账号、真钱、提现或多人对战功能。

## 运行

```bash
cd ios && xcodegen generate
```

```bash
cd web && npm install && npm run dev
```

各端的详细运行与验证说明见对应文件夹内的 README。
