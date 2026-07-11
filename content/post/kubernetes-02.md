---
title: 'Kubernetes 核心原理：RESTful API 与 Raft 算法详解'
description: "Kubernetes对象介绍"
date: 2026-04-06T16:05:37+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195229_528_12.jpg"
tags: ["Kubernetes", "K8s", "云原生", "容器编排", "DevOps", "容器技术", "运维", "微服务", "云原生运维", "K8s入门"]
categories: ["8. Kubernetes"]
---

## Restful API 
Restful 是目前最流行的 API 设计规范，用于 Web 数据接口的设计。
RESTful 的核心思想就是，客户端发出的数据操作指令都是"动词 + 宾语"的结构。比如，GET /articles这个命令，GET是动词，/articles是宾语。
动词通常就是五种 HTTP 方法，对应 CRUD 操作。
- GET：读取（Read）
- POST：新建（Create）
- PUT：更新（Update）
- PATCH：更新（Update），通常是部分更新
- DELETE：删除（Delete）
根据 HTTP 规范，动词一律大写。  

curl -XGET 127.0.0.1:8080/books

curl -XPOST  \
-H 'Content-Type: application/json' \
-d '{
    "title": "Three-Body",
    "author": "Liucixin"
}'  http://127.0.0.1:8080/books


curl -XDELETE http://127.0.0.1:8080/books/1

curl -XPATCH  \
-H 'Content-Type: application/json' \
-d '{
    "title": "The Three-Body"
}'  http://127.0.0.1:8080/books/2



curl -XGET 127.0.0.1:80/api/v1/books/3

状态码
- 1xx：相关信息
- 2xx：操作成功
- 3xx：重定向
- 4xx：客户端错误
- 5xx：服务器错误

## Raft
 https://thesecretlivesofdata.com/raft/
