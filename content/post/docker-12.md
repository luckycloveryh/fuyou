---
title: "四. 镜像存储机制"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-12/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-12"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 四. 镜像存储机制

## 什么是 Docker 镜像 

Docker镜像是一个只读的Docker容器模板，含有启动Docker容器所需的文件系统结构及其内容，因此是启动一个Docker容器的基础。Docker镜像的文件内容以及一些运行Docker容器的配置文件组成了Docker容器的静态文件系统运行环境——rootfs。可以这么理解，Docker镜像是Docker容器的静态视角，Docker容器是Docker镜像的运行状态。

rootfs是Docker容器在启动时内部进程可见的文件系统，即Docker容器的根目录。rootfs通常包含一个操作系统运行所需的文件系统，例如可能包含典型的类Unix操作系统中的目录系统，如 `/dev、/proc、/bin、/etc、/lib、/usr、/tmp` 及运行Docker容器所需的配置文件、工具等。

在传统的Linux操作系统内核启动时，首先挂载一个只读（read-only）的 rootfs，当系统检测其完整性之后，再将其切换为读写（read-write）模式。而在Docker架构中，当Docker daemon为Docker容器挂载rootfs时，沿用了Linux内核启动时的方法，即将rootfs设为只读模式。在挂载完毕之后，利用联合挂载（union mount）技术在已有的**只读rootfs上再挂载一个读写层**。这样，可读写层处于Docker容器文件系统的最顶层，其下可能联合挂载多个只读层，只有在Docker容器运行过程中文件系统发生变化时，才会把变化的文件内容写到可读写层，并隐藏只读层中的老版本文件。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-12/01.png)

## OverlayFS 存储原理  

OverlayFS 结构分为三个层: LowerDir、Upperdir、MergedDir

- LowerDir （只读层）  
只读的 image layer，其实就是 rootfs, 在使用 Dockfile 构建镜像的时候, Image Layer 可以分很多层，所以对应的 lowerdir 会很多（源镜像）。
- UpperDir （读写层）  
upperdir 则是在 lowerdir 之上的一层, 为读写层。容器在启动的时候会创建, 所有对容器的修改, 都是在这层。 比如容器启动写入的日志文件，或者是应用程序写入的临时文件。
- MergedDir （合并层）  
merged 目录是容器的挂载点,在用户视角能够看到的所有文件，都是从这层展示的。 

- WorkDir （工作目录）

    workdir 是 OverlayFS 内部用于处理写入操作的 **临时目录**。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-12/02.png)

OverlayFS 演示：

```Bash
# 创建需要的目录和文件
cd /tmp/
mkdir upper lower merged work
echo "I'm from lower" > lower/in_lower.txt 
echo "I'm from upper" > upper/in_upper.txt
# `in_both` is in both directories
echo "I'm from lower" > lower/in_both.txt 
echo "I'm from upper" > upper/in_both.txt 

# 挂载 overlay 文件系统 
mount -t overlay overlay \
      -o lowerdir=/tmp/lower,upperdir=/tmp/upper,workdir=/tmp/work \
          /tmp/merged
```

查看文件合并后的效果：

```Bash
[root@docker tmp]# cd /tmp/merged/
[root@docker merged]# cat in_lower.txt 
I'm from lower
[root@docker merged]# cat in_upper.txt
I'm from upper
# upper 层会覆盖 lower 层的文件 
[root@docker merged]# cat in_both.txt 
I'm from upper

```

创建一个新文件 

```Bash
[root@docker tmp]# echo 'new file' > merged/new_file
[root@docker tmp]# ls -l */new_file
-rw-r--r-- 1 root root 9 Oct 10 16:10 merged/new_file
-rw-r--r-- 1 root root 9 Oct 10 16:10 upper/new_file

```

删除一个文件 

```Bash
# 删除 merged 层的文件  in_both.txt
[root@docker tmp]#     rm merged/in_both.txt

# 在 merged 层找不到文件  in_both.txt
[root@docker tmp]# ls -l merged/in_both.txt lower/in_both.txt upper/in_both.txt
ls: cannot access merged/in_both.txt: No such file or directory
-rw-r--r-- 1 root root   15 Oct 10 16:01 lower/in_both.txt
c--------- 1 root root 0, 0 Oct 10 16:12 upper/in_both.txt

# 在 upper 层还可以看到 in_both.txt, 但文件类型是 c (character )
[root@docker tmp]# ls -l upper/in_both.txt 
c--------- 1 root root 0, 0 Oct 10 16:12 upper/in_both.txt

```

## 分析镜像存储结构 

下载一个 redis6 的镜像 

```Bash
[root@docker ~]# docker pull redis:6
6: Pulling from library/redis
a2abf6c4d29d: Pull complete 
c7a4e4382001: Pull complete 
4044b9ba67c9: Pull complete 
c8388a79482f: Pull complete 
413c8bb60be2: Pull complete 
1abfd3011519: Pull complete 
Digest: sha256:db485f2e245b5b3329fdc7eff4eb00f913e09d8feb9ca720788059fdc2ed8339
Status: Downloaded newer image for redis:6
docker.io/library/redis:6

```

使用`docker inspect`命令查看镜像存储结构 

```Bash
        "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/7e4326877b790c7c20ae410c45ed2fee3c4846abccb3fd9e9078db644ae94f21/diff:/var/lib/docker/overlay2/0ea57f86b6e450766574019a4d8169c672aa688ebcd7e72155866c8d03b28d81/diff:/var/lib/docker/overlay2/63eec74fddbf61d5a5463c4efc705fda3db1d7ed15574207b4a4c6c6d1da7caa/diff:/var/lib/docker/overlay2/dfe479f8f8050b8ca5739f6c9fecaeba2acd281ec35d76af42e74497ff50423a/diff:/var/lib/docker/overlay2/e9001743d00736bb1f52cd6ffb4ab997d8a1fa396a49f15d13ad68bfffe94d17/diff",
                "MergedDir": "/var/lib/docker/overlay2/e3d66951da5b2e15f35b7341a3d2b518d6932574eae7e9adcf41b18f7c7f7707/merged",
                "UpperDir": "/var/lib/docker/overlay2/e3d66951da5b2e15f35b7341a3d2b518d6932574eae7e9adcf41b18f7c7f7707/diff",
                "WorkDir": "/var/lib/docker/overlay2/e3d66951da5b2e15f35b7341a3d2b518d6932574eae7e9adcf41b18f7c7f7707/work"
            },
            "Name": "overlay2"
        },

```

Docker 镜像在磁盘上解压后的目录：

```Bash
[root@docker ~]# ll /var/lib/docker/overlay2/
total 28
drwx--x--- 4 root root 4096 Oct 10 17:30 0ea57f86b6e450766574019a4d8169c672aa688ebcd7e72155866c8d03b28d81
drwx--x--- 4 root root 4096 Oct 10 17:30 63eec74fddbf61d5a5463c4efc705fda3db1d7ed15574207b4a4c6c6d1da7caa
drwx--x--- 4 root root 4096 Oct 10 17:30 7e4326877b790c7c20ae410c45ed2fee3c4846abccb3fd9e9078db644ae94f21
drwx--x--- 4 root root 4096 Oct 10 17:30 dfe479f8f8050b8ca5739f6c9fecaeba2acd281ec35d76af42e74497ff50423a
drwx--x--- 4 root root 4096 Oct 10 17:30 e3d66951da5b2e15f35b7341a3d2b518d6932574eae7e9adcf41b18f7c7f7707
drwx--x--- 3 root root 4096 Oct 10 17:30 e9001743d00736bb1f52cd6ffb4ab997d8a1fa396a49f15d13ad68bfffe94d17
drwx------ 2 root root 4096 Oct 10 17:30 l

```

## 运行中容器的存储结构 

启动 redis:6 镜像 

```Bash
[root@docker ~]# docker run -d --name redis6 redis:6 

```

使用 `docker inspect` 命令查看容器详情

```Bash
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE     COMMAND                  CREATED          STATUS          PORTS      NAMES
94b7bf4eb2d4   redis:6   "docker-entrypoint.s…"   39 seconds ago   Up 38 seconds   6379/tcp   redis6
[root@docker ~]# 
[root@docker ~]# docker inspect redis6
...
        "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/b2b5ec5141bc9e6f4732904c681adf5d26903367f5f2d0935c94f0cb91084189-init/diff:/var/lib/docker/overlay2/e3d66951da5b2e15f35b7341a3d2b518d6932574eae7e9adcf41b18f7c7f7707/diff:/var/lib/docker/overlay2/7e4326877b790c7c20ae410c45ed2fee3c4846abccb3fd9e9078db644ae94f21/diff:/var/lib/docker/overlay2/0ea57f86b6e450766574019a4d8169c672aa688ebcd7e72155866c8d03b28d81/diff:/var/lib/docker/overlay2/63eec74fddbf61d5a5463c4efc705fda3db1d7ed15574207b4a4c6c6d1da7caa/diff:/var/lib/docker/overlay2/dfe479f8f8050b8ca5739f6c9fecaeba2acd281ec35d76af42e74497ff50423a/diff:/var/lib/docker/overlay2/e9001743d00736bb1f52cd6ffb4ab997d8a1fa396a49f15d13ad68bfffe94d17/diff",
                "MergedDir": "/var/lib/docker/overlay2/b2b5ec5141bc9e6f4732904c681adf5d26903367f5f2d0935c94f0cb91084189/merged",
                "UpperDir": "/var/lib/docker/overlay2/b2b5ec5141bc9e6f4732904c681adf5d26903367f5f2d0935c94f0cb91084189/diff",
                "WorkDir": "/var/lib/docker/overlay2/b2b5ec5141bc9e6f4732904c681adf5d26903367f5f2d0935c94f0cb91084189/work"
            },
            "Name": "overlay2"
        },
...
```

向容器运行时的 UpperDir 层写入文件 upper.txt 

```Bash
[root@docker ~]# touch /var/lib/docker/overlay2/b2b5ec5141bc9e6f4732904c681adf5d26903367f5f2d0935c94f0cb91084189/diff/upper.txt
```

## 附录：

删除主机上所有镜像 和 容器，先删容器再删镜像 

```Bash
#停止正在运行的容器
docker stop 
# 删除所有容器
docker rm $(docker ps -a | awk '{print $1}' | grep -v "CONTAINER")
# 删除所有镜像 
docker rmi $(docker image ls -q)
```

Docker 数据目录，修改 docker 配置文件` /etc/docker/daemon.json`

```Bash
{
  "data-root": "/data/docker" 
}
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/RfgZwkH4Ji68QfkruyRcfU8VnAf)
- 导入日期：2026-06-22