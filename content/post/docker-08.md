---
title: "Docker 资源限制与 cgroups"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["7. Docker"]
slug: "docker-08"
description: "介绍《Docker 资源限制与 cgroups》，涵盖cgroup 介绍、mount | grep cgroup和cgroup v1: 限制进程可使用的 CPU 资。"
---
# 七、Docker 资源限制

## cgroup 介绍

cgroup 是 Linux 内核提供的一种机制，这种机制可以根据需求把一系列系统任务及其子任务整合（或分隔）到按资源划分等级的不同组内，从而为系统资源管理提供一个统一的框架。

通俗地说，cgroup 可以限制、记录进程组所使用的物理资源（包括 CPU、Memory、IO等），为容器实现虚拟化提供了基本保证，是构建 Docker 等一系列虚拟化管理工具的基石。

实现 cgroup 的主要目的是为不同用户层面的资源管理，提供一个统一化的接口。从单个任务的资源控制到操作系统层面的虚拟化，cgroup 提供了以下四大功能。

- 资源限制：cgroup 可以对任务使用的资源总额进行限制。如设定应用运行时使用内存的上限，一旦超过这个配额就发出 OOM（Out of Memory）提示。
- 优先级分配：通过分配的CPU时间片数量及磁盘IO带宽大小，实际上就相当于控制了任务运行的优先级。
- 资源统计：cgroup 可以统计系统的资源使用量，如CPU使用时长、内存用量等，这个功能非常适用于计费。
- 任务控制：cgroup 可以对任务执行挂起、恢复等操作。

cgroup 目前有两个版本，在Rockylinux 9 中使用的是 cgroup  v2。 

如何判断当前操作系统使用的是哪个版本，在操作系统中执行` mount  | grep cgroup  `命令：

如下输出 表示  cgroup v1 

```bash
# mount  | grep cgroup 
tmpfs on /sys/fs/cgroup type tmpfs (ro,nosuid,nodev,noexec,mode=755)
cgroup on /sys/fs/cgroup/systemd type cgroup (rw,nosuid,nodev,noexec,relatime,xattr,release_agent=/usr/lib/systemd/systemd-cgroups-agent,name=systemd)
cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,nosuid,nodev,noexec,relatime,cpuacct,cpu)

```

下面的输出是 cgroup v2 。 

```Bash
# mount | grep cgroup 
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime,nsdelegate,memory_recursiveprot)
```

cgroup v1 和 v2 版本在资源限额的配置方法不太一样， v2 相对 v1 会更简洁一些，下面我们看一下这两个版本如何限制进程可使用的 CPU 资源 。 

###  cgroup v1:  限制进程可使用的 CPU 资源

- 在 cgroup cpu 子系统目录中创建目录结构

```Bash
cd /sys/fs/cgroup/cpu
mkdir cpudemo
cd cpudemo
```

- 运行 busyloop 程序

执行 top 查看 CPU 使用情况，CPU 占用 200%

- 通过 cgroup 限制 cpu

```Bash
cd /sys/fs/cgroup/cpu/cpudemo
```

- 把进程添加到 cgroup 进程配置组

```Bash
echo ps -ef|grep busyloop|grep -v grep|awk '{print $2}' > cgroup.procs
```

- 设置 cpuquota

```Bash
echo 10000 > cpu.cfs_quota_us
```

- 执行 top 查看 CPU 使用情况，CPU 占用变为 10%

### cgroup v2: 限制进程可使用的 CPU 资源

1. 创建一个目录 example ，这个目录表示一个进程组

```Bash
cd /sys/fs/cgroup
mkdir example 
```

1. 在 example 进程组中会有各种配置文件 

```Bash
[root@docker example]# ls
cgroup.controllers               cpu.weight.nice           memory.low
cgroup.events                    hugetlb.1GB.current       memory.max
cgroup.freeze                    hugetlb.1GB.events        memory.min
cgroup.kill                      hugetlb.1GB.events.local  memory.numa_stat
cgroup.max.depth                 hugetlb.1GB.max           memory.oom.group
cgroup.max.descendants           hugetlb.1GB.numa_stat     memory.peak

```

1. 限制进程 可以使用的 CPU 资源 

先启动一个占用 CPU 的程序，找到程序的进程号

```Bash
# ps -ef | grep busyloop
root      155677  115803 99 16:14 pts/2    00:01:06 ./busyloop

# 把进程号添加到 cgroup.procs 文件 中
# echo 155677 >> cgroup.procs

# v2 版本限制cpu的文件使用 cpu.max, 这样会限制 155677 进程最多使用 1 核 CPU.
# echo "100000 100000" > cpu.max 
```

## Docker 限制容器 CPU 资源 

运行一个容器，限制可以使用2个cpu，使用 stress 占用4个cpu 

```Dockerfile
[root@docker ~]# docker run -it --rm --cpus=2 registry.cn-beijing.aliyuncs.com/xxhf/stress /bin/bash
root@2e7bdd1296cb:/# 
root@2e7bdd1296cb:/# 
root@2e7bdd1296cb:/# stress -c 4 

```

观察容器CPU利用率

```Dockerfile
CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT   MEM %     NET I/O     BLOCK I/O   PIDS
2e7bdd1296cb   nifty_banach   200.56%   788KiB / 15GiB      0.01%     656B / 0B   0B / 0B     6

```

容器 CPU 的负载为 200%，它的含义为单个 CPU 负载的两倍。我们也可以把它理解为有两颗 CPU 在 100% 的为它工作。

观察宿主机CPU利用率

```Dockerfile
top - 22:45:42 up 27 days, 13:25,  3 users,  load average: 2.66, 1.03, 0.81
Tasks: 160 total,   5 running, 155 sleeping,   0 stopped,   0 zombie
%Cpu0  :  0.3 us,  0.0 sy,  0.0 ni, 99.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu1  : 49.8 us,  0.0 sy,  0.0 ni, 50.2 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu2  :  0.3 us,  0.3 sy,  0.0 ni, 99.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu3  : 50.5 us,  0.0 sy,  0.0 ni, 49.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu4  :  0.7 us,  0.3 sy,  0.0 ni, 99.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu5  : 49.5 us,  0.0 sy,  0.0 ni, 50.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu6  : 50.3 us,  0.0 sy,  0.0 ni, 49.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu7  :  0.3 us,  0.3 sy,  0.0 ni, 99.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem : 15731672 total, 11204824 free,   511580 used,  4015268 buff/cache
KiB Swap:        0 total,        0 free,        0 used. 14883056 avail Mem 

```

四个 CPU 的负载都是 50%，加起来容器消耗的 CPU 总量就是两个 CPU 100% 的负载。

## Docker 限制容器内存资源 

```Dockerfile
[root@docker ~]# docker run -it --rm -m 300M  registry.cn-beijing.aliyuncs.com/xxhf/stress /bin/bash
root@c8bb524c6f28:/# 
root@c8bb524c6f28:/# stress --vm 1 --vm-bytes 300M
stress: info: [11] dispatching hogs: 0 cpu, 0 io, 1 vm, 0 hdd
stress: FAIL: [11] (416) <-- worker 12 got signal 9
stress: WARN: [11] (418) now reaping child worker processes
stress: FAIL: [11] (452) failed run completed in 0s
root@c8bb524c6f28:/# 
root@c8bb524c6f28:/# stress --vm 1 --vm-bytes 290M
stress: info: [13] dispatching hogs: 0 cpu, 0 io, 1 vm, 0 hdd

```

使用 `docker status` 命令 可以查看容器资源使用情况 ： 

```Dockerfile
CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT   MEM %     NET I/O     BLOCK I/O   PIDS
c8bb524c6f28   objective_knuth   100.17%   282.9MiB / 300MiB   94.30%    656B / 0B   0B / 0B     3

```

```Dockerfile
top - 23:16:02 up 27 days, 13:55,  3 users,  load average: 1.00, 1.00, 1.25
Tasks: 157 total,   3 running, 154 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us, 10.6 sy,  0.0 ni, 87.1 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem : 15731672 total, 10995496 free,   709948 used,  4026228 buff/cache
KiB Swap:        0 total,        0 free,        0 used. 14684688 avail Mem 

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND                                                 
22456 root      20   0  300652 206336     48 R 100.0  1.3   4:42.47 stress   
```

如果操作系统有swap 分区，容器会使用swap分区来保存内存文件，需要使用 'stress --vm 1 --vm-bytes 600M' 才会触发限制。 

或者加一个参数` --memory-swap=300M`，表示 可以使用的内存和交换空间的总和

```Bash
docker run -it --rm -m 300M --memory-swap=300M registry.cn-beijing.aliyuncs.com/xxhf/stress /bin/bash
```

> 按照官方文档的理解，如果指定 `-m` 内存限制时不添加 `--memory-swap` 选项，则表示容器中程序可以使用 100M 内存和 100M swap 内存。默认情况下，`--memory-swap` 会被设置成 memory 的 2倍。

限制容器使用 256M 内存，交换分区可以使用 512M。

```Bash
docker run -it --memory 256m --memory-swap 512m nginx:1.22.1 
```

为容器保留 128M 内存空间，确保在资源有限的环境中，关键业务也可以正常运行。

```Bash
docker run -it --memory-reservation 128m nginx:1.22.1 
```

监控容器内存使用

```Bash
docker stats --format "table {{.Name}}\t{{.MemUsage}}"
```

## 附录： 

Java 内存溢出

```Bash

# 初始堆大小（-Xms）：设置 JVM 启动时的堆内存大小。
# 最大堆大小（-Xmx）：设置堆的最大内存限制。
# -XX:+HeapDumpOnOutOfMemoryError：启用在发生 OOM 时自动生成堆转储。
# -XX:HeapDumpPath：指定堆转储文件的保存路径（如果没有指定，默认路径是工作目录）。
java -Xms2048m -Xmx2048m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp -jar appname.jar
```

https://docs.docker.com/config/containers/resource_constraints/

https://docs.kernel.org/admin-guide/cgroup-v2.html

镜像：

registry.cn-beijing.aliyuncs.com/xxhf/stress:latest
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/S9zdwlTS0iOUeTkfrpHckEy3nyd)
- 导入日期：2026-06-22