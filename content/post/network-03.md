---
title: "SSH、DHCP 与 DNS 服务实战"
date: 2025-12-15T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-03/1200/600"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["4. 网络基础阶段"]
slug: "network-03"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
# SSH+DHCP+DNS服务（原理+全实操）
## 一、SSH服务：安全实现远程登录
### （一）核心功能
SSH（安全外壳协议）的核心作用是实现安全的远程登录，包含**密码登录**和**密钥登录（免密登录）** 两种方式，重点保障远程访问的加密安全性。

### （二）两种登录方式的交互过程
1. **密码登录**：
   客户端将用户名和密码通过服务器的非对称加密（公钥+私钥）处理后发送至服务器；服务器用私钥解密，将解密结果与自身存储的用户密码匹配，匹配成功则允许登录；服务器公钥会存储在客户端SSH相关子目录，首次接受后无需重复确认。
2. **密钥登录**：
   - 客户端生成非对称密钥对，将公钥发送至服务器；
   - 客户端向服务器发送含自身公钥的登录请求，服务器返回自身公钥；
   - 双方通过会话密钥结合客户端公钥加密传输随机字符串，服务器用私钥解密后验证字符串一致性，验证通过则允许登录。

### （三）密钥相关核心命令
```bash
# 生成非对称密钥对，-t指定加密算法（RSA/ED25519等），-b指定密钥长度（RSA推荐2048/4096）
ssh-keygen -t rsa -b 2048
# 解释：执行后按回车默认将私钥保存至~/.ssh/id_rsa、公钥保存至~/.ssh/id_rsa.pub；
# 可自定义路径（如ssh-keygen -t rsa -b 2048 -f ~/.ssh/my_ssh_key），也可设置密钥密码（提高私钥安全性）

# 将客户端公钥发送至目标服务器，实现免密登录前置
ssh-copy-id 用户名@服务器IP
# 解释：例如ssh-copy-id root@192.168.66.100；
# 该命令会自动将客户端~/.ssh/id_rsa.pub的内容追加到服务器目标用户家目录的~/.ssh/authorized_keys文件；
# 若公钥文件非默认名称，需用-i指定：ssh-copy-id -i ~/.ssh/my_ssh_key.pub root@192.168.66.100

# 远程登录SSH服务器
ssh 用户名@服务器IP
# 解释：缺省用户名时默认使用客户端当前登录用户（如当前是user1，执行ssh 192.168.66.100等价于ssh user1@192.168.66.100）；
# 若服务器修改了SSH监听端口（如2509），需用-p指定端口：ssh -p 2509 root@192.168.66.100
```

### （四）SSH服务保护措施
1. 借助防火墙限制访问；
2. 修改配置文件：限制登录方式（如禁止密码登录）、限制特定用户名（如禁止root登录）、修改监听IP/端口（如改为2509）；修改端口后登录需用`ssh -p 端口号 用户名@服务器IP`。
```bash
# 编辑SSH主配置文件（CentOS/RHEL）
vim /etc/ssh/sshd_config
# 解释：核心配置项修改建议：
# 1. 禁止root用户登录：PermitRootLogin no
/etc/ssh/sshd_config.d/01-permitrootlogin.conf
# 2. 禁止密码登录（仅保留密钥登录）：PasswordAuthentication no
# 3. 修改监听端口：Port 2509（需大于1024，避免与系统端口冲突）
# 4. 限制监听IP：ListenAddress 192.168.66.100（仅监听服务器内网IP，而非所有IP）

# 重启SSH服务使配置生效
systemctl restart sshd
# 解释：重启后需验证登录（如ssh -p 2509 用户名@服务器IP），避免配置错误导致无法登录

# 防火墙限制SSH访问（以firewalld为例）
# 1. 允许指定IP访问SSH（修改后的端口2509）
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.66.0/24" port protocol="tcp" port="2509" accept'
# 2. 重载防火墙规则
firewall-cmd --reload
# 解释：仅允许192.168.66.0/24网段访问SSH，其他IP拒绝，提升安全性
```

### （五）多台机器SSH互访配置
1. 常规方法：4台机器两两互发公钥，需16次操作；
2. 优化方法：在一台机器集齐所有4台机器的`authorized_keys`（公钥）和`known_hosts`（私钥相关）文件，通过`scp`分发至其他机器；也可借助工具/脚本批量生成、分发密钥，减少重复操作。
3. 或者使用xshell工具控制多台机器
```bash
# 步骤1：在主控机集齐所有机器的公钥（假设4台机器IP：100/101/102/103）
# 先在主控机生成自身密钥，再依次获取其他机器公钥
ssh-copy-id root@192.168.66.101
ssh-copy-id root@192.168.66.102
ssh-copy-id root@192.168.66.103

# 步骤2：收集所有机器的known_hosts（可选，避免首次登录确认）
# 先在主控机登录所有机器一次，生成known_hosts，再分发
ssh root@192.168.66.101
ssh root@192.168.66.102
ssh root@192.168.66.103

# 步骤3：分发authorized_keys和known_hosts到其他机器
scp ~/.ssh/authorized_keys root@192.168.66.101:~/.ssh/
scp ~/.ssh/authorized_keys root@192.168.66.102:~/.ssh/
scp ~/.ssh/authorized_keys root@192.168.66.103:~/.ssh/
scp ~/.ssh/known_hosts root@192.168.66.101:~/.ssh/
scp ~/.ssh/known_hosts root@192.168.66.102:~/.ssh/
scp ~/.ssh/known_hosts root@192.168.66.103:~/.ssh/
# 解释：分发后所有机器的authorized_keys包含所有节点公钥，实现两两免密互访，仅需6次操作（而非16次）
```

## 二、DHCP服务：局域网自动分配网络配置
### （一）核心概念（大白话版）
1. 核心作用：作为局域网的“网络配置管理员”，自动为客户端（电脑、手机、平板等）分配IP地址、网关、子网掩码、DNS服务器地址等配置，无需手动输入，避免出错。
2. 关键角色：
   - DHCP服务器：手握“IP地址池”，负责分配网络资源（路由器、专用服务器均可充当）；
   - DHCP客户端：向服务器请求网络配置的设备。
3. 底层协议：应用层协议，基于UDP传输，服务器专用端口为UDP 67（普通命令无法查看，需查UDP端口专用命令）。

### （二）IP分配四步流程（Discover→Offer→Request→Ack）
1. **Discover阶段**：无IP的客户端在局域网内广播：“有没有DHCP服务器？求分配IP！”；
2. **Offer阶段**：DHCP服务器从IP池选未占用的IP，广播回应：“给你预留了XX IP，含网关/DNS，是否接受？”（多服务器时客户端会收到多个Offer）；
3. **Request阶段**：客户端按“先到先得”选第一个Offer，测试IP可用性后广播：“我选XX服务器的XX IP，其他服务器无需预留！”；
4. **Ack阶段**：被选中的服务器广播确认：“XX IP正式分配给你，租期XX天！”，客户端绑定IP后可正常上网。

### （三）IP租约与续约机制
服务器分配的IP为“租约制”，到期需续约，否则会被收回：
1. 50%租期时：客户端单播向原服务器请求续约，成功则租期重新计时；
2. 87.5%租期时：若首次续约失败，客户端广播请求续约；
3. 租约到期：两次续约均失败则客户端释放IP，重新走四步分配流程；若无可用DHCP服务器，客户端会获取169.254.x.x临时IP（仅同网段通信，无法正常上网）。

### （四）Linux环境搭建DHCP服务器（全实操步骤）
#### 1. 搭建前准备（关键信息）
| 项目   | 具体内容                   | 说明                                                                      |
| ---- | ---------------------- | ----------------------------------------------------------------------- |
| 软件包  | `dhcp-server`          | 核心软件，CentOS/RHEL用`dnf/yum install`，Ubuntu用`apt install isc-dhcp-server` |
| 服务名  | `dhcpd`                | 启动/重启命令：`systemctl start/restart dhcpd`                                 |
| 端口   | UDP 67                 | 服务器监听端口，装软件自动启用                                                         |
| 配置文件 | `/etc/dhcp/dhcpd.conf` | 核心规则文件，默认空，需从模板`/usr/share/doc/dhcp-server/dhcpd.conf.example`复制修改      |
| 日志文件 | `/var/log/messages`    | 排查服务启动/运行错误                                                             |

#### 2. 实操步骤
```bash
# 步骤1：配置服务器静态IP（以CentOS/RHEL的ens33网卡为例）
# 编辑网卡配置文件
vim /etc/sysconfig/network-scripts/ifcfg-ens33
# 核心配置项修改：
# BOOTPROTO=static  # 改为静态IP，默认dhcp
# IPADDR=192.168.66.100  # 服务器静态IP
# NETMASK=255.255.255.0  # 子网掩码
# GATEWAY=192.168.66.1  # 网关（根据实际环境调整）
# DNS1=114.114.114.114  # 临时DNS，后续可指向自建DNS
# ONBOOT=yes  # 开机启动网卡

# 重启网卡生效
nmcli connection reload ens33
nmcli connection up ens33
# 验证静态IP配置
ip addr show ens33

# 步骤2：关闭冲突DHCP服务（以VMware为例）
# 关闭VMware虚拟网络DHCP（可选，根据实际环境）
# 图形化：编辑→虚拟网络编辑器→选择对应网卡→取消“使用本地DHCP服务”
# 命令行（Linux主机）：
systemctl stop vmware-netdhcp.service
systemctl disable vmware-netdhcp.service

# 关闭系统自带可能冲突的服务（如NetworkManager的dhcp）
systemctl stop NetworkManager-dispatcher.service
systemctl disable NetworkManager-dispatcher.service

# 步骤3：安装dhcp-server软件（CentOS/RHEL 8+）
dnf install -y dhcp-server
# Ubuntu/Debian
# apt install -y isc-dhcp-server

# 验证安装结果
rpm -qa | grep dhcp-server  # CentOS/RHEL
# dpkg -l | grep isc-dhcp-server  # Ubuntu

# 步骤4：复制配置模板并修改核心配置
# 复制模板文件（CentOS/RHEL）
cp /usr/share/doc/dhcp-server/dhcpd.conf.example /etc/dhcp/dhcpd.conf

# 编辑DHCP核心配置文件
vim /etc/dhcp/dhcpd.conf
# 核心配置示例（192.168.66.0/24网段）：
# subnet 192.168.66.0 netmask 255.255.255.0 {
#   range 192.168.66.110 192.168.66.200;  # IP地址池范围
#   option subnet-mask 255.255.255.0;     # 子网掩码
#   option routers 192.168.66.1;          # 网关
#   option domain-name-servers 114.114.114.114;  # DNS服务器
#   default-lease-time 3600;              # 默认租约时间（秒）
#   max-lease-time 86400;                 # 最大租约时间（秒）
# }

# 步骤5：启动并设置开机自启dhcpd服务
systemctl start dhcpd
systemctl enable dhcpd

# 检查服务状态
systemctl status dhcpd
# 解释：状态显示active (running)表示启动成功；若失败，查看日志：cat /var/log/messages | grep dhcpd

# 步骤6：客户端测试（Linux客户端）
# 释放原有IP
dhclient -r ens33
# 重新获取IP
dhclient ens33
# 验证IP是否在地址池范围内
ip addr show ens33

# Windows客户端测试（CMD命令）
# ipconfig /release  # 释放IP
# ipconfig /renew    # 重新获取IP
# ipconfig /all      # 查看获取的IP、DNS、网关等信息
```

#### 3. 常见问题与解决
| 问题                                 | 原因                        | 解决方法                              |
| ---------------------------------- | ------------------------- | --------------------------------- |
| 客户端拿不到IP，显示169.254.x.x             | 无DHCP服务器/服务未启动/网段不一致      | 检查服务状态、网段一致性，关闭冲突DHCP服务           |
| 服务启动失败，日志提示“no subnet declaration” | 配置文件`subnet`网段与服务器静态IP不一致 | 修正`subnet`网段，重启服务                 |
| 客户端IP非服务器分配                        | 局域网有其他DHCP服务器             | 关闭其他DHCP服务，或让IP池不重叠               |
| 找不到配置模板文件                          | `dhcp-server`无自带模板        | 直接创建`/etc/dhcp/dhcpd.conf`，写入核心配置 |

### （五）DHCP保留地址（固定IP）配置
1. 核心需求：基于客户端MAC地址绑定固定IP（如192.168.66.139）；
2. 配置步骤：在`dhcpd.conf`的`subnet`段内/外添加`host`段（指定MAC地址和固定IP），重启服务后客户端重启网卡生效；
3. 规则：`host`段优先级高于`subnet`段；保留IP可在地址池外；一个服务可配置多个保留地址，`host`名称需唯一。
```bash
# 编辑DHCP配置文件，添加host段（绑定MAC和固定IP）
vim /etc/dhcp/dhcpd.conf
# 示例配置（在subnet段内/外添加）：
host client-pc {
   hardware ethernet 00:0C:29:3A:B5:78;  # 客户端MAC地址（需替换为实际值）
   fixed-address 192.168.66.139;         # 绑定的固定IP
 }

# 重启DHCP服务使配置生效
systemctl restart dhcpd

# 客户端验证（重启网卡后查看IP是否为绑定的192.168.66.139）
dhclient -r ens33 && dhclient ens33
ip addr show ens33
```

## 三、DNS服务：实现域名与IP的“翻译”
### （一）核心原理与解析流程
1. 核心功能：实现域名↔IP地址的转换（域名解析），让用户通过易记的域名（如`www.baidu.com`）访问服务器，而非难记的IP。
2. 解析优先级（从高到低）：
   - 第一步：查询`hosts`文件（Linux：`/etc/hosts`，Windows：`C:\Windows\System32\drivers\etc\hosts`），配置格式`IP 域名`，保存立即生效；
   - 第二步：查询首选DNS服务器（Linux查看配置：`cat /etc/resolv.conf`）；
   - 第三步：迭代解析：首选DNS无记录时，逐层查询根域→一级域→二级域服务器，直至获取IP。
3. `hosts`与DNS服务器的区别：`hosts`优先级更高，但`nslookup`/`dig`等工具仅识别DNS服务器记录，无法识别`hosts`文件。

### （二）基础概念
1. 域名格式与层级：三级域名.二级域名.一级域名.根域（如`www.jd.com.`，根域`.`可省略，完整格式为FQDN）；
   - 一级域名：机构规定（.com=公司、.cn=中国），全球唯一；
   - 二级域名：一级域名注册者自定义（如`jd`）；
   - 三级域名：自由定义（如`www`/`ftp`）。
2. 解析方向：
   - 正向解析：域名→IP（日常访问常用）；
   - 反向解析：IP→域名（多用于验证IP归属，如邮件反垃圾邮件）。

### （三）DNS服务搭建与基础配置
#### 1. 核心软件与参数
| 项目 | 具体内容 | 说明 |
|------|----------|------|
| 软件包 | `bind`（发音“band”） | DNS核心软件，`yum -y install bind`安装 |
| 服务名 | `named` | 启动/重启命令：`systemctl start/restart named` |
| 端口 | 53（TCP/UDP） | 需开放，服务通信端口 |
| 主配置文件 | `/etc/named.conf` | 配置监听IP、客户端访问权限、日志级别 |
| 区域配置文件 | `/etc/named.rfc1912.zones` | 定义正向/反向解析区域及数据文件路径 |
| 数据文件 | `named.localhost`（正向）、`named.loopback`（反向） | 存储域名-IP映射，默认路径`/var/named/` |

#### 2. 基础配置步骤
```bash
# 步骤1：安装bind软件包（CentOS/RHEL）
dnf install -y bind bind-utils
# Ubuntu/Debian
# apt install -y bind9 bind9-utils

# 验证安装
rpm -qa | grep bind  # CentOS/RHEL
# dpkg -l | grep bind9  # Ubuntu

# 步骤2：修改主配置文件/etc/named.conf
vim /etc/named.conf
 核心修改项：
 listen-on port 53 { any; };  # 监听所有IP（默认仅127.0.0.1）
 allow-query     { any; };    # 允许所有客户端查询（默认仅localhost）
# dnssec-validation no;        # 关闭DNSSEC验证（测试环境简化）

# 验证主配置文件语法
named-checkconf /etc/named.conf
# 解释：无输出表示语法无错误；有输出则根据提示修正

# 步骤3：启动named服务并设置开机自启
systemctl start named
systemctl enable named

# 检查服务状态
systemctl status named
# 验证端口监听（53端口需正常监听）
ss -tulnp | grep 53
```

### （四）核心解析记录类型与配置
#### 1. 核心记录类型
| 记录类型 | 作用 | 示例 |
|----------|------|------|
| A记录 | 正向解析，域名→IPv4 | `www IN A 192.168.66.191` |
| AAAA记录 | 正向解析，域名→IPv6 | - |
| PTR记录 | 反向解析，IP→域名 | `191 IN PTR www.xxx.com.` |
| NS记录 | 指定域名的解析服务器 | `IN NS dns.xxx.com.` |
| SOA记录 | 定义域名解析权威信息 | 包含主DNS、刷新时间、重试时间等 |
| CNAME记录 | 别名记录，域名→另一个域名 | `baidu IN CNAME www.baidu.com.` |
| MX记录 | 指定邮件接收服务器 | - |

#### 2. 正向解析配置（以`xxx.com`为例）
```bash
# 步骤1：编辑区域配置文件，添加正向解析区域
vim /etc/named.rfc1912.zones
# 添加以下内容：
# zone "xxx.com" IN {
#   type master;          # 主DNS服务器
#   file "xxx.com.zone";  # 正向解析数据文件路径（相对/var/named/）
#   allow-update { none; }; # 禁止动态更新
# };

# 步骤2：创建正向解析数据文件
cp /var/named/named.localhost /var/named/xxx.com.zone

# 编辑数据文件
vim /var/named/xxx.com.zone
# 核心配置示例：
# $TTL 1D
# @       IN SOA  dns.xxx.com. admin.xxx.com. (
#                                       0       ; serial
#                                       1D      ; refresh
#                                       1H      ; retry
#                                       1W      ; expire
#                                       3H )    ; minimum
#         IN NS   dns.xxx.com.
# dns     IN A    192.168.66.100  # DNS服务器自身A记录
# www     IN A    192.168.66.191  # www.xxx.com对应IP
# baidu   IN CNAME www.baidu.com. # 别名记录（需加.结尾）

步骤3：调整数据文件权限（必须，否则named服务无法读取）
chown named:named /var/named/xxx.com.zone
chmod 640 /var/named/xxx.com.zone

# 验证数据文件语法
named-checkzone xxx.com /var/named/xxx.com.zone
# 解释：输出“zone xxx.com/IN: loaded serial 0”表示语法正确

# 步骤4：重启named服务
systemctl restart named

# 步骤5：测试正向解析
nslookup www.xxx.com 192.168.66.100  # 指定自建DNS服务器查询
dig www.xxx.com @192.168.66.100
# 解释：返回结果中ANSWER SECTION需显示对应IP（192.168.66.191）
```

#### 3. 反向解析配置（以`192.168.66.0/24`为例）
```bash
# 步骤1：编辑区域配置文件，添加反向解析区域
vim /etc/named.rfc1912.zones
# 添加以下内容：
# zone "66.168.192.in-addr.arpa" IN {
#   type master;
#   file "66.168.192.zone";  # 反向解析数据文件
#   allow-update { none; };
# };
# 解释：反向区域名格式为“子网段倒序.in-addr.arpa”，192.168.66.0/24对应66.168.192.in-addr.arpa

# 步骤2：创建反向解析数据文件
cp /var/named/named.loopback /var/named/66.168.192.zone

# 编辑数据文件
vim /var/named/66.168.192.zone
# 核心配置示例：
# $TTL 1D
# @       IN SOA  dns.xxx.com. admin.xxx.com. (
#                                       0       ; serial
#                                       1D      ; refresh
#                                       1H      ; retry
#                                       1W      ; expire
#                                       3H )    ; minimum
#         IN NS   dns.xxx.com.
# 191     IN PTR  www.xxx.com.  # 192.168.66.191反向解析为www.xxx.com
# 解释：PTR记录的“191”是IP的最后一段，需对应完整域名（加.结尾）

# 步骤3：调整权限
chown named:named /var/named/66.168.192.zone
chmod 640 /var/named/66.168.192.zone

# 验证数据文件语法
named-checkzone 66.168.192.in-addr.arpa /var/named/66.168.192.zone

# 步骤4：重启服务并测试
systemctl restart named
nslookup 192.168.66.191 192.168.66.100  # 指定自建DNS查询反向解析
# 解释：返回结果中name字段需显示www.xxx.com.
```

### （五）DNS常见问题与排查
```bash
# 1. 服务启动失败排查
# 检查主配置文件语法
named-checkconf /etc/named.conf

# 检查正向解析数据文件语法
named-checkzone xxx.com /var/named/xxx.com.zone

# 检查反向解析数据文件语法
named-checkzone 66.168.192.in-addr.arpa /var/named/66.168.192.zone

# 查看named服务日志（定位具体错误）
journalctl -u named -f
# 或
cat /var/log/messages | grep named

# 2. 解析记录不生效排查
# 检查客户端DNS配置（Linux）
cat /etc/resolv.conf
# 解释：需确保nameserver指向自建DNS服务器（192.168.66.100）

# 清除Linux客户端DNS缓存
systemctl restart NetworkManager
# 或（CentOS 7+）
resolvectl flush-caches

# Windows客户端清除缓存（CMD）
# ipconfig /flushdns

# 3. 多域名解析配置（新增yyy.com域名）
# 步骤1：添加新区域
vim /etc/named.rfc1912.zones
# zone "yyy.com" IN {
#   type master;
#   file "yyy.com.zone";
#   allow-update { none; };
# };

# 步骤2：创建新数据文件
cp /var/named/xxx.com.zone /var/named/yyy.com.zone
vim /var/named/yyy.com.zone  # 修改为yyy.com的解析记录

# 步骤3：调整权限并验证
chown named:named /var/named/yyy.com.zone
chmod 640 /var/named/yyy.com.zone
named-checkzone yyy.com /var/named/yyy.com.zone
systemctl restart named

# 新增子域名（如blog.xxx.com）
vim /var/named/xxx.com.zone
# 添加：blog IN A 192.168.66.192
systemctl restart named
nslookup blog.xxx.com 192.168.66.100  # 测试子域名解析
```

