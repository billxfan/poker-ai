# GitHub Pages 发布说明

这组静态页面位于 `ios/docs/site/`：

- `../index.html`
- `index.html`
- `privacy-policy.html`
- `support.html`

## 推荐发布方式

GitHub 仓库：`billxfan/poker-ai`

在 GitHub 仓库设置里：

1. 进入 `Settings`
2. 打开 `Pages`
3. `Source` 选择 `GitHub Actions`
4. 使用工作流发布 `ios/docs/` 目录

## 发布后的建议 URL

如果工作流将 `ios/docs/` 发布为 Pages 根目录，通常访问形式会是：

- `https://billxfan.github.io/poker-ai/`
- `https://billxfan.github.io/poker-ai/site/`
- `https://billxfan.github.io/poker-ai/site/privacy-policy.html`
- `https://billxfan.github.io/poker-ai/site/support.html`

## App Store Connect 可填写位置

- `Privacy Policy URL`:
  - `https://billxfan.github.io/poker-ai/site/privacy-policy.html`
- `Support URL`:
  - `https://billxfan.github.io/poker-ai/site/support.html`
