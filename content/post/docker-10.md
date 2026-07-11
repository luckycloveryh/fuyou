---
title: "使用 Dockerfile 构建镜像"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-10/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["7. Docker"]
slug: "docker-10"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 四、使用 Dockerfile 创建镜像

Dockerfile 是一个文本格式的配置文件，我们可 以使用Dockerfile来快速创建自定义的镜像。

## Dockerfile 基本结构 

Dockerfile 由一行行命令语句组成，并且支持以#开头的注释行。一般而言，Dockerfile 主体内容分为四部分：

- 基础镜像信息   base image  建议使用官方提供的镜像 
- 维护者信息  
- 镜像操作指令
- 容器启动时执行的指令

我们看一个简单的示例：

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1.22.1-1.el7.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
CMD /usr/sbin/nginx

```

我们使用 FROM 指令指明所基于的镜像名称，接下来一般是使用 LABEL 指令说明维护者信息。后面则是镜像操作指令，例如 RUN 指令将对镜像执行跟随的命令。每运行一条 RUN 指令，镜像添加新的一层，并提交。最后是 CMD 指令，来指定运行容器时的操作命令。

## 指令说明 

Dockerfile 中的指令一般格式为 `INSTRUCTION arguments`，包括“配置指令” （配置镜像信息）和 “操作指令”（具体执行操作），详见下表

| 指   令 | 说  明 |
|-|-|
| ARG | 定义创建镜像过程中使用的变量 |
| FROM | 指定所创建镜像的基础镜像 |
| LABEL | 为生成的镜像添加元素数据标签信息 |
| EXPOSE | 声明镜像内服务监听的端口 |
| ENV | 指定环境变量 |
| ENTRYPOINT | 指定镜像的默认入口命令 |
| VOLUME | 创建一个数据卷挂载点 |
| USER | 指定运行容器时的用户名或 UID |
| WORKDIR | 配置工作目录 |
| ONBUILD | 创建子镜像时指定自动执行的操作指令 |
| STOPSIGNAL | 指定退出的信号值 |
| HEALTHCHECK | 配置所启动容器如何进行健康检查 |
| SHELL | 指令默认 shell 类型 |
| RUN | 运行指定命令 |
| CMD | 启动容器时指定默认执行的命令 |
| ADD | 添加内容到镜像 |
| COPY | 复制内容到镜像  |

## 指令详解

### FROM

指定所创建镜像的 **基础镜像**。

格式为 `FROM <image> [AS <name>] `或 `FROM <image>:<tag> [AS <name>] `或 `FROM <image>@<digest> [AS <name>]`。

**任何 Dockerfile 中第一条指令必须为FROM指令**。

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

# Install tools 
RUN  yum -y install telnet lrzsz iproute && yum clean all

CMD ["/bin/bash"]
```

```Bash
[root@docker dockerfile-from]# docker build -t centos7 . 

[root@docker dockerfile-from]# docker run -it centos7 /bin/bash
[root@3ec8548607d8 /]# telnet www.baidu.com 80
Trying 103.235.46.40...
Connected to www.baidu.com.
Escape character is '^]'.
```

### ARG

定义创建镜像过程中使用的变量。

格式为 `ARG <name>[=<default value>]`

在执行 docker build 时，可以通过 `--build-arg [=] `来为变量赋值。当镜像编译成功后，ARG 指定的变量将不再存在（ENV 指定的变量将在镜像中保留）。

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ARG VERSION=1.26.0
ENV NGINX_VERSION=1.26.1

EXPOSE 80

WORKDIR /data

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$VERSION-1.el9.ngx.x86_64 && yum clean all
#RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
CMD ["/usr/sbin/nginx"]
```

ARG 的变量可以在 `docker build` 的过程中使用 `--build-arg` 参数修改变量的值。

```Bash
[root@docker dockerfile-arg]# docker build -t nginx:1.26.1 --build-arg VERSION=1.26.1 .

[root@docker dockerfile-arg]# docker run -it nginx:1.26.1 /bin/bash 
[root@400d4eb74580 data]# nginx -V
nginx version: nginx/1.26.1
built by gcc 11.3.1 20221121 (Red Hat 11.3.1-4) (GCC) 
built with OpenSSL 3.0.7 1 Nov 2022

```

### LABEL 

LABEL 指令可以为生成的镜像添加元数据标签信息。

格式为LABEL <key>=<value> <key>=<value> <key>=<value> ...。

例如：

```Bash
LABEL version="1.0.0-rc3"
LABEL author="chijinjing@xinxianghf.com" date="2023-01-01"
LABEL description="This text illustrates \
        that label-values can span multiple lines."
```

Dockerfile:   

```Bash
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

LABEL date="2025-02-06"
LABEL description="This is a demo image that based on Rockylinux9."

CMD /bin/bash
```

构建镜像：

```Bash
[root@docker dockerfile-label]# docker build -t nginx-label:v1 .

[root@docker dockerfile-label]# docker inspect  nginx-label:v1
......
            "Labels": {
                "authors": "chijinjing@xinxianghf.com",
                "date": "2025-02-06",
                "description": "This is a demo image that based on Rockylinux9."
            }

......
```

### EXPOSE

**声明** 镜像内服务监听的端口。

格式为 `EXPOSE <port> [<port>/<protocol>...]`

例如：

```Dockerfile
EXPOSE  80 443 
```

该指令只是起到 **声明作用**，并不会自动完成端口映射。

### ENV 

指定环境变量，在镜像生成过程中会被后续RUN指令使用，在镜像启动的容器中也会存在。

格式为 `ENV <key>=<value> ...`

例如：

```Dockerfile
ENV APP_VERSION=1.0.0
ENV APP_HOME=/usr/local/app
ENV PATH $PATH:/usr/local/bin
```

指令指定的环境变量在运行时可以被覆盖掉，如 `docker run --env <key>=<value> image_name`。

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV NGINX_VERSION=1.26.1

EXPOSE 80

WORKDIR /data

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
#RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
CMD ["/usr/sbin/nginx"]

```

构建镜像

```Dockerfile
[root@docker dockerfile-env]# docker build -t nginx-env:1.26.1 . 

```

测试

```Bash
[root@docker dockerfile-env]# docker run -it nginx-env:1.26.1 /bin/bash
[root@e41996f634fe /]# echo $NGINX_VERSION
1.26.1

[root@docker dockerfile-env]# docker run -e NGINX_VERSION=1.26.2  -it nginx-env:1.22.1 /bin/bash
[root@c886461519db /]# echo $NGINX_VERSION
1.26.2

```

### ENTRYPOINT

指定镜像的默认入口命令，该入口命令会在启动容器时作为根命令执行，所有传入值作为该命令的参数。

支持两种格式：

- `ENTRYPOINT ["executable", "param1", "param2"]`: 使用 exec 执行； 建议使用这种方式 
- `ENTRYPOINT command param1 param2`: 在 shell 终端中执行。

每个Dockerfile中只能有一个ENTRYPOINT，当指定多个时，只有最后一个起效。

#### 在 shell 中执行 

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV NGINX_VERSION=1.26.1

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
ENTRYPOINT /usr/sbin/nginx
```

构建镜像 

```Dockerfile
[root@docker dockerfile-entrypoint]# docker build -t entrypoint-shell . 
```

#### exec 调用执行

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV NGINX_VERSION=1.26.1

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
ENTRYPOINT ["/usr/sbin/nginx"]
```

构建镜像

```Dockerfile
[root@docker dockerfile-entrypoint]# docker build -t entrypoint-exec -f Dockerfile2  . 
```

比较两者区别 

```Dockerfile
[root@docker dockerfile-entrypoint]# docker run -d entrypoint-shell 
0ac9cc117c8db093bab58fc2a2a888a4e6fcc14919f8b23d4fb62c292648ea31
[root@docker dockerfile-entrypoint]# 
[root@docker dockerfile-entrypoint]# docker run -d entrypoint-exec
3c0069768d2122c2c4440c2c730e7e61af9d38e3b171e4045b6b43d522f169db
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-10/01.png)

exec 和 shell 的区别？

```Dockerfile
[root@docker ~]# VERSION=1.0.1
[root@docker ~]# 
[root@docker ~]# cat demo.sh 
#!/bin/bash

echo "exec test."
echo $VERSION
echo $$
[root@docker ~]# sh demo.sh 
exec test.

23329
[root@docker ~]# source demo.sh 
exec test.
1.0.1
9437
[root@docker ~]# echo $$
9437

```

### VOLUME   卷

创建一个数据卷挂载点。

格式为 `VOLUME ["/data"]`

运行容器时可以从本地主机或其他容器挂载数据卷，一般用来存放数据库和需要保持的数据。

### USER 

指定运行容器时的用户名或 UID，后续的 RUN 等指令也会使用指定的用户身份。

格式为 `USER daemon`

当服务不需要管理员权限时，可以通过该命令指定运行用户，并且可以在Dockerfile中创建所需要的用户。

例如：

```Dockerfile
RUN groupadd -r redis && useradd -r -g redis redis
USER redis
```

Dockerfile

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

# Add user
RUN groupadd -r redis && useradd -r -g redis redis
USER redis

CMD ["/bin/bash"]
```

构建镜像

```Dockerfile
[root@docker dockerfile-user]# docker build -t  user-redis . 

```

测试

```Bash
[root@docker dockerfile-user]# docker run -it user-redis whoami
redis

```

### WORKDIR

为 RUN、CMD、ENTRYPOINT 指令配置工作目录  

格式为 `WORKDIR /path/to/workdir`

可以使用多个WORKDIR指令，后续命令如果参数是相对路径，则会基于之前命令指定的路径。

例如：

```Dockerfile
WORKDIR /a   # mkdir /a && cd /a 
WORKDIR b    # mkdir b &&  cd b    /a/b 
WORKDIR c
RUN pwd   # /a/b/c 
```

最终路径为/a/b/c。

因此，为了避免出错，推荐WORKDIR指令中只**使用绝对路径**。

Dockerfile

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

WORKDIR /data

COPY app.json .

WORKDIR /data/app/
COPY app.jar . 

WORKDIR /data/applog/

CMD ["/bin/bash"]
```

构建镜像 

```Dockerfile
[root@docker dockerfile-workdir]# docker build -t workdir:v1  . 

```

测试

```Bash
[root@docker dockerfile-workdir]# docker run -it workdir:v1 pwd
/data/applog

```

### ONBUILD

指定当基于所生成镜像创建子镜像时，自动执行的操作指令。

格式为` ONBUILD [INSTRUCTION] `

使用 docker build 命令创建子镜像 ChildImage 时（FROM ParentImage），会首先执行 ParentImage 中配置的 ONBUILD 指令：

```Dockerfile
# Install tools 
ONBUILD RUN  yum -y install telnet wget && yum clean all
```

由于 ONBUILD 指令是隐式执行的，推荐在使用它的镜像标签中进行标注，例如 centos7-onbuild。

**ONBUILD 指令在自动编译、检查等操作的基础镜像时，十分有用。**

Dockerfile-parent

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

# Install tools 
ONBUILD RUN  yum -y install telnet wget && yum clean all

WORKDIR /data/applog/

CMD ["/bin/bash"]

```

构建镜像   **rocky-onbuild** 

```Dockerfile
[root@docker dockerfile-onbuild]# docker build -t rocky-onbuild -f Dockerfile-parent .

```

测试

```Bash
[root@docker dockerfile-onbuild]# docker run -it rocky-onbuild /bin/bash
[root@d2f5c03b323a ~]# telnet
bash: telnet: command not found
```

Docker-child

```Dockerfile
# Base image
FROM rocky-onbuild

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

WORKDIR /data/applog/

CMD ["/bin/bash"]

```

构建镜像 

```Dockerfile
[root@docker dockerfile-onbuild]# docker build -t rocky-child -f Dockerfile-child  . 

```

测试

```Bash
[root@docker dockerfile-onbuild]# docker run -it rocky-child /bin/bash
[root@5ba7f4c76f92 applog]# telnet
telnet> 

```

### STOPSIGNAL   

指定容器接收退出的信号值：

```Dockerfile
STOPSIGNAL signal
```

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV NGINX_VERSION=1.26.1

STOPSIGNAL SIGTERM 

EXPOSE 80

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Start nginx daemon
CMD ["/usr/sbin/nginx"]
```

构建镜像 

```Bash
[root@docker dockerfile-stopsignal]# docker build -t nginx-signal . 
```

测试

```Dockerfile
[root@docker dockerfile-stopsignal]# docker run -d --name nginx-01 nginx-signal
7b2460645df10c6e1cd88f2d2499ae9c6fa7c91bf2323cc53d5f1fe2ef0edb0b
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# docker run -d --name nginx-02 nginx-signal
7cf348e32417d12730e48082d046189af44391e62c136dfee6cc5c8702ac0a0f
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# docker ps 
CONTAINER ID   IMAGE          COMMAND             CREATED         STATUS         PORTS     NAMES
7cf348e32417   nginx-signal   "/usr/sbin/nginx"   3 seconds ago   Up 2 seconds             nginx-02
7b2460645df1   nginx-signal   "/usr/sbin/nginx"   8 seconds ago   Up 7 seconds             nginx-01
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# docker stop nginx-01
nginx-01
[root@docker dockerfile-stopsignal]# docker inspect -f '{{.State.ExitCode}}' nginx-01
0
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# docker kill nginx-02
nginx-02
[root@docker dockerfile-stopsignal]# 
[root@docker dockerfile-stopsignal]# docker inspect  -f '{{.State.ExitCode}}' nginx-02
137

```

### HEALTHCHECK

配置所启动容器如何进行健康检查（如何判断健康与否），自Docker 1.12开始支持。

有两种格式：

- `HEALTHCHECK [OPTIONS] CMD command`：根据所执行命令返回值是否为 0 来判断；  
- `HEALTHCHECK NONE`：禁止基础镜像中的健康检查。

OPTION支持如下参数：

```Dockerfile
 --interval=DURATION (default: 30s)：过多久检查一次；
 --timeout=DURATION (default: 30s)：每次检查等待结果的超时；
 --retries=N (default: 3)：如果失败了，重试几次才最终确定失败。
```

Dockerfile: 

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

WORKDIR /usr/local/app
COPY http-demo . 

HEALTHCHECK --interval=5s --timeout=3s --retries=3\
  CMD curl -fs http://localhost:8080/ 

CMD ["./http-demo"]
```

构建镜像 

```Dockerfile
[root@docker docker-healthcheck]# docker build -t http-good -f Dockerfile-good . 

```

测试

```Bash
[root@docker docker-healthcheck]# docker run -d http-good 
06fa6f9f5db924c4cd3baf6a2932335abb35034e6aaf0515f2278e35e1629655
[root@docker docker-healthcheck]# docker ps 
CONTAINER ID   IMAGE       COMMAND         CREATED         STATUS                            PORTS     NAMES
06fa6f9f5db9   http-good   "./http-demo"   3 seconds ago   Up 2 seconds (health: starting)             charming_lovelace

[root@docker docker-healthcheck]# docker ps 
CONTAINER ID   IMAGE       COMMAND         CREATED          STATUS                    PORTS     NAMES
06fa6f9f5db9   http-good   "./http-demo"   34 seconds ago   Up 33 seconds (healthy)             charming_lovelace

```

健康检查异常示例：

Dockerfile:

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

WORKDIR /usr/local/app
COPY http-demo . 

HEALTHCHECK --interval=10s --timeout=1s --retries=1\
  CMD curl -fs http://localhost:8081/ 

CMD ["./http-demo"]
```

构建镜像

```Dockerfile
[root@docker docker-healthcheck]# docker build -t http-bad -f Dockerfile-bad  . 

```

测试

```Dockerfile
[root@docker docker-healthcheck]# docker run -d  http-bad
8b1e99b026df95b5564b0ed352eb8ca49e2715d44ebbe99c13d66fcdf66a6c6b
[root@docker docker-healthcheck]# 
[root@docker docker-healthcheck]# docker ps 
CONTAINER ID   IMAGE      COMMAND         CREATED         STATUS                            PORTS     NAMES
8b1e99b026df   http-bad   "./http-demo"   3 seconds ago   Up 3 seconds (health: starting)             admiring_agnesi

[root@docker docker-healthcheck]# docker ps 
CONTAINER ID   IMAGE      COMMAND         CREATED          STATUS                      PORTS     NAMES
8b1e99b026df   http-bad   "./http-demo"   15 seconds ago   Up 14 seconds (unhealthy)             admiring_agnesi

```

### SHELL

指定其他命令使用 shell 时的默认shell类型：

`SHELL ["executable", "parameters"]`

默认值为["/bin/sh", "-c"]。

### RUN

运行指定命令。

格式为

- `RUN <command> `  在 shell 终端中执行
- `RUN ["executable", "param1", "param2"]`   使用 exec 执行

每条 RUN 指令将在当前镜像基础上执行指定命令，并提交为新的镜像层。当命令较长时可以使用 `\` 来换行。例如：

```Bash
RUN  dnf  -y install telnet lrzsz iproute \
                    && yum clean all  
```

### CMD

CMD 指令用来指定启动容器时默认执行的命令。

支持三种格式：

- `CMD ["executable", "param1", "param2"]`：相当于执行 executable param1 param2，**推荐方式**；
- `CMD command param1 param2`：在默认的 Shell 中执行，提供给需要交互的应用；
- `CMD ["param1", "param2"]`：提供给 ENTRYPOINT 的默认参数。

每个 Dockerfile 只能有一条 CMD 命令。如果指定了多条命令，只有最后一条会被执行。

如果用户启动容器时候手动指定了运行的命令（作为 run 命令的参数），则会覆盖掉 CMD 指定的命令。

比如 `docker run -it centos:7 cat /etc/os-release`。这就是用 `cat /etc/os-release` 命令替换了默认的 `/bin/bash` 命令了，输出了系统版本信息

前两种格式的效果和 ENTRYPOINT 是一样的

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-10/02.png)

### CMD 与 ENTRYPOINT 的区别 

`ENTRYPOINT` 目的和 `CMD` 一样，都是指定容器启动程序及参数。

当指定了 `ENTRYPOINT` 后，`CMD` 的含义就发生了改变，不再是直接的运行其命令，而是将 `CMD` 的内容作为参数传给 `ENTRYPOINT` 指令，实际执行时，将变为：`<ENTRYPOINT> "<CMD>"` 。

#### **案例一**

获取当前主机出网的运营商和IP地址 

```Bash
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

CMD [ "curl", "-s", "http://myip.ipip.net" ]

```

构建镜像

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker build -t cmd:1.0.1 . 

[root@docker dockerfile-cmd-entrypoint]# docker run cmd:1.0.1
当前 IP：101.32.192.31  来自于：中国 香港   tencent.com

```

假如现在我们需要修改 `curl `命令加 `-i ` 参数 `curl -i -s ``http://myip.ipip.net`` `

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker run cmd:1.0.1 -i
docker: Error response from daemon: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "-i": executable file not found in $PATH: unknown.

```

可以看到容器运行报错，`executable file not found`。在讲 `CMD` 命令时我们说过，跟在镜像名后面的是 `command`，运行时会替换 `CMD` 的默认值。因此这里的 `-i` 替换了原来的 `CMD`，而不是添加在原来的 `curl -s ``http://myip.ipip.net` 后面。而 `-i` 根本不是命令，所以提示找不到命令报错。

那么如果我们希望加入 `-i` 这参数，我们就必须重新完整的输入这个命令：

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker run cmd:1.0.1  curl -i -s http://myip.ipip.net
HTTP/1.1 200 OK
Date: Sat, 21 Oct 2024 09:16:39 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 67
Connection: keep-alive
CF-Cache-Status: DYNAMIC
Server: cloudflare
CF-RAY: 819867291ef70952-HKG
alt-svc: h3=":443"; ma=86400

当前 IP：101.32.192.31  来自于：中国 香港   tencent.com

```

有没有更好的解决方案，我们使用 `ENTRYPOINT `来重新实现这个镜像。

Dockerfile

```Bash
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENTRYPOINT [ "curl", "-s", "http://myip.ipip.net" ]

```

构建镜像 

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker build -t entrypoint:1.0.1 -f Dockerfile-entrypoint .
```

测试

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker run entrypoint:1.0.1
当前 IP：101.32.192.31  来自于：中国 香港   tencent.com
[root@docker dockerfile-cmd-entrypoint]# 

[root@docker dockerfile-cmd-entrypoint]# docker run entrypoint:1.0.1 -i
HTTP/1.1 200 OK
Date: Sat, 21 Oct 2024 09:22:04 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 67
Connection: keep-alive
CF-Cache-Status: DYNAMIC
Server: cloudflare
CF-RAY: 81986f1a38e35dd5-HKG
alt-svc: h3=":443"; ma=86400

当前 IP：101.32.192.31  来自于：中国 香港   tencent.com

```

可以看到，这次成功了。这是因为当存在 `ENTRYPOINT` 后，command 的内容将会作为参数传给 `ENTRYPOINT`，而这里 `-i` 就是新的 command ，因此会作为参数传给 `curl`，从而达到了我们预期的效果。

#### **案例二**

启动容器就是启动主进程，但有些时候，启动主进程前，需要一些准备工作。

比如 数据库类的应用，可能需要一些数据库配置、初始化的工作，这些工作要在最终的服务运行之前解决。

此外，可能希望避免使用 `root` 用户去启动服务，从而提高安全性，而在启动服务前还需要以 `root` 身份执行一些必要的准备工作，最后切换到服务用户身份启动服务。或者除了服务外，其它命令依旧可以使用 `root` 身份执行，方便调试等。

我们看一下redis 官网镜像的 Dockerfile 是怎么实现的：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-10/03.png)

```Dockerfile
ADD file:a1398394375faab8dd9e1e8d584eea96c750fb57ae4ffd2b14624f1cf263561b in /
...
RUN /bin/sh -c groupadd -r -g 999 redis && useradd -r -g redis -u 999 redis
...
ENTRYPOINT ["docker-entrypoint.sh"]
EXPOSE map[6379/tcp:{}]
CMD ["redis-server"]
```

可以看到 redis 服务创建了 redis 用户，并在最后指定了 `ENTRYPOINT` 为 `docker-entrypoint.sh` 脚本。

我们看一下 `docker-entrypoint.sh` 脚本的内容：

```Bash
.....
# allow the container to be started with `--user`
if [ "$1" = 'redis-server' -a "$(id -u)" = '0' ]; then
        find . \! -user redis -exec chown redis '{}' +
        exec gosu redis "$0" "$@"
fi
 
exec "$@"

```

该脚本的内容就是根据 `CMD` 的内容来判断，如果是 `redis-server` 的话，则切换到 `redis` 用户身份启动服务器，否则依旧使用 `root` 身份执行。比如：

```Dockerfile
[root@docker ~]# docker run -it redis id 
uid=0(root) gid=0(root) groups=0(root)
```

我们使用 `docker-entrypoint.sh` 来实现一个 nginx 启动的 dockerfile

Dockerfile:

```Bash
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV NGINX_VERSION=1.26.1

# Add nginx yum repo
COPY nginx.repo /etc/yum.repos.d/nginx.repo

# Install nginx
RUN  yum -y install nginx-1:$NGINX_VERSION-1.el9.ngx.x86_64 && yum clean all

COPY entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

构建镜像：

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker build -t entrypoint-nginx -f Dockerfile-nginx . 
```

测试：

```Bash
[root@docker dockerfile-cmd-entrypoint]# docker run -d entrypoint-nginx
abc77a723d6748e67fd3f0993510c0ac1e7852c8d4cb296730e133afb4b12775
[root@docker dockerfile-cmd-entrypoint]# 
[root@docker dockerfile-cmd-entrypoint]# docker ps 
CONTAINER ID   IMAGE              COMMAND                  CREATED         STATUS         PORTS     NAMES
abc77a723d67   entrypoint-nginx   "/entrypoint.sh ngin…"   2 seconds ago   Up 2 seconds             vigilant_mirzakhani
[root@docker dockerfile-cmd-entrypoint]# 
[root@docker dockerfile-cmd-entrypoint]# 
[root@docker dockerfile-cmd-entrypoint]# docker exec -it abc77a723d67 /bin/bash
[root@abc77a723d67 /]# curl 127.0.0.1
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>

```

Nginx 可以正常启动。

### ADD

添加内容到镜像。

格式为 `ADD <src> <dest>`

该命令将复制指定的 <src> 路径下内容到容器中的 <dest> 路径下。

其中 <src> 可以是 Dockerfile 所在目录的一个相对路径（文件或目录）；也可以是一个 URL；还可以是一个tar 文件（自动解压为目录）<dest> 可以是镜像内绝对路径，或者相对于工作目录（WORKDIR）的相对路径。

路径支持正则格式，例如：

```Bash
ADD ＊.c /code/
```

添加文件到容器内

Dockerfile：

```Bash
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ADD nginx-1.22.1 /usr/local/src/nginx-1.22.1 

CMD ["/bin/bash"]
```

构建镜像：

```Bash
[root@docker dockerfile-add]# docker build -t add:v1 -f Dockerfile-v1  . 

[root@docker dockerfile-add]# docker run --rm add:v1 ls /usr/local/src 
nginx-1.22.1
```

添加远程文件到容器内

Dockerfile:

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ADD  https://nginx.org/download/nginx-1.22.1.tar.gz  /usr/local/src

CMD ["/bin/bash"]

```

构建&测试：

```Dockerfile
[root@docker dockerfile-add]# docker build -t add:v2 -f Dockerfile-v2  . 

# 自动下载远端文件
[root@docker dockerfile-add]# docker run --rm add:v2 ls /usr/local/src
nginx-1.22.1.tar.gz

```

添加压缩文件到容器内

Dockerfile：

```Dockerfile
# Base image
FROM rockylinux:9

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ADD  nginx-1.22.1.tar.gz  /usr/local/src

CMD ["/bin/bash"]

```

构建 & 测试

```Dockerfile
[root@docker dockerfile-add]# docker build -t add:v3 -f Dockerfile-v3 . 

# 自动解压 tar 包
[root@docker dockerfile-add]# docker run --rm add:v3 ls /usr/local/src 
nginx-1.22.1

```

### COPY 

复制内容到镜像。

格式为` COPY <src> <dest>`

复制本地主机的 <src>（为Dockerfile所在目录的相对路径，文件或目录）下内容到镜像中的 <dest>。目标路径不存在时，会自动创建。

路径同样支持正则格式。

在 Docker 官方的 Dockerfile 最佳实践文档 中要求，尽可能的使用 `COPY`，因为 `COPY` 的语义很明确，就是复制文件而已，而 `ADD` 则包含了更复杂的功能，其行为也不一定很清晰。最适合使用 `ADD` 的场合，就是需要自动解压缩的场合。

## 制作 JAVA 应用镜像 

我们基于 centos7 制作一个生产环境可以使用 java 运行环境的镜像。

- 下载 Java JDK  

https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html

- Dockerfile for java base image 

```Dockerfile
# Base image
FROM rockylinux:9 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

ENV JAVA_VERSION=jdk-11.0.25

COPY ${JAVA_VERSION} /usr/local/${JAVA_VERSION}

ENV JAVA_HOME=/usr/local/${JAVA_VERSION}
ENV PATH=${JAVA_HOME}/bin:$PATH

CMD ["/bin/bash"]
```

- 构建镜像 

```Dockerfile
[root@docker rocky-jdk]# docker build -t rocky-jdk11:v1 .

[root@docker rocky-jdk]# docker images rocky-jdk11:v1 
REPOSITORY    TAG       IMAGE ID       CREATED         SIZE
rocky-jdk11   v1        704c1a9b2eea   7 minutes ago   459MB

[root@docker rocky-jdk]# docker run -it rocky-jdk11:v1 /bin/bash
[root@cdd87cb01782 /]# 
[root@cdd87cb01782 /]# java -version 
java version "11.0.25" 2024-10-15 LTS
Java(TM) SE Runtime Environment 18.9 (build 11.0.25+9-LTS-256)
Java HotSpot(TM) 64-Bit Server VM 18.9 (build 11.0.25+9-LTS-256, mixed mode)
```

- 添加 java 应用

```Dockerfile
FROM rocky-jdk11:v1 

# Maintainer
LABEL authors="chijinjing@xinxianghf.com"

RUN /bin/cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo 'Asia/Shanghai' >/etc/timezone

EXPOSE 8080

WORKDIR /data/app/ 

COPY app.jar .  

ENTRYPOINT ["java", "-jar", "app.jar"]
```

- 构建镜像 & 测试

```Bash
[root@docker java-app]#docker build -t java-app:v1 .

[root@docker java-app]# docker run -d java-app:v1
c961d4e7a9cac10d58f973f0a2c62600b239bd0c159b58d743bdfc73d55d311d
[root@docker java-app]# 
[root@docker java-app]# docker ps 
CONTAINER ID   IMAGE         COMMAND               CREATED          STATUS          PORTS      NAMES
049f9f0a87da   java-app:v1   "java -jar app.jar"   16 seconds ago   Up 15 seconds   8080/tcp   peaceful_pasteur

[root@docker java-app]# 
[root@docker java-app]# docker inspect  049f9f0a87da | grep -i ipaddr 
            "SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.3",
                    "IPAddress": "172.17.0.3",

[root@docker java-app]# curl 172.17.0.3:8080/ping
pong

```

## 制作 前端应用 镜像 

Nginx 可以直接使用 官方的镜像即可，我们只需要修改 nginx.conf 配置文件，一起打包到镜像里就可以了。

Dockerfile:

```Bash
[root@docker docker]# cat Dockerfile 
FROM registry.cn-beijing.aliyuncs.com/xxhf/nginx:1.22.1 
COPY /dist  /usr/local/web/
COPY nginx.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g", "daemon off;"]

```

nginx.conf :

```Bash
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;
events {
  worker_connections  1024;
}
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
  access_log  /var/log/nginx/access.log  main;
  sendfile        on;
  keepalive_timeout  65;
  server {
    listen       80;
    server_name  localhost;
    real_ip_header X-Real-IP;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    location / {
      root   /usr/local/web;
      index  index.html;
      try_files $uri $uri/ /index.html;
    }
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
      root   /usr/share/nginx/html;
    }
  }
}

```

前端项目打包后会生成 dist 目录，一起打包到镜像里，目录结构如下：

```Bash
[root@docker front-dockerfile]# ll
total 12
drwxr-xr-x 7 root root 4096 Feb 21 16:05 dist
-rw-r--r-- 1 root root  120 Feb 24 18:28 Dockerfile
-rw-r--r-- 1 root root  933 Feb 21 16:05 nginx.conf

# 构建镜像 
[root@docker front-dockerfile]# docker build -t front-app:v1 . 

[root@docker front-dockerfile]# docker run -d front-app:v1      
d4abea7090d97f575687e0471e4f35065c3c9ac523df249f12250062672703ed

```

## [构建上下文 ](https://docs.docker.com/build/concepts/context/#dockerignore-files)

- 当运行 docker build  命令时，当前工作目录被称为构建上下文。build context 
- `docker build` 默认查找当前目录的 Dockerfile 作为构建输入，也可以通过 -f 指定 Dockerfile。

  - `docker build -f ./Dockerfile `
- 当 docker build 运行时，首先会构建上下文传输给 docker daemon，把没用的文件包含在构建上下文时，会导致传输时间长，构建需要的资源多，构建出的镜像大等问题。 

  - 试着找一下包含较多文件的目录试一下区别 
  - 可以通过  .dockerignore 文件从编译上下文排除文件 
- 需要确认构建上下文清晰，建议创建一个单独的目录放置 Dockerfile，并在目录中运行 `docker build`。

```Bash
docker build .
...
#16 [internal] load build context
#16 sha256:23ca2f94460dcbaf5b3c3edbaaa933281a4e0ea3d92fe295193e4df44dc68f85
#16 transferring context: 13.16MB 2.2s done
...
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-10/04.png)

## 8.  `.dockerignore ` 文件

在使用 Docker 构建镜像时，我们通常会将项目的文件和文件夹复制到镜像中。然而，并不是所有的文件和文件夹都需要被复制进镜像中，有时我们需要排除一些不需要的文件夹或文件。这就是使用 .dockerignore 文件的作用。 

.dockerignore 文件类似于 .gitignore 文件，它用于告诉 Docker 哪些文件或文件夹不应该被复制到镜像中。当构建镜像时，Docker 引擎会根据 .dockerignore 文件的规则来排除指定的文件和文件夹。

我们看一下例子：

```Plain Text
myapp/
├── app/
│   ├── index.js
│   ├── styles.css
│   └── images/
│       ├── logo.png
│       └── bg.png
├── config/
│   ├── db.js
│   └── secret.js
├── tests/
│   ├── test1.js
│   └── test2.js
├── README.md
└── .dockerignore
```

如果我们只想将 app 文件夹复制到镜像中，而不包含 config 和 tests 文件夹，我们可以在 .dockerignore 文件中添加以下内容：

```Plain Text
config/
tests/
```

.dockerignore 文件的规则

- #：用于添加注释。以 # 开头的行将被忽略。
- /path/to/folder：排除指定的文件夹以及其内容。
- /path/to/file：排除指定的文件。
- !：用于取反。如果文件夹被排除了，但是又想包含此文件夹内的某个文件，可以在前面加上 !。

```Plain Text
# 忽略所有 .txt 文件
*.txt

# 忽略所有文件夹和子文件夹中的 .log 文件
**/*.log

# 排除 .git 文件夹及其内容
.git/

# 排除 node_modules 文件夹及其内容
node_modules/

# 但是包含 node_modules/myapp 文件夹及其内容
!node_modules/myapp/
```

## 附录：

### 安装 Nginx 报错解决方案

Docker build 过程中，安装 Nginx 报错，开启宿主机的包转发参数 

```Bash
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf  && sysctl -p
```

### 多平台/架构 镜像 介绍

#### 查看 镜像 支持的平台架构  

```Bash
# 查看本地镜像支持的架构 
[root@docker ~]# docker inspect  nginx:1.22.1 | grep -i arch
        "Architecture": "amd64",

# 查看远端仓库中的镜像支持的架构 
[root@docker ~]# docker manifest inspect nginx:1.22.1  | grep architecture
            "architecture": "amd64",
            "architecture": "arm",
            "architecture": "arm",
            "architecture": "arm64",
            "architecture": "386",
            "architecture": "mips64le",
            "architecture": "ppc64le",
            "architecture": "s390x",

```

#### 制作多平台架构 镜像 

```Bash
# 确认 buildx 功能启用 
[root@docker dockerfile-multi-platform]# docker buildx create --use
quizzical_mahavira

# 构建多平台镜像，并推送到仓库 
docker buildx build --platform linux/amd64,linux/arm64 -t reg.xxhf.cc/library/rockylinux:v1  --push .

```

docker buildx 构建的镜像只保存在缓存中，本地无法查看，如果需要在本地显示，需要加 --load 参数

```Bash
# docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t reg.xxhf.cc/library/rockylinux:v1  . 
  
[+] Building 75.7s (11/11) FINISHED
... ... 
WARNING: No output specified with docker-container driver. Build result will only remain in the build cache. To push result image into registry use --push or to load image into docker use --load     
```

在本地加载镜像，注意 --load 参数只可以指定一个平台 

```Bash

# docker buildx build --platform linux/amd64 -t reg.xxhf.cc/library/rockylinux:v1 --load .

# docker images reg.xxhf.cc/library/rockylinux:v1
REPOSITORY                       TAG       IMAGE ID       CREATED          SIZE
reg.xxhf.cc/library/rockylinux   v1        b709c3d79580   11 minutes ago   183MB

```

### 镜像地址：

```Bash
ccr.ccs.tencentyun.com/chijinjing/rockylinux:9
registry.cn-beijing.aliyuncs.com/xxhf/mysql:8.0
```

### 官网文档 

https://docs.docker.com/build/

https://docs.docker.com/reference/dockerfile/#overview

https://docs.docker.com/build/building/best-practices/
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/RIxYwKc41iP8Lmky4AFcFQtqncd)
- 导入日期：2026-06-22