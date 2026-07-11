---
title: "12 - 存储：解决数据持久化问题"
date: 2026-04-06T17:47:38+08:00
lastmod: 2026-04-06T17:47:38+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195233_530_12.jpg"
tags: ["Kubernetes", "K8s", "存储", "PV", "PVC", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 存储核心概念 PV/PVC，解决容器数据持久化问题，适合 K8s 运维入门学习。"
slug: "k8s-storage-persistent-volume"
keywords: ["K8s 存储", "PV/PVC", "数据持久化", "Kubernetes 运维"]
---

## 什么是 PersistentVolume  

因为 Pod 里的容器是由镜像产生的，而镜像文件本身是只读的，进程要读写磁盘只能用一个临时的存储空间，一旦 Pod 销毁，临时存储也就会立即回收释放，数据也就丢失了。

为了保证即使 Pod 销毁后重建数据依然存在，我们就需要找出一个解决方案，让 Pod产生的数据可以持久化存储。

我们在 ConfiMap 的章节用过 Kubernetes 的 Volume ，它只是定义了有这么一个“存储卷”，而这个“存储卷”是什么类型、有多大容量、怎么存储，我们都可以自由发挥。Pod 不需要关心那些专业、复杂的细节，只要设置好 volumeMounts，就可以把 Volume 加载进容器里使用。

Kubernetes 就顺着 Volume 的概念，延伸出了 PersistentVolume 对象，它专门用来表示持久存储设备，但隐藏了存储的底层实现，我们只需要知道它能安全可靠地保管数据就可以了。

作为存储的抽象，**PV** **实际上就是一些存储设备、文件系统**，比如 Ceph、GlusterFS、MFS、NFS，或是本地磁盘，管理它们已经超出了 Kubernetes 的能力范围，所以，一般会由系统管理员单独维护，然后再在 Kubernetes 里创建对应的 PV。

PV 属于集群的系统资源，是和 Node 平级的一种对象，Pod 对它没有管理权，只有使用权。

## 什么是 PersistentVolumeClaim/StorageClass  

有了 PV，我们是不是可以直接在 Pod 里挂载使用了呢？

还不行。因为不同存储设备的差异实在是太大了：有的速度快，有的速度慢；有的可以共享读写，有的只能独占读写；有的容量小，只有几百 MB，有的容量大到 TB、PB 级别……

这么多种存储设备，只用一个 PV 对象来管理还是有点太勉强了，不符合“单一职责”的原则，让 Pod 直接去选择 PV 也很不灵活。于是 Kubernetes 就又增加了两个新对象，PersistentVolumeClaim 和 StorageClass

PersistentVolumeClaim，简称 PVC，从名字上看比较好理解，就是用来向 Kubernetes 申请存储资源的。PVC 是给 Pod 使用的对象，它相当于是 Pod 的代理，代表 Pod 向系统申请 PV。一旦资源申请成功，Kubernetes 就会把 PV 和 PVC 关联在一起，这个动作叫做“绑定”（bound）。

系统里的存储资源非常多，如果要 PVC 去直接遍历查找合适的 PV 也很麻烦，所以就要用到 StorageClass。

StorageClass 的作用有点像 IngressClass，它抽象了特定类型的存储系统（比如 Ceph、NFS），在 PVC 和 PV 之间充当“协调人”的角色，帮助 PVC 找到合适的 PV。也就是说它可以简化 Pod 挂载“虚拟盘”的过程，让 Pod 看不到 PV 的实现细节。

![img](/image/kubernetes/kubernetes-11/01.png)

## 使用 YAML 描述 PersistentVolume  

Kubernetes 里有很多种类型的 PV，我们先看看最容易的本机存储“HostPath”，它和 Docker 里挂载本地目录的 -v 参数非常类似，可以用它来初步认识一下 PV 的用法。

因为 Pod 会在集群的任意节点上运行，所以首先，我们要在 Worker 节点上创建一个目录，它将会作为本地存储卷挂载到 Pod 里。

在 /tmp 里创建  host-10m-pv 的目录，表示一个只有 10MB 容量的存储设备。

PV 对象只能用 kubectl api-resources、kubectl explain 查看 PV 的字段说明，手动编写 PV 的 YAML 描述文件。

```YAML
apiVersion: v1
kind: PersistentVolume
metadata:
  name: host-10m-pv
spec:
  storageClassName: host-test
  accessModes:
  - ReadWriteOnce
  capacity:  # 容量 
    storage: 10Mi
  hostPath:
    path: /tmp/host-10m-pv/
```

PV 对象的文件头部分很简单，还是 API 对象的老样子。

“storageClassName”就是刚才说过的，对存储类型的抽象 StorageClass。这个 PV 是我们手动管理的，名字可以任意起，这里我写的是 host-test，你也可以把它改成 manual、hand-work 之类的词汇。

“accessModes”定义了存储设备的访问模式，简单来说就是虚拟盘的读写权限，和 Linux 的文件访问模式差不多，目前 Kubernetes 里有 3 种：

- [ReadWriteOnce](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)：存储卷可读可写，但只能被一个节点上的多个 Pod 挂载读写。  
- ReadOnlyMany：存储卷只读不可写，可以被任意节点上的多个 Pod 多次以只读方式挂载。
- ReadWriteMany：存储卷可读可写，也可以被任意节点上的多次 Pod 挂载读写。

第三个字段“capacity”就很好理解了，表示存储设备的容量，这里我设置为 10MB。

最后一个字段“hostPath”最简单，它指定了存储卷的本地路径，也就是我们在节点上创建的目录。

## 使用 YAML 描述 PersistentVolumeClaim  

有了 PV，就表示集群里有了这么一个持久化存储可以供 Pod 使用，我们需要再定义 PVC 对象，向 Kubernetes 申请存储。

下面这份 YAML 就是一个 PVC，要求使用一个 10MB 的存储设备，访问模式是 ReadWriteOnce：

```YAML
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: host-10m-pvc
spec:
  storageClassName: host-test
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Mi
```

PVC 的内容与 PV 很像，但它不表示实际的存储，而是一个“申请”或者“声明”，spec 里的字段描述的是对存储的“期望状态”。

所以 PVC 里的 storageClassName、accessModes 和 PV 是一样的，但不会有字段 capacity，而是要用 resources.request 表示希望要有多大的容量。

这样，Kubernetes 就会根据 PVC 里的描述，去找能够匹配 StorageClass 和容量的 PV，然后把 PV 和 PVC“绑定”在一起。

## 在 Kubernetes 里使用 PersistentVolume  

现在我们已经准备好了 PV 和 PVC，就可以让 Pod 实现持久化存储了。

```Bash
kubectl apply -f host-10m-pv.yaml
 kubectl  get pv 
```

![img](/image/kubernetes/kubernetes-11/02.png)

接下来创建 PVC 

```Bash
kubectl  apply -f host-10m-pvc.yaml 
kubectl  get pvc
```

![img](/image/kubernetes/kubernetes-11/03.png)

一旦 PVC 对象创建成功，Kubernetes 就会立即通过 StorageClass、resources 等条件在集群里查找符合要求的 PV，如果找到合适的存储对象就会把它俩“绑定”在一起。

如果没有找到满足条件的PV，PVC的状态会显示为 Pending 状态 

![img](/image/kubernetes/kubernetes-11/04.png)

## 为 Pod 挂载 PersistentVolume  

PV 和 PVC 绑定好了，有了持久化存储，现在我们就可以为 Pod 挂载存储卷。

使用方法和我们在ConfigMap章节学到的差不多，先要在 spec.volumes 定义存储卷，然后在 containers.volumeMounts 挂载进容器。

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx-dep
  name: nginx-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-dep
  template:
    metadata:
      labels:
        app: nginx-dep
    spec:
      volumes:
      - name: host-pvc-vol
        persistentVolumeClaim:
          claimName: host-10m-pvc
      containers:
      - image: nginx:1.22.1
        name: nginx
        volumeMounts:
        - name: host-pvc-vol
          mountPath: /tmp
kubectl  apply -f nginx-dep.yaml 
kubectl  get pods -o wide
```

![img](/image/kubernetes/kubernetes-11/05.png)

测试文件写入

## 使用网络存储  

要想让存储卷真正能被 Pod 任意挂载，我们需要变更存储的方式，不能限定在本地磁盘，而是要改成网络存储，这样 Pod 无论在哪里运行，只要知道 IP 地址或者域名，就可以通过网络通信访问存储设备。

### 安装 NFS 服务器  

```Bash
dnf install -y nfs-utils   # 所有的节点上 都要 安装   

mkdir /data/nfs

echo "/data/nfs 192.168.11.0/24(rw,sync,no_subtree_check,no_root_squash,insecure)" >> /etc/exports

systemctl enable --now nfs-server
```

![img](/image/kubernetes/kubernetes-11/06.png)

### 安装NFS 客户端 

```Bash
yum -y install nfs-utils 
showmount  -e 172.16.66.53
```

![img](/image/kubernetes/kubernetes-11/07.png)

客户端测试目录挂载 

### 如何使用 NFS 存储卷  

现在我们已经为 Kubernetes 配置好了 NFS 存储系统，就可以使用它来创建新的 PV 存储对象了。

先来手工分配一个存储卷，需要指定 storageClassName 是 nfs，而 accessModes 可以设置成 ReadWriteMany，这是由 NFS 的特性决定的，它支持多个节点同时访问一个共享目录。

因为这个存储卷是 NFS 系统，所以我们还需要在 YAML 里添加 nfs 字段，指定 NFS 服务器的 IP 地址和共享目录名。

这里我在 NFS 服务器的 /tmp/nfs 目录里又创建了一个新的目录 5g-pv，表示分配了 5GB 的可用存储空间，相应的，PV 里的 capacity 也要设置成同样的数值，也就是 5Gi。

把这些字段都整理好后，我们就得到了一个使用 NFS 网络存储的 YAML 描述文件：

```YAML
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-5g-pv
spec:
  storageClassName: nfs
  accessModes:
    - ReadWriteMany
  capacity:
    storage: 5Gi
  nfs:
    path: /data/nfs/5g-pv
    server: 172.19.16.14 
kubectl  apply -f nfs-static-pv.yml
kubectl get pv
```

![img](/image/kubernetes/kubernetes-11/08.png)

有了 PV，我们就可以定义申请存储的 PVC 对象了，它的内容和 PV 差不多，但不涉及 NFS 存储的细节，只需要用 resources.request 来表示希望要有多大的容量，这里我写成 5GB，和 PV 的容量相同：

```YAML
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-static-pvc
spec:
  storageClassName: nfs
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
kubectl apply -f nfs-static-pvc.yaml
kubectl  get pvc 
```

![img](/image/kubernetes/kubernetes-11/09.png)

把 PVC 挂载到 Pod

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx-dep
  name: nginx-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-dep
  template:
    metadata:
      labels:
        app: nginx-dep
    spec:
      volumes:
      - name: nfs-pvc-vol 
        persistentVolumeClaim:
          claimName: nfs-static-pvc 
      containers:
      - image: nginx:1.22.1
        name: nginx
        volumeMounts:
        - name: nfs-pvc-vol 
          mountPath: /tmp
```

 测试数据挂载 

### 如何部署 NFS Provisioner  

PV 还是需要人工管理，必须要由系统管理员手动维护各种存储设备，再根据开发需求逐个创建 PV，而且 PV 的大小也很难精确控制，容易出现空间不足或者空间浪费的情况。

在我们的这个实验环境里，只有很少的 PV 需求，管理员可以很快分配 PV 存储卷，但是在一个大集群里，每天可能会有几百几千个应用需要 PV 存储，如果仍然用人力来管理分配存储，管理员很可能会忙得焦头烂额，导致分配存储的工作大量积压。

2

那么能不能让创建 PV 的工作也实现自动化呢？或者说，让计算机来代替人类来分配存储卷呢？

这个在 Kubernetes 里就是“动态存储卷”的概念，它可以用 StorageClass 绑定一个 Provisioner 对象，而这个 Provisioner 就是一个能够自动管理存储、创建 PV 的应用，代替了原来系统管理员的手工劳动。

有了“动态存储卷”的概念，前面我们讲的手工创建的 PV 就可以称为“静态存储卷”。

目前，Kubernetes 里每类存储设备都有相应的 Provisioner 对象，对于 NFS 来说，它的 Provisioner 就是“NFS subdir external provisioner”，你可以在 GitHub 上找到这个[项目](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner)。

```YAML
kubectl apply -f rbac.yaml 
kubectl apply -f deployment.yaml 
```

### 如何使用 NFS 动态存储卷  

我们来看一下 NFS 默认的 StorageClass 定义：

```YAML
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client

provisioner: k8s-sigs.io/nfs-subdir-external-provisioner 
parameters:
  archiveOnDelete: "false"
```

YAML 里的关键字段是 provisioner，它指定了应该使用哪个 Provisioner。另一个字段 parameters 是调节 Provisioner 运行的参数，需要参考文档来确定具体值，在这里的 archiveOnDelete: "false" 就是自动回收存储空间。

***Parameters:***

| Name            | Description                                                  | Default                                                      |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| onDelete        | If it exists and has a delete value, delete the directory, if it exists and has a retain value, save the directory. | will be archived with name on the share: archived-<volume.Name> |
| archiveOnDelete | If it exists and has a false value, delete the directory. if onDelete exists, archiveOnDelete will be ignored. | will be archived with name on the share: archived-<volume.Name> |
| pathPattern     | Specifies a template for creating a directory path via PVC metadata's such as labels, annotations, name or namespace. To specify metadata use ${.PVC.<metadata>}. Example: If folder should be named like <pvc-namespace>-<pvc-name>, use ${.PVC.namespace}-${.PVC.name} as pathPattern. | n/a                                                          |

| 字段            | 描述（Description）                                          | 默认值（Default）                      |
| --------------- | ------------------------------------------------------------ | -------------------------------------- |
| onDelete        | 如果该参数存在且值为 delete，则删除目录； 如果值为 retain，则保留目录。 | 会以 archived-<volume.Name> 的名称归档 |
| archiveOnDelete | 如果该参数存在且值为 false，则删除目录。 如果 onDelete 参数已存在，则 archiveOnDelete 会被忽略。 | 会以 archived-<volume.Name> 的名称归档 |
| pathPattern     | 用于通过 PVC 的元数据（labels、annotations、name、namespace 等）自定义目录路径模板。 示例：如果想让目录命名为 <命名空间>-<pvc名称>，则使用 ${.PVC.namespace}-${.PVC.name} 作为 pathPattern。 | n/a（不适用）                          |

理解了 StorageClass 的 YAML 之后，你也可以不使用默认的 StorageClass，而是根据自己的需求，任意定制具有不同存储特性的 StorageClass，比如添加字段 onDelete: "retain" 暂时保留分配的存储，之后再手动删除：

```YAML
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client-retained

provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  onDelete: "retain"
```

接下来我们定义一个 PVC，向系统申请 10MB 的存储空间，使用的 StorageClass 是默认的 nfs-client：

```YAML
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-dynamic-pvc
spec:
  storageClassName: nfs-client-retained 
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Mi
```

![img](/image/kubernetes/kubernetes-11/10.png)
