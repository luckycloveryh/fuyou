---
title: "LVS 负载均衡集群部署"
date: 2026-07-08T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-06/1200/600"
draft: false
tags: ["集群", "Obsidian"]
categories: ["集群"]
slug: "cluster-06"
description: "从 Obsidian 导入的 集群 学习笔记"
---
## LVS负载均衡集群

### 一、LVS 简介

LVS（Linux Virtual Server）是一个开源的高性能、高可用性服务器负载均衡解决方案，由章文嵩博士于1998年创建。它通过将客户端请求智能分发到多台后端服务器（Real Server），提升系统的处理能力、可靠性和扩展性。

#### 1.1 核心组成

1. Director（调度器）：作为负载均衡的核心，运行IPVS（IP Virtual Server）模块，根据预设规则转发请求。
2. Real Server（真实服务器）：实际处理请求的后端服务器集群，可运行不同服务（如Web、数据库）。
3. 共享存储（可选）：为Real Server提供统一数据源，确保服务一致性。

```bash
IPVS 与 ipvsadm

IPVS 是集成在Linux内核当中的模块，用来过滤经过调度器的每一个数据包，并将符合条件的数据包按照预设规则转发处理
ipvsadm 是Linux操作系统用户层面的规则编写命令，上述的预设规则就是通过此命令编写而成，但仅用来生成规则，不执行规则

一个是用户空间的规则编写命令，一个是内核空间的规则执行模块，可以理解为一个是交管人员，一个是红绿灯设备。
```

| 术语                            | 解释                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| Load Balancer / Director Server | 负载调度器，负责将请求分发到后端真实服务器                   |
| VIP                             | 虚拟IP地址，客户端访问集群的统一入口地址，一般会配置在调度器上 |
| DIP                             | 调度器的真实网络接口地址，用于与真实服务器（RIP）通信        |
| RS / Real Server                | 真实服务器，实际提供服务的后端服务器节点                     |
| RIP                             | 真实服务器上应用程序的实际地址（如 HTTP、FTP 服务地址）      |


#### 1.2 关键特性
1. 高性能：基于内核的IPVS实现，支持百万级并发。
2. 透明性：客户端仅感知虚拟服务IP，后端架构无感知。
3. 高可用：可与Keepalived/Heartbeat集成，实现Director故障自动切换。
4. 扩展性：支持线性扩容，通过增加Real Server提升处理能力。


---

### 二、LVS 工作模式

#### 2.1 NAT（网络地址转换）

   - Director修改请求/响应的IP地址和端口。
   - 优点：Real Server可位于私有网络。
   - 缺点：Director易形成性能瓶颈，需处理双向流量。

#### 2.2 DR（直接路由）

   - Director仅修改请求的MAC地址，响应由Real Server直接返回客户端。
   - 优点：高性能，支持高并发。
   - 限制：Real Server需与Director在同一局域网。

#### 2.3 TUN（IP隧道）

   - 通过IP封装（如IPIP隧道）跨网络转发请求，Real Server可在不同地理位置。
   - 优点：支持异地服务器，扩展性强、。
   - 缺点：配置复杂，需Real Server支持隧道协议。

---

### 三、LVS-NAT模式实验

#### 3.1 实验规划

| 类型           | IP                                    | 服务              | 虚拟IP(VIP)   |
| -------------- | ------------------------------------- | ----------------- | ------------- |
| 客户端         | 192.168.3.110                         | CMD(curl)、浏览器 | 无            |
| 负载均衡服务器 | 192.168.3.120<br />192.168.4.120(DIP) | LVS(IPVS)         | 192.168.3.120 |
| web服务器1     | 192.168.4.130                         | httpd             | 无            |
| web服务器2     | 192.168.4.140                         | httpd             | 无            |
| 共享存储服务器 | 192.168.4.150                         | NFS               | 无            |

逻辑关系图和网络拓扑图详见PPT和亿图文件

#### 3.2 实验步骤

##### 3.2.1 构建共享存储

```bash

# 创建共享目录
$ mkdir /data/www -p

# 安装RPCbind和NFS服务
$ dnf -y install rpcbind nfs-utils

# 编写共享配置文件，设置共享目录，共享对象，共享权限，映射关系，同步方式
$ vim /etc/exports
/data/www 192.168.4.0/24(rw,all_squash,sync)

$ chown nobody:nobody /data/www

# 启动服务
$ systemctl enable --now rpcbind
$ systemctl enable --now nfs-server
```

##### 3.2.2 构建web服务

```bash
# 分别在两台web服务器上进行httpd软件的安装和共享存储的挂载

$ dnf -y install httpd
$ mount 192.168.4.150:/data/www /var/www/html

# 为两个web服务器创建各自专属的首页文件
$ echo "web server 130..." >> /var/www/html/index130.html
$ echo "web server 140..." >> /var/www/html/index140.html

# 分别修改两个web服务器配置文件的DirectoryIndex选项绑定各自的首页文件
130主机绑定index130.html
140主机绑定index140.html

# 启动服务
$ systemctl enable --now httpd
```

##### 3.2.3 构建负载均衡服务

```bash
# 通过规划大家应该发现了，这不仅是一台负载均衡服务器，还是一台具备路由转发功能的路由器
$ vim /etc/sysctl.conf
net.ipv4.ip_forward = 1
$ sysctl -p

# LVS 分为内核空间的IPVS模块和用户空间的ipvsadm命令，IPVS模块是内核的一部分不需要安装，只需要验证是否启用即可；ipvsadm命令则需安装才能使用
# 验证IPVS模块是否启用
$ grep "IP_VS" /boot/config-5.14.0-503.14.1.el9_5.x86_64

# 安装ipvsadm命令
$ dnf -y install ipvsadm

# 编写LVS规则，实现入站数据包的过滤，并将符合条件的数据包按照算法转发给后端web服务器

# 查看规则
$ ipvsadm -ln
   -l	# 列出已有规则
   -n	# 数字化显示相关参数

# 创建规则
$ ipvsadm -A -t 192.168.3.120:80 -s rr
   -A		# 添加一条集群规则add
   -t		# 匹配数据包的传输协议是否是TCP，属于数据包的过滤条件
   IP:Port	# 匹配数据包的目标IP和目标Port，同样属于数据包的过滤条件
   -s rr	# 将符合上述条件的数据包按此算法进行调度分配

# 添加符合条件时数据包的转发目标服务器（添加真实服务器）
$ ipvsadm -a -t 192.168.3.120:80 -r 192.168.4.130:80 -m
$ ipvsadm -a -t 192.168.3.120:80 -r 192.168.4.140:80 -m
   -a		# 向已存在的集群中添加符合规则时的真实服务器
   -r		# 声明真实服务器的IP地址和Port，即符合条件数据包的调度目的地
   -m		# 声明当前集群的工作模式为NAT模式
   -w num	# 如果使用了wrr或者wlc算法，则需要通过-w选项声明权重：-w 2
```

##### 3.2.4 客户端访问测试

```bash
Linux 或 Windows 都可以当做测试机，尽可能的使用命令行的curl命令测试，浏览器会因为历史记录或缓存无法正常验证效果
```

#### 3.3 总结

##### 优点

| 优点                | 详细说明                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| 网络兼容性强         | Real Server 可位于私有网络（无需公网IP），适合内部服务器集群部署。        |
| 配置简单             | 仅需在 Director 上配置转发规则，Real Server 无需特殊设置（如绑定VIP等）。 |
| 跨网段支持           | Real Server 可与 Director 在不同子网（但需路由可达）。                   |
| 端口灵活性           | 支持端口映射（如 VIP:80 → RIP:8080），但需 LVS 新版本支持。                |
| 协议透明性           | 适用于任何 TCP/UDP 协议（HTTP、FTP、DNS 等），不依赖应用层解析。          |

##### 缺点

| 缺点                | 详细说明                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| 性能瓶颈            | Director 需处理 双向流量（请求+响应），高并发场景下易成为性能瓶颈。   |
| 单点故障风险        | Director 故障会导致整个服务不可用，需配合 Keepalived 实现主备高可用。     |
| 扩展性受限          | 横向扩展需增加 Director 节点，成本较高，不如 DR/TUN 模式灵活。           |
| 网络带宽压力        | 所有响应流量需经过 Director，消耗其上行带宽，可能引发网络拥堵。           |
| 端口一致性要求       | Real Server 的服务端口必须与 VIP 端口一致（默认限制，新版可支持端口映射）。 |


##### 适用场景
1. 中小规模内部集群：Real Server 位于私有网络，且流量压力可控。
2. 测试或快速验证：配置简单，适合快速搭建验证环境。


##### 不适用场景
1. 高并发/大流量：如电商大促、视频流媒体等，Director 易成为瓶颈。
2. 跨地域部署：NAT 模式不支持跨广域网（需 TUN 模式）。
3. 严格性能要求：需低延迟、高吞吐量的场景（优先选择 DR 模式）。


##### 性能优化建议 
1. Director 硬件升级：使用多核CPU、万兆网卡提升吞吐量。
2. 限制连接数：通过 `ipvsadm -x` 设置 Real Server 最大连接数，避免过载。
3. 会话保持：启用 `-p` 参数减少频繁新建连接的开销。
4. 分流策略：将静态资源（如图片、视频）分离到 CDN，减轻 Director 压力。


---

### 四、LVS-DR模式实验

#### 4.1 实验规划

| 类型           | IP                               | 服务              | 虚拟IP(VIP)               |
| -------------- | -------------------------------- | ----------------- | ------------------------- |
| 客户端         | 192.168.3.110                    | CMD(curl)、浏览器 | 无                        |
| 路由器         | 192.168.3.120<br />192.168.4.120 | 路由转发          | 无                        |
| 负载均衡服务器 | 192.168.4.200<br />192.168.4.130 | LVS(IPVS)         | 192.168.4.200<br />ens160 |
| web服务器1     | 192.168.4.140                    | httpd             | 192.168.4.200<br />lo     |
| web服务器2     | 192.168.4.150                    | httpd             | 192.168.4.200<br />lo     |
| 共享存储服务器 | 192.168.4.160                    | NFS               | 无                        |

#### 4.2 实验步骤

##### 4.2.1 构建共享存储

```bash
# 创建共享目录
$ mkdir /data/www -p

# 安装RPCbind和NFS服务
$ dnf -y install rpcbind nfs-utils

# 编写共享配置文件，设置共享目录，共享对象，共享权限，映射关系，同步方式
$ vim /etc/exports
/data/www 192.168.4.0/24(rw,all_squash,sync)

# 启动服务
$ systemctl enable --now rpcbind
$ systemctl enable --now nfs
```

##### 4.2.2 构建web服务

```bash
# 分别在两台web服务器上进行httpd软件的安装和共享存储的挂载

$ dnf -y install httpd
$ mount 192.168.4.160:/data/www /var/www/html

# 为两个web服务器创建各自专属的首页文件
$ echo "web server 140..." >> /var/www/html/index140.html
$ echo "web server 150..." >> /var/www/html/index150.html

# 分别修改两个web服务器配置文件的DirectoryIndex选项绑定各自的首页文件
140主机绑定index140.html
150主机绑定index150.html

# 启动服务
$ systemctl enable --now httpd

# 为两台真实服务器添加VIP地址(俩web服务器都执行~)
$ ip address add 192.168.5.200/32 dev lo

# 修改两台真实服务器的内核参数配置文件/etc/sysctl.conf
$ vim /etc/sysctl.conf
net.ipv4.conf.all.arp_ignore = 1
net.ipv4.conf.all.arp_announce = 2   

# 刷新配置，使参数生效
$ sysctl -p

```

| 参数                             | 值   | 作用                                                         |
| -------------------------------- | ---- | ------------------------------------------------------------ |
| `net.ipv4.conf.all.arp_ignore`   | `1`  | 禁止响应目标 IP 非本机接口的 ARP 请求，防止真实服务器暴露 VIP 的 MAC 地址。 |
| `net.ipv4.conf.all.arp_announce` | `2`  | 限制 ARP 响应时仅使用与目标 IP 匹配的接口地址（物理 IP，而非 VIP）。 |
| `net.ipv4.conf.lo.arp_ignore`    | `1`  | 针对 `lo` 接口的 ARP 忽略设置（防止 VIP 绑定到 `lo` 时响应 ARP）。 |
| `net.ipv4.conf.lo.arp_announce`  | `2`  | 针对 `lo` 接口的 ARP 广播限制                                |



```bash
你是一个网购达人，家里有一个收货管家（负载均衡器）帮你分拣快递，但实际收货地址是你的房间（真实服务器）。为了不让快递员直接找到你的房间，你需要设置以下规则：
   
1. `arp_ignore=1`：装聋作哑的你
   
   比喻：快递员同时问你（真实服务器）和“收货管家”（负载均衡器），请问VIP包裹（VIP地址）是送到哪户的？” 
   正常情况：你（真实服务器）会回答：送到我家！	——这样快递员就会绕过收货管家（负载均衡器），直接送到你房间。 
   设置后：你（真实服务器）会装聋作哑，只有收货管家（负载均衡器）会回应：“送到我这里！” ，然后再由收货管家（负载均衡器）送到你的房间。
   
2. `arp_announce=2`：谨慎低调的你
   
   比喻：如果你（真实服务器）需要退货（响应请求），你会说：“我的地址是小区物业登记的真实门牌号（真实服务器的物理 IP，RIP）”，而不是说“我的秘密仓库号（VIP）”。 
   作用：确保快递员和其他邻居（网络设备）只知道你的真实门牌号（RIP），而不知道秘密仓库（VIP）的存在。
   arp响应和寻址和真实服务器响应客户端请求的数据包是两回事，咱们这里说的是arp响应，真实服务器在封装了响应数据包后，包头信息的源IP仍旧使用VIP。
   
完整流程演示
   
   1. 快递下单（客户端请求） 
      客户端想送包裹到 `VIP地址`，问（负载均衡器和真实服务器）：“谁负责收这个地址的快递？”
     
   2. 分拣中心应答（负载均衡器响应） 
      只有“收货管家”（负载均衡器）回应：“送到我这！”（真实服务器）保持沉默（`arp_ignore=1`）。
   
   3. 包裹分拣（负载均衡器转发） 
      “收货管家”将包裹分拣到你的房间（真实服务器）。
```


##### 4.2.3 构建负载均衡服务

```bash
# LVS 分为内核空间的IPVS模块和用户空间的ipvsadm命令，IPVS模块是内核的一部分不需要安装，只需要验证是否启用即可；ipvsadm命令则需安装才能使用
# 验证IPVS模块是否启用
$ grep "IP_VS" /boot/config-5.14.0-503.14.1.el9_5.x86_64

# 安装ipvsadm命令
$ dnf -y install ipvsadm

# 编写LVS规则，实现入站数据包的过滤，并将符合条件的数据包按照算法转发给后端web服务器
#注意添加双ip
只需要在address1，address2
# 查看规则
$ ipvsadm -ln

# 创建规则
$ ipvsadm -A -t 192.168.5.200:80 -s rr

# 添加符合条件时数据包的转发目标服务器（添加真实服务器）
$ ipvsadm -a -t 192.168.5.200:80 -r 192.168.5.140:80 -g
$ ipvsadm -a -t 192.168.5.200:80 -r 192.168.5.150:80 -g

# 关闭调度器的路由重定向功能
$ vim /etc/sysctl.conf
net.ipv4.conf.all.send_redirects=0
# 注意：这玩意需要提前关闭，提前到没用使用测试机测试之前。

$ sysctl -p

`什么是路由重定向？`
当服务器（调度器）发现客户端发送的数据包有更短的路径时（比如客户端 → 路由器 → 真实服务器可以直接通信，无需经过负载均衡器），服务器（调度器）会发送 ICMP 重定向消息，告诉路由器：“下次直接发到那个地址，别绕路了！”

`为什么在 LVS-DR 中要关闭它？`
LVS-DR 要求客户端始终认为 VIP 在负载均衡器上，请求必须经过负载均衡器转发。
如果真实服务器发送路由重定向，客户端会绕过负载均衡器，直接向真实服务器发请求，导致负载均衡失效。
```

##### 4.2.4 路由器配置DNAT策略

```bash
声明用于转发数据包的防火墙策略-DNAT策略
$ iptables -t nat -A PREROUTING -d 192.168.2.120 -p tcp --dport 80 -j DNAT --to-destination 192.168.1.200
注意路由器配置是wan口转发，不是lan口转发！！！！！！！
选项：
    -t nat 			# 指定防火墙表名称（filter、nat）
    -A 链名	  	  # 追加到指定链一条规则
    -I 链名		  # 插入到首行
    -I 链名 num	  # 插入到指定行
    -d			    # 匹配数据包的目标IP，属于过滤数据包的条件{-s 匹配源IP}
    -p tcp|udp|...	# 匹配数据包的传输协议
    --dport 		# 匹配数据包的目标端口{--sport 匹配源端口}
    注意：协议可以单独作为条件，端口不行；端口必须结合协议一起作为匹配条件，并且协议在前，端口在后
    -j 策略		  # 符合条件数据包的处理策略
    	ACCEPT		# 放行
    	REJECT		# 拒绝
    	DROP		# 丢弃
    	DNAT		# 目标地址转换
    	
```



##### 4.2.5 客户端访问测试

```bash
Linux 或 Windows 都可以当做测试机，尽可能的使用命令行的curl命令测试，浏览器会因为历史记录或缓存无法正常验证效果
```

#### 4.3 总结

##### 优点

| 优点         | 详细说明                                                     |
| ------------ | ------------------------------------------------------------ |
| 高性能       | - Director 仅处理入站请求，响应流量由 Real Server 直接返回客户端，吞吐量高，可支持百万级并发。 |
| 无扩容瓶颈   | - 响应流量不经过 Director，避免了网络带宽和性能瓶颈问题。    |
| 资源消耗低   | - Director 只需处理请求分发，CPU/内存占用较低。              |
| 跨交换机支持 | - Real Server 可与 Director 部署在同一二层网络的不同交换机上（需 VLAN 支持）。 |
| 端口灵活性   | - 支持 Real Server 服务端口与 VIP 不同（需配置端口映射，但需特殊处理）。 |

##### 缺点

| 缺点                | 详细说明                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| 配置复杂度高        | - Real Server 需绑定 VIP 并配置 ARP抑制，防止 IP 冲突（需 内核参数调整）。 |
| 网络限制严格        | - Real Server 必须与 Director 在同一二层网络（不支持跨路由）。           |
| Real Server 数量限制 | - 大规模集群中，VIP 绑定和 ARP 抑制可能增加管理复杂度。                      |

##### 适用场景
1. 高并发Web服务：如电商、社交平台等需要高吞吐量的场景。
2. 低延迟应用：实时服务（在线游戏、视频会议）要求快速响应。
3. 同机房集群：Real Server 与 Director 在同一局域网内。
4. 对外服务端口固定：如 HTTP/80、HTTPS/443 等标准端口。

##### 不适用场景
1. 跨地域部署：Real Server 必须与 Director 在同一二层网络，无法跨广域网。
2. 动态IP环境：Real Server 需静态绑定 VIP，动态IP难以管理。

### 五、NAT、DR、TUN三种模式的对比



| 对比维度         | NAT模式                                                                 | DR模式                                                                 | TUN模式                                                                 |
|----------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| 工作原理         | Director 修改请求/响应包的 IP地址和端口，完成双向NAT转换。               | Director 仅修改请求包的 MAC地址，Real Server 直接通过 VIP 响应客户端。   | Director 通过 IP隧道（如IPIP） 封装请求包，Real Server 解封装后处理并直接响应。 |
| 数据包流向       | 请求和响应均经过 Director。                                                | 仅请求经过 Director，响应由 Real Server 直连客户端。                        | 仅请求经过 Director（隧道传输），响应由 Real Server 直连客户端。             |
| 网络层要求       | Real Server 可位于私有网络，与 Director 路由可达即可。                      | Real Server 必须与 Director 在同一二层网络（支持ARP）。                  | Real Server 可与 Director 跨三层网络（需支持IP隧道协议）。               |
| Real Server配置  | 仅需设置默认网关为 Director 的 DIP。                                        | 需绑定 VIP 到本地回环接口，并配置 ARP抑制。                             | 需支持 IP 隧道协议（如IPIP），并绑定 VIP 到隧道接口。                         |
| IP地址可见性     | 客户端看到 Director 的 VIP，Real Server 看到客户端真实IP（未SNAT时）。       | 客户端看到 VIP，Real Server 直接使用 VIP 响应。                             | 客户端看到 VIP，Real Server 通过隧道解封装后获取原始请求。                   |
| 性能             | 低（Director 处理双向流量，易成瓶颈）。                                     | 高（Director 仅处理入站请求，响应不经过 Director）。                        | 中高（隧道封装/解封装有一定开销，优于 NAT，但低于DR）。                     |
| 扩展性           | 受限（Director 性能限制横向扩展）。                                         | 高（可扩展大量 Real Server，但受限于二层网络规模）。                        | 高（支持跨地域部署，适合广域网扩展）。                                      |
| 配置复杂度       | 简单（仅需 Director 配置 NAT 规则）。                                       | 中等（需 Real Server 配置 ARP 抑制和 VIP 绑定）。                           | 复杂（需配置隧道接口及路由规则）。                                          |
| 端口灵活性       | 支持端口映射（VIP端口 ≠ Real Server端口）。                                 | 要求 VIP端口 = Real Server端口（默认限制）。                                | 要求 VIP端口 = Real Server端口（隧道模式下通常一致）。                       |
| 典型应用场景     | 中小规模内部集群、异构网络环境。                                            | 高并发Web服务、同机房高性能集群。                                           | 跨地域负载均衡、云环境多可用区部署。                                        |
| 优点             | - 配置简单<br>- 支持私有网络<br>- 端口映射灵活                              | - 高性能<br>- 无响应流量瓶颈<br>- 低延迟                                    | - 支持跨网络扩展<br>- 避免单点带宽瓶颈                                      |
| 缺点             | - Director易成瓶颈<br>- 带宽消耗大<br>- 需SNAT配置                          | - 要求二层网络<br>- ARP抑制配置复杂<br>- VIP暴露风险                        | - 隧道配置复杂<br>- 额外封装开销<br>- 依赖隧道协议支持                      |

##### 总结选择建议
1. NAT模式：适合快速验证、中小规模内部服务，或 Real Server 无法修改配置的场景。
2. DR模式：适合高并发、低延迟的同机房集群，需确保 Real Server 与 Director 在同一二层网络。
3. TUN模式：适合跨地域或云环境部署，能绕过网络层限制，但需处理隧道配置复杂性。

##### TUN模式的局限性


| 局限性               | 现代替代方案的优势                                      |
|--------------------------|------------------------------------------------------------|
| 配置复杂             | 云原生负载均衡（如 AWS ALB、GCP Cloud LB）提供全托管服务，无需手动配置隧道。 |
| 性能开销             | IP 隧道封装/解封装增加延迟，性能低于 DR 模式或云原生方案。               |
| 运维成本高           | 需维护隧道协议和路由规则，云原生方案自动化程度更高。                     |
| 扩展性受限           | 传统 TUN 集群扩展需手动调整，云服务商支持弹性伸缩（Auto Scaling）。      |

---

### 六、ipvs命令选项整理拓展

#### 6.1 虚拟服务（Virtual Service）管理
| 选项       | 功能                                                                 | 示例                                                                 |
|----------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `-A`           | 添加一个虚拟服务（VIP:Port）                                             | `ipvsadm -A -t 192.168.1.100:80 -s rr`                                   |
| `-E`           | 编辑已存在的虚拟服务                                                     | `ipvsadm -E -t 192.168.1.100:80 -s wlc`                                  |
| `-D`           | 删除一个虚拟服务                                                         | `ipvsadm -D -t 192.168.1.100:80`                                        |
| `-t`           | 指定TCP协议及端口（格式：`VIP:Port`）                                    | `ipvsadm -A -t 10.0.0.1:443 -s sh`                                      |
| `-u`           | 指定UDP协议及端口                                                        | `ipvsadm -A -u 10.0.0.1:53 -s lc`                                       |
| `-s`           | 指定调度算法（如 `rr`、`wrr`、`lc`、`wlc` 等）                           | `ipvsadm -A -t 10.0.0.1:80 -s wlc`                                      |
| `-p`           | 启用持久连接（会话保持），单位为秒                                       | `ipvsadm -A -t 10.0.0.1:80 -s rr -p 300`                                |
| `-S`           | 保存当前规则到标准输出（备份或持久化）                                   | `ipvsadm -S > /etc/sysconfig/ipvsadm`                                   |
| `-R`           | 从文件恢复规则                                                           | `ipvsadm -R < /etc/sysconfig/ipvsadm`                                   |

#### 6.2 Real Server管理
| 选项       | 功能                                                                 | 示例                                                                 |
|----------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `-a`           | 向虚拟服务添加Real Server                                               | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -m -w 5`                  |
| `-e`           | 编辑已存在的Real Server配置                                             | `ipvsadm -e -t 10.0.0.1:80 -r 192.168.1.10:80 -w 10`                    |
| `-d`           | 从虚拟服务中删除Real Server                                             | `ipvsadm -d -t 10.0.0.1:80 -r 192.168.1.10:80`                          |
| `-r`           | 指定Real Server的IP和端口                                               | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:8080 -g`                     |
| `-m`           | 使用NAT模式（Masquerading）                                             | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -m`                       |
| `-g`           | 使用DR模式（Direct Routing）                                            | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -g`                       |
| `-i`           | 使用TUN模式（IP隧道）                                                   | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -i`                       |
| `-w`           | 设置Real Server的权重（仅对加权调度算法有效）                           | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -g -w 3`                  |
| `-x`           | 设置最大活动连接数（超出后停止分配新连接）                               | `ipvsadm -a -t 10.0.0.1:80 -r 192.168.1.10:80 -g -x 1000`               |

#### 6.3 查看与统计信息
| 选项            | 功能                                                                 | 示例                                                                 |
|---------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `-L`/`-l` / `--list` | 列出所有虚拟服务和Real Server                                           | `ipvsadm -ln`（`-n`禁用DNS解析）                                         |
| `--stats`           | 显示统计信息（连接数、流量等）                                           | `ipvsadm -ln --stats`                                                   |
| `--rate`            | 显示每秒连接速率                                                         | `ipvsadm -ln --rate`                                                    |
| `--timeout`         | 显示当前连接超时设置                                                     | `ipvsadm -l --timeout`                                                  |
| `--set`             | 设置TCP/UDP连接超时时间（秒）                                            | `ipvsadm --set 7200 300 60`（TCP/UDP空闲超时、TCP会话保持时间、UDP超时）|

#### 6.4 持久化连接管理
| 选项       | 功能                                                                 | 示例                                                                 |
|----------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `-p`           | 设置持久连接超时时间（会话保持）                                         | `ipvsadm -A -t 10.0.0.1:80 -s rr -p 600`                                |
| `-b`           | 设置持久连接的带宽限制（需内核支持）                                     | `ipvsadm -A -t 10.0.0.1:80 -s rr -b 1024`                               |

会话保持我们之前在讲SH算法时提到过，你可以理解成-p选项设置的会话保持只在一定时间内有效，相当于限时VIP，而SH算法的会话保持相当于永久VIP。

#### 6.5 全局参数

| 选项            | 功能                                                                 | 示例                                                                 |
|---------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `-C`                | 清空所有规则                                                            | `ipvsadm -C`                                                            |
| `--start-daemon`    | 启动IPVS同步守护进程（主备模式）                                        | `ipvsadm --start-daemon master`                                         |
| `--stop-daemon`     | 停止IPVS同步守护进程                                                    | `ipvsadm --stop-daemon`                                                 |

### **七、高可用集群**

```bash
#LVS + Keepalived 高可用负载均衡实验文档

#二、Keepalived 实现 Nginx 高可用

#1. 工作原理

- VRRP 协议：主备节点通过 VRRP 协议竞争 VIP，主节点故障时 VIP 自动漂移到备节点。
- 健康检查：Keepalived 检测 Nginx 进程状态，若 Nginx 宕机则自动切换 VIP。

#2. 实验架构

客户端 → Nginx 主备节点（VIP：192.168.1.200）

#3. 实验步骤

#3.1 安装 Nginx 和 Keepalived

```bash
#安装 keepalived（高可用核心组件）
dnf -y install keepalived
#补充：原内容未提 Nginx 安装，需手动安装（EPEL 仓库提供）
dnf -y install nginx
```

### 八、NAT 模式高可用keepalived

#### 1. 配置文件（Director 节点）

```bash
# 查看 NAT 模式 keepalived 配置
cat /etc/keepalived/keepalived.conf
```

配置文件内容（保留原格式）：

```conf
! Configuration File for keepalived

global_defs {
   router_id LVS_MASTER
   #vrrp_skip_check_adv_addr
   #vrrp_strict
   #vrrp_garp_interval 0
   #vrrp_gna_interval 0
}

vrrp_instance VI_1 {
    state MASTER
    interface ens160
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        192.168.54.200
    }
}

virtual_server 192.168.54.200 80 {
    delay_loop 6
    lb_algo wrr
    lb_kind NAT  # LVS 模式改为 NAT
    persistence_timeout 0
    protocol TCP

    real_server 192.168.54.105 80 {
        weight 2
        connect_timeout 3
        retry 3
        delay_before_retry 3
    }

    real_server 192.168.54.104 80 {
        weight 1
        connect_timeout 3
        retry 3
        delay_before_retry 3
    }
}

vrrp_instance VI_2 {
    state MASTER
    interface ens192
    virtual_router_id 52
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        192.168.55.200
    }
}

virtual_server 192.168.55.200 80 {
    delay_loop 6
    lb_algo wrr
    lb_kind NAT
    persistence_timeout 0
    protocol TCP

    real_server 192.168.54.105 80 {
        weight 2
        connect_timeout 3
        retry 3
        delay_before_retry 3
    }

    real_server 192.168.54.104 80 {
        weight 1
        connect_timeout 3
        retry 3
        delay_before_retry 3
    }
}
```

#### 2. 关键说明

- NAT 模式无需配置 Real Server 的 ARP 抑制，但需确保 Director 开启 IP 转发（echo 1 > /proc/sys/net/ipv4/ip_forward）。
- 多 VIP 实例（VI_1/VI_2）可绑定不同网卡，实现多业务高可用。

​       
