---
title: "从 Hugo 到 Astro：105 篇中文博客的 TypeScript 重构与发布实录"
date: 2026-11-11T21:00:00+08:00
lastmod: 2026-11-11T21:00:00+08:00
image: "https://picsum.photos/seed/fuyou-astro-migration/1200/675"
draft: false
tags: ["Astro", "TypeScript", "GitHub Pages", "静态博客"]
categories: ["技术分享"]
slug: "hugo-to-astro-typescript-migration"
description: "记录 fuyou 博客从 Hugo 迁移到 Astro 7 + TypeScript 的真实过程：内容集合、中文路由、全文搜索、UI 特效、GitHub Actions 与 gh-pages 发布排障。"
author: "小杨"
keywords: ["Astro", "TypeScript", "Hugo 迁移", "GitHub Pages", "静态博客"]
---

## 为什么迁移

这个博客原来使用 Hugo + Stack，内容和静态资源都能正常工作，但根目录同时保存了主题、模板和一批旧构建产物。继续修改页面时，很难快速判断哪些文件是源文件，哪些只是历史输出。

这次迁移的目标不是增加后端，而是把工程边界整理清楚：

- 用 Astro + TypeScript 管理页面、组件和内容校验。
- 保留 105 篇文章及原有 `/p/:slug/` 地址。
- 继续使用 GitHub Pages，不引入服务器和数据库。
- 恢复分类、标签、归档、搜索、评论、播放器和背景特效。
- 保留原 Hugo 分支历史，出现问题可以回滚。

Astro 负责构建静态页面，TypeScript 负责配置、路由和浏览器交互。线上不需要运行 Node.js 进程。

## 先处理仓库分叉，再建立迁移分支

旧本地目录的分支和远程状态不一致，因此没有直接在原目录执行 `pull` 或强制推送，而是从远程 `main` 新建独立工作副本：

```bash
git clone --depth 1 --single-branch --branch main \
  https://github.com/luckycloveryh/fuyou.git fuyou-astro-migration
cd fuyou-astro-migration
git switch -c astro-rewrite
```

这样可以在不碰旧目录的情况下完成迁移，也避免把本地未确认的内容覆盖到远程。

## 用 Content Collections 约束文章数据

文章放在 `src/content/post`，独立页面放在 `src/content/page`。Astro 7 使用带 `glob` loader 的内容集合，Zod 用来检查 frontmatter：

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const post = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/post' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    lastmod: z.coerce.date().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { post };
```

`date` 在构建时统一转换成日期对象，`draft` 默认值为 `false`，读取文章时再显式过滤草稿。这样缺少可选字段不会导致整个站点构建失败。

## 中文 slug 必须显式保留

大多数原文已经有 `slug`，但有 6 篇依赖 Hugo 根据标题生成地址。直接迁移会改变 URL，进而影响历史链接和 Utterances 评论关联，因此需要把原地址写回 frontmatter：

```yaml
slug: "kubernetes-核心组件全解析从入门到精通"
```

文章页使用动态路由生成静态文件：

```astro
---
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({
    params: { slug: postSlug(post) },
    props: { post },
  }));
}
---
```

分类和标签也采用静态生成。迁移后检查了 105 个源文件、105 个文章页面和 105 条搜索索引，数量一致。

## `/fuyou` 子路径是另一个容易踩坑的位置

站点部署在 `https://luckycloveryh.github.io/fuyou/`，不是域名根目录。核心配置为：

```js
export default defineConfig({
  site: 'https://luckycloveryh.github.io',
  base: '/fuyou',
  trailingSlash: 'always',
  output: 'static',
});
```

内部链接统一经过一个辅助函数。页面需要尾斜杠，但 RSS、搜索 JSON、图片和音乐文件不能再加斜杠：

```ts
export const url = (path = '') => {
  const result = `${base}/${path.replace(/^\//, '')}`.replace(/\/$/, '');
  return /\.[a-z0-9]+$/i.test(result) ? result : `${result}/`;
};
```

如果只检查首页能否打开，很容易漏掉 `/index.xml/`、`/搜索/index.json/` 和 MP3 地址这类错误。最终通过遍历生成 HTML，检查到内部失效链接为 0。

## UI 重构不是简单换一套颜色

新版保留左侧导航、文章卡片、明暗主题、归档、标签和搜索，并用 Taste Skill 重新整理配色、字体和移动端布局。第二次调整又恢复了旧站的樱花、粒子、飞鱼、Live2D 和 APlayer。

这里刻意没有搬回旧 PJAX：它会手动替换 DOM，还需要重复初始化代码块、目录、评论和画布。Astro 当前采用普通静态导航，优先保证生命周期清楚。桌面端启用重特效；手机和 `prefers-reduced-motion` 用户不加载这些效果，同时提供特效开关。

## 搜索仍然是纯静态方案

构建时从文章正文生成 `/搜索/index.json`，浏览器首次搜索时读取索引，再按标题和正文匹配关键词。它没有服务器接口，也没有第三方搜索服务。

搜索页需要处理的不只是成功状态，还包括：

- 索引加载中；
- 没有输入关键词；
- 没有匹配结果；
- 网络或索引加载失败；
- 使用 `?keyword=` 分享搜索链接。

## 发布失败的根因不在构建

本地构建成功后，线上最初仍然没有变化。排查后确认是两个独立问题：

1. GitHub Actions 只监听 `main`，推送 `astro-rewrite` 不会触发部署。
2. Pages 的发布源误选成了源码分支，而真正存放静态文件的是 `gh-pages`。

先在本地重新构建，再把 `dist` 发布到 `gh-pages`：

```bash
npm run build
npx --yes gh-pages -d dist -b gh-pages -m "deploy: publish Astro blog"
```

随后将 Pages 的 Source 设置为：

```text
Deploy from a branch
Branch: gh-pages
Directory: / (root)
```

最后还要核对浏览器实际拿到的页面。旧站点有缓存时，普通刷新可能仍显示 Hugo 页面；使用带新查询参数的地址或强制刷新后，才看到 Astro 新版。

## 验收结果

这次迁移不是以“页面能打开”作为完成标准，而是做了以下检查：

```bash
npm run check
npm run build
npm audit --omit=dev
```

当时的结果为：

- 类型检查：0 errors、0 warnings、0 hints。
- 生产构建：成功生成 238 个页面。
- 源文章、生成文章、搜索索引：105 / 105 / 105。
- 全站内部失效链接：0。
- 生产依赖安全漏洞：0。
- 在 1440px 桌面和 390px 手机视口进行真实浏览器检查。

本文发布后文章总数变为 106，因此后续验收也应同步更新数量，不能把 105 当成永久不变的断言。

## 回滚和后续维护

原 Hugo 代码仍保留在 `main` 历史中，迁移先通过独立分支验证，线上部署和源码合并分开处理。确认新版本稳定后，再把 PR 合并到 `main`，让 GitHub Actions 接管后续部署。

这次最大的收获是：静态博客迁移不只是模板语法转换。真正需要优先核实的是**旧 URL、子路径资源、构建产物来源、Pages 发布分支和浏览器缓存**。这些环节任何一处不一致，都会出现“本地已经成功，线上却没有变化”的假象。
