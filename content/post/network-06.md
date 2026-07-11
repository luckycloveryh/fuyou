---
title: "FTP、rsync 与 NFS 服务复习"
date: 2025-12-18T09:00:00+08:00
image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["4. 网络基础阶段"]
slug: "network-06"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
# 视频核心内容整合总结
## 一、过往知识回顾
### （一）FTP协议（文件传输协议）
#### 1. 端口与防火墙配置
FTP核心端口分为两类：
- 控制连接端口：21（所有模式必用）；
- 数据连接端口：20（主动模式专用），被动模式使用随机端口。
配置要点：
- 需开放21端口及被动模式指定范围的随机端口（原“TSV/被动import”为笔误，正确为`pasv_min_port`/`pasv_max_port`参数设置端口范围）；
- 可临时关闭防火墙简化测试（生产环境需精准配置规则）；
- 主动/被动模式均需注意防火墙规则的方向（入站/出站）。

#### 2. 工作模式
| 模式   | 数据连接建立逻辑                                |
| ---- | --------------------------------------- |
| 被动模式 | 客户端登录验证后，服务器开放随机端口并告知客户端，客户端主动发起数据连接    |
| 主动模式 | 客户端登录后告知服务器自身接收数据的端口，服务器从20端口向该端口发起数据连接 |

#### 3. FTPS协议（安全FTP）
基于FTP + SSL协议实现加密传输，核心是制作证书，步骤如下：
```bash
# CentOS下安装OpenSSL并生成自签名证书示例
yum install -y openssl
# 生成私钥
openssl genrsa -out ftps.key 2048
# 生成证书申请文件
openssl req -new -key ftps.key -out ftps.csr
# 制作自签名证书（颁发者=申请者）
openssl x509 -req -days 365 -in ftps.csr -signkey ftps.key -out ftps.crt
```

### （二）rsync备份
#### 1. 核心功能与关键选项
rsync优势：支持内容筛选、多进程备份、增量同步；
常用选项说明：
```bash
# 基础同步命令（-a：归档模式，-v：详细输出，-z：压缩传输）
rsync -avz 源目录/ 目标目录/
# 强同步（确保目标与源完全一致，删除目标多余文件）
rsync -avz --delete 源目录/ 目标目录/
# 筛选内容（按需包含指定文件/目录）
rsync -avz --include="*.txt" --exclude="*" 源目录/ 目标目录/
```

#### 2. 备份策略
采用“每日增量备份 + 每周完全备份 + 定期还原测试”：
- 增量备份：仅同步新增/修改数据，节省空间；
- 完全备份：每周全量备份，避免增量链断裂；
- 还原测试：核心目的是验证备份数据的可用性，确保故障时可恢复。

## 二、NFS服务（网络文件系统）
### （一）核心概念与存储对比
#### 1. NFS定义
Linux系统间的轻量级分布式文件共享服务，客户端可实时操作服务器共享文件，数据双向同步更新，核心价值是实现多客户端分布式访问、减轻单服务器压力（仅支持分布式访问，暂不支持分布式存储）。

#### 2. NAS vs SAN（网络存储类型）
| 类型          | 存储粒度 | 配置要求        | 实现技术         | 适用场景           |
| ----------- | ---- | ----------- | ------------ | -------------- |
| NAS（网络附加存储） | 文件级  | 预装文件系统，即插即用 | 含NFS/CIFS等方式 | 中小型企业/家庭文件共享备份 |
| SAN（存储区域网络） | 块级   | 需手动分区、格式化   | iSCSI/FCoE等  | 大型企业/云计算/虚拟化场景 |

#### 3. NFS vs VSFTP
| 特性    | VSFTP               | NFS           |
| ----- | ------------------- | ------------- |
| 核心能力  | 大文件上传/下载（单向传输）      | 实时文件共享（双向同步）  |
| 跨平台支持 | Linux/Windows客户端均支持 | 仅Linux系统间使用   |
| 架构类型  | 中心化（绑定指定服务节点）       | 分布式（多节点访问减负）  |
| 操作逻辑  | 下载→修改→重新上传          | 直接操作远程文件，实时同步 |
|       |                     |               |

### （二）工作原理与关键依赖
#### 1. 核心实现方式
通过`mount`命令将服务器共享目录挂载到客户端本地目录，挂载后操作远程文件如同本地文件：
```bash
# 挂载光盘补充示例
mount -t iso9660 /dev/cdrom /mnt/cdrom
```
挂载要点：挂载点优先选择空目录（非空目录会被临时占用，原文件暂不可见）。

#### 2. RPC服务（端口111）的核心作用
NFS端口不直接暴露，依赖RPC（远程过程调用）服务实现端口映射：
- RPC记录“NFS服务名-端口”映射关系（类似DNS的“域名-IP”）；
- 客户端请求先被RPC监听，RPC远程告知客户端NFS实际端口，助力建立连接。

#### 3. NFS工作流程
1. 服务器端安装并启动RPC服务（监听111端口）；
2. 配置NFS配置文件后启动NFS服务，NFS将“服务名-端口”注册到RPC；
3. 客户端发起挂载请求，RPC监听到后传递NFS端口信息给客户端RPC；
4. 客户端通过该端口与NFS服务建立连接，完成挂载。

### （三）NFS服务搭建与配置（服务器端）
#### 1. 软件安装
```bash
# CentOS下安装RPC和NFS依赖（服务器/客户端均需安装）
yum install -y rpcbind nfs-utils
```

#### 2. 共享目录与配置文件
- 共享目录：需先创建（如`/data/nfs/share`），可创建测试文件验证；
- 配置文件路径：`/etc/exports`；
- 配置格式：`共享目录 客户端范围(权限参数)`（权限参数需紧接客户端，无空格）。

示例配置：
```bash
# 创建共享目录
mkdir -p /AB/EF
# 编辑配置文件（允许192.168.66.0/24网段读写、同步、root映射）
echo "/AB/EF 192.168.66.0/24(rw,sync,root_squash)" >> /etc/exports
```

#### 3. 核心权限参数
| 参数              | 说明                                         |
| --------------- | ------------------------------------------ |
| ro/rw           | 只读/读写权限                                    |
| sync/async      | 同步（写入磁盘后客户端可见，有阻塞）/异步（写入内存即见，效率高）          |
| root_squash     | 客户端root映射为服务器匿名用户（nobody，UID 65534，无法登录系统） |
| no_root_squash  | 客户端root保留服务器root权限                         |
| all_squash      | 所有客户端用户映射为服务器nobody                        |
| ANONUID/ANONGID | 自定义匿名用户UID/GID（如ANONUID=1000映射为服务器张三用户）    |

#### 4. 服务启动与验证
```bash
# 先启动RPC服务（必选前置步骤）
systemctl start rpcbind && systemctl enable rpcbind
# 查看RPC监听状态
rpcinfo
# 启动NFS服务
systemctl start nfs-server && systemctl enable nfs-server
# 验证NFS端口注册
rpcinfo | grep nfs
# 配置生效方式（无需重启服务）
exportfs -au # 取消所有共享
exportfs -ar # 重新加载所有共享
```

### （四）客户端挂载与故障排查
#### 1. 挂载操作
```bash
# 查看服务器共享目录
showmount -e 192.168.66.191
# 创建本地挂载点
mkdir -p /mnt/nfs
# 临时挂载（指定nfs文件系统）
mount -t nfs 192.168.66.191:/AB/EF /mnt/nfs
# 永久挂载（编辑/etc/fstab，重启生效）
echo "192.168.66.191:/AB/EF /mnt/nfs nfs defaults 0 0" >> /etc/fstab
mount -a # 立即生效fstab配置
```

#### 2. 挂载验证
```bash
# 查看挂载状态
mount | grep nfs
df -h | grep nfs
# 验证文件同步（客户端查看服务器共享文件）
ls /mnt/nfs
```

#### 3. 常见故障排查
| 故障现象     | 解决方案                                             |
| -------- | ------------------------------------------------ |
| 设备忙      | 退出挂载点目录后执行`umount /mnt/nfs`（可加`-f`强制卸载）          |
| 权限被拒     | 检查/etc/exports中客户端IP/网段、权限参数（无空格分隔），重启NFS+重新加载配置 |
| 文件系统类型错误 | 客户端安装`nfs-utils`和`rpcbind`软件包                    |

0### （五）权限测试与挂载规范
#### 1. 权限测试
```bash
# 普通用户挂载无写权限时，开放共享目录其他用户写入权限
chmod o+w /AB/EF
# 验证匿名映射：客户端李四（UID 1001）创建文件，服务器显示为张三（UID 1000）所有
# （需配置ANONUID=1000 ANONGID=1000）
```

#### 2. 挂载规范
- 禁止在挂载点目录内执行挂载/卸载操作，避免权限错误；
- 临时挂载重启后失效，永久挂载需确保NFS服务稳定（防止开机启动报错）。

### （六）NFS与Web服务器的结合应用（负载分担场景）
#### 1. 架构设计
- 问题：单Apache服务器（192.168.66.192）访问压力大，且NFS与Web同机部署耦合性高；
- 解决方案：独立部署NFS服务器（192.168.66.191），多Web服务器挂载共享网页目录，实现数据同步+负载分担。

#### 2. 部署步骤
```bash
# 1. NFS服务器配置（共享网页目录，只读权限避免误改）
mkdir -p /var/www/shared_html
echo "/var/www/shared_html 192.168.66.0/24(ro,sync)" >> /etc/exports
exportfs -ar

# 2. Web服务器（192.168.66.192/196）配置
yum install -y httpd # 安装Apache
systemctl start httpd && systemctl enable httpd
# 挂载NFS共享目录到网页根目录
mount -t nfs 192.168.66.191:/var/www/shared_html /var/www/html

# 3. 验证数据同步（NFS服务器新增文件，Web服务器可见）
touch /var/www/shared_html/test.html
ls /var/www/html/test.html
```

#### 3. 配套优化与问题解决
- DNS分流：将同一域名（如www.test.com）解析到多台Web服务器IP，实现访问负载分担；
- 403权限错误解决（SELinux限制）：
  ```bash
  getenforce # 查看SELinux状态
  setenforce 0 # 临时关闭
  sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config # 永久关闭（需重启）
  ```

## 三、Web服务器基础与HTTP协议
### （一）主流Web服务器特性
| 服务器    | 核心特点                     |
| ------ | ------------------------ |
| Apache | 开源稳定，多进程/线程模型，兼容性强       |
| Nginx  | 高性能、高并发，反向代理/负载均衡能力突出    |
| Caddy  | 自动配置HTTPS，易用性强，广泛用于CDN场景 |

#### 1. 架构区分
- BS架构（浏览器-服务器）：Web服务核心，客户端仅需浏览器即可访问，无需安装专用软件；
- CS架构（客户端-服务器）：需安装专用程序（如QQ/微信），对比凸显Web服务便捷性。

#### 2. 跨平台部署（CentOS示例）
```bash
# Apache安装与启动
yum install -y httpd
systemctl start httpd && systemctl enable httpd

# Nginx安装（补充）
yum install -y nginx
systemctl start nginx && systemctl enable nginx
```

### （二）HTTP协议核心知识
#### 1. 协议基础
- HTTP：超文本传输协议，基于TCP实现客户端-服务器的请求-响应交互；
- HTTPS：HTTP + SSL/TLS加密层，保障数据传输安全。

#### 2. 请求与响应对象
- Request（客户端请求）：包含请求方法（GET/POST/PUT等）、请求头（Accept/Host/User-Agent等）；
- Response（服务器响应）：包含响应头（Content-Type/Server/Last-Modified等）、状态码、响应体。

#### 3. 常见HTTP状态码
| 类别  | 状态码         | 典型场景                                           |
| --- | ----------- | ---------------------------------------------- |
| 2xx | 200 OK      | 请求成功，客户端正常获取资源                                 |
| 3xx | 301/304     | 301：永久重定向（如baidu.com→www.baidu.com）；304：使用本地缓存 |
| 4xx | 403/404/401 | 403：无访问权限；404：资源不存在；401：需身份验证                  |
| 5xx | 500/502     | 500：服务器内部配置错误；502：网关错误（后端服务故障）                 |

#### 4. HTTP连接方式
| 连接方式            | 特点                                |
| --------------- | --------------------------------- |
| 短连接             | 每次传输都建立→断开TCP/HTTP连接，资源消耗在连接/断开过程 |
| 长连接（Keep-Alive） | 一次连接可多次传输，超时（如30秒）无请求才断开，降低资源消耗   |

### （三）浏览器开发者工具应用（Chrome）
```
1. 打开方式：F12 或 Ctrl+Shift+I；
2. 核心面板：Network（查看请求URL、方法、状态码、响应时间等）；
3. 缓存控制：勾选“Disable cache”禁用缓存，强制获取最新资源；
4. 无痕模式：Ctrl+Shift+N，无浏览记录/缓存，适合验证页面实时效果。
```

## 四、Apache服务器深度解析
### （一）核心工作模式（MPM多进程模块）
| 工作模式    | 核心特点                  | 优点                    | 缺点            | 适用场景        |
| ------- | --------------------- | --------------------- | ------------- | ----------- |
| Prefork | 预设子进程，单进程单线程，一线程处理一请求 | 稳定性强、兼容老版本、无线程安全问题    | 单进程资源消耗高、高并发弱 | 稳定性优先、低并发场景 |
| Worker  | 多进程多线程架构              | 单请求资源消耗低、高并发处理能力强     | 需处理线程安全问题     | 高并发、资源受限场景  |
| Event   | 基于Worker优化，专线程处理长连接等待 | 继承Worker高并发优势、优化长连接效率 | 仍需关注线程安全      | 高并发+大量长连接场景 |

> 注：Event模式通过“专门等待线程”优化长连接的空闲等待问题，进一步提升并发处理效率。

### （二）配置文件与关键配置项
#### 1. 配置文件结构
- 主配置文件：`/etc/httpd/conf/httpd.conf`；
- 子配置文件：通过`Include`指令加载`conf.modules.d/`、`conf.d/`目录下的`.conf`文件；
- 日志文件：
  - 错误日志：`/var/log/httpd/error_log`（记录启动/运行报错）；
  - 访问日志：`/var/log/httpd/access_log`（记录客户端IP、访问时间、状态码、传输字节数等）。

#### 2. 关键配置项说明
| 配置项            | 作用与示例                                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| Listen         | 监听IP/端口，默认`Listen 80`；多端口需分行配置（如`Listen 90`），修改后重启生效                              |
| LoadModule     | 加载动态模块，`httpd -M`查看已加载模块                                                          |
| ServerName     | 设置服务器域名（如`ServerName www.example.com`），未设置会告警；需配置DNS/hosts映射                      |
| User/Group     | 服务进程所属用户/组（默认apache），自定义需确保权限正确                                                   |
| Directory      | 目录权限控制，路径越长优先级越高；如`<Directory />`设`Require all denied`，网页根目录复写为允许                 |
| DocumentRoot   | 网页根目录（默认`/var/www/html`），客户端访问时从该目录获取资源                                           |
| DirectoryIndex | 默认网页文件（如`DirectoryIndex 123.htm index.htm`）；`Options -Indexes`禁用目录列表（无默认文件时返回403） |

### （三）客户端访问逻辑
1. **IP访问**：客户端IP+端口 → 服务器匹配监听配置 → 读取DocumentRoot资源 → 返回客户端；
2. **域名访问**：
   - 第一步：优先解析本地`hosts`文件（Windows路径：`C:\Windows\System32\drivers\etc\hosts`），无匹配则走DNS解析；
   - 第二步：服务器匹配域名配置 → 匹配成功返回对应资源；匹配失败则尝试IP匹配 → 均失败则返回错误。

### （四）常用操作命令
```bash
# 查看Apache版本+工作模式
httpd -V
# 查看已加载模块
httpd -M
# 查看编译模块
httpd -l
# 查看虚拟主机配置
httpd -S
# 查看监听端口
ss -antp | grep httpd
# 查看进程信息
ps aux | grep httpd
# 服务控制（CentOS 7+）
systemctl start httpd    # 启动
systemctl restart httpd  # 重启
systemctl enable httpd   # 开机自启
systemctl status httpd   # 查看状态
systemctl stop httpd     # 停止
```