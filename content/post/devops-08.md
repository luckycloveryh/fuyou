---
title: "Nexus 私服仓库部署与管理"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-devops-08/1200/600"
draft: false
tags: ["DevOps", "Obsidian"]
categories: ["6. DevOps"]
slug: "devops-08"
description: "从 Obsidian 导入的 DevOps 学习笔记"
---
# Nexus

制品库平台是DevOps工具链中的重要组成部分，用于存储、管理、版本控制和应用部署相关的制品，如代码、配置文件、文档、二进制文件等。制品库平台可以帮助开发团队实现制品的集中管理、版本控制、共享和分发，从而提高开发效率和部署效率。

## Nexus Repository 3 概述

Nexus Repository 3是Nexus公司的仓库管理平台，它是使用最为广泛的开源仓库管理平台，可以管理整个软件供应链中的组件、二进制文件和构建制品。

Nexus Repository 3 分为社区版和企业版，社区版可以免费且全面地管理二进制文件和制品，企业版具有更多的安全特性。Nexus Repository 3 支持的二进制文件仓库类型如下：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/01.png)

## [Nexus 安装 ](https://help.sonatype.com/en/installation-methods.html)

[下载安装包](https://help.sonatype.com/en/download-archives---repository-manager-3.html)

```Bash
wget https://download.sonatype.com/nexus/3/nexus-3.72.0-04-unix.tar.gz

tar xvf nexus-3.72.0-04-unix.tar.gz  -C /usr/local/
mkdir /data/sonatype-work  -p

```

[修改数据目录](https://help.sonatype.com/en/configuring-the-runtime-environment.html#configuring-the-data-directory) 

修改配置文件： `/usr/local/nexus-3.72.0-04/bin/nexus.vmoptions`

```Bash
-Dkaraf.data=/data/sonatype-work/nexus3
-Djava.io.tmpdir=/data/sonatype-work/nexus3/tmp
-XX:LogFile=/data/sonatype-work/nexus3/log/jvm.log
-Dkaraf.log=/data/sonatype-work/nexus3/log
```

启动应用

```Bash
/usr/local/nexus-3.72.0-04/bin/nexus  start 

[root@nexus nexus-3.72.0-04]# /usr/local/nexus-3.72.0-04/bin/nexus  status 
WARNING: ************************************************************
WARNING: Detected execution as "root" user.  This is NOT recommended!
WARNING: ************************************************************
nexus is running.

```

配置 systemd 服务 

```Bash
useradd nexus 
chown -R  nexus:nexus  /data/sonatype-work 

tee -a /etc/systemd/system/nexus.service <<'EOF'
[Unit]
Description=nexus service
After=network.target
  
[Service]
Type=forking
LimitNOFILE=65536
ExecStart=/usr/local/nexus/bin/nexus start
ExecStop=/usr/local/nexus/bin/nexus stop 
User=nexus
Restart=on-abort
TimeoutSec=600
  
[Install]
WantedBy=multi-user.target
EOF
```

启动 nexus

```Bash
sudo systemctl daemon-reload
sudo systemctl enable nexus.service
sudo systemctl start nexus.service
```

验证服务是否正常运行

```Bash
[root@nexus local]# tail -f /data/sonatype-work/nexus3/log/nexus.log 
2024-11-29 16:06:14,200+0800 INFO  [jetty-main-1]  *SYSTEM org.sonatype.nexus.repository.httpbridge.internal.ViewServlet - Initialized
2024-11-29 16:06:14,235+0800 INFO  [jetty-main-1]  *SYSTEM org.eclipse.jetty.server.handler.ContextHandler - Started o.e.j.w.WebAppContext@72b60b9a{Sonatype Nexus,/,null,AVAILABLE}
2024-11-29 16:06:14,285+0800 INFO  [jetty-main-1]  *SYSTEM org.eclipse.jetty.server.AbstractConnector - Started ServerConnector@ead4af0{HTTP/1.1, (http/1.1)}{0.0.0.0:8081}
2024-11-29 16:06:14,286+0800 INFO  [jetty-main-1]  *SYSTEM org.eclipse.jetty.server.Server - Started @52805ms
2024-11-29 16:06:14,286+0800 INFO  [jetty-main-1]  *SYSTEM org.sonatype.nexus.bootstrap.jetty.JettyServer - 
-------------------------------------------------

Started Sonatype Nexus OSS 3.72.0-04

-------------------------------------------------

```

访问 Nexus 

Nexus 默认监听 8081 端口，用户名：admin，默认密码位于  /data/sonatype-work/nexus3/admin.password

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/02.png)

登录后有一个配置向导，提示修改默认密码，默认可以启动匿名用户访问，这个系统主要是内部用户使用。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/03.png)

初始化成功后界面

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/04.png)

## 搭建 Maven 私服仓库 

私服就是在企业内部建立中央存储仓库。例如，在公司内部通过 Nexus Repository 3 创建一个代理仓库，将公网仓库中的Maven包代理到内网仓库中。这样就可以直接访问内网的私服下载、构建依赖包。内网的速度要比公网快，这会直接加快管道的构建速度。

代理仓库不会把公网仓库中的所有包下载到本地，而是按需缓存。例如，此时需要使用 abc 这个包，如果代理仓库中没有，则请求外部服务器下载这个包并进行缓存，当第二次访问时，即可直接访问代理仓库。

### 创建代理仓库 

进入Nexus Repository 3 的管理页面，单击 Create repository 按钮创建仓库。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/05.png)

创建仓库时选择 maven2(proxy) 类型，即代理仓库。可以自定义仓库名称，在Remote storage文本框中填写远程要代理的仓库地址。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/06.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/07.png)

### Maven 本地仓库 

本地仓库一般用于存储公司自己开发的包。以Maven为例，分为Release类型仓库（存放稳定版制品）和Snapshot类型仓库（存放开发版制品）两种。仓库的版本策略可以在创建仓库时选择

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/08.png)

Release 类型的仓库只能存放Release版本的包。

Snapshot类型的仓库只能存放只有开发中，会频繁更新的包。

Nexus默认 提供两个本地仓库 ：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/09.png)

### 调整仓库顺序 

修改 maven-public 仓库， 加入我们创建的代理仓库 maven-aliyun-proxy， 并调整仓库顺序。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-08/10.png)

### 修改 Maven 配置文件
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/HX0ewwtZIiTifHkRom8c2eHenVg)
- 导入日期：2026-06-22