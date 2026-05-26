---
title: "08-Deployment - 让应用永不宕机"
date: 2026-04-06T17:11:59+08:00
lastmod: 2026-04-06T17:11:59+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195303_534_12.jpg"  
tags: ["Kubernetes", "K8s", "Deployment", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 中 Deployment 的核心概念、滚动更新、自愈机制，以及如何用它保证应用高可用，适合 K8s 运维入门学习。"
slug: "k8s-deployment-high-availability"
keywords: ["Kubernetes Deployment", "K8s 滚动更新", "K8s 应用高可用"]
---

## Deployment  

"Deployment”，是专门用来部署应用程序的，能够让应用永不宕机，多用来发布**无状态的应用**，是 Kubernetes 里最常用也是最有用的一个对象。  

### 为什么要有 Deployment  

在线业务远不是单纯启动一个 Pod 这么简单，还有多实例、高可用、版本更新等许多复杂的操作。比如最简单的多实例需求，为了提高系统的服务能力，应对突发的流量和压力，我们需要创建多个应用的副本，还要即时监控它们的状态。如果还是只使用 Pod，那就会又走回手工管理的老路，没有利用好 Kubernetes 自动化运维的优势。

### 使用 YAML 描述 Deployment  

我们先用命令 kubectl api-resources 来看看 Deployment 的基本信息：  

```YAML
[root@master-01 ~]# kubectl  api-resources | grep deploy
deployments                       deploy       apps/v1                                true         Deployment
```

Deployment 的简称是“deploy”，它的 apiVersion 是“apps/v1”，kind 是“Deployment”。  

按照前面的经验就可以知道YAML头部怎么写了

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xxx-dep
```

也可以使用命令 kubectl create 来创建 Deployment 的 YAML 样板

```Bash
kubectl create deploy nginx-dep --image=nginx:1.22.1 --dry-run=client -o yaml 
```

得到的YAML大概是这样：

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx-dep    
  name: nginx-dep
spec:
  replicas: 2  # 副本数， 2个 Pod 
  selector:
    matchLabels:
      app: nginx-dep
  template:  # Pod 的模板 
    metadata:
      labels:
        app: nginx-dep
    spec:
      containers:
      - image: nginx:1.22.1
        name: nginx
```

### Deployment 的关键字段  

replicas 字段的含义就是“副本数量”的意思，指定要在 Kubernetes 集群里运行多少个 Pod 实例。  

selector，它的作用是“筛选”出要被 Deployment 管理的 Pod 对象，下属字段“matchLabels”定义了 Pod 对象应该携带的 label，它必须和“template”里 Pod 定义的“labels”完全相同，否则 Deployment 就会找不到要控制的 Pod 对象，apiserver 也会告诉你 YAML 格式校验错误无法创建。

```YAML
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-dep
      
  template:
    metadata:
      labels:
        app: nginx-dep
    spec:
```

Kubernetes 采用的是“贴标签”的方式，通过在对象的“metadata”元信息里加各种标签（labels），我们就可以筛选出具有特定标识的那些对象。  

### 创建 Deployment  

使用 kubectl apply 来创建对象

```YAML
kubectl apply -f nginx-dep.yaml
```

使用 kubectl get 命令  查看 Deployment 

```YAML
kubectl get deployments
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=M2FmNjBjZjE5N2Y4ZWNlOTU4ZmRhZTAyZDUwY2YyZTZfc2pick9CZXhsb1dUY01MSE01ZkhrWUlUYkp2dDVlMlNfVG9rZW46RnoyMWJ4VXc4b05LZ1d4TFk4bGNFd1VJbjFlXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

显示的信息很重要：

- READY 表示运行的 Pod 数量，前面的数字是当前数量，后面的数字是期望数量，所以“2/2”的意思就是要求有两个 Pod 运行，现在已经启动了两个 Pod。
- UP-TO-DATE 指的是当前已经更新到最新状态的 Pod 数量。因为如果要部署的 Pod 数量很多或者 Pod 启动比较慢，Deployment 完全生效需要一个过程，UP-TO-DATE 就表示现在有多少个 Pod 已经完成了部署，达成了模板里的“期望状态”。
- AVAILABLE 要比 READY、UP-TO-DATE 更进一步，不仅要求已经运行，还必须是健康状态，能够正常对外提供服务，它才是我们最关心的 Deployment 指标。
- AGE 表示 Deployment 从创建到现在所经过的时间，也就是运行的时间。

Deployment 管理的是 Pod，我们最终用的也是 Pod，所以还需要用 kubectl get pod 命令来看看 Pod 的状态：  

```YAML
kubectl  get pods
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZDZiNjBmMGI2NDg2MjEzZWRiNzZkYmU4NDYzYWJiMDVfNEtvOWRmR0p2S2pzazNrY0FvTjRaamp2ZERZbXVUTDZfVG9rZW46TWVLM2JWNGFxb2hJRlJ4TU5abWNIbjVWbkViXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

是时候来验证一下 Deployment 部署的应用是否真的可以做到“永不宕机”？  

```Bash
kubectl  delete pods nginx-dep-6f7d76ddc8-86g52
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MmFmMWM1NmYwOWUzNmJhMjc5MWNiZDBjYjc3YmQxOGFfTkJHSjhPbmtYOE16eGlmUThpYklvQ2E3RmhhQnNwYXBfVG9rZW46Vlh6NWJkeVRPb1JBOUl4MjYxNmNnRmRRbm5mXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MWU3YzI0YzAxZGEyZjJjM2UwZDk3MDliMDFiOTA1ZDBfb0VLaWNSMXhwcEM0YjhzRWNDdnR2em1oTWE4ZlpLdVhfVG9rZW46SlVGbWJjOFRQb1hKU054M1lLTmNDZXRFbkJlXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

被删除的 Pod 确实是消失了，但 Kubernetes 在 Deployment 的管理之下，很快又创建出了一个新的 Pod，保证了应用实例的数量始终是我们在 YAML 里定义的数量。  

### 应用伸缩 

在 Deployment 部署成功之后，你还可以随时调整 Pod 的数量，实现“应用伸缩”。  

```Bash
 kubectl  scale deployment  nginx-dep  --replicas=5
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZWEzMDVlZDc5Yzg3OGQyYTRkMzJkNmU2ZTJkNmEzN2VfTE9IcTN1UzZialFSbk9GNVVEb3BsbTBSajJScWxJRm5fVG9rZW46QUFTeWJqdmFzbzc2WFV4bll4SGM0MW45bmJoXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZjQxOTU1ZDExN2E5ODVkZTgyMmZlMGRmZWE3OTdiZmJfU0UxVUkwNG5kc3NrTlBpVjBWTFZkdHZ2b3l5M1E5N0hfVG9rZW46TlVGamJrMnBMb1JpMXh4cjZ1Y2NhejhLbm1mXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

## 应用滚动升级 

### 如何定义应用版本  

在 Kubernetes 里应用都是以 Pod 的形式运行的，而 Pod 通常又会被 Deployment 等对象来管理，所以应用的“版本更新”实际上更新的是整个 Pod。

应用的版本变化就是 template 里 Pod 的变化，哪怕 template 里只变动了一个字段，那也会形成一个新的版本，也算是版本变化。  

Kubernetes 使用了“摘要”功能，用摘要算法计算 template 的 Hash 值作为“版本号”。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MWY1ZjIxNjdiYzE1OTkxNGRmNTE0MjBmYjIwOTI5YWNfbUdSRlcwaDZ1Zm1iZWZOUmc1UGRORDhBWkljV25tcWlfVG9rZW46UVRMdGJWVGt6b2Q4ZzV4ak9kZ2NVc0lVbllmXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

### 如何实现应用更新  

部署应用 http-app:v1，实例数设为 4。

http-app-v1.yaml 

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: http-app-dep
  name: http-app-dep
spec:
  replicas: 4
  selector:
    matchLabels:
      app: http-app-dep
  template:
    metadata:
      labels:
        app: http-app-dep
    spec:
      containers:
      - image: registry.cn-beijing.aliyuncs.com/xxhf/http-app:v1
        name: http-app 
```

部署应用

```YAML
kubectl apply -f http-app-v1.yaml 
```

可以通过 curl  观察到应用的版本 

```YAML
# 端口映射
kubectl port-forward --address 0.0.0.0 deployment/http-app-dep 8080:80

# curl 127.0.0.1:8080
{"hostname":"http-app-dep-68b9b69985-5j8pc","version":"v1"}
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NjIyOGRmNjRlMTgwNTRhYTIxZmU4NWRmODlkODdjNzNfYkFubDQzNENxQjlTMmtLMEpvODd6QjhodG4yRUtNajNfVG9rZW46VTIyTmI0T1ZTb1ZoSnV4a1BnMGNIdjA0bm9kXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MjUxNTJlMzUzODNmYzM1YTQ4OGYyZjExMTQ4NmMzZDdfWlQwNER6ZlNxeFA2WGd0MzBjUjJMcHR6VGprMDAwUVRfVG9rZW46Q3FYa2J3SXFCbzJJVHF4dnFab2NQdEFvblliXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

编写一个新版本 ` http-app-v2.yaml` ， 修改镜像的版本为 v2 

因为 Kubernetes 的动作太快了，为了能够观察到应用更新的过程，我们需要添加一个字段 `minReadySeconds`，让 Kubernetes 在更新过程中等待一点时间，确认 Pod 没问题才继续其余 Pod 的创建工作。  

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: http-app-dep
  name: http-app-dep
spec:
  minReadySeconds: 30       # 确认Pod就绪的等待时间  
...
      - image: registry.cn-beijing.aliyuncs.com/xxhf/http-app:v2
        name: http-app 
```

执行命令 kubectl apply 来更新应用，因为改动了镜像名，Pod 模板变了，就会触发“版本更新”，然后用一个新命令：kubectl rollout status，来查看应用更新的状态

```YAML
kubectl apply -f http-app-v2.yaml 
kubectl rollout status deployment http-app-dep
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=OTViMjM3NjE0MTJmZGMwZTE1NmFlOTdlMTYyOGIwY2ZfbkM1RW9MRjljS0FDaHlVU1ljcmVPZGI3SmZWOFh5bkJfVG9rZW46RkJrRWI2MUpobzFxZzl4M3V0NGNOV3BVbkpmXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

再执行 kubectl get pod ，可以看到 pod 都更新成了新版本。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NzNmOWVlZTc5M2EzYThiNzE0MDYwYzQ1Mjk3ZTI4M2VfUlNMQzdQdkE0ZGpNUlMxa2FraVFUazZOdmR6VHp6ZENfVG9rZW46RUlSbWJmRTM5b2s1R1p4dFkzaWN1Rmx3bkFkXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

仔细查看 kubectl rollout status 的输出信息，你可以发现，Kubernetes 不是把旧 Pod 全部销毁再一次性创建出新 Pod，而是在逐个地创建新 Pod，同时也在销毁旧 Pod，保证系统里始终有足够数量的 Pod 在运行，不会中断服务。  

新 Pod 数量增加的过程有点像是“滚雪球”，从零开始，越滚越大，所以这就是所谓的“滚动更新”（rolling update）。  

使用命令 kubectl describe 可以更清楚地看到 Pod 的变化情况：  

```YAML
kubectl describe deployments http-app-dep
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MDAyMmZlMzFlODBhNjA2NjFkNDFiNWYxMzVkNDcxNWNfVjZhMm9KaUl0VUxKTXRtcWJUa2FTMzBYbGphdlRCN2hfVG9rZW46UDM3TmIwYUlRb3hycmF4U0FleWN2RnlubnJkXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

- 一开始的时候 V1 Pod（即 http-app-dep-68b9b69985）的数量是 4；
- 当“滚动更新”开始的时候，Kubernetes 创建 1 个 V2 Pod（即 http-app-dep-6c86b44b68 ），并且把 V1 Pod 数量减少到 3；
- 接着再增加 V2 Pod 的数量到 2，同时 V1 Pod 的数量变成了 1；
- 最后 V2 Pod 的数量达到预期值 4，V1 Pod 的数量变成了 0，整个更新过程就结束了  

其实“滚动更新”就是由 Deployment 控制的两个同步进行的“应用伸缩”操作，老版本缩容到 0，同时新版本扩容到指定值，大家通过下面这张图再理解一下 滚动更新 的过程 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MThkMTI3ZWZiNTg3NGQ4N2E5NTNkZmNiMzczNzdmZDJfVEZUc2pURUNEa3JRVmI0cWdCbUt4Y2ZNWHYxanBrU01fVG9rZW46UjNKYmI0VVNyb1dTdmt4VFd0RWNhZ3RUbmFkXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

### 如何管理应用更新  

在应用更新的过程中，我们可以随时使用` kubectl rollout pause `来暂停更新，检查、修改Pod，或者测试验证，如果确认没问题，再用 `kubectl rollout resume` 来继续更新。  

如果更新的版本比较多，我们想查看更新历史，可以使用命令 `kubectl rollout history`：  

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NjVlMGQyNTIyZmViODI3NWI2MzVhYmI1NDA1NjZlOTNfWnNDZDlYaWVrZjBBRGVmZ1FMSHd2R0h5b3NZRWlVSXdfVG9rZW46Rkd3UmJmV1kxb0dpS3p4V3RuMGNlS21sblJlXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

`kubectl rollout history` 的列表输出的有用信息太少，可以在命令后加上参数 `--revision` 来查看每个版本的详细信息，包括标签、镜像名、环境变量、存储卷等等，通过这些就可以大致了解每次都变动了哪些关键字段：  

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NDZmNDhiOWFjOWMyOTBhZjVkZmIzZjJkY2RmODBmNmJfc3IzcE9zaTBrUzhMZDVjQUJobUZxSGNNeEZNQmtMRFBfVG9rZW46R0FtbGJ6MmQzb0hJdnF4NXZnOGNVUHFNbjZmXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

如果我们刚上线的v2版本发现有BUG，希望回退到V1版本，可以使用命令 `kubectl rollout undo`，也可以加上参数 `--to-revision` 回退到任意一个历史版本。

```YAML
kubectl rollout undo deployment http-app-dep 
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MDUxNmJjMjk1ZGVlMGEwYzE2NzRiMTEyYjMwMTcyODBfWWlKZzR5cU4wS3VVWWVPcU9FY3ZwNWVsV1FKU0lMb3hfVG9rZW46QTNMd2J0SXpkb05QVnF4V0VYSmNIWmtzbjZiXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

kubectl rollout undo 的操作过程其实和 kubectl apply 是一样的，执行的仍然是“滚动更新”，只不过使用的是旧版本 Pod 模板，把新版本 Pod 数量收缩到 0，同时把老版本 Pod 扩展到指定值。  

下图是从 v2 到 v1 版本降级的过程：

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NDFkMThjYzBkNmM2NzhjYTJjYmUwZTQ3OWMzNWU1ZjlfTGt5RmhyOGNCaVRwTDJQVXFDQUcwb3RvZ21MY1F3OHFfVG9rZW46VGpPY2J0Z2ZLb09rY3p4SGwxSWNvRktFblVoXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

### 添加更新描述  

kubectl rollout history 的版本列表好像有点太简单了呢？只有一个版本更新序号，而另一列 CHANGE-CAUSE 总是显示成 <none> ，能不能加上说明信息，当然是可以的，只需要在 Deployment 的 metadata 里加上一个新的字段 annotations。 

annotations 字段的含义是“注解” “注释”，形式上和 labels 一样，都是 Key-Value，也都是给 API 对象附加一些额外的信息，但是用途上区别很大。  

- annotations 添加的信息一般是给内部的各种对象使用的，有点像是“扩展属性”；
- labels 主要用来筛选、过滤对象的;

 

annotations 里的值可以任意写，Kubernetes 会自动忽略不理解的 Key-Value，但要编写更新说明就需要使用特定的字段 kubernetes.io/change-cause。  

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-app-dep
  labels:
    app: http-app-dep
  annotations:
    kubernetes.io/change-cause: version=v3 
kubectl apply -f http-app-v3.yaml
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NzhlODNiYjFmMjNmMzZmMzJlMzNkZTNmMWZiZDQyM2RfVmhRaGdCcXBHRDgyc3BsbUN3OUNSbThWaW0wejVQUU1fVG9rZW46RG9mVWJ4SjJIbzdEOXh4Z0ZSUmNsUkRObjRiXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

### 控制滚动更新的参数 

1. `maxSurge`表示在进行滚动更新期间，允许超过副本数量的额外Pod副本数。它指定了可以同时创建的超过副本数的Pod的最大数量。默认情况下，`maxSurge`的值为25%。例如，如果你的副本数为4，`maxSurge`设置为1，则在滚动更新期间，可以同时存在5个Pod。  
2. `maxUnavailable`表示在进行滚动更新期间，允许不可用的最大Pod副本数。它指定了可以同时终止的不可用Pod的最大数量。默认情况下，`maxUnavailable`的值为25%。例如，如果你的副本数为4，并且`maxUnavailable`设置为1，那意味着在滚动更新期间，允许不可用的最大Pod副本数为1。这意味着在滚动更新期间，最多只能终止1个Pod，而剩下的3个Pod将保持可用状态。

http-app-v4.yaml

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-app-dep
  labels:
    app: http-app-dep
  annotations:
    kubernetes.io/change-cause: version=v4 
spec:
  minReadySeconds: 30 
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  revisionHistoryLimit: 10
  replicas: 4
```

### 应用部署策略

#### **滚动部署   (k8s 原生支持 )**

在滚动部署中，应用的新版本逐步替换旧版本。实际的部署发生在一段时间内。在此期间，新旧版本会共存，而不会影响功能和用户体验。这个过程可以轻易的回滚。

但是滚动升级有一个问题，在开始滚动升级后，流量会直接流向已经启动起来的新版本，但是这个时候，新版本是不一定可用的，比如需要进一步的测试才能确认。那么在滚动升级期间，整个系统就处于非常不稳定的状态，如果发现了问题，也比较难以确定是新版本还是老版本造成的问题。

#### 蓝绿部署

蓝绿发布提供了一种零宕机的部署方式。不停老版本，部署新版本进行测试，确认OK，将流量切到新版本，然后老版本同时也升级到新版本。始终有两个版本同时在线，有问题可以快速切换。

**蓝绿发布的特点：**

在部署应用的过程中，应用始终在线。并且新版本上线过程中，不会修改老版本的任何内容，在部署期间老版本状态不受影响。只要老版本的资源不被删除，可以在任何时间回滚到老版本。

以下示意图可描述蓝绿发布的大致流程：先切分20%的流量到新版本，若表现正常，逐步增加流量占比，继续测试新版本表现。若新版本一直很稳定，那么将所有流量都切分到新版本，并下线老版本。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZTg4Zjg0MDU1NzQyMmU0YTg4ZmU2MmY4YmQyNGJmYjRfeEZkUDh5UlZwMllXQzBTMmplRlp6ZVRZb3FtdWlmc01fVG9rZW46WGlVdGI1OGx5b3FDY3l4ZW5EaWNXa2g1bkVnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZmMyNDE0M2JmODU5YzA5ZDcxNDBjZmY4ZWY4NzU1YjZfZHlHeTM4MDdoaXpXUnZMakU1NndlYlR2Sm9OdlBIQUtfVG9rZW46UlQxNGJGa2tnb01PeWp4dVRuMGN4ZUlsbmJ5XzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NGM2ZmQxYzM4YzNmY2U3N2VlM2RmOWI2OGQ4MDBiYzBfNVpYaUZRaElvOTRTa3dwMXNIZHg5d3RaS252YlpqZXZfVG9rZW46TUNQdWJhQ3Bnb2JTYWt4ZHBWZ2NUNzFBbjRmXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

切分20%的流量到新版本后，新版本出现异常，则快速将流量切回老版本。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGNlNjM2NmI5NDBkNjhkYmY0ZjY5NmRjMzEzOTFhZmFfVlB6MG5WVVJlUWh0UzR2S3haQW16ZFl4Ykk3dmNERXVfVG9rZW46VTFFdGJFUm04b2lFdUt4Nlp1VWNsb2pLbkZiXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=Zjc4Y2Q3YTkzYWM5YmQ2NWFlMTEwOWUwNzYwNmI5ODJfYWExUFlCcU5vazNNcktRbnlQcm9BZHlkSmprYlFBYkpfVG9rZW46TUI0UmJhaTk1b3BjV1B4SktrNWNsMnNIblJkXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NWE0OWE2NjFiMDQ5NTdkZTRhYWU5YWJiOGVlNzk1NTFfV0NxbmJVS21YeXM1YjBLOHRwTmg0Z2NES3Z1bDQ2c0tfVG9rZW46TjZNVmJ4UVFEb3RKanp4end5R2N0bEtXblZnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

**蓝绿部署要求在升级过程中，同时运行两套程序，对硬件的要求就是日常所需的二倍，比如日常运行时，需要10台服务器支撑业务，那么使用蓝绿部署，你就需要购置二十台服务器。**

#### 金丝雀 / 灰度 发布

在生产环境上引一部分实际流量对一个新版本进行测试，测试新版本的性能和表现，在保证系统整体稳定运行的前提下，尽早发现新版本在实际环境上的问题。

**“为什么叫金丝雀发布呢，是因为金丝雀对矿场中的毒气比较敏感，所以在矿场开工前工人们会放一只金丝雀进去，以验证矿场是否存在毒气，这便是金丝雀发布名称的由来。”**

**金丝雀发布的特点：**

金丝雀发布，又称为灰度发布。它能够缓慢的将修改推广到一小部分用户，验证没有问题后，再推广到全部用户，以降低生产环境引入新功能带来的风险。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NDE2NmFjYWM0MzA0Yjc2MGNhYTMwNWM3YmYyMGE1NWNfeFd1aUpwaVBTaVE0WjdLMVdMdWZ1M2lQNXVGVkloV1hfVG9rZW46RVRyZGJoWEtGb3Z3T2t4TVBkemNXZTNyblNtXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

步骤一：部署少量副本的金丝雀版本的应用；

步骤二：根据不同策略，将流量引入金丝雀副本。策略可以根据情况指定，比如随机样本策略（随机引入）、狗粮策略（就是内部用户或员工先尝鲜）、分区策略（不同区域用户使用不同版本）、用户特征策略（这种比较复杂，需要根据用户个人资料和特征进行分流，类似于千人千面）；

步骤三：金丝雀副本应用 验证通过后，增加金丝雀应用的副本数，增加导流的比例，减少旧版本的流量和副本的数量，最终完成版本的切换。 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NzkxMTYwNjJmZmY3ZjdmYmY5ZDdkODk2MjU5OTUxMjFfS0tvWGREbHVPZ2k0blNoalFhSlpMbFZVWXd3RVpZdWlfVG9rZW46Q0JhY2JNZ3ZRb1k1M1p4M1RqcWMyYkFDbnRoXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

## 应用保障策略 

### 容器资源配额   

#### 如何限制容器对资源的使用

Kubernetes如何限制容器对资源的需求，只要在 Pod 容器的描述部分添加一个新字段 resources 就可以了。

```YAML
      containers:
      - image: nginx:1.22.1
        name: nginx
        resources:
          limits:   # 容器可以使用资源的上限   cgroups 
            cpu: 200m
            memory: 100Mi
          requests:  # 容器运行时需要满足的资源 
            cpu: 50m
            memory: 50Mi
```

需要重点学习的是 containers.resources，它下面有两个字段：  

- “requests”，意思是容器要申请的资源，也就是说要求 Kubernetes 在创建 Pod 的时候必须分配这里列出的资源，否则容器就无法运行。
- “limits”，意思是容器使用资源的上限，不能超过设定值，否则就有可能被强制停止运行。  

内存的写法和磁盘容量一样，使用 Ki、Mi、Gi 来表示 KB、MB、GB，比如 512Ki、100Mi、0.5Gi 等。

 CPU 因为在计算机中数量有限，非常宝贵，所以 Kubernetes 允许容器精细分割 CPU，即可以 1 个、2 个地完整使用 CPU，也可以用小数 0.1、0.2 的方式来部分使用 CPU。不过 CPU 时间也不能无限分割，Kubernetes 里 CPU 的最小使用单位是 0.001，为了方便表示用了一个特别的单位 m，也就是“milli”“毫”的意思，比如说 500m 就相当于 0.5。 1000m=1核心 

如果 Pod 不写 resources 字段，Kubernetes 会如何处理呢？

如果预估错误，Pod 申请的资源太多，系统无法满足会怎么样呢？  

Worker 节点资源不足，k8s 驱逐

#### 容器的服务质量

- QoS 服务质量分为三类
  - Guaranteed  
  - Burstable
  - BestEffort

1. Guaranteed 的 Pod：
   1. Pod 中的每个容器都必须指定内存限制和内存请求。
   2. 对于 Pod 中的每个容器，**内存****限制必须等于内存请求**。
   3. Pod 中的每个容器都必须指定 CPU 限制和 CPU 请求。
   4. 对于 Pod 中的每个容器，**CPU** **限制必须等于 CPU 请求**。

```YAML
      containers:
      - image: nginx:1.22.1
        name: nginx
        resources:
          limits:
            cpu: 200m 
            memory: 100Mi
          requests:
            cpu: 200m 
            memory: 100Mi
[root@master-01 resource]# kubectl describe  pods ngx-dep-res-q1-78fcfbfcbf-htscv
QoS Class:                   Guaranteed
```

1.  Burstable 的 Pod
   1. Pod 不符合 Guaranteed QoS 类的标准。
   2. Pod 中至少一个容器具有内存或 CPU 请求。

```YAML
      containers:
      - image: nginx:1.22.1
        name: nginx
        resources:
          limits:
            cpu: 200m 
            memory: 100Mi
          requests:
            cpu: 100m 
            memory: 50Mi
[root@master-01 resource]# kubectl describe  pods ngx-dep-res-q2-56fcf66894-pwxf8    
QoS Class:                   Burstable
```

1.  BestEffort 的 Pod
   1. 没有设置内存和 CPU 限制或请求

```YAML
      containers:
      - image: nginx:1.22.1
        name: nginx
[root@master-01 resource]# kubectl describe  pods ngx-dep-res-q3-8d9b8b54c-rcq7t
QoS Class:                   BestEffort
```

#### Kubernetes 资源超卖

Kubernetes 在计算资源时是使用 request 字段进行计算的。 一个 worker 节点如果有 10 个 CPU 的资源。 Pod A 申请 `request：5，limit：5`， Pod B 申请 `request 5，limit 5`，是可以申请成功的。 而如果再启动一个 Pod C 申请 `request 5， limit 5`， 就会失败（Pod 处于 pending 状态， 一直在等待资源）。 因为 kubernetes 并不是按 limit 字段来计算资源用量而是使用 **request** 字段进行计算。

上面的资源申请方式在 Kubernetes 就被称作 **资源超卖**。 

**资源超卖** 的意思就是说本来系统只有 10 个 CPU 的资源， 但是容器  A、B、C、D  都各自需要申请 5 个 CPU 的资源，这明显不够用。 但是如果 A、B、C、D  不可能在同一时刻都占满 5 个 CPU 资源， 因为每个服务都有它业务的高峰期和低谷期的。 高峰期的时候可以占满 5 个 CPU， 但是服务大部分时间都处于低谷期，可能只占用 1，2 个 CPU。 所以如果直接写 request:5 的话，很多时候资源是浪费的（ kubernetes 里即便容器没有使用到那么多资源， 也会为容器预留 request 字段的资源）。 所以我们可以为容器申请这样的资源： `request：1， limit：5`。 这样上面 4 个容器加起来只申请了 4 个 CPU 的资源， 而系统里有 10 个 CPU， 是完全可以申请到的。 而每个容器的 limit 又设置成了 5， 所以每个容器又都可以去使用 5 个 CPU 资源。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NzhhNjk1M2ExYTczZWI0YWVkY2Y5ZDM1ZDFhYzdhODJfdFowS2o5YVV1UE9SSU5hV1VoaFJBb090QTlXNUN1TTRfVG9rZW46QWUzcWJtRG5Wb2J4cFZ4bXMwSGNucFNSbmliXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

### 容器状态探针  

#### 什么是容器探针 

运行在Kubernetes中的应用需要用什么手段来检查应用的健康状态呢？  

Kubernetes 用来判断应用是否“健康”的功能被命名为“探针”（Probe），也可以叫“探测器”  。

Kubernetes 为检查应用状态定义了三种探针，它们分别对应容器不同的状态：  

- Startup，启动探针，用来检查应用是否已经启动成功，适合那些有大量初始化工作要做，启动很慢的应用。
- Liveness，存活探针，用来检查应用是否正常运行，是否存在死锁、死循环。
- Readiness，就绪探针，用来检查应用是否可以接收流量，是否能够对外提供服务  

需要注意这三种探针是递进的关系：应用程序先启动，加载完配置文件等基本的初始化数据就进入了 Startup 状态，之后如果没有什么异常就是 Liveness 存活状态，但可能有一些准备作没有完成，还不一定能对外提供服务，只有到最后的 Readiness 状态才是一个容器最健康可用的状态。  

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MjY2MTA0NDA1YTgzZmU0ZjkzMGI5OWUyM2M1ZDcxODFfZXA1TXdnRFJYbkQxRmowV3YyVDZIZHIyZldSeUVhSTlfVG9rZW46V29vRmJnM1FmbzUybG94UkNlcGNrMFRObk9jXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

Kubernetes 在启动容器后就会不断地调用探针来检查容器的状态：  

- 如果 Startup 探针失败，Kubernetes 会认为容器没有正常启动，就会尝试反复重启，当然其后面的 Liveness 探针和 Readiness 探针也不会启动。
- 如果 Liveness 探针失败，Kubernetes 就会认为容器发生了异常，也会重启容器。
- 如果 Readiness 探针失败，Kubernetes 会认为容器虽然在运行，但内部有错误，不能正常提供服务，就会把容器从 Service 对象的负载均衡集合中排除，不会给它分配流量。  

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=YjViNTdhMzE4ODA5M2E1ZjU3YzkwZDdhN2MwNmI4YjRfSFRZMEN0U1Bkd0VCTnA5eWJOa1Z0SVhZUGo1cm5oRFNfVG9rZW46STAwTmJEZjk0b1VQUnN4cnVsb2NaNkgybmpnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

#### 使用容器探针 

startupProbe、livenessProbe、readinessProbe 这三种探针的配置方式都是一样的，关键字段有这么几个：  

- periodSeconds，执行探测动作的时间间隔，默认是 10 秒探测一次。
- timeoutSeconds，探测动作的超时时间，如果超时就认为探测失败，默认是 1 秒。
- successThreshold，连续几次探测成功才认为是正常，对于 startupProbe 和livenessProbe 来说它只能是 1。 

​     成功阈值

- failureThreshold，连续探测失败几次才认为是真正发生了异常，默认是 3 次。   失败阈值
- initialDelaySeconds： 初始化延迟时间 

探测方式，Kubernetes 支持 3 种：Shell、TCP Socket、HTTP GET，它们也需要在探针里配置：  

- exec，执行一个 Linux 命令，比如 ps、cat 等等，和 container 的 command 字段很类似。  
- tcpSocket，使用 TCP 协议尝试连接容器的指定端口。 Telnet  ip  port 
- httpGet，连接端口并发送 HTTP GET 请求。 Curl http://ip:port 

我们看一个使用探针的例子，还是以 Nginx 作为示例，用 ConfigMap 编写一个配置文件：  

nginx-conf-cm.yaml

```YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: ngx-conf
data:
  default.conf: |
    server {
      listen 80;
      location = /ready {
        return 200 'I am OK!';
       }
    }
```

nginx-dep-probe.yaml

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: ngx-dep-prob
  name: ngx-dep-prob
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ngx-dep-prob
  template:
    metadata:
      labels:
        app: ngx-dep-prob
    spec:
      volumes:
      - name: ngx-conf-vol
        configMap:
         me: ngx-conf
      containers:
      - image: nginx:1.22.1
        name: nginx
        ports:
        - containerPort: 80
        volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: ngx-conf-vol
        startupProbe:   # 启动探针
          periodSeconds: 2
          exec:
            command: ["cat", "/var/run/nginx.pid"]
        livenessProbe:  # 存活探针 
          periodSeconds: 5
          tcpSocket:
            port: 80
        readinessProbe:  # 就绪探针 
          periodSeconds: 5 
          httpGet:
            path: /ready
            port: 80
```

- StartupProbe 使用了 Shell 方式，使用 cat 命令检查 Nginx 存在磁盘上的进程号文件（/var/run/nginx.pid），如果存在就认为是启动成功，它的执行频率是每2秒探测一次。
- LivenessProbe 使用了 TCP Socket 方式，尝试连接 Nginx 的 80 端口，每 5 秒探测一次。
- ReadinessProbe 使用的是 HTTP GET 方式，访问容器的 /ready 路径，每 5 秒发一次请求。  

我们使用 kubectl apply  创建 nginx deployment 

```YAML
kubectl apply -f nginx-conf-cm.yaml
kubectl apply -f nginx-dep-probe.yaml
```

观察 pod 状态 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=Y2Y5MjBhOGIwY2FhMjM0NTQ5MGUzYTVlM2Q1ODUzNmVfNnVkRUxycTBwckRHZ0xiVkI3Q2dqUktaUks5SWZYN1hfVG9rZW46Rk1zZ2JkQk9Gb2c0ZVZ4S2NwbWM4Zks2bnJnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

使用 kubectl  logs 命令查看 nginx 日志，可以看到探针的执行情况 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MzIwNTUxYTU0YjhhMGY1ZGYxYmIzZGE5Nzc0YzdhZWJfajRZc2EzTkd6ZTZvYWRVTkxhVzZUekQxcVpjb0d4V3JfVG9rZW46TEhvSmJSWDVqb0hoeGN4cXRTa2MwN0lVbklnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

通过上图可以看到 Kubernetes 正是以大约 5 秒一次的频率，向 URI /ready 发送 HTTP 请求，不断地检查容器是否处于就绪状态。  

为了验证另两个探针的工作情况，我们可以修改探针，比如把命令改成检查错误的文件、错误的端口号：  

```YAML
        startupProbe:
          periodSeconds: 2
          exec:
            command: ["cat", "nginx.pid"]    # 修改为错误的文件位置 
            
        livenessProbe:
          periodSeconds: 10
          tcpSocket:
            port: 8080                      # 修改为错误的端口
```

当 StartupProbe 探测失败的时候，Kubernetes 就会不停地重启容器，现象就是 RESTARTS 次数不停地增加，而 livenessProbe 和 readinessProbePod 没有执行，Pod 虽然是 Running 状态，也永远不会 READY：  

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=OWUyZTdjMDQzOGVhZTk2YWRhMmE5YTBhNTRmMGNmYjdfM0dveWt0ZEJkQTZReEZsakRNUzdPYjFOY1FQNllLSEpfVG9rZW46R1lYbmJRcm5Yb1B6NVN4c29KOGNScDU5bklnXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

#### 测试 Liveness 和 readinessProbe 执行频率 

```YAML
        livenessProbe:
          periodSeconds: 10
          httpGet:
            path: /live
            port: 80
        readinessProbe:
          periodSeconds: 5 
          httpGet:
            path: /ready
            port: 80
```

## ReplicaSet  控制器

Kubernetes 中的 ReplicaSet 主要的作用是维持一组 Pod 副本的运行，它的主要作用就是保证一定数量的 Pod 能够在集群中正常运行，它会持续监听这些 Pod 的运行状态，在 Pod 发生故障重启数量减少时重新运行新的 Pod 副本。

nginx-reps.yaml

```YAML
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-replicaset 
  labels:
    app: nginx-reps 
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-reps 
  template:
    metadata:
      labels:
        app: nginx-reps 
    spec:
      containers:
      - name: nginx
        image: nginx:1.22.1 
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MGM2MzUxYTg1NjBjZGM3MTU5NTJlMjU4YzAzOGY5NmJfZnlPRmpPbnJycUoxcTBNaXQ0SFZGNkZvRlRsTEx0Q2RfVG9rZW46Vk1QeWJTd0FYb254bm94VDJvd2N5MXFtbmFoXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

`Deployment` 是一个可以拥有 ReplicaSet 并使用声明式方式在服务器端完成对 Pod 滚动更新的对象。 尽管 ReplicaSet 可以独立使用，目前它们的主要用途是提供给 Deployment 作为编排 Pod 创建、删除和更新的一种机制。当使用 Deployment 时，你不必关心如何管理它所创建的 ReplicaSet，Deployment 拥有并管理其ReplicaSet。 因此，建议你在需要 ReplicaSet 时使用 Deployment。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=OGMyYjE0ZmMwNzQ1YTBiYjQ1YjVhNWVlZDBhYmVhMWJfb1lPSTFqQWZ4YUppWXRQeE5wOXRpVGEwZTNSdXZ5UU9fVG9rZW46Q0J2aWJvTTlXb2JUYUh4ajZPN2NaTWJlbkpiXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)

## ReplicationController 控制器 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGM3NDRmYzhiZGY5Y2Y5MzJhYjE4NDZiZWFkYTk0MGZfdE5nZGhsUGtUOXQyUTVnZEhaNFZMTmVrTTgwd3lVRkFfVG9rZW46QXRWUWJpY2Q5b3BweFN4VGtJOWNPZEFEbkZkXzE3NzU0NzEzNDk6MTc3NTQ3NDk0OV9WNA)
