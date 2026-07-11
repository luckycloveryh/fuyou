---
title: "网络无人值守批量装机-pxe+cobbler"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-01/1200/600"
draft: false
tags: ["集群", "Obsidian"]
categories: ["集群"]
slug: "cluster-01"
description: "从 Obsidian 导入的 集群 学习笔记"
---
# 网络无人值守批量装机-pxe+cobbler

### 一、简介

网络无人值守批量装机是通过PXE（预启动执行环境）和Cobbler工具实现自动化操作系统部署的技术体系。核心组件包括：  

#### 1. PXE基础组件  

- **PXE Boot**：客户端从网络获取引导文件并启动安装程序  
- **DHCP服务器**：分配IP地址并指定TFTP服务器位置（内置或独立部署）  
- **TFTP服务器**：传输引导文件（`pxelinux.0`、内核镜像等）  
- **HTTP/NFS服务器**：存储操作系统镜像和配置文件  
- **Kickstart脚本**：定义分区、软件包、用户配置等自动化参数  

#### 2. Cobbler高级组件  

- **Cobbler服务**：统一管理PXE配置、镜像同步、Kickstart模板  
- **Cobbler Web界面**：提供图形化操作界面（需安装`cobbler-web`）  
- **Rsync同步工具**：实现镜像仓库的快速分发  
- **Yum仓库集成**：支持自定义软件源管理  

### 二、cobbler部署流程

#### 1.准备工作	

1.1 关闭防火墙和SELinux

```shell
systemctl disable --now firewalld
#关闭firewalld

setenforce 0
sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
#关闭SELinux
```

1.2 配置连接到互联网

```shell
$ vim /etc/NetworkManager/system-connections/ens160.nmconnection
# 正确配置IP地址，子网掩码，网关，DNS等网络参数
$ nmcli c reload
$ nmcli c up ens160
```

1.3 配置基础网络yum源和epel扩展yum源

```shell
$ cd /etc/yum.repos.d/
$ vim rocky-devel.repo
enable=1

$ dnf -y install epel-release

$ dnf clean all
$ dnf makecache
```

#### 2.安装cobbler和相关软件

2.1 安装软件

```shell
$ dnf -y install cobbler3.2 cobbler3.2-web tftp tftp-server dhcp-server httpd rsync rsync-daemon pykickstart yum-utils syslinux* fence-agents
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/cluster-01/01.png)

2.2 启动&设置开机自启动

```shell
$ systemctl enable --now httpd cobblerd rsyncd tftp.socket
```

| 项目             | service（服务）                                       | socket 套接字文件（socket file）                  | socket 服务（socket-activated service）                   |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| 是什么           | 一个完整的守护进程（daemon），负责实际干活            | 文件系统中的一个特殊文件（Unix domain socket）    | systemd 的按需激活机制，先监听端口/文件，有连接才启动服务 |
| systemd 单元类型 | `.service`                                            | 无（不是 systemd 单元，是普通文件）               | `.socket` + 对应的 `.service`                             |
| 存在形式         | 进程（常驻内存）                                      | 文件（如 `/run/docker.sock`）                     | systemd 单元配置文件（无实体文件）                        |
| 典型位置         | 无固定文件路径（进程信息在 `/proc`）                  | `/run/`、`/var/run/`、`/tmp/` 等目录下            | 无文件路径（`systemctl status xxx.socket` 查看）          |
| 谁创建           | 程序自身或 systemd 启动                               | 创建它的程序（如 dockerd、mysqld）                | systemd 根据 `.socket` 单元文件创建                       |
| 协议/类型        | 无特定协议（内部实现）                                | Unix domain socket（AF_UNIX，本地进程间通信）     | 可为 TCP/UDP/UNIX domain 等                               |
| 是否常驻进程     | 是（一直运行）                                        | 是（创建它的程序必须运行）                        | 否（平时无进程，有连接才启动对应的 .service）             |
| 资源占用         | 较高（常驻内存、CPU）                                 | 取决于创建它的程序                                | 极低（idle 时几乎为 0）                                   |
| 启动时机         | 开机或手动启动后持续运行                              | 程序启动时创建文件                                | 开机创建监听，有连接请求才激活 .service                   |
| 典型例子         | `cobblerd.service`、`httpd.service`、`rsyncd.service` | `/run/docker.sock`、`/var/run/mysqld/mysqld.sock` | `tftp.socket`、`docker.socket`、`snapd.socket`            |
| 主要用途         | 持续处理请求（如 Web 服务、Cobbler 主进程）           | 本地进程间通信（IPC），替代 TCP loopback          | 低频/按需启动的服务（节省资源，如 TFTP）                  |
| 可见方式         | `systemctl status xxx.service`                        | `ls -l /run/*.sock`、`ss -lxp`、`lsof -U`         | `systemctl list-sockets`、`systemctl status xxx.socket`   |
| 删除/影响        | `systemctl stop` → 进程停止                           | 删除文件 → 服务无法接受新本地连接                 | `systemctl stop xxx.socket` → 停止监听，但不影响已连接    |
| 适用场景         | 高频、持续请求的服务                                  | 本地客户端连接守护进程（如 docker cli → dockerd） | 偶尔访问、不想常驻的服务（TFTP、打印服务等）              |

#### 3.配置cobbler

3.1 检查cobbler配置，根据提示完成修改

```shell
$ cobbler check
The following are potential configuration items that you may want to fix:

1: The 'server' field in /etc/cobbler/settings must be set to something other than localhost, or automatic installation features will not work.  This should be a resolvable hostname or IP for the boot server as reachable by all machines that will use it.
2: For PXE to be functional, the 'next_server' field in /etc/cobbler/settings must be set to something other than 127.0.0.1,and should match the IP of the boot server on the PXE network.
3: some network boot-loaders are missing from /var/lib/cobbler/loaders. If you only want to handle x86/x86_64 netbooting, you may ensure that you have installed a *recent* version of the syslinux package installed and can ignore this message entirely. Files in this directory, should you want to support all architectures, should include pxelinux.0, menu.c32, and yaboot.(复制完所需之后正常报错，可以忽视)
4: reposync is not installed, install yum-utils or dnf-plugins-core
5: yumdownloader is not installed, install yum-utils or dnf-plugins-core
6: debmirror package is not installed, it will be required to manage debian deployments and repositories(yum源仓库，用得到就下)
7: ksvalidator was not found, install pykickstart
8: The default password used by the sample templates for newly installed machines (default_password_crypted in /etc/cobbler/settings) is still set to 'cobbler' and should be changed, try: "openssl passwd -1 -salt 'random-phrase-here' 'your-password-here'" to generate new one
9: fencing tools were not found, and are required to use the (optional) power management features. install cman or fence-agents(注意这个的包名是fence-agents) to use them
已经加在dnf中
Restart cobblerd and then run 'cobbler sync' to apply changes.
```

3.2 逐个问题解决

```shell
问题1和2：
$ vim /etc/cobbler/settings.yaml
server: 192.168.88.150
next_server: 192.168.88.150

问题3：
$ cp -a /usr/share/syslinux/{menu.c32,pxelinux.0,libutil.c32,ldlinux.c32} /var/lib/cobbler/loaders/
#pxelinux.0：PXE 引导加载器主文件（客户端最先下载的）
#menu.c32：菜单模块（支持图形化或文本菜单）
#libutil.c32：通用工具库（很多 syslinux 模块依赖它）
#ldlinux.c32：核心加载器模块（现代 syslinux 必须的）
$ cp -a /mnt/isolinux/{vmlinuz,initrd.img} /var/lib/cobbler/loaders/
#vmlinuz：Linux 内核文件
#initrd.img：初始 RAM 磁盘（包含驱动、模块等）
# 我的光盘挂载点是/media/，根据自己的挂载调整路径
满足一部分需求够用，但是系统还是会报错，不需要理会，可以忽视
问题5：
$ openssl passwd -1 -salt 'root' '123456'
$1$root$j0bp.KLPyr.u9kgQ428D10
#以上内容是加密密码，最终在kickstart文件中生效
$ vim /etc/cobbler/settings.yaml
default_password_crypted: "$1$root$j0bp.KLPyr.u9kgQ428D10"

$ systemctl restart cobblerd
#一定要先重启服务然后执行检查命令
```

3.3 配置cobbler-dhcp

```shell
$ vim /etc/cobbler/settings.yaml
manage_dhcp: true
$ vim /etc/cobbler/dhcp.template
subnet 192.168.88.0 netmask 255.255.255.0 {
     option routers             	192.168.88.2;
     option domain-name-servers    	114.114.114.114;
     option subnet-mask          	255.255.255.0;
     range dynamic-bootp         	192.168.88.100 192.168.88.254;    
#未列出所有，仅列出了修改内容
不需要修改，默认/etc/cobbler/settings.yaml下的
server: 192.168.88.150
next_server: 192.168.88.150修改了就行，
next-server                $next_server;

systemctl restart cobblerd
```

3.4 将cobbler控制的各个服务和文件复制到指定位置

```shell
#切记，一定要在以上所有的操作都正常完成并生效后再指定以下命令。

$ cobbler sync
```

3.5 将dhcpd服务启动并设置为开机自启动

```shell
$ systemctl enable --now dhcpd
```

### 三、导入镜像绑定ks文件

#### 1.导入镜像

```shell
有光驱设备挂载了光盘可以直接进行上传，没有就需要先上传镜像文件了
$ cobbler import --path=/mnt/ --name=rocky9 --arch=x86_64 
#此步骤极其缓慢，主要原因是镜像太大了
#cobbler会将镜像中的所有安装文件拷贝到本地一份，放在/var/www/cobbler/distro_mirror下的rocky9-x86_64目录下。因此/var/www/cobbler目录必须具有足够容纳安装文件的空间。
注意实验时必须挂载镜像
$ ll /var/www/cobbler/distro_mirror/

$ cobbler list
# 列出所有导入的镜像列表

$ cobbler distro report --name rocky9-x86_64
# 查看指定镜像信息

$ cobbler profile report --name rocky9-x86_64
# 查看指定镜像的配置信息
```

#### 2.生成ks模板文件

```shell
$ cd /var/lib/cobbler/templates/
# 这个目录下放的是人家cobbler我们准备好的模板，凑合能用，但很凑合。

---------------------------------------------------------------
# 自己创建一个模板用来测试，会稍微全面一点
$ vim rocky9.ks

# 内容修改（直接覆写）
auth  --useshadow  --enablemd5
bootloader --location=mbr
clearpart --all --initlabel
graphical
repo --name=source-1 --baseurl=http://192.168.5.55/cobbler/distro_mirror/rocky9-x86_64/BaseOS
repo --name=source-2 --baseurl=http://192.168.5.55/cobbler/distro_mirror/rocky9-x86_64/AppStream
firewall --disable
selinux --enforcing
firstboot --disable
keyboard us
lang en_US
url --url=http://192.168.5.55/cblr/links/rocky9-x86_64
network --bootproto=dhcp --device=ens160 --ipv6=auto --onboot=on --activate
rootpw --iscrypted --allow-ssh $1$root$j0bp.KLPyr.u9kgQ428D10
timezone  Asia/Shanghai --utc
zerombr
ignoredisk --only-use=nvme0n1
autopart


%packages
@^server-product-environment
lrzsz
%end

reboot

---------------------------------------------------
注意selinux一开始disabled的话，想要重新打开需要在开机界面按crtl+e手动删掉selinux=1
-------------------------------------------------------------------------------------

$ cobbler profile edit --name rocky9-x86_64 --autoinstall rocky9.ks
# 修改镜像绑定的默认安装脚本

$ bash /usr/share/cobbler/bin/mkgrub.sh
# 执行cobbler准备好的用来修改grub2版本的脚本，为新式硬件（使用 UEFI 引导的机器）生成兼容的引导菜单。
可以使用echo $?确定，报错一般无影响
$ cobbler sync
# 重新同步cobbler

$ systemctl restart httpd cobblerd dhcpd rsyncd tftp.socket
# 重启所有服务，然后测试

-------------------------------------------------------------------------------------
如果需要在安装完操作系统后，重启操作系统之前进行一些简单的配置：
如：配置本地yum仓库

%post
cd /etc/yum.repos.d/
mkdir bak
mv r* bak
echo "&&**（*（%……&*" > media.repo
%end

# 如果安装的是图形界面，则需要再安装时，创建一个普通用户
在装机脚本中添加以下代码即可：

user --name=hongfu --password=$6$EwVzW0gT1sxJz8kE$gzO4QqHj.nOgic2/sI.XiRKJH3opXZDhBonG71eU/0qQ6FFZ48Edg91do/UZJQMdk6oPFgrpYDRitbrQGka/T0 --iscrypted --gecos="hongfu"

```

#### 4.创建测试虚拟机进行验证

​	注意：虚拟机的内存必须大于等于4G，否则会出现无法安装的情况

```bash
在测试时，会发现默认选择了local选项，并且菜单倒计时是80秒，可以修改grub.cfg配置实现默认选择rocky9-x86_64镜像，如下：
$ vim /var/lib/tftpboot/grub/grub.cfg
set timeout=10
set default='rocky9-x86_64'
```

### 四、知识拓展：Systemd服务管理  

#### 服务单元 vs 套接字单元  
| **特性**         | **Service单元**              | **Socket单元**               |  
|------------------|------------------------------|------------------------------|  
| **资源占用**      | 常驻内存                     | 按需启动，零闲置占用         |  
| **响应速度**      | 即时响应                     | 首次请求有约200ms延迟        |  
| **适用场景**      | 高并发服务（如Web服务器）    | 低频服务（如TFTP、CUPS打印） |  

#### 套接字激活原理  
1. **监听阶段**：`tftp.socket`监听UDP 69端口，服务进程未启动  
2. **触发启动**：客户端连接时，Systemd动态创建`tftp.service`实例  
3. **请求处理**：服务进程处理完毕后自动关闭，释放资源  

---

### 五、内容总结 
- **PXE+Cobbler整合优势**：  
  - 减少手动配置错误
  - 支持多操作系统、多架构混合部署  
- **关键注意事项**：  
  - 确保`/var/www/cobbler`有足够空间存储镜像  
  - Kickstart密码需使用`openssl passwd`生成哈希值  

---