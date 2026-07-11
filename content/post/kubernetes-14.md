---
title: "15 - CNI"
date: 2026-04-06T17:57:39+08:00
lastmod: 2026-04-06T17:57:39+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195223_525_12.jpg"
tags: ["Kubernetes", "K8s", "CNI", "容器网络", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes CNI（容器网络接口）的核心概念、工作原理与常见插件，适合 K8s 网络运维学习。"
slug: "k8s-cni-container-network-interface"
keywords: ["K8s CNI", "容器网络", "Kubernetes 网络", "云原生运维"]
---

## Kubernetes 网络基础

在 Kubernetes 的网络模型中，每台服务器上的容器有自己独立的 IP 段，各个服务器之间的容器可以根据目标容器的 IP 地址进行访问。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/01.png)

为了实现这一目标，重点解决以下两点：  

- 各台服务器上的容器 IP 段不能重叠，所以需要有某种 IP 段分配机制，为各台服务器分配独立的 IP 段；  
- 从某个 Pod 发出的流量到达其所在服务器时，服务器网络层应当具备根据目标 IP 地址，将流量转发到该 IP 所属 IP 段对应的目标服务器的能力 。  

总结起来，实现 Kubernetes 的容器网络重点需要关注两方面 ： IP 地址分配 和 路由 。  

### 主机内组网 

Kubemetes 经典的主机内组网模型是 veth pair+ bridge 的方式 。

当 Kubemetes 调度 Pod 在某个节点上运行时，它会在该节点的 Linux 内核中为 Pod 创建 network namespace ，供 Pod 内所有运行的容器使用 。 从容器的角度看， Pod 是具有一个网络接口的物理机器， Pod 中的所有容器都会看到此网络接口 。 因此，每个容器通过 localhost 就能访问同一个 Pod 内的其他容器 。  

Kubemetes 使用 veth pair 将容器与主机的网络协议栈连接起来 ，从而使数据包可以进出 Pod。 容器放在主机根 network namespace 中 veth pair 的一端连接到 Linux 网桥 ，可让同一节点上的各 Pod 之间相互通信 。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/02.png)

### 跨节点组网 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/03.png)

综上所述，我们可以对Kubernetes 网络做如下总结：

Kubernetes 网络基础原则：

1. 每个 Pod 都拥有一个独立的 IP 地址，而且假定所有 Pod 都在一个可以直接连通的、扁平的网络空间中，不管是否运行在同一 Node 上都可以通过 Pod 的 IP 来访问。
2. Kubernetes 中 Pod 的 IP 是最小粒度 IP。同一个 Pod 内所有的容器共享一个网络协议栈，该模型称为 IP-per-Pod 模型。
3. Pod 内部看到的 IP 地址和端口与外部保持一致。同一个 Pod 内的不同容器共享网络，可以通过 localhost 来访问对方的端口，类似同一个 VM 内的不同进程。
4. IP-per-Pod 模型从端口分配、域名解析、服务发现、负载均衡、应用配置等角度看，Pod 可以看作是一台独立的 VM 或物理机。

## CNI   

CNI 即容器网络接口（ Container Network Interface ） 。  

在 CNI 标准中，网络插件是独立的可执行文件，被上层的容器管理平台调用 。 网络插件只有两件事情要做：**把容器加入网络或把容器从网络中删除**。

Kubernetes 使用 CNI 网络插件的工作流程 ：  

- Kubelet 调用 CRI 创建 pause 容器，生成对应的 network namespace;  
- 调用网络 driver ;
- CNI driver 根据配置调用具体的 CNI 插件；  
- CNI 插件给 pause 容器配置正确的网络， Pod 中的其他容器都是用 pause 容器的网络栈 。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/04.png)

接下来我们看一下两款流行的 CNI 插件的工作方式，可以看到跨节点的容器之间是如何通信的。 

### [Flannel ](https://github.com/flannel-io/flannel)  

Flannel 可以为容器提供跨节点网络服务，其模型为集群内所有容器使用一个网络，然后在每个主机上从该网络中划分一个子网 。 flannel 为主机上的容器创建网络时，从子网中划分一个 IP 给容器 。 根据 Kubernetes 的模型，为每个 Pod 提供一个 IP,  flannel 的模型正好与之契合 。 而且 flannel 安装方便且简单易用 。  

#### Flannel 不同 backend 讲解 

flannel 通过在每一个节点上启动一个叫 flanneld 的进程，负责每一个节点上的子网划分，并将相关的配置信息（如各个节点的子网网段 、外部 IP 等）保存到 etcd 中，而具体的网络包转发交给具体的 backend 实现 。  

flanneld 可以在启动时通过配置文件指定不同的 backend 进行网络通信，目前比较成熟的 backend 有 `UDP` 、`VXLAN`` `和 `Host ``Gateway` 三种。

> UDP：早期版本的Flannel使用 UDP 封装完成报文的跨越主机转发，其安全性及性能略有不足。
>
> 
>
> VXLAN：Linux 内核在在 2012 年底的 v3.7.0之后加入了 VXLAN 协议支持，因此新版本的 Flannel也从 UDP 转换为 VXLAN，VXLAN 本质上是一种 tunnel（隧道）协议，用来基于三层网络实现虚拟的二层网络，目前flannel 的网络模型已经是基于 VXLAN 的叠加(覆盖)网络。 
>
> 
>
> Host-GW：也就是 Host GateWay，通过在 node 节点上创建到达各目标容器地址的路由表而完成报文的转发，因此这种方式要求各 node 节点本身必须处于同一个局域网(二层网络)中，因此不适用于网络变动频繁或比较大型的网络环境，但是其性能较好。  

目前， VXLAN 是官方推荐的一种 backend 实现方式； Host Gateway 一般用于对网络性能要求比较高的场景， 但需要基础网络架构的支持 ； UDP 则用于测试及一些比较老的不支持 VXLAN 的 Linux 内核 。  

##### Backend: UDP 

```Bash
卸载calico
1.  kubectl delete  -f calico.yaml   
2.  mv /etc/cni/net.d/10-calico.conflist /tmp  (所有的 节点 都执行 )
3.  reboot 
```

###### 修改 flannel 配置文件

```Bash
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "udp"
      }
    }

        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
          privileged: true
```

###### 部署 flannel 网络插件

```YAML
kubectl apply -f kube-flannel-udp.yml
```

###### 查看 flannel Pod 状态

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/05.png)

###### 验证当前运行模式

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/06.png)

###### 查看当前 node 主机 IP 地址范围

```YAML
[root@master-01 ~]# cat /run/flannel/subnet.env
FLANNEL_NETWORK=10.244.0.0/16
FLANNEL_SUBNET=10.244.0.1/24
FLANNEL_MTU=1472
FLANNEL_IPMASQ=true
```

###### flannel0 接口

flanneld 进程启动后，通过 ip addr 命令可以发现节点中多了一个 叫 flannel0 的网络接口 ：  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/07.png)

通过 `netstat -ulnp `命令可以看到此时 flanneld 进程监听在 UDP 8285 端口  

```YAML
[root@master-01 ~]# netstat -nlup | grep flannel
udp        0      0 172.16.66.30:8285       0.0.0.0:*                           23257/flanneld      
```

###### cni 接口

cni0 网桥信息(master 节点)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/08.png)

```Bash
[root@master-01 ~]# cat /var/lib/cni/flannel/fb00bc676469faad8628ed2f9b3d4a6ade69a8cee1dbf1e256e877b0d770dcd1 
{"cniVersion":"0.3.1","hairpinMode":true,"ipMasq":false,"ipam":{"ranges":[[{"subnet":"10.244.0.0/24"}]],"routes":[{"dst":"10.244.0.0/16"}],"type":"host-local"},"isDefaultGateway":true,"isGateway":true,"mtu":1472,"name":"cbr0","type":"bridge"}
```

cni0 网桥信息(worker 节点)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/09.png)

```Bash
[root@worker-01 ~]# cat /var/lib/cni/flannel/88cf2ddc597944e7714b3b0d5dde6f3d5b271ff44430a287e16214b826be9c6d 
{"cniVersion":"0.3.1","hairpinMode":true,"ipMasq":false,"ipam":{"ranges":[[{"subnet":"10.244.1.0/24"}]],"routes":[{"dst":"10.244.0.0/16"}],"type":"host-local"},"isDefaultGateway":true,"isGateway":true,"mtu":1472,"name":"cbr0","type":"bridge"}
```

###### 创建测试容器

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/10.png)

```Bash
[root@master-01 15-network]# kubectl  get pods -o wide 
NAME                            READY   STATUS    RESTARTS   AGE   IP           NODE        NOMINATED NODE   READINESS GATES
nginx-master-85cb9fbd9-tm887    1/1     Running   0          10s   10.244.0.6   master-01   <none>           <none>
nginx-worker-8454fcf9bf-cr74k   1/1     Running   0          5s    10.244.1.4   worker-01   <none>           <none>
nginx-worker-8454fcf9bf-lkfnh   1/1     Running   0          5s    10.244.1.5   worker-01   <none>           <none>
```

| Node Name | node-ip      | node-mac          | pod-id     | Pod Name | cni0       |
| --------- | ------------ | ----------------- | ---------- | -------- | ---------- |
| master-01 | 172.16.66.30 | 00:50:56:a4:99:71 | 10.244.0.6 | A        | 10.244.0.1 |
| worker-01 | 172.16.66.31 | 00:50:56:a4:08:39 | 10.244.1.4 | B        | 10.244.1.1 |
| worker-01 | 172.16.66.31 | 00:50:56:a4:08:39 | 10.244.1.5 | C        | 10.244.1.1 |

###### flannel UDP 模式本机通信实践  

  我们来看宿主机 host 上的路由信息，如下所示：

```Bash
[root@worker-01 ~]# route -n 
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.16.66.1     0.0.0.0         UG    100    0        0 ens192
10.244.0.0      0.0.0.0         255.255.0.0     U     0      0        0 flannel0
10.244.1.0      0.0.0.0         255.255.255.0   U     0      0        0 cni0
172.16.66.0     0.0.0.0         255.255.255.0   U     100    0        0 ens192
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
```

当容器 B 发送到 同一个 subnet 的容器 C 时，因为二者处于同一个子网，所以容器 B 和 C 位于同一个宿主机 host 上 ，而容器 B 和 C 也均桥接在 cni0 上 。

```Bash
[root@worker-01 ~]# brctl  show 
bridge name        bridge id                STP enabled        interfaces
cni0                8000.4205bfb04106        no                veth4aa9785b
                                                               veth67b0672e
```

借助网桥 cni0 ，即可实现同一个主机上容器 B 和 C 的直接通信 。

###### flannel UDP 模式跨主机通信实践

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/11.png)

1. 容器 A 发出 ICMP 请求报文，通过 IP 封装后的形式为 10.244.0.6 （源）→ 10.244.1.4 （ 目的 ）。 此时通过容器 A 内的路由表匹配到应该将 IP 包发送到网关 10.244.0.1 ( cni0 网桥）。
2. 到达 cni0 的 IP 包目的地 IP 10.244.1.4 ，匹配到节点 A 上第一条路由规则（ 10.244.0. 0 ） ， 内核通过查本机路由表知道应该将 IP 包发送给 flannel0 接口 。
3. 发送给 flannel0 接口的 IP 包将被 flanneld 进程接收， flanneld 进程接收 IP 包后在原有的基础上进行 UDP 封包， UDP 封包的形式为 172.16.66.30:8285 → 172.16.66.31:8285 。
4. flanneld 将封装好的 UDP 报文经 eth0 发出，从这里可以看出网络包在通过 eth0 发出前先是加上了 UDP 头（ 8 个字节），再加上 IP 头（ 20 个字节）进行封装，这也是 flannel0 的 MTU 要比 eth0 的 MTU 小 28 个字节的原因，即防止封包后的以太网帧超过 eth0 的 MTU, 而在经过 eth0 时被丢弃。
5. 网络包经过主机网络从节点 master-01 到达节点 worker-01。  
6. 主机  worker-01 收到 UDP 报文后， Linux 内核通过 UDP 端口号 8285 将包交给正在监听的 flanneld 。
7.  运行在 worker-01 中的 flanneld 将 UDP 包解封包后得到 IP 包：10.244.0.6 → 10.244.1.4。
8. 解封包后的 IP 包匹配到主机 worker-01 上的路由规则 （ 10.244.1.0 ），内核通过查本机路由表知道应该将 IP 包发送到 cni0 网桥 。
9. cni0 网桥将 IP 包转发给连接在该网桥上的容器 B ，至此整个流程结束 。 回程报文将按上面的数据流原路返回 。

在整个通信过程中， flanneld 在其中主要起到的作用是：

- UDP 封包解包；
- 节点上的路由表的动态更新 。

flannel 的 UDP 封装是指原始数据由起始节点的 flanne ld 进行 UDP 封装，经过主机网络投递到目的节点后就被另一端的 flanneld 还原成了原始的数据包，两边的 容器 都感觉不到这个过程的存在 。 flannel 根据 etcd 的数据刷新本节点路由表，通过路由表信息在寻址时找到应该投递的目标节点 。

容器 A 和容器 B 虽然在物理网络上并没有直接相连，但在逻辑上就好像是处于同一个三层网络中，这种基于底层物理网络设备通过 flannel 等软件定义网络技术构建的上层网络称之为 **overlay 网络** 。

###### 接口抓包分析 

master-01 cni0 接口抓包分析 

```Bash
tcpdump -nni cni0 -s0 -vv  -w flannel-udp-master-cni.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/12.png)

master-01 eth0 接口抓包分析 

```Bash
tcpdump -nni ens192 -s0 -vv  -w flannel-udp-master-eth0.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/13.png)

通过 UDP 这种 backend 实现的网络传输过程最明显的问题是网络数据包先通过 flannel0 设备从用户态复制到内核态，再由内核态复制到用户态的应用，仅一次网络传输就进行了两次用户态和内核态的切换，显然效率是不高的。

那么，有没有比 UDP 模式更高效的办法呢？能否把 封包／解包 这些事情都交给 Linux 内核去做，而不是让 flanneld 代劳呢？事实上， Linux 内核本身也提供了比较成熟的网络封包／解包（隧道传输）实现方案 VXLAN。

##### Backend:  VXLAN

###### 修改 flannel 配置文件

```YAML
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan"
      }
    }
```

###### 部署 flannel 网络插件

```YAML
kubectl apply -f kube-flannel-vxlan.yml 
```

###### 查看 flannel Pod 状态 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/14.png)

验证当前运行模式

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/15.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/16.png)

###### VXLAN 模式数据路径  

| Node Name | node-ip      | node-mac          | pod-id     | Pod Name | cni0       |
| --------- | ------------ | ----------------- | ---------- | -------- | ---------- |
| master-01 | 172.16.66.31 | 00:50:56:a4:04:46 | 10.244.0.6 | A        | 10.244.0.1 |
| worker-01 | 172.16.66.32 | 00:50:56:a4:b8:22 | 10.244.1.4 | B        | 10.244.1.1 |
| worker-01 | 172.16.66.32 | 00:50:56:a4:b8:22 | 10.244.1.5 | C        | 10.244.1.1 |

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/17.png)

1. 同 UDP Backend 模式，容器 A 中的 IP 包通过容器 A 内的路由表被发送到 cni0 。
2. 到达 cni0 中的 IP 包通过匹配 worker-01 中的路由表发现通往 10.244.1.4 的 IP 包应该交给 flannel.1 接口 。
3. flannel.1 收到报文后将按照配置进行封包 。 首先，通过 etcd 得知 10.244.1.4 属于节点 worker-01 ，并得到节点 worker-01 的 IP 。 然后，通过节点 master-01 中的转发表得到节点 worker-01 对应的 MAC 地址，根据 flannel.1 设备创建时的设置参数进行 VXLAN 封包 。
4. 通过 master-01 跟 worker-01 之间的网络连接， VXLAN 包到达 worker-01  的 eth0 接口 。
5. 通过端口 8472, VXLAN 包被转发给 flannel.1 进行解包。
6. 解封装后的 IP 包匹配 worker-01  中的路由 表（ 10.244.1.0 ），内核将 IP 包转发给 cni0 。
7. cni0 将 IP 包转发给连接在 cni0 上的容器 B 。

###### 接口抓包分析 

master-01 cni0 接口抓包分析 

```Bash
tcpdump -nni cni0 -s0 -vv  -w flannel-vxlan-master-cni.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/18.png)

master-01 eth0 接口抓包分析 

```Bash
tcpdump -nni ens192 -s0 -vv  -w flannel-vxlan-master-eth0.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/19.png)

##### Backend: host-gw 

Host Gateway 简称 host-gw ，从名字中就可以想到这种方式是通过把主机当作网关实现跨节点网络通信的 。 那么 ，具体如何实现跨节点通信呢？与 UDP 和 VXLAN 模式类似， 要使用 host-gw 模式，需要将 flannel 的Backend 中的 Type 参数设置成 “host-gw“。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/20.png)

1. 同 UDP 、 VXLAN 模式一致，通过容器 A 的路由 表 IP 包到达 cni0 。
2. 到达 cni0 的 IP 包匹配到 master-01 中的路由规则（ 10.244.1.0 ），并且网关为 172.16.66.33 ，即 worker-01 ，所以内核将 IP 包发送给 worker-01 (172.16.66.33)。
3. IP 包通过物理网络到达主机 worker-01 的 eth0 。
4. 到达主机 worker-01 eth0 的 IP 包匹配到 worker-01 中的路由 表（ 10.244.1.0 ) , IP 包被转发给cni0 。
5. cni0 将 IP 包转发给连接在 cni0 上的容器 B 。

host-gw 模式下，各个节点之间的跨节点网络通信要通过节点上的路由表实现，因此必须要通信双方所在的宿主机能够直接路由 。 这就要求 **flannel host-gw 模式下集群中所有的节点必须处于同一个二层网络内**， 这个限制使得 host-gw 模式无法适用于集群规模较大且需要对节点进行网段划分的场景 。 host-gw 的另外一个限制则是随着集群中节点规模的增大，flanneld 维护主机上成千上万条路由表的动态更新也是一个不小的压力 ，因此在路由方式下 ，路由表规则的数量是限制网络规模的一个重要因素。

### [Calico ](https://archive-os-3-24.netlify.app/calico/3.24/getting-started/kubernetes/quickstart)

Calico 在每一个计算节点利用 Linux 内核的一些能力实现了一个高效的 **vRouter** 负责数据转发，而每个 vRouter 通过 **BGP** 把 自己运行的工作负载的路由信息 向整个 Calico 网络传播 。 小规模部署可以直接互联，大规模下可以通过指定的 BGP Route Reflector 完成 。 最终保证所有的工作负载之间的数据流量都是通过 IP 路由的方式完成互联的 。 Calico 节点组网可以直接利用数据中心的网络结构（无论是 L2 还是 L3 ），不需要额外的 NAT 或隧道 。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/21.png)

#### 组件 

##### Felix

Felix 是一个守护程序，作为 agent 运行在托管容器或虚拟机的 Calico 节点上 。 **Felix 负责刷新主机路由和** **ACL** **规则**等，以便为该主机上的 Endpoint 正常运行提供所需的网络连接和管理。 进出容器 、 虚拟机和物理主机的所有流量都会遍历 Calico ，利用 Linux 内核原生的路由和 iptables 生成的规则 。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/22.png)

##### BGP Client    (BIRD )伯克利大学互联网路由守护进程

Calico 在每个运行 Felix 服务的节点上都部署一个 BGP Client ( BGP 客户端）。 BGP 客户端的作用是读取 Felix 编写到内核中的路由信息，由 BGP 客户端对这些路由信息进行分发 。 具体来说，当 Felix 将路由插入 Linux 内核 FIB 时， BGP 客户端将接收它们，并将它们分发到集群中的其他工作节点 。

##### Route Reflector

简单的 BGP 可能成为较大规模部署的性能瓶颈，因为它要求每个 BGP 客户端连接到网状拓扑中的每一个其他 BGP 客户端。 随着集群规模的增大，一些设备的路由表甚至会被撑满 。

因此，**在较大规模的部署中**， Calico 建议使用 BGP Route Reflector （路由器反射器）。互联网中通常使用 BGP Route Reflector 充当 BGP 客户端连接的中心点，从而避免与互联网中的每个 BGP 客户端进行通信。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/23.png)

#### Calico 的 IPIP 隧道模式  

Calico 可以创建并管理一个 3 层平面网络，为每个工作负载分配一个完全可路由的 IP 地址 。 工作负载可以在没有 IP 封装或 NAT 的情况下进行通信，以实现裸机性能，简化故障排除和提供更好的互操作性 。 我们称这种网络管理模式为 vRouter 模式 。 vRouter 模式直接使用物理机作为虚拟路由器，不再创建额外的隧道 。 然而在需要使**用 overlay 网络**的环境中， Calico 也提供了 IP-in-IP （简称 ipip ）的隧道技术 。

和其他 overlay 模式一样 ， ipip 是在各节点之间 “架起” 一个隧道，通过隧道两端节点上的容器网络连接，实现机制简单说就是用 IP 包头封装原始 IP 报文 。 启用 ipip 模式时 ，Calico 将在各个节点上创建一个名为 tunl0 的虚拟网络接口，如下图所示 。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/24.png)

##### 部署 calico 网络插件

```Bash
kubectl apply -f calico-ipip.yaml
```

##### 验证当前运行模式 

如果有  tunl0 接口表示当前 calico 运行在 IPIP 模式

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/25.png)

##### 抓包分析 

| Node Name | node-ip      | node-mac          | pod-id        | Pod Name | tunl0         |
| --------- | ------------ | ----------------- | ------------- | -------- | ------------- |
| master-01 | 172.16.66.35 | 00:0c:29:31:4e:dd | 10.244.184.67 | A        | 10.244.184.64 |
| worker-01 | 172.16.66.36 | 00:0c:29:3c:3d:b9 | 10.244.171.2  | B        | 10.244.171.0  |
| worker-01 | 172.16.66.36 | 00:0c:29:3c:3d:b9 | 10.244.171.3  | C        | 10.244.171.0  |

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/26.png)

```Bash
 tcpdump  -nni tunl0 -s0 -vv  -w calico-ipip-master-tunl0.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/27.png)

```Bash
tcpdump -nni ens192 -s0 -vv  -w calico-ipip-master-eth0.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/28.png)

#### Calico BGP 

##### 部署 calico 网络插件

```Bash
kubectl apply -f calico-bgp.yaml
```

##### 验证当前运行模式

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/29.png)

##### 抓包分析 

```Bash
tcpdump -nni ens192 -s0 -vv  -w calico-bgp-master-eth0.pcap
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/30.png)

## 附录

### **覆盖网络  [ overlay network ]**

运行在一个网上的网（应用层网络），并不依靠ip地址来传递消息，而是采用一种映射机制，把ip地址和identifiers做映射来资源定位。

底层的物理网络设备组成的网络我们称为 **Underlay 网络**，而用于虚拟机和云中的这些技术组成的网络称为 **Overlay 网络**，**这是一种基于物理网络的虚拟化网络实现**。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/31.jpg)

### 修改 Wireshark 识别 VXLAN 协议 

编辑 - 首选项 - 协议 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/32.png)

### 修改 wireshark 识别 8285 端口UDP包

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/33.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/34.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/35.png)

### Flannel 启动时报错   每台服务器都执行  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-14/36.png)

解决方法一： 一次性 重启就失效 

```Bash
# 手工加载内核模块 
modprobe   br_netfilter
```

解决方法二：开机自动加载  ，重启  

```Bash
echo "br_netfilter" > /etc/modules-load.d/br_netfilter.conf  
```

### Kubernetes 集群 IP 地址分配 

Kubernetes 使用各种 IP 范围为节点、 Pod 和服务分配 IP 地址 。

- 系统管理员为每个节点分配一个 IP 地址 。 该节点 IP 用于提供从数据面组件（如 Kube-proxy 和 Kubelet ）到 控制面 Kubernetes Master 的连接；    
- 系统会为每个 Pod 分配一个地址块内的 IP 地址 。 用户可以在创建集群时通过参数 `podSubnet` 指定此范围； (podSubnet: 10.244.0.0/16) 
- 系统会为每个服务（Service）分配一个 IP 地址（称为 ClusterIP ）。 用户可以在创建集群时通过参数 `serviceSubnet `指定此范围； (serviceSubnet: 10.96.0.0/12)

**Pod 出站流量** 

Kubemetes 处理 Pod 的出站流量的方式主要分为以下三种：  

**Pod  到 Pod** 

在 Kubemetes 集群中，每个 Pod 都有自己的 IP 地址，运行在 Pod 内的应用都可以使用标准的端口号，不用重新映射到不同的随机端口号 。 所有的 Pod 之间都可以保持**三层网络的连通性**，比如可以相互 ping 对方，相互发送 TCP/UDP/SCTP 数据包 。 CNI 就是用来实现这些网络功能的标准接口 。  

**Pod  到 Service**   

Pod 的生命周期很短暂，但客户需要的是可靠的服务，因此 Kubemetes 引 人了新的资源对象 Service ，其实它就是 Pod 前面的 4 层负载均衡器。 Service 总共有 4 种类型，其中最常用的类型是 ClusterIP ，这种类型的 Service 会自动分配一个仅集群内部可以访问的 **虚拟IP** 。  

Kubemetes 通过 Kube-proxy 组件实现这些功能，每台计算节点上都运行一个 Kube-proxy 进程，通过复杂的 iptables/IPVS 规则在 Pod 和 Service 之间进行各种过滤和 NAT 。  

**Pod  到 集群外** 

从 Pod 内部到集群外部的流量 ， Kubemetes 会通过 SNAT 来处理。 SNAT 做的工作就是将数据包的源从 Pod 内部的 IP:Port 替换为宿主机的 IP:Port 。 当数据包返回时，再将目的地址从宿主机的 IP:Port 替换为 Pod 内部的 IP:Port ，然后发送给 Pod ，当然，中间的整个过程对 Pod 来说是完全透明的，它们对地址转换不会有任何感知 。

### Kubernetes 网络架构 

谈到 Kubemetes 的网络模型，就不能不提它著名的 “单 Pod 单 IP”模型 ， 即每个 Pod 都有一个独立的IP， Pod 内所有容器共享 network namespace （同一个网络协议栈和 IP ）。

“单 Pod 单 IP” 网络模型为我们勾勒了一个 Kubemetes 扁平网络的蓝图，在这个网络世界里：容器是一等公民 ， 容器之间直接通信，不需要额外的 NAT，因此不存在源地址被伪装的情况； Node 与容器网络直连， 同样不需要额外的 NAT 。 扁平化网络的优点在于：没有 NAT 带来的性能损耗，而且可追溯源地址，降低网络排错的难度 。  

总体而言，集群内访问 Pod ， 会经过 Service ； 集群外访问 Pod ， 经过的是 Ingress 。   

Kubernetes 对网络的要求：

1. 所有容器都可以不用 NAT 的方式同别的容器通信。
2. 所有节点都可以在不用 NAT 的方式下同所有容器通信，反之亦然。
3. 容器的地址和别人看到的地址是同一个地址。
