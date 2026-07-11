---
title: "DHCP 服务配置与地址池验证"
date: 2025-12-16T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-04/1200/675"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["4. 网络基础阶段"]
slug: "network-04"
description: "介绍《DHCP 服务配置与地址池验证》，涵盖DHCP 相关操作（Bash 命令+解释）、验证IP是否在地址池且网络连通（示例IP：192.168.66.100）和安。"
---
### 一、DHCP 相关操作（Bash 命令+解释）
#### 1. 验证 DHCP 配置
```bash
# 验证IP是否在地址池且网络连通（示例IP：192.168.66.100）
ip addr show  # 查看本机IP，确认是否在DHCP服务器地址池范围内
ping 192.168.66.1  # 测试网关连通性，验证网络可达性
ssh root@192.168.66.100  # 测试远程登录，验证IP可用性

# 验证网关配置
route -n  # 列出内核路由表，查询默认网关（G列）是否与DHCP分配的一致

# 验证DNS配置
cat /etc/resolv.conf  # 查看DNS配置文件，核对nameserver（原表述next Server）是否正确
```
- `ip addr show`：显示所有网卡的IP配置，确认DHCP分配的IP是否符合地址池范围；
- `ping`：测试网络连通性，验证IP能否正常通信；
- `ssh`：验证IP是否可远程登录，进一步确认IP有效性；
- `route -n`：`-n` 表示以数字形式显示IP（不解析域名），快速查看网关配置；
- `cat /etc/resolv.conf`：读取DNS配置文件，核对DHCP分配的DNS服务器地址。

#### 2. DHCP 服务基础操作
```bash
# 安装DHCP软件包（CentOS/RHEL）
yum install -y dhcp  # 安装dhcp软件包（服务名dhcpd）

# 查看DHCP端口监听状态
netstat -an | grep 67  # 过滤UDP 67端口，确认dhcpd服务是否正常监听
ss -tuln | grep 67     # 替代netstat，更高效查看端口监听（t:TCP, u:UDP, l:监听, n:数字IP）

# 启动/重启/查看DHCP服务状态
systemctl start dhcpd    # 启动dhcpd服务
systemctl restart dhcpd  # 重启服务（配置修改后生效）
systemctl status dhcpd   # 查看服务运行状态，排查启动失败问题
```
- `yum install -y dhcp`：通过yum包管理器安装DHCP服务；
- `netstat -an`/`ss -tuln`：查看端口监听，DHCP服务器默认监听UDP 67端口；
- `systemctl` 系列命令：管理系统服务，`start`启动、`restart`重启、`status`查看状态。

#### 3. DHCP 保留地址配置（编辑配置文件）
```bash
# 编辑DHCP主配置文件（示例）
vim /etc/dhcp/dhcpd.conf
# 配置示例（在配置文件中添加）：
# subnet 192.168.66.0 netmask 255.255.255.0 {  # 地址池（必须配置）
#   range 192.168.66.100 192.168.66.200;       # 动态分配范围
#   option gateway 192.168.66.1;               # 网关
#   option dns-servers 8.8.8.8,114.114.114.114; # DNS
# }
# host client1 {  # 保留地址配置段（名称区分不同客户机）
#   hardware ethernet 00:0C:29:3A:B8:76;       # 客户机MAC地址
#   fixed-address 192.168.66.88;               # 分配的固定IP
# }

# 配置修改后重启服务
systemctl restart dhcpd
```
- `vim /etc/dhcp/dhcpd.conf`：编辑DHCP核心配置文件；
- 配置文件中`subnet`段为地址池（必须存在，否则服务无法启动），`host`段为保留地址，绑定MAC和固定IP。

### 二、DNS 相关操作（Bash 命令+解释）
#### 1. DNS 服务基础操作
```bash
# 安装DNS服务（bind）
yum install -y bind bind-utils  # bind是DNS核心包，bind-utils包含nslookup/dig等测试工具

# 查看DNS端口监听
netstat -an | grep 53  # DNS默认监听53端口（TCP/UDP）
ss -tuln | grep 53     # 高效查看53端口监听状态

# 启动/重启/查看DNS服务（named）
systemctl start named    # 启动named服务
systemctl restart named  # 配置修改后重启
systemctl status named   # 查看服务状态
```
- `yum install -y bind bind-utils`：安装DNS服务（named）及测试工具；
- `53端口`：DNS服务默认端口，TCP用于区域传输，UDP用于解析请求。

#### 2. DNS 解析测试
```bash
# 正向解析测试（域名→IP）
nslookup www.yanghong.com  # 测试域名解析，返回对应IP
dig www.yanghong.com       # 更详细的解析信息，包括权威服务器、TTL等

# 反向解析测试（IP→域名，示例IP：192.168.66.123）
nslookup 192.168.66.123
dig -x 192.168.66.123  # -x 选项专用于反向解析

# 查看客户端生效的DNS配置
cat /etc/resolv.conf  # 查看当前DNS服务器地址
nmcli connection show eth0 | grep dns  # 查看网卡eth0的DNS配置（CentOS7+）
```
- `nslookup`：简易解析测试工具，直接返回域名/IP对应关系；
- `dig`：更专业的解析工具，`-x` 用于反向解析，可查看解析过程和权威信息；
- `nmcli connection show`：查看网卡的DNS配置，确认实际生效的DNS服务器。

#### 3. DNS 主从同步配置与测试
```bash
# 主服务器配置（编辑区域文件，升级序列号）
vim /var/named/yanghong.com.zone  # 正向解析区域文件
# 修改Serial（序列号），示例：从2024100100改为2024100101
# 添加notify参数：notify yes;  # 主服务器主动通知从服务器更新
# 添加允许从服务器同步的IP：allow-transfer { 192.168.66.192; };

# 重启主服务器DNS服务
systemctl restart named

# 从服务器同步测试
rndc reload  # 重新加载named配置（无需重启）
cat /var/named/slaves/yanghong.com.zone  # 查看同步的区域文件
dig @192.168.66.192 www.yanghong.com    # 测试从服务器解析是否同步
```
- `Serial`：区域文件的版本号，主服务器修改后需递增，否则从服务器不同步；
- `notify yes`：主服务器数据变更后主动通知从服务器；
- `allow-transfer`：限制仅指定从服务器可同步数据，提升安全性；
- `rndc reload`：从服务器重新加载配置，无需重启服务即可同步数据。

#### 4. DNS 缓存服务器（dnsmasq）配置
```bash
# 安装dnsmasq
yum install -y dnsmasq

# 编辑dnsmasq配置文件
vim /etc/dnsmasq.conf
核心配置：
interface=ens160  # 监听指定网卡（避免仅监听127.0.0.1）
server=192.168.66.191  # 上游主DNS服务器IP
cache-size=15000       # 缓存容量（最大15000条记录）

# 启动/重启dnsmasq
systemctl start dnsmasq
systemctl restart dnsmasq

# 测试缓存效果
dig @192.168.66.193 www.yanghong.com  # 首次解析（权威答案）
dig @192.168.66.193 www.yanghong.com  # 再次解析（非权威答案，缓存生效）
```
- `interface`：指定监听的网卡，确保客户端可访问缓存服务器；
- `server`：指定上游DNS服务器，缓存服务器无记录时向其请求；
- `cache-size`：设置缓存最大条数，超出时淘汰最早记录；
- 两次`dig`测试：首次返回“权威答案”，第二次返回“非权威答案”，证明缓存生效。

### 三、FTP（vsftpd）相关操作（Bash 命令+解释）
#### 1. vsftpd 服务基础操作
```bash
# 安装vsftpd
yum install -y vsftpd

# 查看FTP端口监听
netstat -an | grep 21  # 21端口为FTP控制连接
ss -tuln | grep 21     # 高效查看21端口监听状态

# 启动/重启/查看vsftpd状态
systemctl start vsftpd    # 启动服务
systemctl restart vsftpd  # 配置修改后重启
systemctl status vsftpd   # 查看服务运行状态

# 查看FTP日志（排查问题）
tail -f /var/log/vsftpd.log  # 实时查看FTP日志，-f 跟踪日志更新
```
- `21端口`：FTP控制连接端口，用于传输命令/响应；20端口为数据连接（主动模式）；
- `tail -f`：实时跟踪日志，方便排查登录失败、权限拒绝等问题。

#### 2. Linux 客户端连接 FTP
```bash
# 安装FTP客户端
yum install -y ftp lftp

# 基础ftp命令连接（示例服务器IP：192.168.66.191）
ftp 192.168.66.191
# 登录后常用命令：
# get 1.txt          # 下载文件1.txt到客户端当前目录
# put 2.txt          # 上传客户端当前目录的2.txt到服务器
# mkdir test         # 创建test目录
# delete 1.txt       # 删除服务器上的1.txt
# rename 1.txt 3.txt # 重命名文件
# !ls                # 不退出FTP，查看客户端当前目录文件
# quit               # 退出FTP连接

# lftp工具连接（更灵活）
lftp lisi@192.168.66.191  # 直接指定用户名登录
# lftp常用命令：
# rm 1.txt           # 删除文件（与bash一致）
# mv 1.txt 3.txt     # 重命名（与bash一致）
# mirror /home/lisi  # 下载整个目录到客户端
```
- `ftp`：基础FTP客户端，命令偏传统；
- `lftp`：增强版FTP客户端，命令更贴近bash，支持目录批量操作；
- `!ls`：`!` 表示执行客户端本地命令，无需退出FTP连接。

#### 3. 匿名用户权限配置
```bash
# 编辑vsftpd配置文件
vim /etc/vsftpd/vsftpd.conf
开启匿名用户及写入权限：
anonymous_enable=YES               
# 开启匿名登录
anon_upload_enable=YES             
# 允许上传
anon_mkdir_write_enable=YES        
# 允许创建目录
anon_other_write_enable=YES        
# 允许删除/重命名
anon_umask=022                     
# 上传文件权限（默认077→600，改为022→644）

# 重启vsftpd服务使配置生效
systemctl restart vsftpd

# 调整文件系统权限（匿名用户为ftp用户）
setfacl -m u:ftp:rwx /var/ftp  # 给ftp用户赋予/var/ftp目录读写执行权限
ls -ld /var/ftp                # 查看目录权限（确认acl生效）
getfacl /var/ftp               # 查看详细的acl权限配置
```
- `anon_*` 系列配置：针对匿名用户的权限，需取消注释或手动添加；
- `anon_umask`：掩码值，决定上传文件的默认权限（022对应644，所有人可读）；
- `setfacl`：精细化设置权限，避免直接给`/var/ftp`设置777权限（安全风险）；
- `getfacl`：查看ACL权限，确认配置生效。

#### 4. FTP 常见问题排查
```bash
# 检查配置文件格式（等号前后无空格）
grep -E "^\s*anonymous_enable\s*=" /etc/vsftpd/vsftpd.conf  # 检查格式错误

# 测试匿名用户上传（模拟）
lftp ftp@192.168.66.191
put test.txt  # 上传文件，若提示550则检查权限

# 查看SELinux状态（可能限制FTP）
getenforce  # 若为Enforcing，临时关闭：setenforce 0
# 永久关闭SELinux（需重启）：
# sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config
```
- `grep -E`：过滤配置项，检查等号前后是否有空格（格式错误会导致500 OOPS错误）；
- `getenforce/setenforce`：SELinux可能限制FTP写入，临时关闭用于排查；
- `550错误`：最常见，优先检查配置文件权限项和文件系统ACL权限。

### 通用说明
1. 所有命令基于CentOS/RHEL 7/8系统，Debian/Ubuntu需替换`yum`为`apt`；
2. 配置文件修改后均需重启对应服务（`systemctl restart`）生效；
3. 权限配置需同时修改服务配置文件和文件系统权限（ACL/属主/掩码），缺一不可；
4. 日志文件（`/var/log/vsftpd.log`/`/var/log/messages`）是排查问题的核心依据。