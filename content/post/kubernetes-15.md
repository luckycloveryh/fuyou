---
title: "16-调度"
date: 2026-04-06T18:00:27+08:00
lastmod: 2026-04-06T18:00:27+08:00
draft: false
image: "https://picsum.photos/seed/fuyou-k8s-scheduling-strategies/1200/675"
tags: ["Kubernetes", "K8s", "调度", "高级调度", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 调度机制，包括节点选择、亲和性/反亲和性、污点与容忍等高级调度策略，适合 K8s 运维进阶学习。"
slug: "k8s-scheduling-strategies"
keywords: ["K8s 调度", "NodeSelector", "亲和性", "污点容忍", "Kubernetes 运维"]
---

## 高级调度

### nodeSelector

nodeSelector 提供了一种最简单的方法将 Pod 约束调度到具有特定标签的节点上，这个特性工作中经常会用到，现在需要部署 Redis 或MySQL，把这些应用调度到有 SSD 磁盘的节点上。 

Redis 的 YAML 文件如下 

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis-server
        image: redis:5-alpine
      nodeSelector:
        disktype: ssd
```

在 YAML 中添加以下内容

```YAML
      nodeSelector:
        disktype: ssd
```

调度器在调度时会检查节点是否有如下的 Tag：  `disktype: ssd`  ，如果没有则调度失败，pod 会进入 Pending 状态 

```Bash
[root@node1 ~]# kubectl  get pods
NAME                           READY   STATUS    RESTARTS   AGE
redis-cache-5b666fdcb9-8jhmb   0/1     Pending   0          3s
```

查看 pod 事件日志

```Bash
[root@node1 ~]# kubectl describe  pods redis-cache-5b666fdcb9-8jhmb

Node-Selectors:              disktype=ssd
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason            Age    From               Message
  Warning  FailedScheduling  3m13s  default-scheduler  0/2 nodes are available: 2 node(s) didn't match Pod's node affinity/selector. preemption: 0/2 nodes are available: 2 Preemption is not helpful for scheduling.
```

给节点打标签

```Bash
kubectl label nodes node1 disktype=ssd
```

调度成功

```Bash
Events:
  Type     Reason            Age    From               Message
  Warning  FailedScheduling  5m40s  default-scheduler  0/2 nodes are available: 2 node(s) didn't match Pod's node affinity/selector. preemption: 0/2 nodes are available: 2 Preemption is not helpful for scheduling.
  Normal   Scheduled         110s   default-scheduler  Successfully assigned default/redis-cache-5b666fdcb9-8jhmb to node1
  Normal   Pulling           110s   kubelet            Pulling image "redis:3.2-alpine"
  Normal   Pulled            104s   kubelet            Successfully pulled image "redis:3.2-alpine" in 5.389457086s
  Normal   Created           104s   kubelet            Created container redis-server
  Normal   Started           104s   kubelet            Started container redis-server
```

### nodeAffinity

节点亲和性概念上类似于 `nodeSelector`， 可以根据节点上的标签来约束 Pod 可以调度到哪些节点上。 节点亲和性有两种：

- `requiredDuringSchedulingIgnoredDuringExecution`： 调度器只有在规则被满足的时候才能执行调度。此功能类似于 `nodeSelector`， 但其语法表达能力更强。
- `preferredDuringSchedulingIgnoredDuringExecution`： 调度器会尝试寻找满足对应规则的节点。如果找不到匹配的节点，调度器仍然会调度该 Pod。

支持的操作符：

| 操作符         | 行为                           |
| -------------- | ------------------------------ |
| `In`           | 标签值存在于提供的字符串集中   |
| `NotIn`        | 标签值不包含在提供的字符串集中 |
| `Exists`       | 对象上存在具有此键的标签       |
| `DoesNotExist` | 对象上不存在具有此键的标签     |

以下操作符只能与 `nodeAffinity` 一起使用。

| 操作符 | 行为                                                         |
| ------ | ------------------------------------------------------------ |
| `Gt`   | 提供的值将被解析为整数，并且该整数小于通过解析此选择算符命名的标签的值所得到的整数 |
| `Lt`   | 提供的值将被解析为整数，并且该整数大于通过解析此选择算符命名的标签的值所得到的整数 |

#### required affinity（硬亲和）

```Bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: disktype
                operator: In
                values:
                - ssd      
      containers:
      - name: redis-server
        image: redis:5-alpine
      nodeSelector:
        disktype: ssd
```

将pod 调度到具有 `disktype: ssd` 的节点上 

#### preferred affinity （软亲和）

```Bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 5
  template:
    metadata:
      labels:
        app: redis
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 1
            preference:
              matchExpressions:
              - key: disktype
                operator: In
                values:
                - ssd      
      containers:
      - name: redis-server
        image: redis:5-alpine
        resources:
          limits:
            memory: 1Gi
            cpu: 1
          requests:
            memory: 256Mi
            cpu: 100m
```

优选 具有 `disktype: ssd` 的节点，如果找不到，其它节点也可以运行。

node2 没有 `disktype: ssd` 这个标签，也可以调度， 是在 node1 跑满了之后，次选的 node2 

```Bash
[root@node1 ~]# kubectl  get pods -o wide 
NAME                           READY   STATUS    RESTARTS   AGE   IP             NODE    NOMINATED NODE   READINESS GATES
redis-cache-5c787dcc74-2mc5m   1/1     Running   0          58m   10.233.96.10   node2   <none>           <none>
redis-cache-5c787dcc74-q4cth   1/1     Running   0          60m   10.233.90.15   node1   <none>           <none>
redis-cache-5c787dcc74-tv7lw   1/1     Running   0          60m   10.233.90.14   node1   <none>           <none>
redis-cache-5c787dcc74-xhhkt   1/1     Running   0          58m   10.233.90.16   node1   <none>           <none>
redis-cache-5c787dcc74-xz6sg   1/1     Running   0          58m   10.233.90.17   node1   <none>           <none>
```

### podAffinity 

Pod 间亲和性与反亲和性可以基于已经在节点上运行的 **Pod** 的标签来约束 Pod 可以调度到的节点，而不是基于节点上的标签。

Pod 间亲和性与反亲和性的规则格式为“如果 X 上已经运行了一个或多个满足规则 Y 的 Pod， 则这个 Pod 应该（或者在反亲和性的情况下不应该）运行在 X 上”。 这里的 X 可以是节点、机架、云提供商可用区或地理区域或类似的拓扑域， Y 则是 Kubernetes 尝试满足的规则。

#### podAffinity（pod 亲和性）

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - redis
            topologyKey: "kubernetes.io/hostname"    
      containers:
        - name: nginx
          image: nginx
          resources:
            limits:
              memory: 1Gi
              cpu: 1
            requests:
              memory: 256Mi
              cpu: 100m
```

#### podAntiAffinity（pod反亲和性）

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - redis
            topologyKey: "kubernetes.io/hostname" 
        podAntiAffinity:   
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 10
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - nginx
              topologyKey: "kubernetes.io/hostname"    
      containers:
        - name: nginx
          image: nginx
          resources:
            limits:
              memory: 1Gi
              cpu: 1
            requests:
              memory: 256Mi
              cpu: 100m
```

#### topologyKey

```Bash
apiVersion: v1
kind: Pod
metadata:
  name: with-pod-affinity
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: security
            operator: In
            values:
            - S1
        topologyKey: topology.kubernetes.io/zone
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: security
              operator: In
              values:
              - S2
          topologyKey: topology.kubernetes.io/zone
  containers:
  - name: with-pod-affinity
    image: registry.k8s.io/pause:2.0
```

本示例定义了一条 Pod 亲和性规则和一条 Pod 反亲和性规则。Pod 亲和性规则配置为 `requiredDuringSchedulingIgnoredDuringExecution`，而 Pod 反亲和性配置为 `preferredDuringSchedulingIgnoredDuringExecution`。

亲和性规则规定，只有节点属于特定的区域 且该区域中的其他 Pod 已打上 security=S1 标签时，调度器才可以将示例 Pod 调度到此节点上。 例如，如果我们有一个具有指定区域（称之为 "Zone V"）的集群，此区域由带有 topology.kubernetes.io/zone=V 标签的节点组成，那么只要 Zone V 内已经至少有一个 Pod 打了 security=S1 标签， 调度器就可以将此 Pod 调度到 Zone V 内的任何节点。相反，如果 Zone V 中没有带有 security=S1 标签的 Pod， 则调度器不会将示例 Pod 调度给该区域中的任何节点。

反亲和性规则规定，如果节点属于特定的区域 且该区域中的其他 Pod 已打上 security=S2 标签，则调度器应尝试避免将 Pod 调度到此节点上。 例如，如果我们有一个具有指定区域（我们称之为 "Zone R"）的集群，此区域由带有 topology.kubernetes.io/zone=R 标签的节点组成，只要 Zone R 内已经至少有一个 Pod 打了 security=S2 标签， 调度器应避免将 Pod 分配给 Zone R 内的任何节点。相反，如果 Zone R 中没有带有 security=S2 标签的 Pod， 则反亲和性规则不会影响将 Pod 调度到 Zone R。

### taint and toleration

污点（taint）使节点可以排斥特定的Pod。

容忍度（toleration）是应用于Pod上的，允许调度器调度带有对应污点的Pod。

污点和容忍度（Toleration）相互配合，可以用来避免 Pod 被分配到不合适的节点上。 每个节点上都可以应用一个或多个污点，这表示对于那些不能容忍这些污点的 Pod， 是不会被该节点接受的。

为节点添加污点

```Bash
kubectl taint node worker-01 nodetype=gpu:NoSchedule
```

删除污点 

```Bash
kubectl taint node worker-01 nodetype-
```

#### 完全匹配

```Bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
      tolerations:
      - key: "nodetype"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
```

#### 匹配任意 taint value

operator 为 Exists

```Bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
      tolerations:
      - key: "nodetype"
        operator: "Exists"
        value: ""
        effect: "NoSchedule"
```

#### 匹配任意 taint effect

```Bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
      tolerations:
      - key: "nodetype"
        operator: "Equal"
        value: "gpu"
        effect: ""
```

默认master节点污点 

```Bash
kubectl get nodes 
# 查看节点污点 
kubectl describe  nodes master-01 | grep -i taint


kubectl taint node xxx-nodename node-role.kubernetes.io/master-  #将 Master 也当作 Node 使用
kubectl taint node xxx-nodename node-role.kubernetes.io/master="":NoSchedule #将 Master 恢复成 Master Only 状态
```

[Pod 拓扑分布约束](https://kubernetes.io/zh-cn/docs/concepts/scheduling-eviction/topology-spread-constraints/)
