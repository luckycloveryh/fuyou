---
title: "vsftpd FTP 服务配置指南"
date: 2025-12-17T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-05/1200/675"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["4. 网络基础阶段"]
slug: "network-05"
description: "介绍《vsftpd FTP 服务配置指南》，涵盖vsftpd服务全维度配置指南（含原理/命令/实战）、DNS服务核心对比和FTP协议差异对比等实践要点。"
---
# vsftpd服务全维度配置指南（含原理/命令/实战）
## 一、前置知识：DNS与FTP协议基础
### 1. DNS服务核心对比
| 类型     | 数据同步方式 | 核心优势            | 数据存储特点          |
| ------ | ------ | --------------- | --------------- |
| 主从DNS  | 自动同步   | 分流访问、高可用、故障转移   | 从服务器实时同步并存储完整数据 |
| 无主从DNS | 脚本手动同步 | 无自动同步优势，仅保证数据一致 | -               |
| 缓存DNS  | 缓存解析结果 | 加快客户端解析速度       | 无完整数据，仅缓存解析记录   |
> 备注：缓存DNS需重启`dnsmasq`服务生效（`systemctl restart dnsmasq`）。

### 2. FTP协议差异对比
| 协议     | 核心依赖        | 安全特性   | 适用场景        |
| ------ | ----------- | ------ | ----------- |
| vsftpd | 原生FTP协议     | 默认明文传输 | 局域网/信任环境传输  |
| SFTP   | SSH加密       | 全程加密   | 公网安全文件传输    |
| FTPS   | FTP+SSL/TLS | 加密传输   | 需兼容FTP的加密场景 |


## 二、vsftpd核心基础：用户模式与客户端
### 1. 核心用户模式（配置+命令）
#### （1）本地用户（/etc/passwd系统用户）
| 操作场景        | bash命令示例                                              | 命令解释                                                                    |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| 创建本地用户      | `useradd -d /data/ftp_user -m lisi`                   | `-d`指定家目录为/data/ftp_user，`-m`自动创建家目录（CentOS 9支持多层自动创建，CentOS 7需手动建上层目录） |
| 禁止远程登录      | `useradd -s /sbin/nologin ftp_user`                   | `-s`指定shell为/nologin，仅允许FTP访问，禁止SSH远程登录                                 |
| 修改已有用户shell | `sed -i 's/\/bin\/bash/\/sbin\/nologin/' /etc/passwd` | 替换目标用户的shell字段，批量禁止远程登录                                                 |
> 权限特点：默认拥有FTP全权限（下载/上传/删除/改名），登录默认进入家目录。
```bash
+++++++++++++++++++++++++++++++++++++++注意！！！！+++++++++++++++++++++++++++++++
要允许本地用户登录需要进行额外的配置
vim /etc/pam.d/vsftp
注释掉以下这一行
auth       required    pam_shells.so
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
```
#### （2）匿名用户
- 登录特性：用户名无要求，密码任意，默认登录目录为`/var/ftp`（不同系统可能为`/var/ftp/pub`），访问日志实名记录；
- 权限配置（解决550报错）：
  ```bash
  # 1. 修改配置文件开启匿名上传与写权限
  echo "anon_upload_enable=YES" >> /etc/vsftpd/vsftpd.conf
  echo "anon_mkdir_write_enable=YES" >> /etc/vsftpd/vsftpd.conf
  # 2. 设置匿名用户Umask（避免上传文件权限600）
  echo "anon_umask=022" >> /etc/vsftpd/vsftpd.conf
  # 3. 调整目录权限（文件系统层面）
  chmod 777 /var/ftp/pub
  systemctl restart vsftpd
  ```
> Umask说明：022表示上传文件默认权限为644（777-022=755，文件默认去掉执行权限为644），保证其他用户可下载。

### 2. 客户端连接工具
| 工具类型       | 连接命令/操作方式                          | 适用系统       |
|----------------|---------------------------------------------|----------------|
| 命令行         | `ftp 192.168.1.100` / `lftp 192.168.1.100`  | Linux          |
| 图形化         | FileZilla/Windows资源管理器（ftp://IP）     | Windows/Linux  |


## 三、实战应用：vsftpd搭建局域网YUM源
### 1. 服务端配置（匿名用户为例）
```bash
# 1. 安装vsftpd并启动
yum install -y vsftpd
systemctl enable --now vsftpd

# 2. 准备YUM源文件目录（按系统版本分类）
mkdir -p /var/ftp/pub/centos/{7,9}/x86_64/Packages
# 3. 复制对应版本RPM包到指定目录（以CentOS 7为例）
cp /mnt/cdrom/Packages/* /var/ftp/pub/centos/7/x86_64/Packages/
# 4. 生成repodata索引（需安装createrepo）
yum install -y createrepo
createrepo /var/ftp/pub/centos/7/x86_64/
```

### 2. 客户端配置
```bash
# 1. 备份原有YUM源
mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.bak
# 2. 创建自定义YUM源配置
cat > /etc/yum.repos.d/ftp-local.repo << EOF
[ftp-local]
name=FTP Local Repository
baseurl=ftp://192.168.1.100/pub/centos/7/x86_64
enabled=1
gpgcheck=0
EOF
# 3. 测试YUM源
yum clean all && yum makecache
yum install -y nginx  # 测试安装软件
```

### 3. 系统兼容性说明
- RPM包分版本（EL7/EL9），需按客户端系统版本在`/var/ftp/pub`下分类存放；
- 内核版本识别：`uname -r`（3.x为旧版本，5.x为新版本），发行版本识别：`cat /etc/redhat-release`。


## 四、进阶管控：本地用户权限与安全限制
### 1. 本地用户家目录禁锢（防止访问系统根目录）
```bash
# 1. 修改vsftpd主配置文件
cat >> /etc/vsftpd/vsftpd.conf << EOF
# 禁锢本地用户到家目录
chroot_local_user=YES
# 允许禁锢后读取家目录（避免权限报错）
allow_writeable_chroot=YES
EOF
# 2. 重启服务生效
systemctl restart vsftpd
```
> 效果：用户登录后仅能看到家目录内容，无法切换到`/`等系统目录。

### 2. 禁止本地用户远程登录（补充）
- 已创建用户修改shell：`usermod -s /sbin/nologin lisi`；
- 验证：`su - lisi`（提示无法登录），`ftp 192.168.1.100`（可正常登录）。


## 五、端口与传输模式：原理+配置+测试
### 1. 传输模式核心对比
| 模式       | 控制端口 | 数据端口               | 防火墙配置要点                     | 效率/可控性       |
|------------|----------|------------------------|------------------------------------|-------------------|
| 主动模式   | 21       | 20（服务器主动发起）   | 客户端开放随机端口，可控性差       | 低，多客户端易拥塞 |
| 被动模式   | 21       | 随机端口（默认1024-65535） | 服务器开放21+指定端口范围，可控性高 | 高，默认推荐      |

### 2. 被动模式端口范围限制（降低安全风险）
```bash
# 1. 配置被动端口范围（60000-62000）
cat >> /etc/vsftpd/vsftpd.conf << EOF
pasv_min_port=62000
pasv_max_port=65000
EOF
# 2. 开放防火墙端口（CentOS 7/8）
firewall-cmd --add-port=21/tcp --permanent
firewall-cmd --add-port=60000-62000/tcp --permanent
firewall-cmd --reload
# 3. 重启vsftpd
systemctl restart vsftpd
```

### 3. 端口与传输测试命令
```bash
# 1. 查看vsftpd监听端口
ss -ntp | grep vsftpd  # 仅显示21端口（控制连接）
# 2. 创建2.2G测试文件（用于观察数据端口）
dd if=/dev/zero of=/data/test_bigfile bs=1G count=2.2
# 3. 限制传输速率（便于观察端口）
echo "local_max_rate=102400" >> /etc/vsftpd/vsftpd.conf  # 限制为100KB/s
systemctl restart vsftpd
# 4. 传输文件并观察端口
lftp -e "put /data/test_bigfile; exit" 192.168.1.100
ss -ntp | grep vsftpd  # 可看到60000-62000范围内的随机数据端口
```


## 六、安全强化：FTPS加密（解决明文传输风险）
### 1. 加密原理
采用SSL/TLS协议，通过数字证书实现身份认证+数据加密，协议升级为FTPS，需使用`lftp`/FileZilla等支持FTPS的工具连接。

### 2. 自签名证书生成+配置（测试环境）
```bash
# 1. 安装依赖包
yum install -y openssl openssl-devel
# 2. 创建证书存放目录
mkdir -p /etc/vsftpd/certs
chmod 700 /etc/vsftpd/certs
# 3. 生成私钥（2048位RSA算法）
openssl genrsa -out /etc/vsftpd/certs/vsftpd.key 2048
# 4. 生成证书签名请求（CSR）
openssl req -new -key /etc/vsftpd/certs/vsftpd.key -out /etc/vsftpd/certs/vsftpd.csr
# 5. 生成自签名证书（有效期365天）
openssl x509 -req -days 365 -in /etc/vsftpd/certs/vsftpd.csr -signkey /etc/vsftpd/certs/vsftpd.key -out /etc/vsftpd/certs/vsftpd.crt
# 6. 设置证书权限（仅root可访问）
chmod 600 /etc/vsftpd/certs/*
```

### 3. vsftpd加密配置
```bash
# 编辑配置文件开启SSL/TLS
cat >> /etc/vsftpd/vsftpd.conf << EOF
# 开启SSL功能
ssl_enable=YES
# 支持SSL版本
ssl_tlsv1=YES
ssl_sslv2=YES
ssl_sslv3=YES
# 强制加密（匿名+本地用户）
force_local_data_ssl=YES
force_local_logins_ssl=YES
force_anon_data_ssl=YES
force_anon_logins_ssl=YES
# 证书路径
rsa_cert_file=/etc/vsftpd/certs/vsftpd.crt
rsa_private_key_file=/etc/vsftpd/certs/vsftpd.key
EOF
# 重启服务
systemctl restart vsftpd
```

### 4. FTPS连接测试（lftp）
```bash
# 跳过自签名证书验证，连接FTPS
lftp -e "set ssl:verify-certificate no; open ftps://192.168.1.100"
```


## 七、配套优化：时间同步与时区知识
### 1. 证书时间同步问题解决
- 问题：服务器时间与证书有效期不匹配→证书“未生效/已过期”；
- 解决方案：
  ```bash
  # 方法1：手动同步时间（以北京时间为例）
  date -s "2025-12-17 10:00:00"
  # 方法2：虚拟机自动同步（勾选“客户机时间与主机同步”）
  # 方法3：使用ntp同步网络时间
  yum install -y ntpdate
  ntpdate ntp.aliyun.com
  ```

### 2. 时区核心知识
- 全球24个时区，以GMT（格林尼治时间）为0时区，东八区（CST/UTC+8）为中国标准时间；
- 时区查看/设置：
  ```bash
  # 查看当前时区
  timedatectl
  # 设置为东八区
  timedatectl set-timezone Asia/Shanghai
  ```


## 八、学习与实验规范
### 1. 学习重点
- 无需死记命令，掌握核心原理：如DHCP静态绑定=固定IP分配、DNS主从=自动同步；
- 核心参数记忆：vsftpd主配置文件`/etc/vsftpd/vsftpd.conf`、关键模块`chroot_local_user`/`pasv_min_port`等。

### 2. 实验注意事项
- 大文件传输前检查磁盘空间：`df -h /data`；
- 实验结果拍照留存，便于复盘；
- 定时清理测试文件：`rm -rf /data/test_bigfile`，避免占用空间。


## DHCP警告问题补充（非vsftpd但关联实验）
### 问题说明
- 现象：日志提示`Remove host declaration...`；
- 原因：静态绑定IP（host声明）与动态地址池（range）重叠；
- 影响：仅警告，不影响DHCP服务运行（客户端可正常获取IP）；
- 消除警告命令：
  ```bash
  # 编辑DHCP配置文件，调整动态地址池（以192.168.111.0/24为例）
  sed -i 's/range 192.168.111.50 192.168.111.100;/range 192.168.111.70 192.168.111.100;/' /etc/dhcp/dhcpd.conf
  systemctl restart dhcpd
  ```
> 原理：将静态绑定IP（如192.168.111.66）移出动态池范围。