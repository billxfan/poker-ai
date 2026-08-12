# 德扑 AI 训练器 · Desktop / Steam

> ⚠️ **待优化：开发候选版，不能直接作为正式 Steam 发行包。**
>
> 当前仍缺 Windows 10/11 实机验收、Windows 安装器验收、代码签名、
> Steamworks 私密分支验证，以及商店素材和生成式 AI 内容披露。

这是与 [`../ios/`](../ios/) 和 [`../web/`](../web/) 并列的桌面交付形态。
它只负责 Electron 运行、安全边界、桌面测试和 Steam 打包；游戏界面、规则、
AI 与 WebAudio 仍以 `web/` 为唯一实现来源，避免三端复制后发生功能漂移。

## 目录关系

```text
ios/            iOS 原生客户端
web/            Web / PWA 游戏与共享生产构建
desktop-steam/  Electron / Steam 桌面交付壳（待优化）
```

桌面构建先生成 `web/dist`，再将该生产产物作为只读资源打进应用。Electron
使用稳定的 `poker-ai://app` 来源，不开放本地端口，也不向游戏页面暴露 Node、
IPC 或文件系统 API。

## 本地验证

需要 Node.js 22+。首次运行：

```bash
cd desktop-steam
npm install
npm test
npm run smoke
npm run e2e
```

## 开发运行与打包

```bash
# 在当前 Mac 上运行桌面版
npm start

# 当前平台的未签名目录包
npm run pack

# 从 Mac 交叉生成 Windows x64 目录包
npm run pack:win

# Windows / Wine 环境生成 NSIS 安装器
npm run dist:win
```

本地产物位于 `desktop-steam/release/`，不会提交 GitHub。

## 待优化清单

- [ ] 在干净的 Windows 10/11 x64 环境启动并完成一局
- [ ] 验证安装、卸载、离线重启及存档持久化
- [ ] 验证 1366×768、1920×1080、2560×1440
- [ ] 完成 Windows 可执行文件和安装器签名
- [ ] 完成 macOS Universal、Apple 签名和公证（如在 Steam 支持 Mac）
- [ ] 创建 Steam AppID、Depot、启动项并通过私密分支
- [ ] 整理商店素材、美术授权与生成式 AI 内容披露

完整门槛见 [`docs/steam-windows-checklist.md`](docs/steam-windows-checklist.md)。
