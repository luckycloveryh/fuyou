---
title: "MooseFS 分布式存储系统部署"
date: 2026-07-08T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-09/1200/600"
draft: false
tags: ["集群", "Obsidian"]
categories: ["集群"]
slug: "cluster-09"
description: "从 Obsidian 导入的 集群 学习笔记"
---
### MooseFS 分布式存储系统

#### 一、MooseFS 概述与核心特性  

##### 1.1 什么是 MooseFS？  
MooseFS（MFS）是一款开源的分布式文件系统（GPLv3 协议），提供高可用、可扩展的存储解决方案。其核心设计基于客户机/服务器模式，支持 POSIX 兼容接口，适用于中小规模企业级存储需求。  

##### 1.2 核心特性  
- 开源与兼容性  
  - 完全兼容 POSIX 标准，支持标准文件操作（如读写、重命名、删除）。  
  - 客户端通过 FUSE 挂载，透明访问分布式存储。  

- 高可用与冗余  
  - 支持多副本存储（副本数可调）及纠删码（EC），提供比传统 RAID 更高的容错能力。  
  - 元数据定时和实时备份（Metalogger），支持快速故障恢复。  

- 动态扩展  
  - 支持在线扩容，存储容量和性能随 Chunk Server 节点增加线性提升。  

- 数据安全  
  - 回收站功能：删除文件可保留指定时长（默认 24 小时），支持系统级回滚。  
  - 快照（Snapshot）：实时创建文件或目录快照，用于数据恢复或版本控制。  

```text
* 纠删码（EC）是一种数据冗余技术，通过数学算法将原始数据分割为多个数据分片（如 k 个），并生成额外的校验分片（如 m 个）。当部分分片丢失时，可通过剩余分片重建完整数据。相比多副本冗余（如 3 副本占用 3 倍存储），EC 仅需少量校验分片（如 ec3+2 存储开销为 1.67 倍）。

* FUSE 是一种用户空间文件系统框架，允许非特权用户在用户态实现文件系统逻辑，无需修改内核代码。

* 快照是文件系统在某一时间点的只读副本，基于 写时复制（Copy-on-Write, COW） 技术实现
```



---

#### 二、架构与工作原理  

##### 2.1 系统架构  
| 角色               | 功能描述                                  | 关键端口 |
|------------------------|---------------------------------------------|-------------|
| Master Server      | 管理元数据（文件名、存储位置）、调度存储节点    | 源：9419-9421 |
| Metalogger Server  | 实时定时备份 Master 元数据信息，用于故障恢复      | 目标：9419   |
| Chunk Server       | 存储实际数据块（默认 64MB/块），响应读写请求    | 目标：9420<br />源：9422 |
| Client             | 通过 FUSE 挂载 MFS，提供本地文件系统访问体验    | 目标：9421<br />目标：9422 |

##### 2.2 数据读写流程  
###### 读数据过程  
1. 客户端向 Master 请求文件元数据（如存储位置）。  

2. Master 返回数据所在的 Chunk Server IP、Port 及 Chunk ID。  

3. 客户端直接与 Chunk Server 通信获取数据。  

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-09/01.png)

###### 写数据过程  

1. 客户端向 Master 申请写入权限及存储位置。  

2. Master 分配新 Chunk 并通知 Chunk Server 创建块。  

3. 客户端将数据写入指定的 Chunk Server。  

4. 写入成功后，客户端通知 Master 更新元数据。  

   ![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-09/02.png)

###### 删除/修改流程  
- 删除文件：Master 标记元数据为删除，异步清理 Chunk Server 上的数据块。  
- 修改文件：创建临时交换文件（.swp），完成后替换原文件并删除旧数据块。  

---

#### 三、环境准备与部署  

##### 3.1 节点规划  
| IP 地址       | 角色               | 硬件配置              |
|--------------------|------------------------|---------------------------|
| 192.168.88.110    | Master Server          | 8 核 CPU / 32GB RAM / 200GB SSD |
| 192.168.88.120    | Metalogger Server      | 4 核 CPU / 8GB RAM / 200GB SSD |
| 192.168.88.130    | Chunk Server 1         | 8 核 CPU / 16GB RAM / 4TB HDD x2 |
| 192.168.88.140    | Chunk Server 2         | 8 核 CPU / 16GB RAM / 4TB HDD x2 |
| 192.168.88.150    | Client                 | 4 核 CPU / 4GB RAM / 100GB SSD |

##### 3.2 系统基础配置（所有节点）  
```bash  
# 关闭防火墙与 SELinux  
$ systemctl disable --now firewalld  
$ setenforce 0  
$ sed -i 's/SELINUX=enforcing/SELINUX=permissive/g' /etc/selinux/config  

# 添加 MooseFS 官方仓库  
$ curl -o /etc/yum.repos.d/moosefs.repo http://repository.moosefs.com/MooseFS-4-el9.repo  
$ dnf clean all && dnf makecache  
```

---

#### 四、服务端部署  

##### 4.1 Master Server 安装  
```bash  
# 安装 Master 组件  
$ dnf install -y moosefs-master moosefs-cgi moosefs-cgiserv

# 启动服务  
$ systemctl enable --now moosefs-master  

# 验证端口监听  
$ netstat -tulnp | grep mfsmaster  
```

##### 4.2 Metalogger Server 配置  (选配)
```bash  
# 安装组件  
$ dnf install -y moosefs-metalogger  

# 修改配置文件  
$ vi /etc/mfs/mfsmetalogger.cfg  
---------------------------------  
MASTER_HOST = 192.168.88.110  
META_DOWNLOAD_FREQ = 1  # 每小时同步元数据  
---------------------------------  

# 启动服务  
$ systemctl enable --now moosefs-metalogger  
```

##### 4.3 Chunk Server 部署  
```bash  
# 提前准备好要共享的挂载点（设备的分区，格式化，挂载）

# 安装组件  
$ dnf install -y moosefs-chunkserver  

# 创建存储目录并授权  
$ mkdir -p /mnt/mfs_chunks  
$ chown -R mfs:mfs /mnt/mfs_chunks  

# 注册存储路径  
$ echo "/mnt/mfs_chunks" > /etc/mfs/mfshdd.cfg  

# 也得知道谁是主服务器
$ vim /etc/mfs/mfschunkserver.cfg
MASTER_HOST = 192.168.88.110

# 启动服务  
$ systemctl enable --now moosefs-chunkserver  
```

---

#### 五、客户端挂载与使用  

##### 5.1 安装客户端工具  
```bash  
$ dnf install -y moosefs-client fuse3  
$ modprobe fuse  # 加载内核模块  
```

##### 5.2 挂载文件系统  
```bash  
$ mkdir /mnt/mfs_client  
$ mfsmount /mnt/mfs_client -H 192.168.5.130
$ mountpoint -m 挂载 trash 目录。
# 验证挂载  
$ df -hT | grep mfs

挂载不能在fstab里面，推荐在/etc/rc.local
```

##### 5.3 存储策略管理  
```bash  
# 设置目录级冗余（3 副本）  

旧版本：已弃用
$ mfssetgoal -r 3 /mnt/mfs_client/database  

-----------------------------------------
新版本：
# 查看class类型，列出目前已声明的class类型
$ mfslistsclass
2CP
3CP
EC4+1
EC8+1
# 注意：一般2CP是默认class类型

# 查看文件上使用的class类型
$ mfssclass get filename
或
$ mfsgetsclass filename

# 修改文件的class类型
mfssclass set 3CP filename
```

---

#### 六、高级特性与运维  

##### 6.1 回收站管理  
```bash  
# 设置文件删除后保留天数
旧版本：
$ mfssettrashtime 604800 /mnt/mfs_client/important_data 
$ mfsgettrashtime file

新版本：
$ mfstrashretention get filename
# 查看指定文件的删除后回收时间

$ mfstrashretention set filename
# 设置或修改指定文件的删除后回收时间，默认1day

# 访问回收站元数据  
$ mfsmount -m /mnt/mfs_meta -H 192.168.88.10  
$ ls /mnt/mfs_meta/trash  # 查看已删除文件  
```

##### 6.2 快照功能  
```bash  
# 创建目录快照  
$ mfsmakesnapshot /mnt/mfs_client/db /mnt/mfs_client/db_snapshot  
```

##### 6.3 服务启停顺序  
- 启动顺序：Master → Chunk Server → Metalogger → Client  
- 停止顺序：卸载 → client → Metalogger → Chunk Server → Master  

---

#### 七、故障恢复与监控  

##### 7.1 Master 元数据恢复  
```bash  
# 从 Metalogger 恢复元数据  
$ mfsmetarestore -a -d /var/lib/mfs/*	# 旧版本
$ mfsmaster -a 							# 新版本
$ systemctl start moosefs-master  

# 特殊情况，在数据恢复时，有可能会因为内存空间地址不足导致创建缓存空间失败，请关注内存剩余空间量大小。
典型报错：
[error] bgsaver lock exists: EACCES (Permission denied)
[error] init: bgsaver failed !!!
# 报错内容容易误导是文件系统没有权限
```

```shell
# 当MFS 的 master 节点重新部署后，chunk节点无法正常启动链接的问题：

# 解决方案：所有的chunk节点都会保存master的id号，保存在自己共享挂载点下的.metaid文件中，若master节点重新部署，需要删除所有chunk节点上的.metaid文件。
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-09/03.png)

##### 7.2 监控与性能分析  

```bash  
# 使用内置 Web 监控（Master 节点）  
$ systemctl start moosefs-cgiserv  
# 访问 http://192.168.88.10:9425  

# 实时 IO 监控  
$ iostat -xm 2  # 查看磁盘 I/O 负载  
```

---

#### 八、MooseFS 与其他存储方案对比  

##### 8.1 对比 Ceph 与 GlusterFS  
| 指标           | MFS                | Ceph              | GlusterFS        |  
|--------------------|-----------------------|-----------------------|-----------------------|  
| 元数据管理     | 集中式（单点风险）     | 分布式（CRUSH 算法）   | 无元数据（弹性哈希）   |  
| 部署复杂度     | 简单                  | 复杂                  | 中等                  |  
| 适用场景       | 中小规模文件存储       | 大规模云存储           | 横向扩展文件共享       |  

