---
title: "Docker 存储与 Volume 管理"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-07/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-07"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 六. Docker 存储

Docker的镜像是由一系列的只读层组合而来的，当启动一个容器时，Docker加载镜像的所有只读层，并在最上层加入一个读写层。这个设计使得Docker可以提高镜像构建、存储和分发的效率，节省了时间和存储空间，然而也存在如下问题。

- 容器中的文件在宿主机上存在形式复杂，不能在宿主机上很方便地对容器中的文件进行访问。
- 多个容器之间的数据无法共享。
- 当删除容器时，容器产生的数据将丢失。

为了解决这些问题，Docker引入了数据卷（volume）机制。volume是存在于一个或多个容器中的特定文件或文件夹，这个目录以独立于联合文件系统的形式在宿主机中存在，并为数据的共享与持久化提供以下便利。

- volume 在容器创建时就会初始化，在容器运行时就可以使用其中的文件。
- volume 能在不同的容器之间共享和重用。
- 对volume中数据的操作会马上生效。
- 对volume中数据的操作不会影响到镜像本身。
- volume 的生存周期独立于容器的生存周期，即使删除容器，volume 仍然会存在，没有任何容器使用的volume也不会被Docker删除。

为容器添加volume，类似于Linux的mount操作，用户将一个文件夹作为volume挂载到容器上，可以很方便地将数据添加到容器中供其中的进程使用。多个容器可以共享同一个volume，为不同容器之间的数据共享提供了便利。

## 创建  Volume

使用 `docker volume` 命令对volume进行创建、查看和删除，与此同时，传统的 -v 参数创建volume的方式也得到了保留。

```Bash
[root@docker ~]# docker volume create  my-vol
my-vol
[root@docker ~]# docker volume  ls 
DRIVER    VOLUME NAME
local     my-vol

```

> Docker当前并未对volume的大小提供配额管理，用户在创建volume时也无法指定volume的大小。

使用docker run或docker create 创建新容器时，也可以使用 -v 标签为容器添加 volume，以下命令创建了一个随机名字的volume，并挂载到容器中的/data目录下。

```Bash
[root@docker ~]# docker run -d -v /data nginx:1.22.1 
d86be30b46742af2be89a20af18ab7096136b73a9e738798873f5f5864bf0180
[root@docker ~]# 
[root@docker ~]# docker volume  ls 
DRIVER    VOLUME NAME
local     9f82365c2f641f260ff90c87232cd3c1fbed82efda99cfedd71291c974fa5a46
local     my-vol
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS     NAMES
d86be30b4674   nginx:1.22.1   "/docker-entrypoint.…"   26 seconds ago   Up 25 seconds   80/tcp    stupefied_perlman
[root@docker ~]# 
[root@docker ~]# 
[root@docker ~]# docker exec -it d86be30b4674 /bin/sh
# df -h
Filesystem      Size  Used Avail Use% Mounted on
overlay          50G   13G   35G  28% /
tmpfs            64M     0   64M   0% /dev
tmpfs           1.9G     0  1.9G   0% /sys/fs/cgroup
shm              64M     0   64M   0% /dev/shm
/dev/vda1        50G   13G   35G  28% /data
tmpfs           1.9G     0  1.9G   0% /proc/acpi
tmpfs           1.9G     0  1.9G   0% /proc/scsi
tmpfs           1.9G     0  1.9G   0% /sys/firmware

```

以下命令创建了一个指定名字的volume，并挂载到容器中的/data目录下。

```Bash
[root@docker ~]# docker run -d -v vol_simple:/data nginx:1.22.1 
4f619f385985d97b3851cea6891b525980950ea13a7b112bd92d9ad8ffa0faa3
[root@docker ~]# 
[root@docker ~]# docker volume  ls 
DRIVER    VOLUME NAME
local     9f82365c2f641f260ff90c87232cd3c1fbed82efda99cfedd71291c974fa5a46
local     my-vol
local     vol_simple
[root@docker ~]# 
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS     NAMES
4f619f385985   nginx:1.22.1   "/docker-entrypoint.…"   14 seconds ago   Up 13 seconds   80/tcp    keen_northcutt
[root@docker ~]# 
[root@docker ~]# docker exec -it 4f619f385985 /bin/sh 
# df -h
Filesystem      Size  Used Avail Use% Mounted on
overlay          50G   13G   35G  28% /
tmpfs            64M     0   64M   0% /dev
tmpfs           1.9G     0  1.9G   0% /sys/fs/cgroup
shm              64M     0   64M   0% /dev/shm
/dev/vda1        50G   13G   35G  28% /data
tmpfs           1.9G     0  1.9G   0% /proc/acpi
tmpfs           1.9G     0  1.9G   0% /proc/scsi
tmpfs           1.9G     0  1.9G   0% /sys/firmware

```

Docker 在创建volume的时候会在宿主机` /var/lib/docker/volumes/ `中创建一个以` volume ID` 为名的目录，并将volume中的内容存储在名为data的目录下。

使用docker volume inspect命令可以获得该volume包括其在宿主机中该文件夹的位置等信息。

```Bash
sudo docker volume inspect vol_simple
[
    {
      "Name": "vol_simple",
      "Driver": "local",
      "Mountpoint": "/var/lib/docker/volumes/vol_simple/_data"
    }
]
```

## 挂载 Volume

用户在使用docker run或docker create创建新容器时，可以使用-v标签为容器添加volume。用户可以将自行创建或者由 Docker 创建的 volume 挂载到容器中，也可以将宿主机上的目录或者文件作为 volume 挂载到容器中。下面分别介绍这两种挂载方式。

### 挂载用户自行创建的 Volume

用户可以使用如下命令创建volume，并将其创建的volume挂载到容器中的 /data 目录下。

```Bash
docker volume  create --name vol_nginx 
docker run -d -v vol_nginx:/data nginx:1.22.1
```

如果用户不执行第一条命令而直接执行第二条命令的话，Docker会代替用户来创建一个名为 vol_nginx 的 volume，并将其挂载到容器中的 /data目录下。

### 挂载宿主机 目录 

Docker 也允许我们将宿主机上的目录挂载到容器中。

```Bash
docker run -d -v /data/docker-volume:/data nginx:1.22.1
```

```YAML
# 宿主机目录 
[root@docker ~]# ll /data/docker-volume/
total 4
-rw-r--r-- 1 root root 11 Nov  4 15:50 docker-volume.txt
[root@docker ~]# 
[root@docker ~]# docker run -d -v /data/docker-volume:/data nginx:1.22.1
3af51c62e5c2b936911c43857d714052d006e4bae378e3552d077081fdc44738
[root@docker ~]# 
[root@docker ~]# docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
3af51c62e5c2   nginx:1.22.1   "/docker-entrypoint.…"   4 seconds ago   Up 4 seconds   80/tcp    condescending_agnesi
[root@docker ~]# 
# 容器内目录 
[root@docker ~]# docker exec 3af51c62e5c2 ls -l /data/
total 4
-rw-r--r-- 1 root root 11 Nov  4 07:50 docker-volume.txt

```

使用以上命令将宿主机中的/data/docker-volume 文件夹作为一个 volume 挂载到容器中 /data 目录下。

文件夹必须使用绝对路径，如果宿主机中不存在 /data/docker-volume，将创建一个空文件夹。

在 /data/docker-volume 文件夹中的所有文件或文件夹可以在容器的 /data 文件夹下被访问。如果镜像中原本存在 /data  文件夹，该文件夹下原有的内容将被隐藏，以保持与宿主机中的文件夹一致。

### 挂载宿主机文件 

用户还可以将单个的文件作为 volume 挂载到容器中。

```Bash
docker run -d -v /data/docker-volume/docker-volume.txt:/data/docker-volume.txt nginx:1.22.1
```

```Bash
[root@docker ~]# cat /data/docker-volume/docker-volume.txt 
docker-vol
[root@docker ~]# 
[root@docker ~]# docker run -d -v /data/docker-volume/docker-volume.txt:/data/docker-volume.txt nginx:1.22.1
d64627367a9d94b339084dc66cd2b322eb5b40178cc975800cba592189591ee0
[root@docker ~]# 
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
d64627367a9d   nginx:1.22.1   "/docker-entrypoint.…"   4 seconds ago   Up 4 seconds   80/tcp    kind_carver
[root@docker ~]# 
[root@docker ~]# docker exec d64627367a9d cat /data/docker-volume.txt
docker-vol

```

使用上述命令将主机中的 `/data/docker-volume/docker-volume.txt ` 文件作为一个volume挂载到容器中的 /data/docker-volume.txt 。文件必须使用绝对路径。

### 指定挂载权限

将主机上的文件或文件夹作为 volume 挂载时，可以使用 `:ro `指定该 volume 为只读。

```Bash
[root@docker ~]# docker run -d -v /data/docker-volume:/data:ro nginx:1.22.1
911aac1e6d6604e85ebcc5bb795cf94d2fd71dfff560b7b96c25aa327987978f
[root@docker ~]# 
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
911aac1e6d66   nginx:1.22.1   "/docker-entrypoint.…"   4 seconds ago   Up 3 seconds   80/tcp    reverent_bardeen
[root@docker ~]# 
[root@docker ~]# docker exec -it 911aac1e6d66 /bin/sh
# cd /data
# mkdir demo
mkdir: cannot create directory 'demo': Read-only file system
# 
# ls
docker-volume.txt
# 

```

### 挂载多个卷

在使用docker run或docker create创建新容器时，可以使用多个 -v 标签为容器添加多个volume。

```Bash
docker run -d -v vol-name:/data1 -v /data2 -v /host/dir:/container/dir:ro nginx:1.22.1
```

## 使用 Dockerfile 添加 Volume

使用 VOLUME 指令向容器添加 volume。

```Bash
VOLUME /data
```

在使用 docker build 命令生成镜像并且以该镜像启动容器时会挂载一个 volume 到 /data 目录下。

`docker run -v /data   `

## 共享 Volume

在使用 docker run或docker create创建新容器时，可以使用 `--volumes-from` 标签使得容器与已有的容器共享volume。

```Bash
# --volumes-from 后面的参数是 容器名
docker run --name nginx-02 -d --volumes-from nginx-01 nginx:1.22.1 
```

```Bash
[root@docker ~]# ll /data/docker-volume/nginx-conf/
total 0
-rw-r--r-- 1 root root 0 Nov  4 16:53 nginx.conf

[root@docker ~]# docker run --name nginx-01 -d -v /data/docker-volume/nginx-conf/:/data nginx:1.22.1 
5a9a074fad31f668e153e78b2e08bf54e5f344f83e020adf361a0f24ceb49813
[root@docker ~]# 
[root@docker ~]# docker run --name nginx-02 -d --volumes-from nginx-01 nginx:1.22.1 
7fe10511da7a11329625ddb4747fab06cc3b088a006182bb7bbcfb1d872064a7

[root@docker ~]# docker exec nginx-01 ls /data
nginx.conf
[root@docker ~]# 
[root@docker ~]# docker exec nginx-02 ls /data
nginx.conf

```

新创建的容器 nginx-02 与之前创建的容器 nginx-01 共享 volume。

## 删除 Volume

如果创建容器时从容器中挂载了volume，在 `/var/lib/docker/volumes` 下会生成与 volume 对应的目录，使用docker rm 删除容器并不会删除与 volume 对应的目录，这些目录会占据不必要的存储空间，即使可以手动删除，因为有些随机生成的目录名称是无意义的随机字符串，要查找它们与容器的对应关系也十分麻烦。所以在删除容器时需要对容器的 volume 妥善处理。

在删除容器时一并删除volume有以下两种方法。

- 使用 `docker rm -v <container_name> `删除容器。
- 在运行容器时使用` docker run --rm`,  --rm 标签会在容器停止运行时删除容器以及容器所挂载的volume。

> 注意：
> 
> 1. 在使用 docker volume rm 删除 volume 时，只有在没有任何容器使用时，该 volume 才能成功删除。
> 2. 两种方法只会删除未命名的 volume，而对用户指定名字的 volume 进行保留。
> 3. 如果 volume 是从宿主机中挂载的，无论对容器进行任何操作都不会导致其在宿主机中被删除。

## 在 Docker 与 宿主机间复制文件

```Bash
[root@docker ~]# docker cp  --help 

Usage:  docker cp [OPTIONS] CONTAINER:SRC_PATH DEST_PATH|-
        docker cp [OPTIONS] SRC_PATH|- CONTAINER:DEST_PATH

```

```Bash
# 宿主文件 yaml.tgz 复制到容器中 
[root@docker ~]# ls
kube-apiserver.yaml  yaml  yaml.tgz
[root@docker ~]# 
[root@docker ~]# docker run -d --name nginx-01 nginx:1.22.1 
e31307a16e24aad382644d0f36e25ac867f6e37409075fa2bb95a57e6a8bfc16
[root@docker ~]# 
[root@docker ~]# docker cp /root/yaml.tgz  nginx-01:/tmp/
[root@docker ~]# 
[root@docker ~]# docker exec nginx-01 ls /tmp/
yaml.tgz

```

## -v vs --mount 

-v  /host/dir:/data:ro

     vol-name:/data:ro

### 挂载 Volume

```Bash
docker run -d \
  --name devtest \
  --mount type=volume,source=myvol2,target=/app \
  nginx:latest
  
```

### 挂载本地目录 

```Bash
docker run -d \
  -it \
  --name devtest \
  --mount type=bind,source="$(pwd)"/target,target=/app \
  nginx:latest
```

```Bash
docker run -d \
  -it \
  --name devtest \
  --mount type=bind,source="$(pwd)"/target,target=/app,readonly \
  nginx:latest
```

### 挂载 tmpfs 

```Bash
docker run -d \
  -it \
  --name tmptest \
  --mount type=tmpfs,destination=/app \
  nginx:latest
```

### -v 和 --mount 的区别 

- -v 或 --volume：由三个字段组成，用冒号字符（:）分隔。这些字段必须按照正确的顺序，并且每个字段的含义不太清晰。
- --mount：由多个键值对组成，用逗号分隔，每个键值对由<key>=<value>组成。--mount 语法比 -v 或 --volume 更冗长，但键的顺序并不重要，并且该标志的值更易于理解。
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/GBcpwZjeTilgQyk8nitcRBlUnoh)
- 导入日期：2026-06-22