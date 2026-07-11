---
title: "Docker 镜像仓库使用"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["7. Docker"]
slug: "docker-11"
description: "介绍《Docker 镜像仓库使用》，涵盖镜像仓库、Docker Hub 阿里云 腾讯云和注册等实践要点。"
---
# 四. 镜像仓库

## Docker Hub   阿里云   腾讯云 

### 注册

官网： https://hub.docker.com/

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/01.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/02.png)

### 登录 

```Bash
[root@docker ~]# docker login --help 

Usage:  docker login [OPTIONS] [SERVER]

Log in to a Docker registry.
If no server is specified, the default is defined by the daemon.

Options:
  -p, --password string   Password
      --password-stdin    Take the password from stdin
  -u, --username string   Username
```

```Bash
[root@docker ~]# docker login
Login with your Docker ID to push and pull images from Docker Hub. If you don't have a Docker ID, head over to https://hub.docker.com to create one.
Username: ronganxuan@gmail.com
Password: 
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded

```

默认登录信息保存在` /root/.docker/config.json `

```Bash
[root@docker ~]# cat /root/.docker/config.json 
{
        "auths": {
                "https://index.docker.io/v1/": {
                        "auth": "cm9uZ2FueHUyFpS0VESVNo"
                }
        }
}
```

### 搜索镜像 

```Bash
[root@docker ~]# docker search --help 

Usage:  docker search [OPTIONS] TERM

Search the Docker Hub for images

Options:
  -f, --filter filter   Filter output based on conditions provided
      --format string   Pretty-print search using a Go template
      --limit int       Max number of search results (default 25)
      --no-trunc        Don't truncate output

```

```Bash
[root@docker ~]# docker search nginx 
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/03.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/04.png)

### 拉取镜像 

```Bash
[root@docker ~]# docker pull --help 

Usage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]

Pull an image or a repository from a registry

Options:
  -a, --all-tags                Download all tagged images in the repository
      --disable-content-trust   Skip image verification (default true)
      --platform string         Set platform if server is multi-platform capable
  -q, --quiet                   Suppress verbose output

```

拉取 nginx 镜像 

```Bash
[root@docker ~]# docker pull nginx
Using default tag: latest
latest: Pulling from library/nginx
Digest: sha256:32da30332506740a2f7c34d5dc70467b7f14ec67d912703568daff790ab3f755
Status: Image is up to date for nginx:latest
docker.io/library/nginx:latest

```

指定 tag 拉取

```Bash
docker pull nginx:1.22.1
```

### 推送镜像 

```Bash
[root@docker ~]# docker push --help 

Usage:  docker push [OPTIONS] NAME[:TAG]

Push an image or a repository to a registry

Options:
  -a, --all-tags                Push all tagged images in the repository
      --disable-content-trust   Skip image signing (default true)
  -q, --quiet                   Suppress verbose output

```

推送镜像 到个人账号下

```Bash
[root@docker ~]# docker tag nginx:1.22.1 ronganxuan/nginx:1.22.1
[root@docker ~]# docker push ronganxuan/nginx:1.22.1
The push refers to repository [docker.io/ronganxuan/nginx]
9543dec06aa8: Mounted from library/nginx 
ccf4f419ba49: Mounted from library/nginx 
21f8452ebfb1: Mounted from library/nginx 
25bbf4633bb3: Mounted from library/nginx 
a4f34e6fb432: Mounted from library/nginx 
3af14c9a24c9: Mounted from library/nginx 
1.22.1: digest: sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b size: 1570

```

## Docker Registry  官方提供 

[`docker-registry`](https://docs.docker.com/retired/#registry-now-cncf-distribution) 是官方提供的工具，可以用于构建私有的镜像仓库。本节课是基于 [`docker-registry`](https://github.com/docker/distribution) v2.x 版本。

[Registry ](https://distribution.github.io/distribution/) 已经捐献给 CNCF，后期由社区维护。

### 安装运行 docker-registry 

```Bash
docker run -d -p 5000:5000 --name registry registry:2
```

### 上传、下载镜像 

```Bash
[root@docker ~]# docker tag nginx:1.22.1 localhost:5000/nginx:1.22.1 
[root@docker ~]# 
[root@docker ~]# docker push localhost:5000/nginx:1.22.1
The push refers to repository [localhost:5000/nginx]
9543dec06aa8: Pushed 
ccf4f419ba49: Pushed 
21f8452ebfb1: Pushed 
25bbf4633bb3: Pushed 
a4f34e6fb432: Pushed 
3af14c9a24c9: Pushed 
1.22.1: digest: sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b size: 1570

```

### 查看镜像列表

```Bash
[root@docker ~]# curl localhost:5000/v2/_catalog
{"repositories":["nginx"]}

```

### 配置非 https 仓库地址 

如果你不想使用 `127.0.0.1:5000` 作为仓库地址，比如想让本网段的其他主机也能把镜像推送到私有仓库。你就得把例如 `192.168.199.100:5000` 这样的内网地址作为私有仓库地址，这时你会发现无法成功推送镜像。

这是因为 Docker 默认不允许非 `HTTPS` 方式推送镜像。我们可以通过 Docker 的配置选项来取消这个限制，或者查看下一节配置能够通过 `HTTPS` 访问的私有仓库。

```Bash
[root@docker ~]# docker push 172.17.0.93:5000/nginx:1.22.1
The push refers to repository [172.17.0.93:5000/nginx]
Get "https://172.17.0.93:5000/v2/": http: server gave HTTP response to HTTPS client

```

修改 docker 配置文件`  /etc/docker/daemon.json `

```YAML
"insecure-registries": ["172.17.0.93:5000"]  # http 
```

官网： [Docker Registry](https://docs.docker.com/registry/)

## Harbor

官网： https://goharbor.io/

### 部署 harbor 

安装前准备：

硬件

<sheet sheet-id="sJ3C8H" token="M3qmsXFSRhFvLutAUHacx5ROntd"></sheet>

软件

<sheet sheet-id="fesNii" token="M3qmsXFSRhFvLutAUHacx5ROntd"></sheet>

检查版本

```YAML
[root@docker harbor]# docker version 
Client: Docker Engine - Community
 Version:           20.10.24
 API version:       1.41
 Go version:        go1.19.7

[root@docker harbor]# docker compose version 
Docker Compose version v2.21.0
```

下载安装包

下载地址：https://github.com/goharbor/harbor/tags

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/05.png)

我们使用 `离线安装` 的方式来部署： 

下载、解压 离线安装包 

```Dockerfile
# 下载安装包
[root@docker ~]# https://github.com/goharbor/harbor/releases/download/v2.12.2/harbor-offline-installer-v2.12.2.tgz
# 解压 
[root@docker ~]# tar xvf harbor-offline-installer-v2.12.2.tgz  -C /usr/local/
harbor/harbor.v2.12.2.tar.gz  # 离线镜像 
harbor/prepare                # 重新生成配置文件脚本 
harbor/LICENSE
harbor/install.sh            # 安装脚本  
harbor/common.sh             # 通用函数脚本 
harbor/harbor.yml.tmpl       # 默认配置文件 

# 解压后的文件列表
[root@docker harbor]# cd /usr/local/harbor/
[root@docker harbor]# ll
total 636500
-rw-r--r-- 1 root root      3646 Jan 16 22:10 common.sh
-rw-r--r-- 1 root root 651727378 Jan 16 22:11 harbor.v2.12.2.tar.gz
-rw-r--r-- 1 root root     14288 Jan 16 22:10 harbor.yml.tmpl
-rwxr-xr-x 1 root root      1975 Jan 16 22:10 install.sh
-rw-r--r-- 1 root root     11347 Jan 16 22:10 LICENSE
-rwxr-xr-x 1 root root      2211 Jan 16 22:10 prepare
```

压缩文件 `harbor.v2.12.2.tar.gz `存放的是 harbor 需要的离线镜像，在线安装包只是少这个压缩包。

**修改配置文件**

我们先配置一个没有 ssl 证书的仓库，修改了三处配置

```YAML
# 1. 镜像仓库的访问地址，可以使用域名 或 IP 地址 
hostname: reg.xxhf.cc 

# http related config
http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 80

# 2. 注释 https 的配置
# https related config
#https:
  # https port for harbor, default is 443
  #  port: 443
  # The path of cert and key files for nginx
  #  certificate: /your/certificate/path
  # private_key: /your/private/key/path

# 3. 修改 镜像存储位置，生产环境要挂载一块较大的磁盘
# The default data volume
data_volume: /data/harbor-reg
```

```YAML
[root@docker harbor]# ./install.sh  --help 

Note: Please set hostname and other necessary attributes in harbor.yml first. DO NOT use localhost or 127.0.0.1 for hostname, because Harbor needs to be accessed by external clients.
Please set --with-notary if needs enable Notary in Harbor, and set ui_url_protocol/ssl_cert/ssl_cert_key in harbor.yml bacause notary must run under https. 
Please set --with-trivy if needs enable Trivy in Harbor.
Please do NOT set --with-chartmuseum, as chartmusuem has been deprecated and removed.

# 安装
[root@docker harbor]# ./install.sh

# 查看运行的容器
[root@docker harbor]# docker compose ps

```

### 登录UI，创建项目

默认 用户名: admin 密码：Harbor12345

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/06.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/07.png)

默认会提供一个 library 的公开项目

### 上传镜像 

在工作中一般是按环境来创建项目，我们创建一个开发环境的项目 `dev-xxhf` 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/08.png)

我们上传一个镜像到这个项目里。

如果域名无法通过DNS解析，添加 /etc/hosts 

```YAML
192.168.10.10   reg.xxhf.cc
```

登录仓库 

```YAML
[root@docker harbor]# docker login reg.xxhf.cc
Username: admin
Password: 
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded

```

 上传镜像 

```YAML
[root@docker harbor]# docker tag centos:7 reg.xxhf.cc/dev-xxhf/centos:7 
[root@docker harbor]# 
[root@docker harbor]# docker push reg.xxhf.cc/dev-xxhf/centos:7
The push refers to repository [reg.reg.xxhf.cc/dev-xxhf/centos]
Get "https://reg.xxhf.cc/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)

```

我们看到一个超时的报错，因为 docker push 默认是通过 https 协议通信的，我们的仓库没有开启 https，所以访问不通，需要修改 docker 配置文件` /etc/docker/daemon.json` 添加如下行 。

```YAML
"insecure-registries": ["reg.xxhf.cc"]
```

重启 Docker，重新上传镜像 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/09.png)

可以看到镜像成功上传。

### 添加证书

```YAML
# https related config
https:
  # https port for harbor, default is 443
    port: 443
  # The path of cert and key files for nginx
    certificate: /usr/local/harbor/certs/reg.xxhf.cc_bundle.crt 
    private_key: /usr/local/harbor/certs/reg.xxhf.cc.cloud.key

```

重启 harbor

```YAML
 docker-compose down -v
 #进入harbor的安装目录
 #修改配置文件
./prepare
# 重新启动
docker compose up -d
```

### 常用功能 

修改配置文件重新加载

```YAML
 docker compose down -v
 #进入harbor的安装目录
 #修改配置文件
./prepare
# 重新启动
docker compose up -d
```

定时删除镜像 

根据公司要求配置保留最近几个版本的镜像，配置定时执行周期即可。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/10.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/11.png)

证书到期后更新证书

```YAML
# 替换证书后重新生成配置文件
./prepare
docker compose down -v
docker compose up -d
```

## 附录

### Harbor 高可用

https://mp.weixin.qq.com/s/KWIoncCiBBPACf21J1hFmw

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/12.png)

### Harbor 提供的第三方插件

- Notary：Notary 是一套镜像的签名工具， 用来保证镜像层在 pull、push、transfer 过程中的一致性和完整性。避免中间人攻击，阻止非法的镜像更新和运行。镜像层的创建者可以对镜像层做数字签名，生成摘要，保存在 Notary 服务中。开启 Content Trust 机制之后，未签名的镜像无法被拉取。安装Notary后 Harbor必须使用 https 。 **弃用**  
- Trivy：镜像扫描，提供扫描结果，对镜像做漏洞扫描
- Chart Museum：用于保存 `helm chart` 镜像的组件。   **弃用**  

### Harbor架构 

- Data Access Layer 数据访问层
- Fundamental Services  基础服务层

  - Core： Harbor 核心服务
  - Quota Manager： 配额管理 
  - Retention  Manager： 镜像保留策略管理 
  - Chart Museum：  chart 管理  **弃用** 
  - **Docker Registry： 存储Docker镜像和处理docker push/pull 命令**
- Consumers  消费者

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-11/13.png)

[官网架构图](https://github.com/goharbor/harbor/wiki/Architecture-Overview-of-Harbor)

### Harbor 连接 1514 端口拒绝 

```YAML
Error response from daemon: failed to initialize logging driver: dial tcp [::1]:1514: connect: connection refused
```

修改 /etc/rsyslog.conf 

```YAML
# Provides TCP syslog reception
$ModLoad imtcp
$InputTCPServerRun 1514
```

```Plain Text
systemctl restart rsyslog.service
```

### 镜像地址

registry2: 

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/registry:2

registry:2 ccr.ccs.tencentyun.com/chijinjing/registry:2
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/N7PiwCFrgiDHr8kaCIPcubL6nId)
- 导入日期：2026-06-22