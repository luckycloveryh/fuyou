---
title: "17-集群安全"
date: 2026-04-06T18:02:14+08:00
lastmod: 2026-04-06T18:02:14+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195228_527_12.jpg"
tags: ["Kubernetes", "K8s", "集群安全", "RBAC", "证书", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 集群安全体系，包括 RBAC 权限控制、证书管理、网络策略等核心安全机制，适合 K8s 运维进阶学习。"
slug: "k8s-cluster-security"
keywords: ["K8s 安全", "RBAC", "证书管理", "Kubernetes 运维", "云原生安全"]
---

## 认证

Kubernetes API Server 组件是 Kubernetes 集群资源操作的唯一入口，它通过 HTTP RESTful 的形式暴露服务，允许不同的用户、外部组件等访问它。我们使用 curl 命令去模拟访问 apisever 请求过程中，发生了什么。

```Bash
[root@node-01 ~]# curl https://192.168.11.56:6443/api/v1/namespaces -k
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {},
  "status": "Failure",
  "message": "namespaces is forbidden: Us
  er \"system:anonymous\" cannot list resource \"namespaces\" in API group \"\" at the cluster scope",
  "reason": "Forbidden",
  "details": {
    "kind": "namespaces"
  },
  "code": 403
}
```

从上面返回的结果可以看出：

- apiserver 识别这次请求的用户为 system:anonymous 
- apiserver 禁止了该用户 list namespaces，并返回 403

所以通过上面的测试大致了解 apiserver 的工作机制：

- 首先，它会识别请求的用户是谁（AuthN）
- 然后，它会识别该用户具有什么样的权限（AuthZ）

[认证插件](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/authentication/)

## 鉴权 

### RBAC **权限控制** 

在 Kubernetes 中资源对象的操作都是通过 kube-apiserver 进行的，那么集群是怎样知道我们的请求就是合法的请求呢？这个就需要了解 Kubernetes 中另外一个非常重要的知识点了：`RBAC`（基于角色的权限控制）。

管理员可以通过 Kubernetes API 动态配置策略来启用`RBAC`，需要在 kube-apiserver 中添加参数`--authorization-mode=RBAC`，如果使用的kubeadm 安装的集群那么是默认开启了 `RBAC` 的，可以通过查看 Master 节点上 apiserver 的静态 Pod 定义文件：

```Bash
cat /etc/kubernetes/manifests/kube-apiserver.yaml 
...
    - --authorization-mode=Node,RBAC
...
```

### API 对象 

```Bash
kubectl get --raw /
{
  "paths": [
    "/api",
    "/api/v1",
    "/apis",
    "/apis/",
    ......
    "/version"
  ]
}
```

比如我们来查看批处理这个操作，在我们当前这个版本中存在两个版本的操作：`/apis/batch/v1` 和 `/apis/batch/v1beta1`，分别暴露了可以查询和操作的不同实体集合，同样我们还是可以通过 kubectl 来查询对应对象下面的数据：

```Bash
$ kubectl get --raw /apis/batch/v1 | python -m json.tool
{
    "apiVersion": "v1",
    "groupVersion": "batch/v1",
    "kind": "APIResourceList",
    "resources": [
        {
            "categories": [
                "all"
            ],
            "kind": "Job",
            "name": "jobs",
            "namespaced": true,
            "singularName": "",
            "storageVersionHash": "mudhfqk/qZY=",
            "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
            ]
        },
        {
            "kind": "Job",
            "name": "jobs/status",
            "namespaced": true,
            "singularName": "",
            "verbs": [
                "get",
                "patch",
                "update"
            ]
        }
    ]
}
```

但是这个操作和我们平时操作 HTTP 服务的方式不太一样，这里我们可以通过 `kubectl proxy` 命令来开启对 apiserver 的访问：

```Bash
$ kubectl proxy
Starting to serve on 127.0.0.1:8001
```

然后重新开启一个新的终端，我们可以通过如下方式来访问批处理的 API 服务：

```Bash
 curl http://127.0.0.1:8001/apis/batch/v1
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "batch/v1",
  "resources": [
    {
      "name": "jobs",
      "singularName": "",
      "namespaced": true,
      "kind": "Job",
      "verbs": [
        "create",
        "delete",
        "deletecollection",
        "get",
        "list",
        "patch",
        "update",
        "watch"
      ],
      "categories": [
        "all"
      ],
      "storageVersionHash": "mudhfqk/qZY="
    },
    {
      "name": "jobs/status",
      "singularName": "",
      "namespaced": true,
      "kind": "Job",
      "verbs": [
        "get",
        "patch",
        "update"
      ]
    }
  ]
}
```

通常，Kubernetes API 支持通过标准 HTTP `POST`、`PUT`、`DELETE` 和 `GET` 在指定 PATH 路径上创建、更新、删除和检索操作，并使用 JSON 作为默认的数据交互格式。

比如现在我们要创建一个 Deployment 对象，那么我们的 YAML 文件的声明就需要怎么写：

```YAML
apiVersion: apps/v1
kind: Deployment
```

其中 `Deployment` 就是这个 API 对象的资源类型（Resource），`apps` 就是它的组（Group），`v1` 就是它的版本（Version）。API Group、Version 和 资源就唯一定义了一个 HTTP 路径，然后在 kube-apiserver 端对这个 url 进行了监听，然后把对应的请求传递给了对应的控制器进行处理而已，当然在 Kuberentes 中的实现过程是非常复杂的。

### RBAC  

上面我们介绍了 Kubernetes 所有资源对象都是模型化的 API 对象，允许执行 `CRUD(Create、Read、Update、Delete)` 操作(也就是我们常说的增、删、改、查操作)，比如下面的这些资源：

- Pods
- ConfigMaps
- Deployments
- Nodes
- Secrets
- Namespaces
- ......

对于上面这些资源对象的可能存在的操作有：

- create
- get
- delete
- list
- update
- edit
- watch
- exec
- patch

这些资源和 API Group 进行关联，比如 Pods 属于 Core API Group，而 Deployements 属于 apps API Group，现在我们要在 Kubernetes 中通过 RBAC 来对资源进行权限管理，除了上面的这些资源和操作以外，我们还需要了解另外几个概念：

- `Rule`：规则，规则是一组属于不同 API Group 资源上的一组操作的集合
- `Role` 和 `ClusterRole`：角色和集群角色，这两个对象都包含上面的 Rules 元素，二者的区别在于，在 Role 中，定义的规则只适用于单个命名空间，也就是和 namespace 关联的，而 ClusterRole 是集群范围内的，因此定义的规则不受命名空间的约束。另外 Role 和 ClusterRole 在Kubernetes 中都被定义为集群内部的 API 资源，和我们前面学习过的 Pod、Deployment 这些对象类似，都是我们集群的资源对象，所以同样的可以使用 YAML 文件来描述，用 kubectl 工具来管理。
- `Subject`：主题，对应集群中操作的对象，集群中定义了3种类型的主题资源：
  - `User Account`：用户，这是有外部独立服务进行管理的，管理员进行私钥的分配，用户可以使用 KeyStone 或者 Goolge 帐号，甚至一个用户名和密码的文件列表也可以。对于用户的管理集群内部没有一个关联的资源对象，所以用户不能通过集群内部的 API 来进行管理。
  - `Group`：组，这是用来关联多个账户的，集群中有一些默认创建的组，比如 cluster-admin。
  - `Service Account`：服务帐号，通过 Kub ernetes API 来管理的一些用户帐号，和 namespace 进行关联的，适用于集群内部运行的应用程序，需要通过 API 来完成权限认证，所以在集群内部进行权限操作，我们都需要使用到 ServiceAccount，这也是我们这节课的重点
- `RoleBinding` 和 `ClusterRoleBinding`：角色绑定和集群角色绑定，简单来说就是把声明的 Subject 和我们的 Role 进行绑定的过程（给某个用户绑定上操作的权限），二者的区别也是作用范围的区别：RoleBinding 只会影响到当前 namespace 下面的资源操作权限，而 ClusterRoleBinding 会影响到所有的 namespace。

接下来我们来通过几个简单的示例，来学习下在 Kubernetes 集群中如何使用 `RBAC`。

### 只能访问某个 namespace 的 `User Account`

我们想要创建一个 User Account，只能访问 dev-project  这个命名空间，对应的用户信息如下所示：

```Bash
username: dev-user
group: developer
```

#### **创建用户凭证**

Kubernetes 没有 User Account 的 API 对象，不过要创建一个用户帐号的话也是挺简单的，可以使用 `OpenSSL` 命令创建 X509 证书来创建一个 User。

```Bash
[root@node-01 dev-project]# openssl genrsa -out dev-user.key 2048
Generating RSA private key, 2048 bit long modulus
............+++
.....................+++
e is 65537 (0x10001)
```

使用我们刚刚创建的私钥创建一个证书签名请求文件：`dev-user.csr`，要注意需要确保在`-subj`参数中指定用户名和组(CN表示用户名 common name ，O表示组 orgnazation )：

```Bash
openssl req -new -key dev-user.key -out dev-user.csr -subj "/CN=dev-user/O=developer"
```

然后找到我们 Kubernetes 集群的 `CA` 证书，如果使用的是 kubeadm 安装的集群，CA 相关证书位于 `/etc/kubernetes/pki/` 目录下面，我们会利用该目录下面的 `ca.crt` 和 `ca.key`两个文件来批准上面的证书请求。生成最终的证书文件，我们这里设置证书的有效期为 3650 天：

```Bash
[root@node-01 dev-project]# openssl x509 -req -in dev-user.csr -CA /etc/kubernetes/pki/ca.crt -CAkey /etc/kubernetes/pki/ca.key -CAcreateserial -out dev-user.crt -days 3650
Signature ok
subject=/CN=dev-user/O=developer
Getting CA Private Key
```

现在查看我们当前文件夹下面是否生成了一个证书文件：

```Bash
[root@node-01 dev-project]# ls
dev-user.crt  dev-user.csr  dev-user.key
```

可以验证我们的证书是不是CA签发的

```Bash
[root@node-01 dev-project]# openssl verify -CAfile  /etc/kubernetes/pki/ca.crt  dev-user.crt 
dev-user.crt: OK
```

现在我们可以使用刚刚创建的证书文件和私钥文件在集群中创建新的凭证和上下文(Context):

```Bash
[root@node-01 dev-project]# kubectl config set-credentials dev-user --client-certificate=dev-user.crt --client-key=dev-user.key    [--embed-certs=true ]   
User "dev-user" set.
```

我们可以看到一个用户 `dev-user` 创建了，然后为这个用户设置新的 Context，我们这里指定特定的一个 namespace：

```Bash
[root@node-01 dev-project]# kubectl config set-context dev-user-context --cluster=kubernetes --namespace=dev-project --user=dev-user
Context "dev-user-context" created.
```

到这里，我们的用户 `dev-user` 就已经创建成功了，现在我们使用当前的这个配置文件来操作 kubectl 命令的时候，应该会出现错误，因为我们还没有为该用户定义任何操作的权限呢：

```Bash
[root@node-01 dev-project]# kubectl  get pods --context=dev-user-context
Error from server (Forbidden): pods is forbidden: User "dev-user" cannot list resource "pods" in API group "" in the namespace "dev-project"
```

#### **创建角色**

用户创建完成后，接下来就需要给该用户添加操作权限，我们来定义一个 YAML 文件，创建一个允许用户操作 Deployment、Pod、ReplicaSets 的角色，如下定义：(dev-user-role.yaml)

```YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dev-user-role
  namespace: dev-project
rules:
- apiGroups: ["", "apps"]
  resources: ["deployments", "replicasets", "pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"] # 也可以使用['*']
```

其中 Pod 属于 `core` 这个 API Group，在 YAML 中用空字符就可以，而 Deployment 和 ReplicaSet 现在都属于 `apps` 这个 API Group（如果不知道则可以用 `kubectl explain` 命令查看），所以 `rules` 下面的 `apiGroups` 就综合了这几个资源的 API Group：["", "apps"]，其中`verbs` 就是我们上面提到的可以对这些资源对象执行的操作，我们这里需要所有的操作方法，所以我们也可以使用['*']来代替。然后直接创建这个 Role：

```YAML
[root@node-01 useraccount]# kubectl apply -f dev-user-role.yaml
role.rbac.authorization.k8s.io/dev-user-role created
```

#### **创建角色权限绑定**

Role 创建完成了，但是很明显现在我们这个 `Role` 和我们的用户` dev-user` 还没有任何关系，所以我们就需要创建一个 `RoleBinding` 对象，在 dev-project 这个命名空间下面将上面的 `dev-user-role` 角色和用户 `dev-user` 进行绑定：（dev-user-rolebinding.yaml）

```YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-user-rolebinding
  namespace: dev-project 
subjects:
- kind: User
  name: dev-user
  apiGroup: ""
roleRef:
  kind: Role
  name: dev-user-role
  apiGroup: rbac.authorization.k8s.io
```

上面的 YAML 文件中我们看到了 `subjects` 字段，就是我们上面提到的用来操作集群的对象，对应上面的 `User` 帐号 `dev-user`，使用 kubectl 创建上面的资源对象：

```Bash
[root@node-01 useraccount]# kubectl apply -f dev-user-rolebinding.yaml
rolebinding.rbac.authorization.k8s.io/dev-user-rolebinding created
```

#### 验证

现在我们可以使用 `dev-user-context` 上下文来操作集群了：

```Bash
[root@node-01 17-security]# kubectl  -n dev-project  apply -f nginx-dep.yaml  --context=dev-user-context
deployment.apps/nginx-dep created

[root@node-01 17-security]#  kubectl  -n dev-project  get pods --context=dev-user-context
NAME                         READY   STATUS    RESTARTS   AGE
nginx-dep-79f77dd7b7-gbbb9   1/1     Running   0          50s
nginx-dep-79f77dd7b7-p4bln   1/1     Running   0          50s

[root@node-01 17-security]# kubectl  -n dev-project  get deployment,rs --context=dev-user-context
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-dep   2/2     2            2           2m32s

NAME                                   DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-dep-79f77dd7b7   2         2         2       2m32s
```

如果去获取其他的资源对象呢，可以看到并没有权限获取，因为我们没有为当前操作用户指定其他对象资源的访问权限，是符合我们的预期的。这样我们就创建了一个只有单个命名空间访问权限的普通 User 。

```Bash
[root@node-01 17-security]#  kubectl  -n dev-project  get cm --context=dev-user-context
Error from server (Forbidden): configmaps is forbidden: User "dev-user" cannot list resource "configmaps" in API group "" in the namespace "dev-project"
[root@node-01 17-security]# 
[root@node-01 17-security]#  kubectl  -n default  get cm --context=dev-user-context
Error from server (Forbidden): configmaps is forbidden: User "dev-user" cannot list resource "configmaps" in API group "" in the namespace "default"
```

### 只能访问某个 namespace 的 `ServiceAccount`

上面我们创建了一个只能访问某个命名空间下面的 User Account，我们前面也提到过 `subjects` 下面还有一种类型的主题资源：`ServiceAccount`，现在我们来创建一个集群内部的用户只能操作 default 这个命名空间下面的 pods 、deployments 和 replicasets 对象，首先来创建一个 `ServiceAccount` 对象：

```Bash
kubectl -n default create sa ns-user
```

我们也可以定义成 YAML 文件的形式来创建：

```YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ns-user
  namespace: default 
```

然后新建一个 Role 对象：(ns-user-role.yaml)

```YAML
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  namespace: default
  name: ns-user-role
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
- apiGroups: ["", "apps"]
  resources: ["deployments", "replicasets", "pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
kubectl apply -f ns-user-role.yaml
```

然后创建一个 `RoleBinding` 对象，将上面的 namespace-user 和角色 namespace-user-role 进行绑定：(namespace-user-rolebinding.yaml)

```YAML
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: namespace-user-rolebinding
  namespace: default
subjects:
- kind: ServiceAccount
  name: ns-user
roleRef:
  kind: Role
  name: ns-user-role 
  apiGroup: rbac.authorization.k8s.io
```

#### 验证

```YAML
[root@node-01 .kube]# kubectl  --kubeconfig=ns-user-conf  get pods 
NAME                         READY   STATUS    RESTARTS   AGE
nginx-dep-587b6fd57c-dwn9g   1/1     Running   0          4d9h
redis-pv-sts-0               1/1     Running   0          4d6h
redis-pv-sts-1               1/1     Running   0          4d6h
[root@node-01 .kube]# 
[root@node-01 .kube]# 
[root@node-01 .kube]# kubectl  --kubeconfig=ns-user-conf  get cm
Error from server (Forbidden): configmaps is forbidden: User "system:serviceaccount:default:namespace-user" cannot list resource "configmaps" in API group "" in the namespace "default"
```

### 可以全局访问的 `ServiceAccount`

刚刚我们创建的`ServiceAccount` 是和一个 `Role` 角色进行绑定的，如果我们创建一个新的 ServiceAccount，需要他操作的权限作用于所有的 namespace，这个时候我们就需要使用到 `ClusterRole` 和 `ClusterRoleBinding` 这两种资源对象了。同样，首先新建一个 ServiceAcount 对象：(cs-admin.yaml)

```YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cs-admin
  namespace: default
```

然后创建一个 ClusterRoleBinding 对象（cnych-clusterolebinding.yaml）:

```YAML
apiVersion: rbac.authorization.k8s.io/v1 
kind: ClusterRoleBinding
metadata:
  name: cs-admin-clusterrolebinding
subjects:
- kind: ServiceAccount
  name: cs-admin 
  namespace: default 
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

验证

```YAML
[root@node-01 .kube]# kubectl  --kubeconfig=cs-admin-conf  -n kube-system get pods 
NAME                                       READY   STATUS    RESTARTS      AGE
calico-kube-controllers-7b8458594b-nr8dz   1/1     Running   0             53d
calico-node-9w8tj                          1/1     Running   0             53d
coredns-6d8c4cb4d-phsh2                    1/1     Running   0             53d
coredns-6d8c4cb4d-zr8fx                    1/1     Running   0             53d
etcd-node                                  1/1     Running   0             53d
kube-apiserver-node                        1/1     Running   1 (24h ago)   6d10h
kube-controller-manager-node               1/1     Running   3 (24h ago)   53d
kube-proxy-pvsst                           1/1     Running   0             33d
kube-scheduler-node                        1/1     Running   3 (24h ago)   53d
nfs-client-provisioner-f95957677-jht7s     1/1     Running   3 (24h ago)   4d10h
```

### What can i do 

```Bash
# kubectl auth can-i get pods
yes
```

## 准入 

```Bash
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-counts
  namespace: default
spec:
  hard:
    configmaps: "1"
[root@node-01 admission]# kubectl  apply -f quota-cm.yaml 
resourcequota/object-counts created

[root@node-01 admission]# kubectl  create cm cm-demo --from-literal=a=b 
error: failed to create configmap: configmaps "cm-demo" is forbidden: exceeded quota: object-counts, requested: configmaps=1, used: configmaps=8, limited: configmaps=1
```

## 附录

### [Kubeconfig](https://kubernetes.io/zh-cn/docs/concepts/configuration/organize-cluster-access-kubeconfig/) 

默认情况下，`kubectl` 在 `$HOME/.kube` 目录下查找名为 `config` 的文件。 你可以通过设置 `KUBECONFIG` 环境变量或者设置 `--kubeconfig`参数来指定其他 kubeconfig 文件。

1. 配置上下文

列出当前配置的 context 

```Bash
[root@node-01 .kube]# kubectl config get-contexts 
CURRENT   NAME                          CLUSTER      AUTHINFO           NAMESPACE
          dev-user-context              kubernetes   dev-user           dev-project
*         kubernetes-admin@kubernetes   kubernetes   kubernetes-admin   
```

切换上下文 

```Bash
[root@node-01 .kube]#  kubectl config use-context dev-user-context
Switched to context "dev-user-context".
[root@node-01 .kube]# 
[root@node-01 .kube]# kubectl config get-contexts 
CURRENT   NAME                          CLUSTER      AUTHINFO           NAMESPACE
*         dev-user-context              kubernetes   dev-user           dev-project
          kubernetes-admin@kubernetes   kubernetes   kubernetes-admin   
[root@node-01 .kube]# 
[root@node-01 .kube]# kubectl  -n kube-system get pods 
Error from server (Forbidden): pods is forbidden: User "dev-user" cannot list resource "pods" in API group "" in the namespace "kube-system"
```

1. 指定 --kubeconfig 文件

```Bash
[root@node-01 .kube]# kubectl  --kubeconfig=/root/.kube/namespace-user-conf  get pods 
NAME                         READY   STATUS    RESTARTS   AGE
nginx-dep-587b6fd57c-dwn9g   1/1     Running   0          4d10h
redis-pv-sts-0               1/1     Running   0          4d6h
redis-pv-sts-1               1/1     Running   0          4d6h
```

1. 配置环境变量

```Bash
export KUBECONFIG=config
```