# Docker / NAS 部署

这里仅存放 Web 版的 Docker 交付配置，不包含另一份游戏源码：

- `ios/` 是独立的 iOS 原生客户端，不参与镜像构建。
- `web/` 是浏览器版游戏源码，也是 Docker 镜像的唯一应用来源。
- `deploy/docker/` 只负责将 `web/` 打包为 NAS 可运行的容器。

## 启动

在仓库根目录运行：

```bash
docker compose -f deploy/docker/compose.yaml up -d --build
```

完成后，在同一局域网的设备上打开 `http://NAS的IP:3000`。

如需更换宿主机端口，例如改为 `8080`：

```bash
POKER_AI_PORT=8080 docker compose -f deploy/docker/compose.yaml up -d --build
```

更新代码后再次执行启动命令即可。停止服务：

```bash
docker compose -f deploy/docker/compose.yaml down
```

游戏没有数据库或服务端账号。对局、统计和设置保存在访问设备的浏览器中；
不同设备不会自动同步，清除浏览器站点数据会同时清除该设备上的游戏记录。
