---
title: "18 - Helm"
date: 2026-04-06T18:04:16+08:00
lastmod: 2026-04-06T18:04:16+08:00
draft: false
image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80"
tags: ["Kubernetes", "K8s", "Helm", "包管理", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨洪"
description: "深入讲解 Kubernetes 包管理工具 Helm，包括 Chart 结构、安装部署、版本管理等核心用法，适合 K8s 运维入门学习。"
slug: "k8s-helm-package-manager"
keywords: ["K8s Helm", "Kubernetes 包管理", "Chart", "云原生运维"]
---

## Helm 基础知识 

Helm 目前是 Kubernetes 服务编排事实上的标准。Helm 提供了多种功能来支持 Kubernetes 的服务编排

### Helm 是什么

Helm 是 Kubernetes 的包管理器，类似于 Python 的 pip ，centos 的 yum 。Helm 主要用来管理 Chart 包。Helm Chart 包中包含一系列 YAML 格式的 Kubernetes 资源定义文件，以及这些资源的配置，可以通过 Helm Chart 包来整体维护这些资源。

Helm 也提供了一个 helm 命令行工具，该工具可以基于 Chart 包一键创建应用，在创建应用时，可以自定义 Chart 配置。应用发布者可以通过 Helm 打包应用、管理应用依赖关系、管理应用版本，并发布应用到软件仓库；对于使用者来说，使用 Helm 后不需要编写复杂的应用部署文件，可以非常方便地在 Kubernetes 上查找、安装、升级、回滚、卸载应用程序。

Helm 最新的版本是 v3，Helm3 以 Helm2 的核心功能为基础，对 Chart repo、发行版管理、安全性和 library Charts 进行了改进。和 Helm2 比起来，Helm3 最明显的变化是删除了 Tiller（Helm2 是一种 Client-Server 结构，客户端称为 Helm，服务器称为 Tiller）。Helm3 还新增了一些功能，并废弃或重构了 Helm2 的部分功能，与 Helm2 不再兼容。

Helm3 架构图如下：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-17/01.png)

上面的架构图中，核心是 Helm Client（helm命令）和 Helm Chart 包。helm 命令可以从 Chart Repository 中下载 Helm Chart 包，读取kubeconfig文件，并构建 kube-apiserver REST API 接口的 HTTP 请求。通过调用 Kubernetes 提供的 REST API 接口，将 Chart 包中包含的所有以 YAML 格式定义的 Kubernetes 资源，在 Kubernetes 集群中创建。

这些资源以 Release 的形式存在于 Kubernetes 集群中，每个 Release 又包含多个 Kubernetes 资源，例如 Deployment、Pod、Service 等。

### Helm 三大基本概念

要学习和使用 Helm，一定要了解 Helm 中的三大基本概念，Helm 的所有操作基本都是围绕着这些概念来进行的。下面我们看一下 Helm 的三大基本概念。

- Chart： 代表一个 Helm 包。它包含了在 Kubernetes 集群中运行应用程序、工具或服务所需的所有 YAML 格式的资源定义文件。
- Repository（仓库）： 它是用来存放和共享 Helm Chart 的地方，类似于存放源码的 GitHub 的 Repository，以及存放镜像的 Docker 的 Repository。
- Release：它是运行在 Kubernetes 集群中的 Chart 的实例。一个 Chart 通常可以在同一个集群中安装多次。每一次安装都会创建一个新的 Release。

在了解了上述这些概念以后，我们就可以这样来解释 Helm：

Helm 安装 *chart* 到 Kubernetes 集群中，每次安装都会创建一个新的 *release*。

## 为什么要使用 Helm

在 Helm 中，可以理解为主要包含两类文件：模板文件和配置文件。模板文件通常有多个，配置文件通常有一个。Helm 的模板文件基于text/template模板文件，提供了更加强大的模板渲染能力。Helm 可以将配置文件中的值渲染进模板文件中，最终生成一个可以部署的 Kubernetes YAML 格式的资源定义文件，如下图所示：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-17/02.png)

## Helm基本操作

### 安装Helm

```Bash
wget https://get.helm.sh/helm-v3.12.3-linux-amd64.tar.gz
tar -xvzf helm-v3.12.3-linux-amd64.tar.gz
mv linux-amd64/helm /usr/bin/

helm version
version.BuildInfo{Version:"v3.6.3", GitCommit:"d506314abfb5d21419df8c7e7e68012379db2354", GitTreeState:"clean", GoVersion:"go1.16.5"}
```

如果执行helm version可以成功打印出 helm 命令的版本号，说明 Helm 安装成功。

Helm 各版本安装包地址见 [Helm Releases](https://github.com/helm/helm/releases)。

安装完helm命令后，可以安装helm命令的自动补全脚本。假如你用的 shell 是bash，安装方法如下：

```Bash
helm completion bash > $HOME/.helm-completion.bash
echo 'source $HOME/.helm-completion.bash' >> ~/.bashrc
bash
```

### **Chart 说明**

```Bash
 helm create my-chart
|-- charts      # 该目录保存其他依赖的 chart（子 chart）
|-- Chart.yaml  
|-- templates            # chart 配置模板，用于渲染最终的 Kubernetes YAML 文件
|   |-- deployment.yaml  # Kubernetes deployment 配置    
|   |-- _helpers.tpl     # 用于创建模板时的帮助类
|   |-- hpa.yaml         # Kubernetes hpa 配置    
|   |-- ingress.yaml    #  Kubernetes ingress 配置
|   |-- NOTES.txt       # 用户运行 helm install 时候的提示信息
|   |-- serviceaccount.yaml  # Kubernetes serviceaccount 配置
|   |-- service.yaml          # Kubernetes service 配置
|   `-- tests
|       `-- test-connection.yaml
`-- values.yaml     # 定义 chart 模板中的自定义配置的默认值，可以在执行 helm install 或 helm update 的时候覆盖
```

以上是 helm 为我们自动创建的目录结构，我们还可以在 `templates` 目录加其他 Kubernetes 对象的配置，比如 `ConfigMap`、`DaemonSet` 等。

我们查看下使用 `helm create` 命令自动生成的 `templates/service.yaml` 文件。

```YAML
apiVersion: v1
kind: Service
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "mychart.selectorLabels" . | nindent 4 }}
```

可以看到其中有很多`{{ }}` 包围的字段，这是使用的 [Go template](https://golang.org/pkg/text/template/) 创建的自定义字段，其中 `mychart` 开头的都是在 `_helpers.tpl` 中生成的定义。

例如 `_helpers.tpl` 中对 `chart.fullname` 的定义：

```Plaintext
{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "mychart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
```

我们再看下 `values.yaml` 文件中有这样的一段配置：

```YAML
service:
  type: ClusterIP
  port: 80
```

在使用 `helm install` 或 `helm update` 时，会渲染 `templates/service.yaml` 文件中的 `{{ .Values.service.type }}` 和 `{{ .Values.service.port }}` 的值。

### Helm 部署应用

#### 初始化仓库 

安装完 Helm 之后，就可以使用 helm 命令添加一个 Chart 仓库。类似于用来托管 Docker 镜像的 DockerHub、用来托管代码的 GitHub，Chart 包也有一个托管平台，当前比较流行的 Chart 包托管平台是 [Artifact Hub](https://artifacthub.io/packages/search?kind=0)。

Artifact Hub 上有很多 Chart 仓库，我们可以添加需要的 Chart 仓库，这里我们添加 BitNami 提供的 Chart 仓库：

```Bash
helm repo add bitnami https://charts.bitnami.com/bitnami # 添加 Chart Repository
helm repo list # 查看添加的 Repository 列表
```

添加完成后，我们可以通过helm search命令，来查询需要的 Chart 包。helm search支持两种不同的查询方式，这里我来介绍下。

- helm search repo <keyword>：从你使用 helm repo add 添加到本地 Helm 客户端中的仓库里查找。该命令基于本地数据进行搜索，无需连接外网。
- helm search hub <keyword>：从 Artifact Hub 中查找并列出 Helm Charts。 Artifact Hub 中存放了大量的仓库。

Helm 搜索使用模糊字符串匹配算法，所以你可以只输入名字的一部分。下面是一个helm search的示例：

```Bash
[root@node-01 18-helm]# helm search repo bitnami
NAME                                                CHART VERSION        APP VERSION          DESCRIPTION                                       
bitnami/airflow                                     16.1.6               2.7.3                Apache Airflow is a tool to express and execute...
bitnami/apache                                      10.2.4               2.4.58               Apache HTTP Server is an open-source HTTP serve...
bitnami/apisix                                      2.2.7                3.7.0                Apache APISIX is high-performance, real-time AP...
bitnami/appsmith                                    2.1.8                1.9.49               Appsmith is an open source platform for buildin...
bitnami/argo-cd                                     5.2.9                2.9.2                Argo CD is a continuous delivery tool for Kuber...
bitnami/argo-workflows                              6.1.4                3.5.1                Argo Workflows is meant to orchestrate Kubernet...
bitnami/aspnet-core                                 5.0.1                8.0.0                ASP.NET Core is an open-source framework for we...
# ... and many more
```

#### 安装一个 Chart

查询到自己需要的 Helm Chart 后，就可以通过 helm install 命令来安装一个 Chart。helm install 支持从多种源进行安装：

- Chart 的 Repository。  `helm install bitnami/nginx --generate-name`
- 本地的 Chart Archive，例如` helm install foo foo-1.0.0.tgz`。
- 一个未打包的 Chart 路径，例如` helm install foo path/to/foo`。
- 一个完整的 URL，例如 `helm install foo ``https://example.com/charts/foo-1.0.0.tgz`。

这里，我们选择通过 bitnami/nginx Chart 包来安装一个 Nginx应用。你可以执行 helm show chart bitnami/nginx 命令，来简单了解这个 Chart 的基本信息。 或者，你也可以执行 helm show all bitnami/nginx，获取关于该 Chart 的所有信息。

```Bash
[root@node-01 18-helm]# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "bitnami" chart repository
Update Complete. ⎈Happy Helming!⎈
[root@node-01 18-helm]# 
[root@node-01 18-helm]# helm install bitnami/nginx --generate-name
NAME: nginx-1703602225
LAST DEPLOYED: Tue Dec 26 22:50:28 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: nginx
CHART VERSION: 15.5.1
APP VERSION: 1.25.3

** Please be patient while the chart is being deployed **
NGINX can be accessed through the following DNS name from within your cluster:

    nginx-1703602225.default.svc.cluster.local (port 80)

To access NGINX from outside the cluster, follow the steps below:

1. Get the NGINX URL by running these commands:

  NOTE: It may take a few minutes for the LoadBalancer IP to be available.
        Watch the status with: 'kubectl get svc --namespace default -w nginx-1703602225'

    export SERVICE_PORT=$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].port}" services nginx-1703602225)
    export SERVICE_IP=$(kubectl get svc --namespace default nginx-1703602225 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    echo "http://${SERVICE_IP}:${SERVICE_PORT}"
    
    
```

在上面的例子中，我们通过安装` bitnami/nginx `这个 Chart，创建了一个 `nginx-1703602225-7b466f68f9-ljzx2 ` Release。 --generate-name参数告诉 Helm 自动为这个 Release 命名。

在安装过程中，Helm 客户端会打印一些有用的信息，包括哪些资源已经被创建，Release 当前的状态，以及你是否还需要执行额外的配置步骤。

安装完之后，你可以使用 helm status 来追踪 Release 的状态。

```Bash
[root@node-01 18-helm]# helm status  nginx-1703602225 
NAME: nginx-1703602225
LAST DEPLOYED: Tue Dec 26 22:50:28 2023
NAMESPACE: default
STATUS: deployed
```

每当你执行 helm install 的时候，都会创建一个新的发布版本。所以一个 Chart 在同一个集群里面可以被安装多次，每一个都可以被独立地管理和升级。

helm install命令会将 templates 渲染成最终的 Kubernetes 能够识别的 YAML 格式，然后安装到 Kubernetes 集群中。

#### 自定义 Chart 

上面的安装方式只会使用 Chart 的默认配置选项，很多时候我们需要自定义 Chart 来指定我们想要的配置。使用 `helm show values `可以查看 Chart 中的可配置选项：

```Bash
[root@node-01 18-helm]# helm show values  bitnami/nginx
global:
  imageRegistry: ""
  ## E.g.
  ## imagePullSecrets:
  ##   - myRegistryKeySecretName
  ##
  imagePullSecrets: []
```

然后，你可以使用 YAML 格式的文件，覆盖上述任意配置项，并在安装过程中使用该文件。

```
nginx-values.yaml
replicaCount: 2
revisionHistoryLimit: 20
updateStrategy:
  type: RollingUpdate
  rollingUpdate: 
    maxSurge: 1
    maxUnavailable: 0
[root@node-01 18-helm]# helm install nginx-01 -f nginx-values.yaml  nginx-15.4.3.tgz 
NAME: nginx-01
LAST DEPLOYED: Tue Dec 26 23:10:53 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: nginx
CHART VERSION: 15.4.3
APP VERSION: 1.25.3
```

上述命令将为 Nginx 修改副本数为2，revision的历史记录保存20条，修改了滚动更新的策略。Chart 中的其他默认配置保持不变。

安装过程中，有两种传递配置数据的方式。

- `-f，--values`：使用 YAML 文件覆盖配置。可以指定多次，优先使用最右边的文件。
- `--set`：通过命令行的方式对指定配置项进行覆盖。

如果同时使用两种方式，则 `--set` 中的值会被合并到 `--values` 中，但是 `--set` 中的值优先级更高。在`--set`中覆盖的内容会被保存在 ConfigMap 中。你可以通过 helm get values 来查看指定 Release 中 

`--set` 设置的值。

```Bash
[root@node-01 18-helm]# helm get values  nginx-01 
USER-SUPPLIED VALUES:
replicaCount: 2
revisionHistoryLimit: 20
updateStrategy:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
  type: RollingUpdate
```

我们看一下 `--set` 的格式和限制 

--set 选项使用0或多个 key-value 对。最简单的用法类似于--set name=value，等价于下面这个 YAML 格式：

```YAML
name: value
```

多个值之间使用逗号分割，因此--set a=b,c=d 的 YAML 表示是：

```YAML
a: b
c: d
```

--set还支持更复杂的表达式。例如，--set outer.inner=value 被转换成了：

```YAML
outer:
  inner: value
```

列表使用花括号{}来表示。例如，--set name={a, b, c} 被转换成了：

```YAML
name:
  - a
  - b
  - c
```

#### 查看 Release 

通过helm list可以查看当前集群、当前 Namespace 下安装的 Release 列表：

```Bash
[root@node-01 18-helm]# helm ls 
NAME                    NAMESPACE        REVISION        UPDATED                                        STATUS          CHART               APP VERSION
nginx-01                default          1               2023-12-26 23:10:53.412289417 +0800 CST        deployed        nginx-15.4.3        1.25.3     
nginx-1703602225        default          1               2023-12-26 22:50:28.610489775 +0800 CST        deployed        nginx-15.5.1        1.25.3
```

可以看到，我们创建了两个 Release，这些 Release 位于 default 命名空间中。上述命令，也列出了 Release 的更新时间、状态、Chart 的版本等。

#### 升级 Release 

部署完应用之后，后续还可能升级应用，可以通过helm upgrade命令来升级应用。升级操作会基于已有的 Release，根据提供的信息进行升级。Helm 在更新时，只会变更有更改的内容。

例如，这里我们升级 nginx-01 ，变更它的 Root 密码：

```Bash
[root@node-01 18-helm]# helm upgrade nginx-01 bitnami/nginx --set containerPorts.http='80'
Release "nginx-01" has been upgraded. Happy Helming!
NAME: nginx-01
LAST DEPLOYED: Tue Dec 26 23:23:29 2023
NAMESPACE: default
STATUS: deployed
REVISION: 2
```

在上面的例子中，nginx-01 这个 Release 使用相同的 Chart 进行升级，但更新了 容器监听的端口号。

我们可以使用 `helm get values `命令，来看看配置值是否真的生效了：

```Bash
[root@node-01 18-helm]# helm get values  nginx-01
USER-SUPPLIED VALUES:
containerPorts:
  http: 80
```

可以看到 containerPorts.http 的新值已经被部署到集群中了。

假如发布失败，我们也很容易通过 `helm rollback [RELEASE] [REVISION]` 命令，回滚到之前的发布版本。

```Bash
[root@node-01 18-helm]# helm rollback nginx-01 
Rollback was a success! Happy Helming!
```

上面这条命令将我们的 nginx-01 回滚到了它最初的版本。Release 版本其实是一个增量修订（revision）。 每当发生了一次安装、升级或回滚操作，revision 的值就会加1。第一次 revision 的值永远是1。

我们可以使用 helm history [RELEASE] 命令来查看一个特定 Release 的修订版本号：

```Bash
[root@node-01 18-helm]# helm history nginx-01
REVISION        UPDATED                         STATUS            CHART               APP VERSION        DESCRIPTION     
1               Tue Dec 26 23:10:53 2023        superseded        nginx-15.4.3        1.25.3             Install complete
2               Tue Dec 26 23:23:29 2023        superseded        nginx-15.5.1        1.25.3             Upgrade complete
3               Tue Dec 26 23:27:41 2023        deployed          nginx-15.4.3        1.25.3             Rollback to 1   
```

#### 卸载 Release

你可以使用`helm uninstall`命令卸载一个 Release：

```Bash
[root@node-01 18-helm]# helm uninstall nginx-01 
release "nginx-01" uninstalled
```

上述命令会从 Kubernetes 卸载 nginx-01， 它将删除和该版本关联的所有资源（Service、Deployment、Pod、ConfigMap 等），包括该 Release 的所有版本历史。

### Helm 命令

Helm 常用命令如下：

- `helm create`：在本地创建新的 chart；
- `helm intall`：安装 chart；
- `helm list`：列出所有 release；
- `helm repo`：列出、增加、更新、删除 chart 仓库；
- `helm rollback`：回滚 release 到历史版本；
- `helm pull`：拉取远程 chart 到本地；
- `helm search`：使用关键词搜索 chart；
- `helm uninstall`：卸载 release；
- `helm upgrade`：升级 release；

使用 `helm -h` 可以查看 Helm 命令行使用详情，也可以参考 [Helm 文档](https://helm.sh/zh/docs/helm/helm/)。

## ChartMuseum (Chart 仓库)   

### [使用本地存储 ](https://chartmuseum.com/docs/#using-with-local-filesystem-storage)

Make sure you have read-write access to `./chartstorage` (will create if doesn’t exist on first upload)

```Bash
./chartmuseum --debug --port=8080 \
  --storage="local" \
  --storage-local-rootdir="./chartstorage"
helm repo add my-repo http://127.0.0.1:8080 
helm plugin install https://github.com/chartmuseum/helm-push

helm cm-push nginx-15.4.3.tgz  my-repo
```

[ChartMuseum 官网](https://chartmuseum.com/docs/#)

### 上传 chart 包到 仓库 

```Bash
# 下载 插件
wget https://github.com/chartmuseum/helm-push/releases/download/v0.10.4/helm-push_0.10.4_linux_amd64.tar.gz
mkdir /root/.local/share/helm/plugins/helm-push -p
tar xvf helm-push_0.10.4_linux_amd64.tar.gz  -C /root/.local/share/helm/plugins/helm-push

# 上传 chart 包
helm cm-push nginx-15.4.3.tgz  my-repo

# 更新仓库 
helm repo update my-repo
[root@node-01 18-helm]# helm search repo my-repo
NAME                 CHART VERSION        APP VERSION        DESCRIPTION                                       
my-repo/nginx        15.4.3               1.25.3             NGINX Open Source is a web server that can be a...
```

## 附录

### 镜像 

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/nginx:1.27.0-debian-12-r5
```
