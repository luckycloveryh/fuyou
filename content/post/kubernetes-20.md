---
title: "19-监控 - kube-prometheus 部署"
date: 2026-04-06T18:12:54+08:00
lastmod: 2026-04-06T18:12:54+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195220_523_12.jpg"
tags: ["Kubernetes", "K8s", "监控", "kube-prometheus", "Prometheus", "Grafana", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "详细讲解 Kubernetes 监控栈 kube-prometheus 的完整部署流程，包含 Prometheus、Grafana、Alertmanager 等组件的配置与运维。"
slug: "k8s-kube-prometheus-deployment"
keywords: ["K8s kube-prometheus", "Prometheus 部署", "Kubernetes 监控", "云原生运维"]
---

## Prometheus 架构介绍

Prometheus是一个开源的系统监控和报警框架，其本身也是一个时间序列数据库（Time Series Database，TSDB），它的设计灵感来源于Google的Borgmon，就像Kubernetes是基于Borg系统开源的。

Prometheus 被称为下一代的监控平台，具有很多和“老牌”监控不一样的特性，比如

- 一个多维的数据模型，具有由指标名称和键-值对标识的时间序列数据。
- 使用PromQL查询和聚合数据，可以非常灵活地对数据进行检索。
- 不依赖额外的数据存储，Prometheus本身就是一个时序数据库，提供本地存储和分布式存储，并且每个Prometheus都是自治的。
- 应用程序暴露Metrics接口，Prometheus通过基于HTTP的Pull模型采集数据。
- 同时可以使用PushGateway进行Push数据。
- Prometheus同时支持动态服务和静态配置发现目标机器。
- 支持多种图形和仪表盘，和Grafana堪称“绝配”。

Prometheus生态系统由多个组件组成，其架构如下： 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/01.png)

- Prometheus Server：Prometheus生态最重要的组件，主要用于抓取和存储时间序列数据，同时提供数据的查询和告警策略的配置管理。
- Alertmanager：Prometheus生态用于告警的组件，Prometheus Server会将告警发送给Alertmanager，Alertmanager根据路由配置将告警信息发送给指定的人或组。Alertmanager支持邮件、Webhook、微信、钉钉、短信等媒介进行告警通知。
- Push Gateway：Prometheus本身是通过Pull的方式拉取数据的，但是有些监控数据可能是短期的，如果没有采集数据可能会出现丢失。Push Gateway可以用来解决此类问题，它可以用来接收数据，也就是客户端可以通过Push的方式将数据推送到PushGateway，之后Prometheus可以通过Pull拉取该数据。
- Exporter：主要用来采集监控数据，比如主机的监控数据可以通过node_exporter采集，MySQL的监控数据可以通过mysql_exporter采集，之后Exporter暴露一个接口，比如/metrics，Prometheus可以通过该接口采集到数据。
- PromQL：PromQL其实不算Prometheus的组件，它是用来查询数据的一种语法，比如可以通过SQL语句查询数据库的数据，通过LogQL语句查询Loki的数据，通过PromQL语句查询Prometheus的数据。
- Service Discovery：用来发现监控目标的自动发现，常用的有基于Kubernetes、Consul、Eureka、文件的自动发现等。
- Grafana：用于展示数据，便于数据的查询和观测。

## Prometheus 安装

Prometheus 有多种安装方式，比如二进制安装、容器安装和 Kubernetes 集群中安装，将 Prometheus 安装到Kubernetes 集群中也是官方推荐的部署方式。

将Prometheus安装到Kubernetes集群也有很多方式，比如 Helm、Operator 等，Prometheus 也是支持上述安装方式的。但是Prometheus是一个生态系统，有很多组件都需要安装，并且也有很多监控需要单独配置，于是Prometheus 官方开源了一个 [kube-prometheus](https://github.com/prometheus-operator/kube-prometheus/) 项目，该项目不仅仅是用来安装 Prometheus 的，也包含很多其他的组件，如下所示：

- Prometheus Operator
- 高可用的 Prometheus
- 高可用的 Alertmanager
- 主机监控 Node Exporter
- Prometheus Adapter
- 容器监控 kube-state-metrics
- 图形化展示 Grafana

具体可以通过` ``https://github.com/prometheus-operator/kube-prometheus/`` `找到该项目进行查看。有了`kube-prometheus`项目，安装也变得非常简单，只需要两条命令即可。

首先需要通过该项目地址找到和自己Kubernetes版本对应的Kube Prometheus Stack的版本，我们使用的 kubernetes 1.32.2 ，那么对应的 Kube Prometheus Stack 版本是 release-0.15 。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/02.png)

从 github 下载 对应分支的代码 

```Bash
# 下载源码 
# git clone -b release-0.15 https://github.com/prometheus-operator/kube-prometheus.git 
# 创建命名空间和CR
kubectl  create -f manifests-orig/setup

# 部署相关组件 
kubectl apply -f manifests-orig/
```

查看 Prometheus 容器的状态

```Bash
[root@master-01 ~]# kubectl  get pods  -n monitoring 
NAME                                   READY   STATUS    RESTARTS   AGE
alertmanager-main-0                    2/2     Running   0          41h
alertmanager-main-1                    2/2     Running   0          41h
alertmanager-main-2                    2/2     Running   0          41h
blackbox-exporter-d989f64d9-9x7dn      3/3     Running   0          41h
grafana-8665b584b-bb2jr                1/1     Running   0          41h
kube-state-metrics-76ddfbb447-j7clv    3/3     Running   0          41h
node-exporter-bcp2h                    2/2     Running   0          41h
node-exporter-gn26s                    2/2     Running   0          41h
node-exporter-xw6p7                    2/2     Running   0          41h
prometheus-adapter-599c88b6c4-6b8vv    1/1     Running   0          41h
prometheus-adapter-599c88b6c4-s62n2    1/1     Running   0          41h
prometheus-k8s-0                       2/2     Running   0          41h
prometheus-k8s-1                       2/2     Running   0          41h
prometheus-operator-6b64df5498-6xrxt   2/2     Running   0          41h
```

为了后期更新方便，这里按照类型把相关对象的资源清单文件 放在不同的目录下，命令如下：

```Bash
mkdir alertmanager grafana kubeStateMetrics nodeExporter prometheusAdapter prometheusOperator prometheus blackboxExporter kubernetesControlPlane

mv alertmanager-* alertmanager
mv grafana-* grafana
mv kubeStateMetrics-* kubeStateMetrics
mv nodeExporter-* nodeExporter
mv prometheusAdapter-* prometheusAdapter 
mv prometheusOperator-* prometheusOperator 
mv prometheus-* prometheus
mv blackboxExporter-* blackboxExporter
mv kubernetesControlPlane-* kubernetesControlPlane


[root@master-01 manifests]# ll
total 40
drwxr-xr-x 2 root root  313 Dec 19 16:28 alertmanager
drwxr-xr-x 2 root root 4096 Dec 12 16:13 blackboxExporter
drwxr-xr-x 2 root root 4096 Dec 19 16:32 grafana
-rw-r--r-- 1 root root 4361 Aug  8 00:12 kubePrometheus-prometheusRule.yaml
drwxr-xr-x 2 root root 4096 Dec 12 16:13 kubernetesControlPlane
drwxr-xr-x 2 root root 4096 Dec 12 16:12 kubeStateMetrics
drwxr-xr-x 2 root root  314 Dec 12 16:12 nodeExporter
drwxr-xr-x 2 root root 4096 Dec 19 16:35 prometheus
drwxr-xr-x 2 root root 4096 Dec 12 16:12 prometheusAdapter
drwxr-xr-x 2 root root 4096 Dec 12 16:12 prometheusOperator
drwxr-xr-x 2 root root 4096 Aug  8 00:12 setup
```

安装成功后就可以访问 Grafana 和 Prometheus Web UI 

```Bash
[root@master-01 manifests]# kubectl  -n monitoring  get svc 
NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                         AGE
grafana                 NodePort    10.100.55.197    <none>        3000:30030/TCP                  24h               24h
prometheus-k8s          NodePort    10.100.108.119   <none>        9090:30090/TCP,8080:31180/TCP   24h
```

Grafana 和 Prometheus Web UI 默认使用 ClusterIP，我们需要将SVC的类型修改为 NodePort。 

Grafana 默认用户名、密码均为 admin 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/03.png)

Kube-promethues 项目默认已经添加了常用的监控目标。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/04.png)

## 云原生应用监控

### 监控数据来源 

从Prometheus的架构中了解到，Prometheus通常采用`Pull`的形式来拉取数据，也就意味着被监控应用只要有一个能获取到监控数据的接口，就可以采集到监控数据。

基于云原生理念开发的程序自己会暴露`Metrics`接口，就像Kubernetes本身的组件、Etcd等，都有一个`/metrics`接口，Prometheus 只需要请求这个接口即可获取到相关数据。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/05.png)

### 什么是 ServiceMonitor 

如果使用二进制的方式安装 Prometheus，用户需要通过 Prometheus 的一个配置文件来配置需要监控哪些数据，或者配置一些告警策略。这个配置文件的维护非常麻烦，特别是监控项非常多的情况下，很容易出现配置错误，而在Kubernetes上部署Prometheus，可以不用去维护这个配置文件，而是通过一个叫`ServiceMonitor` 的资源来自动发现监控目标并动态生成配置。

### 监控 example-app 应用 

1. 部署应用

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

1. 为应用创建  SVC  

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

1. 创建 serviceMonitor 

```YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
  labels:
    team: frontend
    app.kubernetes.io/part-of: kube-prometheus
spec:
  jobLabel: app.kubernetes.io/name
  selector:
    matchLabels:
      app: example-app
  namespaceSelector:
    matchNames:
    - default 
  endpoints:
  - port: web
```

1. 验证

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/06.png)

### 监控 etcd 

1. 创建 etcd svc 

```YAML
apiVersion: v1
kind: Service
metadata:
  labels:
    app: kube-etcd
  name: kube-etcd
  namespace: kube-system
spec:
  ports:
  - name: http-metrics
    port: 2381
    protocol: TCP
    targetPort: 2381
  selector:
    component: etcd
  type: ClusterIP
```

1. 创建 serviceMonitor  

```YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-etcd 
  namespace: kube-system
  labels:
    app.kubernetes.io/part-of: kube-prometheus
spec:
  jobLabel: component
  selector:
    matchLabels:
      app: kube-etcd 
  namespaceSelector:
    matchNames:
    - kube-system 
  endpoints:
  - port: http-metrics
```

1. 验证抓取目标是否生效 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/07.png)

```Bash
推荐修改/etc/kubernetes/manifests/kube-controller-manager.yaml 
/etc/kubernetes/manifests/kube-scheduler.yaml
/etc/kubernetes/manifests/etcd.yaml
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/08.png)

1. 为 etcd 配置 dashboard 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/09.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/10.png)

## 非云原生应用监控  

#### 配置 mysql-exporter 

非云原生应用的监控需要安装对应的 exporter，我们看一下如何实现  MySQL 的监控。 

1. [安装 mysql-exporter ](https://github.com/prometheus/mysqld_exporter)

```Bash
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.16.0/mysqld_exporter-0.16.0.linux-amd64.tar.gz
tar xvf mysqld_exporter-0.16.0.linux-amd64.tar.gz  -C /usr/local/
ln -s /usr/local/mysqld_exporter-0.16.0.linux-amd64  /usr/local/mysqld_exporter
cd /usr/local/mysqld_exporter
```

1. 创建授权 

MySQL 

```Bash
dnf -y install mariadb-server mariadb
systemctl enable --now mariadb


CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'UPKeH%EsT4syjA' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';



nohup ./mysqld_exporter &

curl 192.168.5.110:9104/metrics
```

MariaDB

```SQL

```

连接 mysql 需要用户名、密码，所以下载之后，首先要创建配置文件，把用户名、密码以及mysql服务器地址，这些基本信息填进去。

在 `mysqld_exporter` 的目录下，创建一个 `.my.cnf` 的文件，内容参考下面的内容：

```Bash
[client]
host=127.0.0.1
port=3306
user=exporter
password=3HdexTlk3nOw0k!3Nji
```

1. 启动 mysql_exporter 

```Bash
./mysqld_exporter
```

mysql_exporter 默认监听 9104 端口，请求 mysql_exporter 对外暴露的 metrics 接口。 

```Bash
[root@db-srv mysqld_exporter]# curl 127.0.0.1:9104/metrics 
# HELP go_gc_duration_seconds A summary of the wall-time pause (stop-the-world) duration in garbage collection cycles.
# TYPE go_gc_duration_seconds summary
go_gc_duration_seconds{quantile="0"} 4.5418e-05
go_gc_duration_seconds{quantile="0.25"} 4.7015e-05
go_gc_duration_seconds{quantile="0.5"} 4.8137e-05
... ...
```

#### 配置 抓取目标

我们需要在 Prometheus 配置文件中添加一个 Job，用来配置抓取 mysql-exporter metric endpoint， 有两种配置方式，一种是使用 prometheus-operator 提供 CRD  ScrapeConfig ，另一种方法是让prometheus 加载外部配置文件。 

tar/monitor/19-monitor/kube-prometheus/manifests/custom-config

**第一种方法：** 

修改 prometheus 

```YAML
spec:
  scrapeConfigSelector:
    matchLabels:
      prometheus: system-monitoring-prometheus
```

添加抓取目标 

```YAML
apiVersion: monitoring.coreos.com/v1alpha1
kind: ScrapeConfig
metadata:
  name: static-config
  namespace: monitoring
  labels:
    prometheus: system-monitoring-prometheus 
spec:
  staticConfigs:
    - labels:
        job: mysql
      targets:
        - 192.168.11.42:9104
```

验证

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/11.png)

**第二种方法：** 

配置 prometheus 抓取 `mysqld_exporter` 暴露的 metrics 信息。 

我们前面配置监控目标时，用的都是ServiceMonitor，但是ServiceMonitor可能会有一些限制。比如，如果没有安装Prometheus Operator，可能就无法使用ServiceMonitor，另外并不是所有的监控都能使用ServiceMonitor进行配置，或者使用ServiceMonitor配置显得过于繁琐。此处我们使用 prometheus 默认的配置文件，添加一个抓取mysql 的 job。 

首先创建一个空文件，然后通过该文件创建一个 Secret，这个 Secret 可作为 Prometheus 的静态配置：

```Bash
$ touch additional-scrape-configs.yaml
$ kubectl  -n monitoring  create secret generic additional-scrape-configs --from-file=additional-scrape-configs.yaml
```

创建完 Secret后，需要编辑 Prometheus 的配置，加载我们自己创建的外部配置文件 。 

```Bash
 kubectl edit prometheus -n monitoring k8s
```

添加以下 配置文件 ，不需要重启 Prometheus 即可生效。之后在` additional-scrape-configs.yaml`  文件内添加我们需要的静态配置即可。 

```YAML
spec:
  additionalScrapeConfigs:
    name: additional-scrape-configs      # secret-name 
    key: additional-scrape-configs.yaml  # key 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/12.png)

```
additional-scrape-configs.yaml
- job_name: mysql
  static_configs:
    - targets:
      - 192.168.11.42:9104
```

可以看到此处的内容和传统配置的内容一致，只需要添加对应的job即可。之后通过该文件更新该 Secret：

```Bash
# kubectl  -n monitoring  create secret generic additional-scrape-configs --from-file=additional-scrape-configs.yaml --dry-run=client -o yaml | kubectl  -n monitoring  apply -f - 
```

在 prometheus 的配置文件中可以验证 job 已经添加成功。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/13.png)

在 Targets 中也可以看到 mysql 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/14.png)

最后在 Grafana 中创建 Dashboard，导入 MySQL Dashboard `14057` 。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/15.png)

## [Blackbox](https://github.com/prometheus/blackbox_exporter) 黑盒监控

对 Etcd 或MySQL 的监控是监控应用本身，也就是程序内部的一些指标，这类监控关注的是原因，一般为出现问题的根本原因，此类监控称为白盒监控。还有一类监控关注的是现象，比如某个网站突然慢了，或者打不开了。此类告警是站在用户的角度看到的东西，比较关注现象，表示正在发生的问题，这类监控称为黑盒监控。

白盒监控可以通过Exporter采集数据，黑盒监控也可以通过Exporter采集数据，新版本的PrometheusStack已经默认安装了Blackbox Exporter，可以用其采集某个域名、接口或者TCP连接的状态、是否可用等。

### Prometheus 静态配置

 前面几个小节配置监控目标时，用的都是ServiceMonitor，但是ServiceMonitor可能会有一些限制。比如，如果没有安装Prometheus Operator，可能就无法使用ServiceMonitor，另外并不是所有的监控都能使用ServiceMonitor进行配置，或者使用ServiceMonitor配置显得过于繁琐。

在 `additional-scrape-configs.yaml` 文件内继续添加以下静态配置，用于黑盒监控的配置：

```YAML
- job_name: 'blackbox-web'
  metrics_path: /probe
  params:
    module: [http_2xx]  # Look for a HTTP 200 response.
  static_configs:
    - targets:
      - http://prometheus.io    # Target to probe with http.
      - https://prometheus.io   # Target to probe with https.
      - http://www.xinxianghf.cn 
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: blackbox-exporter:19115  # The blackbox exporter's real hostname:port.
```

可以看到此处的内容和传统配置的内容一致，只需要添加对应的job即可。之后通过该文件更新该Secret：

```Bash
kubectl  -n monitoring  create secret generic additional-scrape-configs --from-file=additional-scrape-configs.yaml --dry-run=client -o yaml | kubectl  -n monitoring  replace  -f - 
```

验证配置文件 是否生效 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/16.png)

检查  Targets 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/17.png)

登录 Grafana，导入Dashboard  13659，导入完成后，稍等一分钟即可在 Prometheus Web UI 看到该配置。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/18.png)

## 配置告警

从配置文件可以看出，`Alertmanager `的配置主要分为5大块：

```YAML
global:
  # The smarthost and SMTP sender used for mail notifications.
  smtp_smarthost: 'localhost:25'
  smtp_from: 'alertmanager@example.org'
  smtp_auth_username: 'alertmanager'
  smtp_auth_password: 'password'

# The directory from which notification templates are read.
templates:
  - '/etc/alertmanager/template/*.tmpl'

# The root route on which each incoming alert enters.
route:

  group_by: ['job', 'namespace', 'alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h

  # A default receiver
  receiver: default-team-mails

  # All the above attributes are inherited by all child routes and can
  # overwritten on each.

  # The child route trees.
  routes:
    - receiver: team-X-pager
      match_re:
        job: node_exporter 
      continue: true 
    - receiver: team-X-pager
        match_re:
        job: mysqld_exporter
      continue: true 
    - receiver: team-DB-pager
        match_re:
        job: .*
      continue: true 

inhibit_rules:
  - source_matchers: [severity="critical"]
    target_matchers: [severity="warning"]
    equal: [alertname, cluster, service]

receivers:
  - name: 'team-X-mails'
    email_configs:
      - to: 'team-X+alerts@example.org'

  - name: 'team-X-pager'
    email_configs:
      - to: 'team-X+alerts-critical@example.org'

  - name: 'team-Y-pager'
    pagerduty_configs:
      - service_key: <team-Y-key>

  - name: 'team-DB-pager'
    pagerduty_configs:
      - service_key: <team-DB-key>
```

- Global：全局配置，主要进行一些通用的配置，比如邮件通知的账号、密码、SMTP服务器、微信告警等。Global块配置下的配置选项在本配置文件内的所有配置项下可见，但是文件内其他位置的子配置可以覆盖Global配置。
- Templates：用于放置自定义模板的位置。
- Route：告警路由配置，用于告警信息的分组路由，可以将不同分组的告警发送给不同的收件人。比如将数据库告警发送给DBA，服务器告警发送给OPS。
- Inhibit_rules：告警抑制，主要用于减少告警的次数，防止“告警轰炸”。比如某个宿主机宕机，可能会引起容器重建、漂移、服务不可用等一系列问题，如果每个异常均有告警，会一次性发送很多告警，造成告警轰炸，并且也会干扰定位问题的思路，所以可以使用告警抑制，屏蔽由宿主机宕机引来的其他问题，只发送宿主机宕机的消息即可。
- Receivers：告警收件人配置，每个receiver都有一个名字，经过route分组并且路由后需要指定一个receiver，就在此处配置。

### 路由规则 

Alertmanager 的配置比较复杂且经常需要变更，我们详细看一下： 

```YAML
route:
  group_by: ['job', 'namespace', 'alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h

  # A default receiver
  receiver: default-team-mails

  # The child route trees.
  routes:
    - receiver: team-X-pager
      match_re:
        job: node_exporter 
      continue: true 
    - receiver: team-X-pager
        match_re:
        job: mysqld_exporter
      continue: true 
    - receiver: team-DB-pager
        match_re:
        job: .*
      continue: true 
```

从配置文件可以看出，路由配置块的顶级配置由`route`开始，它是整个路由的入口，称作根路由。每一条告警进来后，都先进入route，之后根据告警自身的标签和`route.group_by`配置的字段进行分组。比如可以根据job、alertname或者其他自定义的标签名称进行分组，分组后进入子路由（通过`route.routes`配置子路由），进一步进行更加细粒度的划分，比如job名称包含`mysql`的发送给DBA组。

Route 常用的配置：

- receiver：告警的通知目标，需要和receivers配置中的name进行匹配。需要注意的是，route.routes下也可以有receiver配置，优先级高于route.receiver配置的默认接收人，当告警没有匹配到子路由时，会使用route.receiver进行通知，比如上述配置中的 default-team-mails。
- group_by：分组配置，值类型为列表。比如配置成['job', 'severity']，代表告警信息包含job和severity标签的会进行分组，且标签的key和value都相同才会被分到一组。
- continue：决定匹配到第一个路由后，是否继续后续匹配。默认为false，即匹配到第一个子节点后停止继续匹配。
- match：一对一匹配规则，比如match配置的为job: mysql，那么具有job=mysql的告警会进入该路由。
- match_re：和match类似，只不过match_re是正则匹配。
- matchers：这是Alertmanager 0.22版本新添加的一个配置项，用于替换match和match_re。
- group_wait：告警通知等待，值类型为字符串。若一组新的告警产生，则会等group_wait后再发送通知，该功能主要用于当告警在很短时间内接连产生时，在group_wait内合并为单一的告警后再发送，防止告警过多，默认值为30s。
- group_interval：同一组告警通知后，如果有新的告警添加到该组中，再次发送告警通知的时间，默认值为5m。
- repeat_interval：如果一条告警通知已成功发送，且在间隔repeat_interval后，该告警仍然未被设置为resolved，则会再次发送该告警通知，默认值为4h。

以上即为Alertmanager常用的路由配置，可以看到 Alertmanager 的路由和匹配规则非常灵活，通过不同的路由嵌套和匹配规则可以达到不同的通知效果。

### 配置钉钉告警

Alertmanager 的配置文件是通过 Secret 进行存储的，其原始文件为 `alertmanager-secret.yaml`，内容大致如下：

```YAML
apiVersion: v1
kind: Secret
metadata:
  labels:
    app.kubernetes.io/component: alert-router
    app.kubernetes.io/instance: main
    app.kubernetes.io/name: alertmanager
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.28.1
  name: alertmanager-main
  namespace: monitoring
stringData:
  alertmanager.yaml: |-
    "global":
      "resolve_timeout": "5m"

    "receivers":
    - "name": "dingtalk"
      webhook_configs:
        - url: http://192.168.11.58:8060/dingtalk/webhook/send
          send_resolved: true

    "route":
      "group_by":
      - "namespace"
      - "job"
      - "alertname"
      "group_interval": "5m"
      "group_wait": "30s"
      "receiver": "dingtalk"
      "repeat_interval": "12h"
      "routes":
       - receiver: 'dingtalk'
         matchers:
         - alertname =~ "InfoInhibitor|Watchdog"
type: Opaque
```

修改后重新应用， alertmanager 会自动加载新的配置文件 。 

```Bash
kubectl apply -f alertmanager-secret.yaml



修改之后需要去webhook配置文件中配置config.yaml配置文件的报警模版和关键词
```

等一会就可以在钉钉上收到告警消息了。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/19.png)

## Prometheus 高可用

- 多 prometheus 实例   
- Thanos  
- VictoriaMetrics 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/kubernetes/kubernetes-20/20.png)