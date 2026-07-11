---
title: "Headlamp"
date: 2026-04-06T18:07:39+08:00
lastmod: 2026-04-06T18:07:39+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195216_521_12.jpg"
tags: ["Kubernetes", "K8s", "Headlamp", "Web UI", "可视化", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 现代化 Web 可视化工具 Headlamp，包括安装配置、资源监控、权限管理等日常运维用法。"
slug: "k8s-headlamp-web-ui"
keywords: ["K8s Headlamp", "Kubernetes UI", "K8s 可视化运维", "云原生工具"]
---

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/01.png)

## Headlamp 介绍  

Kubernetes 官方提供的用户管理项目是 [Dashboard](https://github.com/kubernetes-retired/dashboard)，这个项目在 2026 年就不再维护了，官方推荐使用 [Headlamp](https://github.com/kubernetes-sigs/headlamp) 来代替 Dashboard 项目。 

Headlamp 是一款易于使用且可扩展的 Kubernetes 用户界面， 包含 Kubernetes Dashboard 的功能集（即列出和查看资源），并提供额外的扩展功能。

Headlamp 特性：

- 支持集群内操作或本地桌面应用模式
- 多集群管理
- 通过插件实现功能扩展
- 与 RBAC 关联的操作权限控制（无权限时禁止删除/更新）
- 可撤销的创建/更新/删除操作
- 带文档支持的日志、执行和资源编辑器
- 读写/交互模式（操作基于权限控制）

## Headlamp 部署 

Headlamp  支持两种部署方式 ： 

1. 集群内部署
2. 使用桌面应用

接下来我们演示一下这两种部署方式：

### 集群内部署

集群内部署就是把 Headlamp 部署到 Kubernetes 集群中，再将 Headlamp 暴露到集群外部，我们就可以通过 web 界面管理集群了，集群内部署使用 Helm 工具即可。 

第一步：添加 chart 仓库 

```Bash
# 添加仓库 
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/

# 搜索仓库中 chart 包
$ helm search repo headlamp
NAME                     CHART VERSION        APP VERSION        DESCRIPTION                                       
headlamp/headlamp        0.40.0               0.40.0             Headlamp is an easy-to-use and extensible Kuber...

# 下载离线 chart 包
helm pull headlamp/headlamp  --version=0.40.0 

# 解压 chart 包 
tar xvf headlamp-0.40.0.tgz
```

下载离线 chart 包的目的主要是方便查看 `values.yaml `中提供了哪些可以自定义的参数

第二步： 安装 headlamp 

```Bash
$ helm upgrade --install my-headlamp \
  --set service.type=NodePort \
  --namespace webui \
  --create-namespace \
  headlamp 

Release "my-headlamp" does not exist. Installing it now.
NAME: my-headlamp
LAST DEPLOYED: Tue Mar  3 16:51:53 2026
NAMESPACE: webui
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
NOTES:
1. Get the application URL by running these commands:
  export NODE_PORT=$(kubectl get --namespace webui -o jsonpath="{.spec.ports[0].nodePort}" services my-headlamp)
  export NODE_IP=$(kubectl get nodes --namespace webui -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://$NODE_IP:$NODE_PORT
2. Get the token using
  kubectl create token my-headlamp --namespace webui
```

第三步：访问 headlamp 

- 通过四层 Service 访问管理界面  

```Bash
$ kubectl  -n webui  get  svc 
NAME          TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
my-headlamp   NodePort   10.106.59.169   <none>        80:30998/TCP   114s
```

使用任意节点 IP+30998 端口就可以看到 headlamp 登录界面 。 

- 通过 七层 Ingress 访问  

修改 `valumes.yaml` 中配置，按如下修改， 改为自己的域名即可。这个配置文件可以为我们创建 ingress 规则， 不过要通过 ingress 访问应用，需要集群中配置好了 Ingress Controller，根据自己安装的 Ingress Controller修改 ingressClassName 的值。 

```YAML
ingress:
  # -- Enable ingress controller resource
  enabled: true
  ingressClassName: "nginx"
  hosts:
     - host: ui.chijinjing.cn
       paths:
       - path: /
         type: Prefix  
  tls: 
    - secretName: headlamp-tls
      hosts:
        - ui.xxhf.cc
```

Headlamp 需要使用 HTTPS 协议访问，ingress 规则中启动了 TLS，我们需要创建一个 TLS 类型的 Secret，保存证书和私钥。 

```Bash
kubectl -n webui \
  create secret tls headlamp-tls \
  --cert=ui.xxhf.cc_bundle.crt \
  --key=ui.xxhf.cc.key 
```

更新 headlamp Release，使配置生效。 

```Bash
$ helm upgrade --install my-headlamp   --set service.type=NodePort   --namespace webui   --create-namespace   headlamp

Release "my-headlamp" has been upgraded. Happy Helming!
NAME: my-headlamp
LAST DEPLOYED: Tue Mar  3 17:03:13 2026
NAMESPACE: webui
STATUS: deployed
REVISION: 2
DESCRIPTION: Upgrade complete
TEST SUITE: None
NOTES:
1. Get the application URL by running these commands:
  https://ui.chijinjing.cn/
2. Get the token using
  kubectl create token my-headlamp --namespace webui
```

Release 更新后可以看到 ingress 规则创建成功了 

```Bash
$ kubectl  -n webui  get ingress 
NAME          CLASS   HOSTS              ADDRESS   PORTS     AGE
my-headlamp   nginx   ui.chijinjing.cn             80, 443   3m17s
```

使用上面的域名访问 headlamp，可以看到如下登录界面 ：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/02.png)

### 桌面应用部署

桌面应用是通过 kubeconfig 文件连接集群，也支持多集群的管理，还是比较方便的。

**第一步：下载应用**

主流的操作系统都支持

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/03.png)

我这里下载一个 windows 桌面应用：  `https://github.com/kubernetes-sigs/headlamp/releases/download/v0.40.1/Headlamp-0.40.1-win-x64.exe`` `  

**第二步：安装**

安装成功后可以看到如下的界面：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/04.png)

**第三步： 添加** **`kubeconfig `****文件连接集群**

在 Kubernetes 集群中下载 kubeconfig 文件，需要确保和集群中的 kube-apiserver 网络是通的。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/05.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/06.png)

## Headlamp 访问 

集群内部署方式访问 Headlamp 需要使用 Account token ，使用下面的命令生成一个 token，这个 token 默认有效期是一个小时。 

```Bash
kubectl create token my-headlamp -n webui 




kubectl get secrets cs-admin -o jsonpath='{.data.token}' | base64 -d
```

登录成功后可以看到如下界面 ： 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/07.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/08.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-18/09.png)

管理功能比 Dashboard 项目丰富一些，使用体验还不错。 
