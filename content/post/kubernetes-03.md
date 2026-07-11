---
title: 'Kubernetes 安装部署'
description: "使用kubeadm部署k8s集群"
date: 2026-04-06T16:05:38+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195140_504_12.png"
tags: ["Kubernetes", "K8s", "云原生", "容器编排", "DevOps", "容器技术", "运维", "微服务", "云原生运维", "K8s入门"]
categories: ["8. Kubernetes"]
---

## Kubeadm 简介 

为了简化 Kubernetes 的部署工作，让它能够更“接地气”，社区里就出现了一个专门用来在集群中安装 Kubernetes 的工具，名字就叫“kubeadm”，意思就是“Kubernetes 管理员”。  

Kubeadm 是用容器和镜像来封装 Kubernetes 的各种组件，但它的目标不是单机部署，而是要能够轻松地在集群环境里部署 Kubernetes，并且让这个集群接近甚至达到生产级质量。  

## 1. 环境准备 ( Master 和 Worker 都 执行 )

### 1.1 所需服务器

| 角色        | 主机名    | IP          | 最小配置 | 建议配置 | 操作系统       |
| ----------- | --------- | ----------- | -------- | -------- | -------------- |
| Master 节点 | master-01 | 10.206.0.15 | 2C4G     | 2C4G     | Rockylinux 9.4 |
| Worker 节点 | worker-01 | 10.206.0.9  | 2C2G     | 2C4G     | Rockylinux 9.4 |

所谓的多节点集群，要求服务器应该有两台或者更多，为了简化我们只取最小值，所以这个Kubernetes 集群就只有两台主机，一台是 Master 节点，另一台是 Worker 节点。当然，在完全掌握了 kubeadm 的用法之后，你可以在这个集群里添加更多的节点。 Master 节点需要运行 apiserver、etcd、scheduler、controller-manager 等组件，管理整个集群，所以对配置要求比较高，至少是 2 核 CPU、4GB 的内存。  

而 Worker 节点没有管理工作，只运行业务应用，所以配置可以低一些，为了节省资源可以给它分配 2 核 CPU 和 2GB 的内存。  

基于模拟生产环境的考虑，在 Kubernetes 集群之外还需要有一台起辅助作用的服务器。它的名字叫 Console，意思是控制台，我们要在上面安装命令行工具 **kubectl**，所有对Kubernetes 集群的管理命令都是从这台主机发出去的。这也比较符合实际情况，因为安全的原因，集群里的主机部署好之后应该尽量少直接登录上去操作。要提醒你的是，Console 这台主机只是逻辑上的概念，不一定要是独立，完全可以复用 Master/Worker 节点作为控制。  

### 1.2 配置主机名 

主机名不是必须要修改，在真实环境中只要主机名不一样即可，为了学习时方便，还是建议修改。 

```Bash
hostnamectl set-hostname master-01

hostnamectl set-hostname worker-01
```

### 1.3 关闭防火墙

```Bash
# 关闭防火墙，并禁止开机自动运行 
systemctl disable --now firewalld
```

### 1.4 关闭 SELinux 

```Bash
# 设置 SELinux 的执行模式。0 表示关闭 SELinux。
setenforce 0
# 修改 SELinux 配置文件  /etc/selinux/config ，禁用 SELinux 
sed -i 's#SELINUX=enforcing#SELINUX=disabled#g' /etc/selinux/config
```

### 1.5 关闭交换分区 

```Bash
swapoff -a; sed -i '/swap/d' /etc/fstab
```

### 1.6 配置时钟同步 

保证所有的服务器的时间一致 

```Bash
yum -y install chrony 

# 修改配置文件 /etc/chrony.conf  ，添加如下行 
server ntp.aliyun.com iburst
server ntp1.aliyun.com iburst
server ntp2.aliyun.com iburst

# 启动服务 
systemctl restart chronyd
systemctl enable chronyd 

# 检查状态 
chronyc tracking 
```

### 1.7 修改内核参数 

```Bash
cat >>/etc/sysctl.d/kubernetes.conf<<EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

sysctl --system

# net.ipv4.ip_forward = 1 启用了IPv4的IP转发功能，允许服务器作为网络路由器转发数据包。
# net.bridge.bridge-nf-call-iptables = 1  当使用网络桥接技术时，将数据包传递到iptables进行处理。
```

### 1.8 配置 hosts 本地解析 

```Bash
cat > /etc/hosts <<EOF
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

10.7.0.15   master-01
10.7.4.13    worker-01
EOF
```

### 1.9 安装 容器运行时    Containerd 

k8s 从 v1.24 版本开始取消了对 Docker 容器运行时的支持，默认使用 Containerd，虽然这是k8s多年的心愿，但对于用户来说并没有益处，还需要额外学习 Containerd 相关的命令，神仙打架，殃及池鱼啊。 

 Containerd 的二进制安装方式有点麻烦，我们就直接使用 docker 公司提供的 yum 仓库安装， containerd 是 Docker 公司捐献给 CNCF 的。 

安装 containerd

```Bash
dnf install -y yum-utils 
# 使用 阿里云仓库 
dnf config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
#官方镜像
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
# 安装 containerd 
dnf -y install containerd.io-1.7.29 
```

修改 containerd 配置文件 

```Bash
# 创建默认配置文件
cd /etc/containerd
mv config.toml config.toml.orig
containerd config default > /etc/containerd/config.toml

# 修改 Containerd cgroup 配置
sed -i "s#SystemdCgroup\ \=\ false#SystemdCgroup\ \=\ true#g" /etc/containerd/config.toml

# grep -i SystemdCgroup  /etc/containerd/config.toml
# SystemdCgroup = true # false 改为 true 

# 修改 sandbox 沙箱镜像地址（就是 pause 镜像地址），国外就不用修改
sed -i "s#registry.k8s.io#registry.aliyuncs.com/google_containers#g" /etc/containerd/config.toml

# grep -i sandbox_image /etc/containerd/config.toml
# sandbox_image = "registry.aliyuncs.com/google_containers/pause:3.8"
# 修改镜像仓库 从 registry.k8s.io 修改为 阿里云 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-03/01.png)

启动 containerd 服务 

```Bash
systemctl enable --now containerd
systemctl status  containerd
ctr version 
```

> 二进制安装 containerd 的步骤大概是：
>
> - 安装 containerd 
> - 安装 runc 
> - 安装 CNI plugins 
>
> 这个步骤可以帮助我们理解是容器是如何创建出来的，但初学者可以先忽略。 

### 1.10 安装 kubeadm 和 k8s 组件 

k8s 官方的仓库访问受限，我们使用阿里云的仓库 

```Bash
cat <<EOF | tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.32/rpm/
enabled=1
gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.32/rpm/repodata/repomd.xml.key
EOF


#官方仓库
cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.32/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.32/rpm/repodata/repomd.xml.key
exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni
EOF

#国外版仓库安装
dnf install -y kubeadm kubelet kubectl --disableexcludes=kubernetes
```

安装 

```Bash
dnf install -y kubeadm-1.32.2 kubelet-1.32.2 kubectl-1.32.2
```

启动服务 

```Bash
systemctl enable --now kubelet
```

## 2. Master 节点初始化 (只在 master 节点执行) 

### 2.1 生成 kubeadm 初始化的配置文件

```YAML
kubeadm config  print init-defaults > kubeadm-config.yaml
```

### 2.2 修改配置文件 

默认生成的kubeadm初始化配置文件 ` kubeadm-config.yaml` 需要修改以下内容：

```YAML
localAPIEndpoint:
  advertiseAddress: 10.206.0.12  # 修改为 master节点IP地址，如果使用公有云，配置虚机的内网地址 
  bindPort: 6443
... ...   
imageRepository: registry.aliyuncs.com/google_containers # 修改为阿里云镜像仓库 
kind: ClusterConfiguration
kubernetesVersion: 1.32.2  # # 需要安装的 k8s 版本号
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16 # 添加 pod 网络 CIDR 地址
  
```

完整的`kubeadm-config.yaml` 配置文件内容如下：

```YAML
apiVersion: kubeadm.k8s.io/v1beta4
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.206.0.12  # 修改为 master节点IP地址，如果使用公有云，配置虚机的内网地址 
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  imagePullSerial: true
  name: master-01  # master 节点主机名
  taints: null
timeouts:
  controlPlaneComponentHealthCheck: 4m0s
  discovery: 5m0s
  etcdAPICall: 2m0s
  kubeletHealthCheck: 4m0s
  kubernetesAPICall: 1m0s
  tlsBootstrap: 5m0s
  upgradeManifests: 5m0s
---
apiServer: {}
apiVersion: kubeadm.k8s.io/v1beta4
caCertificateValidityPeriod: 87600h0m0s
certificateValidityPeriod: 8760h0m0s
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
encryptionAlgorithm: RSA-2048
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.aliyuncs.com/google_containers # 修改为阿里云镜像仓库 
kind: ClusterConfiguration
kubernetesVersion: 1.32.2   # 需要安装的 k8s 版本号
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16   # 添加 pod 网络 CIDR 地址
proxy: {}
scheduler: {}
```

### 2.3 下载集群初始化所需镜像

```Bash
# 查看 Kubernetes 初始化需要用到的镜像 
[root@master-01 ~]# kubeadm config --config=kubeadm-config.yaml  images list
registry.aliyuncs.com/google_containers/kube-apiserver:v1.32.2
registry.aliyuncs.com/google_containers/kube-controller-manager:v1.32.2
registry.aliyuncs.com/google_containers/kube-scheduler:v1.32.2
registry.aliyuncs.com/google_containers/kube-proxy:v1.32.2
registry.aliyuncs.com/google_containers/coredns:v1.11.3
registry.aliyuncs.com/google_containers/pause:3.10
registry.aliyuncs.com/google_containers/etcd:3.5.16-0

# 下载初始化需要用的镜像 
[root@master-01 ~]# kubeadm config --config=kubeadm-config.yaml  images pull 
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-apiserver:v1.32.2
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-controller-manager:v1.32.2
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-scheduler:v1.32.2
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-proxy:v1.32.2
[config/images] Pulled registry.aliyuncs.com/google_containers/coredns:v1.11.3
[config/images] Pulled registry.aliyuncs.com/google_containers/pause:3.10
[config/images] Pulled registry.aliyuncs.com/google_containers/etcd:3.5.16-0

# 查看下载后的镜像 使用 ctr 命令
[root@master-01 ~]# ctr -n k8s.io image list 
```

### 2.4 集群初始化

执行 `kubeadm init` 命令来初始化集群 

```Bash
kubeadm init --config=kubeadm-config.yaml 
```

如果初始化成功，我们可以看到如下信息：

```Bash
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 10.206.0.12:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:b6552d7e230e0b22b813b4a632d2154b713f97ce34894a93d59edb6e2b24bcbf 
```

### 2.5 配置 kubectl 的认证文件 

在 master 节点 执行以下 3 条命令，会生成文件 `$HOME/.kube/config` ，kubectl 需要使用此文件连接集群。 

```Bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 2.6 验证集群

执行 `kubectl  get nodes`  命令，可以看到 `master-01` 节点已经成功加入集群。

```Bash
[root@master-01 ~]# kubectl  get nodes 
NAME        STATUS     ROLES           AGE   VERSION
master-01   NotReady   control-plane   68s   v1.32.2
```

## 3. Worker 节点加入集群 （在 worker 节点执行）

在 worker 节点 只需要执行在集群初始化成功输出的 kubeadm join 命令即可。 

```Bash
kubeadm join 10.206.0.12:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:b6552d7e230e0b22b813b4a632d2154b713f97ce34894a93d59edb6e2b24bcbf 
```

执行成功后输出如下：

```Bash
... ...
This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.

Run 'kubectl get nodes' on the control-plane to see this node join the cluster.
```

返回 master 节点 执行 `kubectl get nodes` 命令，可以发现 worker 节点也成功加入了集群。

```Bash
[root@master-01 ~]# kubectl  get nodes 
NAME        STATUS     ROLES           AGE     VERSION
master-01   NotReady   control-plane   4m39s   v1.32.2
worker-01   NotReady   <none>          2m2s    v1.32.2
```

如果大家仔细观察会发现上面节点的状态是 `NotReady` ， 没有就绪，在这种状态下集群 还无法正常工作，我们需要在集群中安装一个网络插件，才可以让节点的状态变成 `Ready`。   

## 4. 安装网络插件 （在 master 节点执行）

我们使用 Calico 网络插件，calico 用到的镜像在 hub.docker.com 上，国内需要配置加速器，或者导入离线镜像。

```Bash
# 导入镜像, ctr 是 containerd 的客户端命令
ctr  -n k8s.io  image import calico-3.29.2.image

# 下载 calico YAML 文件 
curl https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/calico.yaml -O

# 安装 calico 插件 
kubectl  create -f calico.yaml 
```

执行以下命令检查 calico 是否安装成功 

```Bash
[root@master-01 ~]# kubectl  -n kube-system get pods  -o wide 
NAME                                       READY   STATUS    RESTARTS   AGE     IP              NODE        NOMINATED NODE   READINESS GATES
calico-kube-controllers-77969b7d87-ftjnt   1/1     Running   0          4m40s   10.244.184.66   master-01   <none>           <none>
calico-node-jlknl                          1/1     Running   0          4m40s   10.206.0.10     worker-01   <none>           <none>
calico-node-knkhg                          1/1     Running   0          4m40s   10.206.0.12     master-01   <none>           <none>
```

Calico 安装成功后，再次检查节点状态显示为 Ready。 

```Bash
[root@master-01 ~]# kubectl  get nodes 
NAME        STATUS   ROLES           AGE   VERSION
master-01   Ready    control-plane   57m   v1.32.2
worker-01   Ready    <none>          54m   v1.32.2
```

**国外最新安装**

```Bash
# 1. 安装 Tigera Operator 和 CRDs
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/tigera-operator.yaml

# 2. 安装 Operator CRDs（如果上面没包含，或单独跑）
# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/operator-crds.yaml  # 通常 tigera-operator.yaml 已包含

# 3. 创建自定义资源（自定义 Calico 配置，这里用默认即可）
# 下载模板
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/custom-resources.yaml

# 如果你的 podSubnet 不是默认的 192.168.0.0/16，需要编辑 custom-resources.yaml 中的 installation.spec.calicoNetwork.ipPools.cidr
# 例如你的 kubeadm 用的是 10.244.0.0/16，就改成：
#   cidr: 10.244.0.0/16

#应用
kubectl create -f custom-resources.yaml
kubectl apply -f custom-resources.yaml
# 问题edit之后会默认运行起来
kubectl edit installation default
```

**云虚拟主机需要开放安全组，添加对应内网ip端口**

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-03/02.png)

## 5. 验证集群安装结果

控制面组件状态显示 `Healthy`

```Bash
 [root@master-01 ~]# kubectl  get cs 
Warning: v1 ComponentStatus is deprecated in v1.19+
NAME                 STATUS    MESSAGE   ERROR
controller-manager   Healthy   ok        
scheduler            Healthy   ok        
etcd-0               Healthy   ok        
```

所有 Pod 状态为 `Running `

```Bash
[root@master-01 ~]# kubectl  get pods -A 
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-77969b7d87-ftjnt   1/1     Running   0          7m27s
kube-system   calico-node-jlknl                          1/1     Running   0          7m27s
kube-system   calico-node-knkhg                          1/1     Running   0          7m27s
kube-system   coredns-6766b7b6bb-brh9d                   1/1     Running   0          58m
kube-system   coredns-6766b7b6bb-q7pj7                   1/1     Running   0          58m
kube-system   etcd-master-01                             1/1     Running   1          58m
kube-system   kube-apiserver-master-01                   1/1     Running   1          58m
kube-system   kube-controller-manager-master-01          1/1     Running   1          58m
kube-system   kube-proxy-498gc                           1/1     Running   0          58m
kube-system   kube-proxy-bbqcf                           1/1     Running   0          55m
kube-system   kube-scheduler-master-01                   1/1     Running   1          58m
```

## 6. 常见故障处理  

### 6.1 镜像拉取失败

如果 Pod 状态显示 `ImagePullBackOff`，表示容器所有的节点 镜像拉取失败，需要到对应节点上手动拉取镜像或者导入离线镜像即可。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-03/03.png)

### 6.2 Master 节点初始化失败

在 master 节点初始化过程中，常见的故障是 卡在如下界面，此处是正在等待 kube-apiserver 启动成功，如果apiserver启动失败，这里会一直等待，直到4分钟超时会有报错。 排错的时候需要查看 messages 日志定位具体原因，在初始化的过程中建议打开一个shell 终端运行 `tail -f /var/log/messages` 命令，注意观察报错信息。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-03/04.png)

### 6.3 Worker 节点加入集群失败

Worker 节点在加入集群过程中需要成功运行 kubelet 服务，再连接 kube-apiserver，任何一步失败都无法加入集群，因此在执行 kubeadm join 时也需要打开一个shell 终端运行 `tail -f /var/log/messages` 命令，观察日志中的报错信息。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-03/05.png)

### 6.4 重置集群 

如果找到了报错原因，需要重新初始化集群或是worker节点重新加入集群， 都需要先执行` kubeadm reset` 命令，再执行 `kubeadm init` 或是 `kubeadm join`。 

### 6.5 重新生成 join 命令

初始化时生成的 kubeadm join 命令，有效期是 24 小时，超时后命令中的token 就失效了，如果 24小时后有节点加入集群， 我们需要执行以下命令，重新生成可用的 token 。 

```Bash
[root@master-01 ~]# kubeadm token create --print-join-command
kubeadm join 10.206.0.12:6443 --token sabx6g.kyas4pu9guhio7iv --discovery-token-ca-cert-hash sha256:b6552d7e230e0b22b813b4a632d2154b713f97ce34894a93d59edb6e2b24bcbf 
```

## 参考文档 

Containerd 官网： https://containerd.io/

Containerd 官方文档： https://github.com/containerd/containerd/blob/main/docs/getting-started.md

Kubeadm 官方文档： https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

Calico 官方文档： https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises#install-calico

Kubernetes 每年更新证书和99年证书: https://mp.weixin.qq.com/s/oWVZsTdeS-4coEBqwRLF_g

## Containerd 容器运行时 使用

[容器运行时 Containerd 安装与使用](https://mp.weixin.qq.com/s/d44ngzDbW_ublUsw-KrCJQ)

[CRI 客户端 crictl 命令介绍](https://mp.weixin.qq.com/s/DYHSP8s-3PCUkVF-ierZtg)

[容器命令行工具 nerdctl](https://mp.weixin.qq.com/s/OIC1M0FYd9IJJEKt2Yi6sQ)

