---
title: "前端性能优化完全指南"
description: "深入了解如何优化你的网站性能"
date: 2026-04-04T09:15:00+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195150_508_12.png"
categories:
    - 前端优化
    - 性能
tags:
    - 性能优化
    - 前端开发
    - 最佳实践
---

## 什么是前端性能？

前端性能是指网页在浏览器中加载、渲染和交互的速度。它影响用户体验，同时也是搜索引擎排名的重要因素。

### 性能指标

1. **First Contentful Paint (FCP)** - 首次内容绘制
2. **Largest Contentful Paint (LCP)** - 最大内容绘制
3. **Cumulative Layout Shift (CLS)** - 累积布局偏移
4. **First Input Delay (FID)** - 首次输入延迟

## 性能优化策略

### 1. 图片优化

- 使用现代格式（WebP）
- 响应式图片（srcset）
- 懒加载
- 压缩和裁剪

```html
<img
    src="image.jpg"
    srcset="image-small.jpg 480w, image-large.jpg 1200w"
    alt="描述"
    loading="lazy"
/>
```

### 2. JavaScript 优化

**代码分割**

```javascript
// 动态导入
const module = await import('./module.js');
```

**体积优化**

- 移除未使用的代码
- 使用 tree-shaking
- 压缩和混淆
- 使用 CDN

### 3. CSS 优化

- 压缩 CSS 文件
- 移除重复的选择器
- 使用 CSS 变量避免重复
- 内联关键 CSS

```css
/* 关键 CSS - 直接内联 */
@media (prefers-color-scheme: dark) {
    body {
        background: #1a1a1a;
        color: #ffffff;
    }
}
```

### 4. 网络优化

| 技术 | 效果 | 实施难度 |
|------|------|--------|
| 缓存策略 | 高 | 低 |
| HTTP/2 | 中 | 中 |
| CDN | 高 | 低 |
| 预连接 | 中 | 低 |
| 预加载 | 高 | 中 |

```html
<!-- 预连接 -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- 预加载关键资源 -->
<link rel="preload" href="critical.js" as="script">

<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="https://api.example.com">
```

### 5. 渲染性能

#### 避免强制同步布局

```javascript
// ❌ 不好 - 产生布局抖动
for (let i = 0; i < 100; i++) {
    element.style.width = element.offsetWidth + 1 + 'px';
}

// ✅ 好 - 批量操作
const width = element.offsetWidth;
for (let i = 0; i < 100; i++) {
    element.style.width = width + i + 'px';
}
```

#### 使用 requestAnimationFrame

```javascript
function animate() {
    // 执行动画帧
    element.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(animate);
}
animate();
```

## 监测和分析

### 使用 Lighthouse

```bash
# 使用 Chrome DevTools 或命令行
npm install -g lighthouse
lighthouse https://example.com
```

### 实时监测

- Web Vitals
- Performance API
- Google Analytics
- 自定义指标

```javascript
// 测量 FCP
performance.measureUserAgentSpecificMemory?.()
new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
        console.log(entry.name, entry.duration);
    });
}).observe({ entryTypes: ['paint', 'measure'] });
```

## 总结

前端性能优化是一个持续的过程：

1. ✅ 定期测量性能指标
2. ✅ 确定瓶颈
3. ✅ 实施优化方案
4. ✅ 验证改进效果
5. ✅ 重复此过程

记住：**性能优化永无止境，但永远是值得的！**

---

**推荐阅读：**
- [Google 性能指南](https://web.dev/performance/)
- [MDN - Web 性能](https://developer.mozilla.org/en-US/docs/Web/Performance)
