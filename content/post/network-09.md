---
title: "Nginx 访问控制、缓存与动态请求处理"
date: 2025-12-23T09:00:00+08:00
image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["4. 网络基础阶段"]
slug: "network-09"
description: "介绍《Nginx 访问控制、缓存与动态请求处理》，涵盖已学内容梳理、缓存相关知识点和动态请求处理方法等实践要点。"
---
## 一、前期知识回顾
### （一）已学内容梳理
已完成Apache相关内容讲解，涵盖缓存处理与动态请求处理两大模块，尚未开展Nginx的安装与配置功能讲解。

### （二）缓存相关知识点
1.  缓存有效期查看：在浏览器开发者工具的Response面板最下方查询，关键标识为`Max-age`，单位默认秒，例如`Max-age: 14400`代表缓存有效期为14400秒。
2.  访问状态码差异：第一次访问与缓存有效期内访问均可能返回200状态码，但存在本质区别——第一次访问会向服务器发送请求并获取完整数据；有效期内访问可能不发起网络请求，直接使用本地缓存，也可能返回304状态码（服务器验证缓存有效，无需重新传输数据）。

### （三）动态请求处理方法
1.  模块依赖方式：借助PHP、JSP模块（视频中“PSP模块model上环线PSP”为口语化表述，实际为JSP模块）实现动态请求解析。
2.  FastCGI方式：通过fastCGI协议实现，核心依赖fpm相关接口（常用“php-fpm”形式）维护。PHP-FPM默认监听Unix套接字层，采用IPC协议通信，相比7层应用协议无需分包、拆包，传输速度更快。

### （四）Nginx高并发核心原因
1.  工作进程模式：采用多工作进程架构，进程数量可灵活调整，通常与服务器CPU核心数保持一致，充分利用硬件资源。
2.  连接数可配置：最大连接数默认支持65535，可根据业务需求调整，满足高并发场景下的连接承载需求。
3.  事件驱动模式：将“增删改查”等各类操作抽象为事件，接收客户端请求后转交后台处理并监听结果，同时可并行处理其他客户端事件；且将监听事件交由硬件辅助处理，进一步提升并发处理能力。

### （五）Nginx基础配置要点
1.  配置文件路径：常见路径可能在`/usr/local/nginx/conf`、`/etc/nginx`等目录（视频中“user logo”“user local industry/com”为口语化模糊表述，需结合实际环境确认）。
2.  location匹配优先级：虚拟主机中的`location`指令用于匹配客户端请求资源，优先级从高到低为：精准匹配（`=`）＞正则匹配（`~`/`~*`，波浪线右侧匹配）＞字符串匹配，其中字符串匹配遵循“长度越长，优先级越高”的规则。
3.  热重启相关命令：
    ```bash
    # 第一步：检测配置文件语法是否存在错误，无报错则说明配置格式合法
    nginx -t
    # 第二步：执行热重启，加载新配置，新旧配置会同时运行，不中断服务
    nginx -s reload
    # 替代热重启命令：通过进程信号实现，需替换为实际进程名/进程号
    pkill -HUP nginx  # 或 kill -HUP 进程号（视频中“RS”“PQ + 进程名/进程号”均为此类命令的口语化表述）
    ```

## 二、Nginx核心功能实验操作
### （一）访问控制（安全防护）
#### 1. 拒绝指定IP访问
1.  配置规则：在Nginx配置文件中，通过`deny 目标IP;`和`allow 允许的网络/IP;`语句实现访问控制，语句顺序影响生效逻辑——通常`deny`在前拒绝指定IP，`allow all;`在后允许其余所有IP；也可反向配置实现“仅允许指定IP，拒绝其余所有IP”。
2.  全局生效配置：若需拒绝某IP访问所有页面/请求，将`deny`与`allow`语句放置在全局配置段或所有`location`指令之上，避免在每个`location`中重复配置。
3.  配置验证与生效：
    ```bash
    # 检查配置文件语法错误
    nginx -t
    # 热重启加载新配置
    nginx -s reload
    ```
    测试时，被拒绝的IP访问目标站点会返回403 Forbidden状态码；若需拒绝Windows设备IP，需先通过`ipconfig`命令确认该设备对应网卡的实际IP地址。

#### 2. 页面密码验证保护
1.  与Apache的差异：Apache需在网页根目录创建`.htaccess`文件实现密码验证，而Nginx直接在配置文件中配置，无需额外创建网页目录文件。
2.  核心配置语句：
    ```nginx
    # 开启密码验证，并设置验证提示信息
    auth_basic "请输入用户名和密码进行验证";
    # 指定密码文件的存放路径
    auth_basic_user_file /usr/local/nginx/html/NGX.pwd;
    ```
    该配置将Apache所需的4个步骤优化为2个，简化操作流程。
3.  密码文件创建：
    - 前提：若未安装相关依赖，需先通过`yum install httpd-tools`安装（htpasswd工具属于httpd-tools包）。
    - 创建命令：
      ```bash
      # 首次创建密码文件并添加用户（-c 参数用于创建新文件，后续添加用户需移除-c）
      htpasswd -c /usr/local/nginx/html/NGX.pwd 李四
      # 为已存在的密码文件添加新用户（-m 参数表示使用MD5加密密码）
      htpasswd -m /usr/local/nginx/html/NGX.pwd 张三
      ```
    执行命令后按提示输入密码（如用户“李四”的密码“123123”），即可完成密码文件创建。
4.  生效范围控制：将上述配置语句放置在全局配置段，可对所有页面生效；放置在指定`location`指令中，仅对该`location`匹配的页面/目录生效，配置后需执行`nginx -t`检查语法并`nginx -s reload`热重启，访问对应页面会弹出密码验证框，输入正确用户名密码方可正常访问。

### （二）默认网页文件配置
1.  基础功能：Nginx与Apache功能类似，支持设置多个默认网页文件，访问时按配置顺序依次查找，找到第一个存在的文件即可返回内容，核心配置语句为`index 文件名1 文件名2 ...;`（如`index index.html index.php index.jsp;`）。
2.  无默认网页文件的处理：若未配置默认网页文件，或网页根目录下无配置的默认文件，Nginx会返回403 Forbidden状态码（出于安全考虑，不展示目录文件列表）；而Apache可能展示目录文件链接或返回404/403状态码，因此Nginx无法搭建类似Apache的局域网文件共享服务（需依赖目录文件列表展示的场景）。
3.  问题解决：通过在配置文件中添加`index 文件名;`指令指定默认网页文件，即可解决上述403报错问题。

### （三）虚拟主机配置
1.  核心概念：可基于域名、端口、IP三种方式搭建不同网站，实现一台服务器运行多个站点，视频以基于域名的配置为例展开详细讲解。

#### 1. 基于域名的虚拟主机配置
1.  配置步骤：
    - 创建多个`server`块（视频中称“soul”），每个`server`块通过`server_name 域名;`区分不同站点，例如`server_name www.逍遥.com;`、`server_name www.王森.com;`，类似Apache的别名配置。
    - 为每个虚拟主机配置独立网页根目录，通过`root 目录路径;`指令设置（如`root /usr/local/nginx/html/xy_com;`、`root /usr/local/nginx/html/ws_com;`），并在对应目录下创建默认网页文件（如`index.html`），避免与其他虚拟主机内容冲突。
2.  配置验证：
    ```bash
    # 检查配置语法
    nginx -t
    # 热重启生效
    nginx -s reload
    ```
    本地验证时需修改DNS解析（如Windows系统修改`C:\Windows\System32\drivers\etc\hosts`，Linux系统修改`/etc/hosts`），添加“服务器IP 域名”映射（如`192.168.66.190 www.逍遥.com`），保存后访问不同域名即可打开对应虚拟主机的网页。

#### 2. 虚拟主机优先级规则
- 域名访问：按域名精准匹配，与配置文件中`server`块的顺序无关，匹配成功即返回对应站点内容。
- IP访问：直接匹配配置文件中的第一个`server`块（默认虚拟主机），返回该站点内容。
- 未配置域名访问：先尝试域名精准匹配，匹配失败后自动转为IP匹配，最终仍匹配第一个`server`块。

#### 3. 基于端口的虚拟主机配置
1.  配置要点：在`server`块中通过`listen 端口号;`指令设置不同端口（如`listen 90;`、`listen 8080;`），无需修改域名，每个端口对应一个虚拟主机。
2.  验证步骤：
    ```bash
    # 检查配置语法
    nginx -t
    # 热重启生效
    nginx -s reload
    # 查看Nginx监听端口，确认端口配置生效
    netstat -tuln | grep nginx
    ```
    访问时需在IP/域名后拼接端口号（如`http://192.168.66.190:90`、`http://www.逍遥.com:8080`），不同端口对应不同虚拟主机站点。

#### 4. 基于IP的虚拟主机配置（课下操作）
1.  前期准备：为服务器开启第二块网卡，配置多个独立IP地址。
2.  配置逻辑：每个IP对应一个`server`块，在`server`块中通过`listen 对应IP:端口;`（如`listen 192.168.66.191:80;`）绑定IP，其余配置（网页根目录、默认文件等）与基于域名的虚拟主机一致。
3.  注意事项：若从基于域名的虚拟主机切换为基于IP的配置，热重启可能无法加载新IP的端口信息，需执行完整重启命令：
    ```bash
    # 停止Nginx服务
    nginx -s stop
    # 启动Nginx服务
    nginx
    ```

### （四）地址跳转配置
#### 1. 与Apache的配置差异
Apache需在跳转站点的网页根目录创建`.htaccess`文件，或配置相关标签（视频中“MSIS”“Dior”为口语化表述），并额外开启重写引擎才能实现跳转；Nginx直接在配置文件中配置，默认开启跳转功能，无需额外启用引擎，配置更简洁。

#### 2. 核心配置方法
1.  跳转语句：在源网站的`server`块（全局）或指定`location`块中添加`return 跳转状态码 目标网址;`，常用状态码为301（永久跳转，搜索引擎会更新索引）、302（临时跳转，搜索引擎保留原索引），例如`return 301 https://www.王森.com;`（实现“逍遥.com”跳转到“王森.com”）。
2.  生效范围控制：将跳转语句放在`server`块全局，所有请求均会触发跳转；放在指定`location`块中，仅该`location`匹配的请求（如特定页面、特定目录）会触发跳转。

#### 3. 配置验证与细节注意
1.  验证步骤：
    ```bash
    # 检查配置语法
    nginx -t
    # 热重启生效
    nginx -s reload
    ```
    访问源域名时，可通过浏览器开发者工具查看网络请求状态码（301/302），跳转后URL会变为目标域名，页面内容同步切换为目标网站内容；若本地存在源域名缓存，可能返回304状态码（缓存验证有效）。
2.  路径细节：跳转网址后是否添加“/”不影响功能，Nginx会自动补充缺失的“/”，多个连续“/”会被视为空路径，最终均跳转至目标网站的网页根目录获取资源。

#### 4. 实验收尾
回顾地址跳转配置细节，明确跳转规则中部分冗余参数可省略，不影响功能实现，确认地址跳转实验完成，为后续HTTPS加密配置铺垫。

### （五）HTTPS加密配置
#### 1. 与Apache的加密差异
Apache需额外加载SSL模块（`mod_ssl`），再单独配置加密虚拟主机；Nginx通过开启`http_ssl_module`模块（视频中“HTTPS so”为口语化表述）实现加密功能，且提供可直接复用的配置模板，仅需按需调整证书路径、加密算法等参数，配置更高效。

#### 2. 核心配置步骤
1.  基础配置：确定加密域名（如`www.王森.com`），在`server`块中配置证书与私钥路径（支持相对路径，与Nginx配置文件目录关联），示例配置：
    ```nginx
    server {
        listen 443 ssl;  # 监听443端口（HTTPS默认端口），开启SSL加密
        server_name www.王森.com;
        # 配置证书文件路径（.crt/.pem格式均可）
        ssl_certificate cert/www.王森.com.crt;
        # 配置私钥文件路径
        ssl_certificate_key cert/www.王森.com.key;
        # 设置SSL缓存与加密算法
        ssl_session_cache shared:SSL:1m;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
        # 网页根目录，需与HTTP站点保持一致
        root /usr/local/nginx/html/ws_com;
        index index.html;
    }
    ```
2.  一致性保障：确保加密站点（HTTPS）与原HTTP站点的网页根目录、默认文件配置一致，仅传输协议不同（HTTPS加密传输，HTTP明文传输）。

#### 3. 证书生成方式
1.  快速生成：通过脚本一键生成自签名证书，无需手动执行多步命令。
2.  手动生成：通过`openssl`工具执行3步命令创建自签名证书，无需频繁修改配置文件：
    ```bash
    # 第一步：生成RSA私钥文件，密钥长度2048位
    openssl genrsa -out www.yh.com.key 2048
    # 第二步：基于私钥生成证书请求文件，填写企业/个人信息（可按需简化填写）
    openssl req -new -key www.yh.com.key -out www.王森.com.csr
    # 第三步：生成自签名证书，有效期365天
    openssl x509 -req -days 365 -in www.yh.com.csr -signkey www.yh.com.key -out www.yh.com.crt
    ```

#### 4. 服务验证与HTTP/2升级
1.  配置验证与生效：
    ```bash
    # 检查配置语法（若脚本兼容性问题，可调整证书/配置文件路径）
    nginx -t
    # 热重启加载配置
    nginx -s reload
    ```
    访问时需指定HTTPS协议与443端口（如`https://www.王森.com`），自签名证书会触发浏览器安全提示，需手动点击“信任”或“高级”->“继续访问”方可正常打开站点。
2.  HTTP/2升级：在`listen`指令后添加`http2`标签即可启用HTTP/2协议，示例`listen 443 ssl http2;`；注意高版本Nginx（如1.26）需替换过时的`listen`参数写法，低版本（如1.20）可兼容旧配置，HTTP/2协议相比HTTP/1.1传输效率更高。

#### 5. 80端口自动跳转HTTPS
为实现“输入域名无需手动添加https://即可访问加密站点”，在80端口对应的虚拟主机`server`块中添加跳转配置：
```nginx
server {
    listen 80;
    server_name www.王森.com;
    # 将所有HTTP请求永久跳转至HTTPS
    return 301 https://$host$request_uri;
}
```
配置后执行`nginx -t`与`nginx -s reload`，访问`http://www.王森.com`会自动跳转至`https://www.王森.com`。

### （六）反向代理配置
#### 1. 概念与优势
反向代理由Nginx作为代理服务器，接收客户端所有请求，再将请求转发至后端真实服务器（RS，如Apache）；客户端无需知晓后端RS的真实IP与地址，可有效隐藏后端服务器信息，提升服务安全性，同时实现请求分发与负载分担。

#### 2. 实操搭建步骤
1.  后端RS搭建（以Apache为例）：
    ```bash
    # 1. 安装Apache（CentOS系统）
    yum install httpd -y
    # 2. 启动Apache服务并设置开机自启
    systemctl start httpd && systemctl enable httpd
    # 3. 编写测试网页，放置在Apache默认网页根目录
    echo "Apache RS Test Page: 192.168.66.191" > /var/www/html/index.html
    # 4. 验证本地与Nginx服务器对RS的连通性（排除防火墙拦截）
    ping 192.168.66.191
    curl http://192.168.66.191
    ```
2.  Nginx代理配置：在Nginx的`location`块中删除原网页根目录配置，改用`proxy_pass`指令指向后端RS地址（默认80端口可省略），示例配置：
    ```nginx
    server {
        listen 80;
        server_name www.代理.com;
        location / {
            # 转发请求至后端Apache服务器（RS）
            proxy_pass http://192.168.66.191;
            # 可选：配置代理相关参数，优化请求转发
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```
3.  配置生效：执行`nginx -t`检查语法，`nginx -s reload`热重启，访问`www.代理.com`即可获取后端Apache的测试页面内容。

#### 3. 代理与跳转的核心区别
| 对比项       | 地址跳转                     | 反向代理                     |
|--------------|------------------------------|------------------------------|
| URL变化      | 跳转后URL显示目标地址        | URL保持不变，仍显示代理地址  |
| 状态码       | 返回301/302跳转状态码        | 返回200（或后端RS的状态码）  |
| 本质         | 虚拟主机间的请求转移         | 服务器间的请求转发           |
| 请求次数     | 1次HTTP请求（客户端→目标主机）| 2次HTTP请求（客户端→Nginx→RS）|
| 日志记录     | 仅目标主机记录客户端IP       | Nginx记录客户端IP，RS记录Nginx IP |

### （七）负载均衡配置
#### 1. 核心需求
解决单台后端RS（如Apache）压力过大、性能瓶颈的问题，通过Nginx将客户端请求均匀分发至多台RS，形成负载均衡集群（LBC），与高可用集群（HAC，解决服务器故障切换问题）存在本质区别。

#### 2. 多RS节点搭建
新增两台Apache服务器（IP：192.168.66.194、192.168.66.195），重复上述RS搭建步骤，为区分节点设置不同测试网页内容（实际工作中需保证各RS数据一致，可通过共享存储、同步工具实现）：
```bash
# 节点192.168.66.194
echo "Apache RS Test Page: 192.168.66.194" > /var/www/html/index.html
# 节点192.168.66.195
echo "Apache RS Test Page: 192.168.66.195" > /var/www/html/index.html
# 验证各节点连通性
curl http://192.168.66.194
curl http://192.168.66.195
```

#### 3. 负载均衡核心配置
1.  定义RS集群：在Nginx配置文件的`http`块内、`server`块外，通过`upstream`指令定义RS集群（自定义集群名，如“proxy”），添加所有后端RS地址：
    ```nginx
    http {
        # 定义负载均衡集群，集群名：proxy
        upstream proxy {
            server 192.168.66.191;  # 后端RS1
            server 192.168.66.194;  # 后端RS2
            server 192.168.66.195;  # 后端RS3
        }
        # 虚拟主机配置
        server {
            listen 80;
            server_name www.lb.com;
            location / {
                # 转发请求至定义好的RS集群，而非单个RS地址
                proxy_pass http://proxy;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }
        }
    }
    ```
2.  配置生效：执行`nginx -t`与`nginx -s reload`，完成负载均衡配置。

#### 4. 负载均衡算法
1.  轮询算法（默认）：按客户端请求的先后顺序，依次将请求分发至各RS（分发顺序：191→194→195→191...）；Nginx会通过心跳检测（如Ping通验证）自动剔除故障RS，故障节点恢复后会自动重新加入集群，相比DNS轮询（无法自动剔除故障节点，易导致访问失败）更可靠。
2.  权重轮询（WR）：为RS设置`weight`参数（默认值为1，权重与请求接收概率正相关），示例配置：
    ```nginx
    upstream proxy {
        server 192.168.66.191 weight=1;
        server 192.168.66.194 weight=2;  # 权重为2，接收请求数约为其他节点的2倍
        server 192.168.66.195 weight=1;
    }
    ```
3.  其他进阶算法（需额外配置）：
    - IP哈希：`ip_hash;`，按客户端IP的哈希值固定分发请求至某一台RS，适用于需要保持会话一致性的场景（利用长连接特性）。
    - 域名哈希：`hash $host;`，按访问域名的哈希值固定分发，适用于多域名站点，可充分利用缓存资源。
    - 最小连接：`least_conn;`，将请求分发至当前活跃连接数最少的RS，最符合服务器资源利用率优化需求。

#### 5. 集群验证
因实际工作中各RS内容一致，需通过日志或直接访问验证分发效果：
```bash
# 1. 查看Nginx访问日志，确认请求转发记录
tail -f /usr/local/nginx/logs/access.log
# 2. 查看各RS的Apache访问日志，确认请求接收情况
# 节点192.168.66.191
tail -f /var/log/httpd/access_log
# 节点192.168.66.194
tail -f /var/log/httpd/access_log
# 3. 多次访问Nginx负载均衡地址，观察页面内容切换（实验环境）
curl http://www.lb.com
```

### （八）动态请求处理（Nginx与PHP结合）
Nginx仅能直接处理静态请求（如HTML、CSS、JS），无法直接解析PHP动态请求（默认会触发文件下载，而非执行脚本），需通过以下两种方式实现PHP动态请求处理。

#### 方案一：转发至PHP-FPM进程处理
1.  PHP-FPM安装与启动：
    ```bash
    # 1. 安装PHP与PHP-FPM（CentOS系统）
    yum install php php-fpm -y
    # 2. 修改PHP-FPM进程所有者（默认为apache，改为nginx避免权限冲突）
    sed -i 's/user = apache/user = nginx/g' /etc/php-fpm.d/www.conf
    sed -i 's/group = apache/group = nginx/g' /etc/php-fpm.d/www.conf
    # 3. 启动PHP-FPM并设置开机自启
    systemctl start php-fpm && systemctl enable php-fpm
    # 4. 验证PHP-FPM是否正常监听9000端口
    netstat -tuln | grep 9000
    ```
2.  Nginx配置关联PHP-FPM：
    ```nginx
    server {
        listen 80;
        server_name www.php.com;
        root /usr/local/nginx/html/php_com;
        index index.html index.php;

        # 匹配所有.php后缀的动态请求
        location ~ \.php$ {
            # 转发请求至PHP-FPM监听地址（单节点可直接指向本地9000端口）
            fastcgi_pass 127.0.0.1:9000;
            # 加载FastCGI参数配置文件
            include fastcgi_params;
            # 指定PHP脚本文件的实际路径（关键参数，避免“文件未找到”错误）
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            ————————————————————————————————————————————————————————————————————
            location ~ \.php$ {
            root           html/wangsen;
            fastcgi_pass   unix:/run/php-fpm/www.sock; 
            #rpm包安装的/etc/nginx/conf.d/php-fpm.conf代理内容一致
            fastcgi_index  index.php;
            fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
            include        fastcgi.conf;
            #或者
            #root           html/menzhu;
            #fastcgi_pass代理   unix:/run/php-fpm/www.sock;
            #fastcgi_index  index.php;
            #fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
            #include        fastcgi_params;
            }
        }
    }
    ```
    若为多PHP-FPM节点，可通过`upstream`定义集群，再用`fastcgi_pass`指向集群名。
3.  不同安装包配置差异：
    - RPM包安装：默认已集成相关模块，配置文件路径固定（如`/etc/nginx`），可直接按上述配置生效。
    - 原版包安装：初始访问可能提示“文件未找到”，需调整`SCRIPT_FILENAME`路径配置，或复制模板配置文件修改，修改后执行验证与重启：
      ```bash
      nginx -t
      nginx -s reload
      ```
4.  测试验证：在`/usr/local/nginx/html/php_com`目录下创建`test.php`文件（内容为`<?php phpinfo(); ?>`），访问`http://www.php.com/test.php`，若正常显示PHP信息页面则配置生效。

#### 方案二：代理至后端真实服务器（Apache）处理
1.  前期准备：关闭本地PHP-FPM进程（若已启动），此时访问PHP页面会返回502 Bad Gateway错误（请求无法传递至有效解析进程）：
    ```bash
    # 停止PHP-FPM进程
    systemctl stop php-fpm
    ```
2.  代理配置：删除Nginx中PHP-FPM相关配置，在`location`块中通过`proxy_pass`将PHP动态请求转发至后端Apache服务器（需确保后端Apache已安装PHP环境）：
    ```nginx
    server {
        listen 80;
        server_name www.php.com;
        root /usr/local/nginx/html/php_com;
        index index.html index.php;

        # 匹配PHP动态请求，转发至后端Apache
        location ~ \.php$ {
            proxy_pass http://192.168.66.192;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```
3.  后端环境配置：
    ```bash
    # 1. 将PHP文件传输至后端Apache的网页根目录
    scp /usr/local/nginx/html/php_com/test.php root@192.168.66.192:/var/www/html/
    # 2. 后端Apache安装PHP环境（若未安装）
    yum install php -y
    # 3. 重启Apache服务
    systemctl restart httpd
    ```
4.  多节点扩展：为多台后端Apache服务器重复上述配置，即可实现PHP动态请求的负载均衡，减轻单服务器压力。

#### 问题排查
若访问PHP页面仍出现文件下载或报错，需排查以下要点：
1.  PHP-FPM是否正常启动（方案一）：`systemctl status php-fpm`。
2.  Nginx配置是否正确：检查`fastcgi_pass`/`proxy_pass`地址、`SCRIPT_FILENAME`路径是否有误，执行`nginx -t`验证语法。
3.  权限是否匹配：Nginx用户是否有权访问PHP文件，后端服务器是否有PHP解析权限。
4.  后端服务是否正常：方案二中的Apache是否启动、PHP模块是否加载成功。

## 三、Nginx配置文件差异（RPM包 vs 自定义安装包）
### （一）RPM包安装配置
1.  模块优势：默认已预装必要模块（视频中“USB相关组件”为口语化表述，实际为常用功能模块），无需手动编译安装。
2.  路径固定：配置文件默认存放于`/etc/nginx`目录，网页根目录默认在`/usr/share/nginx/html`，路径规范无需手动配置。
3.  默认配置：部分核心参数（如`root`网页根目录、`index`默认文件）已预设，等价于自定义配置的基础路由设置；默认包含两个错误页面（404、502），无需额外配置。

### （二）自定义安装包（原版包）配置
1.  灵活性高：需手动配置`root`、`fastcgi_param`、`proxy_pass`等参数，可根据业务需求灵活调整脚本路径、代理规则、错误页面数量（按需设置1个或多个）。
2.  验证要求：无默认预设配置，需手动编写配置文件后，通过`nginx -t`验证语法正确性，再执行`nginx -s reload`生效。
3.  模块可选：需在编译时指定所需模块，未指定的模块需后续重新编译添加，配置复杂度高于RPM包安装。

## 四、Tomcat相关内容（Java应用服务器）
### （一）Tomcat定位与特性
1.  服务定位：属于Java应用服务器，与Apache、Nginx（纯Web服务器）存在本质区别——仅负责解析Java相关动态请求（如JSP页面、Java Web项目），无法处理PHP、Python等其他语言的动态请求；可作为Apache的扩展组件，专门承接Java动态请求处理。
2.  环境依赖：必须依赖Java开发环境（JDK）运行，因Tomcat本身基于Java语言开发；JDK包含JRE（Java运行环境，内置JVM虚拟机）与开发函数库，类似C语言的GCC编译器，支持Java代码的编译与运行，无JDK则Tomcat无法启动。

### （二）JDK安装与配置
1.  安装步骤（以JDK 11为例）：
    ```bash
    # 1. 下载JDK 11压缩包（可从Oracle官网或OpenJDK镜像下载）
    # 2. 解压压缩包至指定目录
    tar -zxvf jdk-11.0.20_linux-x64_bin.tar.gz -C /usr/local/
    # 3. 重命名目录，方便后续配置
    mv /usr/local/jdk-11.0.20 /usr/local/JDK11
    ```
    无需执行`configure`、`make`等编译步骤，解压即完成安装。

2.  环境验证：
    ```bash
    # 1. 编写简单Java测试代码（HelloWorld.java）
    echo "public class HelloWorld {
        public static void main(String[] args) {
            System.out.println(\"Hello, JDK Environment!\");
        }
    }" > HelloWorld.java
    # 2. 编译Java文件，生成.class中间字节码文件
    javac HelloWorld.java
    # 3. 运行编译后的类文件，若正常输出则环境有效
    java HelloWorld
    ```

3.  环境变量配置：
    为避免每次使用Java命令都输入绝对路径，修改全局配置文件`/etc/profile`添加环境变量：
    ```bash
    # 编辑全局配置文件
    vi /etc/profile
    # 在文件末尾添加以下内容
    export JAVA_HOME=/usr/local/JDK11  # JDK安装目录
    export PATH=$PATH:$JAVA_HOME/bin  # 将JDK的bin目录添加到系统PATH
    # 保存退出后，重新加载配置文件使其生效
    source /etc/profile
    # 验证环境变量，查看JDK版本
    java -version
    javac -version
    ```

### （三）Tomcat安装与基础配置
1.  安装步骤（以Tomcat 9为例）：
    ```bash
    # 1. 下载Tomcat 9压缩包（从Apache Tomcat官网下载）
    # 2. 解压压缩包至/usr/local目录
    tar -zxvf apache-tomcat-9.0.85.tar.gz -C /usr/local/
    # 3. 重命名目录，方便后续操作
    mv /usr/local/apache-tomcat-9.0.85 /usr/local/tomcat9
    ```
    无需复杂编译流程，解压即完成安装。

2.  核心目录结构：
    - `conf`：配置文件目录，核心配置文件为`server.xml`（XML格式，包含端口、虚拟主机、连接器等核心配置）。
    - `webapps`：网页根目录，所有Java Web项目需部署在此目录；默认网页文件为`index.jsp`，存放于`webapps/ROOT`目录下。
    - `lib`：依赖库目录，存放Tomcat运行所需的Java动态依赖文件（后缀为`.jar`），类似Apache的`.so`模块文件。
    - `bin`：命令脚本目录，包含启动脚本`startup.sh`、关闭脚本`shutdown.sh`，也可通过`catalina.sh`脚本控制服务（`catalina.sh start`启动、`catalina.sh stop`关闭）。
    - `logs`：日志目录，存放Tomcat运行日志、访问日志等，便于问题排查。

3.  基础启动与停止：
    ```bash
    # 进入Tomcat的bin目录
    cd /usr/local/tomcat9/bin
    # 启动Tomcat服务（后台运行可添加&）
    ./startup.sh
    # 停止Tomcat服务
    ./shutdown.sh
    # 验证Tomcat是否启动（默认监听8080端口）
    netstat -tuln | grep 8080
    ```

### （四）Tomcat核心配置调整
#### 1. 端口修改
Tomcat默认监听3个端口，修改时编辑`conf/server.xml`文件：
1.  客户端访问端口：默认8080（HTTP端口），搜索`<Connector port="8080"`，将端口号改为目标端口（如80，需确保该端口未被占用）。
2.  服务关闭端口：默认8005，搜索`<Server port="8005"`，按需修改端口号。
3.  集成服务端口：默认8009（用于与Apache集成的AJP协议端口），搜索`<Connector port="8009"`，按需修改端口号。
4.  配置生效：修改后保存文件，执行`./shutdown.sh`停止Tomcat，再执行`./startup.sh`启动，通过`netstat -tuln | grep 目标端口`验证端口监听状态。

#### 2. 域名配置
1.  本地DNS映射：修改本地`hosts`文件（Windows：`C:\Windows\System32\drivers\etc\hosts`；Linux：`/etc/hosts`），添加“服务器IP 域名”映射，如`192.168.66.191 www.test.com`。
2.  Tomcat域名配置：编辑`conf/server.xml`文件，在`<Engine>`标签内的`<Host>`节点中，修改`name`属性为目标域名，示例：
    ```xml
    <Engine name="Catalina" defaultHost="www.test.com">
        <Host name="www.test.com"  appBase="webapps"
              unpackWARs="true" autoDeploy="true">
            <!-- 其他配置保持默认 -->
        </Host>
    </Engine>
    ```
3.  配置生效：重启Tomcat服务，访问`http://www.test.com`（若修改了端口则需拼接端口号），即可通过域名访问Tomcat默认页面。
4.  访问优先级：域名访问优先匹配对应`name`属性的`<Host>`节点；IP访问默认匹配第一个`<Host>`节点（若未额外配置，默认是`localhost`主机）。

### （五）Tomcat与Nginx的配合使用
#### 1. 核心协作逻辑
实现“动静分离”：Nginx负责处理静态资源请求（HTML、CSS、JS、图片等），将Java动态请求（JSP、Java Web项目）通过反向代理转发至Tomcat处理，充分发挥Nginx静态处理高效与Tomcat Java解析专业的优势。

#### 2. 代理配置步骤
1.  Nginx配置：编辑Nginx配置文件，添加`location`规则匹配Java动态请求，转发至Tomcat地址：
    ```nginx
    server {
        listen 80;
        server_name www.java.com;
        root /usr/local/nginx/html/java_com;
        index index.html index.jsp;

        # 处理静态资源请求（直接返回本地文件）
        location ~ \.(html|css|js|png|jpg)$ {
            expires 1d;  # 设置静态资源缓存有效期1天
        }

        # 处理Java动态请求，转发至Tomcat
        location ~ \.(jsp|do|action)$ {
            proxy_pass http://192.168.66.191:8080;  # Tomcat的IP与端口
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    ```
2.  配置生效：
    ```bash
    # 检查Nginx配置语法
    nginx -t
    # 热重启加载配置
    nginx -s reload
    ```
3.  注意事项：
    - Apache与Tomcat分工明确：Apache负责PHP动态请求，Tomcat负责Java动态请求，无法互相处理对方语言的动态请求。
    - 资源路径区分：访问静态资源时，Nginx直接从本地`root`目录返回；访问动态资源时，自动转发至Tomcat，需确保Tomcat已部署对应Java Web项目。

## 五、实验操作细节与注意事项
1.  配置修改必验证：每次修改Nginx、Tomcat配置文件后，必须先执行语法检查命令（Nginx：`nginx -t`；Tomcat无语法检查，需通过日志排查），无误后再执行热重启/重启，避免配置错误导致服务异常中断。
2.  路径参数需确认：涉及文件路径、IP地址、端口号、域名等配置时，需结合实际环境核对，避免因视频口语化表述（如“银色logo”“恩比克斯”）导致路径混淆或配置错误。
3.  多场景测试验证：功能配置完成后，需进行多场景测试——如拒绝IP访问需验证不同页面、不同请求方式；虚拟主机需验证不同域名、端口、IP；负载均衡需验证请求分发均匀性，确保功能生效范围符合预期。
4.  配置切换需注意：切换虚拟主机类型（如域名→IP/端口）、修改Tomcat端口/IP时，若热重启无效，需执行完整重启命令（Nginx：`nginx -s stop && nginx`；Tomcat：`./shutdown.sh && ./startup.sh`），确保新配置完全加载。
5.  权限问题需重视：Nginx与PHP-FPM、Tomcat的进程所有者需保持权限一致，避免因权限不足导致文件无法访问、请求无法转发等问题。

## 六、核心总结与后续安排
### （一）核心总结
1.  服务分工明确：Web服务器（Apache、Nginx）负责静态资源处理、请求转发与负载均衡；应用服务器（Tomcat）专注于特定语言（Java）的动态请求解析，需根据业务需求选择合适的服务组合。
2.  Nginx优势突出：相比Apache，Nginx在配置简洁性、高并发承载、静态资源处理效率、负载均衡灵活性上具有明显优势，更适合高流量、高并发场景。
3.  配置核心一致：各类服务的配置核心围绕“路径、端口、代理规则、虚拟主机”展开，掌握基础配置逻辑后，可灵活适配不同业务场景。
4.  安装包差异显著：RPM包安装便捷、配置预设，适合快速部署；自定义安装包灵活度高、可按需选模块，适合个性化需求场景。

### （二）后续安排
后续课程将串联Apache、Nginx、Tomcat、IPN等相关内容进行整体复习，梳理Web服务生态的协作逻辑，巩固配置实操与问题排查能力，帮助形成完整的Web服务知识体系。