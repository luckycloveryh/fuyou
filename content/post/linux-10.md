---
title: "GRUB 引导修复与 root 密码找回"
date: 2025-11-28T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-linux-10/1200/600"
draft: false
tags: ["Linux", "Obsidian"]
categories: ["Linux"]
slug: "linux-10"
description: "从 Obsidian 导入的 Linux 学习笔记"
---
# 视频主要内容总结
视频围绕Linux系统中GRUB菜单（视频中称“刮菜单/广告菜单”，应为表述误差）的相关操作展开，涵盖加密、损坏修复及密码找回三大核心模块，同时涉及系统启动流程与安全增强工具（SELinux）的处理，具体内容如下：

## 一、GRUB菜单加密
### 1. 加密必要性
系统启动时的GRUB菜单默认无需密码即可编辑：在菜单界面按“e”进入编辑模式，在行尾输入“rd.debug”并按“Ctrl+X”，可直接以root身份免密登录，存在安全风险。加密后需输入指定用户名和密码才能编辑，限制本地非法操作。

### 2. 加密原理与操作
- **核心文件判断**：系统通过`/boot/grub2/user.cfg`文件判断是否需要密码——该文件存在则需密码，默认不存在（无需密码）。
- **版本差异**：RHEL 6及以前版本仅需设置密码，RHEL 7及以后版本需设置用户名（默认root，可自定义）和密码，且该账号与系统用户管理无关，仅用于GRUB菜单验证。
- **实操步骤**：执行`grub2-set-password`命令设置密码，系统会自动生成`/boot/grub2/user.cfg`文件；重启后编辑GRUB菜单需先输入用户名和密码。
- **取消加密**：删除`/boot/grub2/user.cfg`文件即可恢复无需密码的状态。


## 二、GRUB菜单损坏修复
### 1. 模拟损坏
通过`dd if=/dev/zero of=/dev/nvme0n1 bs=1 count=446`命令，精确覆盖硬盘前446字节（MBR分区表中的GRUB引导信息），模拟GRUB菜单损坏，系统启动时会因无法引导硬盘而自动尝试光盘引导。

### 2. 修复流程
1. **光盘引导与故障排除**：进入光盘启动界面，选择“故障排除”选项，进入硬盘挂载环境（光盘将硬盘挂载至`/mnt/sysroot`）。
2. **切换根目录**：执行`chroot /mnt/sysroot`，切换至硬盘的系统根目录，此时操作对象为硬盘文件。
3. **重装GRUB**：执行`grub2-install /dev/nvme0n1`重装GRUB引导程序，修复引导信息。
4. **重启验证**：退出`chroot`环境后重启系统，GRUB菜单恢复正常，系统可正常启动。

### 3. 特殊场景：GRUB文件误删修复
若误删`/boot/grub2`目录下的核心文件（如`i386-pc`相关文件），修复流程与上述一致，重装GRUB后需额外执行`grub2-mkconfig -o /boot/grub2/grub.cfg`，重建GRUB配置文件，确保菜单正常加载。


## 三、系统密码找回
针对root密码遗忘场景，视频提供两种通用找回方法，适用于绝大多数Linux版本（RHEL 7及以后为主）。

### 方法一：rd.break模式
1. **编辑GRUB菜单**：系统启动时按“e”进入编辑模式，找到内核启动行（以“linux16”或“linux”开头），在行尾添加`rd.break`。
2. **进入紧急模式**：按“Ctrl+X”启动，系统进入紧急模式，此时根分区为只读状态。
3. **重新挂载根分区**：执行`mount -o remount,rw /sysroot`，将根分区改为可写。
4. **切换根目录与改密码**：执行`chroot /sysroot`，再执行`passwd root`设置新密码（或通过`echo "新密码" | passwd --stdin root`批量设置）。
5. **处理SELinux**：若SELinux开启，需执行`touch /.autorelabel`（让系统重启时重新生成安全上下文），或修改`/etc/selinux/config`将`SELINUX=enforcing`改为`SELINUX=disabled`，避免SELinux阻止系统启动。
6. **重启登录**：退出`chroot`环境，执行`reboot`，使用新密码登录系统。

### 方法二：init=/bin/sh模式
1. **编辑GRUB菜单**：同方法一，在内核启动行尾添加`init=/bin/sh`。
2. **进入shell环境**：按“Ctrl+X”启动，直接进入shell环境（无需切换根目录）。
3. **重新挂载根分区**：执行`mount -o remount,rw /`，将根分区改为可写。
4. **修改密码**：直接执行`passwd root`设置新密码，无需切换根目录。
5. **继续启动系统**：执行`exec /sbin/init`，系统继续加载服务，完成启动后可使用新密码登录。

### 版本适配说明
- 多数版本（如RHEL 7/8/9、CentOS 7/8）支持两种方法；
- 特殊版本（如Rocket 9.0）若`rd.break`失效，可使用`init=/bin/sh`模式，两种方法可覆盖几乎所有密码找回场景。


## 四、补充知识点
1. **SELinux作用与处理**：SELinux是系统安全增强工具，默认开启时会监控系统文件修改（如密码文件），若修改后未处理安全上下文，会阻止系统启动，需通过`/.autorelabel`或修改配置文件解决。
2. **机房物理安全**：GRUB加密可防止本地非法编辑，但无法阻止物理接触者通过优盘/光盘引导、拔插硬盘等方式绕过限制，因此强调机房物理安全的重要性。
3. **命令与文件说明**：核心命令（如`grub2-set-password`、`grub2-install`、`chroot`）和关键文件（`/boot/grub2/user.cfg`、`/etc/selinux/config`、`/etc/shadow`）的功能与路径，需结合实操记忆。