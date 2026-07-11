---
title: "八、YAML"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-02/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-02"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 八、YAML

## 简介

YAML 语言（发音 /ˈjæməl/ ）的设计目标，就是方便人类读写。它实质上是一种通用的数据串行化格式。

它的基本语法规则如下。

- 使用空白与缩进表示层次（有点类似 Python），可以不使用花括号和方括号。
- 可以使用 # 书写注释，比起 JSON 是很大的改进。
- 对象（字典）的格式与 JSON 基本相同，但 Key 不需要使用双引号。
- 数组（列表）是使用 - 开头的清单形式（有点类似 MarkDown）。
- 表示对象的 : 和表示数组的 - 后面都必须要有 **空格**。
- 可以使用 --- 在一个文件里分隔多个 YAML 对象  

YAML 支持的 **数据结构** 有三种。

- 对象：键值对的集合，又称为 映射（mapping）/ 哈希（hashes） / 字典（dictionary）
- 数组：一组按次序排列的值，又称为序列（sequence） / 列表（list）
- 纯量（scalars）：单个的、不可再分的值

## 数组

一组连词线开头的行，构成一个数组。

```YAML
OS:
  - linux
  - macOS
  - Windows  
```

## 对象 

对象的一组键值对，使用冒号结构表示。

```YAML
Kubernetes:
  master: 1
  worker: 3
```

## 复合结构

```YAML
languages:
  - Ruby
  - Perl
  - Python 
websites:
  YAML: yaml.org 
  Ruby: ruby-lang.org 
  Python: python.org 
  Perl: use.perl.org 
```

## 纯量     标量 

纯量是最基本的、不可再分的值。以下数据类型都属于 JavaScript 的纯量。

- 字符串  
- 布尔值
- 整数
- 浮点数
- Null
- 时间
- 日期

数值直接以字面量的形式表示。

```YAML
number: 12.30
```

布尔值用`true`和`false`表示。

```YAML
isSet: true
```

时间采用 ISO8601 格式。

```YAML
iso8601: 2001-12-14t21:59:43.10-05:00 
```

## 字符串

字符串是最常见，也是最复杂的一种数据类型。

字符串默认不使用引号表示。

```YAML
str: 这是一行字符串
```

如果字符串之中包含 **空格或特殊字符**，需要放在引号之中。

```YAML
str: '内容： 字符串'
```

单引号和双引号都可以使用，双引号不会对特殊字符转义。

```YAML
s1: '内容\n字符串'
s2: "内容\n字符串"
```

字符串可以写成多行，从第二行开始，必须有一个**单空格**缩进。换行符会被转为空格。

```YAML
str: 这是一段
  多行
  字符串
```

多行字符串可以使用`|`保留换行符，也可以使用`>`折叠换行。

```YAML
this: |
  Foo
  Bar
that: >
  Foo
  Bar
```

`+`表示保留文字块末尾的换行，`-`表示删除字符串末尾的换行。

```YAML
s1: |
  Foo
  Bar
  Second 

s2: |+
  Foo

s3: |-
  Foo
```

## 附录： 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-02/01.png)

### How data is stored in YAML

YAML can contain different kinds of data blocks:

- Sequence: values listed in a specific order. A sequence starts with a dash and a space (`-`). You can think of a sequence as a Python list or an **array** in Bash or Perl.
- Mapping: key and value pairs. Each key must be unique, and the order doesn't matter. Think of a Python dictionary or a variable assignment in a Bash script.

There's a third type called `scalar`, which is arbitrary data (encoded in Unicode) such as strings, integers, dates, and so on. In practice, these are the words and numbers you type when building mapping and sequence blocks, so you won't think about these any more than you ponder the words of your native tongue.

When constructing YAML, it might help to think of YAML as either a sequence of sequences or a map of maps, but not both.

数据在YAML中是如何存储的

YAML可以包含不同类型的数据块：

序列：按特定顺序列出的值。序列以破折号和空格（-）开头。你可以将序列看作是 Python 列表，或者 Bash 或 Perl 中的数组。

映射：键值对。每个键必须唯一，且顺序无关紧要。可以将其想象成 Python 字典或 Bash 脚本中的变量赋值。

还有第三种类型，称为标量，它是任意数据（以 Unicode 编码），如字符串、整数、日期等等。实际上，这些就是你在构建映射和序列块时输入的单词和数字，所以你不会比思考母语中的单词更费心地去考虑它们。

在构建 YAML 时，将 YAML 视为序列的序列或映射的映射（但不能同时视为两者）可能会有所帮助。

### 三种常见的数据格式

- XML： Extensible Markup Language，可扩展标记语言， 可用于数据交换和配置。 
- JSON：JavaScript Object Notation，JavaScript 对象标记法， 主要用于数据交换和配置，不支持注释。 
- YAML： YAML Ain't Markup Language，YAML 不是一种标记语言， 主要用于提供配置文件，大小写敏感。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-02/02.png)

可以用工具互相转换，参考网站：

https://www.json2yaml.com/

http://www.bejson.com/json/json2yaml/

YAML官网： https://yaml.org/
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/KVGywNboCid2GukDcN4cVUo9nBf)
- 导入日期：2026-06-22