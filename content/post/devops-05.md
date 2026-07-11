---
title: "GitLab"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-devops-05/1200/600"
draft: false
tags: ["DevOps", "Obsidian"]
categories: ["DevOps"]
slug: "devops-05"
description: "从 Obsidian 导入的 DevOps 学习笔记"
---
# GitLab

## GitLab 安装 

### 硬件要求 

CPU

- **4 核** 是推荐的最小核数，支持多达 500 名用户
- **8 核** 支持多达 1000 名用户

内存

- **4GB RAM** 是**必需的**最小内存，支持多达 500 名用户
- 8GB RAM 支持多达 1000 名用户

存储

80G  建议配置 LVM 挂载，方便后期扩容 

### 安装和配置所需的依赖

```Bash
yum install -y curl policycoreutils-python openssh-server perl
```

（可选）如果要使用 Postfix 来发送电子邮件通知，执行以下安装命令。

```Bash
yum install postfix
systemctl enable postfix
systemctl start postfix
```

### 配置 GitLab 仓库 

gitlab_gitlab-ce.repo

```Bash
[gitlab_gitlab-ce]
name=gitlab_gitlab-ce
baseurl=https://packages.gitlab.com/gitlab/gitlab-ce/el/7/$basearch
repo_gpgcheck=1
gpgcheck=1
enabled=1
gpgkey=https://packages.gitlab.com/gitlab/gitlab-ce/gpgkey
       https://packages.gitlab.com/gitlab/gitlab-ce/gpgkey/gitlab-gitlab-ce-3D645A26AB9FBD22.pub.gpg
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300

[gitlab_gitlab-ce-source]
name=gitlab_gitlab-ce-source
baseurl=https://packages.gitlab.com/gitlab/gitlab-ce/el/7/SRPMS
repo_gpgcheck=1
gpgcheck=1
enabled=1
gpgkey=https://packages.gitlab.com/gitlab/gitlab-ce/gpgkey
       https://packages.gitlab.com/gitlab/gitlab-ce/gpgkey/gitlab-gitlab-ce-3D645A26AB9FBD22.pub.gpg
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
```

```Bash
wget --content-disposition https://packages.gitlab.com/gitlab/gitlab-ce/packages/el/7/gitlab-ce-16.11.3-ce.0.el7.x86_64.rpm/download.rpm
```

### 下载并安装 GitLab

执行如下命令开始安装：

```Bash
EXTERNAL_URL="http://gitlab.xxhf.cc" yum install -y gitlab-ce-16.11.6-ce.0.el7.x86_64.rpm

# or
GITLAB_ROOT_EMAIL="chijinjing@xinxianghf.com" GITLAB_ROOT_PASSWORD="123@xxhf" EXTERNAL_URL="http://gitlab.xinxianghf.cloud" apt install gitlab-ce-16.11.3
```

GitLab 安装成功

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/01.png)

### 登录GitLab 实例

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/02.png)

使用上面步骤配置的 `EXTERNAL_URL` 中的地址来访问 GitLab 实例。用户名默认为 `root` 。如果在安装过程中指定了初始密码，则用初始密码登录，如果未指定密码，则系统会随机生成一个密码并存储在 `/etc/gitlab/initial_root_password` 文件中， 查看随机密码并使用 `root` 用户名登录。

> 注意：出于安全原因，24 小时后，`/etc/gitlab/initial_root_password` 会被第一次 `gitlab-ctl reconfigure` 自动删除，因此若使用随机密码登录，建议安装成功初始登录成功之后，立即修改初始密码。

## GitLab 使用

### 用户管理 

新建用户

管理员创建 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/03.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/04.png)

因为我们使用的是假邮箱，所以用户无法收到设定密码的邮件，可以通过 编辑 按钮来配置密码： 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/05.png)

用户自行注册

http://gitlab.xxhf.cc/users/sign_in

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/06.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/07.png)

注册成功后会 发送邮件到用户配置的邮箱。 

禁用用户注册功能 ： 

如果允许任何用户都可注册，这样会导致不方便管理，一般选择关闭。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/08.png)

### 群组管理  

1）群组能方便的管理子项目，群组内可以创建子群组；

2）生产环境可以用实际项目名对应“xxhf 群组”，项目中的微服务名对应“云计算项目”。

**新建群组** 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/09.png)

为群组起个名字

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/10.png)

项目创建后可以邀请 项目成员加入 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/11.png)

**删除群组** 

删除群组 会 删除所有子项目，操作需谨慎。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/12.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/13.png)

### 项目管理 

在群组内点击“新建项目”→“创建空白项目” 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/14.png)

和建群组一样，起个名字即可，路径会被自动填充。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/15.png)

项目创建后，默认仓库为空的，gitlab 会给出命令指引， 我们可以按照指引的命令上传代码 。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/16.png)

### 权限管理 

项目成员有不同的角色，常用的有：

- Developer：可以 Pull、Push 代码，适用于开发工程师；
- Maintainer：除了 Developer 权限外还能合并分支，适用于项目管理者。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-05/17.png)
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/GvG4wYiURivfBmkYz9ccQ0IWnDc)
- 导入日期：2026-06-22