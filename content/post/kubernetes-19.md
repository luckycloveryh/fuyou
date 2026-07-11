---
title: "19-监控"
date: 2026-04-06T18:10:14+08:00
lastmod: 2026-04-06T18:10:14+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195218_522_12.jpg"
tags: ["Kubernetes", "K8s", "监控", "Metrics Server", "Prometheus", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 监控体系，包括 Metrics Server 资源监控、Prometheus + Grafana 搭建等核心监控方案，适合 K8s 运维学习。"
slug: "k8s-monitoring-metrics-prometheus"
keywords: ["K8s 监控", "Metrics Server", "Prometheus", "Grafana", "Kubernetes 运维"]
---

## Metrics Server  

如果你对 Linux 系统有所了解的话，应该知道有一个命令 top 能够实时显示当前系统的 CPU 和内存利用率，它是性能分析和调优的基本工具，非常有用。Kubernetes 也提供了类似的命令，就是 kubectl top，不过默认情况下这个命令不会生效，必须要安装一个插件 Metrics Server 才可以。  

Metrics Server 是一个专门用来收集 Kubernetes 核心资源指标（metrics）的工具，它定时从所有节点的 kubelet 里采集信息，但是对集群的整体性能影响极小，每个节点只大约会占用 1m 的 CPU 和 2MB 的内存，所以性价比非常高。  

下面的这张图来自 Kubernetes 官网，你可以对 Metrics Server 的工作方式有个大概了解： 它调用 kubelet 的 API 拿到节点和 Pod 的指标，再把这些信息交给 apiserver，这样 kubectl、HPA 就可以利用 apiserver 来读取指标了：  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/01.png)

### **[Metrics Server Github 地址 ](https://github.com/kubernetes-sigs/metrics-server)**

兼容列表：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/02.png)

```Bash
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.1/high-availability-1.21+.yaml
```

修改YAML  添加 `--kubelet-insecure-tls`

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/03.png)

### 部署

```JSON
kubectl apply -f metrics-server-1.21+.yaml
```

### 验证

```JSON
[root@master-01 19-monitor]# kubectl  top node 
NAME        CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
node        204m         10%    1310Mi          69%       
worker-01   88m          4%     1085Mi          57%       
[root@master-01 19-monitor]# 
[root@master-01 19-monitor]# 
[root@master-01 19-monitor]# 
[root@master-01 19-monitor]# kubectl  top pods 
NAME                         CPU(cores)   MEMORY(bytes)   
busybox                      0m           0Mi             
httpserver-d8557894d-4fg29   0m           1Mi             
n1                           0m           2Mi             
n2                           0m           2Mi             
nginx                        0m           2Mi             
```

## HorizontalPodAutoscaler（HPA）

有了 Metrics Server，我们就可以轻松地查看集群的资源使用状况了，不过它另外一个更重要的功能是辅助实现应用的“水平自动伸缩”。  

Kubernetes 为此就定义了一个新的 API 对象，叫做“HorizontalPodAutoscaler”，简称是 “hpa”。顾名思义，它是专门用来自动伸缩 Pod 数量的对象，适用于 Deployment 和 StatefulSet，但不能用于 DaemonSet 对象。 

HorizontalPodAutoscaler 的能力完全基于 Metrics Server，它从 Metrics Server 获取当前应用的运行指标，主要是 CPU 使用率，再依据预定的策略增加或者减少 Pod 的数量。 下面我们就来看看该怎么使用 HorizontalPodAutoscaler，首先要定义 Deployment 和 Service，创建一个 Nginx 应用，作为自动伸缩的目标对象：  

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-hpa
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-hpa
  template:
    metadata:
      labels:
        app: nginx-hpa
    spec:
      containers:
      - name: nginx
        image: nginx:1.22.1
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 10Mi
          limits:
            cpu: 100m
            memory: 20Mi

---
apiVersion: v1
kind: Service
metadata:
  name: nginx-hpa-svc
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-hpa
```

接下来我们要用命令 kubectl autoscale 创建一个 HorizontalPodAutoscaler 的样板 YAML 文件，它有三个参数：  

- min，Pod 数量的最小值，也就是缩容的下限。
- max，Pod 数量的最大值，也就是扩容的上限。
- cpu-percent，CPU 使用率指标，当大于这个值时扩容，小于这个值时缩容。  

好，现在我们就来为刚才的 Nginx 应用创建 HorizontalPodAutoscaler，指定 Pod 数量最少 2 个，最多 10 个，CPU 使用率指标设置的小一点，5%，方便我们观察扩容现象：  

```YAML
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  maxReplicas: 10
  minReplicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-hpa
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 5
```

HorizontalPodAutoscaler 会根据 YAML 里的描述，找到要管理的 Deployment，把 Pod 数量调整成 2 个，再通过 Metrics Server 不断地监测 Pod 的 CPU 使用率。  

下面我们来给 Nginx 加上压力流量，运行一个测试 Pod，使用的镜像是“httpd:alpine”，它里面有 HTTP 性能测试工具 ab（Apache Bench）：  

```YAML
kubectl run test -it --image=httpd:alpine -- sh 
ab -c 10 -t 60 -n 100000 'http://nginx-hpa-svc/'
kubectl  get hpa nginx-hpa  -w 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/04.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/05.png)

由于 Metrics Server 大约每 15 秒采集一次数据，所以 HorizontalPodAutoscaler 的自动化扩容和缩容也是按照这个时间点来逐步处理的。

当它发现目标的 CPU 使用率超过了预定的 5% 后，就会以 2 的倍数开始扩容，一直到数量上限，然后持续监控一段时间，如果 CPU 使用率回落，就会再缩容到最小值。  

## **[kube-prometheus](https://github.com/prometheus-operator/kube-prometheus)**

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/06.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/07.png)

### 组件

Kube-prometheus 包含的组件:

- The [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)
- Highly available [Prometheus](https://prometheus.io/)
- Highly available [Alertmanager](https://github.com/prometheus/alertmanager)
- [Prometheus node-exporter](https://github.com/prometheus/node_exporter)
- [Prometheus Adapter for Kubernetes Metrics APIs](https://github.com/kubernetes-sigs/prometheus-adapter)
- [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)
- [Grafana](https://grafana.com/)

## Operator 

### Operator 

Operator 是由 CoreOS 开发的，用来扩展 Kubernetes API，特定的应用程序控制器，它用来创建、配置和管理复杂的**有状态应用**，如数据库、缓存和监控系统。Operator 基于 Kubernetes 的资源和控制器概念之上构建，但同时又包含了应用程序特定的领域知识。创建 Operator 的关键是 CRD（自定义资源）的设计。

Kubernetes 1.7 版本以来就引入了自定义控制器的概念，该功能可以让开发人员扩展添加新功能，更新现有的功能，并且可以自动执行一些管理任务，这些自定义的控制器就像 Kubernetes 原生的组件一样，Operator 直接使用 Kubernetes API 进行开发，也就是说他们可以根据这些控制器内部编写的自定义规则来监控集群、更改 Pods/Services、对正在运行的应用进行扩缩容。

### CR

CR 代表 自定义资源（Custom Resource）是一种扩展 Kubernetes API 的方式，允许用户定义自己的资源类型和规范。它们允许用户在Kubernetes中创建和管理自定义资源对象，这些对象可以与Kubernetes核心资源（如Pod、Service、Deployment等）一样进行操作。

### CRD 

 CRD（Custom Resource Definition）是一种  Kubernetes 资源，用于定义 CR 的结构和行为。通过创建CRD对象，用户可以定义新的 CR 类型，包括它们的API结构、字段、验证规则和操作行为。

通过使用CR和CRD，用户可以扩展Kubernetes的功能，以适应特定的应用需求。它们提供了一种自定义资源的机制，使用户能够以声明的方式定义和操作自己的资源类型，而无需修改Kubernetes核心代码。

```YAML
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # 名字必需与下面的 spec 字段匹配，并且格式为 '<名称的复数形式>.<组名>'
  name: crontabs.stable.example.com
spec:
  # 组名称，用于 REST API: /apis/<组>/<版本>
  group: stable.example.com
  # 列举此 CustomResourceDefinition 所支持的版本
  versions:
    - name: v1
      # 每个版本都可以通过 served 标志来独立启用或禁止
      served: true
      # 其中一个且只有一个版本必需被标记为存储版本
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                cronSpec:
                  type: string
                image:
                  type: string
                replicas:
                  type: integer
  # 可以是 Namespaced 或 Cluster
  scope: Namespaced
  names:
    # 名称的复数形式，用于 URL：/apis/<组>/<版本>/<名称的复数形式>
    plural: crontabs
    # 名称的单数形式，作为命令行使用时和显示时的别名
    singular: crontab
    # kind 通常是单数形式的驼峰命名（CamelCased）形式。你的资源清单会使用这一形式。
    kind: CronTab
    # shortNames 允许你在命令行使用较短的字符串来匹配资源
    shortNames:
    - ct
```

声明一个 CronTab 对象 

```YAML
apiVersion: "stable.example.com/v1"
kind: CronTab
metadata:
  name: my-new-cron-object
spec:
  cronSpec: "* * * * */5"
  image: my-awesome-cron-image
[root@node-01 CRD]# kubectl  get ct
NAME                 AGE
my-new-cron-object   6h32m
```

## [Prometheus Operator ](https://github.com/prometheus-operator/prometheus-operator)

Prometheus Operator是一种为 Kubernetes 提供本地部署和管理 Prometheus 及相关监控组件的工具。该项目的目的是简化和自动化为 Kubernetes 集群配置基于 Prometheus 的监控堆栈。

Prometheus Operator 包括但不限于以下功能：

1. Kubernetes自定义资源：使用Kubernetes自定义资源来部署和管理Prometheus、Alertmanager和相关组件。通过定义自定义资源对象（CRD），可以在Kubernetes中声明和配置 Prometheus 实例、Alertmanager 实例等。
2. 简化的部署配置：通过本地的Kubernetes资源，可以配置Prometheus的基本设置，如版本、持久化、数据保留策略和副本数。这样可以更方便地进行部署配置，无需涉及复杂的配置文件。
3. Prometheus 目标配置：基于熟悉的Kubernetes标签查询，自动生成监控目标的配置。无需学习Prometheus特定的配置语言，即可快速定义要监控的目标。这样可以简化监控目标的配置过程。

### 安装 Operator

```Bash
wget https://github.com/prometheus-operator/prometheus-operator/releases/download/v0.69.1/bundle.yaml
[root@master-01 ~]# kubectl create -f bundle.yaml 
customresourcedefinition.apiextensions.k8s.io/alertmanagerconfigs.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/alertmanagers.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/podmonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/probes.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheusagents.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheuses.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheusrules.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/scrapeconfigs.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/servicemonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/thanosrulers.monitoring.coreos.com created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-operator created
clusterrole.rbac.authorization.k8s.io/prometheus-operator created
deployment.apps/prometheus-operator created
serviceaccount/prometheus-operator created
service/prometheus-operator created
```

Prometheus Operator 在Kubernetes中引入了自定义资源，用于声明 Prometheus 和 Alertmanager 集群的期望状态以及Prometheus的配置。

1. Prometheus：Prometheus自定义资源用于定义Prometheus实例的配置和规范。可以指定版本、持久化配置、存储策略、副本数等参数，以及与其他资源的关联关系。
2. ServiceMonitor：ServiceMonitor 是一个自定义资源，用于定义要由Prometheus监控的服务和指标。可以指定服务的标签选择器，以便Prometheus可以动态地发现和监控符合条件的服务。
3. Alertmanager：Alertmanager 自定义资源用于定义Alertmanager实例的配置和规范。可以指定接收告警的通知渠道、告警路由的规则等参数。

Prometheus 资源以声明方式描述了 Prometheus 部署的期望状态，而 ServiceMonitor 和 PodMonitor 资源描述了Prometheus 要监控的目标。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/08.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/09.png)

### 部署测试应用

我们部署一个简单的测试应用，起了 3 个副本，通过8080端口对外映射metrics指标信息。

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example-app
  template:
    metadata:
      labels:
        app: example-app
    spec:
      containers:
      - name: example-app
        image: registry.cn-beijing.aliyuncs.com/xxhf/instrumented_app
        ports:
        - name: web
          containerPort: 8080
```

创建对应的 service 对象。

```YAML
kind: Service
apiVersion: v1
metadata:
  name: example-app
  labels:
    app: example-app
spec:
  selector:
    app: example-app
  ports:
  - name: web
    port: 8080
```

### 创建 ServiceMonitor 对象 

```YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
  labels:
    team: frontend
spec:
  selector:
    matchLabels:
      app: example-app
  endpoints:
  - port: web
```

### 部署 Prometheus

创建RBAC 策略

```YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/metrics
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources:
  - configmaps
  verbs: ["get"]
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: default
```

Prometheus自定义资源定义了底层的具体StatefulSet的特性（副本数、资源请求/限制等），同时通过`spec.serviceMonitorSelector`字段指定应包含哪些ServiceMonitor。

之前我们创建了一个带有`team: frontend`标签的 ServiceMonitor 对象，现在我们在Prometheus对象中定义，Prometheus应选择所有带有`team: frontend`标签的ServiceMonitor。这使得前端团队可以创建新的ServiceMonitors和Services，而无需重新配置Prometheus对象。

```YAML
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  replicas: 1
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      team: frontend
  resources:
    requests:
      memory: 400Mi
  enableAdminAPI: false
```

将对象部署到集群中

```Bash
kubectl apply -f prometheus.yaml
kubectl -n default  get  prometheus prometheus -w
```

### 暴露 Prometheus SVC 

要访问Prometheus界面，需要将Prometheus服务暴露给外部。为了简单起见，我们可以使用一个NodePort类型的Service来实现。

```YAML
apiVersion: v1
kind: Service
metadata:
  name: prometheus
spec:
  type: NodePort
  ports:
  - name: web
    nodePort: 30900
    port: 9090
    protocol: TCP
    targetPort: web
  selector:
    prometheus: prometheus
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/10.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/11.png)

## 附录

### metric server *vs* kube-state-metric *vs* cAdvisor 

1. Metric Server（指标服务器）：
   1. Metric Server是Kubernetes的核心组件之一，用于**收集和聚合集群级别的资源利用率指**标，如CPU使用率、内存使用量等。
   2. Metric Server使用Kubernetes API提供的Metrics API来获取和暴露指标数据，可以通过kubectl命令或API查询这些指标。
   3. Metric Server通常用于水平扩展Pod的自动伸缩、资源配额管理和监控集群整体的资源利用率。
2. kube-state-metrics（Kubernetes 状态指标）KSM：
   1. kube-state-metrics 是一个独立的监控工具，用于收集和暴露Kubernetes集群中的**各种资源对象的状态**指标。
   2. kube-state-metrics 通过解析 Kubernetes 的 API 服务器中的资源对象状态，生成与资源对象相关的指标数据，如节点数量、Pod 数量、ReplicaSet 数量等。
   3. kube-state-metrics 提供了丰富的资源指标，可以用于监控和告警，以及与 Prometheus 等监控系统集成。
3. cAdvisor（容器监控代理）：
   1. cAdvisor 是一个容器监控代理，用于收集和暴露单个节点上容器级别的资源指标。它是Kubernetes默认集成的监控工具之一。
   2. cAdvisor 运行在每个节点上，通过直接与Docker或其他容器运行时交互，收集容器的CPU、内存、磁盘和网络等资源使用情况。
   3. cAdvisor 提供了实时的容器级别指标，可以用于监控容器的性能和资源利用情况。

### 修复 unhealthy target 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-19/12.png)

- etcd.yaml 

```YAML
    - --listen-metrics-urls=http://127.0.0.1:2381
    # 修改为 
    - --listen-metrics-urls=http://0.0.0.0:2381
```

- kube-controller-manager.yaml

```YAML
    - --bind-address=127.0.0.1
# 修改为    
    - --bind-address=0.0.0.0    
```

- kube-scheduler.yaml

```YAML
    - --bind-address=127.0.0.1
# 修改为    
    - --bind-address=0.0.0.0    
```

- Kube-proxy

kubectl  -n kube-system edit cm kube-proxy

```YAML
    metricsBindAddress: ""   
# 修改为  
    metricsBindAddress: "0.0.0.0"
```

重启 kube-proxy 

### 全栈监控 可观测 

全栈监控（Full Stack Monitoring）是一种综合性的监控方案，用于收集、分析和可视化应用程序的各个层面和组件的性能和健康状态。它提供了对整个应用程序栈的端到端可见性，包括前端、后端、基础设施和用户体验等方面。

全栈监控旨在帮助开发团队、运维团队和业务团队全面了解应用程序的运行状况，以便及时发现和解决问题，并持续改进应用程序的性能和可用性。通过收集和分析各个组件的监控数据，全栈监控可以提供以下方面的信息：

1. 应用程序性能：全栈监控可以实时监测应用程序的性能指标，例如响应时间、吞吐量、错误率等。这些指标可以帮助识别性能瓶颈和优化机会，从而提升应用程序的效率和用户体验。 
2. 用户体验：全栈监控可以跟踪用户在应用程序中的行为和交互，并提供关于用户体验的指标，如页面加载时间、交互延迟等。这些指标可以帮助了解用户对应用程序的满意度，并识别可能影响用户体验的问题。
3. 服务依赖关系：应用程序通常依赖于多个服务和组件。全栈监控可以跟踪这些依赖关系，并提供服务之间的关联性和性能指标。这有助于识别服务之间的依赖问题、故障传播和性能影响。
4. 基础设施监控：全栈监控可以监控应用程序运行所需的基础设施层，包括服务器、数据库、网络等。它可以提供有关基础设施的指标和警报，以确保其正常运行和可用性。
5. 日志和错误跟踪：全栈监控可以收集应用程序的日志和错误信息，并提供对这些信息的分析和可视化。这有助于快速定位和解决应用程序中的错误和异常。 
