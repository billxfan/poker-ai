# 德扑 AI 训练器

[English README](./README.md)

这是一个离线德州扑克训练项目，三种交付形态彼此分离：

- [`ios/`](./ios/)：原有 iOS 17+ App，使用 SwiftUI 与 XcodeGen。
- [`web/`](./web/)：使用 React 与 TypeScript 的可安装单机网页游戏。
- [`desktop-steam/`](./desktop-steam/)：复用 Web 生产构建的 Electron / Steam
  桌面交付壳。**状态：待优化，不能直接作为 Steam 正式发行版。**

各端均只使用虚拟训练积分，不包含账号、真钱、提现或多人对战功能。

## 运行

```bash
cd ios && xcodegen generate
```

```bash
cd web && npm install && npm run dev
```

各端的详细运行与验证说明见对应文件夹内的 README。

## Docker / NAS 部署

Docker 是 Web 版的一种部署方式，不是第三套客户端。部署配置独立放在
[`deploy/docker/`](./deploy/docker/)；它只打包 `web/`，不会包含 `ios/`。

在项目根目录运行：

```bash
docker compose -f deploy/docker/compose.yaml up -d --build
```

完成后访问 `http://NAS的IP:3000`。端口修改、更新、停止及数据保存方式见
[`deploy/docker/README.md`](./deploy/docker/README.md)。
