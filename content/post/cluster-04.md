---
title: "DevOps 构建：基于 GitLab 和 Jenkins 的 CI/CD 实践"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["集群", "Obsidian"]
categories: ["集群"]
slug: "cluster-04"
description: "从 Obsidian 导入的 集群 学习笔记"
---
# DevOps 构建：基于 GitLab 和 Jenkins 的 CI/CD 实践

## 一、课程目标

- DevOps 的基本概念及其在软件开发中的作用。
- GitLab 作为代码托管和版本控制工具的安装与配置。
- Jenkins 作为自动化构建工具的安装与配置。
- 一个简单的 CI/CD 流水线的构建过程。

---

## 二、什么是 DevOps？

### 2.1 DevOps 定义
DevOps 是 **Development（开发）** 和 **Operations（运维）** 的组合，是一种文化、实践和工具集，旨在缩短开发周期、提高部署频率并确保软件交付的可靠性。它通过自动化和协作打破开发团队与运维团队之间的壁垒。

### 2.2 CI 和 CD 的含义
- **CI（持续集成，Continuous Integration）**：
  - **定义**：开发人员频繁地将代码集成到共享仓库中（通常一天多次），每次集成通过自动化构建和测试验证。
  - **由谁实现**：开发团队借助工具（如 Jenkins、GitLab CI）实现。
  - **需求场景**：多人协作开发时，避免代码冲突，确保代码质量。
  - **好处**：尽早发现问题，减少集成成本。

- **CD（持续部署/持续交付，Continuous Deployment/Delivery）**：
  - **定义**：
    - 持续交付：确保代码随时可以部署到生产环境，通常需要人工审核。
    - 持续部署：每次通过测试的代码自动部署到生产环境。
  - **由谁实现**：运维团队配合开发团队，使用自动化工具完成。
  - **需求场景**：需要快速上线新功能或修复 Bug 的项目。
  - **好处**：加速交付，提升用户满意度。

### 2.3 DevOps 的应用场景
- **快速迭代**：互联网产品需要频繁更新。
- **团队协作**：开发、测试、运维人员需要高效配合。
- **高质量交付**：通过自动化减少人为错误。

---

## 三、系统环境

- **操作系统**：Rocky Linux 9.4
- **软件安装方式**：优先使用 RPM 包安装，若无 RPM 包，则使用其他方式（如源码安装）。
- **实验硬件要求**：至少 2 核 CPU、4GB 内存、20GB 磁盘空间。
- **网络要求**：可访问互联网以下载软件包。

---

## 四、实验准备

### 4.1 更新系统
确保系统软件 安装软件前，更新系统以获取最新补丁和依赖。

```bash
# 步骤1：更新系统软件包
$ dnf update -y
# -y：自动确认所有更新
```

### 4.2 关闭防火墙和 SELinux（实验环境）
为简化实验，暂时禁用防火墙和 SELinux。

```bash
# 步骤2：停止并禁用防火墙
$ systemctl stop firewalld
# 停止防火墙服务
$ systemctl disable firewalld
# 开机不启动防火墙

# 步骤3：临时禁用 SELinux
$ setenforce 0
# 临时设置为宽松模式
# 永久禁用需编辑 /etc/selinux/config 文件，将 SELINUX=disabled
```

---

## 五、安装 GitLab

GitLab 是一个开源的代码托管平台，提供版本控制、问题跟踪和 CI/CD 功能。

### 5.1 添加 GitLab 官方仓库
Rocky Linux 9.4 默认仓库不包含 GitLab，使用官方 RPM 源安装。

```bash
# 步骤4：创建 GitLab 仓库配置文件
$ echo "[gitlab-ce]
name=GitLab CE
baseurl=https://packages.gitlab.com/gitlab/gitlab-ce/el/9/\$basearch
enabled=1
gpgcheck=0" > /etc/yum.repos.d/gitlab-ce.repo
```

### 5.2 安装 GitLab CE（社区版）

```bash
# 步骤5：安装 GitLab CE
$ dnf install -y gitlab-ce
```

### 5.3 配置 GitLab
安装后需初始化 GitLab 并设置管理员密码。

```shell
# 步骤6：运行 GitLab 配置脚本
$ gitlab-ctl reconfigure
# 自动配置 GitLab 服务，包括数据库、Web 服务器等

# 步骤7：检查 GitLab 状态
$ gitlab-ctl status
# 确认所有服务（nginx、postgresql 等）正常运行

# 修改默认密码
$ gitlab-rake "gitlab:password:reset"
# 必须遵循密码原则
```

### 5.4 访问 GitLab
- 打开浏览器，输入服务器 IP（如 `http://192.168.5.110`）。

---

## 六、安装 Jenkins

Jenkins 是一个开源自动化服务器，用于实现 CI/CD 流水线。

注意：重新启动一台机器安装jenkins，否则有些端口会跟gitlab冲突

### 6.1 添加 Jenkins 官方仓库

```shell
# 步骤8：创建 Jenkins 仓库配置文件
$ echo "[jenkins]
name=Jenkins
baseurl=http://pkg.jenkins.io/redhat-stable
enabled=1
gpgcheck=0" > /etc/yum.repos.d/jenkins.repo
```

### 6.2 安装 Java（Jenkins 依赖）
Jenkins 需要 Java 运行时环境。

```shell
# 步骤9：安装 OpenJDK 21
$ dnf install -y java-21-openjdk
# -y：自动确认安装
```

### 6.3 安装 Jenkins

```shell
# 步骤10：安装 Jenkins
$ dnf install -y jenkins
```

### 6.4 启动 Jenkins

```shell
# 步骤11：启动并启用 Jenkins
$ systemctl enable --now jenkins
# 启动&开机自启
```

### 6.5 访问 Jenkins
浏览器访问 `http://<服务器IP>:8080`。

首次访问需输入初始密码，从文件中获取：
```
# 步骤12：获取初始密码
$ cat /var/lib/jenkins/secrets/initialAdminPassword
```

创建管理员账户（例如用户名 `admin`，密码 `jenkins123`）。

---

## 七、构建 CI/CD 流水线

### 7.1 在 GitLab 创建项目
登录 GitLab（`http://<服务器IP>`）。

点击 **New Project**，名称为 `myapp`，选择 **Initialize repository with a README**。

创建一个简单的代码文件：
```
# 步骤13：添加示例代码
$ echo "print('Hello, DevOps!')" > main.py
# 创建 Python 文件
$ git init
$ git add main.py
$ git commit -m "Initial commit"
$ git remote add origin http://<GitLab IP>/root/myapp.git
$ git push origin master
# 使用 root 用户和密码推送代码
```

### 7.2 配置 Jenkins 与 GitLab 集成
在 Jenkins 中安装 **GitLab Plugin**：
- 进入 **Manage Jenkins > Manage Plugins**，搜索并安装名称叫GitLab开头的插件。

创建 Jenkins 任务：
- 点击 **New Item**，名称为 `myapp-pipeline`，选择 **Pipeline**。

配置 GitLab 仓库：
- 在 **General** 中勾选 **GitLab Connection**，输入 GitLab URL 和凭证（root 用户和密码）。

- 在 **Pipeline** 中选择 **Pipeline script**，输入：
  
  
  
  ```
  pipeline {
      agent any
      stages {
          stage('Build') {
              steps {
                  sh 'python3 main.py'
              }
          }
          stage('Test') {
              steps {
                  echo 'Running tests...'
              }
          }
          stage('Deploy') {
              steps {
                  echo 'Deploying to production...'
              }
          }
      }
  }
  ```
  
- 保存并点击 **Build Now**，查看输出 `Hello, DevOps!`。

  

### 7.3 配置 Webhook
实现代码提交自动触发 Jenkins 构建。
1. 在 GitLab 项目中，进入 **Settings > Integrations**。
2. 添加 Webhook URL：`http://<Jenkins IP>:8080/gitlab-webhook/`。
3. 勾选 **Push events**，保存。
4. 修改 `main.py` 并推送，Jenkins 将自动构建。

### 八、构建流程

```bash
清华源：
[gitlab-ce]
name=GitLab CE
baseurl=https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el9/
enabled=1
gpgcheck=0


1.	完成对gitlab和jenkins的安装和配置

2.	在jenkins服务器上生成ssh密钥对
	- 在jenkins服务器上执行以下命令生成ssh密钥对:

	2.1	使用root身份创建密钥对
	ssh-keygen -t rsa -b 4096
	
	2.2
	使用jenkins机器的root用户分别连接gitlab的git用户和web服务器的root用户，获取对方的公钥文件
	ssh git@192.168.5.150	# 连接接收gitlab的公钥
	ssh root@192.168.5.170	# 连接接收web服务器的公钥
	# 不需要连接成功只需要接受公钥即可
	需要提前连接上传自己的公钥信息
    ssh-copy-id 192.168.5.170
	2.3	
	mkdir /var/lib/jenkins/.ssh
	cp /root/.ssh/* /var/lib/jenkins/.ssh
	chown -R jenkins:jenkins /var/lib/jenkins/.ssh
	chmod 700 /var/lib/jenkins/.ssh
	chmod 600 /var/lib/jenkins/.ssh/*

3.	将jenkins的公钥添加到gitlab的授权密钥中,私钥则添加到jenkins的凭据中
	- 在gitlab web界面上,进入“设置” -> “SSH密钥”
	- 将jenkins生成的公钥复制到gitlab的SSH密钥中(最终的公钥会存储到git用户的~/.ssh/authorized_keys文件中)
	- 别忘了给web server也传一份公钥文件
	- 在jenkins上,进入“凭据管理” -> “系统(system)” -> “全局凭据” -> “添加凭据”
	- 选择“SSH Username with private key”,选择"Private Key",然后输入私钥(id_rsa)内容,(用户名空着就行)

4.	在gitlab上创建一个测试项目,添加index.php文件
	- 在gitlab上创建一个新的项目,命名为“myapp”，项目的命名空间：root
	- 在项目中添加一个index.php文件,内容可以是简单的PHP代码,例如:
	 ```php
	 <?php
	 echo "Hello, world!";
	 ?>
```
	- 提交并推送到gitlab仓库
	# 注意：项目分支叫：main

5.	在jenkins上使用git clone命令克隆gitlab上的测试项目(只是为了测试gitlab和jenkins的连接是否正常)

	dnf -y install git
	git clone git@192.168.88.150:root/myapp.git

	- 确保jenkins能够成功克隆gitlab上的项目
	- 如果克隆失败,检查ssh密钥是否正确配置,以及gitlab的仓库地址是否正确
	- 如果终端使用的是root用户,需要将jenkins用户的.ssh目录下的id_rsa和id_rsa.pub文件复制到root用户的.ssh目录下
	
6.	在jenkins上安装连接gitlab的插件,包含
	- Gitlab Plugin
	- GitLab Authentication plugin
	- GitLab API Plugin
	# 在插件市场中不显示[Plugin]关键词，安装后才显示

7.	在jenkins上配置GitLab的API Token
	- 在gitlab上,进入“设置” -> “访问令牌”
	- 创建一个新的访问令牌,选择“api”所有权限
	- 将生成的访问令牌复制到jenkins的凭据中,类型选择“Secret text”
	<GitLab API Token 已隐藏>
	
	# 若添加令牌时报错：An error occurred while fetching the tokens.(获取令牌时发生错误。)
	
	vim /etc/gitlab/gitlab.rb
	external_url 'http://192.168.88.140'	# 改成自己服务器的IP地址
	nginx['listen_port'] = 80				# 取消注释修改
	nginx['listen_https'] = false			# 取消注释修改
	
8.	在jenkins上[系统配置]页面，找到gitlab插件的配置栏目

	用户：git
	url：http://192.168.5.150
	令牌是步骤7添加的凭证

----------

9.	在jenkins上创建一个新的自由风格的项目,配置gitlab的仓库地址和分支
	- 在jenkins上,点击“新建任务”
	- 选择“自由风格的软件项目”,输入项目名称,例如“test-project-build”
	- 在“源码管理”中选择“Git”,输入gitlab的仓库地址,例如:  
	- 选择分支,例如“main”
	
	注意连接不上jenkins是使用jenkins这个用户去登录gitlab的可以执行以下命令同步一下ssh登录的信息到jenkins
	把主机密钥加到 jenkins 用户的 known_hosts（最关键一步）：
	sudo -u jenkins ssh-keyscan -t ed25519 192.168.5.150 >> /var/lib/jenkins/.ssh/known_hosts

10.	在jenkins上配置构建步骤,选择“执行Shell”,输入以下命令:
	```bash
	cd /path/to/your/project
	git pull origin master
	```
	- 这将会在每次触发构建时,从gitlab上拉取最新的代码到jenkins的工作目录
	- 确保jenkins有权限访问gitlab仓库
	- 如果需要,可以在构建后添加其他步骤,例如运行PHP代码或执行测试
	- 在“构建后操作”中可以选择发送通知或执行其他操作
	- 点击“保存”按钮保存项目配置
	
11.	在nginx上配置虚拟主机,指向jenkins克隆的项目目录
	- 在nginx的配置文件中添加以下内容:
	```nginx
	server {
	    listen 80;
	    server_name your-domain.com;
	
	    location / {
	        root /path/to/your/project;
	        index index.php index.html index.htm;
	    }
	
	    location ~ \.php$ {
	        include fastcgi_params;
	        fastcgi_pass unix:/var/run/php-fpm/www.sock; # 根据实际情况修改
	        fastcgi_index index.php;
	        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
	    }
	}
	```
	- 重启nginx服务使配置生效

12.	在nginx上配置SSL证书,确保访问https://your-domain.com时能够正常访问

-------------------------------------------------------------------------------------
如果需要手动测试gitlab项目是否能拉去，可以安装git组件
然后使用git clone命令进行手动拉取数据
git clone git@192.168.88.160:root/myapp.git
```

