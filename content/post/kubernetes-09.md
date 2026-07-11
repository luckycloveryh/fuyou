---
title: "10 - Service、Ingress - 找到你并不容易"
date: 2026-04-06T17:19:50+08:00
lastmod: 2026-04-06T17:19:50+08:00
image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80"
tags: ["Kubernetes", "K8s", "Service", "Ingress", "网络", "云原生"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 中 Service 的发现机制、Ingress 的路由规则，以及如何通过副本（Replica）保证服务高可用。"
slug: "k8s-service-ingress-replica"
keywords: ["K8s Service", "K8s Ingress", "K8s 高可用", "K8s 网络"]
---

## Service 

### 什么是 Service  

在 Kubernetes 集群里 Pod 的生命周期是比较“短暂”的，虽然 Deployment 和 DaemonSet 可以维持 Pod 总体数量的稳定，但在运行过程中，难免会有 Pod 销毁又重建，这就会导致 Pod集合处于动态的变化之中。  Pod 的 IP 地址经常变来变去，客户端该怎么访问呢？如果不处理好这个问题，Deployment 和 DaemonSet 把 Pod 管理得再完善也是没有价值的。

其实，这个问题在业内早就有解决方案来针对这样“不稳定”的后端服务，那就是“负载均衡”，典型的应用有 LVS、Nginx 等等。它们在前端与后端之间加入了一个“中间层”，屏蔽后端的变化，为前端提供一个稳定的服务。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/01.png)

### 使用 YAML 描述 Service  

用命令 kubectl api-resources 查看它的基本信息，可以知道它的简称是svc，apiVersion 是 v1。注意，这说明它与 Pod 一样，属于 Kubernetes 的核心对象。

我们就可以写出 Service 的 YAML 文件头了

```Bash
apiVersion: v1
kind: Service
metadata:
  name: xxx-svc  
```

使用 kubectl expose 指令来创建service模板文件，需要用参数 --port 和 --target-port 分别指定映射端口和容器端口，而 Service 自己的 IP 地址和后端 Pod 的 IP 地址可以自动生成，用法上和Docker 的命令行参数 -p 很类似。  

```Bash
kubectl expose deploy nginx-dep --port=80 --target-port=80 --dry-run=client -o yaml  
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx-dep
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

Service 的定义非常简单，在“spec”里只有两个关键字段，selector 和 ports。  

selector 是用来过滤出要代理的那些 Pod，因为我们指定要代理 Deployment，所以 Kubernetes 就为我们自动填上了 nginx-dep 的标签，会选择这个 Deployment 对象部署的所有 Pod。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/02.png)

### 在 Kubernetes 里使用 Service  

为了方便查看 Service 的效果，我们添加一个Nginx的配置文件，使用ConfigMap来定义，通过Volume 挂载到 Pod中。

```YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf

data:
  default.conf: |
    server {
      listen 80;
      location / {
        default_type text/plain;
        return 200
          'srv : $server_addr:$server_port\nhost: $hostname\nuri : $request_method $host $request_uri\ndate: $time_iso8601\n';
      }
    }
```

在 Deployment 中通过 “template.volumes”定义存储卷，使用“volumeMounts” 挂载到容器中。

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx-dep
  name: nginx-dep
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
      volumes:
      - name: nginx-conf-vol
        configMap:
          name: nginx-conf
      containers:
      - image: nginx:1.22.1
        name: nginx
        ports:
        - containerPort: 80
        volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: nginx-conf-vol
```

部署 Deployment 之后，就可以 kubectl apply 创建  Service 对象了

```YAML
kubectl apply -f nginx-svc.yaml
```

使用命令 kubectl get svc 查看对象状态 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/03.png)

Kubernetes 会自动为 Service 对象分配一个IP地址“10.111.193.124”，这个地址段是独立于Pod地址段的（在kubeadm 安装的配置文件里指定的）。Service 对象的 IP 地址还有一个特点，它是一个“虚地址”，不存在实体，只能用来转发流量。

通过 kubectl describe  命令可以看到 Service 代理了哪些后端的 Pod：

```YAML
kubectl describe  svc nginx-svc
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/04.png)

通过截图可以看到 Service管理了两个 endpoint 对象，10.244.171.7:80 和 10.244.184.72:80，那这两个地址是不是实际 Pod 的地址呢？

我们可以通过以下命令来验证

```Bash
kubectl  get pods -o wide
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/05.png)

通过上面的截图我们就能够验证 Service 确实用一个静态 IP 地址代理了两个 Pod 的动态 IP 地址。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/06.png)

 

### 测试 Service 的负载均衡效果

我们使用 curl 命令在 master 节点或是 worker 节点上执行以下命令来访问 Service：

```Bash
curl 10.111.193.124
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/07.png)

用 curl 访问 Service 的 IP 地址，就会看到它把数据转发给后端的 Pod，输出信息会显示具体是哪个 Pod 响应了请求，就表明 Service 确实完成了对 Pod 的负载均衡任务。  

我们再删除一个 Pod，看看 Service 是否会更新后端 Pod 的信息，实现自动化的服务发现：  

```Bash
kubectl delete pod nginx-dep-b4bfd684c-pncv8
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/08.png)

Pod 被删除后，Deployment 对象会自动创建一个新的 Pod，Service 会实时监控 Pod 的变化，所以它也会立即更新后端代理的 Pod 地址。这样后端的 Pod 数量就可以按业务需要自由伸缩，对用户是无感的。

### 以域名的方式使用 Service  

Service 对象的 IP 地址是静态的，保持稳定，不过数字形式的 IP 地址用起来还是不太方便，如果要能有域名就更好了，DNS 在 Kubernetes 里能不能实现呢？

Kubernetes 有一个插件来实现 DNS 的功能，在早期这个插件普遍使用 kube-dns，现在用 coredns 比较多。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/09.png)

因为 DNS 是一种层次结构，为了避免太多的域名导致冲突，Kubernetes 就把名字空间作为域名的一部分，减少了重名的可能性。  

Service 对象的域名完全形式是 “**对象名. 命名空间.svc.cluster.local**”，但很多时候也可以省略后面的部分，直接写“对象名. 命名空间”甚至“对象名”也可以 。

DNS 是在 **Kubernetes 集群内部生效**，所以要测试需要在 Pod 内验证。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/10.png)

可以看到，现在我们就不再关心 Service 对象的 IP 地址，只需要知道它的名字，就可以用DNS 的方式去访问后端服务。  

### 如何让 Service 对外暴露服务  

Service 是一种负载均衡技术，它不仅能够管理 Kubernetes 集群内部的服务，还能够向集群外部暴露服务。

Service 对象有一个关键字段“type”，表示 Service 是哪种类型的负载均衡。前面我们创建 Service 都使用的默认值“ClusterIP”，这种类型的 Service 地址只能在集群内访问。  

我们可以通过命令查看这个字段的属性

```Bash
kubectl explain  service.spec.type
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/11.png)

我们可以看到 默认值是 “ClusterIP”，另外还有三种类型分别是“ExternalName” 、“NodePort” 和 “LoadBalancer”。  其中 “LoadBalancer” 是由云服务商提供的，需要借助云服务商用才能实现完整的效果。 

我们分别测一下这几种类型的 Service。 

#### NodePort

我们修改一下 Service 的 YAML 文件，加上 “type” 字段：

```YAML
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx-dep
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

更新对象，查看状态：

```Bash
kubectl apply -f nginx-svc.yaml
kubectl  get svc
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/12.png)

可以看到 nginx-svc 的 “TYPE” 变成了 “NodePort”，而在 “PORT” 列里的端口信息也不一样，除了集群内部使用的“80”端口，还多出了一个“32119”端口，这就是 Kubernetes 在节点上为 Service 创建的专用映射端口。  

因为这个端口号属于节点，外部能够直接访问，所以现在我们就不需要登录集群节点或者进入 Pod 内部，直接在集群外使用任意一个节点的 IP 地址，就能够访问 Service 和它代理的后端服务了。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/13.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/14.png)

#### ExternalName 

ExternalName Service 是 Kubernetes 中一个特殊的 service 类型，它不需要指定 selector 去选择哪些 Pod 实例提供服务，而是使用 DNS CNAME 机制把自己 CNAME 到你指定的另外一个域名上，你可以提供集群内的名字，比如mysql.db.svc 这样的建立在db命名空间内的 MySQL 服务，也可以指定 http://www.baidu.com 这样的外部真实域名。

我们需要使用 ping 和nslookup 命令，所以部署一个 busybox 的 deployment，busybox 镜像中提供很多常用的命令可以使用。

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: busy-dep
  name: busy-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: busy-dep
  template:
    metadata:
      labels:
        app: busy-dep
    spec:
      containers:
      - image: busybox 
        name: busybox 
        command: ["/bin/sh","-c","sleep 3600"]
```

创建一个 External  Service 

```YAML
apiVersion: v1
kind: Service
metadata:
  name: external-svc 
spec:
  type: ExternalName
  externalName: www.baidu.com
```

登录到 Pod 中验证 External  Service 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/15.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/16.png)

可以看到 external-svc 会被解析到一个 CNAME 指向 www.baidu.com 

#### LoadBalancer  

我们修改 service 的类型为 LoadBalancer 看一下效果

```YAML
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx-dep
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

更新SVC

```YAML
kubectl apply -f nginx-svc-lb.yaml
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/17.png)

PORT 列没有变化，但是 EXTERNAL-IP 列会显示 pending，因为 LoadBalancer 类型的负载均衡需要云服务商提供，我们的环境会显示为 pending状态，但是 LoadBalancer  也是用了 NodePort 的实现方式，因为 PORT 列还保留了 NodePort 的端口。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/18.png)

#### 不同 Service 类型的对比 

1. ClusterIP：只能在集群内部使用。clusterIP   域名 
2. NodePort：可以作为集群流量入口，但也有一些缺点
   1. 端口数量有限。默认只在“30000~32767”这个范围内随机分配，只有 2000 多个，而且都不是标准端口号。
   2. 需要在每个节点上都开端口，然后使用 kube-proxy 路由到真正的后端 Service，这对于大规模集群来说如果Pod 频繁变更，Service 收敛速度就会变慢。
   3. 需要向外界暴露节点的 IP 地址，这在很多时候是不可行的，为了安全还需要在集群外再搭一个反向代理，增加了方案的复杂度。

虽然有这些缺点，但 NodePort 仍然是 Kubernetes 对外提供服务的一种简单易行的方式，在没有更好的方案出现之后，我们暂且使用这种方式。

1. ExternalName： 只是一个CNAME，应用场景有限。
2. LoadBalancer：依赖云厂商实现。 生产环境 

#### Service 的三个 port

```YAML
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx-dep
  type: NodePort
  ports:
  - port: 80        # ClusterIP 
    targetPort: 80  # 容器的端口
    nodePort: 30080 # 
    protocol: TCP
```

Service 的几个 port 的概念很容易混淆，它们分别是 port 、 targetPort 和 NodePort 。

- port 表示 Service 暴露的服务端口，也是客户端访问用的端口，例如 Cluster IP:port 是提供给集群内部客户访问 Service 的入口 。 需要注意的是， port 不仅是 Cluster IP 上暴露的端口，还可以是 external IP 和 Load Balancer IP 。 Service 的 port 并不监听在节点 IP 上，即无法通过节点 IP:port 的方式访问 Service 。
- NodePort 是 Kubemetes 提供给集群外部访问 Service 的入口的一种方式（另 一种方式是 Load Balancer ），所以可以通过 Node IP:nodePort 的方式提供集群外访问 Service 的入口 。 需要注意的是，我们这里说的集群外指的是 Pod 网段外，例如 Kubemetes 节点或因特网 。
- targetPort 很好理解，它是应用程序实际监听 Pod 内流量的端口，从 port 和 NodePort 上到来的数据，最终经过 Kube-proxy 流入后端 Pod 的 targetPort 进入容器。

## Service 实现原理 

在 Kubernetes 集群中，每个 Node 运行一个 `kube-proxy` 进程。`kube-proxy` 负责为 `Service` 实现了一种 VIP（虚拟 IP）。

### Service 底层技术 

- userspace  早期的版本中使用 
- iptables  默认
- IPVS      SVC 比较多的场景 ，建议使用 IPVS 模式 

### iptables

这种模式，kube-proxy 会监听 apiserver 对 Service 对象和 Endpoints 对象的添加和移除。对每个 Service，它会添加上 iptables 规则，从而捕获到达该 Service 的 clusterIP（虚拟 IP）和端口的请求，进而将请求重定向到 Service 的一组 backend 中的某一个 Pod 上面。我们还可以使用 Pod readiness 探针 验证后端 Pod 是否可以正常工作，以便 iptables 模式下的 kube-proxy 仅看到正常运行的后端，这样做意味着可以避免将流量通过 kube-proxy 发送到已知失败的 Pod 中，所以对于线上的应用来说一定要做 readiness 探针。

iptables 模式的 kube-proxy 默认的策略是，随机选择一个后端 Pod。

比如当创建 backend Service 时，Kubernetes 会给它指派一个虚拟 IP 地址，比如 10.0.0.10。假设 Service 的端口是 1234，该 Service 会被集群中所有的 kube-proxy 实例观察到。当 kube-proxy 看到一个新的 Service，它会安装一系列的 iptables 规则，从 VIP 重定向到 `Service` 规则。 该 `Service` 规则连接到 `Endpoint` 规则，该 `Endpoint` 规则会重定向（目标 `NAT`）到后端的 Pod。

查看 Kube-proxy 当前运行模式

```YAML
[root@master-01 manifests]# curl 127.0.0.1:10249/proxyMode
iptables
```

iptables 规则分析 

```Bash
[root@master-01 case1]# kubectl  get pod  -l app=tea -o wide 
NAME                   READY   STATUS    RESTARTS   AGE    IP              NODE        NOMINATED NODE   READINESS GATES
tea-7f5fcf84f8-55dgc   1/1     Running   0          132m   10.244.171.58   worker-01   <none>           <none>
tea-7f5fcf84f8-l7zxx   1/1     Running   0          132m   10.244.171.57   worker-01   <none>           <none>
tea-7f5fcf84f8-nhjq2   1/1     Running   0          132m   10.244.37.239   worker-02   <none>           <none>

[root@master-01 case1]# kubectl  get svc  tea-svc
NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
tea-svc   ClusterIP   10.107.48.138   <none>        80/TCP    108m



-A KUBE-SERVICES -d 10.107.48.138/32 -p tcp -m comment --comment "default/tea-svc:http cluster IP" -m tcp --dport 80 -j KUBE-SVC-DVHFM6YVY2RW3DPQ



-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -m statistic --mode random --probability 0.33333333349 -j KUBE-SEP-3NPNUAJQIUYNQ6GJ
-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -m statistic --mode random --probability 0.50000000000 -j KUBE-SEP-62HFJKX5HLTTQHKU
-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -j KUBE-SEP-I5YFUSH4L5RO5MII



-A KUBE-SEP-3NPNUAJQIUYNQ6GJ -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.171.57:8080
-A KUBE-SEP-62HFJKX5HLTTQHKU -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.171.58:8080
-A KUBE-SEP-I5YFUSH4L5RO5MII -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.37.239:8080
```

kube-proxy 针对 service 流量入口专门创建了 KUBE-SERVICES 链，

```Bash
-A KUBE-SERVICES -d 10.107.48.138/32 -p tcp -m comment --comment "default/tea-svc:http cluster IP" -m tcp --dport 80 -j KUBE-SVC-DVHFM6YVY2RW3DPQ
```

如果 访问地址 10.107.48.138/32，目标端口是 80，则会进入 KUBE-SVC-DVHFM6YVY2RW3DPQ 链 

```Bash
-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -m statistic --mode random --probability 0.33333333349 -j KUBE-SEP-3NPNUAJQIUYNQ6GJ

-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -m statistic --mode random --probability 0.50000000000 -j KUBE-SEP-62HFJKX5HLTTQHKU

-A KUBE-SVC-DVHFM6YVY2RW3DPQ -m comment --comment "default/tea-svc:http" -j KUBE-SEP-I5YFUSH4L5RO5MII
```

这里利用了 iptables 的 random 模块，使连接有 33.3% 的概率进入  **KUBE-SEP-3NPNUAJQIUYNQ6GJ 链，**

50% 概率进入 **KUBE-SEP-62HFJKX5HLTTQHKU 链，**最后会匹配 **KUBE-SEP-I5YFUSH4L5RO5MII** 链。

因此，kube-proxy 的 iptables 模式采用随机数实现了服务的负载均衡。 

KUBE-SEP-3NPNUAJQIUYNQ6GJ 链的作用是 通过 DNAT 将请求发送到 10.244.171.57 的 8080 端口。

同理，KUBE-SEP-62HFJKX5HLTTQHKU 链的作用是通过DNAT 将请求发送到 10.244.171.58 的 8080 端口。 

KUBE-SEP-I5YFUSH4L5RO5MII 链的作用是通过DNAT 将请求发送到 10.244.37.239 的 8080 端口。

```Bash
-A KUBE-SEP-3NPNUAJQIUYNQ6GJ -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.171.57:8080
-A KUBE-SEP-62HFJKX5HLTTQHKU -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.171.58:8080
-A KUBE-SEP-I5YFUSH4L5RO5MII -p tcp -m comment --comment "default/tea-svc:http" -m tcp -j DNAT --to-destination 10.244.37.239:8080
```

分析完 ClusterIP 的 iptables 规则后，接下来看一下 NodrPort 的访问方式。NodePort 的访问入口链是 KUBE-NODEPORTS，通过节点的 31668 端口访问 NodePort，则会进入 KUBE-SVC-I277KLBDTTJWT3KA 链，接下来的跳转跟 ClusterIP 方式类似。

```Bash
[root@master-01 ~]# kubectl  get svc  coffee-svc
NAME         TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
coffee-svc   NodePort   10.101.15.76   <none>        80:31668/TCP   5h17m

-A KUBE-NODEPORTS -p tcp -m comment --comment "default/coffee-svc:http" -m tcp --dport 31668 -j KUBE-SVC-I277KLBDTTJWT3KA

-A KUBE-SVC-I277KLBDTTJWT3KA -m comment --comment "default/coffee-svc:http" -m statistic --mode random --probability 0.50000000000 -j KUBE-SEP-XM2ZPQCWY7D6I5CQ
```

综上所述， iptables 模式最主要的链是 KUBE-SERVICES 、 KUBE-SVC-＊和 KUBE-SEP-＊ 。  

- KUBE-SERVICES 链是访问集群内服务的数据包入口点，它会根据匹配到的目标 IP :port 将数据包分发到相应的 KUBE-SVC-＊链；  
- KUBE-SVC-＊链相当于一个负载均衡器，它会将数据包平均分发到 KUBE-SEP-＊ 链 。 每个 KUBE-SVC-＊ 链后面的 KUBE-SEP-＊链都和 Service 的后端 Pod 数量一样；  
- KUBE-SEP-＊链通过 DNAT 将连接的目的地址和端口从 Service 的 IP:port 替换为后端Pod 的 IP : port ，从而将流量转发到相应的 Pod 。  

我们用下图总结 Kube-proxy iptables 模式的工作流 ，演示了从客户端 Pod 到不同节点上的服务器 Pod 的流量路径 。 客户端通过 172.16.12.100:80 连接到服务 。

Kubernetes API Server 会维护一个运行应用的后端 Pod 列表 。 每个节点上的 Kube-proxy 进程会根据 Service 和对应的 Endpoints 创建一系列的 iptables 规则 ，以将流量重定向到相应Pod （ 例如 10. 255. 255. 202: 8080 ） 。 整个过程客户端 Pod 无须感知集群的拓扑或集群内Pod 的任何 IP 信息 。

iptables 模式与 userspace 模式相比虽然在稳定性和性能上均有不小的提升，但因为 iptables 使用 NAT 完成转发， 也存在不可忽视的性能损耗 。 另外，当集群 中存在上万服务 时，Node 上的 iptables rules 会非常庞大，对管理是个不小的负担，性能还会大打折扣 。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/19.png)

### IPVS 

除了 iptables 模式之外，kubernetes 也支持 ipvs 模式，在 ipvs 模式下，kube-proxy 监视 Kubernetes 服务和端点，调用 `netlink` 接口相应地创建 IPVS 规则， 并定期将 IPVS 规则与 Kubernetes 服务和端点同步。该控制循环可确保 IPVS 状态与所需状态匹配。访问服务时，IPVS 将流量定向到后端 Pod 之一。

IPVS 代理模式基于类似于 iptables 模式的 netfilter 钩子函数，但是使用**哈希表**作为基础数据结构，并且在内核空间中工作。 所以与 iptables 模式下的 kube-proxy 相比，IPVS 模式下的 kube-proxy 重定向通信的延迟要短，并且在同步代理规则时具有更好的性能。与其他代理模式相比，IPVS 模式还支持更高的网络流量吞吐量。所以对于较大规模的集群会使用 ipvs 模式的 kube-proxy，只需要满足节点上运行 ipvs 的条件，然后我们就可以直接将 kube-proxy 的模式修改为 ipvs，如果不满足运行条件会自动降级为 iptables 模式，现在都推荐使用 ipvs 模式，可以大幅度提高 Service 性能。

IPVS 提供了更多选项来平衡后端 Pod 的流量，默认是 `rr`，有如下一些策略：

- `rr`：轮询调度
- `lc`：最小连接数
- `dh`：目标哈希
- `sh`：源哈希
- `sed`：最短期望延迟
- `nq`： 不排队调度

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/20.png)

kube-proxy会监视 Kubernetes `Service`对象和`Endpoints`，调用`netlink`接口以相应地创建ipvs规则并定期与Kubernetes `Service`对象和`Endpoints`对象同步ipvs规则，以确保 ipvs 状态与期望一致。访问服务时，流量将被重定向到其中一个后端 Pod。

与 iptables 类似，ipvs 基于netfilter 的 hook 功能，但使用哈希表作为底层数据结构并在内核空间中工作。这意味着ipvs可以更快地重定向流量，并且在同步代理规则时具有更好的性能。

> **注意：** ipvs模式假定在运行kube-proxy之前在节点上都已经安装了IPVS内核模块。当kube-proxy以ipvs代理模式启动时，kube-proxy将验证节点上是否安装了IPVS模块，如果未安装，则kube-proxy将回退到iptables代理模式。

一个 IPVS 服务端口 80 到 Pod 端口 80 的映射的样例如下:

```Bash
[root@node-01 ~]# ipvsadm -ln
IP Virtual Server version 1.2.1 (size=4096)
TCP  10.111.109.105:80 rr
  -> 10.244.167.159:80            Masq    1      0          0         
  -> 10.244.167.165:80            Masq    1      0          0         
```

### iptabales vs IPVS 

​                                     iptables 和 IPVS 在刷新服务路由规则上的时延对比  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/21.png)

### Kube-proxy 切换到 IPVS 模式

```YAML
yum -y install ipvsadm ipset
kubectl edit configmap kube-proxy -n kube-system

   # 默认是空代表用 iptables，可以修改成 ipvs
    mode: "ipvs"
```

重启 kube-proxy

```YAML
kubectl get pod -n kube-system|grep kube-proxy|awk '{system("kubectl delete pod "$1" -n kube-system")}'
```

### Endpoint

**Endpoint（端点）** 是核心的网络资源对象，本质是「Service 与 Pod 之间的 “桥梁”」—— 它存储了对应 Service 要转发流量的 **Pod IP + 端口** 列表，让 Service 知道该把请求发给哪些具体的 Pod。

## Ingress

### 什么是 Ingress  

Service 本质上是一个由 kube-proxy 控制的四层负载均衡，但在四层上的负载均衡功能还是太有限了，只能够依据 IP 地址和端口号做一些简单的判断和组合，而现在的绝大多数应用都是跑在七层的 HTTP/HTTPS 协议上的，有更多的高级路由条件，比如主机名、URI、请求头、证书等等。

Service 比较适合代理集群内部的服务。如果想要把服务暴露到集群外部，就只能使用 NodePort 或者 LoadBalancer 这两种方式 ，而这两种方式也都有各自的缺点，不能满足所有的场景。

Kubernetes 就引入一个新的 API 对象，在七层上做负载均衡。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/22.png)

Ingress 作为流量的总入口，统管集群的进出口数据

### 什么是 Ingress Controller  

我们前面讲过 Service 本身是没有服务能力的，它只是一些 iptables 规则，真正配置、应用这些规则的实际上是节点上的 kube-proxy 组件。

同样的，Ingress 也只是声明了一些 HTTP 路由规则，相当于一份静态的配置文件，要把这些规则在集群里实施运行，还需要有另外一个组件，这就是 Ingress Controller，它的作用就相当于 Service 的 kube-proxy，能够读取、应用 Ingress 规则，处理、调度流量。  

Ingress Controller 主要由社区来实现，比如我们熟悉的 Nginx， 就有 Nginx Ingress Controller。

下图比较清楚地展示了 Ingress Controller 在 Kubernetes 集群中的地位。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/23.png)

### 为什么要有 IngressClass  

有了 Ingress 和 Ingress Controller，是不是就可以完美地管理集群的进出流量了呢？

最初 Kubernetes 也是这么想的，一个集群里有一个 Ingress Controller，再给它配上许多不同的 Ingress 规则，应该就可以解决请求的路由和分发问题了。  

但随着 Ingress 在实践中的大量应用，很多用户发现这种用法会带来一些问题，比如：  

- 由于某些原因，项目组需要引入不同的 Ingress Controller，但 Kubernetes 不允许这样做；
- Ingress 规则太多，都交给一个 Ingress Controller 处理会让它不堪重负；
- 多个 Ingress 对象没有很好的逻辑分组方式，管理和维护成本很高；
- 集群里有不同的用户，他们对 Ingress 的需求差异很大甚至有冲突，无法部署在同一个 Ingress Controller 上。

Kubernetes 又提出了一个 Ingress Class 的概念，让它插在 Ingress 和 IngressController 中间，让它来协调流量规则和控制器，解除了 Ingress 和 Ingress Controller 的强绑定关系。  

现在，Kubernetes 用户可以转向管理 Ingress Class，用它来定义不同的业务逻辑分组，简化 Ingress 规则的复杂度。比如说，我们可以用 Class A 处理订单流量、Class B 处理物流流量、Class C 处理购物流量。  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/24.png)

### 部署 Ingress Controller

Ingress Controller 是一个要实际干活、处理流量的应用程序，由 Deployment 对象来管理。  

由于 Kubernetes 官网维护的 **[Ingress NGINX Controller](https://github.com/kubernetes/ingress-nginx)** 已经退役不再维护，我们换成 Nginx 官方维护的 

[Nginx Ingress Controller](https://github.com/nginx/kubernetes-ingress)，我们部署最新的稳定版本： [5.3.4](https://github.com/nginx/kubernetes-ingress/releases/tag/v5.3.4) 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/25.png)

部署 Nginx  Ingress Controller 

```Bash
kubectl apply -f deployments/common/ns-and-sa.yaml
kubectl apply -f deployments/rbac/rbac.yaml
kubectl apply -f deployments/common/nginx-config.yaml 
kubectl apply -f deployments/common/ingress-class.yaml 
kubectl apply -f deployments/deployment/nginx-ingress.yaml
kubectl apply -f deployments/service/nodeport.yaml
kubectl create -f deploy 
```

检查部署结果

```Bash
$ kubectl  get pods -n nginx-ingress  
NAME                             READY   STATUS    RESTARTS   AGE
nginx-ingress-55cc9cf8fc-jf6fh   1/1     Running   0          47m
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/26.png)

`Nginx Ingress Controller`  会将创建的对象存放在 nginx-ingress 命名空间中。 

### 使用 YAML 描述 Ingress 和 Ingress Class  

首先用命令` kubectl api-resources `查看它们的基本信息：  

```Bash
[root@master-01 ~]# kubectl  api-resources | grep -i ingress
ingressclasses                                 networking.k8s.io/v1                   false        IngressClass
ingresses                         ing          networking.k8s.io/v1                   true         Ingress
```

Ingress 和 Ingress Class 的 apiVersion 都是“networking.k8s.io/v1”，而且 Ingress 有一个简写“ing”。

我们先使用命令创建一个 Ingress 对象 

```Bash
kubectl create ingress nginx-ing --rule="nginx.xxhf.cc/=nginx-svc:80" --class=nginx --dry-run=client -o yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ing
spec:
  ingressClassName: nginx
  rules:
  - host: nginx.xxhf.cc
    http:
      paths:
      - path: /
        pathType: Exact
        backend:
          service:
            name: nginx-svc
            port:
              number: 80           
```

在这份 Ingress 的 YAML 里，有两个关键字段：“ingressClassName”和“rules”，分别对应了命令行参数，含义还是比较好理解的。  

Ingress Class 本身并没有什么实际的功能，只是起到联系 Ingress 和 Ingress Controller 的作用，所以它的定义非常简单，在“spec”里只有一个必需的字段“controller”，表示要使用哪个 Ingress Controller。

```YAML
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
  # annotations:
  #   ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: nginx.org/ingress-controller
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/27.png)

### 创建 Ingress 规则 

应用 YAML 清单文件：

```Bash
kubectl apply -f nginx-ingress.yaml
```

查看创建后的 ingress 对象 

```Bash
$ kubectl  get ingress 
NAME           CLASS   HOSTS           ADDRESS   PORTS     AGE
nginx-ing      nginx   nginx.xxhf.cc             80        51m
```

使用命令` kubectl describe` 可以看到更详细的 Ingress 信息：

```Bash
kubectl describe  ingress nginx-ing 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/28.png)

`Ingress Class` 在部署 `nginx-ingress-controller` 时已经自动创建了。

```Bash
$ kubectl  get ingressclasses 
NAME    CONTROLLER                     PARAMETERS   AGE
nginx   nginx.org/ingress-controller   <none>       54m
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/29.png)

通过 ingress 来访问 我们部署的 Nginx 应用

因为实际干活的是  controller，所以我们看一下 nginx-ingress-controller 对外提供服务的地址，NodePort SVC 对外暴露的 30080  和 30443 端口，ingress 作为七层入口主要是从集群外部访问。如果集群部署在云厂商的环境中，建议使用 LoadBalance 类型的 SVC。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/30.png)

我们创建的 Ingress 规则是通过域名来访问 ，**因此需要在客户端所在服务器上修改静态解析文件，添加如下行：**

```Plain
192.168.11.57   nginx.xxhf.cc    # 修改为自己 Node 节点 IP 
```

### Case 1 : 使用  HTTP 协议访问 集群内应用

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/31.png)

### Case 2: 使用 HTTPS 协议访问  集群内应用

创建 TLS 类型 Secret

```Bash
kubectl create secret tls cafe-secret \
  --cert=cafe.xxhf.cc_bundle.crt \
  --key=cafe.xxhf.cc.key
```

给 ingress 添加  TLS 属性 

```YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cafe-ingress
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - cafe.xxhf.cc            # 域名 
    secretName: cafe-secret   # TLS  secret 名字 
  rules:
  - host: cafe.xxhf.cc 
    http:
      paths:
      - path: /tea
        pathType: Prefix
        backend:
          service:
            name: tea-svc
            port:
              number: 80
      - path: /coffee
        pathType: Prefix
        backend:
          service:
            name: coffee-svc
            port:
              number: 80
```

访问 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/32.png)

### Case 3:  使用 [annotaion ](https://docs.nginx.com/nginx-ingress-controller/configuration/ingress-resources/advanced-configuration-with-annotations/)配置 Ingress 控制器

在 Kubernetes Ingress 里，**annotation（注解）** 就是给 Ingress 控制器 “传参数、发指令” 的配置方式，用来实现 **路由、TLS、限流、重写、认证** 等功能，不同 Ingress 控制器（nginx/treafik/apisix 等）支持不同 annotation。

1. 创建  htpasswd 文件 

```Bash
$ htpasswd -c htpasswd  admin
New password:          # 输入密码
Re-type new password: 
Adding password for user admin
```

1. 创建 secret 文件 

```YAML
kind: Secret
apiVersion: v1
metadata:
  name: auth-passwd
type: nginx.org/htpasswd
stringData:
  htpasswd: |
    admin:$apr1$YUz1Uixv$y1xcvH.ls/VJhkI3KV7QD/
```

1. 创建 ingress 

```Bash
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-with-auth
  annotations:
    nginx.org/basic-auth-secret: "auth-passwd"
    nginx.org/basic-auth-realm: 'Please Input Your Username and Password' 
spec:
  ingressClassName: nginx
  rules:
  - host: auth.xxhf.cc
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: 
            name: nginx-svc
            port: 
              number: 80
```

1. 测试连接 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/33.png)

## 附录：

### 如何部署多个 ingress controller 

[Kubernetes 社区维护 ingress-nginx](https://kubernetes.github.io/ingress-nginx/user-guide/multiple-ingress/)

```Bash
[root@node-01 ~]# kubectl  get ingressclasses.networking.k8s.io 
NAME             CONTROLLER             PARAMETERS   AGE
external-nginx   k8s.io/ingress-nginx   <none>       92s
internal-nginx   k8s.io/ingress-nginx   <none>       102s
```

[安装 NGINX 官方 Ingress Controller](https://docs.nginx.com/nginx-ingress-controller/installation/installing-nic/installation-with-manifests/)

```Bash
[root@node-01 kubernetes-ingress-3.4.2]# kubectl  get ingressclasses.networking.k8s.io 
NAME             CONTROLLER                      PARAMETERS   AGE
external-nginx   k8s.io/external-ingress-nginx   <none>       9h
internal-nginx   k8s.io/internal-ingress-nginx   <none>       9h
nginx            nginx.org/ingress-controller    <none>       3m3s
```

### Ingress Controller

Kubernetes 社区维护： https://github.com/kubernetes/ingress-nginx

Nginx官方维护： https://docs.nginx.com/nginx-ingress-controller/

Traefik: https://github.com/traefik/traefik

### LoadBalancer

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/34.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/35.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/36.png)

### 生产环境 ingrss 入口流量

Kubernetes 中 ingress 请求入口流量详解: https://mp.weixin.qq.com/s/uyXugwITl6jMcol9Uw6mEg

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-09/37.png)

### 下一代 Ingress -- Gateway API   

https://mp.weixin.qq.com/s/-PPIdsSts2TlRzbecPxTHQ

### [云原生代理 Traefik — Ingress Controller](https://mp.weixin.qq.com/s/J82OHVdHs7XkwVs8zZzSfQ)

https://mp.weixin.qq.com/s/J82OHVdHs7XkwVs8zZzSfQ

### Ingress NGINX 退役

Ingress NGINX 退役及替代方案： https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/

第三方 ingress 控制器：

https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#third-party-ingress-controllers

### NGINX Ingress Controller 官方文档

https://docs.nginx.com/nginx-ingress-controller/install/manifests/
