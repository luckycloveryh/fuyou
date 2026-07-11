---
title: "三. 容器的管理"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-09/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-09"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 三. 容器的管理

## Docker 命令行参数 

Docker 操作命令分为: 管理命令与普通命令  
1) 管理命令：为区分每个项目的命令, 比如说镜像操作, 就是以docker image 开头  
2) 普通命令：是在docker 命令之后直接的命令, 比如说删除镜像 docker rmi  
3) 管理命令相对于普通命令更清晰、严谨。  

```Bash
[root@docker ~]# docker help 

Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  logout      Log out from a registry
  search      Search Docker Hub for images
  version     Show the Docker version information
  info        Display system-wide information

Management Commands:
  builder     Manage builds
  buildx*     Docker Buildx
  compose*    Docker Compose
  container   Manage containers
  context     Manage contexts
  image       Manage images
  manifest    Manage Docker image manifests and manifest lists
  network     Manage networks
  plugin      Manage plugins
  system      Manage Docker
  trust       Manage trust on Docker images
  volume      Manage volumes

Swarm Commands:
  swarm       Manage Swarm

Commands:
  attach      Attach local standard input, output, and error streams to a running container
  commit      Create a new image from a container's changes
  cp          Copy files/folders between a container and the local filesystem
  create      Create a new container
  diff        Inspect changes to files or directories on a container's filesystem
  events      Get real time events from the server
  export      Export a container's filesystem as a tar archive
  history     Show the history of an image
  import      Import the contents from a tarball to create a filesystem image
  inspect     Return low-level information on Docker objects
  kill        Kill one or more running containers
  load        Load an image from a tar archive or STDIN
  logs        Fetch the logs of a container
  pause       Pause all processes within one or more containers
  port        List port mappings or a specific mapping for the container
  rename      Rename a container
  restart     Restart one or more containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  save        Save one or more images to a tar archive (streamed to STDOUT by default)
  start       Start one or more stopped containers
  stats       Display a live stream of container(s) resource usage statistics
  stop        Stop one or more running containers
  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE
  top         Display the running processes of a container
  unpause     Unpause all processes within one or more containers
  update      Update configuration of one or more containers
  wait        Block until one or more containers stop, then print their exit codes
```

## Docker 命令使用案例

### 2.1 获取容器启动镜像 

- 查看本地镜像列表

```Bash
[root@docker ~]# docker images 

[root@docker ~]# docker image ls 
```

- 从 [Docker Hub](https://hub.docker.com/) 搜索镜像

```Bash
[root@docker ~]# docker search nginx 
NAME                                              DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
nginx                                             Official build of Nginx.                        19099     [OK]       
bitnami/nginx                                     Bitnami nginx Docker Image                      176                  [OK]

```

- 拉取镜像 

```Bash
[root@docker ~]# docker pull nginx
Using default tag: latest
latest: Pulling from library/nginx
a2abf6c4d29d: Already exists 
a9edb18cadd1: Pull complete 
589b7251471a: Pull complete 
186b1aaa4aa6: Pull complete 
b4df32aa5a72: Pull complete 
a0bcbecc962e: Pull complete 
Digest: sha256:0d17b565c37bcbd895e9d92315a05c1c3c9a29f762b011a10c54a66cd53c9b31
Status: Downloaded newer image for nginx:latest
docker.io/library/nginx:latest

```

### 2.2 容器镜像传输

- 镜像保存

```Bash
docker save 
```

- 镜像导入

```Bash
docker load 

```

### 2.2 启动容器

#### 启动一个 Rockylinux 容器

```Bash
[root@docker ~]# docker run --help 

Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

Run a command in a new container

Options:
      --add-host list                  Add a custom host-to-IP mapping (host:ip)
  -a, --attach list                    Attach to STDIN, STDOUT or STDERR
      --blkio-weight uint16            Block IO (relative weight), between 10 and 1000, or 0 to disable (default 0)

```

```Bash
[root@docker ~]# docker run centos
[root@docker ~]# docker run -it centos /bin/bash
[root@docker ~]# docker run -it --name centos-01 centos /bin/bash
```

#### 启动一个 nginx 容器

```Bash
# nginx 容器在后台运行
[root@docker ~]# docker run -d --name nginx-01 nginx:1.22.1 

# 查看正在运行的容器
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
dbab65de3dd2   nginx:1.22.1   "/docker-entrypoint.…"   2 minutes ago   Up 2 minutes   80/tcp    nginx-01

# 接入容器内部 bash
[root@docker ~]# docker exec -it nginx-01 /bin/bash

# 测试 Nginx 是否正常运行
root@dbab65de3dd2:/# curl 127.0.0.1
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>

```

`docker run` 参数 

```Bash
 -i, --interactive                Keep STDIN open even if not attached
-t, --tty                        Allocate a pseudo-TTY
--name string                    Assign a name to the container
 -d, --detach                    Run container in background and print container ID

```

### 2.3 查看容器IP

#### 方法一： 在容器内部查看 

```Bash
 [root@1f672b950d1a /]# ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
25: eth0@if26: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:12:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.3/16 brd 172.18.255.255 scope global eth0
       valid_lft forever preferred_lft forever

```

#### 方法二： 使用 docker inspect 查看 

```Bash
[root@docker ~]# docker inspect --help 

Usage:  docker inspect [OPTIONS] NAME|ID [NAME|ID...]

Return low-level information on Docker objects

```

```Bash
# 在外部查看容器 IP
[root@docker ~]# docker inspect nginx-01 | grep -i ipaddr
            "SecondaryIPAddresses": null,
            "IPAddress": "172.18.0.2",
                    "IPAddress": "172.18.0.2",

```

#### 方法三： 使用 nsenter ，后面课程介绍 

### 2.4 容器生命周期管理 

容器生命周期管理涉及容器启动、停止等功能，下面选取最常用的docker run命令和负责启动停止的docker start/stop/restart命令举例。

#### 启动容器

```Bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

```

docker run 命令是Docker的核心命令之一，所有选项的说明可以通过`docker run --help` 命令查看。

#### 查看正在运行的容器

```Bash
# 查看正在运行的容器
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED             STATUS             PORTS     NAMES
dbab65de3dd2   nginx:1.22.1   "/docker-entrypoint.…"   About an hour ago   Up About an hour   80/tcp    nginx-01

```

#### 停止容器

```Bash
[root@docker ~]# docker stop  --help 

Usage:  docker stop [OPTIONS] CONTAINER [CONTAINER...]

Stop one or more running containers

Options:
  -t, --time int   Seconds to wait for stop before killing it (default 10)

```

```Bash
# 停止 nginx-01 容器
[root@docker ~]# docker stop nginx-01   # 使用容器名
nginx-01
或
[root@docker ~]# docker stop dbab65de3dd2   # 使用容器 ID
dbab65de3dd2

```

#### 查看已停止的容器

```Bash
[root@docker ~]# docker ps -a
CONTAINER ID   IMAGE          COMMAND                  CREATED             STATUS                         PORTS     NAMES
1f672b950d1a   centos         "/bin/bash"              11 minutes ago      Exited (0) 10 minutes ago                happy_borg
dbab65de3dd2   nginx:1.22.1   "/docker-entrypoint.…"   About an hour ago   Up About an hour               80/tcp    nginx-01
```

#### 启动已停止的容器

```Bash
[root@docker ~]# docker start --help 

Usage:  docker start [OPTIONS] CONTAINER [CONTAINER...]

Start one or more stopped containers

Options:
  -a, --attach               Attach STDOUT/STDERR and forward signals
      --detach-keys string   Override the key sequence for detaching a container
  -i, --interactive          Attach container's STDIN

```

```Bash
# 启动容器 nginx-01
[root@docker ~]# docker start nginx-01
nginx-01

```

#### 删除容器

```Bash
[root@docker ~]# docker rm --help 

Usage:  docker rm [OPTIONS] CONTAINER [CONTAINER...]

Remove one or more containers   #（删除已经停止的容器）

Options:
  -f, --force     Force the removal of a running container (uses SIGKILL)
  -l, --link      Remove the specified link
  -v, --volumes   Remove anonymous volumes associated with the container

```

```Bash
# 删除容器 centos-01
[root@docker ~]# docker rm centos-01
centos-01

# 批量删除
[root@docker ~]# docker rm $(docker ps -a -q )

```

## Docker 镜像管理命令

```Bash
docker pull 
docker push 
docker images 
```

## 附录

### Docker C/S 模式 （了解）

Docker 客户端和服务端是使用 Socket 方式连接，主要有以下几种方式:

1） 本地的 socket 文件 unix:///var/run/docker.sock （默认）

2） tcp://host:prot （演示）

3） fd://socketfd

- Docker 默认连接方式  

未启动的状态, 说明 Docker 在默认情况下使用本地的 /var/run/docker.sock 连接  

```Bash
[root@docker ~]# docker info 
Client:
 Context:    default
 Debug Mode: false
 Plugins:
  app: Docker App (Docker Inc., v0.9.1-beta3)
  buildx: Docker Buildx (Docker Inc., v0.10.4-docker)
  compose: Docker Compose (Docker Inc., v2.21.0)

Server:
ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
errors pretty printing info

```

- 设置 Docker 远程使用 TCP 的连接方式  

打开 sock 与 tcp 连接方式  

```Bash
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
#修改为：
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375 --containerd=/run/containerd/containerd.sock

```

重启Docker服务 

```Bash
systemctl daemon-reload
systemctl restart docker 
```

查看Docker运行状态

```Bash
[root@docker ~]# systemctl status docker 
● docker.service - Docker Application Container Engine
   Loaded: loaded (/usr/lib/systemd/system/docker.service; disabled; vendor preset: disabled)
   Active: active (running) since Mon 2023-10-09 10:32:17 CST; 26s ago
     Docs: https://docs.docker.com
 Main PID: 10641 (dockerd)
    Tasks: 11
   Memory: 21.7M
   CGroup: /system.slice/docker.service
           └─10641 /usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375 --containerd=/run/containerd/containerd.sock

```

- 查看监听端口

```Bash
[root@docker ~]# netstat -nltp | grep 2375
tcp        0      0 127.0.0.1:2375          0.0.0.0:*               LISTEN      10641/dockerd       

```

- 远程连接 

```Bash
[root@docker ~]# curl 127.0.0.1:2375/version  | python -mjson.tool
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   846  100   846    0     0  98624      0 --:--:-- --:--:-- --:--:--  103k
{
    "ApiVersion": "1.41",
    "Arch": "amd64",
    "BuildTime": "2024-04-04T18:21:02.000000000+00:00",
    "Components": [
        {
            "Details": {
                "ApiVersion": "1.41",
                "Arch": "amd64",
                "BuildTime": "2024-04-04T18:21:02.000000000+00:00",
                "Experimental": "false",
                "GitCommit": "5d6db84",

```

```Bash
# 启动/停止/重启 一个containers容器：
curl -X POST http://127.0.0.1:2375/containers/{id}/start   (注意这里是POST方法）
curl -X POST http://127.0.0.1:2375/containers/{id}/stop   (注意这里是POST方法）
curl -X POST http://127.0.0.1:2375/containers/{id}/restart   (注意这里是POST方法）
```

### 容器重启策略

To configure the restart policy for a container, use the `--restart` flag when using the `docker run` command. The value of the `--restart` flag can be any of the following:

<sheet sheet-id="PfVRG2" token="PLSesf0FphF7tGt6GN7cDsSTnHc"></sheet>

https://docs.docker.com/config/containers/start-containers-automatically/

### 镜像地址 

Busybox: 

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/busybox:latest

ccr.ccs.tencentyun.com/chijinjing/busybox:latest
```

Rockylinux9:

```Bash
ccr.ccs.tencentyun.com/chijinjing/rockylinux:9
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/Ix2uwEsKJie5JNkLPJeckTQknWg)
- 导入日期：2026-06-22