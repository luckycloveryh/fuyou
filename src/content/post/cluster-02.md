---
title: "企业防火墙：iptables 与 nftables 基础"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-02/1200/675"
draft: false
tags: ["集群", "Obsidian"]
categories: ["5. 集群阶段"]
slug: "cluster-02"
description: "介绍《企业防火墙：iptables 与 nftables 基础》，涵盖企业安全防护之-防火墙、防火墙的发展历程和Linux中防火墙的存在形式等实践要点。"
---
## 企业安全防护之-防火墙

---

### 一、防火墙的发展历程

防火墙作为网络安全的重要组成部分，其发展历程经历了多个阶段，逐步从简单的访问控制工具演变为功能强大的综合性安全设备。以下是防火墙发展的简要介绍：

第一代防火墙：包过滤防火墙（1980年代末-1990年代初）：防火墙的概念最早出现在互联网发展的初期。第一代防火墙主要基于包过滤技术，通过检查数据包的头部信息（如源IP地址、目标IP地址、端口号、协议类型等）来决定是否允许数据包通过。这种防火墙工作在网络层（OSI模型第3层），规则简单，性能较高，但功能有限，无法识别数据包的内容或状态，容易被绕过。例如，它无法阻止伪造IP地址的攻击。

第二代防火墙：状态检测防火墙（1990年代中期）：随着网络应用的复杂化，单纯的包过滤已无法满足需求。第二代防火墙引入了状态检测技术（Stateful Inspection）。它不仅检查数据包的头部信息，还会跟踪连接的状态（如TCP会话的建立、数据传输和关闭），通过维护状态表来判断数据包是否属于合法会话。这种防火墙工作在传输层（OSI模型第4层），安全性显著提高，能够防御一些简单的攻击，如SYN洪泛攻击。

第三代防火墙：应用防火墙（2000年代初）：随着Web应用和复杂协议的普及，防火墙开始向应用层（OSI模型第7层）扩展。第三代防火墙被称为应用层防火墙，能够深入检查数据包的内容，而不仅仅是头部信息。它可以识别特定的应用程序或协议（如HTTP、FTP），并根据应用层规则进行过滤。例如，它可以阻止特定的URL访问或检测恶意代码。这种防火墙的优点是精细化控制，但缺点是性能开销较大。

第四代防火墙：下一代防火墙（NGFW，2010年代）：下一代防火墙（Next-Generation Firewall, NGFW）是防火墙发展的一个重要里程碑。它集成了传统防火墙的功能，并加入了更高级的特性，如入侵检测与防御系统（IDS/IPS）、深度包检测（DPI）、应用识别与控制、用户身份管理等。NGFW能够根据应用程序、用户行为和威胁情报进行动态调整，适应云计算和移动互联网的复杂环境。例如，它可以识别并阻止加密流量中的恶意行为（如SSL/TLS隧道中的威胁）。

现代防火墙：云原生与AI驱动（2020年代至今）：随着云计算、虚拟化和零信任架构的兴起，防火墙进一步演变为云原生防火墙和AI驱动防火墙。云原生防火墙部署在云环境中，支持分布式架构，能够保护容器、微服务和多云环境。AI驱动防火墙则利用机器学习和大数据分析，主动识别未知威胁（如零日攻击），并实现自动化响应。此外，防火墙的功能逐渐融入SASE（安全访问服务边缘）和XDR（扩展检测与响应）等综合安全框架中，强调全局防护。

总结与发展趋势：从最初的包过滤到如今的智能化和云化，防火墙的发展反映了网络安全需求的不断升级。现代防火墙不再是单一的设备，而是与网络生态系统深度整合的安全解决方案。未来，随着5G、IoT和量子计算的普及，防火墙可能会进一步向分布式、智能化的方向演进，同时更加注重用户体验和隐私保护。

---

### 二、Linux中防火墙的存在形式

在Linux系统中，防火墙工具是管理和保护网络安全的重要组件。以下是对常见防火墙工具 iptables、nftables 和 firewalld 的简要介绍，包括其功能、特点及适用场景，帮助您在课程设计中更好地讲解这些工具。

#### 1. iptables

```bash
iptables 是Linux系统中传统的防火墙工具，基于内核的Netfilter框架开发。它通过定义规则来控制网络数据包的过滤、转发和修改，广泛应用于早期的Linux发行版中。

# 功能与特点
- iptables 基于表（tables）和链（chains）管理规则。
  - 常见的表包括 filter（过滤）、nat（网络地址转换）、mangle（数据包修改）、raw（连接跟踪）
  - 链包括 PREROUTING、INPUT、FORWARD、OUTPUT、POSTROUTING
  - 俗称四表五链
- 规则匹配：支持基于IP地址、端口、协议（如TCP、UDP、ICMP）、状态（如NEW、ESTABLISHED）等条件过滤数据包。
- 状态检测：通过 conntrack 模块支持状态检测，适合实现动态防火墙策略。
- 灵活性：支持用户自定义链，规则配置非常灵活。

# 优点
- 轻量高效，适用于资源有限的系统。
- 被广泛支持，几乎所有Linux发行版都预装。

# 缺点
- 配置复杂，尤其是大规模规则时，管理和调试困难。
- 不支持现代功能，如动态更新或高级应用层过滤。

# 示例
# 阻止来自特定IP的流量
iptables -A INPUT -s 192.168.1.100 -j DROP
# 允许SSH访问
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

iptables -t filter -A INPUT -s 192.168.88.1 -d 192.168.88.140 -p tcp --dport 80 -i ens160 -j DROP
```

#### 2. nftables

```bash
nftables 是 iptables 的继任者，于2014年引入Linux内核（3.13版本起），旨在解决 iptables 的局限性。它同样基于Netfilter框架，但提供了更现代化和统一的规则管理方式。

# 功能与特点
- 统一框架：将 iptables 的多个表（filter、nat 等）名称弱化处理，转成了表类型。
- 语法改进：采用更直观的脚本化语法，支持批量操作和原子性更新。
- 高效性：内部使用虚拟机（nftables VM）处理规则，性能更优，尤其在复杂规则集下。
- 扩展性：支持动态规则更新、集合（sets）功能，可高效管理大量IP或端口。

# 优点
- 配置更简洁，易于维护和扩展。
- 支持现代网络需求，如IPv6优化和容器化环境。
- 向下兼容 iptables（通过 iptables-nft 层）。

# 缺点
- 学习曲线较陡，尤其是对习惯 iptables 的用户。
- 部分老旧系统可能不支持。

# 示例
# 创建表并添加规则
nft add table ip abc
nft add chain ip abc bcd { type filter hook input priority 0 \; }
nft add rule ip abc bcd ip saddr 192.168.1.100 drop
```

#### 3. firewalld

```bash
firewalld 是基于iptables或nftables的高级防火墙管理工具，默认集成在许多现代Linux发行版中（如CentOS 7/8、RHEL、Fedora）。它提供动态配置和用户友好的管理界面。

# 功能与特点
- 区域管理：通过“区域”（zones，如 public、trusted、drop）简化规则配置，不同网络接口可绑定不同区域。
- 动态更新：支持运行时修改规则，无需重启服务。
- 服务抽象：内置服务定义（如ssh、http），无需手动指定端口。
- 后端支持：可选择 iptables 或 nftables 作为底层实现（RHEL 8 起默认使用nftables）。

# 优点
- 配置直观，适合初学者和系统管理员。
- 支持图形化界面（firewall-config）和命令行工具（firewall-cmd）。
- 适用于桌面和服务器环境。

# 缺点
- 相比直接使用 iptables/nftables，性能开销略高。
- 对于复杂场景，灵活性不如底层工具。

# 示例
# 启动firewalld并设置默认区域
systemctl start firewalld
firewall-cmd --set-default-zone=public
# 允许HTTP服务
firewall-cmd --zone=public --add-service=http --permanent
firewall-cmd --reload
```

#### 三者对比
| 工具      | 复杂度 | 功能性       | 动态性 | 适用对象           |
| --------- | ------ | ------------ | ------ | ------------------ |
| iptables  | 高     | 中           | 低     | 高级用户、老系统   |
| nftables  | 中     | 高           | 高     | 现代系统、新版系统 |
| firewalld | 低     | 中（可扩展） | 高     | 初学者、企业用户   |

---

### 三、iptables防火墙

在Linux系统中，iptables 是基于内核 Netfilter 框架的经典防火墙工具，其核心结构由四张表（tables）和五个链（chains）组成。每个表定义了不同的功能，而每个链决定了数据包在特定阶段的处理方式。以下是对四表五链的详细介绍及其功能作用。

#### 1. 四表（Tables）

iptables 通过表来组织规则，每张表专注于特定的数据包处理功能。

filter 表

- 功能作用：负责数据包的过滤，是 iptables 的默认表，用于决定数据包是否被允许通过或不允许通过。
- 适用场景：访问控制、阻止特定流量。
- 支持的链：INPUT、FORWARD、OUTPUT。

nat 表

- 功能作用：用于网络地址转换（NAT），修改数据包的源地址或目标地址，常用于IP伪装、端口转发等。
- 适用场景：内网访问外网、服务器端口映射。
- 支持的链：PREROUTING、POSTROUTING、INPUT、OUTPUT（部分支持）。

mangle 表

- 功能作用：用于修改数据包的特殊属性，如TTL（生存时间）、TOS（服务类型）或标记数据包供后续处理。
- 适用场景：流量整形、QoS（服务质量）控制。
- 支持的链：PREROUTING、INPUT、FORWARD、OUTPUT、POSTROUTING。

raw 表

- 功能作用：用于在数据包处理的最早阶段进行特殊处理，主要用于设置数据包的“不跟踪”状态（跳过连接跟踪）。
- 适用场景：提高性能（如跳过NAT跟踪）、处理特殊流量。
- 支持的链：PREROUTING、OUTPUT。

#### 2. 五链（Chains）
iptables 的链定义了数据包在网络栈中的处理阶段，不同链适用于不同的数据包流向。

PREROUTING 链

- 功能作用：数据包进入系统后、路由决策前处理，用于修改目标地址或标记数据包。
- 适用表：nat、mangle、raw。

INPUT 链

- 功能作用：处理发往本机的数据包，用于本地服务的访问控制。
- 适用表：filter、mangle。

FORWARD 链

- 功能作用：处理需要转发的流量（即本机作为路由器时），用于控制经过本机的数据包。
- 适用表：filter、mangle。

OUTPUT 链

- 功能作用：处理本机发出的数据包，用于限制本地发起的流量。
- 适用表：filter、nat、mangle、raw。

POSTROUTING 链

- 功能作用：数据包离开系统前、路由决策后处理，用于修改源地址或完成NAT。
- 适用表：nat、mangle。

#### 3. 语法格式

```bash
格式：iptables -t 表 -A 链 条件1,条件2,... 策略
案例：
$ iptables -t filter -A INPUT -p tcp --dport 22 -j DROP

选项：
    -A		# 追加规则
    -I		# 插入规则
    	-I INPUT line
    -L		# 查看规则
    -n		# 数字化显示-nL
    -v  	# 显示更加详细信息
    --line-numbers # 显示行号
    -F		# 清空规则（-t 表名，仅清空内存中的缓存）
    -D		# 删除规则
    	-D INPUT line
    -P(大)  # 指定防火墙链的默认规则(缺省规则)

条件(规则)：
    -s			# 判断来源IP地址
    -d			# 判断目标IP地址
    -p(小)	   # 判断传输协议
    --sport		# 判断来源端口
    --dport		# 判断目标端口
    -i			# 判断入站接口
    -o			# 判断出站接口
    --icmp-type # 判断icmp的具体类型（0:ping应答,8:ping请求）
    -m multiport --dport	# 多端口匹配（调用多端口模块的支持）
    -m iprange --src-range	# IP范围匹配模块,匹配来源范围
    		   --dst-range 	# 匹配目标范围
    -m mac --mac-source		# 匹配来源MAC地址
	-m state --state ESTABLISHED,RELATED	# 匹配数据包连接状态
    ...
    特殊：
    	-p tcp --dport 80
    	# 端口条件无法单独使用，必须结合协议，并且协议在前，端口在后。
    	
    iptables -A INPUT -p tcp -m multiport --dport 25,80,110,143 -j ACCEPT
    iptables -A FORWARD -p tcp -m iprange --src-range 192.168.4.21-192.168.4.28 -j ACCEPT
    iptables -A INPUT -m mac --mac-source 00:0c:29:c0:55:3f -j DROP
	iptables -I INPUT -p tcp -m state --state ESTABLISHED,RELATED -j ACCEPT


策略(动作)：
    -j
        ACCEPT		# 放行
        REJECT		# 拒绝
        DROP		# 丢弃
        SNAT --to-source IP		# 源地址修改
        MASQUERADE		# 动态源地址转换
        DNAT --to-destination IP 	# 目标地址修改
        REDIRECT --to-ports			# 将请求其他主机的数据包转发给本机的指定端口
        LOG			# 将符合条件的数据包记录在日志中
        ...
        
        # 自上而下顺序匹配，匹配成功即停止，LOG策略除外。
```

#### 4. 四表五链的案例展示

**filter 表案例**

```bash
# 阻止特定IP访问本机：阻止192.168.1.100访问本机
iptables -t filter -A INPUT -s 192.168.1.100 -p tcp --dport 22 -j DROP
# 注释：
# -t filter：指定filter表（默认表，可省略）
# -A INPUT：在INPUT链追加规则
# -s 192.168.1.100：匹配源IP为192.168.1.100的数据包
# -j DROP：目标动作为丢弃数据包
```

```bash
# 阻止本机访问外部IP为8.8.8.8的流量
iptables -t filter -A OUTPUT -d 8.8.8.8 -p udp
--dport 53 -j DROP
# 注释：
# -t filter：指定filter表
# -A OUTPUT：在OUTPUT链追加规则
# -d 8.8.8.8：匹配目标IP为8.8.8.8的数据包
# -j DROP：丢弃匹配的数据包
```

**nat 表案例**

```bash
# 实现内网IP伪装（SNAT）：将内网流量伪装为本机外网IP
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE
# 注释：
# -t nat：指定nat表
# -A POSTROUTING：在POSTROUTING链追加规则
# -s 192.168.1.0/24：匹配源IP为192.168.1.0网段的数据包
# -o eth0：指定出接口为eth0
# -j MASQUERADE：将源地址伪装为eth0的IP（动态NAT-SNAT的一种动态模式）
```

```bash
# 端口转发（DNAT）：将外部访问本机80端口的流量转发到内网192.168.1.10:8080
iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.1.10:8080
# 注释：
# -t nat：指定nat表
# -A PREROUTING：在PREROUTING链追加规则
# -p tcp：匹配TCP协议
# --dport 80：匹配目标端口80
# -j DNAT：目标动作为修改目标地址
# --to-destination 192.168.1.10:8080：将数据包转发到指定内网地址和端口
```

**mangle 表案例**

```bash
# 修改数据包的TTL值：将本机发出数据包的TTL设置为100
iptables -t mangle -A OUTPUT -j TTL --ttl-set 100
# 注释：
# -t mangle：指定mangle表
# -A OUTPUT：在OUTPUT链追加规则
# -j TTL：调用TTL目标模块
# --ttl-set 100：将TTL值设置为100

# 验证：
iptables -t mangle -L OUTPUT -v -n
ping example.com
tcpdump -i eth0 icmp    
# 捕获 ICMP 响应，查看 TTL 值是否为 100

TTL（Time To Live）是 IP 数据包的一个字段，表示数据包在网络中允许经过的最大路由跳数。
某些网络会检查 TTL 值以限制设备接入，通过增加 TTL 值，使数据包看起来来合法终端，从而被放行。
注意：TTL 修改的合法性：某些网络可能禁止修改 TTL，需遵守当地政策
```

```bash
# 标记数据包以供路由使用：为特定流量打标记
iptables -t mangle -A PREROUTING -s 192.168.1.100 -j MARK --set-mark 1
# 注释：
# -t mangle：指定mangle表
# -A PREROUTING：在PREROUTING链追加规则
# -s 192.168.1.100：匹配源IP为192.168.1.100
# -j MARK：调用MARK目标模块
# --set-mark 1：为数据包打上标记1（可用于后续策略路由），ip route add ...
```

**raw 表案例**

```bash
# 跳过特定流量的连接跟踪：对来自192.168.1.100的数据包跳过连接跟踪
iptables -t raw -A PREROUTING -s 192.168.1.100 -j NOTRACK
# 注释：
# -t raw：指定raw表
# -A PREROUTING：在PREROUTING链追加规则
# -s 192.168.1.100：匹配源IP为192.168.1.100
# -j NOTRACK：跳过连接跟踪，提高性能
```

```bash
# 跳过本机发出流量的跟踪：对本机发出的UDP流量跳过连接跟踪
iptables -t raw -A OUTPUT -p udp -j NOTRACK
# 注释：
# -t raw：指定raw表
# -A OUTPUT：在OUTPUT链追加规则
# -p udp：匹配UDP协议
# -j NOTRACK：跳过连接跟踪
```

**PREROUTING 链案例**

```bash
# 重定向外部HTTP流量：将外部访问80端口的流量重定向到8080端口
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080
# 注释：
# -t nat：指定nat表
# -A PREROUTING：在PREROUTING链追加规则
# -p tcp：匹配TCP协议
# --dport 80：匹配目标端口80
# -j REDIRECT：重定向流量
# --to-ports 8080：重定向到本机8080端口
```

**INPUT 链案例**

```bash
# 允许SSH访问：允许外部访问本机SSH服务
iptables -t filter -A INPUT -p tcp --dport 22 -j ACCEPT
# 注释：
# -t filter：指定filter表
# -A INPUT：在INPUT链追加规则
# -p tcp：匹配TCP协议
# --dport 22：匹配目标端口22（SSH默认端口）
# -j ACCEPT：允许匹配的数据包通过
```

**FORWARD 链案例**

```bash
# 允许内网访问外网：允许192.168.1.0网段的流量转发到外部
iptables -t filter -A FORWARD -s 192.168.1.0/24 -j ACCEPT
# 注释：
# -t filter：指定filter表
# -A FORWARD：在FORWARD链追加规则
# -s 192.168.1.0/24：匹配源IP为192.168.1.0网段
# -j ACCEPT：允许转发
```

**OUTPUT 链案例**

```bash
# 限制本机ping外部：禁止本机发送ICMP请求（ping）
iptables -t filter -A OUTPUT -p icmp --icmp-type echo-request -j DROP
# 注释：
# -t filter：指定filter表
# -A OUTPUT：在OUTPUT链追加规则
# -p icmp：匹配ICMP协议
# --icmp-type echo-request：匹配ping请求
# -j DROP：丢弃匹配数据包
```

**POSTROUTING 链案例**

```bash
# 伪装内网流量：将内网流量伪装为本机IP
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -j SNAT --to-source 10.20.30.40
# 注释：
# -t nat：指定nat表
# -A POSTROUTING：在POSTROUTING链追加规则
# -s 192.168.1.0/24：匹配源IP为192.168.1.0网段
# -j SNAT：源地址转换
```

---

### 四、nftables防火墙

在Linux系统中，nftables 是基于内核 Netfilter 框架的新一代防火墙工具，取代了传统的 iptables。其核心结构依然围绕表（tables）和链（chains），但表的功能更加统一，用户可以自定义表的类型和功能。

#### 1. 四表（Tables）

nftables 中没有像 iptables 那样严格区分 filter、nat、mangle 和 raw 表，而是通过用户定义的表类型来实现不同功能。以下是常见的四种表类型及其功能作用。

#### 2. 五链（Chains）
nftables 的链定义了数据包在网络栈中的处理阶段，与 iptables 的五链类似，但链的定义更加灵活，用户需要显式指定链的挂钩（hook）。

#### 3. 语法格式

```bash
格式：nft add rule 表名 链名 条件1 条件2 ... 策略

常用命令：
    nft add table <family> <表名>    # 创建表（如 ip、inet、arp）
    nft add chain <表名> <链名> { type <表类型> hook <挂钩(链类型)> priority <优先级> \; }  # 创建链
    nft list ruleset                 # 查看所有规则
    nft delete rule <表名> <链名> handle <编号>  # 删除规则
    nft flush ruleset 		# 清空所有规则，但保留表和链的定义（仅删除规则条目）

条件（规则）：
    ip saddr <IP>         # 判断来源IP地址
    ip daddr <IP>         # 判断目标IP地址
    ip protocol <协议>    # 判断传输协议（如 tcp、udp）
    tcp sport <端口>      # 判断来源端口
    tcp dport <端口>      # 判断目标端口
    iifname <接口>        # 判断入站接口
    oifname <接口>        # 判断出站接口
    ...

策略（动作）：
    accept                # 放行
    drop                  # 丢弃
    reject                # 拒绝
    snat to <IP>          # 源地址修改
    dnat to <IP:端口>     # 目标地址修改
```

#### 4. 四表五链的案例展示

**filter 表案例**

```bash
# 阻止特定IP访问本机：阻止192.168.1.100访问本机
nft add table ip filter
nft add chain ip filter input { type filter hook input priority 0 \; }
nft add rule ip filter input ip saddr 192.168.1.100 drop
# 注释：
# add table ip filter：创建名为 filter 的表，适用于IPv4
# add chain ...：在 filter 表中创建 input 链，挂钩到 input 阶段
# add rule ...：追加规则，匹配源IP为192.168.1.100并丢弃
```

```bash
# 禁止本机访问特定网站：阻止本机访问外部IP为8.8.8.8的流量
nft add table ip filter
nft add chain ip filter output { type filter hook output priority 0 \; }
nft add rule ip filter output ip daddr 8.8.8.8 ip protocol udp udp dport 53 drop
# 注释：
# add chain ...：创建 output 链，挂钩到 output 阶段
# add rule ...：匹配目标IP为8.8.8.8并丢弃
```

**nat 表案例**

```bash
# 实现内网IP伪装（SNAT）：将内网流量伪装为本机外网IP
nft add table ip nat
nft add chain ip nat postrouting { type nat hook postrouting priority 100 \; }
nft add rule ip nat postrouting ip saddr 192.168.1.0/24 oifname "eth0" masquerade
# 注释：
# add table ip nat：创建 nat 表
# add chain ...：创建 postrouting 链，挂钩到 postrouting 阶段
# add rule ...：匹配192.168.1.0/24网段流量，从 eth0 接口发出时伪装地址
```

```bash
# 端口转发（DNAT）：将外部访问本机80端口的流量转发到内网192.168.1.10:8080
nft add table ip nat
nft add chain ip nat prerouting { type nat hook prerouting priority 0 \; }
nft add rule ip nat prerouting ip protocol tcp tcp dport 80 dnat to 192.168.1.10:8080
# 注释：
# add chain ...：创建 prerouting 链，挂钩到 prerouting 阶段
# add rule ...：匹配TCP 80端口流量，转发到192.168.1.10:8080
```

**mangle 表案例**

```bash
# 修改数据包的TTL值：将本机发出数据包的TTL设置为100
nft add table ip mangle
nft add chain ip mangle output { type filter hook output priority -150 \; }
nft add rule ip mangle output ip ttl set 100
# 注释：
# add chain ...：创建 output 链，优先级-150（mangle 表默认优先级）
# add rule ...：将发出数据包的TTL设置为100
```

```bash
# 标记数据包以供路由使用：为特定流量打标记
nft add table ip mangle
nft add chain ip mangle prerouting { type filter hook prerouting priority -150 \; }
nft add rule ip mangle prerouting ip saddr 192.168.1.100 meta mark set 1
# 注释：
# add chain ...：创建 prerouting 链
# add rule ...：匹配源IP为192.168.1.100，打上标记1
```

**raw 表案例**

```bash
# 跳过特定流量的连接跟踪：对来自192.168.1.100的数据包跳过连接跟踪
nft add table ip raw
nft add chain ip raw prerouting { type filter hook prerouting priority -300 \; }
nft add rule ip raw prerouting ip saddr 192.168.1.100 ct state untracked
# 注释：
# add chain ...：创建 prerouting 链，优先级-300（raw 表默认优先级）
# add rule ...：匹配192.168.1.100，设置为不跟踪状态
```

```bash
# 跳过本机发出流量的跟踪：对本机发出的UDP流量跳过连接跟踪
nft add table ip raw
nft add chain ip raw output { type filter hook output priority -300 \; }
nft add rule ip raw output ip protocol udp ct state untracked
# 注释：
# add chain ...：创建 output 链
# add rule ...：匹配UDP流量，设置为不跟踪状态
```

**prerouting 链案例**

```bash
# 重定向外部HTTP流量：将外部访问80端口的流量重定向到8080端口
nft add table ip nat
nft add chain ip nat prerouting { type nat hook prerouting priority 0 \; }
nft add rule ip nat prerouting ip protocol tcp tcp dport 80 redirect to :8080
# 注释：
# add chain ...：创建 prerouting 链
# add rule ...：匹配TCP 80端口流量，重定向到本机8080端口
```

**input 链案例**

```bash
# 允许SSH访问：允许外部访问本机SSH服务
nft add table ip filter
nft add chain ip filter input { type filter hook input priority 0 \; }
nft add rule ip filter input ip protocol tcp tcp dport 22 accept
# 注释：
# add chain ...：创建 input 链
# add rule ...：匹配TCP 22端口，允许通过
```

**forward 链案例**

```bash
# 允许内网访问外网：允许192.168.1.0网段的流量转发到外部
nft add table ip filter
nft add chain ip filter forward { type filter hook forward priority 0 \; }
nft add rule ip filter forward ip saddr 192.168.1.0/24 accept
# 注释：
# add chain ...：创建 forward 链
# add rule ...：匹配192.168.1.0/24网段，允许转发
```

**output 链案例**

```bash
# 限制本机ping外部：禁止本机发送ICMP请求（ping）
nft add table ip filter
nft add chain ip filter output { type filter hook output priority 0 \; }
nft add rule ip filter output ip protocol icmp icmp type echo-request drop
# 注释：
# add chain ...：创建 output 链
# add rule ...：匹配ICMP echo-request，丢弃数据包
```

**postrouting 链案例**

```bash
# 伪装内网流量：将内网流量伪装为本机IP
nft add table ip nat
nft add chain ip nat postrouting { type nat hook postrouting priority 100 \; }
nft add rule ip nat postrouting ip saddr 192.168.1.0/24 masquerade
# 注释：
# add chain ...：创建 postrouting 链
# add rule ...：匹配192.168.1.0/24网段，伪装为本机IP
```

**总结与说明**

- nftables 的改进：相比 iptables，nftables 统一了表的功能，用户需要手动创建表和链，语法更简洁，支持批量操作和原子性更新。

---

### 五、firewalld 规则管理服务

Firewalld 是 CentOS 7 及之后版本中引入的动态防火墙管理工具，基于 Linux 内核的 Netfilter 框架。它通过高层次的抽象（如区域和服务的概念），简化了防火墙规则的管理，适合动态环境下的使用。Firewalld 默认使用 nftables 作为后端（自 RHEL 8 开始），但在早期版本（如 RHEL 7）中使用 iptables。

#### 1. 核心组件
- 区域（Zones）：
  - 定义网络环境的信任级别，如 `public`、`internal`、`trusted` 等。
  - 每个区域包含一组规则，用于处理特定来源的流量。
  - 数据包根据来源接口或 IP 地址被分配到对应区域。
- 服务（Services）：
  - 预定义的规则模板（如 `ssh`、`http`），封装了端口和协议。
  - 用户可自定义服务，简化规则配置。
- 规则（Rules）：
  - 包括直接规则（Direct Rules）和富规则（Rich Rules）。
  - 直接规则接近 iptables/nftables 的底层语法，富规则支持更复杂的逻辑（如时间限制）。
- 后端（Backend）：
  - Firewalld 通过后端与内核交互，默认支持 nftables，也可切换为 iptables。

#### 2. 数据包处理流程
1. 数据包进入系统。
2. 根据接口或源地址匹配到某个区域（如 `public`）。
3. 在该区域内应用服务规则、端口规则或富规则。
4. 处理结果决定数据包的命运（接受、丢弃等）。

#### 3. 运行模式
- 运行时模式（Runtime）：临时生效，重启后丢失。
- 永久模式（Permanent）：保存到配置文件，重启后生效。

#### 4. 案例展示
**案例 1：查看当前活跃区域**

```bash
firewall-cmd --get-zones
# 显示所有区域
firewall-cmd --get-active-zones
# 显示已激活区域
# 注释：
# 显示当前网络接口绑定的区域，例如：
# public
#   interfaces: eth0
# 适用场景：检查系统当前的区域配置。
```

**案例 2：将接口绑定到指定区域**

```bash
firewall-cmd --zone=internal --add-interface=eth0 --permanent
firewall-cmd --reload
firewall-cmd --get-active-zones
# 注释：
# --add-interface：将 eth0 接口绑定到 internal 区域。
# --permanent：永久生效，重启后保留。
# 适用场景：为特定网络接口分配信任级别。
```

**案例 3：创建自定义区域**

```bash
firewall-cmd --new-zone=myzone --permanent
firewall-cmd --reload
firewall-cmd --get-zones
# 注释：
# --new-zone：创建名为 myzone 的新区域。
# --reload：重新加载配置，使新区域生效。
# 适用场景：为特定网络环境定义专用区域。
```

**案例 4：允许区域内的 SSH 服务**

```bash
firewall-cmd --zone=public --add-service=ssh --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --zone=public --list-services
firewall-cmd --zone=public --list-all

# 注释：
# --add-service：允许 public 区域内的 SSH 服务（默认 TCP 22 端口）。
# 运行时模式临时生效，--permanent 保存配置。
# 适用场景：快速开放常用服务端口。
```

**案例 5：移除区域中的 HTTP 服务**

```bash
firewall-cmd --zone=public --remove-service=http --permanent
firewall-cmd --reload
# 注释：
# --remove-service：禁止 public 区域内的 HTTP 服务（默认 TCP 80 端口）。
# 适用场景：临时或永久关闭某个服务。
```

**案例 6：自定义服务并应用**

```bash
firewall-cmd --new-service=myservice --permanent
firewall-cmd --service=myservice --add-port=5000/tcp --permanent
firewall-cmd --zone=public --add-service=myservice --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --service=myservice --get-ports --permanent
firewall-cmd --zone=public --list-services
firewall-cmd --zone=public --list-all

# 注释：
# --new-service：创建名为 myservice 的新服务。
# --add-port：为服务添加 TCP 5000 端口。
# 应用到 public 区域并重载配置。
# 适用场景：为非标准应用定义专用服务。
```

**案例 7：开放特定端口**

```bash
firewall-cmd --zone=public --add-port=8080/tcp --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --zone=public --list-ports
firewall-cmd --zone=public --list-all

# 注释：
# --add-port：允许 public 区域内的 TCP 8080 端口。
# 适用场景：开放自定义应用端口（如 Web 服务器）。
```

**案例 8：关闭特定端口**

```bash
firewall-cmd --zone=public --remove-port=8080/tcp --permanent
firewall-cmd --reload
# 注释：
# --remove-port：禁止 public 区域内的 TCP 8080 端口。
# 适用场景：临时或永久关闭不再需要的端口。
```

**案例 9：限制特定 IP 访问 SSH**

```bash
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.100" service name="ssh" drop' --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --zone=public --list-rich-rules
firewall-cmd --zone=public --list-all

# 注释：
# --add-rich-rule：丢弃来自 192.168.1.100 的 SSH 请求。
# family="ipv4" 指定 IPv4，service 指定服务，drop 为动作。
# 适用场景：基于源 IP 进行访问控制。
```

**案例 10：**

```bash
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" service name="http" accept' --permanent
firewall-cmd --reload
```

**案例 11：实现 IP 伪装（MASQUERADE）**

```bash
firewall-cmd --zone=public --add-masquerade --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --zone=public --query-masquerade
# 仅查询masquerade的开启状态
firewall-cmd --zone=public --list-all

# 注释：
# --add-masquerade：启用 external 区域的 IP 伪装（类似 iptables 的 MASQUERADE）。
# 适用场景：内网通过外网接口访问外部网络。
```

**案例 12：端口转发（DNAT）**

```bash
firewall-cmd --zone=public --add-forward-port=port=80:proto=tcp:toport=8080:toaddr=192.168.1.10 --permanent
firewall-cmd --reload

# 验证：
firewall-cmd --zone=public --list-forward-ports

# 注释：
# --add-forward-port：将 public 区域的 TCP 80 端口转发到 192.168.1.10 的 8080 端口。
# 适用场景：将外部请求转发到内网服务器。
```

**案例 13：阻止特定 IP 访问所有服务**

```bash
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.200" drop' --permanent
firewall-cmd --reload
# 注释：
# 丢弃来自 192.168.1.200 的所有流量。
# 适用场景：适用于遭受DDoS攻击时的临时封禁
```

**案例 14：允许 ICMP（Ping）请求**

```bash
firewall-cmd --zone=public --add-icmp-block=echo-request --permanent
firewall-cmd --reload
firewall-cmd --zone=public --remove-icmp-block=echo-request --permanent

# 验证：
firewall-cmd --zone=public --query-icmp-block=echo-request
firewall-cmd --reload
firewall-cmd --zone=public --list-all

# 注释：
# --add-icmp-block --remove-icmp-block：移除 ICMP echo-request 的阻止，允许 Ping。
# 适用场景：调试网络连通性。
```

**案例 15：查看并保存配置**

```bash
firewall-cmd --zone=public --list-all
firewall-cmd --runtime-to-permanent
# 注释：
# --list-all：查看 public 区域的当前配置（服务、端口等）。
# --runtime-to-permanent：将运行时配置保存为永久配置。
# 适用场景：确认规则并持久化配置。
```

---

### 六、firewalld/iptables/nftables对比

以下从结构设计、规则管理、数据包处理和使用场景等方面，对比 Firewalld、iptables 和 nftables。

#### 1. 结构设计
| 特性      | iptables                                                    | nftables                         | Firewalld                                     |
| --------- | ----------------------------------------------------------- | -------------------------------- | --------------------------------------------- |
| 核心结构  | 固定四表（filter、nat、mangle、raw）和五链（PREROUTING 等） | 用户自定义表和链，挂钩到特定阶段 | 基于区域（Zones）和服务（Services）的高层抽象 |
| 表/链定义 | 预定义，用户在固定表和链中添加规则                          | 用户显式创建表和链，灵活性高     | 无需显式定义表链，区域和服务封装底层规则      |
| 规则组织  | 按表和链分散，底层规则直接操作                              | 集中于用户定义的表，规则逻辑灵活 | 按区域组织，服务和规则绑定到区域              |
| 后端依赖  | 直接基于 Netfilter，无抽象层                                | 直接基于 Netfilter，无抽象层     | 依赖 nftables 或 iptables 作为后端            |

- iptables：底层工具，结构固定，规则直接映射到内核的表和链。
- nftables：底层工具，结构灵活，用户定义表和链，提供更高自由度。
- Firewalld：高层管理工具，抽象出区域和服务，屏蔽底层表链细节。

#### 2. 规则管理
| 特性     | iptables                          | nftables                        | Firewalld                                    |
| -------- | --------------------------------- | ------------------------------- | -------------------------------------------- |
| 规则添加 | 单条规则逐一添加（如 `-A INPUT`） | 支持单条或批量（如集合 sets）   | 通过区域和服务批量管理（如 `--add-service`） |
| 动态性   | 不支持动态更新，需重载规则        | 支持动态添加/删除规则           | 原生支持运行时和永久模式切换                 |
| 规则查看 | `iptables -L` 查看分散规则        | `nft list ruleset` 查看集中规则 | `firewall-cmd --list-all` 查看区域规则       |
| 复杂逻辑 | 通过表和链组合实现，配置繁琐      | 支持复杂表达式（如 `ct state`） | 支持富规则（如时间、日志），简单易用         |

#### 3. 数据包处理流程
| 特性     | iptables                        | nftables                            | Firewalld                                   |
| -------- | ------------------------------- | ----------------------------------- | ------------------------------------------- |
| 处理阶段 | 固定五链：PREROUTING → INPUT 等 | 用户定义挂钩：prerouting → input 等 | 区域匹配后交由后端处理（nftables/iptables） |
| 匹配方式 | 线性匹配，按表和链顺序执行      | 增量匹配，支持集合优化              | 区域优先级决定，底层规则由后端执行          |
| 流程控制 | 表和链固定，流程不可调整        | 链挂钩和优先级可调                  | 区域优先级可调，后端流程固定                |

#### 4. 使用场景与适用性
| 特性     | iptables                    | nftables                 | Firewalld                                |
| -------- | --------------------------- | ------------------------ | ---------------------------------------- |
| 简单场景 | 适合小型网络、简单过滤和NAT | 适用，但配置稍复杂       | 非常适合，区域和服务简化操作             |
| 复杂场景 | 配置繁琐，不适合大规模规则  | 适合大规模网络和动态规则 | 适合动态环境，复杂场景需富规则或直接规则 |
| 兼容性   | 广泛支持，老系统依赖        | 新系统普及，需较新内核   | CentOS/RHEL 默认工具，向后兼容 iptables  |
| 学习曲线 | 入门简单，深入复杂          | 初期较难，长期高效       | 入门极易，但深入需理解后端               |

#### 5. 性能对比
| 特性     | iptables                   | nftables                 | Firewalld                                |
| -------- | -------------------------- | ------------------------ | ---------------------------------------- |
| 规则效率 | 线性匹配，规则多时性能下降 | 增量匹配，集合优化性能高 | 依赖后端（nftables 更优，iptables 较差） |
| 内存占用 | 每条规则独立存储，占用高   | 规则共享存储，效率高     | 额外抽象层，略高于底层工具               |
| 动态调整 | 重载影响性能               | 无需重载，性能稳定       | 支持动态调整，性能依赖后端               |

#### 6. 配置保存

| 工具          | 配置文件路径                   | 规则管理命令                          | 持久化方式                    |
| ------------- | ------------------------------ | ------------------------------------- | ----------------------------- |
| **iptables**  | `/etc/sysconfig/iptables`      | `iptables-save` / `iptables-restore`  | 手动保存和加载                |
| **nftables**  | `/etc/sysconfig/nftables.conf` | `nft list ruleset >` / `nft -f`       | 保存到配置文件并启用服务      |
| **firewalld** | `/etc/firewalld/zones/*.xml`   | `firewall-cmd --runtime-to-permanent` | 自动或手动保存到 XML 配置文件 |

### 七、名词解释

```
NGFW (Next-Generation Firewall)
下一代防火墙，结合传统防火墙功能（如包过滤、状态检测）与高级安全特性（如应用识别、入侵防御、用户身份管理），支持深度包检测（DPI）和动态策略调整，适用于现代混合网络环境（如云和移动互联网）。

IDS/IPS (Intrusion Detection System/Intrusion Prevention System)
- IDS: 入侵检测系统，通过分析网络流量或系统日志识别潜在攻击，仅发出警报。
- IPS: 入侵防御系统，在检测到攻击时主动阻断恶意流量，提供实时防护。

DPI (Deep Packet Inspection)
深度包检测技术，检查数据包的应用层内容（如 HTTP 请求、文件内容），而非仅头部信息，用于识别恶意代码、过滤敏感内容或实施应用层控制。

0day (Zero-Day)
指未被公开或修复的软件/硬件漏洞。0day攻击利用此类漏洞发起攻击（如勒索软件、数据窃取），防御难度极高，需依赖行为分析或AI驱动技术检测。

SASE (Secure Access Service Edge)
安全访问服务边缘，融合网络和安全功能的云交付模型，将 SD-WAN、防火墙、零信任等整合为统一的全球云服务，适用于分布式企业（如远程办公、多云访问）。

XDR (Extended Detection and Response)
扩展检测与响应，跨平台（终端、网络、云）的威胁检测与自动化响应方案，通过统一分析日志、行为和上下文数据，提升威胁狩猎和事件响应效率。

IoT (Internet of Things)
物联网，指通过互联网连接的物理设备（如智能家居设备、工业传感器），其安全性薄弱且规模庞大，常成为DDoS攻击的跳板或数据泄露入口，需防火墙、设备认证等多层防护。
```

