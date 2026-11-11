# 小杨的博客 · Astro 版

基于 **Astro + TypeScript** 的静态技术博客，部署在 GitHub Pages。文章使用 Markdown，支持分类、标签、归档、全文搜索、RSS、明暗主题、代码复制、Utterances 评论和 APlayer。

## 本地开发

要求 Node.js 22 和 npm 10+。

```bash
npm install
npm run dev
```

开发地址：`http://localhost:4321/fuyou/`。

## 验证与构建

```bash
npm run check
npm run build
npm run preview
```

生产文件输出到 `dist/`。`astro.config.mjs` 中的 `site` 和 `base=/fuyou` 必须与 GitHub Pages 地址一致。

## 内容维护

- 文章：`src/content/post/`
- 独立页面：`src/content/page/`
- 公共图片、音乐等：`public/`
- 全站布局：`src/layouts/BaseLayout.astro`
- 样式：`src/styles/global.css`

文章 frontmatter 至少包含 `title`、`date`、`description`、`tags`、`categories` 和 `slug`。发布文章时使用 `draft: false`。

## 部署与回滚

`main` 分支收到推送后，GitHub Actions 会执行类型检查、生产构建并发布到 `gh-pages`。本次迁移在 `astro-rewrite` 分支完成，验证后再合并到 `main`。

若迁移版本出现问题，可在 GitHub 上将原 Hugo 提交恢复到新分支并重新部署，或直接回滚合并提交。不要强制推送覆盖历史。

## 外部依赖

封面图床、Utterances、Vercount、APlayer CDN 和头像使用第三方服务；离线构建不依赖这些资源的可访问性，但浏览器展示需要网络连接。
