---
title: "九、镜像多阶段构建"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-05"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 九、镜像多阶段构建

## 镜像 Cache 机制 

Docker Daemnon 通过 Dockerfile 构建镜像时，当发现即将新构建出的镜像与已有的某镜像重复时，可以选择放弃构建新的镜像，而是选用已有的镜像作为构建结果，也就是采取本地已经 cache 的镜像作为结果

### Cache 机制的注意事项：

1. ADD 命令与 COPY 命令：Dockerfile 没有发生任何改变，但是命令`ADD run.sh /` 中 Dockerfile 当前目录下的 run.sh 文件内容发生了变化，从而将直接导致镜像层文件系统内容的更新，原则上不应该再使用 cache。那么，判断 ADD 命令或者 COPY 命令后紧接的文件是否发生变化，则成为是否延用 cache 的重要依据。Docker 采取的策略是：获取 Dockerfile 下内容（包括文件的部分 inode 信息），计算出一个唯一的 hash 值，若 hash 值未发生变化，则可以认为文件内容没有发生变化，可以使用 cache 机制；反之亦然。

2. RUN 命令存在外部依赖：一旦 RUN 命令存在外部依赖，如`RUN apt-get update`，那么随着时间的推移，基于同一个基础镜像，一年前的 apt-get update 和一年后的 apt-get update， 由于软件源软件的更新，从而导致产生的镜像理论上应该不同。如果继续使用 cache 机制，将存在不满足用户需求的情况。Docker 一开始的设计既考虑了外部依赖的问题，用户可以使用参数 --no-cache 确保获取最新的外部依赖，命令为`docker build --no-cache -t="my_new_image" .`

3. 为了更好的利用 docker cache 机制，在书写 Dockerfile 时，应该将更多静态的安装、配置命令尽可能地放在 Dockerfile 的较前位置。

## **传统 Build 流程**

先编译打包

```Dockerfile
FROM golang:1.20 AS build

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.cn

WORKDIR /go/src/app
COPY . .

RUN go mod download
RUN CGO_ENABLED=0 go build -o /go/bin/app
```

```Bash
docker build -f Dockerfile-build -t app-build:v1 . 
```

再将打包好的应用复制到镜像中 

```Dockerfile
FROM alpine:3.18
COPY app /
CMD ["/app"]
```

```Bash
docker run --name app-build  -it  app-build:v1 sh
docker cp app-build:/go/bin/app .
docker build -t app:v1 .
```

## **Dockerfile 中 多阶段构建（multi-stage）**

```Dockerfile
# Start by building the application.
FROM golang:1.20

WORKDIR /go/src/app
COPY . .

RUN go mod download
RUN CGO_ENABLED=0 go build -o /go/bin/app

# Now copy it into our base image.
FROM alpine:3.18
COPY --from=0 /go/bin/app /
CMD ["/app"]
```

**命名方式的 stage**

```Dockerfile
# Start by building the application.
FROM golang:1.20 AS build

WORKDIR /go/src/app
COPY . .

RUN go mod download
RUN CGO_ENABLED=0 go build -o /go/bin/app

# Now copy it into our base image.
FROM alpine:3.18
COPY --from=build /go/bin/app /
CMD ["/app"]
```

> <!--旧版本的 docker 是不支持 multi-stage 的，只有 17.05 以及之后的版本才开始支持-->

## **Google 内部精简镜像 distroless**

虽然 Alpine 镜像已经很小了，但是它依旧包含了许多不必要的组件。那么有没有可能让我们的镜像里不包含包管理工具、SHELL、冗余的二进制文件，只包含最小的可运行系统，以及我们的语言 Runtime，或者核心的 glibc 依赖呢?

官方目前已经提供了多数场景下所需要的镜像，比如：

- 适合静态编译语言运行的镜像：C，C++，Go，Rust。
- 适合动态语言使用的镜像：Java，Python，Node

### 如何使用镜像 

```Dockerfile
# Start by building the application.
FROM golang:1.20 as build

WORKDIR /go/src/app
COPY . .

RUN go mod download
RUN CGO_ENABLED=0 go build -o /go/bin/app

# Now copy it into our base image.
FROM gcr.io/distroless/static-debian11
COPY --from=build /go/bin/app /
CMD ["/app"]
```

https://github.com/GoogleContainerTools/distroless

## Dockerfile 最佳实践  BP

- 不要安装无效软件包
- 应简化镜像中同时运行的进程数，理想状况下，每个镜像应该只有一个进程  
- 如果无法避免同一镜像运行多进程时，应选择合理的初始化进程（init process）  
- 最小化层级数

  - 最新的Docker只有 RUN、COPY、ADD 创建新层，其他指令创建临时层，不会增加镜像大小。 
  
    - 比如 EXPOSE 指令就不会生成新层。
  - 多条 RUN 命令可通过连接符连接成一条指令集，以减少层数  && 
  - 通过多阶段构建减少镜像层数
- 编写 Dockerfile 的时候，应该把变更频率低的编译指令优先构建，放在镜像底层，有效利用 build cache 
- 复制文件时，每个文件应独立复制，这确保某个文件变更时，只影响该文件对应的缓存
- 选择可以满足业务需求最优的 base image 

目标： 易管理、少漏洞、镜像小、层级少、利用缓存 

## 附录：

### 镜像地址

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/golang:1.20
ccr.ccs.tencentyun.com/chijinjing/golang:1.20
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/JklMwH8VPiSUbxk7u1ccKunUnrh)
- 导入日期：2026-06-22