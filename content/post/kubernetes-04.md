---
title: "04-Pod：Kubernetes 里最核心的概念"
date: 2026-04-06T16:56:11+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195209_518_12.jpg"
lastmod: 2026-04-06T16:56:11+08:00
tags: ["Kubernetes", "K8s", "Pod", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 核心概念 Pod，包括 Pod 的设计理念、作用、与容器的关系，适合 K8s 入门学习。"
slug: "k8s-pod-core-concept"
keywords: ["Kubernetes Pod", "K8s 核心概念", "Pod 入门"]
---

## 介绍 Pod 

### 为什么要有 Pod  

Pod 这个词原意是“豌豆荚”，后来又延伸出“舱室”“太空舱”等含义，你可以看一下这张图片，形象地来说 Pod 就是包含了很多组件、成员的一种结构。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/01.png)

为了解决多应用联合运行的问题，同时还要不破坏容器的隔离，就需要在容器外面再建立一个**“**收纳舱**”**，让多个容器既保持相对独立，又能够小范围共享网络、存储等资源，而且永远是“绑在一起”的状态。

### Pod 是 Kubernetes 的核心对象  

因为 Pod 是对容器的“打包”，里面的容器是一个整体，总是能够一起调度、一起运行，绝不会出现分离的情况，而且 Pod 属于 Kubernetes，可以在不触碰下层容器的情况下任意定制修改。所以有了 Pod 这个抽象概念，Kubernetes 在集群级别上管理应用就会“得心应手”了。 

Kubernetes 让 Pod 去编排处理容器，然后把 Pod 作为应用调度部署的最小单位，Pod 也因此成为了 Kubernetes 世界里的“原子”，基于Pod 就可以构建出更多更复杂的业务形态了。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/02.png)

## 如何使用 YAML 描述 Pod  

用命令 `kubectl explain` 来查看资源对象的详细说明，所以接下来我们一起看看写 YAML 时 Pod 里的一些常用字段。

因为 Pod 也是 API 对象，所以它也必然具有 apiVersion、kind、metadata、spec 这四个基本组成部分。

“apiVersion”和“kind”这两个字段很简单，对于 Pod 来说分别是固定的值 v1 和 Pod，而一般来说，“metadata”里应该有 name 和 labels 这两个字段。

下面这段 YAML 代码就描述了一个简单的 Pod，名字是“busy-pod”，再附加上一些标签：

```YAML
apiVersion: v1
kind: Pod
metadata:
  name: busy-pod
  labels:
    owner: xxhf
    env: dev
    region: beijing
    tier: back
```

“metadata”一般写上 name 和 labels 就足够了，而“spec”字段由于需要管理、维护 Pod 这个Kubernetes 的基本调度单元，里面有非常多的关键信息。

“containers”是一个数组，里面的每一个元素又是一个 container 对象，也就是容器。

和 Pod 一样，container 对象也必须要有一个 name 表示名字，然后当然还要有一个 image 字段来说明它使用的镜像，这两个字段是必须要有的，否则 Kubernetes 会报告数据验证错误。

container 对象的其他字段基本上都可以和我们学过的 Docker、容器技术对应，理解起来难度不大，我们看几个较常用的：

- ports：列出容器对外暴露的端口，和 Docker 的 -p 参数有点像。
- imagePullPolicy：指定镜像的拉取策略，可以是 Always/Never/IfNotPresent，一般默认是 IfNotPresent，也就是说只有本地不存在才会远程拉取镜像，可以减少网络消耗。
- env：定义 Pod 的环境变量，和 Dockerfile 里的 ENV 指令类似。
- command：定义容器启动时要执行的命令，相当于 Dockerfile 里的 ENTRYPOINT 指令。
- args：它是 command 运行时的参数，相当于 Dockerfile 里的 CMD 指令，这两个命令和Docker 的含义不同，要特别注意。

现在我们来编写“busy-pod”的 spec 部分，添加 env、command、args 等字段：

```YAML
spec:
  containers:
  - image: busybox:latest
    name: busy
    imagePullPolicy: IfNotPresent
    env:
      - name: name
        value: "xinxianghf"
      - name: address
        value: "beijing"
    command:
      - /bin/echo
    args:
      - "NAME=$(name), ADDRESS=$(address)"
```

这里我们为 Pod 指定使用镜像 busybox:latest，拉取策略是 IfNotPresent ，然后定义了 name 和 address 两个环境变量，启动命令是 /bin/echo，参数里输出刚才定义的环境变量。

把这份 YAML 文件和 Docker 命令对比一下，你就可以看出，YAML 在 spec.containers 字段里用“声明式”把容器的运行状态描述得非常清晰准确，要比 docker run 那长长的命令行要整洁的多，对人、对机器都非常友好。

完整的 YAML 描述：

```YAML
apiVersion: v1
kind: Pod

metadata:
  name: busy-pod
  labels:
    owner: xxhf
    env: dev
    region: beijing
    tier: back
    
spec:
  containers:
  - image: busybox:latest
    name: busy
    imagePullPolicy: IfNotPresent
    env:
      - name: name
        value: "xinxianghf"
      - name: address
        value: "beijing"
    command:
      - /bin/echo
    args:
      - "NAME=$(name), ADDRESS=$(address)"
```

## 如何使用 kubectl 操作 Pod  

有了描述 Pod 的 YAML 文件，现在我们看一下用来操作 Pod 的 kubectl 命令。

`kubectl apply`、`kubectl delete `这两个命令可以使用` -f `参数指定 YAML 文件创建或者删除 Pod， 例如

```Bash
kubectl apply -f busy-pod.yml
kubectl delete -f busy-pod.yml 
```

不过，因为我们在 YAML 里定义了“name”字段，所以也可以在删除的时候直接指定名字来删除：

```Bash
kubectl delete pod busy-pod
```

和 Docker 不一样，Kubernetes 的 Pod 不会在前台运行，只能在后台（相当于默认使用了参数 -d)，所以输出信息不能直接看到。 我们可以用命令 kubectl logs，它会把 Pod 的标准输出流信息展示给我们，在这里就会显示出预设的两个环境变量的值：

```Bash
[root@master-01 04-pod]# kubectl  logs busy-pod 
NAME=xinxianghf, ADDRESS=beijing
```

使用命令 kubectl get pod 可以查看 Pod 列表和运行状态：  

```Bash
[root@master1 3.2]# kubectl  get pod
NAME       READY   STATUS             RESTARTS        AGE
busy-pod   0/1     CrashLoopBackOff   6 (2m34s ago)   8m4s
```

你会发现这个 Pod 运行有点不正常，状态是“CrashLoopBackOff”，那么我们可以使用命令 `kubectl describe `来检查它的详细状态，它在调试排错时很有用：

```Bash
kubectl describe  pod busy-pod 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/03.png)

通常需要关注的是末尾的“Events”部分，它显示的是 Pod 运行过程中的一些关键节点事件。对于这个 busy-pod，因为它只执行了一条 echo 命令就退出了，而 Kubernetes 默认会重启Pod，所以就会进入一个反复停止 - 启动的循环错误状态。

因为 Kubernetes 里运行的应用大部分都是不会主动退出的服务，所以我们可以把这个 busypod 删掉，启动一个 Nginx 服务，这才是大多数 Pod 的工作方式。

```YAML
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    owner: xxhf
    env: dev
spec:
  containers:
  - image: nginx:1.22.1 
    name: nginx 
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 80
kubectl apply -f nginx-pod.yml 
```

启动之后，我们再用 kubectl get pod 来查看状态，就会发现它已经是“Running”状态了：  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/04.png)

命令 `kubectl logs` 也能够输出 Nginx 的运行日志：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/05.png)

另外，kubectl 也提供与 docker 类似的 cp 和 exec 命令，kubectl cp 可以把本地文件拷贝进 Pod，kubectl exec 是进入 Pod 内部执行 Shell 命令，用法也差不多。

比如我有一个“a.txt”文件，那么就可以使用 kubectl cp 拷贝进 Pod 的“/tmp”目录里：

```YAML
echo "demo" >> a.txt
kubectl cp a.txt nginx-pod:/tmp
```

不过 kubectl exec 的命令格式与 Docker 有一点小差异，需要在 Pod 后面加上 --，把kubectl 的命令与 Shell 命令分隔开，使用时需要注意一下：

```YAML
kubectl exec -it nginx-pod -- sh
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/06.png)

## 使用标签组织 Pod

例如，对于微服务架构，部署的微服务数量可以轻松超过20个甚至更多。这些组件可能是副本（部署同一组件的多个副本）和多个不同的发布版本（stable、beta、canary等）同时运行。这样一来可能会导致我们在系统中拥有数百个pod，如果没有可以有效组织这些组件的机制，将会导致产生巨大的混乱。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/07.png)

我们需要一种能够基于任意标准将pod组织成更小群体的方式，这样一来处理系统的每个开发人员和系统管理员都可以轻松地看到哪个pod是什么。此外，我们希望通过一次操作对属于某个组的所有pod进行操作，而不必单独为每个pod执行操作。

通过标签来组织pod和所有其他Kubernetes对象。

###  介绍标签

标签是一种简单却功能强大的Kubernetes特性，不仅可以组织pod，也可以组织所有其他的Kubernetes资源。详细来讲，标签是可以附加到资源的任意键值对，用以选择具有该确切标签的资源（这是通过标签选择器完成的）。只要标签的key在资源内是唯一的，一个资源便可以拥有多个标签。通常在我们创建资源时就会将标签附加到资源上，但之后我们也可以再添加其他标签，或者修改现有标签的值，而无须重新创建资源。

通过给pod添加标签，可以得到一个更组织化的系统，以便我们理解。此时每个pod都标有两个标签：

- app，它指定pod属于哪个应用、组件或微服务。
- env，它显示在pod中运行的环境是 dev、production 还是 qa 。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/08.png)

### 创建 pod 时指定标签

kubectl get pods命令默认不会列出任何标签，但我们可以使用--showlabels选项来查看：

```Bash
kubectl get pod --show-labels
```

如果你只对某些标签感兴趣，可以使用 -L 选项指定它们并将它们分别显示在自己的列中，而不是列出所有标签。接下来我们再次列出所有pod，并将附加到pod 的标签列展示如下：

```Bash
[root@master-01 04-pod]# kubectl  get pods -L env
NAME        READY   STATUS             RESTARTS      AGE     ENV
busy-pod    0/1     CrashLoopBackOff   6 (48s ago)   6m34s   dev
nginx       1/1     Running            0             2m18s   dev
nginx-pod   1/1     Running            0             82s     dev
ngx-pro     1/1     Running            0             45s     fat
```

### 修改现有pod的标签

标签也可以在现有pod上进行添加和修改。

```Bash
[root@master-01 04-pod]# kubectl  get pods  nginx-pod --show-labels
NAME        READY   STATUS    RESTARTS   AGE     LABELS
nginx-pod   1/1     Running   0          3m26s   env=dev,owner=xxhf

[root@master-01 04-pod]# kubectl  label  pod nginx-pod tier=front
pod/nginx-pod labeled

[root@master-01 04-pod]# kubectl  get pods  nginx-pod --show-labels
NAME        READY   STATUS    RESTARTS   AGE     LABELS
nginx-pod   1/1     Running   0          4m52s   env=dev,owner=xxhf,tier=front
```

修改标签 

注意 在更改现有标签时，需要使用 `--overwrite` 选项。

```Bash
[root@master-01 04-pod]# kubectl label pod nginx-pod  env=production --overwrite
pod/nginx-pod labeled
```

再次列出pod以查看更新后的标签：

```Bash
[root@master-01 04-pod]# kubectl  get pods  nginx-pod --show-labels
NAME        READY   STATUS    RESTARTS   AGE     LABELS
nginx-pod   1/1     Running   0          6m27s   env=production,owner=xxhf,tier=front
```

### 标签选择运算符

目前支持两种类型的选择算符：**基于等值的**和**基于集合的**。

#### **基于等值**

**基于等值**或**基于不等值**的需求允许按标签键和值进行过滤。 匹配对象必须满足所有指定的标签约束，尽管它们也可能具有其他标签。 可接受的运算符有 `=`、`==` 和 `!=` 三种。 前两个表示**相等**（并且是同义词），而后者表示**不相等**。例如：

```Plaintext
environment = production
tier != frontend
```

#### **基于集合**

**基于集合**的标签需求允许你通过一组值来过滤键。 支持三种操作符：`in`、`notin` 和 `exists`（只可以用在键标识符上）。例如：

```Plaintext
environment in (production, qa)
tier notin (frontend, backend)
    partition
!partition
```

### 按标签选择Pod 

```JSON
kubectl  get pods -l tier=front

kubectl get pods -l 'environment in (production, qa)'

kubectl get pods -l 'environment,environment notin (frontend)'
```

## 使用命名空间组织 Pod   ( namespace )

Kubernetes 的命名空间并不是一个实体对象，只是一个**逻辑上的概念**。它可以把集群切分成一个个彼此独立的区域，然后我们把对象放到这些区域里，就实现了类似容器技术里 namespace 的隔离效果，应用只能在自己的命名空间里分配资源和运行，不会干扰到其他命名空间里的应用。  

在一个 K8s 集群中，命名空间可以划分为两种类型：系统级命名空间和用户自定义命名空

间。 

系统级的命名空间是 K8s 集群默认创建的命名空间，主要用来隔离系统级的对象和业务对

象，系统级的命名空间下面四种。

1. default：默认命名空间，也就是在不指定命名空间时的默认命名空间。 
2. kube-system：K8s 系统级组件的命名空间，所有 K8s 的关键组件（例如 kube-proxy、

coredns、metric-server 等）都在这个命名空间下。 

1. kube-public：开放的命名空间，所有的用户都可以读取，这个命名空间是一个约定，但不是必须。 
2. kube-node-lease：和集群扩展相关的命名空间。

在这几个命名空间中，除了 default 命名空间，你都不应该将业务应用部署在其他系统默认创建的命名空间下，也不要尝试去删除它们，这可能会导致集群异常。 

在一个 K8s 集群中，你可以使用 kubectl get ns 命令来查看 K8s 的命名空间： 

```Bash
[root@node-01 ~]# kubectl  get ns 
NAME              STATUS   AGE
default           Active   41d
kube-node-lease   Active   41d
kube-public       Active   41d
kube-system       Active   41d
middleware        Active   5d21h
```

创建命名空间

```Bash
kubectl create namespace  dev-ns
```

获取命名空间详细信息

```Bash
[root@node-01 ~]# kubectl describe  ns dev-ns 
Name:         dev-ns
Labels:       kubernetes.io/metadata.name=dev-ns
Annotations:  <none>
Status:       Active

No resource quota.

No LimitRange resource.
```

将 Pod 运行在指定的命名空间中

```Bash
[root@master-01 04-pod]# kubectl  -n dev-ns  apply -f nginx-pod.yaml 
pod/nginx-pod created
[root@master-01 04-pod]# 
[root@master-01 04-pod]# 
[root@master-01 04-pod]# kubectl  -n dev-ns  get pods 
NAME        READY   STATUS    RESTARTS   AGE
nginx-pod   1/1     Running   0          6s
```

## Pod 停止和移除 

按名称删除

```Bash
kubectl delete pod nginx-pod
```

使用标签选择器删除

```Bash
kubectl  get pods  --show-labels
kubectl delete pods  -l env=dev 
```

删除命名空间所有 Pod

```Bash
kubectl delete namespace  dev-ns
```

## 特殊类型的容器

### Pause 容器

在Kubernetes中，pause 容器作为你的 pod 中所有容器的“父容器”。pause 容器有两个核心职责。首先，它是 pod 中Linux 名称空间共享的基础。其次，启用了PID(进程ID)命名空间共享后，它为每个pod充当 PID 1，并接收僵尸进程。

当检查你的 Kubernetes 集群的节点时，在节点上执行容器查看命令，你可能会注意到一些被称为“暂停”（pause）的容器，例如：

```Bash
[root@master-01 ~]# nerdctl -n k8s.io ps  | grep pause
37ed7c409708    registry.aliyuncs.com/google_containers/pause:3.8                          "/pause"                  20 minutes ago    Up                 k8s://kube-system/coredns-668d6bf9bc-jj82q
5933b8af499d    registry.aliyuncs.com/google_containers/pause:3.8                          "/pause"                  20 minutes ago    Up                 k8s://kube-system/coredns-668d6bf9bc-7dx9p
24abd7734ae0    registry.aliyuncs.com/google_containers/pause:3.8                          "/pause"                  20 minutes ago    Up                 k8s://kube-system/calico-kube-controllers-77969b7d87-skzk4
```

你会疑惑这些容器并不是你创建的。是的，这些容器是 Kubernetes”免费赠送“的。

Kubernetes 中的 pause 容器有时候也称为 `infra` 容器，它与用户容器”捆绑“运行在同一个 Pod 中，最大的作用是维护 Pod 网络协议栈。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/09.png)

启动一个Pod  可以看到同时启动两个 docker 容器

```JSON
[root@worker-01 ~]# nerdctl -n k8s.io ps
CONTAINER ID    IMAGE                                                COMMAND                   CREATED           STATUS    PORTS    NAMES
d0a76bd3fd93    docker.io/library/nginx:1.22.1                       "/docker-entrypoint.…"    5 seconds ago     Up                 k8s://default/nginx-pod/nginx
d0e49f1fa6a6    registry.aliyuncs.com/google_containers/pause:3.8    "/pause"                  14 seconds ago    Up                 k8s://default/nginx-pod
```

使用 nsenter -t 22376 -n ip a 可以看到两个容器是共享同一个 network 命名空间

使用` ls -l  /proc/22471/ns` 命令查看每个容器的 Namespace，可以看到 Pod 内是共享 net 和 ipc namespace 的。

```JSON
lrwxrwxrwx 1 root root 0 Nov  2 10:21 ipc -> ipc:[4026532262]
lrwxrwxrwx 1 root root 0 Nov  2 10:21 mnt -> mnt:[4026532332]
lrwxrwxrwx 1 root root 0 Nov  2 10:21 net -> net:[4026532265]
lrwxrwxrwx 1 root root 0 Nov  2 10:21 pid -> pid:[4026532334]
lrwxrwxrwx 1 root root 0 Nov  2 10:35 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Nov  2 10:21 uts -> uts:[4026532333]


lrwxrwxrwx 1 65535 65535 0 Nov  2 10:21 ipc -> ipc:[4026532262]
lrwxrwxrwx 1 65535 65535 0 Nov  2 10:35 mnt -> mnt:[4026532260]
lrwxrwxrwx 1 65535 65535 0 Nov  2 10:21 net -> net:[4026532265]
lrwxrwxrwx 1 65535 65535 0 Nov  2 10:35 pid -> pid:[4026532263]
lrwxrwxrwx 1 65535 65535 0 Nov  2 10:35 user -> user:[4026531837]
lrwxrwxrwx 1 65535 65535 0 Nov  2 10:35 uts -> uts:[4026532261]
```

演示 pause 容器用途

```Bash
# 1. 启动 pause 容器
nerdctl run -d --name pause \
    -p 8880:80 \
    --ipc=shareable \
    registry.aliyuncs.com/google_containers/pause:3.8

# 2. 启动 nginx 共享 pause 的网络和 IPC
nerdctl run -d --name nginx-pause \
  --net=container:pause \
  --ipc=container:pause \
  --pid=container:pause \
  registry.cn-beijing.aliyuncs.com/xxhf/nginx:1.22.1

# 3. 启动 centos 共享 pause 的网络和 IPC
nerdctl run -it --name rocky-pause \
  --net=container:pause \
  --ipc=container:pause \
  --pid=container:pause \
  registry.cn-beijing.aliyuncs.com/xxhf/rockylinux:9 sh
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/10.png)

### Init Containers 

#### 什么是 init Containers

[Pod](https://kubernetes.io/docs/concepts/abstractions/pod/) 能够具有多个容器，应用运行在容器里面，但是它也可能有一个或多个先于应用容器启动的 Init 容器。

Init 容器与普通的容器非常像，除了如下两点：

- Init 容器总是运行到成功完成为止。
- 每个 Init 容器都必须在下一个 Init 容器启动之前成功完成。

如果 Pod 的 Init 容器失败，Kubernetes 会不断地重启该 Pod，直到 Init 容器成功为止。然而，如果 Pod 对应的 `restartPolicy` 为 Never，它不会重新启动。

### **Init 容器能做什么？**

因为 Init 容器具有与应用程序容器分离的单独镜像，所以它们的启动相关代码具有如下优势：

- 等待其他模块 Ready：这个可以用来解决服务之间的依赖问题，比如我们有一个 Web 服务，该服务又依赖于另外一个数据库服务，但是在我们启动这个 Web 服务的时候我们并不能保证依赖的这个数据库服务就已经启动起来了，所以可能会出现一段时间内 Web 服务连接数据库异常。要解决这个问题的话我们就可以在 Web 服务的 Pod 中使用一个`InitContainer`，在这个初始化容器中去检查数据库是否已经准备好了，准备好了过后初始化容器就结束退出，然后我们的主容器 Web 服务被启动起来，这个时候去连接数据库就不会有问题了。
- 做初始化配置：比如集群里检测所有已经存在的成员节点，为主容器准备好集群的配置信息，这样主容器起来后就能用这个配置信息加入集群。
- 其它场景：如将`Pod`注册到一个中央数据库、配置中心等。

```YAML
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app.kubernetes.io/name: MyApp
spec:
  containers:
  - name: myapp-container
    image: busybox:latest
    command: ['sh', '-c', 'echo The app is running! && sleep 3600']
  initContainers:
  - name: init-myservice
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup myservice.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for myservice; sleep 2; done"]
  - name: init-mydb
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup mydb.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for mydb; sleep 2; done"]
```

在 Pod 启动过程中，Init 容器会按顺序在网络和数据卷初始化之后启动。每个容器必须在下一个容器启动之前成功退出。如果由于运行时或失败退出，将导致容器启动失败，它会根据 Pod 的 `restartPolicy` 指定的策略进行重试。然而，如果 Pod 的 `restartPolicy` 设置为 Always，Init 容器失败时会使用 `RestartPolicy` 策略。

在所有的 Init 容器没有成功之前，Pod 将不会变成 `Ready` 状态。正在初始化中的 Pod 处于 `Pending` 状态，但应该会将 `Initializing` 状态设置为 true。

如果 Pod 重启，所有 Init 容器必须重新执行。

对 Init 容器 spec 的修改被限制在容器 image 字段，修改其他字段都不会生效。更改 Init 容器的 image 字段，等价于重启该 Pod。

因为 Init 容器可能会被 重启、重试或者重新执行，所以 Init 容器的代码应该是 **幂等** 的。

## Pod 生命周期 

### Pod 阶段

Pod 的 `status` 字段是一个 PodStatus 对象，其中包含一个 `phase` 字段。

Pod 的阶段（Phase）是 Pod 在其生命周期中所处位置的简单概述。 

下面是 `phase` 可能的值：

Pod 遵循预定义的生命周期，起始于 `Pending` 阶段， 如果至少其中有一个主要容器正常启动，则进入 `Running`，之后取决于 Pod 中是否有容器以失败状态结束而进入 `Succeeded` 或者 `Failed` 阶段。

在 Pod 运行期间，`kubelet` 能够重启容器以处理一些失效场景。 在 Pod 内部，Kubernetes 跟踪不同容器的状态并确定使 Pod 重新变得健康所需要采取的动作。

Pod 在其生命周期中只会被调度一次。 一旦 Pod 被调度（分派）到某个节点，Pod 会一直在该节点运行，直到Pod 停止或者被终止。

下面是 `phase` 的可能取值：

- 挂起（Pending）：Pod 信息已经提交给了集群，但是还没有被调度器调度到合适的节点或者 Pod 里的镜像正在下载
- 运行中（Running）：该 Pod 已经绑定到了一个节点上，Pod 中所有的容器都已被创建。至少有一个容器正在运行，或者正处于启动或重启状态
- 成功（Succeeded）：Pod 中的所有容器都被成功终止，并且不会再重启
- 失败（Failed）：Pod 中的所有容器都已终止了，并且至少有一个容器是因为失败终止。也就是说，容器以非`0`状态退出或者被系统终止
- 未知（Unknown）：因为某些原因无法取得 Pod 的状态，通常是因为与 Pod 所在主机通信失败导致的

### 容器状态

一旦调度器将 Pod 分派给某个节点，`kubelet` 就通过容器运行时开始为 Pod 创建容器。容器的状态有三种：`Waiting`（等待）、`Running`（运行中）和 `Terminated`（已终止）。

- Waiting （等待）

如果容器并不处在 Running 或 Terminated 状态之一，它就处在 Waiting 状态。 处于 Waiting 状态的容器仍在运行它完成启动所需要的操作：例如， 从某个容器镜像仓库拉取容器镜像，或者向容器应用 Secret 数据等等。 当你使用 kubectl 来查询包含 Waiting 状态的容器的 Pod 时，你也会看到一个 Reason 字段，其中给出了容器处于等待状态的原因。

- Running（运行中）

Running 状态表明容器正在执行状态并且没有问题发生。 如果配置了 postStart 回调，那么该回调已经执行且已完成。 如果你使用 kubectl 来查询包含 Running 状态的容器的 Pod 时， 你也会看到关于容器进入 Running 状态的信息。

- Terminated（已终止）

处于 Terminated 状态的容器已经开始执行并且或者正常结束或者因为某些原因失败。 如果你使用 kubectl 来查询包含 Terminated 状态的容器的 Pod 时， 你会看到容器进入此状态的原因、退出代码以及容器执行期间的起止时间。

如果容器配置了 preStop 回调，则该回调会在容器进入 Terminated 状态之前执行。

### 容器重启策略

Pod 的 `spec` 中包含一个 `restartPolicy` 字段，其可能取值包括 Always、OnFailure 和 Never。默认值是 Always。

`restartPolicy` 适用于 Pod 中的所有容器。`restartPolicy` 仅针对同一节点上 `kubelet` 的容器重启动作。当 Pod 中的容器退出时，`kubelet` 会按指数回退方式计算重启的延迟（10s、20s、40s、...），其最长延迟为 5 分钟。 

### **容器生命周期****回调****(Hook)**     **钩子函数**    

有两个回调暴露给容器：

- `PostStart`

这个回调在容器被创建之后立即被执行。 但是，不能保证回调会在容器入口点（ENTRYPOINT）之前执行。 

- `PreStop`   # 优雅退出 

在容器被终止之前，此回调会被调用。在容器终止之前调用，常用于在容器结束前优雅的释放资源。

```YAML
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
  - name: lifecycle-demo-container
    image: nginx:1.22.1
    lifecycle:
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo Hello from the postStart handler >     /usr/share/message"]
      preStop:
        exec:
          command: ["/usr/sbin/nginx","-s","quit"]
```

postStart 指的是，在容器启动后，立刻执行一个指定的操作。需要明确的是，postStart 定义的操作，虽然是在 Docker 容器 ENTRYPOINT 执行之后，但它并不严格保证顺序。也就是说，在 postStart 启动时，ENTRYPOINT 有可能还没有结束。当然，如果 postStart 执行超时或者错误，Kubernetes 会在该 Pod 的 Events 中报出该容器启动失败的错误信息，导致 Pod 也处于失败的状态。

preStop 发生的时机，则是容器被杀死之前（比如，收到了 SIGKILL 信号）。而需要明确的是，preStop 操作的执行，是同步的。所以，它会阻塞当前的容器杀死流程，直到这个 Hook 定义操作完成之后，才允许容器被杀死，这跟 postStart 不一样。

所以，在这个例子中，我们在容器成功启动之后，在 /usr/share/message 里写入了一句“欢迎信息”（即 postStart 定义的操作）。而在这个容器被删除之前，我们则先调用了 nginx 的退出指令（即 preStop 定义的操作），从而实现了容器的“优雅退出”。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/11.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/12.png)

## 附录

### Kubectl 命令补全

```Bash
dnf -y install bash-completion 
echo "source <(kubectl completion bash)" >> ~/.bashrc        
source  ~/.bashrc  
bash 
```

### `restartPolicy`

Pod通过`restartPolicy`字段指定重启策略，重启策略类型为：Always、OnFailure 和 Never，默认为 Always。

`restartPolicy` 仅指通过同一节点上的 kubelet 重新启动容器。

| 重启策略  | 说明                                                   |
| --------- | ------------------------------------------------------ |
| Always    | 当容器失效时，由kubelet自动重启该容器， 默认           |
| OnFailure | 当容器终止运行且退出码不为0时，由kubelet自动重启该容器 |
| Never     | 不论容器运行状态如何，kubelet都不会重启该容器          |

### Nerdctl  run 参数 

```Go
--net=container:<container_name>：容器与另一个指定容器共享网络命名空间。这意味着两个容器共享相同的网络栈，可以直接通信。使用此模式时，两个容器可以看到彼此的网络接口和端口。


--ipc=container:<container_name>：容器与另一个指定容器共享IPC命名空间。这使得两个容器可以直接进行IPC通信，共享相同的IPC资源。例如，可以使用这个选项在容器之间共享内存段。


--pid=container:<container_name>：容器与另一个指定容器共享PID命名空间。这使得两个容器可以共享相同的进程命名空间，进程在两个容器之间是可见的。例如，可以使用此选项在一个容器中监视和管理另一个容器的进程。
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/13.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-04/14.png)

```Bash
  kubectl set env daemonset/calico-node -n kube-system IP_AUTODETECTION_METHOD=interface=ens192
```