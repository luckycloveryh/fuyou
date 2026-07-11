---
title: "Docker 网络基础"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-13/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-13"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 五、Docker 网络

## Docker 网络启动过程

Docker 服务启动时会首先在主机上自动创建一个 docker0 的虚拟网桥，网桥可以理解为一个软件交换机，负责挂载其上的接口之间进行包转发。

Docker 随机分配一个本地未占用的私有网段中的一个地址给 docker0 接口，默认是 172.17.0.0/16 网段。此后启动的容器会自动分配一个该网段的地址。

当创建一个 Docker 容器的时候，同时会创建了一对 `veth pair` 互联接口。当向任一个接口发送包时，另外一个接口自动收到相同的包。互联接口的一端位于容器内，即 eth0；另一端在本地并被挂载到 docker0 网桥，名称以veth 开头（例如 vethae12ch）。通过这种方式，主机可以与容器通信，容器之间也可以相互通信。如此一来，Docker 就创建了在主机和所有容器之间一个虚拟共享网络。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-13/01.png)

```Bash
# 查看网桥
# brctl 命令默认没有安装，安装命令： yum -y install bridge-utils 
[root@docker ~]# brctl show
bridge name        bridge id                STP enabled        interfaces
docker0                8000.02425d66988c        no                vethab7e230
                                                        vethae685cc
# 查看 docker0 接口
[root@docker ~]# ifconfig docker0
docker0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.17.0.1  netmask 255.255.0.0  broadcast 172.17.255.255
        inet6 fe80::42:5dff:fe66:988c  prefixlen 64  scopeid 0x20<link>
        ether 02:42:5d:66:98:8c  txqueuelen 0  (Ethernet)
        RX packets 2478196  bytes 478260325 (456.1 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 2530684  bytes 573536572 (546.9 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

# 容器内接口 eth0@if211，宿主机上对应 ID 为 211 的接口。
[root@c961d4e7a9ca app]# ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
210: eth0@if211: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.3/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever

[root@docker ~]# ip a 
211: vethae685cc@if210: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default 
    link/ether 3e:e7:73:e9:d9:13 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet6 fe80::3ce7:73ff:fee9:d913/64 scope link 
       valid_lft forever preferred_lft forever

```

## Docker 网络的连通性

### 容器访问外部 

容器默认指定了网关为docker0网桥上的docker0内部接口。docker0内部接口同时也是宿主机的一个本地接口。因此，容器默认情况下可以访问到宿主机本地网络。如果容器要想通过宿主机访问到外部网络，则需要宿主机进行辅助转发。

- 开启内核包转发功能

在宿主机Linux系统中，检查转发是否打开，代码如下：

```Bash
[root@docker ~]# sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```

如果为0，说明没有开启转发，则需要手动打开：

```Bash
[root@docker ~]# sysctl  -w net.ipv4.ip_forward=1
```

- 配置 SNAT 规则 

假设容器内部的网络地址为172.17.0.2，本地网络地址为10.0.2.2。容器要能访问外部网络，源地址不能为172.17.0.2，需要进行源地址映射（Source NAT,SNAT），修改为本地系统的IP地址10.0.2.2。

映射是通过iptables的源地址伪装操作实现的。查看主机nat表上 POSTROUTING 链的规则。该链负责数据包要离开主机前，改写其源地址：

```Bash
[root@docker ~]# iptables -tnat  -nvL POSTROUTING
Chain POSTROUTING (policy ACCEPT 7920 packets, 499K bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0   
```

其中，上述规则将所有源地址在172.17.0.0/16网段，且不是从docker0接口发出的流量（即从容器中出来的流量），动态伪装为从系统网卡发出。

### 外部访问容器

容器允许外部访问，可以在docker [container] run 时候通过 -p 或 -P 参数来启用。

不管用哪种办法，其实也是在本地的 iptable 的 nat 表中添加相应的规则，将访问外部IP地址的包进行目标地址DNAT，将目标地址修改为容器的 IP 地址。

以一个开放 80 端口的 Nginx 容器为例，使用 -P 时，会自动映射本地 32768～65535 范围内的随机端口到容器的 80 端口：

```Bash
# 指定 -P 参数运行一个 nginx 容器
[root@docker ~]# docker run --rm -P nginx:1.22.1
```

```Bash
[root@docker ~]# iptables -t nat -nvL
Chain PREROUTING (policy ACCEPT 18 packets, 528 bytes)
 pkts bytes target     prot opt in     out     source               destination         
 8253  232K DOCKER     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ADDRTYPE match dst-type LOCAL

Chain INPUT (policy ACCEPT 18 packets, 528 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 10 packets, 600 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 DOCKER     all  --  *      *       0.0.0.0/0           !127.0.0.0/8          ADDRTYPE match dst-type LOCAL

Chain POSTROUTING (policy ACCEPT 10 packets, 600 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0           
    0     0 MASQUERADE  tcp  --  *      *       172.17.0.4           172.17.0.4           tcp dpt:80

Chain DOCKER (2 references)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 RETURN     all  --  docker0 *       0.0.0.0/0            0.0.0.0/0           
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:32768 to:172.17.0.4:80

```

使用-p 80:80 时，与上面类似，只是本地端口也为 80：

```Bash
[root@docker ~]# docker run --rm -p 80:80 nginx:1.22.1

[root@docker ~]# netstat -nltp 
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22122           0.0.0.0:*               LISTEN      1201/sshd           
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      28775/docker-proxy  
tcp6       0      0 :::80                   :::*                    LISTEN      28781/docker-proxy  
[root@docker ~]# 
[root@docker ~]# iptables -t nat -nvL
......
Chain DOCKER (2 references)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 RETURN     all  --  docker0 *       0.0.0.0/0            0.0.0.0/0           
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80 to:172.17.0.4:80

```

### 容器间互相访问 

容器默认都连接在 Docker0 网桥上，都可以互相访问，相当连于在一台二层交换机上。

但是容器的 IP 地址是动态变化的，如果两个应用之间要互相访问就无法通过 IP 地址互相通信，Docker 提供两种方案来解决。 

- `--link ` 传统方式，目前 Docker 官网已不建议使用 

我们部署一个 Wordpress 应用

下载镜像

```Bash
docker pull registry.cn-beijing.aliyuncs.com/xxhf/wordpress:php7.4
docker tag registry.cn-beijing.aliyuncs.com/xxhf/wordpress:php7.4 wordpress:php7.4

docker pull registry.cn-beijing.aliyuncs.com/xxhf/mysql:8.0
docker tag  registry.cn-beijing.aliyuncs.com/xxhf/mysql:8.0 mysql:8.0
```

运行 mysql 容器

```Bash
[root@docker ~]# docker run -d --name db_wordpress --restart always \
-e MYSQL_ROOT_PASSWORD=wordpress \
-e MYSQL_DATABASE=db_wordpress \
-e MYSQL_USER=wordpress_rw  \
-e MYSQL_PASSWORD=123456 \
-p 3306:3306 mysql:8.0

[root@docker ~]# docker ps 
CONTAINER ID   IMAGE       COMMAND                  CREATED              STATUS              PORTS                                                  NAMES
ded235356e6f   mysql:5.7   "docker-entrypoint.s…"   About a minute ago   Up About a minute   0.0.0.0:3306->3306/tcp, :::3306->3306/tcp, 33060/tcp   db_wordpress

```

验证数据库正常运行

```Bash
[root@docker ~]# docker run -d --link db_wordpress -it mysql-client -uroot -pwordpress -hdb_wordpress

[root@docker ~]# docker attach 3c5e8d2f9198
MySQL [(none)]> 
MySQL [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| db_wordpress       |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.001 sec)

MySQL [(none)]> use db_wordpress
Database changed
MySQL [db_wordpress]> show tables; 
Empty set (0.000 sec)

```

运行 WordPress 容器

```Bash
[root@docker ~]# docker run -d --name wordpress --restart always --link db_wordpress \
-e WORDPRESS_DB_HOST=db_wordpress:3306 \
-e WORDPRESS_DB_USER=wordpress_rw \
-e WORDPRESS_DB_PASSWORD=123456 \
-e WORDPRESS_DB_NAME=db_wordpress \
-p  80:80  wordpress:php7.4
```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-13/02.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-13/03.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-13/04.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-13/05.png)

如果安装过程有问题可以查看 wordpress 日志

```Bash
[root@docker ~]# docker logs -f wordpress
WordPress not found in /var/www/html - copying now...
Complete! WordPress has been successfully copied to /var/www/html
No 'wp-config.php' found in /var/www/html, but 'WORDPRESS_...' variables supplied; copying 'wp-config-docker.php' (WORDPRESS_DB_HOST WORDPRESS_DB_NAME WORDPRESS_DB_PASSWORD WORDPRESS_DB_USER)
AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using 172.17.0.3. Set the 'ServerName' directive globally to suppress this message
AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using 172.17.0.3. Set the 'ServerName' directive globally to suppress this message
[Sun Oct 22 07:32:35.093635 2023] [mpm_prefork:notice] [pid 1] AH00163: Apache/2.4.54 (Debian) PHP/7.4.33 configured -- resuming normal operations
[Sun Oct 22 07:32:35.093713 2023] [core:notice] [pid 1] AH00094: Command line: 'apache2 -D FOREGROUND'
120.245.113.53 - - [22/Oct/2023:07:36:00 +0000] "GET / HTTP/1.1" 302 404 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
120.245.113.53 - - [22/Oct/2023:07:36:00 +0000] "GET / HTTP/1.1" 302 404 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
120.245.113.53 - - [22/Oct/2023:07:36:00 +0000] "GET /wp-admin/install.php HTTP/1.1" 200 4667 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"

```

--link 是通过在本地解析文件 `/etc/hosts` 添加主机记录来实现DNS域名解析的。

```Bash
[root@docker ~]# docker exec -it wordpress cat /etc/hosts
127.0.0.1        localhost
::1        localhost ip6-localhost ip6-loopback
fe00::0        ip6-localnet
ff00::0        ip6-mcastprefix
ff02::1        ip6-allnodes
ff02::2        ip6-allrouters
172.17.0.2        db_wordpress 18722c02cb87
172.17.0.3        9aeb4e1dfe63

```

[Legacy container links](https://docs.docker.com/network/links/)

- 自定义网络   [User-defined networks](https://docs.docker.com/engine/network/#user-defined-networks)

You can create custom, user-defined networks, and connect multiple containers to the same network. Once connected to a user-defined network, containers can communicate with each other using container IP addresses or container names.

创建一个用户定义网络   user-defined network 

```Bash
[root@docker ~]# docker network create wp-net 
e4e3d1ee70620fec8e4a5a22f9b0db737faaf5f6e8d67a2958f98f0fc86af975
[root@docker ~]# 
[root@docker ~]# docker network  ls 
NETWORK ID     NAME      DRIVER    SCOPE
0cc88dcd390d   bridge    bridge    local
385ab96da9ee   host      host      local
43634758fc70   none      null      local
e4e3d1ee7062   wp-net    bridge    local
```

重新运行 MySQL  和 WordPress 容器

```Bash
docker run -d --name db_wordpress --restart always \
--network wp-net \
-e MYSQL_ROOT_PASSWORD=wordpress \
-e MYSQL_DATABASE=db_wordpress \
-e MYSQL_USER=wordpress_rw  \
-e MYSQL_PASSWORD=123456 \
-p 3306:3306 mysql:8.0

docker run -d --name wordpress --restart always --network wp-net  \
-e WORDPRESS_DB_HOST=db_wordpress:3306 \
-e WORDPRESS_DB_USER=root \
-e WORDPRESS_DB_PASSWORD=wordpress \
-e WORDPRESS_DB_NAME=db_wordpress \
-p  80:80  wordpress:php7.4
```

自定义网桥可以自动实现容器间的DNS解析，没有修改 `/etc/hosts` 文件 

```Bash
[root@docker ~]# docker exec  wordpress cat /etc/hosts
127.0.0.1        localhost
::1        localhost ip6-localhost ip6-loopback
fe00::0        ip6-localnet
ff00::0        ip6-mcastprefix
ff02::1        ip6-allnodes
ff02::2        ip6-allrouters
172.18.0.3        24e49d0f2225

```

## [Docker 网络模式](https://docs.docker.com/engine/network/drivers/bridge/)

### host 模式

Docker使用了Linux的Namespaces技术来进行资源隔离，如PID Namespace隔离进程，Mount Namespace隔离文件系统，Network Namespace隔离网络等。一个Network Namespace提供了一份独立的网络环境，包括网卡、路由、Iptable 规则等都与其他的 Network Namespace 隔离。一个 Docker 容器一般会分配一个独立的 Network Namespace。但**如果启动容器的时候使用host模式，那么这个容器将不会获得一个独立的Network Namespace，而是和宿主机共用一个Network Namespace**。容器将不会虚拟出自己的网卡，配置自己的IP等，而是使用宿主机的IP和端口。

例如，我们在10.10.101.105/24 的机器上用 host 模式启动一个含有web应用的Docker容器，监听 tcp80 端口。

当我们在容器中执行任何类似ifconfig命令查看网络环境时，看到的都是宿主机上的信息。而外界访问容器中的应用，则直接使用10.10.101.105:80即可，不用任何NAT转换，就如直接跑在宿主机中一样。但是，容器的其他方面，如文件系统、进程列表等还是和宿主机隔离的。

示例：

```Dockerfile
# 运行一个使用 host 网络模式的容器
[root@docker ~]# docker run -d --net=host nginx:1.22.1 

# 容器详情中没有 IP 地址 
[root@docker ~]# docker inspect 2fa38ed2c2f3 | grep -i ipaddr
            "SecondaryIPAddresses": null,
            "IPAddress": "",
                    "IPAddress": "",

# 宿主机可以看到 80 端口的监听 
[root@docker ~]# netstat -nltp | grep nginx 
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      4561/nginx: master  
tcp6       0      0 :::80                   :::*                    LISTEN      4561/nginx: master  

# 宿主机可以访问 nginx 服务 
[root@docker ~]# curl 127.0.0.1
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>

```

### bridge  模式

Docker 服务默认会创建一个 `docker0` 网桥（其上有一个 `docker0` 内部接口）。

Docker 默认指定了 `docker0` 接口 的 IP 地址和子网掩码，让主机和容器之间可以通过网桥相互通信。

```Bash
# docker0 网桥 
[root@docker ~]# brctl show 
bridge name        bridge id                STP enabled        interfaces
docker0                8000.024276df2867        no                veth15882fe

# docker0 接口
[root@docker ~]# ifconfig 
docker0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.18.0.1  netmask 255.255.0.0  broadcast 172.18.255.255
        inet6 fe80::42:76ff:fedf:2867  prefixlen 64  scopeid 0x20<link>
        ether 02:42:76:df:28:67  txqueuelen 0  (Ethernet)
        RX packets 11460  bytes 752403 (734.7 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 11923  bytes 90364552 (86.1 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```

`--network bridge`：设置容器工作在bridge模式下，即将容器接口添加至 docker0 网桥。

配置 docker0 网络配置：

编辑  `/etc/docker/daemon.json `，添加以下内容：

```Dockerfile
{
  "bip": "192.168.1.1/24",
  "fixed-cidr": "192.168.1.0/24"
}
```

重启 docker 

```Dockerfile
systemctl restart docker 
```

观察 docker0 ip 地址

```Dockerfile
ot@docker ~]# ifconfig docker0
docker0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 192.168.1.1  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::42:76ff:fedf:2867  prefixlen 64  scopeid 0x20<link>
        ether 02:42:76:df:28:67  txqueuelen 0  (Ethernet)
        RX packets 11460  bytes 752403 (734.7 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 11923  bytes 90364552 (86.1 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```

### none 模式

此模式下容器不参与网络通信，运行于此类容器中的进程仅能访问本地环回接口，仅适用于进程无须网络通信的场景中，例如备份，进程诊断及各种离线任务等。

`--network=none`:设置模式容器工作在none模式下。  

示例：

```Dockerfile
# 使用 none 网络模式，容器内只有 loopback 接口
[root@docker ~]# docker run  -it --rm --network=none busybox 
/ # ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
/ # 

```

## Namespace

Docker 是借助 Linux 内核技术 Namespace 来实现隔离的， Linux Namespaces 机制提供一种资源隔离方案。 PID,IPC,Network 等系统资源不再是全局性的， 而是属于某个特定的 Namespace。 每个 namespace 下的资源对于其他 namespace 下的资源都是透明， 不可见的。 因此在操作系统层面上看， 就会出现多个相同 pid 的进程。 系统中可以同时存在多个进程号为 0,1,2 的进程， 由于属于不同的 namespace， 所以它们之间并不冲突。 而在用户层面上只能看到属于用户自己 namespace 下的资源， 例如使用 ps 命令只能列出自己 namespace 下的进程。这样每个 namespace 看上去就像一个单独的 Linux 系统。  

目前内核支持的 Namespace 类型：

<sheet sheet-id="THNqli" token="V8pKsxipxhKs1gtLXHAcoAtonIb"></sheet>

### Namespace 常用操作

- 查看当前系统下的 namespace 

```Dockerfile
[root@docker dockerfile-example]# lsns 
        NS TYPE   NPROCS   PID USER   COMMAND
4026531834 time      111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531835 cgroup    111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531836 pid       111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531837 user      111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531838 uts       108     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531839 ipc       111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531840 net       111     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531841 mnt       101     1 root   /usr/lib/systemd/systemd showopts --switched-root --system --deserialize 31
4026531862 mnt         1    30 root   kdevtmpfs
4026532122 mnt         1   477 root   /usr/lib/systemd/systemd-udevd
4026532123 uts         1   477 root   /usr/lib/systemd/systemd-udevd
4026532210 mnt         2   512 root   /sbin/auditd
4026532212 mnt         2   707 dbus   /usr/bin/dbus-broker-launch --scope system --audit
4026532213 mnt         1   716 chrony /usr/sbin/chronyd -F 2
4026532214 mnt         1   714 root   /usr/lib/systemd/systemd-logind
4026532215 uts         1   714 root   /usr/lib/systemd/systemd-logind
4026532216 uts         1   716 chrony /usr/sbin/chronyd -F 2
4026532217 mnt         1   785 root   /usr/sbin/NetworkManager --no-daemon
4026532271 mnt         1   890 root   /usr/sbin/rsyslogd -n
```

- 查看某个进程的 namespace 

```Dockerfile
[root@docker dockerfile-example]# ls -la  /proc/1/ns
total 0
dr-x--x--x 2 root root 0 Mar  9 13:53 .
dr-xr-xr-x 9 root root 0 Mar  9 13:53 ..
lrwxrwxrwx 1 root root 0 Mar  9 13:53 cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 root root 0 Mar  9 16:08 ipc -> 'ipc:[4026531839]'
lrwxrwxrwx 1 root root 0 Mar  9 16:08 mnt -> 'mnt:[4026531841]'
lrwxrwxrwx 1 root root 0 Mar  9 13:57 net -> 'net:[4026531840]'
lrwxrwxrwx 1 root root 0 Mar  9 13:57 pid -> 'pid:[4026531836]'
lrwxrwxrwx 1 root root 0 Mar  9 16:13 pid_for_children -> 'pid:[4026531836]'
lrwxrwxrwx 1 root root 0 Mar  9 16:08 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:13 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:08 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Mar  9 16:08 uts -> 'uts:[4026531838]'
```

- 进入某个 namespace 执行命令

```Dockerfile
# 进入系统主进程下执行 ip addr 命令，查看到的结果跟在系统 bash下 执行 ip addr 结果一样
[root@docker ~]# nsenter -t 1 -n ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:23:03:2f brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.93/24 brd 172.17.0.255 scope global dynamic eth0
       valid_lft 312935054sec preferred_lft 312935054sec
    inet6 fe80::216:3eff:fe23:32f/64 scope link 
       valid_lft forever preferred_lft forever
6: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:76:df:28:67 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.1/24 brd 192.168.1.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:76ff:fedf:2867/64 scope link 
       valid_lft forever preferred_lft forever

```

- 运行一个容器，在容器的 namespace 下执行命令

```Dockerfile
# 运行一个容器
[root@docker ~]# docker run -d nginx:1.22.1 
fba13bee996471204348f9545bc3b8f7ea790fcfe3a1d4cbecf9e37c2d69e0e3
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
fba13bee9964   nginx:1.22.1   "/docker-entrypoint.…"   5 seconds ago   Up 4 seconds   80/tcp    hardcore_pare
# 查看容器的进程号
[root@docker ~]# docker inspect  fba13bee9964 | grep -i pid 
            "Pid": 18810,
            "PidMode": "",
            "PidsLimit": null,

# 在容器的 namespace 中执行 命令
[root@docker ~]# nsenter  -t 18810 -n ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
157: eth0@if158: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:c0:a8:01:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 192.168.1.2/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever

# 查询容器的 ip 地址 
[root@docker ~]# docker inspect  fba13bee9964 | grep -i ipaddr
            "SecondaryIPAddresses": null,
            "IPAddress": "192.168.1.2",
                    "IPAddress": "192.168.1.2",
```

- 每个容器都在单独的 Namespace 里

```Bash
[root@docker ~]# docker run --name c1 -d nginx:1.22.1 
cc9a70d5e234095f117723e8e4ff2017b4933cf23155dbef0ae6f60c93f55b51
[root@docker ~]# 
[root@docker ~]# docker run --name c2 -d nginx:1.22.1 
42cad1a6f4872e507ff0062d5c922eb0e49eec09be6ef2782ca38249a265dd46
[root@docker ~]# 
[root@docker ~]# docker inspect c1 | grep -i pid 
            "Pid": 10157,
            "PidMode": "",
            "PidsLimit": null,
[root@docker ~]# 
[root@docker ~]# docker inspect  c2 | grep -i pid 
            "Pid": 10253,
            "PidMode": "",
            "PidsLimit": null,
[root@docker ~]# 
[root@docker ~]# ll /proc/10157/ns 
total 0
lrwxrwxrwx 1 root root 0 Mar  9 16:15 cgroup -> 'cgroup:[4026532225]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 ipc -> 'ipc:[4026532223]'
lrwxrwxrwx 1 root root 0 Mar  9 16:14 mnt -> 'mnt:[4026532221]'
lrwxrwxrwx 1 root root 0 Mar  9 16:14 net -> 'net:[4026532226]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 pid -> 'pid:[4026532224]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 pid_for_children -> 'pid:[4026532224]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 uts -> 'uts:[4026532222]'

[root@docker ~]# 
[root@docker ~]# ll /proc/10253/ns
total 0
lrwxrwxrwx 1 root root 0 Mar  9 16:15 cgroup -> 'cgroup:[4026532293]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 ipc -> 'ipc:[4026532291]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 mnt -> 'mnt:[4026532289]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 net -> 'net:[4026532294]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 pid -> 'pid:[4026532292]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 pid_for_children -> 'pid:[4026532292]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Mar  9 16:15 uts -> 'uts:[4026532290]'

```

Docker 默认没有启用 user namespace .

### 网络 Namespace

#### 使用 ip netns 命令操作 network namespace

```YAML
# 创建一个名为 nstest 的 network namespace
[root@docker ~]# ip netns add nstest

# 列出系统已存在的 network namespace 
[root@docker ~]# ip netns list 
nstest

[root@docker ~]# ls -al /var/run/netns/
total 0
drwxr-xr-x  2 root root   60 Dec  8 08:35 .
drwxr-xr-x 31 root root 1140 Dec  8 08:35 ..
-r--r--r--  1 root root    0 Dec  8 08:35 nstest

[root@docker ~]# 
# 在 network namespace 中执行命令
[root@docker ~]# ip netns  exec nstest ip addr
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00

# 删除 network namespace: nstest 
[root@docker ~]# ip netns delete nstest
```

###  Docker 网络 底层实现 (了解)

启动一个运行在 none 模式的容器

```Bash
[root@docker ~]# docker run --network=none -it busybox
2350cedb32389a9dc45c6282d63f4107e29e5f51b0eb728ab1bcbcdbc9338dac

[root@docker ~]# docker ps 
CONTAINER ID   IMAGE     COMMAND   CREATED         STATUS         PORTS     NAMES
8c36253bb43b   busybox   "sh"      3 seconds ago   Up 2 seconds             vigilant_herschel

[root@docker ~]# docker exec 8c36253bb43b ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
       
```

进入容器 namespace 查看网络配置

```Bash
# 方法一：获取容器进程ID
[root@docker ~]# docker inspect  2350cedb3238 | grep -i pid
            "Pid": 20198,
            "PidMode": "",
            "PidsLimit": null,
# 方法二：获取容器进程ID           
[root@docker ~]# docker inspect  -f '{{.State.Pid}}' 2350cedb3238
20198

[root@docker ~]# nsenter  -t 20198 -n ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever

```

创建一个自定义网络 net0

```Bash
[root@docker ~]# docker network create -d bridge --subnet 172.100.0.0/16 net0
ce1dc69bf1f0ac9a059db2e3c2145661f73d5d38ffae94f8989a33331755f0b9

```

以上命令创建了一个名为 net0 的网桥，网络 ID 是 ce1dc69bf1f0ac9a05...。该网络使用的是 bridge 模式，网段是 172.100.0.0/16, 该网络的第一个IP地址 172.100.0.1 分配给了网桥，网桥的名字可以通过下面命令查到。 

```Bash
[root@docker ~]# ip a 
......
26: br-ce1dc69bf1f0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:ba:8e:49:79 brd ff:ff:ff:ff:ff:ff
    inet 172.100.0.1/16 brd 172.100.255.255 scope global br-ce1dc69bf1f0
       valid_lft forever preferred_lft forever

```

如果想查看网桥的详细信息，可以使用 inspect 命令

```Bash
[root@docker ~]# docker network inspect net0
[
    {
        "Name": "net0",
        "Id": "ce1dc69bf1f0ac9a059db2e3c2145661f73d5d38ffae94f8989a33331755f0b9",
        "Created": "2023-10-22T19:32:42.673939772+08:00",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.100.0.0/16"
                }
            ]
        },

```

为容器绑定 veth pair 网卡，并接入上面创建的网桥上

```Bash
mkdir -p /var/run/netns

PID=$(docker inspect  -f '{{.State.Pid}}' fa228d33773c)
IPADDR=172.100.0.2
NETMASK=255.255.0.0
GATEWAY=172.100.0.1

ln -s /proc/$PID/ns/net /var/run/netns/$PID

ip netns  ls 

# 创建一对veth pair，vetha 和 vethb 
ip link add vetha type veth peer name vethb
# 将 vetha 绑定到网桥 br-ce1dc69bf1f0 
brctl addif br-ce1dc69bf1f0 vetha
# 启用 vetha 
ip link set vetha up 
# vethb 放入指定的网络命名空间
ip link set vethb netns $PID
# 在指定的命名空间中将 vethb 改名为 eth0 
ip netns exec $PID ip link set dev vethb name eth0
# 启用 eth0 
ip netns exec $PID ip link set eth0 up 
# 为 eth0 添加 IP 地址
ip netns exec $PID ip addr add $IPADDR/$NETMASK dev eth0
# 添加默认网关
ip netns exec $PID ip route add default via $GATEWAY
```

验证容器内IP地址可以与外界正常通信 。

```Bash
[root@docker ~]# docker ps 
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
2928e880ee43   nginx:1.22.1   "/bin/sh -c /usr/sbi…"   9 minutes ago   Up 9 minutes             hardcore_mirzakhani
[root@docker ~]# 
[root@docker ~]# docker exec 2928e880ee43 ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
27: eth0@if28: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether aa:66:e4:26:a4:92 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.100.0.2/16 scope global eth0
       valid_lft forever preferred_lft forever
[root@docker ~]# 
[root@docker ~]# ping -c2 172.100.0.2
PING 172.100.0.2 (172.100.0.2) 56(84) bytes of data.
64 bytes from 172.100.0.2: icmp_seq=1 ttl=64 time=0.069 ms
64 bytes from 172.100.0.2: icmp_seq=2 ttl=64 time=0.053 ms

--- 172.100.0.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.053/0.061/0.069/0.008 ms

```

## 附录：

修改 docker0 网桥IP地址段，打开 /etc/docker/daemon.json 文件，修改如下

```Bash
{
  "bip": "192.168.1.1/24",
  "fixed-cidr": "192.168.1.0/25"
}
```

配置文件修改后需要 重启 docker 才生效 

```Bash
# 查看宿主机网格
[root@docker ~]# ip a 
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:b0:8d:ee:0e brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.1/24 brd 192.168.1.255 scope global docker0
       valid_lft forever preferred_lft forever
       
# 启动容器测试       
[root@docker ~]# docker run -it busybox 
/ # 
/ # ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
4: eth0@if5: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue 
    link/ether 02:42:c0:a8:01:02 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.2/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever
/ # ping -c2 www.baidu.com 
PING www.baidu.com (103.235.47.103): 56 data bytes
64 bytes from 103.235.47.103: seq=0 ttl=54 time=1.581 ms
64 bytes from 103.235.47.103: seq=1 ttl=54 time=1.604 ms

--- www.baidu.com ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max = 1.581/1.592/1.604 ms

```

https://docs.docker.com/network/drivers/bridge/

### 镜像地址

MySQL:

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/mysql:8.0
```

WordPress:

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/wordpress:php7.4
ccr.ccs.tencentyun.com/chijinjing/wordpress:php7.4
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/HFTPwTpKVi0v1hk5fnecg6qunUe)
- 导入日期：2026-06-22