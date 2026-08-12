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

## Docker / NAS 部署

Web 版可以通过 Docker 部署到群晖、威联通、飞牛等支持 Docker Compose
的 NAS。在项目根目录运行：

```bash
docker compose up -d --build
```

完成后，在同一局域网的设备上打开 `http://NAS的IP:3000`。如需更换宿主机
端口，例如改为 `8080`：

```bash
POKER_AI_PORT=8080 docker compose up -d --build
```

更新代码后再次执行相同的 `docker compose up -d --build` 即可。停止服务：

```bash
docker compose down
```

游戏没有数据库或服务端账号。对局、统计和设置保存在访问设备的浏览器中，
清除浏览器站点数据会同时清除这些记录；不同设备之间不会自动同步。
