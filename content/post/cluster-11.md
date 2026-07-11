---
title: "上传本地Prometheus及相关软件包"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["集群", "Obsidian"]
categories: ["集群"]
slug: "cluster-11"
description: "从 Obsidian 导入的 集群 学习笔记"
---
## Prometheus 监控部署教程

## 一、Prometheus 介绍

### 1. 什么是Prometheus？

Prometheus 是一个开源的报警系统和监控工具包，是由SoundCloud公司开发的开源监控报警系统和时序数据库(TSDB)。Prometheus使用Go语言开发，是Google BorgMon监控系统的开源版本。从 2012 年成立以来，许多公司和组织都采用promethues，并且该项目有着很活跃的社区和开发者；现在是一个开源项目，可以独立于任何公司进行维护；2016年prometheus成为继Kubernetes之后第二个加入Linux基金会旗下的原生云基金会(Cloud Native Computing Foundation)的托管项目。

官网：https://prometheus.io/     文献：https://prometheus.io/docs/introduction/overview/

### 2. 各监控系统对比

|    监控方案    |     数据收集     | 自动发现         | 侧重点             | 数据展示方案                 | 贴合云原生 |
| :------------: | :--------------: | ---------------- | ------------------ | ---------------------------- | ---------- |
|   **Cacti**    |       SNMP       | 插件支持         | 数据展示           | RRDTOOL                      | 差         |
|   **Nagios**   |   各种脚本插件   | 脚本插入         | 状态展示           | 阈值                         | 差         |
|   **Zabbix**   | zabbix-agent为主 | 主机地址自动发现 | 状态、数据展示     | PHP                          | 中等       |
| **Prometheus** |   Exporter为主   | 各种模式支持     | 以时间序列保存数据 | 通过结合Grafana 进行结合展示 | 优秀       |

### 3. Prometheus的特性

- 由 metric 名称和 K/V 键值对标识的时间序列的多维数据模型
- 简单的查询语言 PromQL（TSDB数据库的查询语言）
- 不依赖分布式存储，单个服务节点自动治理
- 通过 http 的 pull 模型获取数据的时序集合
- 支持通过网关 push 时序数据
- 通过服务发现或者静态配置发现目标
- 支持多种图表和仪表盘模式（grafana）

### 4. Prometheus架构图和组件介绍

**Prometheus Server：**负责定时去目标抓取 metrics数据，每个被抓取对象需要开放一个http服务接口；pull下来的数据经过整理后写入到本地的时序数据库（TSDB）中。

**Client Library：**客户端类库（例如官方提供的：Go，Python，Java等），为需要监控的服务产生相应的 metrics数据并开放一个http服务接口给 Prometheus Server。目前很多软件原生就支持Prometheus，提供了metrics数据，可以直接使用 Prometheus pull。对于像操作系统不提供metrics数据的情况，可以使用exporter，或者自己开发exporter来提供metrics数据服务。

 **Exporter：**泛指能向Prometheus提供监控数据（metrics数据）的都可以称为一个 exporter，一个 exporter的实例称为 target，exporter来源主要2个方面，一个是社区提供的，一种是用户自定义的。主要用来支持其他数据源的metrics数据导入到 Prometheus，支持数据库、硬件、消息中间件、存储系统、HTTP服务器、jmx等。

**PushGateway：**主要用于临时性的 short-lived job。由于这类 jobs 存在时间较短，可能在 Prometheus 来 pull 之前就消失了。对此类 jobs 定时将 metrics数据 push 到 pushgateway 上，再由 Prometheus Server 从 Pushgateway 上 pull 到本地。这种方式主要用于服务层面的metrics，对于机器层面的metrices，需要使用node exporter。

**Promdash 和 Grafana：**Prometheus内置一个简单的Web控制台Promdash，可以查询metrics数据，查看配置信息或者Service Discovery等，实际工作中，查看指标或者创建仪表盘通常使用Grafana，Prometheus作为Grafana的数据源。

**alertmanager：**从 Prometheus server 端接收到 alerts 后，会进行去除重复数据，分组，并路由到对应的接收方式上，发出报警。常见的接收方式有：电子邮件，pagerduty，OpsGenie, webhook 等。

**PromQL：**是Prometheus TSDB的查询语言。是结合Grafana进行数据展示和告警规则的配置的关键部分。

| 类型          | 通俗解释（像聊天一样）                                       | 数值特性                                         | 典型使用场景                                                 | 常用 PromQL 函数                                             |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Counter**   | “只增不减的计数器” 就像汽车里程表，只能往前跑，永远不会倒退。进程重启才会归零。 | 只增不减 （monotonically increasing） 可重置为 0 | 请求总数、错误总数、已处理任务数、GC 次数等“累计次数”        | `rate()` `irate()` `increase()`                              |
| **Gauge**     | “可以随意上下波动的指针” 像温度计、内存使用率、当前连接数，随时可能升降。 | 可增可减                                         | 当前内存使用量、CPU 使用率、队列长度、温度、在线用户数       | 直接取值 `delta()` `predict_linear()` 等                     |
| **Histogram** | “带桶的分布统计器” 把延迟、响应大小等值扔进预设的桶（如 <0.1s、<0.5s、<1s…），统计每个桶有多少次，还带总数和总和。 | 多个累加 Counter + _sum + _count                 | 请求延迟分布、响应大小分布、文件大小分布 （最常用于计算 p99、p95 等 SLO/SLI） | `histogram_quantile()` `rate()` on `_bucket` / `_sum` / `_count` |
| **Summary**   | “客户端自己算分位数的版本” 类似 Histogram，但客户端直接算出 p50/p90/p99，而不是服务器算。 | 客户端计算的分位数 + sum + count                 | 需要精确分位数，但不想让服务器负担计算 （老版本或特定场景）  | `quantile()` 等                                              |

### 5. Prometheus服务工作过程

- Prometheus Daemon负责定时去被监控目标上抓取metrics(指标)数据，每个被抓取目标需要暴露一个http服务的接口给它定时抓取。Prometheus支持通过配置文件、文本文件、Zookeeper、Consul、DNS SRV Lookup等方式指定抓取目标。Prometheus采用PULL的方式进行监控，即服务器可以直接通过目标PULL数据或者间接地通过中间网关来PULL数据。
- Prometheus 在本地处理抓取到的所有数据，并通过一定规则进行整理数据，并把得到的结果存储到新的时间序列中。
- Prometheus通过PromQL和其他API可视化地展示收集的数据。Prometheus支持很多方式的图表可视化，例如Grafana、自带的Promdash以及自身提供的模版引擎等等。Prometheus还提供HTTP API的查询方式，自定义所需要的输出。
- PushGateway支持Client主动推送metrics到PushGateway，而Prometheus只是定时去Gateway上抓取数据。
- Alertmanager是独立于Prometheus的一个组件，可以支持Prometheus的查询语句，提供十分灵活的报警方式。

### 6. 实验前准备

```shell
0.	一定要先配置多台服务器之间的时间同步（ntp 或 chrony）
dnf -y install chrony
1.	由于使用单机模式部署，所以有些软件的安装或者配置的生效需要连接到互联网(通网)
2.	为了方便识别主机身份，可以给主机设置不同的主机名和域名解析(hosts)
```

## 二、Prometheus - Prometheus Server部署

1. 下载并安装Prometheus Server服务

```shell
# 上传本地Prometheus及相关软件包
$ rz promethues.zip
$ unzip promethues.zip
$ ls -l promethues/
-rw-r--r-- 1 root root 23928771 12月 17 2019 alertmanager-0.20.0.linux-amd64.tar.gz
-rw-r--r-- 1 root root 61032119 12月 17 2019 grafana-6.5.2.linux-amd64.tar.gz
-rw-r--r-- 1 root root  8083296 12月 17 2019 node_exporter-0.18.1.linux-amd64.tar.gz
-rw-r--r-- 1 root root 58625125 12月 17 2019 prometheus-2.14.0.linux-amd64.tar.gz

# 单独解压缩Prometheus软件，完成安装
$ tar -xf prometheus-2.14.0.linux-amd64.tar.gz
$ cd prometheus-2.14.0.linux-amd64/
$ tree ./
./
├── console_libraries
│   ├── menu.lib
│   └── prom.lib
├── consoles
│   ├── index.html.example
│   ├── node-cpu.html
│   ├── node-disk.html
│   ├── node.html
│   ├── node-overview.html
│   ├── prometheus.html
│   └── prometheus-overview.html
├── LICENSE
├── NOTICE
├── prometheus		# 启动文件
├── prometheus.yml	# 配置文件(启动时被调用)
├── promtool
└── tsdb

# Prometheus安装非常简单，解压缩复制到自定义目录下即可，约定成俗的习惯：/usr/local/prometheus
$ cp -r prometheus-2.14.0.linux-amd64/ /usr/local/prometheus
```

2. 编写Prometheus service启动脚本

```shell
$ cat>/usr/local/prometheus/prometheus.service<<EOF
[Unit]
Description=Prometheus
After=network.target
 
[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/prometheus
ExecStart=/usr/local/prometheus/prometheus --config.file=/usr/local/prometheus/prometheus.yml
 
Restart=on-failure
LimitNOFILE=65536
 
[Install]
WantedBy=multi-user.target
EOF
```

3. 添加启动脚本到systemd启动管理中

```shell
$ ln -s /usr/local/prometheus/prometheus.service /etc/systemd/system/
$ systemctl daemon-reload
$ systemctl start prometheus
$ systemctl enable prometheus
$ netstat -antp | grep LISTEN | grep :9090
tcp6       0      0 :::9090                 :::*                    LISTEN      37984/prometheus

```

4. 配置文件讲解

```shell
# 配置文件（原版未改）
$ vim /usr/local/prometheus/prometheus.yml
# 我的全局配置
global:
  scrape_interval:     15s   # 将抓取间隔设置为每 15 秒，默认是每 1 分钟
  evaluation_interval: 15s   # 每隔 15 秒评估一次规则，默认是每 1 分钟
  # scrape_timeout 使用全局默认值（10 秒）

# Alertmanager 配置
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      # - alertmanager:9093

# 加载规则文件，并按照全局的 'evaluation_interval' 定期评估它们
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

# 一个抓取配置，包含且仅包含一个抓取端点：
# 这里就是 Prometheus 自身
scrape_configs:
  # 抓取到的时间序列会添加一个标签 `job=<job_name>`，这里的 job_name 是 'prometheus'
  - job_name: 'prometheus'

    # metrics_path 默认值是 '/metrics'
    # scheme 默认值是 'http'

    static_configs:
    - targets: ['localhost:9090']
# -----------------------------------------------------------------------------------------------

# 配置文件关键词介绍（由于alertmanager、exporter等都未安装，相关配置后面详细讲）
global:			# 全局配置 （如果有内部单独设定，会覆盖这个参数）
  scrape_interval:     15s
  # 全局默认的数据拉取间隔
  evaluation_interval: 15s
  # 全局默认的规则(主要是报警规则)拉取间隔
  scrape_timeout: 	   10s
  # 全局默认的单次数据拉取超时间，默认不开启，当报context deadline exceeded错误时需要在特定的job下配置该字段，注意：scrape_timeout时间不能大于scrape_interval，否则Prometheus将会报错。
alerting:		# 告警插件定义，这里会设定alertmanager这个报警插件。
rule_files:		# 告警规则，按照设定参数进行扫描加载，用于自定义报警规则（类似触发器trigger），其报警媒介由alertmanager插件实现。
scrape_configs:	# 采集配置，配置数据源，包含分组job_name以及具体target，又分为静态配置和服务发现。
```

5. 通过浏览器访问指标数据和图形化界面(效果见下图)

http://192.168.88.10:9090/metrics

http://192.168.88.10:9090/graph



## 三、Prometheus - Node Exporter部署

1. 解压缩并安装Node Exporter

```shell
$ tar -xf node_exporter-0.18.1.linux-amd64.tar.gz
$ cp -r node_exporter-0.18.1.linux-amd64 /usr/local/node_exporter
```

2. 编写Node Exporter启动脚本

```shell
$ cat>/usr/local/node_exporter/node_exporter.service<<EOF
[Unit]
Description=Node Exporter
After=network.target
Wants=network-online.target
 
[Service]
Type=simple
User=root
ExecStart=/usr/local/node_exporter/node_exporter
 
Restart=on-failure
LimitNOFILE=65536
 
[Install]
WantedBy=multi-user.target
EOF
```

3. 添加启动脚本到systemd启动管理中

```shell
$ ln -s /usr/local/node_exporter/node_exporter.service /etc/systemd/system/
$ systemctl daemon-reload
$ systemctl start node_exporter
$ systemctl enable node_exporter
systemctl enable --now node_exporter
$ netstat -antp | grep LISTEN | grep :9100
tcp6       0      0 :::9100                 :::*                    LISTEN      38150/node_exporter
```

<font color='red'>注意：以上安装除了在Prometheus Server服务器端安装也可以单独安装在其他被监控节点上</font>

4. 配置文件修改（修改Prometheus配置文件实现metrics数据获取）

```shell
$ vim /usr/local/prometheus/prometheus.yml 
# alertmanager 监控区域
alerting:
  alertmanagers:
  # 指定监控类型为静态配置
  - static_configs:
    - targets: ['127.0.0.1:9093']
    # 指定当前 alertmanager 服务器连接方式

scrape_configs:
  # 当前任务名称
  - job_name: 'prometheus'
    # 当前配置为静态配置，指定 Node_exporter 服务连接方式
    static_configs:
    - targets: ['127.0.0.1:9100','192.168.5.110:9100']
   
$ systemctl restart prometheus
#重启prometheus，加载最新配置
```

## 四、Prometheus - PromQL查询语言

​       PromQL（Prometheus Query Language）是 Prometheus 自己开发的表达式语言，语言表现力很丰富，内置函数也很多。使用它可以对时序数据进行筛选和聚合。

### 1. PromQL语法

1. 数据类型

   PromQL 表达式计算出来的值有以下几种类型：

   - **瞬时向量 (Instant vector)：** 一组时序，每个时序只有一个采样值

   - **区间向量 (Range vector)：** 一组时序，每个时序包含一段时间内的多个采样值

   - **标量数据 (Scalar)：** 

   - **字符串 (String)：** 一个字符串，暂时未用

2. 时序选择器

   2.1 **瞬时向量选择器：**瞬时向量选择器用来选择一组时序在某个采样点的采样值

   ```shell
   # 最简单的情况就是指定一个度量指标，选择出所有属于该度量指标的时序的当前采样值。比如下面的表达式
   http_requests_total  或 promhttp_metric_handler_requests_total
   
   # 可以通过在后面添加用大括号包围起来的一组标签键值对来对时序进行过滤。比如下面的表达式筛选出了 `job` 为 `prometheus`，并且 `group` 为 `canary` 的时序
   http_requests_total{job="prometheus", group="canary"}
   
   # 匹配标签值时可以是等于，也可以使用正则表达式。总共有下面几种匹配操作符：
   = ： 完全相等
   !=： 不相等
   =~： 正则表达式包含匹配
   !~： 正则表达式不包含不匹配
   
   # 下面的表达式筛选出了 environment 为 staging 或 testing 或 development，并且 method 不是 GET 的时序：
   http_requests_total{environment=~"staging|testing|development",method!="GET"}
   
   # 度量指标名可以使用内部标签 `__name__` 来匹配，表达式 `http_requests_total` 也可以写成 `{__name__="http_requests_total"}`。表达式 `{__name__=~"job:.*"}` 匹配所有度量指标名称以 `job:` 打头的时序
   {environment=~"staging|testing|development",method!="GET",__name__="http_requests_total"}
   # 这种写法效果等同于 http_requests_total{environment=~"staging|testing|development",method!="GET"}
   
   # 案例：cpu_load数据抓取（浏览器访问：http://192.168.88.10:9090/graph 进行查询）
   node_load15
   node_load15{job="prometheus"}
   node_load15{instance="192.168.88.20:9100",job="prometheus"}
   ```

   2.2 **区间向量选择器：**区间向量选择器类似于瞬时向量选择器，不同的是它选择的是过去一段时间的采样值。

   ```shell
   # 可以通过在瞬时向量选择器后面添加包含在 `[]` 里的时长来得到区间向量选择器。比如下面的表达式选出了所有度量指标为 `http_requests_total` 且 `job` 为 `prometheus` 的时序在过去 1 或 5 分钟的采样值
   node_load15{instance="192.168.88.20:9100",job="prometheus"}[1m]
   node_load15{instance="192.168.88.20:9100",job="prometheus"}[5m]
   
   # 时长的单位可以是下面几种之一
   - s：seconds
   - m：minutes
   - h：hours
   - d：days
   - w：weeks
   - y：years
   ```
   
   2.3 **偏移修饰器**

   前面介绍的选择器默认都是以当前时间为基准时间，偏移修饰器用来调整基准时间，使其往前偏移一段时间。偏移修饰器紧跟在选择器后面，使用 offset 来指定要偏移的量。

   ```shell
   # 比如下面的表达式选择度量名称为 `node_load15` 的所有时序在 `5` 分钟前的采样值。
   node_load15{instance="192.168.88.20:9100",job="prometheus"} offset 5m
   
   # 下面的表达式选择度量名称为 `node_load15` 的所有时序在 `1` 小时前的采样值，并列出连续五分钟内的采样值。
   node_load15{instance="192.168.88.20:9100",job="prometheus"}[5m] offset 1h
   ```
   

### 2. PromQL操作符（了解）

1. 二元操作符

   PromQL 的二元操作符支持基本的逻辑判断和算术运算，包含算术类、比较类和逻辑类三大类

   1.1 算术类二元操作符

   

   ```shell
   +：加
   -：减
   *：乘
   /：除
   %：求余
   ^：乘方
   
   算术类二元操作符可以使用在标量与标量、向量与标量，以及向量与向量之间
   - 标量与标量之间，结果很明显，跟通常的算术运算一致
   - 向量与标量之间，相当于把标量跟向量里的每一个值进行运算，这些计算结果组成了一个新的向量
   - 向量与向量之间，会稍微麻烦一些。运算的时候首先会为左边向量里的每一个元素在右边向量里去寻找一个匹配元素（匹配规则后面会讲），然后对这两个匹配元素执行计算，这样每对匹配元素的计算结果组成了一个新的向量。如果没有找到匹配元素，则该元素丢弃
   
   # 标量&向量：简单来比喻就是标量是一个数字，向量是一组数字！
   ```

   1.2 **比较类二元操作符**

   ```shell
   == (equal)
   != (not-equal)
   >  (greater-than)
   <  (less-than)
   >= (greater-or-equal)
   <= (less-or-equal)
   
   比较类二元操作符同样可以使用在标量与标量、向量与标量，以及向量与向量之间。默认执行的是过滤，也就是保留值
   
   也可以通过在运算符后面跟 bool 修饰符来使得返回值 0 和 1，而不是过滤
   node_load15{instance="192.168.88.130:9100"} offset 23h  >  bool 1
   
   - 标量与标量之间，必须跟 bool 修饰符，因此结果只可能是 0（false） 或 1（true）
   - 向量与标量之间，相当于把向量里的每一个值跟标量进行比较，结果为真则保留，否则丢弃。如果后面跟了 bool 修饰符，则结果分别为 1 和 0
   - 向量与向量之间，运算过程类似于算术类操作符，只不过如果比较结果为真则保留左边的值（包括度量指标和标签这些属性），否则丢弃，没找到匹配也是丢弃。如果后面跟了 bool 修饰符，则保留和丢弃时结果相应为 1 和 0
   ```

   1.3 **逻辑类二元操作符**

   ```shell
   and：	交集
   or：		并集
   unless：	补集
   
   具体运算规则如下：
   
   - `vector1 and vector2` 的结果由在 vector2 里有匹配（标签键值对组合相同）元素的 vector1 里的元素组成
   - `vector1 or vector2` 的结果由所有 vector1 里的元素加上在 vector1 里没有匹配（标签键值对组合相同）元素的 vector2 里的元素组成
   - `vector1 unless vector2` 的结果由在 vector2 里没有匹配（标签键值对组合相同）元素的 vector1 里的元素组成
   ```

   1.4 **二元操作符优先级**

   ```shell
   #PromQL 的各类二元操作符运算优先级如下：
   ^
   *, /, %
   +, -
   ==, !=, <=, <, >=, >
   and, unless
   or
   ```

   

2. 向量匹配

   前面算术类和比较类操作符都需要在向量之间进行匹配。共有两种匹配类型，`one-to-one` 和 `many-to-one` | `one-to-many`

   **One-to-one 向量匹配**

   ```shell
   这种匹配模式下，两边向量里的元素如果其标签键值对组合相同则为匹配，并且只会有一个匹配元素。可以使用 `ignoring` 关键词来忽略不参与匹配的标签，或者使用 `on` 关键词来指定要参与匹配的标签。语法如下：
   <vector expr> <bin-op> ignoring(<label list>) <vector expr>
   <vector expr> <bin-op> on(<label list>) <vector expr>
   
   比如对于下面的输入：
   method_code:http_errors:rate5m{method="get", code="500"}  24
   method_code:http_errors:rate5m{method="get", code="404"}  30
   method_code:http_errors:rate5m{method="put", code="501"}  3
   method_code:http_errors:rate5m{method="post", code="500"} 6
   method_code:http_errors:rate5m{method="post", code="404"} 21
   
   method:http_requests:rate5m{method="get"}  600
   method:http_requests:rate5m{method="del"}  34
   method:http_requests:rate5m{method="post"} 120
   
   执行下面的查询：
   method_code:http_errors:rate5m{code="500"} / ignoring(code) method:http_requests:rate5m
   得到的结果为：
   {method="get"}  0.04            #  24 / 600
   {method="post"} 0.05             #   6 / 120
   也就是每一种 method 里 code 为 500 的请求数占总数的百分比。由于 method 为 put 和 del 的没有匹配元素所以没有出现在结果里
   ```

   #### Many-to-one / one-to-many 向量匹配

   ```shell
   这种匹配模式下，某一边会有多个元素跟另一边的元素匹配。这时就需要使用 `group_left` 或 `group_right` 组修饰符来指明哪边匹配元素较多，左边多则用 `group_left`，右边多则用 `group_right`。其语法如下：
   <vector expr> <bin-op> ignoring(<label list>) group_left(<label list>) <vector expr>
   <vector expr> <bin-op> ignoring(<label list>) group_right(<label list>) <vector expr>
   <vector expr> <bin-op> on(<label list>) group_left(<label list>) <vector expr>
   <vector expr> <bin-op> on(<label list>) group_right(<label list>) <vector expr>
   
   比如对于下面的输入：
   method_code:http_errors:rate5m{method="get", code="500"}  24
   method_code:http_errors:rate5m{method="get", code="404"}  30
   method_code:http_errors:rate5m{method="put", code="501"}  3
   method_code:http_errors:rate5m{method="post", code="500"} 6
   method_code:http_errors:rate5m{method="post", code="404"} 21
   
   method:http_requests:rate5m{method="get"}  600
   method:http_requests:rate5m{method="del"}  34
   method:http_requests:rate5m{method="post"} 120
   
   组修饰符只适用于算术类和比较类操作符，对于前面的输入，执行下面的查询：
   method_code:http_errors:rate5m / ignoring(code) group_left method:http_requests:rate5m
   将得到下面的结果：
   {method="get", code="500"}  0.04            //  24 / 600
   {method="get", code="404"}  0.05            //  30 / 600
   {method="post", code="500"} 0.05            //   6 / 120
   {method="post", code="404"} 0.175           //  21 / 120
   
   也就是每种 method 的每种 code 错误次数占每种 method 请求数的比例。这里匹配的时候 ignoring 了 code，才使得两边可以形成 Many-to-one 形式的匹配。由于左边多，所以需要使用 group_left 来指明
   
   Many-to-one / one-to-many 过于高级和复杂，要尽量避免使用。但很多时候通过 ignoring 就可以解决问题
   ```

3. 聚合操作符

   PromQL 的聚合操作符用来将向量里的元素聚合得更少。总共有下面这些聚合操作符：

   ```shell
   sum：求和
   min：最小值
   max：最大值
   avg：平均值
   stddev：标准差
   stdvar：方差
   count：元素个数
   count_values：等于某值的元素个数
   bottomk：最小的 k 个元素
   topk：最大的 k 个元素
   quantile：分位数
   
   聚合操作符语法如下：
   <aggr-op>([parameter,] <vector expression>) [without|by (<label list>)]
   其中 `without` 用来指定不需要保留的标签（也就是这些标签的多个值会被聚合），而 `by` 正好相反，用来指定需要保留的标签（也就是按这些标签来聚合）
   
   下面来看几个示例：
   sum(http_requests_total) without (instance)
   
   http_requests_total 度量指标带有 application、instance 和 group 三个标签。上面的表达式会得到每个 application 的每个 group 在所有 instance 上的请求总数。效果等同于下面的表达式：
   sum(http_requests_total) by (application, group)
   
   下面的表达式可以得到所有 application 的所有 group 的所有 instance 的请求总数
   sum(http_requests_total)
   ```

### 3. PromQL函数（了解）

Prometheus 内置了一些函数来辅助计算，下面介绍一些典型的

```shell
abs()：绝对值
sqrt()：平方根
exp()：指数计算
ln()：自然对数
ceil()：向上取整
floor()：向下取整
round()：四舍五入取整
delta()：计算区间向量里每一个时序第一个和最后一个的差值
sort()：排序
```

## 五、Prometheus - AlertManager部署

### 1. alertmanager组件安装

1. 下载并安装alertmanager组件

   ```shell
   $ tar -xf alertmanager-0.20.0.linux-amd64.tar.gz
   $ cp -r alertmanager-0.20.0.linux-amd64 /usr/local/alertmanager
   ```

2. 编写alertmanager启动脚本

   ```shell
   $ cat>/usr/local/alertmanager/alertmanager.service<<EOF
   [Unit]
   Description=Alertmanager
   After=network.target
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/usr/local/alertmanager
   ExecStart=/usr/local/alertmanager/alertmanager
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   EOF
   ```

3. 添加启动脚本到systemd启动管理中

   ```shell
   $ ln -s /usr/local/alertmanager/alertmanager.service /lib/systemd/system/
   $ systemctl daemon-reload
   $ systemctl start alertmanager
   $ systemctl enable alertmanager
   
   #默认没有被Prometheus调用，需要修改peometheus配置文件调用alertmanager组件
   ```

### 2. alertmanager组件配置

1. 修改配置文件 - 实现基于邮件的报警（备份原始的，覆盖修改）

   ```shell
   $  vim /usr/local/alertmanager/alertmanager.yml 
   global:
     # 在没有报警的情况下声明为已解决的时间
     resolve_timeout: 5m
     # 配置邮件发送信息
     smtp_smarthost: 'smtp.126.com:25'
     smtp_from: 'xbz_001@126.com'
     smtp_auth_username: 'xbz_001@126.com'
     smtp_auth_password: 'xbz_001@126.com-password'
     # 需要去网页端申请第三方登录专属密码
     smtp_hello: '126.com'
     smtp_require_tls: false
   
   route:
     group_by: ['alertname', 'cluster']
     group_wait: 30s
     group_interval: 5m
     repeat_interval: 5m
     receiver: default
   
   receivers:
   - name: 'default'
     email_configs:
     - to: 'xbz_002@126.com'
       send_resolved: true
   ```

2. 添加报警规则，进行效果测试

   ```shell
   # 修改 /usr/local/prometheus/prometheus.yml 文件添加规则文件
   $ vim /usr/local/prometheus/prometheus.yml
   alerting:
     alertmanagers:
     - static_configs:
       - targets:
          - node1.hongfuedu.com:9093
          # 一定要开启prometheus对alertmanager的端口调用！！！
   rule_files:
     - "rules/*rules.yml"
   
   # 创建并修改 /usr/local/prometheus/rules/node1_rules.yml 文件添加监控规则
   
   $ mkdir /usr/local/prometheus/rules/
   $ vim /usr/local/prometheus/rules/node1_rules.yml
   groups:
     - name: test-rules
       rules:
         - alert: InstanceDown
           # 改用 1 分钟窗口，且降低阈值到 0.01 确保必触发
           expr: avg(irate(node_cpu_seconds_total{mode="user"}[1m])) by (instance) >= 0.01
           # 持续 10 秒即报警
           for: 10s
           labels:
             status: warning
           annotations:
             summary: "{{$labels.instance}}: CPU Load is too high"
             description: "关键词: 2509, {{$labels.instance}} CPU负载异常"
   ```

   ```shell
   报警规则模版
   groups:
   - name: test
     rules:
     - alert: CPU负载1分钟告警
       expr:  node_load1 / count (count (node_cpu_seconds_total) without (mode)) by (instance, job) > 2.5
       for: 1m  
       labels:
         level: warning
       annotations:
         summary: "{{ $labels.instance }} CPU负载告警 "
         description: "{{$labels.instance}} 1分钟CPU负载(当前值: {{ $value }})"
   
     - alert: CPU使用率告警
       expr:  1 - avg(irate(node_cpu_seconds_total{mode="idle"}[30m])) by (instance) > 0.85
       for: 1m  
       labels:
         level: warning
       annotations:
         summary: "{{ $labels.instance }} CPU使用率告警 "
         description: "{{$labels.instance}} CPU使用率超过85%(当前值: {{ $value }} )"
   
     - alert: CPU使用率告警 
       expr: 1 - avg(irate(node_cpu_seconds_total{mode="idle"}[30m])) by (instance) > 0.9
       for: 1m
       labels:
         level: warning
       annotations:
         summary: "{{ $labels.instance }} CPU负载告警 "
         description: "{{$labels.instance}} CPU使用率超过90%(当前值: {{ $value }})"
   
     - alert:  内存使用率告警
       expr:  (1-node_memory_MemAvailable_bytes /  node_memory_MemTotal_bytes) * 100 > 60
       labels:
         level: critical
       annotations:
         summary: "{{ $labels.instance }} 可用内存不足告警"
         description: "{{$labels.instance}} 内存使用率已达90% (当前值: {{ $value }})"
   
   
     - alert:  磁盘使用率告警
       expr: 100 - (node_filesystem_avail_bytes{fstype=~"ext4|xfs"} / node_filesystem_size_bytes{fstype=~"ext4|xfs"}) * 100 > 85
       labels:
         level: warning
       annotations:
         summary: "{{ $labels.instance }} 磁盘使用率告警"
         description: "{{$labels.instance}} 磁盘使用率已超过85% (当前值: {{ $value }})"
   ```

   注意：修改后重启prometheus服务，然后网页访问测试。

3. 创建资源消耗任务，触发报警规则实现报警

   ```shell
   $ dd if=/dev/zero of=/dev/null &
   #多次执行消耗CPU性能
   ```

4. 接入微信报警媒介（需大家自行创建企业微信的组织才能获取以下信息，微信版本变更导致配置不一样）

   ```shell
   $ vim /usr/local/alertmanager/alertmanaget.yml
   global:
     resolve_timeout: 2m
     # 微信的外部接口
     wechat_api_url: 'https://qyapi.weixin.qq.com/cgi-bin/'
     # 指定机器人访问接口
     wechat_api_secret: '421b673f-fcd9-4ea8-aa59-43536d1e38dd'
     # 指定企业 Id 号，在我的企业最后一行中查看
     wechat_api_corp_id: 'wwdc570252afe3c2ee'
    
   route:
     group_by: ['alertname']
     group_wait: 10s
     group_interval: 10s
     repeat_interval: 1h
     receiver: 'wechat'
   receivers:
   - name: 'wechat'
     wechat_configs:
     - send_resolved: true
       # 指定发送到的用户或者组的 ID 号
       to_party: '1'
       # 指定机器人的 ID 号
       agent_id: '1'
   ```

   重启alertmanager测试效果

5. 接入钉钉报警媒介

   ##### 1. 钉钉转发插件部署 (prometheus-webhook-dingtalk)
   
   由于 Alertmanager 不支持直接对接钉钉，需部署中间件进行协议转换。
   
   ###### 1.1 安装与目录规划
   
   Bash
   
   ```
   # 下载并解压插件
   wget https://github.com/timonwong/prometheus-webhook-dingtalk/releases/download/v2.1.0/prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz
   tar -xf prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz
   
   # 移动至标准存放路径
   mkdir -p /usr/local/dingtalk
   cp -r prometheus-webhook-dingtalk-2.1.0.linux-amd64 /usr/local/dingtalk/
   ```
   
   ###### 1.2 创建插件配置文件 (关键：包含关键词 2509)
   
   必须创建一个 `config.yml` 来配置钉钉机器人 Token，并在模板中固定加入关键词。
   
   Bash
   
   ```
   cat > /usr/local/dingtalk/config.yml <<EOF
   targets:
     webhook1:
       url: https://oapi.dingtalk.com/robot/send?access_token=a7c0ba5ccc60bc02f3b180f081f75092bb72360a2a9e353dec27c21f7c7df8ac
       message:
         # 固定加上关键词 2509 以通过钉钉安全校验
         title: '{{ .Status | upper }} - 监控报警 (2509)'
         text: |
           {{ range .Alerts }}
           **报警项目**: {{ .Labels.alertname }}
           **详细内容**: {{ .Annotations.description }} (Code: 2509)
           ---
           {{ end }}
   EOF
   ```
   
   ###### 1.3 注册 Systemd 服务
   
   ```bash
   cat > /usr/local/dingtalk/dingtalk.service <<EOF
   [Unit]
   Description=dingtalk
   After=network.target
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/usr/local/dingtalk/
   # 必须指定配置文件路径
   ExecStart=/usr/local/dingtalk/prometheus-webhook-dingtalk --config.file=/usr/local/dingtalk/config.yml
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   EOF
   
   注意prometheus-webhook-dingtalk一定要放在dingtalk目录下面
   # 启动并设置开机自启
   ln -sf /usr/local/dingtalk/dingtalk.service /lib/systemd/system/
   systemctl daemon-reload
   systemctl start dingtalk
   systemctl enable dingtalk
   ```
   
   ------
   
   ##### 2. Alertmanager 配置优化
   
   ```bash
   global:
     resolve_timeout: 5m
     # 邮件发送服务器配置 (使用 xbz_002 作为发件人)
     smtp_smarthost: 'smtp.126.com:25'
     smtp_from: 'xbz_002@126.com'
     smtp_auth_username: 'xbz_002@126.com'
     smtp_auth_password: 'xbz_002@126.com-password' # 替换为授权码
     smtp_hello: '126.com'
     smtp_require_tls: false
   
   route:
     group_by: ['alertname', 'cluster']
     group_wait: 30s
     group_interval: 5m
     repeat_interval: 5m
     receiver: default
   
   receivers:
   - name: 'default'
     # 邮件接收者配置 (发送至 xbz_002)
     email_configs:
     - to: 'xbz_002@126.com'
       send_resolved: true
     
     # 钉钉 Webhook 配置
     webhook_configs:
     - url: 'http://127.0.0.1:8060/dingtalk/webhook1/send' 
     # 如果在一台机器，建议用回环地址，对应插件 config 中的 webhook1
       send_resolved: true
       
    systemctl restart alertmanager.service
   ```
   
   ------
   
   ##### 3. 链路检查清单
   
   1. **服务状态**：检查端口 `8060` 是否正常监听（`netstat -lntp`）。
   2. **关键词匹配**：钉钉后台设置的关键词为 `2509`，确保 `config.yml` 模板中包含此数字。
   3. **Webhook 路径**：Alertmanager 填写的 URL 结尾必须是 `/send`。
   4. **邮件验证**：确保 `xbz_002@126.com` 已开启 SMTP 服务并获取了第三方登录授权码。
   
   

## 六、Prometheus - Grafana部署

### 1. Grafana组件安装

1. 下载并安装Prometheus Server服务

   ```shell
   $ tar -xf grafana-6.5.2.linux-amd64.tar.gz
   $ cp -r grafana-6.5.2 /usr/local/grafana
   ```

2. 编写Prometheus service启动脚本

   ```shell
   $ cat>/usr/local/grafana/grafana-server.service<<EOF
   [Unit]
   Description=Grafana Server
   After=network.target
    
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/usr/local/grafana
   ExecStart=/usr/local/grafana/bin/grafana-server
    
   Restart=on-failure
   LimitNOFILE=65536
    
   [Install]
   WantedBy=multi-user.target
   EOF
   ```

3. 添加启动脚本到systemd启动管理中

   ```shell
   $ ln -s /usr/local/grafana/grafana-server.service /etc/systemd/system/
   $ systemctl daemon-reload
   $ systemctl start grafana-server
   $ systemctl enable grafana-server
   $ systemctl enable --now grafana-server
   $ ss -antp | grep :3000
   ```

### 2. Grafana组件配置

1. web访问：http://192.168.88.10:3000/login

2. 安装监控Linux系统资源模板

   模板号：8919，由于图形模板作者会更新版本，软件版本和图形模板由于版本变更导致不兼容，要让软件跟随图形模板进行更新。

   默认没有数据源，无法选择Proetheus数据源，需要提前创建（根据添加模板的要求）

3. 效果展示

## 七、blackbox_exporter配置

Blackbox Exporter 是由 Prometheus 官方提供的一个导出器（Exporter），它允许通过 HTTP、HTTPS、DNS、TCP 和 ICMP 等协议对网络端点进行探测 。

- **黑盒监控 vs 白盒监控**：
  - **白盒监控**（如 Node Exporter）：从系统内部观察，获取内存、CPU 等指标。
  - **黑盒监控**（如 Blackbox Exporter）：从外部观察，只关注服务是否可用、响应时间以及端口是否存活。

```shell
# 黑盒安装blackbox_exporter
# 黑盒组件的作用：对没有管理权限的对象进行一些监控
wget https://github.com/prometheus/blackbox_exporter/releases/download/v0.25.0/blackbox_exporter-0.25.0.linux-amd64.tar.gz

tar -xf blackbox_exporter-0.25.0.linux-amd64.tar.gz
cp -r blackbox_exporter-0.25.0.linux-amd64/ /usr/local/blackbox_exporter

cat > /usr/local/blackbox_exporter/blackbox-exporter.service <<EOF
[Unit]
Description=Prometheus Blackbox Exporter
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/local/blackbox_exporter/blackbox_exporter \
--config.file=/usr/local/blackbox_exporter/blackbox.yml \
--web.listen-address=:9115
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
ln -s /usr/local/blackbox_exporter/blackbox-exporter.service /etc/systemd/system/
systemctl enable --now blackbox-exporter.service
netstat -antp|grep 9115


#blackbox_exporter默认支持的探测模块
#共有以下7种
http_2xx代表http get方法,返回code为2xx代表正常
http_post_2xx代表http post方法,返回code为2xx代表正常
icmp 代表icmp 协议
irc_banner代表irc协议,需要匹配发送的请求和响应
pop3s_banner代表邮局协议
ssh_banner代表ssh探活
tcp_connect代表tcp端口探活

#配置prometheus抓取
blackbox_exporter比较特殊,它的监控对象需要由prometheus提供

示例1:blackbox exporter 实现 URL 监控
  - job_name: 'http_status'
    metrics_path: /probe
    params:
      module: [http_2xx] #2xx状态码检测
    static_configs:
      - targets: ['http://www.xinxianghf.cn', 'http://www.baidu.com/']
        labels:
          group: web
    relabel_configs:
      - source_labels: [__address__] #relabel 通过将__address__(当前目标地址)写入__param_target 标签来创建一个 label。
        target_label: __param_target #监控目标 www.xiaomi.com,作为__address__的 value
      - source_labels: [__param_target] #监控目标
        target_label: instance #将监控目标与 url 创建一个 label
      - target_label: __address__
        replacement: 192.168.88.110:9115


# 配置grafana监控模板
推荐模板: ID 9965/16292/13659
```

### Blackbox Exporter 七种默认探测模块的 Blackbox配置模板

```shell
modules:
  # 1. HTTP GET 探测 - http_2xx（官方預設 module，可直接使用或覆蓋）
  http_2xx:
    prober: http
    timeout: 10s
    http:
      method: GET
      headers:
        User-Agent: "Prometheus-Blackbox/1.0"
      valid_status_codes: [200, 201, 202, 203, 204, 205, 206]  # 默認所有 2xx
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      no_follow_redirects: false
      fail_if_ssl: false
      fail_if_not_ssl: false
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false

  # 2. HTTP POST 探测 - http_post_2xx（非官方預設，必須自訂）
  http_post_2xx:
    prober: http
    timeout: 10s
    http:
      method: POST
      headers:
        Content-Type: application/json
        User-Agent: "Prometheus-Blackbox/1.0"
      # 建議發一個「故意無效但格式正確」的 body，讓正常接口返回 4xx 而不是 405
      body: '{"probe": "blackbox-test"}'
      # 根據你的接口實際行為調整：
      # - 如果空 body 會返回 400/401 → 把 400,401 加進來
      # - 如果需要成功登入才 2xx → 提供正確 body + 只接受 200/201
      valid_status_codes: [200, 201, 400, 401, 422]  # 推薦：接受常見錯誤碼，表示接口有處理 POST
      # 如果想更嚴格檢測「不返回 405 Method Not Allowed」
      # fail_if_body_matches_regexp:
      #   - "Method Not Allowed"
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false

  # 3. ICMP 探测 - icmp（官方預設，可覆蓋）
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      # source_ip_address: "192.168.88.x"  # 如需指定源 IP 可取消註釋

  # 4. SSH Banner 探测 - ssh_banner（官方預設，可覆蓋）
  ssh_banner:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      # 期待的 banner 正則（可根據你的 SSH 服務器調整）
      query_response:
        - expect: "^SSH-2.0-"

  # 5. TCP 端口连通性探测 - tcp_connect（官方預設，可覆蓋）
  tcp_connect:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      # 僅檢查能否建立 TCP 連接，不檢查 banner

  # 6. POP3S Banner 探测 - pop3s_banner（官方預設，可覆蓋）
  pop3s_banner:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      tls: true
      tls_config:
        insecure_skip_verify: false  # 生產環境建議 false
      query_response:
        - send: "QUIT"
        - expect: "+OK"

  # 7. IRC Banner 探测 - irc_banner（官方預設，可覆蓋）
  irc_banner:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      query_response:
        - expect: "^:server.* 001"  # 典型 IRC 歡迎訊息
        # 有些 IRC 服務器可能沒有 tls，視情況加 tls: true
```

### Blackbox Exporter 七种默认探测模块的 Prometheus配置模板

```bash
# Prometheus 监控 Blackbox Exporter 完整任务集合 (无锚点展开版)
scrape_configs:

  # ----------------------------------------------------------------
  # 1. ICMP 存活检测 (Ping)
  # ----------------------------------------------------------------
  - job_name: 'blackbox_icmp'
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets: ['192.168.1.1', '8.8.8.8', 'www.baidu.com']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 2. TCP 端口检测 (如数据库、中间件)
  # ----------------------------------------------------------------
  - job_name: 'blackbox_tcp_port'
    metrics_path: /probe
    params:
      module: [tcp_connect]
    static_configs:
      - targets: 
          - '192.168.36.102:3306'  # MySQL
          - '192.168.36.102:6379'  # Redis
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 3. HTTP GET 状态检测 (2xx 状态码)
  # ----------------------------------------------------------------
  - job_name: 'blackbox_http_get'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - 'http://192.168.36.102:8080/health'
          - 'https://www.google.com'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 4. HTTP POST 接口检测
  # ----------------------------------------------------------------
  - job_name: 'blackbox_http_post'
    metrics_path: /probe
    params:
      module: [http_post_2xx]
    static_configs:
      - targets: ['http://192.168.36.102:8080/api/login']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 5. SSH 协议检测
  # ----------------------------------------------------------------
  - job_name: 'blackbox_ssh'
    metrics_path: /probe
    params:
      module: [ssh_banner]
    static_configs:
      - targets: ['192.168.36.102:22']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 6. gRPC 服务检测
  # ----------------------------------------------------------------
  - job_name: 'blackbox_grpc'
    metrics_path: /probe
    params:
      module: [grpc]
    static_configs:
      - targets: ['192.168.36.102:50051']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115

  # ----------------------------------------------------------------
  # 7. DNS 解析检测
  # ----------------------------------------------------------------
  - job_name: 'blackbox_dns'
    metrics_path: /probe
    params:
      module: [dns_udp]
    static_configs:
      - targets: ['8.8.8.8', '114.114.114.114']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 192.168.36.102:9115
```



##  八、自动发现                                                                                                    

### 📥 Prometheus 自动发现分类

在监控规模较小时，手动维护配置还能应付；但当机器成百上千时，**服务发现（Service Discovery）** 就是救命稻草，它让 Prometheus 能够动态地获取监控目标，实现“配置即监控”。

	1.	静态配置
	2.	基于文件的自动发现
	3.	基于DNS的自动发现	
	4.	基于consul自动发现	
	5.	基于kubernetes的自动发现	

```bash
1.	静态配置
   手动修改,在prometheus配置中添加主机

  - job_name: "prometheus"
    static_configs:
      - targets: ["192.168.88.130:9100","192.168.88.140:9100"]
  - job_name: "prometheus"
    static_configs:
      - targets: 
        - 192.168.88.130:9100
        - 192.168.88.140:9100	  
          #以上两种静态配置格式均可

2.	基于文件的自动发现
   vim /usr/local/prometheus/prometheus.yml

  - job_name: 'host_discovery'
    file_sd_configs:
    - files:
      - "/usr/local/prometheus/target/node/host_discovery.yml"
        refresh_interval: 6s

vim /usr/local/prometheus/target/node/host_discovery.yml
	- targets:
	  - "192.168.88.160:9100"
	  labels:
		instance: ""

/usr/local/prometheus/targets/node_exporter

3.	基于DNS的自动发现
   使用搭建的DNS服务实现域名解析

vim /usr/local/prometheus/prometheus.yml

  - job_name: 'dns_discovery'
    dns_sd_configs:
    - names: ['www.hongfuedu.com']
      type: A
      port: 9100

4.	基于consul自动发现


#如果有新的虚拟机，只需要安装node之后curl consul服务器，不再需要在Prometheus服务器中修改配置文件
4.1 组件下载:https://releases.hashicorp.com/consul/


	#解压缩后就一个命令而已，可以直接复制到PATH变量下
# 1. 下载适用于 Linux 的正确版本 (1.20.1 为例)
wget https://releases.hashicorp.com/consul/1.20.1/consul_1.20.1_linux_amd64.zip

# 2. 安装解压工具
yum install -y unzip

# 3. 解压并移动到系统命令目录 /usr/local/bin
unzip consul_1.20.1_linux_amd64.zip
mv consul /usr/local/bin/

# 4. 赋予执行权限并验证
chmod +x /usr/local/bin/consul
consul --version
```

```bash
mkdir -p /data/consul 
nohup consul agent -dev -ui -client 0.0.0.0 -enable-script-checks -data-dir /data/consul &
------------------------------------------------------------------------------------
cat > /usr/lib/systemd/system/consul.service <<EOF
[Unit]
Description=Consul Service Discovery Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
# 注意：WorkingDirectory 需要确保该目录已存在，用于存放数据
WorkingDirectory=/data/consul
ExecStart=/usr/local/bin/consul agent -dev -ui -client 0.0.0.0 -enable-script-checks -data-dir=/data/consul
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
------------------------------------------------------------------------------------
systemctl daemon-reload
systemctl enable --now consul.service

http://192.168.88.140:8500/ui/dc1/overview/server-status

在被监控节点（node_exporter为例）执行消息发送，
curl -X PUT -d '{
  "id": "node_136_101",
  "name": "node-exporter",
  "address": "192.168.45.120",
  "port": 9100,
  "tags": ["node_exporter"],
  "checks": [{
    "http": "http://192.168.45.120:9100/metrics",
    "interval": "30s"
  }]
}' http://127.0.0.1:8500/v1/agent/service/register
注解:
#	name:consul的service注册名称
#	id:consul的实例名称
#	address:被监控地址ip
#	port:被监控的端口号
#	tags:标签名
#	checks:检查的节点的路径
```

```bash
取消注册：
curl -X PUT http://192.168.88.160:8500/v1/agent/service/deregister/test_node
#源url结尾添加注册时声明的id作为结尾即可注销
```

```bash
4.2 
  $ vim prometheus.yml

  - job_name: 'consul-services'
    consul_sd_configs:
      - server: '192.168.88.120:8500'  	# Consul 服务器地址和端口
        datacenter: 'dc1'      			# Consul 数据中心
        scheme: 'http'          		# Consul 服务的访问协议
        tags:
          - 'node_exporter'	

5.	基于kubernetes的自动发现
   云计算阶段学习
```

## 九、mysql-exporter

```bash
# mysql_exporter节点
# 创建一个mysql配置文件,写上连接的用户名与密码
dnf -y install mariadb mariadb-server
systemctl enable --now mariadb
mysql
create user root@'%' identified by '123456';
cat > /usr/local/mysqld_exporter/.my.cnf <<EOF
[client]
user=root
password=123456
host=192.168.36.104
port=3306
EOF
启动:
#直接使用默认配置文件,后台启动,调试使用，可以不执行
nohup /usr/local/mysqld_exporter/mysqld_exporter --config.my-cnf=/usr/local/mysqld_exporter/.my.cnf &
-----------------------------------------------------------------------------------
cat>/usr/local/mysqld_exporter/mysqld_exporter.service<<EOF
[Unit]
Description=mysql_exporter

[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/mysqld_exporter
ExecStart=/usr/local/mysqld_exporter/mysqld_exporter --config.my-cnf=/usr/local/mysqld_exporter/.my.cnf

[Install]
WantedBy=multi-user.target
EOF

#确认端口(9104)
lsof -i:9104

# 配置
静态注册:(配置Prometheus)
cd /usr/local/prometheus/prometheus
vim prometheus.yml
添加如下内容:
  - job_name: "mysql_exporter"
    static_configs:
      - targets: ["192.168.36.104:9104"]
重启Prometheus

ln -s /usr/local/mysqld_exporter/mysqld_exporter.service /etc/systemd/system/

启动命令:
systemctl enable --now mysqld_exporter

# Grafana可视化展示
导入模板:MySQL Exporter Quickstart and Dashboard
模板id:14057
```

## 十、pushgateway

```bash
# pushgateway 是采用被动推送的方式,而不是类似于 prometheus server 主动连接 exporter 获取监控数据。
# pushgateway 可以单独运行在一个节点,然后需要自定义监控脚本把需要监控的主动推送给 pushgateway的 API 接口, 然后 pushgateway 再等待 prometheus server 抓取数据, 即 pushgateway 本身没有任何抓取监控数据的功能, 目前 pushgateway 只是被动的等待数据从客户端推送过来。

wget https://github.com/prometheus/pushgateway/releases/download/v1.6.0/pushgateway-1.6.0.linux-amd64.tar.gz
tar xf pushgateway-1.6.0.linux-amd64.tar.gz 

cp -r pushgateway-1.6.0.linux-amd64 /usr/local/pushgateway

cat>/usr/local/pushgateway/pushgateway.service<<EOF
[Unit]
Description=pushgateway
After=network.target
 
[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/pushgateway
ExecStart=/usr/local/pushgateway/pushgateway --persistence.file="/usr/local/pushgateway/data/pg.db" --persistence.interval=5m
 
Restart=on-failure
LimitNOFILE=65536
 
[Install]
WantedBy=multi-user.target
EOF

mkdir /usr/local/pushgateway/data/
ln -s /usr/local/pushgateway/pushgateway.service /etc/systemd/system
systemctl enable --now pushgateway.service
netstat -antp 			#默认监控9091端口

#常用选项

--persistence.file="/usr/local/pushgateway/data/pg.db" 		#数据保存的文件,默认只保存在内存中
--persistence.interval=5m   #数据持久化的间隔时间

# 配置prometheus抓取pushgateway
vim prometheus.yml
  - job_name: "pushgateway metrics"
    static_configs:
      - targets: ["192.168.88.160:9091"] #pushgateway 地址和端口
    honor_labels: true #保留源标签

# 客户端手动推送数据
1.推送单条数据
要 Push 数据到 PushGateway 中, 可以通过其提供的 API 标准接口来添加, 默认 URL 地址为:
http://<ip>:9091/metrics/job/<JOBNAME>{/<LABEL_NAME>/<LABEL_VALUE>},
其中<JOBNAME>是必填项, 为 job 标签值, 后边可以跟任意数量的标签对, 一般我们会添加一个 instance/<INSTANCE_NAME>实例名称标签, 来方便区分各个指标。

#推送一个 job 名称为 mytest_job, key 为 mytest_metric 值为 2024
echo "mytest_metric 2024" | curl --data-binary @- http://192.168.88.110:9091/metrics/job/mytest_job

mytest_metric  命令行创建的job名称,实际同prometheus中的job一样
push_time_seconds  自动生成,记录指标数据的失败上传时间
push_failure_time_seconds 自动生成,记录指标数据的成功上传时间

prometheus验证数据

2.推送多条数据
cat <<EOF | curl --data-binary @- http://192.168.88.110:9091/metrics/job/test_job/instance/192.168.88.120
# TYPE node_memory_usage gauge
node_memory_usage 4311744512
# TYPE node_memory_total gauge
node_memory_total 103481868288
EOF

查看pushgateway的metric

3.简易推送数据脚本样例，注意改网卡！！！！！
# cat mem_monitor.sh
#!/bin/bash
total_memory=$(free |awk '/Mem/{print $2}')
used_memory=$(free |awk '/Mem/{print $3}')

job_name="custom_memory_monitor"
instance_name=`ifconfig eth0 | grep -w inet | awk '{print $2}'`
pushgateway_server="http://192.168.36.105:9091/metrics"
cat <<EOF | curl --data-binary @- ${pushgateway_server}/job/${job_name}/instance/${instance_name}
#TYPE custom_memory_total gauge
custom_memory_total $total_memory
#TYPE custom_memory_used gauge
custom_memory_used $used_memory
EOF
  #可以写多个标签,格式为  key/value,如果新增一个zone标签,可以写成为 /instance/${instance_name}/zone/ShangHai ,后面可以一直加
instance的IP地址不显示解决问题，在子bash中无法获取环境变量，需要在脚本里面声名
推荐在脚本里面声名全局变量

export PATH="/root/.local/bin:/root/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"

# 删除数据
#根据job及标签删除对应的数据，pushgateway服务器IP地址，后面是
curl -X DELETE http://192.168.88.110:9091/metrics/job/mytest_job/instance/192.168.88.160
```

| **工具包名称**        | **默认端口** | **主要用途**                                   |
| --------------------- | ------------ | ---------------------------------------------- |
| **Prometheus Server** | `9090`       | 核心服务端口，用于 Web UI、查询 API 及指标抓取 |
| **Alertmanager**      | `9093`       | 告警处理中心，处理去重、分组及静默             |
| **Pushgateway**       | `9091`       | 用于接收短期作业主动推送的指标                 |
| **Grafana**           | `3000`       | 数据可视化展示面板                             |
| **Node Exporter**     | `9100`       | 采集主机硬件（CPU、内存、磁盘等）指标          |
| **Blackbox Exporter** | `9115`       | 网络探测（HTTP, ICMP, TCP, DNS 等探测）        |
| **MySQLd Exporter**   | `9104`       | 采集 MySQL 数据库性能指标                      |
| **Consul Exporter**   | `9107`       | 采集 Consul 集群状态与服务发现信息             |
| **Webhook Dingtalk**  | `8060`       | 钉钉告警通知转发插件                           |
