---
title: "Markdown 完全语法教程"
description: "学习 Markdown 的所有常用语法"
date: 2026-04-05T14:30:00+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195148_507_12.png"
categories:
    - 教程
tags:
    - Markdown
    - 写作
    - 格式化
---

## 标题

Markdown 使用 `#` 表示标题，越多 `#` 表示越低级的标题。

```markdown
# 一级标题
## 二级标题
### 三级标题
```

## 文本格式

### 强调

- **加粗文本** 使用 `**` 或 `__`
- *斜体文本* 使用 `*` 或 `_`
- ***粗斜体*** 使用 `***`
- ~~删除线~~ 使用 `~~`

### 引用

> 这是一个引用
>
> 引用可以包含多行

## 列表

### 无序列表

- 项目1
- 项目2
  - 嵌套项目
  - 另一个嵌套项目
- 项目3

### 有序列表

1. 第一项
2. 第二项
3. 第三项
   1. 嵌套项
   2. 嵌套项

## 代码

### 行内代码

使用 `code` 来表示行内代码。

### 代码块

```python
def hello_world():
    print("Hello, World!")
    return True
```

```javascript
const greeting = "Hello, Markdown!";
console.log(greeting);
```

## 链接和图片

### 链接

[Google](https://www.google.com)

[Reference Link][1]

[1]: https://www.example.com

### 图片

![Alt Text](https://via.placeholder.com/150)

## 表格

| 特性 | Stack | 其他主题 |
|------|-------|--------|
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 美观 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 易用 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 分隔线

---

## 总结

Markdown 是一种简单而强大的文本格式化方式，非常适合博客写作。熟练使用这些语法可以大大提高你的写作效率。
