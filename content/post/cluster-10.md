---
title: "Zabbix 6/7 LTS 监控平台部署"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-10/1200/675"
draft: false
tags: ["集群", "Obsidian"]
categories: ["5. 集群阶段"]
slug: "cluster-10"
description: "介绍《Zabbix 6/7 LTS 监控平台部署》，涵盖Zabbix Server 6&7.0 LTS 版本、环境准备和建议rocky的基础源也使用网络源等实践要点。"
---
## Zabbix Server 6&7.0 LTS 版本

### 一、环境准备

- 操作系统：Rocky Linux 9.4
- Zabbix版本：6.0 & 7.0 LTS
- 网络情况：能连接互联网
- 关闭SELinux和Firewalld防护

```shell
1. 关闭所有防护
$ systemctl disable --now firewalld
$ sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

2. 配置网络能连接互联网
$ vim /etc/NetworkManager/system-connections/ens160.nmconnection
[ipv4]
method=manual
address1=192.168.88.110/24,192.168.88.2
dns=114.114.114.114;8.8.8.8

$ nmcli c r
$ nmcli c up ens160

3. 配置repo仓库
# 建议rocky的基础源也使用网络源
$ dnf -y install lrzsz epel-release
$ vim /etc/yum.repos.d/epel.repo
[epel]
...
excludepkgs=zabbix*
# 必须在epel仓库中排除zabbix相关软件包，防止和后续zabbix官方仓库冲突
```

### 二、Zabbix Server节点配置

#### 1. 配置Zabbix官网源

```shell
装6下载6，装7下载7
$ rpm -Uvh https://repo.zabbix.com/zabbix/6.0/rhel/9/x86_64/zabbix-release-latest-6.0.el9.noarch.rpm
$ rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rocky/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
$ dnf makecache
```

#### 2. Server端安装Zabbix相关软件

```shell
$ dnf -y install zabbix-server-mysql zabbix-web-mysql zabbix-apache-conf zabbix-sql-scripts zabbix-selinux-policy zabbix-agent
# 安装zabbix相关软件，软件功能如下
# zabbix-server-mysql		# 基于MySQL或Mariadb数据库的zabbix-server端，用户收集，保存，展示监控数据
# zabbix-web-mysql			# 提供连接数据库的web页面
# zabbix-apache-conf		# 为apache提供配置文件加载识别zabbix的web页面
# zabbix-sql-scripts		# 提供zabbix的数据库文件，供管理员导入数据库系统
# zabbix-selinux-policy 	# SELinux相关规则
# zabbix-agent				# zabbix agent，数据采集端
```

#### 3. 安装Mariadb数据库

```shell
$ dnf -y install mariadb mariadb-server
# 安装数据库客户端和服务器端

$ systemctl enable --now mariadb
# 启动数据库服务，设置开机自启动

$ mysql
Mariadb> create database zabbix character set utf8mb4 collate utf8mb4_bin;
Mariadb> create user zabbix@localhost identified by '123456';
Mariadb> grant all privileges on zabbix.* to zabbix@localhost;
Mariadb> set global log_bin_trust_function_creators = 1;
# 创建支持zabbix数据库，设置全局支持中文，并授予新创建的zabbix用户所有权限
# set global log_bin_trust_function_creators = 1
# 该选项的作用：一会要将提前准备好的SQL文件导入到数据库中，但SQL文件中有部分SQL语句包含了一些特殊的函数，开启则是为了绕过安全性检测和权限限制，用完记得关上。
```

#### 4. 导入Zabbix数据库文件

```shell
$ zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 -uzabbix -p zabbix
# 因为用的是zabbix用户进行导入，所以要填写zabbix的密码：123456
gunzip server.sql.gz
mysql zabbix < server.sql
$ mysql
Mariadb> set global log_bin_trust_function_creators = 0;
# 上面说过了，用完记得关闭。

#详细错误查看日志文件
tail -n 100 /var/log/zabbix/zabbix_server.log

#当数据库导入不小心取消了，可以删除数据库，重新执行数据库操作
DROP DATABASE zabbix;
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
GRANT ALL PRIVILEGES ON zabbix.* TO zabbix@localhost;
SET GLOBAL log_bin_trust_function_creators = 1;
QUIT;
```

#### 5. 修改Zabbix配置文件

```shell
$ vim /etc/zabbix/zabbix_server.conf
DBHost=localhost
DBName=zabbix
DBUser=zabbix
DBPassword=123456
# 其实大部分参数都不用改，因为创建时就是按照配置里创的~
```

#### 6. 安装中文字体库

```shell
$ dnf -y install langpacks-zh_CN glibc-langpack-zh
# 由于安装操作系统时并没选择中文环境，所以只能后装了。
```

#### 7. 设置相关服务启动和开机自启

```shell
$ systemctl enable --now zabbix-server zabbix-agent httpd php-fpm
```

使用浏览器访问：http://ip/zabbix，测试登录，<font color='red'>默认：用户名：Admin ， 密码：zabbix</font>

#### 8. 中文乱码解决方案

```shell
$ cd /usr/share/fonts/dejavu-sans-fonts
$ mv DejaVuSans.ttf DejaVuSans.ttf.bak
$ mv msyh.ttc DejaVuSans.ttf 
# 需要先提前上传自己喜欢的字体文件
```

### 二、安装Zabbix Agent节点-Linux版

#### 1. 配置客户端软件仓库

```shell
$ rpm -Uvh https://repo.zabbix.com/zabbix/6.0/rhel/9/x86_64/zabbix-release-latest-6.0.el9.noarch.rpm
$ rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rocky/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
```

#### 2. 安装客户端软件

```shell
在不同的局域网之中，agent的被动模式的监控需要与server处于同一局域网段server=填写同一网段最好
$ dnf -y install zabbix-agent
```

#### 3. 修改zabbix agent配置文件

```shell
$ vim /etc/zabbix/zabbix_agentd.conf
server=zabbix server IP
ServerActive=zabbix server IP
```

#### 4. 启动zabbix agent服务

```shell
$ systemctl enable --now zabbix-agent
$ systemctl start zabbix-agent
```

#### 5. 主被动模式对比

```ini
-----被动模式（Passive Mode）-----
由 Zabbix Server 主动向 Agent 发起数据请求，Server 定期通过 zabbix_get 或内部轮询器（Poller）向 Agent 的 10050 端口发送请求（如 agent.ping），Agent 收到请求后，执行对应的监控项（Item）命令并返回数据，Server 接收数据并存储到数据库中。

Agent 配置（zabbix_agentd.conf）：
Server=192.168.1.100       # 允许连接的 Server IP
ListenPort=10050           # 默认监听端口

网络要求：Agent 需允许入站连接（Server 能访问 Agent 的 10050 端口），防火墙放行。
实 时 性：依赖 Server 的轮询间隔，可能产生延迟。
资源消耗：Server 需维护大量 TCP 连接，高并发时负载较高。

适用场景
1. Agent 所在主机允许开放入站端口（如内部网络）。
2. 监控项数量较少或 Server 资源充足。
3. 需要严格由 Server 控制数据采集节奏的场景。

-----主动模式（Active Mode）-----
由 Zabbix Agent 主动向 Server 发送数据，Agent 定期从 Server 的 10051 端口拉取 监控项列表（需配置 ServerActive），Agent 根据列表中的监控项定义，本地执行命令收集数据，Agent 将数据批量发送到 Server 的 10051 端口。

Agent 配置（zabbix_agentd.conf）：
ServerActive=192.168.1.100  # Server 的 IP 或域名
Hostname=Host001            # 必须与 Server 中注册的主机名一致，即网页上添加的被监控名称。

网络要求：Agent 需能访问 Server 的 10051 端口（仅需 出站连接）。
实 时 性：Agent 自行控制数据采集和发送频率，延迟更低。
资源消耗：Server 无需维护大量连接，扩展性更好，适合大规模监控。

适用场景
1. Agent 位于防火墙后，无法开放入站端口（如公有云实例）。
2. 监控项数量庞大或 Server 需要降低负载。
3. 需要快速响应的监控场景（如高频采集）。

注意事项：主动模式时，会出现监控状态为未知(灰色)，主要原因是主动模式的问题，可以使用修改主动模式中的一个监控项方式为被动来解决此问题。
```



### 三、安装Zabbix Agent节点-windows版

访问zabbix官网，下载windows版客户端软件

软件地址：

```
https://cdn.zabbix.com/zabbix/binaries/stable/6.0/6.0.41/zabbix_agent-6.0.41-windows-amd64-openssl.msi
https://cdn.zabbix.com/zabbix/binaries/stable/7.0/7.0.10/zabbix_agent-7.0.10-windows-amd64-openssl.msi
```

#### 1. Agent 和 Agent2 版本对比

```
Zabbix Agent(传统客户端)

- 功能特性：
  - 仅支持预定义的监控项(通过 UserParameter 自定义脚本),扩展性有限。
  - 单线程处理请求,高负载时可能成为瓶颈(如同时处理 1000+ 监控项)。
  - 仅支持 Zabbix 原生协议(基于 TCP 的 JSON 或二进制协议)。  
  
- 场景特点:
  - 资源受限环境:如嵌入式设备、服务器(内存和 CPU 有限)。
  - 基础监控需求:仅需采集 CPU、内存、磁盘、网络等基础指标。
  - 稳定性优先:对内存占用敏感,且无需复杂功能扩展。
  - 兼容旧版本:支持 Zabbix 7.0 或更早版本。

- 典型用例:
  - 监控物理服务器或虚拟机的硬件资源。
  - 部署在 IoT 设备或边缘节点(如树莓派)。

Zabbix Agent2(新一代客户端)

- 功能特性：
  - 提供插件架构,内置插件(如 `docker`, `net.tcp.service`),并允许开发自定义插件。
  - 利用 Go 协程实现并发处理,适合高频采集(如每 10 秒采集一次)和大规模监控项。
  - 支持多种协议:  
  	- HTTP API:直接调用 Prometheus、JMX 或其他服务的 API。
  	- 被动模式优化:批量发送数据,减少网络开销。  
  
- 场景特点:
  - 复杂监控需求:需要采集容器(Docker/Kubernetes)、云服务(AWS/Azure)、数据库(MySQL/PostgreSQL)等高级指标。
  - 高并发环境:需同时处理数百个监控项或高频率数据采集(如秒级监控)。
  - 扩展性要求:通过插件自定义监控逻辑(如调用第三方 API)。
  - 未来兼容性:需利用 Zabbix 最新功能(如 Prometheus 指标集成)。

- 典型用例:
  - 监控 Kubernetes 集群中的 Pod 和容器状态。
  - 集成云原生服务的自定义指标(如 AWS RDS 性能)。
  - 通过插件采集工业设备的专有协议数据。
```

### 四、安装Zabbbix Proxy代理节点

#### 1. 配置软件仓库并安装相关软件

```shell
1. 同样需要epel仓库支持和zabbix官方仓库支持
$ dnf -y install epel-release
$ vim /etc/yum.repos.d/epel.repo
[epel]
...
excludepkgs=zabbix*

$ rpm -Uvh https://repo.zabbix.com/zabbix/6.0/rhel/9/x86_64/zabbix-release-latest-6.0.el9.noarch.rpm
$ rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rocky/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
$ dnf makecache

2. 安装zabbix proxy和mariadb-server
$ dnf -y install mariadb mariadb-server zabbix-proxy-mysql zabbix-sql-scripts zabbix-selinux-policy
# 代理服务器的数据库可以暂存agent采集的数据，替server节点分摊并发压力
```

#### 2. 配置Mariadb数据库

```shell
$ systemctl enable --now mariadb

$ mysql
Mariadb> create database zabbix_proxy character set utf8mb4 collate utf8mb4_bin;
Mariadb> create user zabbix@localhost identified by '123456';
Mariadb> grant all privileges on zabbix_proxy.* to zabbix@localhost;
Mariadb> set global log_bin_trust_function_creators = 1;

$ cat /usr/share/zabbix-sql-scripts/mysql/proxy.sql | mysql --default-character-set=utf8mb4 -uzabbix -p zabbix_proxy
# 将zabbix proxy数据库文件导入到mariadb数据库中

$ mysql
Mariadb> set global log_bin_trust_function_creators = 0;
```

#### 3. 修改Zabbix Proxy配置文件

```shell
$ vim /etc/zabbix/zabbix_proxy.conf
Server=192.168.88.110
ServerPort=10051
Hostname=Zabbix proxy
ListenPort=10051
DBHost=localhost
DBName=zabbix_proxy
DBUser=zabbix
DBPassword=123456
DBPort=3306
# 注意：配置文件中Hostname的名称非常重要，确定好之后不要随便修改

$ systemctl enable --now zabbix-proxy
```

#### 4. 使用Zabbix Proxy监控新的Agent

```shell
# 前提是被监控的主机已经安装好zabbix agent工具
$ vim /etc/zabbix/zabbix_agentd.conf
server=zabbix proxy IP
ServerActive=zabbix proxy IP

$ systemctl enable --now zabbix-agent
# 要求zabbix agent将数据发往zabbix proxy进行保存处理
```

web管理界面添加代理，并设置zabbix agent指向zabbix proxy

<font color='red'>注意：每次操作完之后都要点击更新才会生效，最后重启zabbix server端，变更数据源为zabbix proxy</font>

### 五、报警设置

#### 1. web端声音报警

1. 设置web前端声音报警

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/01.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/02.png)

#### 2. 发送邮件报警

1. 选择Email作为报警媒介

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/03.png)

2. 设置Email报警媒介相关参数

   1. 获取邮件发送端的第三方登陆授权密码

      ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/04.png)

   2. 将参数填写到Email报警媒介中

      ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/05.png)

   3. 配置完成后测试是否能正常发送邮件

      ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/06.png)

      ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/07.png)

      ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/08.png)

3. 将报警媒介添加到指定监控项的动作中

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/09.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/10.png)

   添加动作时，注意选用触发器示警度，然后选择大于等于某警告级别以上即可。

   

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/11.png)

   设置符合触发机制的操作行为：发现问题时发送的信息

   ```shell
   Problem: {EVENT.NAME}
   
   Problem started at {EVENT.TIME} on {EVENT.DATE}
   Problem name: {EVENT.NAME}
   Host: {HOST.NAME}
   Severity: {EVENT.SEVERITY}
   Operational data: {EVENT.OPDATA}
   Original problem ID: {EVENT.ID}
   {TRIGGER.URL}
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/12.png)

   设置符合触发机制的操作行为：问题恢复时发送的信息

   ```shell
   Resolved in {EVENT.DURATION}: {EVENT.NAME}
   
   Problem has been resolved at {EVENT.RECOVERY.TIME} on {EVENT.RECOVERY.DATE}
   Problem name: {EVENT.NAME}
   Problem duration: {EVENT.DURATION}
   Host: {HOST.NAME}
   Severity: {EVENT.SEVERITY}
   Original problem ID: {EVENT.ID}
   {TRIGGER.URL}
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/13.png)

4. 配置用户参数，设置收件人信息

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/14.png)

5. 制造报警，检查报警是否正常触发动作，邮件是否发送

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/15.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/16.png)

#### 3. 发送钉钉报警

1. 登陆钉钉在群里创建机器人生成api接口地址

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/17.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/18.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/19.png)

2. 编写钉钉信息发送脚本，设置钉钉报警媒介

   ```shell
   $ cd /usr/lib/zabbix/alertscripts
   $ vim dingding.sh
   #!/bin/bash
   to=$1
   subject=$2
   text=$3
   curl 'https://oapi.dingtalk.com/robot/send?access_token=3581fa0977a8415fccfb9b27df3924cb31f059a67e08e8a61c9bf222cf7691b0' \
   -H 'Content-Type: application/json' \
   -d '
   {"msgtype": "text",
   "text": {
   "content": "'"$text"'"
   },
   "at":{
   "atMobiles": [ "'"$to"'" ],
   "isAtAll": false
   }
   }'
   
   $ chmod +x dingding.sh
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/20.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/21.png)

   ```shell
   三个参数
   {ALERT.SENDTO}
   {ALERT.SUBJECT}
   {ALERT.MESSAGE}
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/22.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/23.png)

3. 设置动作条件触发后的行为：重新添加一个专门发送给钉钉的警告（问题警告、故障恢复）

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/24.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/25.png)

4. 显示报警信息

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/26.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/27.png)

### 六、高级功能

#### 1. 自动发现

自动发现主要应对多服务器监控需求，但是有前提条件，需要在每个被监控主机提前安装好zabbix agent才能实现。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/28.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/29.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/30.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/31.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/32.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/33.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/34.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/35.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/36.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/37.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/38.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/39.png)

添加一台新的主机，安装zabbix agent程序，修改配置文件并启动，等待被发现即自动添加即可。

#### 2. 创建自定义监控模板-实现nginx流量监控

> 实验前提：已实现对Linux主机的基础监控，Nginx流量监控会以新监控模板的方式加入到现有主机中。

1. 在被监控主机安装部署Nginx服务，并开启状态监控模块

   ```shell
   $ yum -y install gcc pcre-devel zlib-devel
   $ wget http://nginx.org/download/nginx-1.22.1.tar.gz
   $ tar -xf nginx-1.22.1.tar.gz
   $ cd nginx-1.22.1/
   $ ./configure --prefix=/usr/local/nginx --with-http_stub_status_module && make && make install
   #完成Nginx的安装及统计模块的安装
   
   $ vim /usr/local/nginx/conf/nginx.conf
   server {
   	... ...
   	location /tongji {
   		stub_status on;
   	}
   }
   #修改配置文件开启统计模块
   
   $ ln -s /usr/local/nginx/sbin/* /usr/local/sbin/
   $ nginx
   #启动nginx，并通过浏览器测试统计模块是否生效：http://ip/tongji
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/40.png)

2. 在zabbix agent中添加Nginx数据采集脚本实现流量数据收集，并添加到自定义监控中

   ```shell
   $ vim /etc/zabbix/zabbix_agentd.d/check_nginx.sh
   #!/bin/bash	 
   HOST="127.0.0.1"
   PORT="80" 
   # 检测 nginx 进程是否存在
   function ping {
   	/sbin/pidof nginx | wc -l 
   }
   # 检测 nginx 性能
   function active {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| grep 'Active' | awk '{print $NF}'
   }	
   function reading {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| grep 'Reading' | awk '{print $2}'
   }
   function writing {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| grep 'Writing' | awk '{print $4}'
   }
   function waiting {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| grep 'Waiting' | awk '{print $6}'
   }
   function accepts {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| awk NR==3 | awk '{print $1}'
   }
   function handled {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| awk NR==3 | awk '{print $2}'
   }
   function requests {
   	/usr/bin/curl "http://$HOST:$PORT/tongji/" 2>/dev/null| awk NR==3 | awk '{print $3}'
   }
   # 执行function
   $1
   #-------------------------------END------------------------------------------------
   
   $ cd /etc/zabbix/zabbix_agentd.d/
   $ chmod +x check_nginx.sh
   $ ./check_nginx.sh ping
   $ ./check_nginx.sh requests
   #编写脚本，设置执行权限，测试关键词数据过滤是否有效
   
   $ vim /etc/zabbix/zabbix_agentd.conf
   UserParameter=nginx.status[*],/etc/zabbix/zabbix_agentd.d/check_nginx.sh $1
   $ systemctl restart zabbix-agent
   #将设置好的脚本添加到zabbix agent配置文件中，设置为自定义监控
   ```

3. 在zabbix server端安装专门的数据收集工具，将zabbix agent上收集的nginx流量数据拉取到本地

   ```shell
   $ yum -y install zabbix-get
   $ zabbix_get -s zabbix-agent-IP -k 'nginx.status[ping]'
   $ zabbix_get -s zabbix-agent-IP -k 'nginx.status[requests]'
   #使用zabbix server端测试能否连接到zabbix agent端设置的自定义监控，并正常获取数据
   ```

4. 在zabbix server端的web管理界面中添加Nginx数据采集模板，完成自动数据采集（应用集、监控项、触发器、图形）（详见以下截图）

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/41.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/42.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/43.png)

   

   选中自己添加的 nginx 模板，选择上方的应用集按钮，创建一个叫 nginx 的应用集（详见以下截图）

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/44.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/45.png)

   选择上方的监控项，点击创建监控项，名称：nginx ping 和 nginx requests  分两次完成创建（详见以下截图）

   ```
   名称：nginx ping
   键值：nginx.status[ping]
   应用集：nginx
   
   名称：nginx requests
   键值：nginx.status[requests]
   应用集：nginx
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/46.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/47.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/48.png)

   选择上方的触发器，然后点击创建触发器（详见以下截图）

   ```shell
   名称：nginx is down
   表达式：添加自己定义的ping的监控项[ping]
   #还可以仿照继续添加requests的触发器
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/49.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/50.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/51.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/52.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/53.png)

   选中上方的图形，点击创建图形（详见以下截图）

   ```shell
   名称：nginx requests
   监控项：选择自己已经创建好了的监控项[requests]
   ```

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/54.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/55.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/56.png)

5. 最终将自己定义的监控项添加到已监控的主机中即可

   在配置中找到已经实现监控的主机，添加自定义的nginx监控模板即可（详见以下截图）

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/57.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/58.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/59.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/60.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/61.png)

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/62.png)

### 七、mysql数据库配置

1. Install Zabbix agent and MySQL client. If necessary, add the path to the 'mysql' and 'mysqladmin' utilities to the global environment variable PATH.

**作用**：  
安装 Zabbix Agent 用于数据采集，安装 MySQL 客户端工具（mysql、mysqladmin）用于执行监控命令。如果命令不在 PATH 中，Agent 无法调用它们。

**操作**：  

```bash
# 安装 Zabbix Agent（假设已配置官方仓库）
dnf -y install zabbix-agent

# 安装 MySQL/MariaDB 客户端
dnf -y install mariadb mariadb-server   # 或 mariadb

# 验证命令是否存在
which mysql
which mysqladmin

# 如果命令不在 PATH 中（极少见），添加到全局 PATH
echo 'export PATH=$PATH:/usr/local/mysql/bin' >> /etc/profile
source /etc/profile
```

2. Copy the 'template_db_mysql.conf' file with user parameters into folder with Zabbix agent configuration (/etc/zabbix/zabbix_agentd.d/ by default). Don't forget to restart Zabbix agent.

**作用**：  
把官方模板提供的 UserParameter 定义文件复制到 Agent 配置目录，让 Agent 知道如何采集 MySQL 的各种指标（如连接数、查询率、复制状态等）。

**操作**：  

```bash
# 复制文件（假设文件已下载到当前目录）
cp -a /usr/share/doc/zabbix-agent/userparameter_mysql.conf /etc/zabbix/zabbix_agentd.d/

# 设置正确权限（重要！）
chown zabbix:zabbix /etc/zabbix/zabbix_agentd.d/userparameter_mysql.conf
chmod 644 /etc/zabbix/zabbix_agentd.d/userparameter_mysql.conf
# 重启 Agent 使配置生效
systemctl restart zabbix-agent
```

3. Create the MySQL user that will be used for monitoring ('<password>' at your discretion). For example:  

CREATE USER 'zbx_monitor'@'%' IDENTIFIED BY '<password>';  
GRANT REPLICATION CLIENT,PROCESS,SHOW DATABASES,SHOW VIEW ON *.* TO 'zbx_monitor'@'%';  
（MariaDB 10.5.8+ 额外加 SLAVE MONITOR）

**作用**：  
创建一个专用、低权限的 MySQL 用户供 Zabbix Agent 登录采集数据，不能用 root 用户（安全风险高）。这些权限是最小必要权限，用于执行 SHOW STATUS、SHOW PROCESSLIST、SHOW SLAVE STATUS 等命令。

**操作**：  
登录 MySQL/MariaDB 执行以下 SQL（把 <password> 替换成你自己的强密码）：
```sql
CREATE USER 'zbx_monitor'@'%' IDENTIFIED BY '123456';

GRANT REPLICATION CLIENT, PROCESS, SHOW DATABASES, SHOW VIEW ON *.* TO 'zbx_monitor'@'%';

-- 如果是 MariaDB 10.5.8+ 或 Enterprise 版，额外执行：
GRANT SLAVE MONITOR ON *.* TO 'zbx_monitor'@'%';

FLUSH PRIVILEGES;
```

4. Create '.my.cnf' configuration file in the home directory of Zabbix agent for Linux distributions (/var/lib/zabbix by default) or 'my.cnf' in c:\ for Windows. For example:  

[client]  
protocol=tcp  
user='zbx_monitor'  
password='<password>'

**作用**：  
在 Agent 的家目录下创建一个配置文件，存放监控用户的用户名和密码。Agent 执行 mysql 命令时会自动读取这个文件登录，避免在脚本或命令行明文写密码，提高安全性。

**操作**（Linux 系统）：

```bash
# 切换到 zabbix 用户创建文件
zabbix mkdir -p /var/lib/zabbix
zabbix touch /var/lib/zabbix/.my.cnf
chmod 600 /var/lib/zabbix/.my.cnf   # 只有 zabbix 可读
chown -R zabbix:zabbix /var/lib/zabbix/
# 写入内容（替换密码）
cat > /var/lib/zabbix/.my.cnf <<EOF
[client]
protocol=tcp
user=zbx_monitor
password=123456
EOF

systemctl restart zabbix-agent.service 
systemctl restart zabbix-server.service
```

**SELinux 系统额外处理**（如果启用 SELinux）：
```bash
chcon -t zabbix_var_lib_t /var/lib/zabbix/.my.cnf
```

这些就是每一步的**作用**和**具体操作**，完整复制到笔记里即可。配置完后，在 Zabbix 界面链接这个模板到 MySQL 主机，等待数据采集。如果遇到权限错误或数据不采集，再告诉我具体报错，我帮你继续排查。

### 八、模版创建

需要提前配置好虚拟机的zabbix-agent的代理设置，ip指向代理或者主服务

```bash
在nginx中添加location块方便统计
location /nginx_status {
        stub_status on;
        access_log off;
        }

1.在子配置文件/etc/zabbix/zabbix_agentd.d中添加一下语句
vim /etc/zabbix/zabbix_agentd.d/nginx_status.conf 
UserParameter=nginx.status[*],/etc/zabbix/zabbix_agentd.d/scripts/nginx_status.sh $1

2.在子配置文件中创建目录，在其中创建脚本文件
mkdir scripts
cd scripts
vim nginx_status.sh
chmod +x nginx_status.sh
--------------------------------------------------------
以下是考试题目脚本
创建自定义监控模板用来监控 nginx 服务， 模板名称： Nginx Status。 （ 5 分）
监控项：
a. nginx 运行状态
b. nginx 访问量统计
触发器：
a. nginx 未运行时， 报警级别标记为： 严重
b. nginx 访问量大于 1000 时， 报警级别标记为： 警告
图形：
a. 为 nginx 的访问量绘制图形
--------------------------------------------------------
#!/bin/bash
# -----------------------------------------------------------
# 脚本名称: nginx_monitor.sh
# 功能: 用于 Zabbix 监控 Nginx 状态和访问量
# -----------------------------------------------------------

NGINX_HOST="127.0.0.1"
NGINX_PORT="80" # 注意：题目中Server-2如果改了端口需在此调整，通常监控本地用80即可，或者根据实际情况
NGINX_STATUS_URL="http://${NGINX_HOST}:${NGINX_PORT}/nginx_status"

# 接收参数
METRIC="$1"

case $METRIC in
    # 1. 对应题目 3.a -> Nginx 运行状态
    # 逻辑：检查 nginx 进程数，有进程返回 1，无进程返回 0
    run_status)
        /usr/sbin/pidof nginx | wc -l
        ;;

    # 2. 对应题目 3.b -> Nginx 访问量统计
    # 逻辑：获取 Active connections (当前活动连接数/访问量)
    # 注意：题目说"访问量大于1000"，通常指当前并发连接数(Active connections)
    active_connections)
        /usr/bin/curl -s "${NGINX_STATUS_URL}" | grep 'Active' | awk '{print $3}'
        ;;
    
    # 如果需要累计总请求数 (根据题目语境，"访问量"也有可能指 total requests，备用)
    total_requests)
        /usr/bin/curl -s "${NGINX_STATUS_URL}" | awk '/server accepts handled requests/ {getline; print $3}'
        ;;

    *)
        echo "Usage: $0 {run_status|active_connections}"
        exit 1
        ;;
esac




--------------------------------------------------------
以下是上课脚本
--------------------------------------------------------
#!/bin/bash
# Nginx Status Monitoring Script for Zabbix

HOST="127.0.0.1"
PORT="80"
STATUS_URL="http://$HOST:$PORT/nginx_status"

# 检查参数
if [ -z "$1" ]; then
    echo "Usage: $0 {ping|active|reading|writing|waiting|accepts|handled|requests}"
    exit 1
fi

# 处理存活检测 (修复您之前的 ping 报错)
if [ "$1" == "ping" ]; then
    /usr/bin/curl -s --connect-timeout 2 "$STATUS_URL" > /dev/null
    if [ $? -eq 0 ]; then
        echo 1
    else
        echo 0
    fi
    exit 0
fi

# 获取 Nginx 状态原始数据
STATUS_DATA=$(/usr/bin/curl -s "$STATUS_URL")

# 如果抓取不到数据则直接退出
if [ -z "$STATUS_DATA" ]; then
    echo 0
    exit 1
fi

# 根据参数解析对应指标
case $1 in
    active)
        echo "$STATUS_DATA" | grep 'Active' | awk '{print $NF}'
        ;;
    reading)
        echo "$STATUS_DATA" | grep 'Reading' | awk '{print $2}'
        ;;
    writing)
        echo "$STATUS_DATA" | grep 'Writing' | awk '{print $4}'
        ;;
    waiting)
        echo "$STATUS_DATA" | grep 'Waiting' | awk '{print $6}'
        ;;
    accepts)
        echo "$STATUS_DATA" | awk 'NR==3 {print $1}'
        ;;
    handled)
        echo "$STATUS_DATA" | awk 'NR==3 {print $2}'
        ;;
    requests)
        echo "$STATUS_DATA" | awk 'NR==3 {print $3}'
        ;;
    *)
        echo "Error: Invalid parameter."
        exit 1
        ;;
esac
----------------------------------------------------
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-10/63.png)