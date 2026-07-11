---
title: "Linux系统NFS与Apache服务完整技术手册"
date: 2025-12-19T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-07/1200/600"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["网络基础"]
slug: "network-07"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
# Linux系统NFS与Apache服务完整技术手册
## 一、学习任务与进度安排
### 1. 待完成练习
- 需完成CPDNS、SSH相关练习题及判断角题目，要求将满分截图提交至作业系统，支持多次练习直至达标。
- 练习核心目标：巩固网络服务配置基础，为后续实验与阶段测铺垫技能。

### 2. 阶段进度规划
- **时间节点**：预计推进至1月7日，期间安排约3天课程，当前学习内容包含阿拉提相关知识与数据库，数据库知识点讲解完毕后进入假期，返校后将进行“ready 4”内容串讲复习，备战阶段测。
- **阶段测安排**：
  - 正常节奏：1月初完成网络相关阶段测，后续学习1个月至2月初完成集群阶段测，进入下一学习阶段。
  - 补测机制：未通过阶段测需先参加补测，再确定是否参与网络服务阶段测；若准备不足需重新学习对应模块。
  - 重要提醒：服务器相关内容是后续学习的核心基础，若当前进度滞后，后续可能难以跟上整体节奏。
- **学习模式**：以“每月一个阶段目标”推进，近期无注册相关工作，按日常安排每日学习，即将迎来春节假期（假期可自主安排复习）。

## 二、技术核心讲解
### （一）NFS服务知识回顾
#### 1. 核心功能与实现
- NFS（网络文件系统）核心作用是**跨主机文件共享**，客户端需通过“挂载”操作才能访问服务器端共享文件，需安装NFS安全包完成环境配置。
- 架构特性：分布式架构，服务器与多个客户端（如192.168.66.192、192.168.66.193）可分别存储文件，支持分布式访问。

#### 2. 与FTP/VSFTP的核心差异
| 对比维度  | NFS                | FTP/VSFTP                    |
| ----- | ------------------ | ---------------------------- |
| 架构类型  | 分布式架构              | 集中化架构                        |
| 访问机制  | 客户端挂载后直接访问共享目录     | 所有客户端依赖服务器集中管理，通过FTP协议传输文件   |
| 跨平台支持 | 主要适用于Linux/Unix类系统 | 支持跨平台客户端（Windows、Linux、Mac等） |
| 端口特性  | 无固定端口，依赖RPC服务      | 有固定端口（21控制端口、20数据端口）         |

#### 3. 启动与工作原理
- **启动顺序（关键）**：
  ```bash
  # 1. 先启动RPC服务（CentOS 7+中RPC服务名为rpcbind）
  systemctl start rpcbind
  # 2. 再启动NFS服务
  systemctl start nfs-server
  # 设置开机自启（可选）
  systemctl enable rpcbind nfs-server
  ```
  - 解释：RPC（远程过程调用）的核心功能是等待NFS服务注册，记录NFS的动态端口与关键信息，为客户端与NFS建立连接提供“端口映射”服务。
- **连接流程**：
  1. 客户端发起NFS挂载请求，先连接RPC的固定端口（111）；
  2. RPC查询本地注册的NFS端口，返回给客户端；
  3. 客户端通过该动态端口与NFS服务器建立直接连接，进行文件读写。
  - 前提：客户端需提前安装并启动rpcbind服务，否则无法触发远程调用。

#### 4. 配置文件与权限管理
- **核心配置文件**：`/etc/exports`（视频中“EPC下”为口误，实际路径）
  - 配置格式：`共享目录 允许访问的客户端(权限参数1,权限参数2,...)`
  - 示例：
    ```bash
    # 共享/var/nfs_share目录，允许192.168.66.0/24网段访问，读写权限，同步模式
    /var/nfs_share 192.168.66.0/24(rw,sync)
    # 允许所有客户端访问，只读权限，匿名用户映射为nobody
    /var/nfs_public *(ro,sync,anonuid=99,anongid=99)
    ```
- **关键权限参数**：
  - `rw`：读写权限；`ro`：只读权限；
  - `sync`：数据同步写入磁盘（稳定）；`async`：数据先写入内存（快速，可能丢失数据）；
  - `anonuid/anongid`：指定匿名用户映射的UID/GID（默认映射为nobody，UID=99，GID=99）；
  - `no_root_squash`：客户端root用户不映射为nobody（默认root_squash，映射为nobody，提升安全性）；
  - `all_squash`：所有客户端用户（含普通用户）均映射为匿名用户（适用于公共共享场景）。
- **用户权限映射机制**：
  1. 常规映射：客户端普通用户映射为服务器端相同UID/GID的用户/组；
  2. `no_all_squash`：不强制映射所有用户，保留客户端身份（默认配置）；
  3. `all_squash`：所有客户端用户映射为匿名用户（可通过anonuid/anongid指定）；
  - 异常处理：客户端用户UID/GID在服务器端无匹配时，直接显示UID/GID（如“uid=1001 gid=1001”）。
- **常用命令（bash格式+解释）**：
  ```bash
  # 1. 查看NFS服务器的共享点（客户端/服务器端均可执行）
  showmount -e 192.168.66.100  # 替换为NFS服务器IP
  # 解释：列出服务器端已配置的共享目录、允许访问的客户端范围

  # 2. 加载exports配置（修改后无需重启服务）
  exportfs -r
  # 解释：重新读取/etc/exports配置，使修改生效

  # 3. 查看当前NFS共享状态
  exportfs -v
  # 解释：详细显示共享目录、客户端、权限参数等信息

  # 4. 客户端挂载NFS共享目录
  mount -t nfs 192.168.66.100:/var/nfs_share /mnt/nfs_client
  # 解释：-t nfs指定文件系统类型，服务器共享目录:本地挂载点

  # 5. 重启NFS服务（适用于重大配置变更）
  systemctl restart nfs-server
  ```

### （二）Apache服务基础核心讲解
#### 1. 核心功能与工作模式
- **核心作用**：网页服务器（HTTPD），通过IP/域名向客户端提供网页访问服务，网页需放置在指定根目录（默认或自定义）。
- **三种工作模式**：

| 模式名称    | 核心特性                        | 适用场景                    |
| ------- | --------------------------- | ----------------------- |
| prefork | 多进程模式，1个进程对应1个连接，无多线程安全风险   | 稳定性要求高的场景（如静态网页、小型轻量应用） |
| worker  | 多进程多线程模式，1个进程包含多个线程，资源占用率低  | 并发请求较多的场景（如中型动态网站）      |
| event   | 事件驱动模式，独立监听线程维护连接，避免进程/线程阻塞 | 高并发、长连接场景（如大型门户、API服务）  |
event模式补充说明
    默认保持长连接60秒，期间可处理多次请求，超时后自动断开，以此减少连接建立/关闭的性能开销。

#### 2. 配置文件结构与关键参数
- **核心配置文件路径**：
  - 主配置文件：`/etc/httpd/conf/httpd.conf`（视频“httpt下con图上httpd点con”口误修正）；
  - 子配置文件：`/etc/httpd/conf.d/*.conf`（通过主配置的`Include conf.d/*.conf`加载，用于扩展配置）；
  - 目录级配置文件：`.htaccess`，需通过`AllowOverride`开启（默认No），用于精细化目录权限控制。
- **关键配置参数（核心）**：
  ```bash
  # 1. 网页根目录（DocumentRoot）
  DocumentRoot "/var/www/html"  # 默认路径，可修改为自定义目录（如/var/www/default）
  # 注意：修改后需同步配置<Directory>权限，否则会返回403错误

  # 2. 目录权限配置（<Directory>标签）
  <Directory "/var/www/html">
      Options Indexes FollowSymLinks  # Indexes：目录无索引文件时显示文件列表；FollowSymLinks：允许跟随符号链接
      AllowOverride None  # 禁止.htaccess文件（改为All可启用）
      Require all granted  # 允许所有客户端访问（CentOS 7+推荐配置）
  </Directory>
  # 解释：控制指定目录的访问权限，是避免403错误的核心配置

  # 3. 别名配置（Alias）
  Alias /test "/var/www/test"  # 客户端访问http://IP/test → 实际访问服务器/var/www/test
  # 配套配置：需为别名路径添加<Directory>权限
  <Directory "/var/www/test">
      Require all granted
  </Directory>

  # 4. 日志配置
  ErrorLog "logs/error_log"  # 错误日志路径（相对路径：/etc/httpd/logs/error_log）
  LogLevel warn  # 日志级别：warn（记录warn及以上级别错误：warn→error→alert→emerg）

  LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
  # 解释：定义访问日志格式，包含：客户端IP、远程用户、访问时间、请求方法、状态码、数据大小、Referer、浏览器信息
  CustomLog "logs/access_log" combined  # 访问日志路径，使用combined格式

  # 5. MIME类型配置（关联文件扩展名与传输类型）
  Include conf/mime.types  # 加载/etc/httpd/conf/mime.types文件
  # 补充：mime.types路径为/etc/mime.types，定义如.html→text/html、.png→image/png等映射
  ```
- **欢迎页与错误页**：
  - 欢迎页：默认优先加载`index.html`、`index.php`等（主配置`DirectoryIndex`参数定义）；
  - 异常场景：删除欢迎页且无索引文件时，若`Options Indexes`启用则显示文件列表，否则返回403错误；
  - 错误页：403（权限不足）、404（资源不存在）、500（服务器内部错误）等，可通过`ErrorDocument`自定义（如`ErrorDocument 404 /404.html`）。
- **字符集配置**：默认支持UTF-8编码（主配置`AddDefaultCharset UTF-8`），确保中文网页正常显示。

#### 3. 常用命令
```bash
# 1. 检查Apache配置文件语法错误（修改后必执行）
apachectl configtest
# 解释：返回"Syntax OK"表示无语法错误，否则提示错误行号与原因

# 2. 重新加载Apache配置（无需重启服务）
systemctl reload httpd
# 解释：适用于配置文件修改后，平滑加载新配置，不中断现有连接

# 3. 重启Apache服务（重大变更如端口、模块修改）
systemctl restart httpd
# 解释：中断现有连接，重启服务进程

# 4. 查看Apache已加载的模块
apachectl -M
# 解释：列出已启用的模块（如mod_rewrite、mod_ssl、mod_vhost_alias等）

# 5. 查看Apache运行状态
systemctl status httpd
# 解释：显示服务是否运行、进程ID、最近日志等信息
```

## 三、Apache系列完整实验指南（含bash命令+详细步骤）
### 实验1：Apache页面访问权限控制（密码保护）
#### 1. 实验需求
- 普通网页目录（如`/var/www/html`）可直接访问；
- 重要目录（如`/var/www/html/important`）需输入用户名密码验证后访问。

#### 2. 环境准备
```bash
# 1. 创建重要目录与测试页面
mkdir -p /var/www/html/important
echo "这是需要密码验证的重要页面" > /var/www/html/important/index.html

# 2. 确保Apache服务已安装并运行
yum install -y httpd  # 安装（CentOS/RHEL系统）
systemctl start httpd
systemctl enable httpd
```

#### 3. 配置步骤（bash命令+解释）
```bash
# 步骤1：创建用户密码文件（使用htpasswd命令）
# -c：创建新文件；-b：直接在命令行输入用户名密码（测试环境用，生产环境建议省略-b，交互式输入）
htpasswd -c -b /etc/httpd/.htpasswd zhangsan 123456  # 用户名zhangsan，密码123456
# 解释：密码文件存储路径/etc/httpd/.htpasswd，密码自动加密（默认MD5算法）

# 步骤2：添加第二个用户（无需-c，避免覆盖现有文件）
htpasswd -b /etc/httpd/.htpasswd lisi 123123  # 用户名lisi，密码123123

# 步骤3：设置密码文件权限（避免泄露，仅root和apache用户可读）
chmod 640 /etc/httpd/.htpasswd
chown root:apache /etc/httpd/.htpasswd

# 步骤4：配置重要目录的权限验证（两种方式可选）
# 方式一：使用.htaccess文件（需开启AllowOverride）
# 4.1 编辑重要目录的.htaccess文件
cat > /var/www/html/important/.htaccess << EOF
AuthType Basic  # 验证类型：基本验证（简单加密）
AuthName "Important Page - 请输入用户名密码"  # 登录弹窗提示信息
AuthUserFile /etc/httpd/.htpasswd  # 关联密码文件路径
Require valid-user  # 允许密码文件中所有有效用户访问
EOF

# 4.2 修改主配置，允许该目录使用.htaccess
sed -i '/<Directory "\/var/www\/html">/a AllowOverride All' /etc/httpd/conf/httpd.conf
# 解释：在<Directory "/var/www/html">标签内添加AllowOverride All，启用.htaccess

# 方式二：直接在主配置/子配置文件中添加<Directory>标签（推荐，权限更易管理）
cat > /etc/httpd/conf.d/important_auth.conf << EOF
<Directory "/var/www/html/important">
    AuthType Basic
    AuthName "Important Page - 请输入用户名密码"
    AuthUserFile /etc/httpd/.htpasswd
    Require valid-user
</Directory>
EOF

# 步骤5：加载配置并测试
apachectl configtest  # 检查语法错误
systemctl reload httpd  # 重新加载配置
```

#### 4. 验证方式
- 浏览器访问：
  - 普通页面：`http://192.168.66.100`（直接显示，无需验证）；
  - 重要页面：`http://192.168.66.100/important`（弹出登录框，输入zhangsan/123456或lisi/123123可访问，输错返回401 Unauthorized）。
- 命令行测试（无弹窗，直接返回状态码）：
  ```bash
  curl -I http://192.168.66.100/important
  # 预期输出：HTTP/1.1 401 Unauthorized（未输入密码）
  curl -u zhangsan:123456 -I http://192.168.66.100/important
  # 预期输出：HTTP/1.1 200 OK（验证成功）
  ```

#### 5. 扩展场景：保护所有网页目录
```bash
# 将验证配置移动到网站根目录的<Directory>标签中
sed -i '/<Directory "\/var/www\/html">/a AuthType Basic\nAuthName "All Pages - 请输入用户名密码"\nAuthUserFile /etc/httpd/.htpasswd\nRequire valid-user' /etc/httpd/conf/httpd.conf
systemctl reload httpd
# 验证：访问任何页面均需输入用户名密码
```

### 实验2：虚拟主机（Virtual Host）配置
#### 1. 实验需求
通过虚拟主机实现单Apache服务搭建多个独立网站，支持基于域名、端口、IP三种类型的虚拟主机配置。

#### 2. 环境准备
```bash
# 1. 创建两个网站的根目录与测试页面
mkdir -p /var/www/site1 /var/www/site2
echo "这是网站1：www.site1.com" > /var/www/site1/index.html
echo "这是网站2：www.site2.com" > /var/www/site2/index.html

# 2. 设置目录权限（Apache用户可访问）
chown -R apache:apache /var/www/site1 /var/www/site2
chmod -R 755 /var/www/

# 3. 检查并加载虚拟主机模块（默认已加载）
apachectl -M | grep vhost_alias
# 预期输出： vhost_alias_module (shared)（未加载则需启用：LoadModule vhost_alias_module modules/mod_vhost_alias.so）
```

#### 3. 配置方案（三种类型，bash命令+配置文件）
##### 方案1：基于域名的虚拟主机（IP/端口相同，域名不同）
```bash
# 步骤1：创建虚拟主机子配置文件
cat > /etc/httpd/conf.d/vhosts.conf << EOF
# 虚拟主机配置开始
<VirtualHost *:80>  # 监听所有IP的80端口
    ServerName www.site1.com  # 主域名
    ServerAlias site1.com  # 域名别名（可选）
    DocumentRoot "/var/www/site1"  # 网站根目录
    ErrorLog "/var/log/httpd/site1_error.log"  # 错误日志
    CustomLog "/var/log/httpd/site1_access.log" combined  # 访问日志
    ServerAdmin webmaster@site1.com  # 管理员邮箱（可选）

    # 目录权限配置
    <Directory "/var/www/site1">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName www.site2.com
    ServerAlias site2.com
    DocumentRoot "/var/www/site2"
    ErrorLog "/var/log/httpd/site2_error.log"
    CustomLog "/var/log/httpd/site2_access.log" combined
    ServerAdmin webmaster@site2.com

    <Directory "/var/www/site2">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 步骤2：配置DNS解析（本地测试，修改hosts文件）
# 服务器/客户端均需配置（生产环境需在DNS服务器添加记录）
cat >> /etc/hosts << EOF
192.168.66.100 www.site1.com site1.com
192.168.66.100 www.site2.com site2.com
EOF

# 步骤3：加载配置并测试
apachectl configtest
systemctl reload httpd
```

##### 方案2：基于端口的虚拟主机（IP/域名相同，端口不同）
```bash
# 步骤1：修改虚拟主机配置，指定不同端口
cat > /etc/httpd/conf.d/vhosts_port.conf << EOF
# 监听新端口（需在主配置或子配置中声明）
Listen 90  # 新增90端口监听

<VirtualHost *:80>  # 80端口对应site1
    ServerName www.site1.com
    DocumentRoot "/var/www/site1"
    <Directory "/var/www/site1">
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:90>  # 90端口对应site2
    ServerName www.site1.com  # 域名相同
    DocumentRoot "/var/www/site2"
    <Directory "/var/www/site2">
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 步骤2：加载配置并测试
systemctl reload httpd
```

##### 方案3：基于IP的虚拟主机（域名/端口相同，IP不同）
```bash
# 步骤1：为服务器配置多个IP（以eth0网卡为例，添加虚拟IP）
ip addr add 192.168.66.101/24 dev eth0  # 新增IP：192.168.66.101
ip addr add 192.168.66.102/24 dev eth0  # 新增IP：192.168.66.102

# 步骤2：创建虚拟主机配置，指定不同IP
cat > /etc/httpd/conf.d/vhosts_ip.conf << EOF
<VirtualHost 192.168.66.101:80>  # 绑定IP1
    ServerName www.site1.com
    DocumentRoot "/var/www/site1"
    <Directory "/var/www/site1">
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost 192.168.66.102:80>  # 绑定IP2
    ServerName www.site1.com  # 域名相同
    DocumentRoot "/var/www/site2"
    <Directory "/var/www/site2">
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 步骤3：加载配置并测试
systemctl reload httpd
```

#### 4. 验证方式
| 虚拟主机类型 | 访问方式                                                     | 预期结果              |
| ------ | -------------------------------------------------------- | ----------------- |
| 基于域名   | 浏览器访问`www.site1.com`、`www.site2.com`                     | 分别显示对应网站的测试页面     |
| 基于端口   | 访问`http://www.site1.com`（80端口）、`http://www.site1.com:90` | 分别显示site1、site2页面 |
| 基于IP   | 访问`http://192.168.66.101`、`http://192.168.66.102`        | 分别显示site1、site2页面 |

#### 5. 匹配逻辑说明
- 优先级：域名匹配 > IP匹配 > 默认虚拟主机（第一个配置的虚拟主机）；
- 异常场景：
  - 用IP直接访问：匹配第一个IP对应的虚拟主机；
  - 访问未配置的域名：域名匹配失败后转IP匹配，进入对应虚拟主机（子配置优先级高于主配置默认页面）。

### 实验3：域名更换与地址跳转（Rewrite重定向）
#### 1. 实验需求
旧域名（如`www.oldsite.com`）到期，实现访问旧域名时自动跳转到新域名（如`www.newsite.com`），保留资源路径（如`oldsite.com/123.html`→`newsite.com/123.html`），跳转类型为301永久跳转。

#### 2. 环境准备
```bash
# 1. 确保rewrite模块已加载
apachectl -M | grep rewrite
# 未加载则启用：编辑/etc/httpd/conf/httpd.conf，取消LoadModule rewrite_module modules/mod_rewrite.so前的注释

# 2. 创建新域名网站目录与测试页面
mkdir -p /var/www/newsite
echo "新域名网站：www.newsite.com" > /var/www/newsite/index.html
echo "测试资源页面" > /var/www/newsite/123.html

# 3. 配置hosts文件（本地测试）
cat >> /etc/hosts << EOF
192.168.66.100 www.oldsite.com oldsite.com
192.168.66.100 www.newsite.com newsite.com
EOF
```

#### 3. 配置步骤（bash+Rewrite规则）
```bash
# 步骤1：在虚拟主机子配置中添加Rewrite规则（推荐方式）
/etc/httpd/conf.d/rewrite.conf 
<VirtualHost *:80>
    ServerName www.oldsite.com
    ServerAlias oldsite.com
    DocumentRoot "/var/www/oldsite"  # 旧域名目录（可空，仅用于跳转）

    # 开启Rewrite引擎
    RewriteEngine On

    # 跳转规则：访问旧域名时跳转到新域名
    # 条件：判断访问的域名是否为旧域名（HTTP_HOST为请求域名）
    RewriteCond %{HTTP_HOST} ^(www\.)?oldsite\.com$ [NC]
    # 规则：匹配所有资源（.*），拼接至新域名后，301永久跳转
    RewriteRule ^(.*)$ http://www.newsite.com$1 [R=301,L]
    # 解释：
    # [NC]：不区分大小写；
    # [R=301]：301永久跳转（搜索引擎会更新索引），[R=302]为临时跳转；
    # [L]：当前规则匹配后停止后续规则（避免循环）

    <Directory "/var/www/oldsite">
        Require all granted
    </Directory>
</VirtualHost>

# 新域名虚拟主机配置
<VirtualHost *:80>
    ServerName www.newsite.com
    ServerAlias newsite.com
    DocumentRoot "/var/www/newsite"
    <Directory "/var/www/newsite">
        Require all granted
    </Directory>
</VirtualHost>


# 步骤2：加载配置并测试
apachectl configtest
systemctl reload httpd
```

#### 4. 验证方式
```bash
# 1. 命令行测试跳转状态码
curl -I http://www.oldsite.com  # 预期输出：HTTP/1.1 301 Moved Permanently，Location: http://www.newsite.com/
curl -I http://oldsite.com/123.html  # 预期输出：Location: http://www.newsite.com/123.html

# 2. 浏览器测试
# 访问www.oldsite.com，自动跳转到www.newsite.com，显示新域名页面；
# 访问oldsite.com/123.html，跳转到newsite.com/123.html，显示测试资源页面。

# 3. 状态码说明
# 301：永久跳转（客户端下次直接访问新域名）；
# 200：跳转后访问成功；
# 304：资源未修改（浏览器缓存）。
```

### 实验4：HTTPS加密配置（虚拟主机+主配网站）
#### 1. 实验需求
为Apache网站配置HTTPS加密（默认443端口），支持虚拟主机与主配网站两种场景，使用自签名证书（测试环境），实现加密传输。

#### 2. 核心原理
- 基于HTTP+SSL/TLS协议，通过证书验证服务器身份，加密传输数据，默认端口443。
- 环境说明：已存在两个HTTP虚拟主机（`www.site1.com`、`www.site2.com`），为`www.site1.com`配置HTTPS，HTTP与HTTPS共用网页根目录。

#### 3. 配置步骤（bash+详细操作）
##### 步骤1：安装并加载SSL模块
```bash
# 1. 安装mod_ssl（CentOS/RHEL系统）
yum install -y mod_ssl
# 解释：安装后自动加载ssl模块，并生成默认配置文件/etc/httpd/conf.d/ssl.conf

# 2. 验证ssl模块加载
apachectl -M | grep ssl
# 预期输出： ssl_module (shared)
```

##### 步骤2：生成自签名证书（bash脚本自动化生成）
```bash
# 1. 创建证书存储目录（权限控制）
mkdir -p /etc/httpd/ssl
chmod 700 /etc/httpd/ssl  # 仅root用户可访问

# 2. 生成自签名证书（一步到位脚本）
cat > /etc/httpd/ssl/generate_cert.sh << EOF
#!/bin/bash
# 生成RSA私钥（2048位，无密码保护）
openssl genrsa -out /etc/httpd/ssl/site1.key 2048
# 生成证书签名请求（CSR），填写公司信息
openssl req -new -key /etc/httpd/ssl/site1.key -out /etc/httpd/ssl/site1.csr \
-subj "/C=CN/ST=Beijing/L=Beijing/O=TestCompany/OU=IT/CN=www.site1.com"
# 生成自签名证书（有效期365天）
openssl x509 -req -days 365 -in /etc/httpd/ssl/site1.csr -signkey /etc/httpd/ssl/site1.key -out /etc/httpd/ssl/site1.crt
# 设置证书/私钥权限（避免泄露）
chmod 600 /etc/httpd/ssl/site1.key /etc/httpd/ssl/site1.crt
echo "自签名证书生成完成："
echo "私钥：/etc/httpd/ssl/site1.key"
echo "证书：/etc/httpd/ssl/site1.crt"
EOF

# 3. 执行脚本生成证书
bash /etc/httpd/ssl/generate_cert.sh
# 解释：
# -subj参数说明：C=国家，ST=省份，L=城市，O=公司名，OU=部门，CN=域名（必须与访问域名一致）
```

##### 方案A：虚拟主机HTTPS配置
```bash
# 1. 编辑SSL虚拟主机配置（修改ssl.conf或新建子配置）
/etc/httpd/conf.d/site1_ssl.conf 
<VirtualHost *:443>
    ServerName www.site1.com
    DocumentRoot "/var/www/site1"  # 与HTTP虚拟主机共用根目录

    # 启用SSL引擎
    SSLEngine On
    # 私钥路径
    SSLCertificateKeyFile "/etc/httpd/ssl/site1.key"
    # 证书路径
    SSLCertificateFile "/etc/httpd/ssl/site1.crt"
    # 加密算法排序（优先高强度算法）
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1  # 仅支持TLSv1.2/TLSv1.3
    SSLCipherSuite HIGH:!aNULL:!MD5

    # 日志配置
    ErrorLog "/var/log/httpd/site1_ssl_error.log"
    CustomLog "/var/log/httpd/site1_ssl_access.log" combined

    # 目录权限
    <Directory "/var/www/site1">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

```

##### 方案B：主配网站HTTPS配置（非虚拟主机）
```bash
# 1. 编辑主配置文件的SSL配置（或修改ssl.conf）
cat >> /etc/httpd/conf.d/ssl.conf << EOF
<VirtualHost _default_:443>
    DocumentRoot "/var/www/html"  # 主配网站根目录
    SSLEngine On
    SSLCertificateKeyFile "/etc/httpd/ssl/site1.key"
    SSLCertificateFile "/etc/httpd/ssl/site1.crt"
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    <Directory "/var/www/html">
        Require all granted
    </Directory>
</VirtualHost>
EOF
```

##### 步骤3：加载配置并测试
```bash
# 1. 检查配置语法
apachectl configtest

# 2. 重启Apache服务（SSL配置需重启）
systemctl restart httpd

# 3. 验证HTTPS访问
# 浏览器访问：https://www.site1.com（需手动输入https://）
# 预期结果：浏览器提示“证书不受信任”（自签名证书特性），确认信任后显示网站页面；
# 开发者工具→网络→协议：显示https，状态码200。

# 4. 命令行测试（忽略证书验证）
curl -k -I https://www.site1.com
# 预期输出：HTTP/1.1 200 OK，Server: Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips
```

### 实验5：HTTP/2（H2）协议升级
#### 1. 实验需求
将HTTPS网站从HTTP/1.1升级至HTTP/2，利用二进制分帧、多路复用等特性提升页面加载速度，适配高并发场景。

#### 2. HTTP/2核心优势
- 二进制分帧：拆分数据为小数据包传输，提升灵活性；
- 多路复用：同一连接并行传输多个资源，减少带宽占用；
- 头部压缩：减少HTTP消息头传输量；
- 服务器推送：主动推送客户端可能需要的资源（如CSS、JS）。

#### 3. 配置步骤（bash+配置）
```bash
# 步骤1：确认HTTP/2模块已加载（安装mod_ssl后默认包含）
apachectl -M | grep http2
# 预期输出： http2_module (shared)（未加载则需启用：LoadModule http2_module modules/mod_http2.so）

# 步骤2：在HTTPS虚拟主机配置中添加HTTP/2支持
sed -i '/SSLCipherSuite/a Protocols HTTP/1.1 HTTP/2' /etc/httpd/conf.d/site1_ssl.conf
# 解释：在SSL虚拟主机配置中添加Protocols指令，同时支持HTTP/1.1和HTTP/2（向下兼容）

# 步骤3：重启服务并验证
systemctl restart httpd

# 验证方式1：浏览器开发者工具
# 访问https://www.site1.com→F12→网络→选择任意请求→协议列显示“h2”

# 验证方式2：命令行测试（需安装nghttp2工具）
yum install -y nghttp2
nghttp -v https://www.site1.com
# 预期输出：Connected to 192.168.66.100:443
#           [HTTP/2.0 200 OK]
```

### 实验6：HTTP到HTTPS自动跳转（Rewrite规则）
#### 1. 实验需求
访问HTTP域名（80端口）时，自动跳转到对应的HTTPS域名（443端口），无需用户手动输入`https://`，跳转类型为301永久跳转，保留资源路径。

#### 2. 配置步骤（bash+Rewrite规则）
```bash
# 步骤1：在HTTP虚拟主机配置中添加跳转规则
cat >> /etc/httpd/conf.d/site1_http.conf << EOF
<VirtualHost *:80>
    ServerName www.site1.com
    ServerAlias site1.com
    DocumentRoot "/var/www/site1"

    # 开启Rewrite引擎
    RewriteEngine On

    # 跳转条件：判断访问端口是否为80（避免443端口循环跳转）
    RewriteCond %{SERVER_PORT} ^80$
    # 规则：跳转到HTTPS，保留资源路径（$1匹配所有请求路径）
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]

    <Directory "/var/www/site1">
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 步骤2：加载配置并测试
apachectl configtest
systemctl reload httpd
```

#### 3. 验证方式
```bash
# 1. 命令行测试跳转
curl -I http://www.site1.com  # 预期输出：301 Moved Permanently，Location: https://www.site1.com/
curl -I http://site1.com/123.html  # 预期输出：Location: https://site1.com/123.html

# 2. 浏览器测试
# 直接输入www.site1.com，自动跳转到https://www.site1.com，状态码200；
# 访问http://site1.com/123.html，跳转到https://site1.com/123.html，正常显示资源。

# 3. 特殊场景测试（避免循环）
curl -k -I https://www.site1.com  # 预期输出：200 OK（无跳转，正常访问）
```

## 四、关键注意事项（整合所有核心要点）
### 1. 配置文件管理
- 推荐优先使用**子配置文件**（`/etc/httpd/conf.d/*.conf`）编写个性化规则（如虚拟主机、Rewrite、SSL），避免主配置文件（httpd.conf）过于复杂，便于维护与迁移。
- 配置文件语法：Apache配置区分大小写（如`DocumentRoot`而非`documentroot`），标签需闭合（如`<Directory>`→`</Directory>`），注释用`#`开头。

### 2. 模块与服务操作
- 每次修改配置或安装模块后，必须执行`apachectl configtest`检查语法错误，避免服务启动失败。
- 配置修改后优先使用`systemctl reload httpd`（平滑加载），仅重大变更（如端口、模块）需`systemctl restart httpd`。
- 核心模块依赖：
  - 虚拟主机：`mod_vhost_alias`；
  - 重定向：`mod_rewrite`；
  - HTTPS：`mod_ssl`；
  - HTTP/2：`mod_http2`（依赖`mod_ssl`）。

### 3. 证书管理
- 自签名证书仅适用于测试环境，正式环境需使用CA颁发的可信证书（如Let's Encrypt免费证书），避免浏览器安全提示。
- 证书与私钥权限：私钥文件（.key）需设置为`600`权限，仅root用户可读，防止泄露；证书文件（.crt）可设置为`644`权限。
- 证书有效期：自签名证书默认365天，到期前需重新生成并替换。

### 4. 错误排查与调试
- 状态码定位问题：
  - 403：权限不足→检查`<Directory>`标签的`Require`配置、目录/文件权限（Apache用户是否可读）；
  - 404：资源不存在→检查`DocumentRoot`、`Alias`路径是否正确，文件是否存在；
  - 401：未授权→密码文件路径错误、用户名密码输错、`AuthUserFile`配置错误；
  - 500：服务器内部错误→查看错误日志（`/var/log/httpd/error_log`），通常是配置语法错误、模块未加载；
  - 301/302：跳转成功→确认`Rewrite`规则是否符合预期。
- 日志工具：通过访问日志（`access_log`）查看客户端IP、请求路径、状态码；通过错误日志（`error_log`）定位配置/代码问题。

### 5. 学习节奏建议
- 实验难度递进：基础配置（根目录、别名）→ 权限控制→ 虚拟主机→ 重定向→ HTTPS→ HTTP/2，若某阶段操作复杂（如SSL+HTTP/2），可先从主配网站实践，再迁移到虚拟主机。
- 重点巩固：`mod_rewrite`规则（正则表达式）、SSL证书生成、虚拟主机匹配逻辑是Apache配置的核心难点，需反复练习验证。

### 6. 生产环境补充
- 防火墙配置：开放80（HTTP）、443（HTTPS）端口（`firewall-cmd --permanent --add-port=80/tcp --add-port=443/tcp && firewall-cmd --reload`）。
-  SELinux设置：若启用SELinux，需为自定义网页目录设置安全上下文（`chcon -R -t httpd_sys_content_t /var/www/custom_dir`），否则返回403错误。
- 性能优化：高并发场景推荐使用`event`工作模式，调整`MaxRequestWorkers`（最大并发连接数）、`KeepAliveTimeout`（长连接超时时间）等参数。