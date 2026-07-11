---
title: "09-DaemonSet-忠实可靠的看门狗"
date: 2026-04-06T17:16:12+08:00
lastmod: 2026-04-06T17:16:12+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195305_535_12.jpg"  
tags: ["Kubernetes", "K8s", "DaemonSet", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 中 DaemonSet 的核心概念、使用场景，以及如何用它实现节点级守护进程部署，适合 K8s 运维入门学习。"
slug: "k8s-daemonset-node-daemon"
keywords: ["Kubernetes DaemonSet", "K8s 节点守护进程", "K8s 运维"]
---

## DaemonSet 应用场景 

DaemonSet 的目标是在集群的**每个节点上运行且仅运行一个** **Pod**，就好像是为节点配上一只“看门狗”，忠实地“守护”着节点，这就是DaemonSet 名字的由来。

应用场景：

- 网络应用（如 kube-proxy），必须每个节点都运行一个 Pod，否则节点就无法加入Kubernetes 网络。
- 监控应用（如 node-exporter），必须每个节点都有一个 Pod 用来监控节点的状态，实时上报信息。
- 日志应用（如 filebeat），必须在每个节点上运行一个 Pod，才能够搜集容器运行时产生的日志数据。
- 安全应用，同样的，每个节点都要有一个 Pod 来执行安全审计、入侵检查、漏洞扫描等工作。  

## 使用 YAML 描述 DaemonSet  

DaemonSet 和 Deployment 都属于在线业务，所以它们也都是“apps”组，使用命令` kubectl api-resources `可以知道它的简称是 ds ，所以 YAML 文件头信息应该是：

```YAML
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: xxx-ds  
```

我们从[官网](https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/daemonset/) 找一个模板改一下 

```YAML
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter-ds
  labels:
    app: node-exporter
    
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      containers:
      - name: node-exporter
        image: bitnami/node-exporter:1.6.1   # metrics  pull 
        resources:
          limits:
            cpu: 200m
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
```

我们比较一下Daemonset和Deployment的YAML就会看到，DaemonSet 在 spec 里没有 replicas 字段，这是它与Deployment 的一个关键不同点，意味着它不会在集群里创建多个 Pod 副本，而是要在每个节点上只创建出一个 Pod 实例。

也就是说，DaemonSet 仅仅是在 Pod 的部署调度策略上和 Deployment 不同，其他的都是相同的，某种程度上我们也可以把 DaemonSet 看做是 Deployment 的一个特例。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-08/01.png)

我们也可以用变通的方法来创建 DaemonSet 的 YAML 样板了，你只需要用 kubectl create 先创建出一个 Deployment 对象，然后把 kind 改成 DaemonSet，再删除 spec.replicas 就行了。

## 部署 DaemonSet  

我们执行命令 kubectl apply 来创建 DaemonSet 对象，再用 kubectl get 查看对象的状态：  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-08/02.png)

看这张截图，虽然我们没有指定 DaemonSet 里 Pod 要运行的数量，但它自己就会去查找集群里的节点，在节点里创建 Pod。因为我们的环境里有一个 Master 一个 Worker，所以 DaemonSet 就在每个节点上生成了一个 Pod。

## 什么是 静态 Pod  

DaemonSet 是在 Kubernetes 里运行节点专属 Pod 最常用的方式，但它不是唯一的方式，Kubernetes 还支持另外一种叫“静态 Pod”的应用部署手段。 “静态 Pod”非常特殊，它不受 Kubernetes 系统的管控，不与 apiserver、scheduler 发生关系，所以是“静态”的。 但既然它是 Pod，也必然会“跑”在容器运行时上，也会有 YAML 文件来描述它，而唯一能够管理它的 Kubernetes 组件也就只有在每个节点上运行的 kubelet 了。  

“静态 Pod”的 YAML 文件默认都存放在节点的 `/etc/kubernetes/manifests` 目录下，它是Kubernetes 的专用目录。 下面的这张截图就是 Master 节点里目录的情况：  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-08/03.png)

你可以看到，Kubernetes 的 4 个核心组件 apiserver、etcd、scheduler、controller-manager原来都以静态 Pod 的形式存在的，这也是为什么它们能够先于 Kubernetes 集群启动的原因。 如果你有一些 DaemonSet 无法满足的特殊的需求，可以考虑使用静态 Pod，编写一个 YAML文件放到这个目录里，节点的 kubelet 会定期检查目录里的文件，发现变化就会调用容器运行时创建或者删除静态 Pod。  
