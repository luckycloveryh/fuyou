---
title: "二. Docker 安装"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-04"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 二. Docker 安装

## 安装

### 安装前准备

- 查看系统和内核版本

```Bash
[root@docker ~]# cat /etc/redhat-release 
Rocky Linux release 9.4 (Blue Onyx)
[root@docker ~]# 
[root@docker ~]# uname  -a 
Linux worker-01 5.14.0-503.15.1.el9_5.x86_64 #1 SMP PREEMPT_DYNAMIC Tue Nov 26 17:24:29 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux

```

- 关闭防火墙和SELinux

```Bash
[root@docker ~]# systemctl stop firewalld
[root@docker ~]# systemctl disable firewalld

[root@docker ~]# setenforce  0 
setenforce: SELinux is disabled
[root@docker ~]# 
[root@docker ~]# getenforce 
Disabled
```

- 卸载旧版本

```Bash
yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

### [使用 dnf  安装](https://docs.docker.com/engine/install/centos/)

- 配置仓库 

```Bash
# 安装 dnf-utils
dnf install -y dnf-utils

# dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 添加阿里云 Docker CE 仓库
dnf config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

- 安装最新版本

```Bash
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

- 指定安装版本，本课程使用版本：27.5.1

```Bash
# 查看所有版本
dnf list docker-ce --showduplicates | sort -r

# 安装
dnf install  docker-ce-3:27.5.1  docker-ce-cli-1:27.5.1  containerd.io  docker-compose-plugin

# 启动服务 
systemctl enable --now docker
```

### RPM 包安装

 访问官网仓库 [https://download.docker.com/linux/centos/](https://download.docker.com/linux/centos/?_gl=1*15as9ff*_ga*NjY5NzU0NTk0LjE2Nzc0MjQ2OTI.*_ga_XJWPQMJYHQ*MTY5NjczMjg2NS4zNC4xLjE2OTY3MzQ2NTkuNjAuMC4w)  选择系统版本，进入 `x86_64/stable/Packages/ `  目录，下载离线 RPM 包。       

- 下载离线安装文件 

```Bash
dnf download --resolve docker-ce-3:27.5.1  docker-ce-cli-1:27.5.1  containerd.io  docker-compose-plugin           
```

- 安装 

```Bash
dnf localinstall *.rpm
```

### [二进制安装](https://docs.docker.com/engine/install/binaries/) （了解）

访问官网仓库 https://download.docker.com/linux/static/stable/x86_64/ 下载二进制文件 

```Bash
wget https://download.docker.com/linux/static/stable/x86_64/docker-27.5.1.tgz
tar xvf docker-27.5.1.tgz
mv docker/* /usr/bin/
```

## 启动 Docker 服务 

```Bash
cat << EOF > /usr/lib/systemd/system/containerd.service
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd

Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF
```

```Bash
cat << EOF > /usr/lib/systemd/system/docker.service
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service containerd.service
Wants=network-online.target
Requires=containerd.service

[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
ExecStart=/usr/bin/dockerd 
ExecReload=/bin/kill -s HUP 
TimeoutSec=0
RestartSec=2
Restart=always

# Note that StartLimit* options were moved from "Service" to "Unit" in systemd 229.
# Both the old, and new location are accepted by systemd 229 and up, so using the old location
# to make them work for either version of systemd.
StartLimitBurst=3

# Note that StartLimitInterval was renamed to StartLimitIntervalSec in systemd 230.
# Both the old, and new name are accepted by systemd 230 and up, so using the old name to make
# this option work for either version of systemd.
StartLimitInterval=60s

# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

# Comment TasksMax if your systemd version does not support it.
# Only systemd 226 and above support this option.
TasksMax=infinity

# set delegate yes so that systemd does not reset the cgroups of docker containers
Delegate=yes

# kill only the docker process, not all processes in the cgroup
KillMode=process
OOMScoreAdjust=-500

[Install]
WantedBy=multi-user.target
EOF
```

```Bash
systemctl daemon-reload
systemctl start containerd
systemctl start docker
systemctl enable containerd
systemctl enable docker
docker info 
```

## 测试 Docker 是否正确安装

```Bash
[root@docker ~]# docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
e6590344b1a5: Pull complete 
Digest: sha256:bfbb0cc14f13f9ed1ae86abc2b9f11181dc50d779807ed3a3c5e55a6936dbdd5
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

## 版本信息

Docker 是传统的 CS 架构分为 Docker Client 和Docker Server

```Bash
[root@docker ~]# docker version 
Client: Docker Engine - Community
 Version:           27.5.1
 API version:       1.47
 Go version:        go1.22.11
 Git commit:        9f9e405
 Built:             Wed Jan 22 13:42:47 2025
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          27.5.1
  API version:      1.47 (minimum version 1.24)
  Go version:       go1.22.11
  Git commit:       4c9b3b0
  Built:            Wed Jan 22 13:41:09 2025
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          1.7.25
  GitCommit:        bcc810d6b9066471b0b6fa75f557a15a1cbf31bb
 runc:
  Version:          1.2.4
  GitCommit:        v1.2.4-0-g6c52b3f
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
```

## 状态信息查看 

```Bash
[root@docker ~]# docker info 
Client: Docker Engine - Community
 Version:    27.5.1
 Context:    default
 Debug Mode: false
 Plugins:
  buildx: Docker Buildx (Docker Inc.)
    Version:  v0.21.1
    Path:     /usr/libexec/docker/cli-plugins/docker-buildx
  compose: Docker Compose (Docker Inc.)
    Version:  v2.33.1
    Path:     /usr/libexec/docker/cli-plugins/docker-compose

Server:
 Containers: 1
  Running: 0
  Paused: 0
  Stopped: 1
 Images: 1
 Server Version: 27.5.1
 Storage Driver: overlay2
  Backing Filesystem: extfs
  Supports d_type: true
  Using metacopy: false
  Native Overlay Diff: true
  userxattr: false
 Logging Driver: json-file
 Cgroup Driver: systemd
 Cgroup Version: 2
 Plugins:
  Volume: local
  Network: bridge host ipvlan macvlan null overlay
  Log: awslogs fluentd gcplogs gelf journald json-file local splunk syslog
 Swarm: inactive
 Runtimes: io.containerd.runc.v2 runc
 Default Runtime: runc
 Init Binary: docker-init
 containerd version: bcc810d6b9066471b0b6fa75f557a15a1cbf31bb
 runc version: v1.2.4-0-g6c52b3f
 init version: de40ad0
 Security Options:
  seccomp
   Profile: builtin
  cgroupns
 Kernel Version: 5.14.0-503.15.1.el9_5.x86_64
 Operating System: Rocky Linux 9.4 (Blue Onyx)
 OSType: linux
 Architecture: x86_64
 CPUs: 2
 Total Memory: 1.92GiB
 Name: docker
 ID: 6f60d94f-5a56-4caa-bf64-fe455ce0dedb
 Docker Root Dir: /var/lib/docker
 Debug Mode: false
 Experimental: false
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false
```

## 配置 镜像加速器

Docker 配置文件 `/etc/docker/daemon.json` 中写入如下内容（如果文件不存在先创建）：

```JSON
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.mybacc.com",
    "https://docker.m.daocloud.io",
    "https://bkr5wo56.mirror.aliyuncs.com"
  ]
}
```

重启 docker 服务 

```Bash
systemctl daemon-reload
systemctl restart docker
```

## REF：

### 镜像地址

Hello-world:

```Bash
 registry.cn-beijing.aliyuncs.com/xxhf/hello-world:latest
 
 ccr.ccs.tencentyun.com/chijinjing/hello-world:latest
```

Ubuntu: 

```Bash
ccr.ccs.tencentyun.com/chijinjing/ubuntu:24.04

registry.cn-beijing.aliyuncs.com/xxhf/ubuntu:22.04
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/NLDhwwicmibZg8kafDRcnorPnec)
- 导入日期：2026-06-22