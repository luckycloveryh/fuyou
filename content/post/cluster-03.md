---
title: "SELinux 安全机制"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-cluster-03/1200/600"
draft: false
tags: ["集群", "Obsidian"]
categories: ["5. 集群阶段"]
slug: "cluster-03"
description: "从 Obsidian 导入的 集群 学习笔记"
---
# SELinux 安全机制

## 一、课程目标与背景

### 1.1 课程目标
- 理解 SELinux 的核心概念和强制访问控制（MAC）机制。
- 掌握 SELinux 的安全上下文配置、布尔值管理和端口规则调整。
- 学会排查和解决 SELinux 相关的常见问题（如服务访问受限）。

### 1.2 SELinux 在 Linux 运维中的重要性
SELinux（Security-Enhanced Linux）是 Linux 内核的强制访问控制模块，广泛应用于企业级服务器（如 CentOS、RHEL）。它通过细粒度的安全策略，限制进程和用户权限，防止未授权访问和权限提升，确保服务在高安全性环境下稳定运行。

**适用场景**：
- 高安全需求的服务器（如 Web 服务器、数据库、Squid 代理）。
- LVS-DR 模式下的调度器和真实服务器，防止未授权网络访问。

---

## 二、SELinux 核心概念

### 2.1 什么是 SELinux？
SELinux 是由 NSA 开发并集成到 Linux 内核的安全模块，通过强制访问控制（MAC）增强系统安全性。与传统的自主访问控制（DAC，基于文件权限如 `chmod`）相比，SELinux 基于策略强制执行权限，即使进程被劫持，也无法超越策略限制。

### 2.2 核心特性
- **强制访问控制（MAC）**：对所有主体（进程）和客体（文件、端口、设备）强制执行策略。
- **最小权限原则**：仅授予进程或用户完成任务所需的最小权限。
- **安全上下文**：为每个资源分配标签（用户:角色:类型），控制访问行为。
- **三种工作模式**：
  - **Enforcing**：严格执行策略，阻止未授权操作。
  - **Permissive**：记录违规操作但不阻止，适合调试。
  - **Disabled**：完全禁用 SELinux（不推荐，降低安全性）。

### 2.3 DAC vs MAC
- **DAC**：基于文件属主和权限（如 `rwxr-xr-x`），易被提权攻击绕过。
- **MAC**：SELinux 策略决定访问权限，忽略文件属主设置。例如，即使 `/etc/passwd` 权限为 `777`，SELinux 可限制非授权进程访问。

---

## 三、SELinux 安全上下文

### 3.1 安全上下文格式
SELinux 为每个资源分配一个安全上下文，格式为：**用户:角色:类型**（某些情况下包含 MLS 级别）。
- **用户**：如 `system_u`（系统用户）、`unconfined_u`（无限制用户）。
- **角色**：如 `system_r`（系统角色）、`object_r`（对象角色）。
- **类型**：定义访问权限，如 `httpd_sys_content_t`（Apache 内容）、`passwd_file_t`（密码文件）。

**查看文件安全上下文**：
```bash
ls -Z /etc/passwd
# 输出示例：-rw-r--r--. root root system_u:object_r:passwd_file_t:s0 /etc/passwd
```

**查看进程安全上下文**：
```bash
ps auxZ | grep httpd
# 输出示例：system_u:system_r:httpd_t:s0 /usr/sbin/httpd
```

### 3.2 上下文与服务关联
- **LVS-DR 模式**：调度器和真实服务器的进程（如 `httpd`）需正确配置上下文（如 `httpd_t`），以访问 VIP 或文件。
- **Squid 代理**：Squid 进程（`squid_t`）需访问缓存目录（如 `/var/spool/squid`）和端口（如 `http_port_t`）。

---

## 四、SELinux 实践操作

### 4.1 检查与设置 SELinux 模式
- **查看当前模式**：
  ```bash
  getenforce
  # 输出示例：Enforcing
  ```
- **临时切换模式**：
  ```bash
  setenforce 0  # 切换到 Permissive
  setenforce 1  # 切换到 Enforcing
  ```
- **永久设置模式**（编辑 `/etc/selinux/config`）：
  ```bash
  sed -i 's/SELINUX=.*$/SELINUX=enforcing/' /etc/selinux/config
  ```

### 4.2 修改文件安全上下文
当服务（如 Apache、Squid）无法访问文件或目录时，需调整安全上下文。
- **修改上下文**（以 Apache 访问 `/data/www/` 为例）：
  ```bash
  chcon -R -t httpd_sys_content_t /data/www/
  ```
- **还原默认上下文**：
  ```bash
  restorecon -Rv /data/www/
  ```

### 4.3 管理布尔值开关
布尔值控制服务的特定功能，适合动态调整策略。
- **查看布尔值**：
  ```bash
  getsebool -a | grep samba
  # 输出示例：samba_enable_home_dirs --> off
  ```
- **启用 Samba 用户家目录访问**：
  ```bash
  setsebool -P samba_enable_home_dirs on
  ```

### 4.4 修改端口规则
当服务使用非标准端口时，需调整 SELinux 端口规则。
- **查看 HTTP 端口**：
  ```bash
  semanage port -l | grep http_port_t
  # 输出示例：http_port_t tcp 80, 443, 8080
  ```
- **添加新端口（如 10086）**：
  ```bash
  semanage port -a -t http_port_t -p tcp 10086
  ```

### 4.5 实验：配置 Apache 与 SELinux
1. 创建网页目录：
   ```bash
   mkdir -p /data/www
   echo "<h1>Hello SELinux</h1>" > /data/www/index.html
   ```
2. 设置 Apache 访问权限：
   ```bash
   chcon -R -t httpd_sys_content_t /data/www/
   ```
3. 修改 Apache 配置（`/etc/httpd/conf/httpd.conf`）：
   ```conf
   DocumentRoot "/data/www"
   ```
4. 测试访问：
   ```bash
   curl http://localhost
   ```

---

## 五、常见问题与解决方案

### 5.1 服务无法访问文件
**问题**：Apache 无法访问 `/data/www/index.html`，报 `403 Forbidden`。
**原因**：目录上下文不匹配（非 `httpd_sys_content_t`）。
**解决**：
```bash
chcon -R -t httpd_sys_content_t /data/www/
restorecon -Rv /data/www/
```

**关联 LVS/Squid**：在 LVS-DR 模式下，若真实服务器的 Web 文件上下文错误，可能导致客户端请求失败。Squid 缓存目录（如 `/var/spool/squid`）也需正确上下文（如 `squid_cache_t`）。

### 5.2 Samba 用户无法访问家目录
**问题**：Samba 用户无法访问 `/home/user/`。
**原因**：布尔值 `samba_enable_home_dirs` 未启用。
**解决**：
```bash
setsebool -P samba_enable_home_dirs on
```

### 5.3 服务无法监听非标准端口
**问题**：Apache 配置为监听 10086 端口后无法启动。
**原因**：SELinux 未允许 `http_port_t` 绑定到 10086。
**解决**：
```bash
semanage port -a -t http_port_t -p tcp 10086
```

**关联 LVS**：在 LVS-DR 模式中，若调度器或真实服务器使用非标准端口，需类似配置。

### 5.4 Squid 缓存目录访问失败
**问题**：Squid 无法写入 `/var/spool/squid`，导致缓存失败。
**原因**：缓存目录上下文错误。
**解决**：
```bash
chcon -R -t squid_cache_t /var/spool/squid
restorecon -Rv /var/spool/squid
```

---

## 六、总结

SELinux 通过强制访问控制和安全上下文，为 Linux 系统提供强大的安全保障。在 LVS-DR 和 Squid 等网络服务环境中，正确配置 SELinux 上下文、布尔值和端口规则至关重要。运维人员应掌握 SELinux 的核心操作（如 `chcon`、`setsebool`、`semanage`），以确保系统安全与功能平衡。

**适用场景**：
- 高安全需求的服务器（如 Web、数据库、Squid 代理）。
- LVS-DR 模式的调度器和真实服务器。
- Linux 系统管理课程的教学与实践。
