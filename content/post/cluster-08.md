---
title: "iSCSI 块存储部署与配置"
date: 2026-07-08T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-08/1200/600"
draft: false
tags: ["集群", "Obsidian"]
categories: ["5. 集群阶段"]
slug: "cluster-08"
description: "从 Obsidian 导入的 集群 学习笔记"
---
### Rocky Linux 9.4 Iscsi块存储

#### 一、引言与存储基础

网络存储通过将存储资源共享到网络，满足企业对数据管理的需求。

NAS（网络附加存储）

SAN（存储区域网络）

##### 1.1 存储类型概述
- **块存储**：直接操作数据块（如 HDD、SSD），通过分区、文件系统或 LVM 管理。

- **NAS**：通过 NFS 或 SMB 协议以及iscsi协议实现共享。

- **SAN**：块级存储网络，通常通过光纤通道（FC）或 iSCSI 实现。

- **iSCSI**：基于 TCP/IP 的 SAN 实现途径，灵活且成本较低。

  补充：

  - iSCSI 协议本质上是**基于 SCSI 的块设备**，所以 Linux 内核会把远程的 iSCSI LUN 识别为 SCSI 设备。
  - 无论服务器端后端是 SATA、NVMe、LVM、文件还是什么，在客户端看到的设备名统一是 /dev/sdX（X 是字母，如 sda、sdb）。

#### 二、环境准备与工具安装

假设存储端 IP 为 192.168.1.10，客户端 IP 为 192.168.1.20，网络为千兆以太网，需开放相关端口。

```bash
# 检查系统版本与内核
$ cat /etc/rocky-release  # 显示系统版本
$ uname -r                # 显示内核版本，确保支持 NVMe 和 iSCSI

# 安装工具  
$ dnf -y install nfs-utils targetcli iscsi-initiator-utils  
# nfs-utils: NFS 服务; 
# targetcli: iSCSI Target; 
# iscsi-initiator-utils: iSCSI Initiator; 

# 检查块设备
$ lsblk                  # 列出块设备（SATA 如 /dev/sda，NVMe 如 /dev/nvme0n1）
$ nvme list              # 列出 NVMe 设备 
```

#### 三、配置 NAS

NAS 提供文件级存储，常用 NFS 和 SMB 协议。

##### 3.1 配置 NFS 服务
```bash
# 创建共享目录
$ mkdir -p /srv/nfs_share  # 创建 NFS 共享目录
$ chmod 755 /srv/nfs_share # 设置目录权限

# 配置 NFS 添加以下内容
$ vi /etc/exports
/srv/nfs_share 192.168.1.0/24(rw,sync)
# 192.168.1.0/24: 客户端网段; rw: 读写; sync: 同步写入

# 启动 NFS 服务
$ systemctl enable --now nfs-server  # 启用并启动 NFS 服务
$ exportfs -rav                      # 刷新配置
```

```bash
# 客户端挂载
$ mkdir /mnt/nfs             # 创建挂载点
$ mount -t nfs 192.168.1.10:/srv/nfs_share /mnt/nfs  # 挂载 NFS 共享
$ echo "192.168.1.10:/srv/nfs_share /mnt/nfs nfs defaults,_netdev 0 0" >> /etc/fstab  # 开机自动挂载
```

#### 四、配置 SAN

SAN 提供块级存储，iSCSI 是常见实现方法之一。

###### 4.1 使用 SATA 磁盘作为后端存储
```bash
$ dnf -y install targetcli iscsi-initiator-utils
# targetcli # 块存储服务器共享软件
# iscsi-initiator-utils # 客户端连接服务器端共享的软件

# 检查 SATA 磁盘
$ lsblk                  					# 假设 SATA 磁盘为 /dev/sda
$ parted /dev/sda mklabel gpt  				# 创建 GPT 分区表
$ parted /dev/sda mkpart primary 0% 100% 	# 创建主分区
$ pvcreate /dev/sda1     					# 创建物理卷
$ vgcreate vg_sata /dev/sda1  				# 创建卷组
$ lvcreate -L 20G -n lv_sata vg_sata  		# 创建 20GB 逻辑卷

# 配置 Target
$ targetcli
/backstores/block create share_di /dev/vg_sata/lv_sata  
# 创建块型后端存储，sata_disk: 存储名称; /dev/...: 设备路径
/iscsi create iqn.2025-03.com.example:target1     
# 创建 Target，iqn...: Target 唯一标识符
/iscsi/iqn.2025-03.com.example:target1/tpg1/luns create /backstores/block/sata_disk  
# 添加 LUN，tpg1: 目标门户组; luns create: 创建逻辑单元
/iscsi/iqn.2025-03.com.example:target1/tpg1 set attribute authentication=0  
# 禁用认证（测试用），authentication=0: 无认证
/iscsi/iqn.2025-03.com.example:target1/tpg1 set attribute demo_mode_write_protect=0  
# 允许写入，demo_mode_write_protect=0: 关闭写保护
/iscsi/iqn.2025-03.com.example:target1/tpg1 set attribute generate_node_acls=1  
# 自动生成访问控制，generate_node_acls=1: 简化权限
saveconfig		# 保存配置
exit            # 退出 targetcli

-------------------------------------------------------------------------------------------------------
$ systemctl enable --now target          # 启用并启动 iSCSI Target 服务
$ targetcli ls                           # 验证配置
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-08/01.png)

###### targetcli ls 输出详解（树状结构）

`targetcli ls` 以树形方式展示整个 iSCSI Target 配置状态。  
`o-` 表示目录/节点，缩进代表层级关系。

###### 根层级
- `o- / ......................................................... [...]`  
  整个配置的根目录（相当于文件系统的 `/`）

###### 第一层：backstores（后端存储区）
所有可供 iSCSI 导出的真实存储资源都在这里。

- `o- backstores ...................................................... [...]`
  - `o- block ................................................ [Storage Objects: 1]`  
    block 类型存储（最常用：磁盘、LVM、分区）
    - `o- block509_disk ....................................... [(/dev/yhvg/yhlv (19.0GiB) write-thru objects activated: 1]`  
      存储对象名称：**block509_disk**  
      后端设备：**/dev/yhvg/yhlv**（19 GiB）  
      缓存模式：write-thru（写直通，安全但稍慢）
    - `o- 2509disk ............................................. [(/dev/yhvg/yhlv (19.0GiB) write-thru ...]`  
      同一设备的别名/重复显示（常见于 ALUA 相关显示）
    - `o- alua ................................................ [ALUA Groups: 1]`  
      ALUA（多路径优化功能）
      - `o- default_tg_pt_gp ................................ [ALUA state: Active/optimized]`  
        默认 ALUA 组，状态：活跃/最优路径（客户端优先走此路径）

  - `o- fileio ............................................... [Storage Objects: 0]`  
    文件模拟磁盘（未使用）

  - `o- pscsi ............................................... [Storage Objects: 0]`  
    直通物理 SCSI 设备（未使用）

  - `o- ramdisk ............................................ [Storage Objects: 0]`  
    内存盘（未使用）

###### 第二大块：iscsi（iSCSI 目标区）
- `o- iscsi ......................................................... [Targets: 1]`  
  已创建 1 个 iSCSI Target（网络硬盘服务器）

  - `o- iqn.2026-01.xxhxf.f.2509:server1 ....................... [TPGs: 1]`  
    Target IQN（全球唯一店名）：**iqn.2026-01.xxhxf.f.2509:server1**  
    包含 1 个 TPG（Target Portal Group，销售柜台）

    - `o- tpg1 ........................................... [gen-acls, no-auth]`  
      TPG1（默认柜台）  
      当前属性：自动生成 ACL + 无 CHAP 认证（测试用，不安全）
      - `o- acls ...................................................... [ACLs: 0]`  
        访问控制列表（白名单）：0 个（因 gen-acls=1，自动允许所有客户端）
      
      - `o- luns ...................................................... [LUNs: 1]`  
        暴露的逻辑单元（硬盘）：1 个
      
        - `o- lun0 ................................................ [block/2509_disk ... (default_tg_pt_gp)]`  
          LUN 0 → 映射到后端 **block/2509_disk**（即 /dev/yhvg/yhlv）  
          使用默认 ALUA 组
      
      - `o- portals ................................................ [Portals: 1]`  
        监听地址/端口（客户端连接入口）：1 个
      
        - `o- 0.0.0.0:3260 ................................................. [OK]`  
          监听所有 IP 的 3260 端口（iSCSI 标准端口），状态正常

###### 最后一行
- `o- loopback ..................................................... [Targets: 0]`  
  本机回环模式（loopback，用于本地测试），未创建任何 Target

###### 当前配置一句话总结
- 后端：1 个 19GiB LVM 卷（/dev/yhvg/yhlv），命名为 block509_disk  
- Target：iqn.2026-01.xxhxf.f.2509:server1  
- 暴露：1 个 LUN（无认证、自动放行所有客户端）  
- 监听：所有 IP 的 3260 端口  
- 适合测试环境，生产建议加 CHAP 认证 + 手动 ACL + 指定监听 IP

```bash
# 启动 Target 服务
$ systemctl enable --now target  # 启用并启动 iSCSI Target 服务
$ systemctl status target        # 检查服务状态
```

##### 4.2 配置 iSCSI Initiator
Initiator 连接 SATA 存储。

```bash
# 发现并登录 Target
$ iscsiadm -m discovery -t sendtargets -p 192.168.1.10 
# 发现 Target,-m discovery: 发现模式; -t sendtargets: 发现目标; -p: IP 和端口
$ iscsiadm -m node -T iqn.2025-03.com.example:target1 --login  
# 登录 Target,-m node: 节点模式; -T: Target IQN; 

# 检查新设备
$ lsblk                                              # 查看设备（SATA 如 /dev/sdb，NVMe 如 /dev/sdc）
```

```bash
# 格式化并挂载
$ mkfs.xfs /dev/sdb                    	# 创建 xfs 文件系统
                                                   		# -L iscsi_sata: 设置卷标
$ mkdir /mnt/iscsi_sata                              	# 创建挂载点
$ mount /dev/sdb /mnt/iscsi_sata                     	# 挂载设备
$ echo "/dev/sdb /mnt/iscsi_sata xfs defaults,_netdev 0 0" >> /etc/fstab  		# 添加到 fstab
```

#### 五、高级管理和优化

##### 5.1 安全性配置
为 iSCSI 添加 CHAP 认证。确保先在客户端卸载再进行操作

```bash
# Target 配置 CHAP
$ targetcli
/iscsi/iqn.2025-03.com.example:target1/tpg1 set attribute authentication=1  
# 启用认证
/iscsi/iqn.2025-03.com.example:target1/tpg1/acls create iqn.2025-03.com.example:initiator1  
# 创建 ACL，绑定客户端IQN标签
/iscsi/iqn.2025-03.com.example:target1/tpg1/acls/iqn.2025-03.com.example:initiator1 set auth userid=user1\ password=pass1234  # 设置 CHAP
saveconfig                                                  # 保存配置
exit                                                        # 退出

--------------------------------------------------------------------------------------
# 应用配置
$ systemctl restart target               # 重启服务应用配置

```

```bash
# 先确定好客户端 Initiator IQN 名称，保证和上边绑定的IQN名称一致
$ echo "InitiatorName=iqn.2025-03.com.example:initiator1" > /etc/iscsi/initiatorname.iscsi  # 定义 Initiator 标识

# Initiator 配置 CHAP
$ vi /etc/iscsi/iscsid.conf
# 修改以下内容
node.session.auth.authmethod = CHAP                    # 启用 CHAP 认证
node.session.auth.username = user1                     # Initiator 用户名
node.session.auth.password = pass1234                  # Initiator 密码

# 修改完配置文件后，需重启服务才能生效
$ systemctl restart iscsid

# 重新登录
$ iscsiadm -m discovery -t sendtargets -p 192.168.1.10
$ iscsiadm -m node -T iqn.2025-03.com.example:target2 --logout  # 退出 NVMe Target
$ iscsiadm -m node -T iqn.2025-03.com.example:target2 --login   # 登录 NVMe Target
# -m node模式下，可以先扫描，不写-p ip:port
/dev/sda1 挂载点  xfs defaults,_netdev 0 0
# 重新连接身份验证失败需要删除旧的连接缓存信息
$ rm -rf /var/lib/iscsi/nodes/*
$ rm -rf /var/lib/iscsi/send_targets/*


####注意当之前登陆过上面两步都执行还是无法成功的时候执行以下两个命令
创建节点记录
iscsiadm -m node -T iqn.2026-01.xxhf.2509:server1 -p 192.168.5.110:3260 --op new
注册登录
iscsiadm -m node -T iqn.2026-01.xx... :server1 -p 192.168.5.110:3260 --login或者-l

```

#### 六、常用命令

```bash
# 检查设备与日志
$ targetcli ls           		# 检查 Target 配置
$ lsblk                  		# 查看 SATA 和 NVMe 设备
$ nvme list              		# 检查 NVMe 状态
$ tail -f /var/log/messages  	# 查看系统日志
$ journalctl -u target   		# 查看 iSCSI Target 日志
```

#### 七、扩容

服务器端：

```bash
#先关机扩容磁盘，开机之后
#1.扩容卷组
vgextend yhvg /dev/sda
#2.扩容逻辑卷
lvresize -L +19G -n /dev/yhvg/yhlv

客户端不需要关机
非交互模式（脚本用，一行命令）
parted -s -a optimal /dev/sda resizepart 1 100%
通知内核分区变化
partprobe
growfs

或者
parted /dev/sda resizepart 1 100%
点击修复：当你扩容磁盘（从 19G → 38G）后，旧分区表（sda1 只到 19G）没有自动调整备份头的位置，导致备份分区表和末尾空间之间有“空隙”（那个 39845888 区块 ≈ 19GB）。
xfs_growfs /dev/sda1
```

