---
title: "20 - 日志方案_EFK"
date: 2026-04-06T18:15:04+08:00
lastmod: 2026-04-06T18:15:04+08:00
draft: false
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195222_524_12.jpg"
tags: ["Kubernetes", "K8s", "日志", "EFK", "Elasticsearch", "Fluentd", "Kibana", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 日志方案 EFK（Elasticsearch + Fluentd + Kibana）的架构、部署与运维，解决容器日志收集与分析问题。"
slug: "k8s-efk-logging-solution"
keywords: ["K8s EFK", "Kubernetes 日志", "Elasticsearch", "Fluentd", "Kibana", "云原生运维"]
---

## Pod 日志收集

应用程序和系统日志可以帮助我们了解集群内部的运行情况，日志对于我们调试问题和监视集群情况也是非常有用的。而且大部分的应用都会有日志记录，对于传统的应用大部分都会写入到本地的日志文件之中。对于容器化应用程序来说则更简单，**只需要将日志信息写入到** **stdout** **和** **stderr** **即可**，容器默认情况下就会把这些日志输出到宿主机上的一个 JSON 文件之中，同样我们也可以通过 docker logs 或者 kubectl logs 来查看到对应的日志信息。

但是，通常来说容器引擎或运行时提供的功能不足以记录完整的日志信息，比如，如果容器崩溃了、Pod 被驱逐了或者节点挂掉了，我们仍然也希望访问应用程序的日志。所以，日志应该独立于节点、Pod 或容器的生命周期，这种设计方式被称为 cluster-level-logging，即完全独立于 Kubernetes 系统，需要自己提供单独的日志后端存储、分析和查询工具。

Kubernetes 中大多数的 Pod 日志被输出到控制台，在宿主机的文件系统每个Pod会创建一个存放日志的文件夹`/var/log/pods/`这里会存放所有这个节点运行的Pod的日志，但是这个文件夹下一般都是软连接，由于Kubernetes 底层的 CRI 容器运行时可以使用很多所以日志本身并不存放在这个文件夹，以下为容器运行时真正存放日志目录：

- container log: `/var/log/containers/*.log`
- Pod log：`/var/log/pods`

## 集群级别日志架构 

- 使用在每个节点上运行的节点级日志记录代理。
- 在应用程序的 Pod 中，包含专门记录日志的边车（Sidecar）容器。
- 将日志直接从应用程序中推送到日志记录后端。

### 使用节点级日志代理

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NDMwODliZGMxZmQxMWM4ZmY0YWUzOTJlNWM0ODE2M2NfbkJ6d25wVnJBc2pqNjRneGk2dFlBaW9EZ2MwcHRMNjNfVG9rZW46QUdNUmJVcHVxb25iZll4TndURmNNTEpjbmNmXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

可以通过在每个节点上使用 **节点级的****日志记录****代理** 来实现集群级日志记录。 日志记录代理是一种用于暴露日志或将日志推送到后端的专用工具。 通常，日志记录代理程序是一个容器，它可以访问包含该节点上所有应用程序容器的日志文件的目录。

由于日志记录代理必须在每个节点上运行，推荐以 `DaemonSet` 的形式运行该代理。

节点级日志在每个节点上仅创建一个代理，不需要对节点上的应用做修改。

容器向标准输出和标准错误输出写出数据，但在格式上并不统一。 节点级代理收集这些日志并将其进行转发以完成汇总。

### 使用边车容器运行日志代理[ ](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/logging/#sidecar-container-with-logging-agent) sidecar 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MDNjODBjODY5YTY4MzE4MDg3Y2ZhZTU5YTNjN2NhMTBfdVhWZkJkencwQUhOd2JGeGJlWkRJTDlkRFNSOExITlZfVG9rZW46TXRwaWJPaElib21MUWZ4S1I0WGNsYW9HbmNmXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

### 从应用中直接暴露日志目录

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ZWIxMjc4YjY0OTZlNGJjNzZjYjkzZjQwOWYxMjEwNjhfMEhZaGNYck83eFoxUDE0OHJvSDdNRmxXb1RWMVpjZmNfVG9rZW46Q3VQWGJGYVdCb2JFbVl4RXdNZGNvT2ZMbmFiXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

## EFK 

Yum 仓库 

```Bash
rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

 vim /etc/yum.repos.d/elasic.repo
[elasticsearch]
name=Elasticsearch repository for 7.x packages
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
```

### [Elasticsearch ](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/rpm.html)

Elasticsearch 是一个开源的分布式搜索和分析引擎，建立在 Apache Lucene 库之上。它提供了一个高性能、可伸缩和全文搜索能力强大的分布式系统，适用于处理大规模数据集的搜索、分析和近实时数据处理。

```Bash
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.17.16-x86_64.rpm
rpm --install elasticsearch-7.17.16-x86_64.rpm
```

检查集群状态 

```Bash
# 列出节点健康状态
curl -XGET 127.0.0.1:9200/_cat/health?v
# 显示cluster状态
curl -XGET 127.0.0.1:9200/_cluster/health\?pretty
# 列出 master节点
curl -XGET 127.0.0.1:9200/_cat/master?v
# 列出节点及利用率
curl -XGET 127.0.0.1:9200/_cat/nodes?v
# 显示索引 
curl localhost:9200/_cat/indices?v
```

### [Kibana](https://www.elastic.co/guide/en/kibana/7.17/rpm.html)

Kibana是一个开源的数据可视化和分析平台，与Elasticsearch紧密集成。它提供了一个直观的Web界面，让用户能够轻松地探索、分析和可视化存储在Elasticsearch中的数据。

```Bash
wget https://artifacts.elastic.co/downloads/kibana/kibana-7.17.16-x86_64.rpm
```

### [Filebeat](https://www.elastic.co/guide/en/beats/filebeat/7.17/setup-repositories.html)

Filebeat是一个轻量级的开源日志数据收集器，由Elasticsearch提供支持。它专门用于收集、解析和发送日志文件和其他结构化数据到Elasticsearch或Logstash等目标系统进行处理和分析。

```YAML
# ============================== Filebeat inputs ===============================
filebeat.inputs:

# Each - is an input. Most options can be set at the input level, so
# you can use different inputs for various configurations.
# Below are the input specific configurations.

# filestream is an input for collecting log messages from files.
- type: filestream

  # Unique ID among all inputs, an ID is required.
  id: my-filestream-id

  # Change to true to enable this input configuration.
  enabled: false

  # Paths that should be crawled and fetched. Glob based paths.
  paths:
    - /var/log/*.log
    #- c:\programdata\elasticsearch\logs\*


# ================================== Outputs ===================================

# Configure what output to use when sending the data collected by the beat.

# ---------------------------- Elasticsearch Output ----------------------------
output.elasticsearch:
  # Array of hosts to connect to.
  hosts: ["localhost:9200"]

  # Protocol - either `http` (default) or `https`.
  #protocol: "https"
```

## EFK on Kubernetes 

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=YTIxMTRiYTFlMjM0ZmIzNTM3ODY4YTU3ZDM0MWYxNzhfb0p0VDQ2Qk5JYXEzampaMlJGd3NVQmVPa2t4dzVhMEZfVG9rZW46Qm5JSWI3b1JHb09EY3V4QWRYMGNSMktvbmdnXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

### 安装 ElasticSearch    

```Bash
# Add the Elastic Helm charts repo
helm repo add elastic https://helm.elastic.co

# 查询版本 我们使用 7.17.3
[root@master-01 ~]# helm search repo  elastic/elasticsearch  -l
NAME                         CHART VERSION        APP VERSION        DESCRIPTION                                  
elastic/elasticsearch        8.5.1                8.5.1              Official Elastic helm chart for Elasticsearch
elastic/elasticsearch        7.17.3               7.17.3             Official Elastic helm chart for Elasticsearch
elastic/elasticsearch        7.17.1               7.17.1             Official Elastic helm chart for Elasticsearch
elastic/elasticsearch        7.16.3               7.16.3             Official Elastic helm chart for Elasticsearch
elastic/elasticsearch        7.16.2               7.16.2             Official Elastic helm chart for Elasticsearch

[root@master-01 ~]#  helm pull elastic/elasticsearch --version=7.17.3
```

修改 values

```Bash

```

安装

```Bash
[root@master-01 20-log]# helm upgrade --install els -n logging -f elasticsearch/els-values.yaml  ./elasticsearch --create-namespace --namespace logging  
NAME: els
LAST DEPLOYED: Sat Nov 18 20:17:57 2023
NAMESPACE: logging
STATUS: deployed
REVISION: 1
NOTES:
1. Watch all cluster members come up.
  $ kubectl get pods --namespace=logging -l app=elasticsearch-master -w2. Test cluster health using Helm test.
  $ helm --namespace=logging test els
```

集群验证

```Bash
[root@master-01 20-log]# kubectl get pods --namespace=logging -o wide 
NAME                     READY   STATUS    RESTARTS   AGE   IP               NODE        NOMINATED NODE   READINESS GATES
elasticsearch-master-0   1/1     Running   0          99s   10.244.171.24    worker-01   <none>           <none>
elasticsearch-master-1   1/1     Running   0          74s   10.244.184.101   master-01   <none>           <none>

[root@master-01 20-log]# curl 10.244.37.199:9200/_cluster/health?pretty
{"cluster_name":"elasticsearch","status":"green","timed_out":false,"number_of_nodes":2,"number_of_data_nodes":2,"active_primary_shards":1,"active_shards":2,"relocating_shards":0,"initializing_shards":0,"unassigned_shards":0,"delayed_unassigned_shards":0,"number_of_pending_tasks":0,"number_of_in_flight_fetch":0,"task_max_waiting_in_queue_millis":0,"active_shards_percent_as_number":100.0}
```

### 安装 Kibana

```Bash
[root@master-01 20-log]# helm search repo  elastic/kibana -l
NAME                  CHART VERSION        APP VERSION        DESCRIPTION                           
elastic/kibana        8.5.1                8.5.1              Official Elastic helm chart for Kibana
elastic/kibana        7.17.3               7.17.3             Official Elastic helm chart for Kibana
elastic/kibana        7.17.1               7.17.1             Official Elastic helm chart for Kibana

# 拉取 chart
helm pull elastic/kibana --version=7.17.3
[root@master-01 20-log]# helm -n logging upgrade --install  kibana -f kibana/kibana-values.yaml  ./kibana
NAME: kibana
LAST DEPLOYED: Sat Nov 18 20:49:28 2023
NAMESPACE: logging
STATUS: deployed
REVISION: 1
TEST SUITE: None

# 更新
[root@master-01 20-log]# helm -n logging upgrade kibana -f kibana/kibana-values.yaml  ./kibana
Release "kibana" has been upgraded. Happy Helming!
NAME: kibana
LAST DEPLOYED: Sat Nov 18 21:14:34 2023
NAMESPACE: logging
STATUS: deployed
REVISION: 2
TEST SUITE: None
```

修改 Kibana SVC 使用 NodePort 

```Bash
type: NodePort
```

### 安装 Filebeat

```Bash
[root@master-01 20-log]# helm search repo  elastic/filebeat  -l
NAME                    CHART VERSION        APP VERSION        DESCRIPTION                             
elastic/filebeat        8.5.1                8.5.1              Official Elastic helm chart for Filebeat
elastic/filebeat        7.17.3               7.17.3             Official Elastic helm chart for Filebeat
elastic/filebeat        7.17.1               7.17.1             Official Elastic helm chart for Filebeat
elastic/filebeat        7.16.3               7.16.3             Official Elastic helm chart for Filebeat

[root@master-01 20-log]# helm pull elastic/filebeat --version=7.17.3
[root@master-01 20-log]# helm -n logging install filebeat  -f filebeat/filebeat-values-1.yaml  ./filebeat

NAME: filebeat
LAST DEPLOYED: Sat Nov 18 21:53:15 2023
NAMESPACE: logging
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
1. Watch all containers come up.
  $ kubectl get pods --namespace=logging -l app=filebeat-filebeat -w
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=YjI3YWUxZDJjZDlkMjlhYTQwNGY3OTYyNTAzM2QzYmVfbUR3NExGWmh1TVhnT1puMEo4MGVVRmRudmwycUgyc2ZfVG9rZW46QlJxYWJHdnllb1ZPeEp4WWcwWGNLR1BobnZnXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

```YAML
https://artifacthub.io/packages/helm/elastic/elasticsearch

https://artifacthub.io/packages/helm/elastic/kibana

https://artifacthub.io/packages/helm/fluent/fluentd


helm repo add elastic https://helm.elastic.co
```

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NTFhMjFhNTBmZjFiZDJjMDIyZGIzYmIwOTZmOTQ5YWJfYzcwR0JaN2hrOTVpcXRLNGdJNmhEb1RYT1VGSHFoUnJfVG9rZW46SVh2ZGI5OTdUb0tCdG54cDdlTmNWQlEzbmhmXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

## 附录：

Elasticsearch 基础概念

### 集群 Cluster 

Elasticsearch 集群是一组 Elasticsearch 节点的集合。节点根据用途不同会划分出不同的角色，且节点之间相互通信。Elasticsearch集群常用于处理大规模数据集，目的是实现容错和高可用。Elasticsearch 集群需要一个唯一标识的集群名称来防止不必要的节点加入。

### 节点  node 

节点是指一个Elasticsearch实例，更确切地说，它是一个Elasticsearch进程。节点可以部署到物理机或者虚拟机上。每当Elasticsearch启动时，节点就会开始运行。每个节点都有唯一标识的名称，在部署多节点集群环境的时候我们要注意不要写错节点名称。

### 索引  index   

索引是 Elasticsearch 中用于存储和管理相关数据的逻辑容器。**索引可以看作数据库中的一个表**，它包含了一组具有相似结构的文档。在 Elasticsearch 中，数据以JSON格式的文档存储在索引内。每个索引具有唯一的名称，以便在执行搜索、更新和删除操作时进行引用。索引的名称可以由用户自定义，但必须全部小写。

### 分片  shard 

分片包含索引数据的一个子集，并且其本身具有完整的功能和独立性，可以将分片近似看作“独立索引“，分片是Elasticsearch 分布式存储的基石，是底层的基本读写单元。分片的目的是分割巨大的索引，将数据分散到集群内各处。

分片分为主分片和副本分片，一般情况，一个主分片有多个副本分片。主分片负责处理写入请求和存储数据，副本分片只负责存储数据，是主分片的拷贝，文档会存储在具体的某个主分片和副本分片上。

![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NGI3ZWNhYmRkMGU3NTdlY2M0ZGRlM2Y3NWE4MTk4YjZfTGdISnl3bjVqWGR0UVZNYVlUTVA1T3d5emhoWEFWTFdfVG9rZW46QnA0S2I2WE1xbzBHTXp4MlJURWNXSWp0bkJjXzE3NzU0NzA2NTQ6MTc3NTQ3NDI1NF9WNA)

### Xpack  安全，开启 elasticsearch 验证 

https://www.elastic.co/guide/en/elasticsearch/reference/7.16/security-minimal-setup.html
