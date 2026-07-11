---
title: "Git"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-devops-04/1200/600"
draft: false
tags: ["DevOps", "Obsidian"]
categories: ["DevOps"]
slug: "devops-04"
description: "从 Obsidian 导入的 DevOps 学习笔记"
---
# Git

## 版本控制系统概述 

在开发项目的时候，我们可能会不断地去修改代码，但是有时候会遇到，想查看某一时间的代码，如果没有版本控制器，你可能需要不断地定时备份代码，但这样会很麻烦，而且备份也不一定好用，比如某个时间点并没有修改代码，那么备份就重复了；再比如虽然备份了代码，但你并不知道两个版本有什么区别。

为了解决上面的一些问题，一些工程师便尝试开发代码版本控制器系统；每次当你修改完代码想进行备份时，只需 要输入简单的命令，版本控制系统便会帮你完成备份操作；

在完成这个备份时候，大体会做这几件事情，首先把当前代码哈希一下，得到一个哈希 (hash) 值，同时把这个哈 希值分配一个版本号，比如上一次的版本号是 2 ，那么这次的版本号便会是 3 ，用来保证它的顺序性；接着会比 较当前的版本与上次版本的一些差异，包括文件差异，和文件里面的内容差异，并且会把这些差异单独存储起来， 当你之后想看某一刻的修改时，可以非常方便地查看。

上面提到的是版本控制系统的最基本功能，应用因为实际需求不同，所以版本控制器也有不同的类型，最为常见的 就是分布式版本控制系统和中央版本控制系统。

### 1.1 中央版本控制系统 

中央版本控制系统必须存在两个端，服务端和客户端，当进行代码备份时，客户端会向服务端发出请求，并将此次 修改的内容发送到服务器当中去；服务端收到请求后，会将代码存储在服务器当中；同样当客户端想查看某一个版 本的修改内容或者想恢复到某一个版本之时，客户端也会发送请求到服务端，服务端再与之相应的响应。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/01.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/02.png)

### 1.2 分布式版本控制系统

分布式版本控制器，主要是将备份的代码以及记录完全独立在本地存储，比如说上面提到，当你想将代码恢复到某 一个版本的时候，本地版本控制器，不需要依赖网络便可以完成此操作，因为本地版本控制器拥有完整独立的控制 系统。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/03.png)

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/04.png)

从图中可以看出，客户端 不仅可以向服务器推送代码，服务器也可以向客户端推送代码；并且客户端之间还 可以互相推送代码，同样拉取代码也可以从任意一个节点中拉取，而不必须从服务器中拉取。

所以从分布式版本控制系统本身的功能来说，它们是完全平等的，每一个系统都拥有全部的功能；但在实际的工作 中我们为了更好地管理代码版本，会人为设置一些规则来限制代码推送，另外服务端通常也不会去主动向客户端推送和拉取代码。

### 1.3 Git 和 SVN

目前主流的版本控制系统主要有 Git 和 SVN（Subversion），各自分别代表分布式版本控制系统和中央版本控制系统，两个工具各有优势。

## 安装 Git

### 2.1 Windows 安装 

在 Windows 系统中安装 Git 非常简单，只需要下载 Git 的安装包，然后安装引导点击安装即可： 

[Git下载地址](https://git-scm.com/download/win)

### 2.2[ Linux 安装 ](https://git-scm.com/downloads/linux)

```Bash
yum install git
```

```Bash
# 安装依赖
yum -y install  gcc zlib-devel curl-devel

# 下载安装包
cd /tmp
wget --no-check-certificate https://mirrors.edge.kernel.org/pub/software/scm/git/git-2.43.5.tar.gz
tar -xvzf git-2.43.0.tar.gz
cd git-2.43.5/
# 编译 
./configure
make
make install
git --version # 输出 git 版本号，说明安装成功
git version 2.43.5

# 配置环境变量
tee -a /etc/profile <<'EOF'
export GIT_HOME=/usr/libexec/git-core
export PATH=$GIT_HOME:$PATH
EOF

source /etc/profile 
```

### 2.3 初始配置

设置姓名和邮箱地址

首先来设置使用Git时的姓名和邮箱地址。名字请用英文输入。

```Bash
# 配置参数 
git config --global user.name "你的昵称" 
git config --global user.email "你的邮箱"

# 查看参数 
git config user.name 
git config user.email 

# 如果配错了，可以通过以下命令修改
git config --global --replace-all user.name "your user name" 
git config --global --replace-all user.email"your user email" 
```

这个命令，会在“～/.gitconfig”中以如下形式输出设置文件。

```Bash
[user]
        name =  chijinjing
        email = chijinjing@xxhf.cc
```

想更改这些信息时，可以直接编辑这个配置文件。这里设置的姓名和邮箱地址会用在 Git 的提交日志中。

### 2.4 设置 SSH Key 

我们在连接仓库时，需要使用 SSH 密钥认证方式进行的，现在让我们来创建认证所需的 SSH Key，并将其添加至GitLab 仓库中。已经创建过的，请用现有的密钥进行设置。

```Java
$ ssh-keygen  -t rsa 
Generating public/private rsa key pair.
Enter file in which to save the key (/home/xxhf/.ssh/id_rsa): 
Created directory '/home/xxhf/.ssh'.
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /home/xxhf/.ssh/id_rsa.
Your public key has been saved in /home/xxhf/.ssh/id_rsa.pub.
The key fingerprint is:

```

添加公钥 到 Gitlab 中。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/05.png)

添加成功之后，创建账户时所用的邮箱会接到一封提示“公共密钥添加完成”的邮件。

## 小试牛刀

### 创建仓库 

登录 GitLab 创建一个仓库，仓库名为 hello-world 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/06.png)

新项目创建成功后，会提示命令指引。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/07.png)

### Clone 已有仓库 

```Bash
git clone git@gitlab.xxhf.cc:devops/hello-world.git
cd hello-world
git switch --create main
touch README.md
git add README.md
git commit -m "add README"
git push --set-upstream origin main
```

README.md 在初始化时可以自动生成，用户也可以根据需要自己编写，README.md 的内容会自动显示在仓库的首页当中。因此，人们一般会在这个文件中标明本仓库所包含的软件的概要、使用流程、许可协议等信息。如果使用 Markdown 语法进行描述，还可以添加标记，提高可读性。

连接仓库 

在 gitlab 上可以看到我们刚才提交的文件 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/08.png)

### 编写代码 

我们编写一个`hello_world.php`文件，用来输出 “HelloWorld! ”。

```PHP
<? php
    echo "Hello World! ";
?>
```

由于 hello_word.php 还没有添加至Git仓库，所以显示为 Untracked files。

```Bash
$ git status 
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        hello_world.php

nothing added to commit but untracked files present (use "git add" to track)

```

### 提交代码到本地仓库  

将 `hello_word.php `提交至仓库。这样一来，这个文件就进入了版本管理系统的管理之下。今后的更改管理都交由 Git 进行。

```Bash
$ git add hello_world.php 
$ git commit -m "Add hello world file."
[main 5b9b5cc] Add hello world file.
 1 file changed, 3 insertions(+)
 create mode 100644 hello_world.php

```

通过 `git add` 命令将文件加入暂存区，再通过 `git commit` 命令提交到本地仓库。

添加成功后，可以通过git log命令查看提交日志。

```Bash
$ git log
commit 5b9b5cc6407682f7964db813a331782246eb46df (HEAD -> main, origin/main)
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 15:47:53 2024 +0800

    Add hello world file.

```

### 提供代码到远程仓库 

使用 git push 命令 将本地仓库 代码提交到 远程仓库 。

```Bash
[chijinjing@ansible hello-world]$ git push 
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 4 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 320 bytes | 320.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
To gitlab.xxhf.cc:devops/hello-world.git
   3d89d6a..5b9b5cc  main -> main

```

登录 GitLab 就可以看到我们提供到仓库的代码了。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/09.png)

## Git 基本操作

### `git init`  初始化仓库 

要使用Git进行版本管理，必须先初始化仓库。Git是使用` git init `命令进行初始化的。我们创建一个目录 

`git-learning` 并初始化仓库。

```Bash
$ mkdir git-learning 
$ cd git-learning/
$ git init 
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint:         git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint:         git branch -m <name>
Initialized empty Git repository in /home/chijinjing/project/git-learning/.git/

```

如果初始化成功，执行了` git init `命令的目录下就会生成` .git `目录。这个 `.git`  目录里存储着管理当前目录内容所需的仓库数据。

在Git中，我们将这个目录的内容称为 “附属于该仓库的工作树”。文件的编辑等操作在工作树中进行，然后记录到仓库中，以此管理文件的历史快照。如果想将文件恢复到原先的状态，可以从仓库中调取之前的快照，在工作树中打开。开发者可以通过这种方式获取以往的文件。具体操作指令我们将在后面详细解说。

### `git status ` 查看仓库状态 

`git status` 命令用于显示Git仓库的状态。

工作树和仓库在被操作的过程中，状态会不断发生变化。在Git操作过程中时常用git status命令查看当前状态，下面，就让我们来实际查看一下当前状态。

```Bash
$ git status 
On branch master

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

结果显示了我们当前正处于 `master `分支下。关于分支我们会在后面讲到，现在不必深究。接着还显示了没有可提交的内容。所谓提交（Commit）​，是指 “记录工作树中所有文件的当前状态”。

尚没有可提交的内容，就是说当前我们建立的这个仓库中还没有记录任何文件的任何状态。这里，我们建立`README.md` 文件作为管理对象，为第一次提交做前期准备。

```Bash
$ touch README.md 
$ git status 
On branch master

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        README.md

nothing added to commit but untracked files present (use "git add" to track)

```

可以看到在 `Untracked files` 中显示了` README.md `文件。类似地，只要对Git的工作树或仓库进行操作，`git status`命令的显示结果就会发生变化。

### `git add ` 向暂存区添加文件 

如果只是在 Git 仓库目录中创建了文件，该文件并不会自动被 Git 仓库 管理。因此我们用 `git status `命令查看 README.md 文件时，它会显示在 Untracked files 里。

要想让文件成为 Git 仓库的管理对象，就需要用` git add` 命令将其加入暂存区（Stage 或者 Index）中。暂存区是提交之前的一个临时区域。

```Bash
$ git add README.md  
$ git status 
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   README.md
```

将 README.md 文件加入暂存区后，`git status` 命令的显示结果发生了变化。可以看到，README.md 文件显示在 Changes tobe committed 中了。

### `git commit`  保存仓库的历史记录

git commit 命令可以将当前暂存区中的文件实际保存到仓库的历史记录中。通过这些记录，我们就可以在工作树中复原文件。

```Bash
$ git commit -m "First commit" 
[master (root-commit) 60a7cf4] First commit
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 README.md

```

-m 参数后的 "First commit" 称作提交信息，是对本次提交的简要描述。

刚才我们只简洁地记述了一行提交信息，如果想要记述得更加详细，请不加 -m，直接执行 git commit 命令。执行后编辑器就会启动，并显示如下结果。（ 创建一个新的文件 LICENSE，并执行 git add  LICENSE ）

```Bash

# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
#
# On branch master
# Changes to be committed:
#       new file:   LICENSE
#

```

- 第一行：用一行文字简述提交的更改内容
- 第二行：空行
- 第三行以后：记述更改的原因和详细内容

在以 # 标为注释的 Changes to be committed 栏中，可以查看本次提交中包含的文件。将提交信息按格式记述完毕后，请保存并关闭编辑器，以#（井号）标为注释的行不必删除。随后，刚才记述的提交信息就会被提交。 

执行完 git commit 命令后再来查看当前状态。

```Bash
$ git status 
On branch master
nothing to commit, working tree clean
```

### `git log ` 查看提交日志

`git log` 命令可以查看以往仓库中提交的日志。包括可以查看什么人在什么时候进行了提交或合并，以及操作前后有怎样的差别。关于合并我们会在后面讲解。我们先来看看刚才的 `git commit` 命令是否被记录了。

```Bash
$ git log
commit d4be737f0906cea724b09afd794c78e21a7ac125 (HEAD -> master)
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 16:35:24 2024 +0800

    Add LICENSE file
    
    Because ... need to add LICENSE file.

commit 60a7cf4655e3a7c407bf3449e082bf9db7a77123
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 16:28:39 2024 +0800

    First commit

```

如上所示，显示了刚刚的提交操作。commit 栏旁边显示的 “d4be737f0……” 是指向这个提交的哈希值。Git 的其他命令中，在指向提交时会用到这个哈希值。Author 栏中显示我们给Git设置的用户名和邮箱地址。Date 栏中显示提交执行的日期和时间。再往下就是该提交的描述信息。

```Bash
$ git log --pretty=short
$ git log README.md
$ git log -p 
$ git log -p README.md
```

### `git diff` 查看更新前后的差别

git diff 命令可以查看工作树、暂存区、最新提交之间的差别。单从字面上可能很难理解，通过命令亲手试一试。

我们在刚刚提交的 README.md 中写点东西。

```Markdown
# Git Learning Course
```

#### 查看工作树与暂存区的区别 

执行 git diff 命令，查看当前工作树与暂存区的差别。

```Markdown
$ git diff 
diff --git a/README.md b/README.md
index e69de29..ff65e1a 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+# Git Learning Course

```

由于我们尚未用 `git add` 命令向暂存区添加任何东西，所以程序只会显示工作树与最新提交状态之间的差别。

解释一下显示的内容。“+” 号标出的是新添加的行，被删除的行则用 “-” 号标出。我们可以看到，这次只添加了一行。

用 git add 命令将 README.md 文件加入暂存区。

```Bash
$ git add README.md 
```

#### 查看工作树和最新提交的差别

如果现在执行 `git diff` 命令，由于工作树和暂存区的状态并无差别，结果什么都不会显示。要查看与最新提交的差别，请执行以下命令。

```Bash
$ git diff HEAD
diff --git a/README.md b/README.md
index e69de29..ff65e1a 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+# Git Learning Course

```

不妨养成这样一个好习惯：在执行 git commit 命令之前先执行 git diff HEAD 命令，查看本次提交与上次提交之间有什么差别，等确认完毕后再进行提交。这里的 HEAD 是指向当前分支中最新一次提交的指针。

由于我们刚刚确认过两个提交之间的差别，所以直接运行 git commit 命令。

```Bash
$ git commit -m "Add context to README."
[master 77511f6] Add context to README.
 1 file changed, 1 insertion(+)
[chijinjing@ansible git-learning]$ 

```

保险起见，我们查看一下提交日志，确认提交是否成功。

```Bash
$ git log 
commit 77511f6d9edd8e53393fc363f3b0c9050504d93f (HEAD -> master)
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 17:14:49 2024 +0800

    Add context to README.

commit d4be737f0906cea724b09afd794c78e21a7ac125

```

成功查到了提交记录。

## 分支操作

在进行多个并行作业时，我们会用到分支。在这类并行开发的过程中，往往同时存在多个最新代码状态。如下图所示，从 master 分支创建 feature-A 分支和 fix-B 分支后，每个分支中都拥有自己的最新代码。master 分支是 Git 默认创建的分支，因此基本上所有开发都是以这个分支为中心进行的。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/10.png)

不同分支中，可以同时进行完全不同的作业。等该分支的作业完成之后再与 master 分支合并。比如 feature-A 分支的作业结束后与 master 合并，如下图所示。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/11.png)

通过灵活运用分支，可以让多人同时高效地进行并行开发。接下来我们就一起学习与分支相关的 Git 操作。

### git  branch 显示分支列表

git branch 命令可以显示分支列表，同时可以确认当前所在分支。让我们来实际运行 git branch 命令。

```Bash
$ git branch 
* master

```

可以看到 master 分支左侧标有“\*”​（星号）​，表示这是我们当前所在的分支。也就是说，我们正在 master 分支下进行开发。结果中没有显示其他分支名，表示本地仓库中只存在 master 一个分支。

### git checkout -b  创建、切换分支

如果想以当前的 master 分支为基础创建新的分支，我们需要用到 `git checkout -b` 命令。

#### 切换到 feature-A 分支并进行提交

执行下面的命令，创建名为 feature-A 的分支。

```Bash
$ git checkout -b feature-A
Switched to a new branch 'feature-A'
```

实际上，连续执行下面两条命令也能收到同样效果。

```Bash
$ git branch feature-A
$ git checkout feature-A
```

创建 feature-A 分支，并将当前分支切换为 feature-A 分支。这时再来查看分支列表，会显示我们处于 feature-A 分支下。

```Bash
$ git branch 
* feature-A
  master
```

feature-A 分支左侧标有“\*”​，表示当前分支为 feature-A。在这个状态下正常开发、修改代码，执行 `git add` 命令并进行提交的话，代码就会提交至 feature-A 分支。

下面来实际操作一下。在README.md文件中添加一行。

```Bash
# Git Learning Course
- feature-A
```

这里我们添加了 feature-A 这样一行字母，然后进行提交。

```Bash
$ git add README.md 
$ git commit -m "Add feature-A"
[feature-A 657e80b] Add feature-A
 1 file changed, 1 insertion(+)

```

于是，这一行就添加到 feature-A 分支中了。

#### 切换到master分支

现在我们再来看一看 master 分支有没有受到影响。首先切换至master分支。

```Bash
$ git checkout master 
Switched to branch 'master'
```

然后查看 README.md文件，会发现README.md文件仍然保持原先的状态，并没有被添加文字。feature-A 分支的更改不会影响到master分支，这正是在开发中创建分支的优点。只要创建多个分支，就可以在互相没有影响的情况下同时进行多个功能的开发。

#### 切换回上一个分支

```Bash
$ git checkout - 
Switched to branch 'feature-A'
# or 
$ git checkout feature-A 
Switched to branch 'feature-A'
```

可以用 “-”​（连字符）代替分支名，就可以切换至上一个分支。当然，将 “-” 替换成 feature-A 同样可以切换到feature-A 分支。

#### 特性分支

Git与Subversion（SVN）等集中型版本管理系统不同，创建分支时不需要连接中央仓库，所以能够相对轻松地创建分支。因此，当今大部分工作流程中都用到了特性（Topic）分支。

特性分支顾名思义，是集中实现单一特性（主题）​，除此之外不进行任何作业的分支。在日常开发中，往往会创建数个特性分支，同时在此之外再保留一个随时可以发布软件的稳定分支。稳定分支的角色通常由 master 分支担当（下图所示）。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/12.png)

之前我们创建了 feature-A 分支，这一分支主要实现 feature-A，除 feature-A 的实现之外不进行任何作业。即便在开发过程中发现了 BUG，也需要再创建新的分支，在新分支中进行修正。

基于特定主题的作业在特性分支中进行，主题完成后再与 master 分支合并。只要保持这样一个开发流程，就能保证 master 分支可以随时供人查看。这样一来，其他开发者也可以放心大胆地从master分支创建新的特性分支。

#### 主干分支

主干分支是刚才我们讲解的特性分支的原点，同时也是合并的终点。通常人们会用 master 分支作为主干分支。主干分支中并没有开发到一半的代码，可以随时供他人查看。

有时我们需要让这个主干分支总是配置在正式环境中，有时又需要用标签 Tag 等创建版本信息，同时管理多个版本发布。拥有多个版本发布时，主干分支也有多个。

### git  merge 合并分支  

接下来，我们假设 feature-A 已经实现完毕，想要将它合并到主干分支 master 中。首先切换到 master 分支。

```Bash
$ git checkout master 
Switched to branch 'master'
```

然后合并 feature-A 分支。为了在历史记录中明确记录下本次分支合并，我们需要创建合并提交。因此，在合并时加上 `--no-ff` 参数。

```Bash
$ git merge --no-ff feature-A
```

默认信息中已经包含了是从 feature-A 分支合并过来的相关内容，所以可不必做任何更改。将编辑器中显示的内容保存，关闭编辑器，然后就会看到下面的结果。

```Bash
$ git merge --no-ff feature-A
Merge made by the 'ort' strategy.
 README.md | 1 +
 1 file changed, 1 insertion(+)
```

这样一来，feature-A 分支的内容就合并到 master 分支中了。

我们查看 README.md 中的内容，已经包括 feature-A 中修改的内容了。  

```Bash
$ cat README.md 
# Git Learning Course
- feature-A

```

我们可以使用` git log --graph` 以图表形式查看分支，显示结果更直观。 

```Bash
$ git log --graph
*   commit ec4e1ce3357b132369f35833626e8348bf6664f4 (HEAD -> master)
|\  Merge: 77511f6 657e80b
| | Author: chijinjing <chijinjing@xxhf.cc>
| | Date:   Mon Nov 11 17:56:38 2024 +0800
| | 
| |     Merge branch 'feature-A'
| | 
| * commit 657e80bc88f98b487443fee5930938fb1fa19afd (feature-A)
|/  Author: chijinjing <chijinjing@xxhf.cc>
|   Date:   Mon Nov 11 17:43:23 2024 +0800
|   
|       Add feature-A
| 
* commit 77511f6d9edd8e53393fc363f3b0c9050504d93f
| Author: chijinjing <chijinjing@xxhf.cc>
| Date:   Mon Nov 11 17:14:49 2024 +0800
| 
|     Add context to README.
| 
* commit d4be737f0906cea724b09afd794c78e21a7ac125
| Author: chijinjing <chijinjing@xxhf.cc>
| Date:   Mon Nov 11 16:35:24 2024 +0800
| 
|     Add LICENSE file
|     
|     because ... need to add LICENSE file.
| 
* commit 60a7cf4655e3a7c407bf3449e082bf9db7a77123
  Author: chijinjing <chijinjing@xxhf.cc>
  Date:   Mon Nov 11 16:28:39 2024 +0800
  
      First commit

```

用 git log --graph 命令进行查看的话，能很清楚地看到特性分支（feature-A）提交的内容已被合并。除此以外，特性分支的创建以及合并也都清楚明了。

## 月光宝盒 （时光穿梭机）

### git  reset  回溯历史版本

通过前面学习的操作，我们已经学会如何在实现功能后进行提交。

Git 的另一特征便是可以灵活操作历史版本。借助分散仓库的优势，可以在不影响其他仓库的前提下对历史版本进行操作。

我们先回溯历史版本，创建一个名为 fix-B 的特性分支。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/13.png)

#### 回到创建 feature-A 分支前

让我们先回到创建 feature-A 分支之前的版本，创建一个名为 fix-B 的特性分支。

要让仓库的 HEAD、暂存区、当前工作树回到指定状态，需要用到 `git reset --hard` 命令。只要提供目标时间点的哈希值，就可以完全恢复至该时间点的状态。

我们需要先查找到创建` feature-A`  之前的 hash 值 

```Bash
$ git log 
commit ec4e1ce3357b132369f35833626e8348bf6664f4 (HEAD -> master)
Merge: 77511f6 657e80b
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 17:56:38 2024 +0800

    Merge branch 'feature-A'

commit 657e80bc88f98b487443fee5930938fb1fa19afd (feature-A)
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 17:43:23 2024 +0800

    Add feature-A

commit 77511f6d9edd8e53393fc363f3b0c9050504d93f   # 创建 feature-A 之前的 hash 值 
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 17:14:49 2024 +0800

    Add context to README.

commit d4be737f0906cea724b09afd794c78e21a7ac125
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 16:35:24 2024 +0800

    Add LICENSE file
    
    because ... need to add LICENSE file.

commit 60a7cf4655e3a7c407bf3449e082bf9db7a77123
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Mon Nov 11 16:28:39 2024 +0800

    First commit

```

执行命令回退到指定版本 

```Bash
$ git reset --hard 77511f6d9edd8e53393fc363f3b0c9050504d93f   
HEAD is now at 77511f6 Add context to README.

```

我们已经成功回退到特性分支（feature-A）创建之前的状态。由于所有文件都回退到了指定哈希值对应的时间点上，README.md 文件的内容也恢复到了当时的状态。

```Bash
$ cat README.md 
# Git Learning Course
```

#### 创建 fix-B 分支

```Bash
$ git checkout -b fix-B 
Switched to a new branch 'fix-B'
```

作为这个主题的作业内容，我们在 README.md 文件中添加一行文字。

```Bash
# Git Learning Course
- fix-B
```

然后直接提交 README.md 文件。

```Bash
$ git add README.md 

$ git commit -m "Fix B" 
[fix-B 900b243] Fix B
 1 file changed, 1 insertion(+)

```

现在我们的状态如下图所示

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/14.png)

接下来我们的目标是如下图所示，在主干分支合并 feature-A 分支的修改后，又合并了 fix-B 的修改。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/15.png)

#### 回到 feature-A 分支合并后的状态

首先我们需要先回到 feature-A 分支合并后的状态。

git log 命令只能查看以当前状态为终点的历史日志。所以这里要使用 `git reflog `命令，查看当前仓库的操作日志。在日志中找出回溯历史之前的哈希值，通过 `git reset --hard` 命令恢复到回溯历史前的状态。

```Bash
$ git reflog 
900b243 (HEAD -> fix-B) HEAD@{0}: commit: Fix B
77511f6 (master) HEAD@{1}: checkout: moving from master to fix-B
77511f6 (master) HEAD@{2}: reset: moving to 77511f6d9edd8e53393fc363f3b0c9050504d93f
ec4e1ce HEAD@{3}: merge feature-A: Merge made by the 'ort' strategy.
77511f6 (master) HEAD@{4}: checkout: moving from feature-A to master
657e80b (feature-A) HEAD@{5}: checkout: moving from master to feature-A
77511f6 (master) HEAD@{6}: checkout: moving from feature-A to master
657e80b (feature-A) HEAD@{7}: checkout: moving from master to feature-A
77511f6 (master) HEAD@{8}: checkout: moving from feature-A to master
657e80b (feature-A) HEAD@{9}: commit: Add feature-A
77511f6 (master) HEAD@{10}: checkout: moving from master to feature-A
77511f6 (master) HEAD@{11}: commit: Add context to README.
d4be737 HEAD@{12}: commit: Add LICENSE file
60a7cf4 HEAD@{13}: commit (initial): First commit

```

在日志中，我们可以看到 commit、checkout、reset、merge 等Git命令的执行记录。只要不进行Git的GC（Garbage Collection，垃圾回收）​，就可以通过日志随意调取近期的历史状态，就像给时间机器指定一个时间点，在过去未来中自由穿梭一般。即便开发者错误执行了 Git 操作，基本也都可以利用 git reflog 命令恢复到原先的状态。 

从上面数第四行表示 feature-A 特性分支合并后的状态，对应哈希值为ec4e1ce 。我们将HEAD、暂存区、工作树恢复到这个时间点的状态。

```Bash
$ git checkout master 
Switched to branch 'master'

[chijinjing@ansible git-learning]$ git reset --hard ec4e1ce 
HEAD is now at ec4e1ce Merge branch 'feature-A'

```

之前我们使用 git reset --hard 命令回退了历史，这里又再次通过它恢复到了回退前的历史状态。当前的状态如下图所示。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/16.png)

#### 消除冲突 

现在只要合并 fix-B 分支，就可以得到我们想要的状态。让我们赶快进行合并操作。

```Bash
$ git merge --no-ff fix-B 
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Automatic merge failed; fix conflicts and then commit the result.
```

这时，系统告诉我们 README.md 文件发生了冲突（Conflict）。系统在合并 README.md 文件时，feature-A 分支更改的部分与本次想要合并的 fix-B 分支更改的部分发生了冲突。

不解决冲突就无法完成合并，所以我们打开 README.md 文件，解决这个冲突。

#### 查看冲突部分并将其解决

用编辑器打开 README.md 文件，就会发现其内容变成了下面这个样子。

```Bash
# Git Learning Course
<<<<<<< HEAD
- feature-A
=======
- fix-B
>>>>>>> fix-B

```

=======以上的部分是当前 HEAD 的内容，以下的部分是要合并的 fix-B 分支中的内容。我们在编辑器中将其改成想要的样子。

```Bash
# Git Learning Course
- feature-A
- fix-B
```

如上所示，本次修正让 feature-A 与 fix-B 的内容并存于文件之中。但是在实际的软件开发中，往往需要删除其中之一，所以大家在处理冲突时，务必要仔细分析冲突部分的内容后再行修改。

#### 提交冲突解决后的结果

冲突解决后，执行git add命令与git commit命令。

```Bash
$ git add README.md  

$ git commit -m "Fix conflict"
[master 22ff115] Fix conflict

```

### git  commit --amend  修改提交信息

要修改上一条提交信息，可以使用 `git commit --amend` 命令。

我们将上一条提交信息记为了 "Fix conflict"，但它其实是 fix-B 分支的合并，解决合并时发生的冲突只是过程之一，这样标记实在不妥。于是，我们要修改这条提交信息。

```Bash
$ git commit --amend 
```

执行上面的命令后，编辑器就会启动。

```Bash
Fix conflict

# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
#
# Date:      Mon Nov 11 18:36:47 2024 +0800
#
# On branch master
# Changes to be committed:
#       modified:   README.md
#

```

编辑器中显示的内容如上所示，其中包含之前的提交信息。请将提交信息的部分修改为Merge branch 'fix-B'，然后保存文件，关闭编辑器。

```Bash
[master d19a777] Merge branch 'fix-B'
 Date: Mon Nov 11 18:36:47 2024 +0800

```

随后会显示上面这条结果。现在执行 `git log --graph `命令，可以看到提交日志中的相应内容也已经被修改。

```Bash
$ git log --graph

*   commit d19a7774c62c179ef08d8ab0d37aabec1a8fc068 (HEAD -> master)
|\  Merge: ec4e1ce 900b243
| | Author: chijinjing <chijinjing@xxhf.cc>
| | Date:   Mon Nov 11 18:36:47 2024 +0800
| | 
| |     Merge branch 'fix-B'
| | 
| * commit 900b2430e2a424b6196e12a886e62f26685c3783 (fix-B)
| | Author: chijinjing <chijinjing@xxhf.cc>
| | Date:   Mon Nov 11 18:20:43 2024 +0800
| | 
| |     Fix B
| |   
* |   commit ec4e1ce3357b132369f35833626e8348bf6664f4
|\ \  Merge: 77511f6 657e80b
| |/  Author: chijinjing <chijinjing@xxhf.cc>
|/|   Date:   Mon Nov 11 17:56:38 2024 +0800
| |   
| |       Merge branch 'feature-A'
| | 
| * commit 657e80bc88f98b487443fee5930938fb1fa19afd (feature-A)
|/  Author: chijinjing <chijinjing@xxhf.cc>
|   Date:   Mon Nov 11 17:43:23 2024 +0800
|   
|       Add feature-A
| 

```

### git  rebase -i  压缩历史 

在合并特性分支之前，如果发现已提交的内容中有拼写错误或是 comment 格式不合格 等问题，我们可以再提交一个修改，将两次提交记录压缩成一个历史记录，这也是工作中经常需要用到的。 

#### 创建 feature-C 分支

首先，新建一个feature-C特性分支。

```Bash
$ git branch  # 检查当前分支 
  feature-A
  fix-B
* master

$ git checkout -b feature-C  # 创建新分支 
Switched to a new branch 'feature-C'

```

在 feature-C 的分支下 我们在 README.md 文件中添加一行文字，并且故意留下拼写错误，以便之后修正。

```Bash
# Git Learning Course
- feature-A
- fix-B
- faeture-C
```

提交这部分内容。这次变更很小，就没必要先执行 git add 命令再执行 git commit 命令了，我们可以用 `git commit -am `命令一次完成两步操作。

```Bash
$ git commit -am "Add feature-C"
[feature-C a8e7960] Add feature-C
 1 file changed, 1 insertion(+)
```

修改拼写错误后，差别如下： 

```Bash
[chijinjing@ansible git-learning]$ git diff 
diff --git a/README.md b/README.md
index b9207ad..0e3a733 100644
--- a/README.md
+++ b/README.md
@@ -1,4 +1,4 @@
 # Git Learning Course
 - feature-A
 - fix-B
-- faeture-C
+- feature-C
```

提交修改

```Bash
$ git commit -am "Fix typo"
[feature-C 5905b64] Fix typo
 1 file changed, 1 insertion(+), 1 deletion(-)

```

我们不希望在历史记录中看到这类提交，因为健全的历史记录并不需要它们。如果能在最初提交之前就发现并修正这些错误，也就不会出现这类提交了。

#### 更改历史 

我们来更改历史。将"Fix typo"修正的内容与之前一次的提交合并，在历史记录中合并为一次完美的提交。

先查看一下目录的提交历史 

```Bash
[chijinjing@ansible git-learning]$ git log 
commit 5905b643536bfd2fb58821026487a0ef3600e038 (HEAD -> feature-C)
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Tue Nov 12 08:54:08 2024 +0800

    Fix typo 

commit a8e79609975051a80271a263cdb5fd17eb8d3341
Author: chijinjing <chijinjing@xxhf.cc>
Date:   Tue Nov 12 08:50:19 2024 +0800

    Add feature-C

```

执行 `git rebase` 命令。

```Bash
$ git rebase -i HEAD～2
```

用上述方式执行 git rebase 命令，可以选定当前分支中包含HEAD（最新提交）在内的两个最新历史记录为对象，并在编辑器中打开。

```Bash
pick a8e7960 Add feature-C
pick 5905b64 Fix typo

# Rebase d19a777..5905b64 onto d19a777 (2 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup [-C | -c] <commit> = like "squash" but keep only the previous
#                    commit's log message, unless -C is used, in which case
#                    keep only this commit's message; -c is same as -C but
#                    opens the editor
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
#         create a merge commit using the original merge commit's
#         message (or the oneline, if no original merge commit was
#         specified); use -c <commit> to reword the commit message
# u, update-ref <ref> = track a placeholder for the <ref> to be updated
#                       to this position in the new commits. The <ref> is
#                       updated at the end of the rebase

```

我们将 5905b64 的 Fix typo 的历史记录压缩到 a8e7960 的 Add feature-C 里。按照下图所示，将 5905b64 左侧的 pick 部分删除，改写为 fixup。

```Bash
pick a8e7960 Add feature-C
fixup 5905b64 Fix typo
```

保存编辑器里的内容，关闭编辑器。

```Bash
$ git rebase -i HEAD~2 
Successfully rebased and updated refs/heads/feature-C.

```

现在再查看提交日志时会发现 Add feature-C 的哈希值已经不是 a8e7960 了，这证明提交已经被更改。

```Bash
[chijinjing@ansible git-learning]$ git log --graph
* commit fdfcb94eb049ddaea6b0443dbdb2f37b7f9a4068 (HEAD -> feature-C)
| Author: chijinjing <chijinjing@xxhf.cc>
| Date:   Tue Nov 12 08:50:19 2024 +0800
| 
|     Add feature-C
|   
*   commit d19a7774c62c179ef08d8ab0d37aabec1a8fc068 (master)
|\  Merge: ec4e1ce 900b243
| | Author: chijinjing <chijinjing@xxhf.cc>
| | Date:   Mon Nov 11 18:36:47 2024 +0800
| | 
| |     Merge branch 'fix-B'

```

#### 合并至 master 分支

feature-C 分支的使命告一段落，我们将它与 master 分支合并。

```Bash
$ git checkout master 
Switched to branch 'master'

$ git merge --no-ff feature-C 
Merge made by the 'ort' strategy.
 README.md | 1 +
 1 file changed, 1 insertion(+)

```

## 推送代码至远程仓库 

Git 是分布式版本管理系统，我们前面所学习的，都是针对单一本地仓库的操作。接下来，我们将开始接触在网络另一端的远程仓库。远程仓库顾名思义，是与我们本地仓库相对独立的另一个仓库。我们先在 GitLab 上创建一个仓库，并将其设置为本地仓库的远程仓库。

登录 GitLab 创建一个新的项目，创建时不要勾选 “使用自述文件初始化仓库” 。（因为一旦勾选该选项，GitLab 一侧的仓库就会自动生成README文件，从创建之初便与本地仓库失去了整合性。虽然到时也可以强制覆盖，但为防止这一情况发生还是建议不要勾选该选项。）

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/17.png)

仓库 创建成功后，默认仓库是空的，GitLab 会给出命令行指引，我们可以根据项目情况 选择需要执行的命令。 

### `git remote add` 添加远程仓库 

我们本地已经有仓库了，所以选择 “推送现有的 Git 仓库”

```Bash
cd git-learning/

$ git remote rename origin old-origin
error: No such remote: 'origin'

$ git remote add origin git@gitlab.xxhf.cc:devops/git-learning.git

```

### `git push ` 推送至远程仓库 

如果想将当前分支下本地仓库中的内容推送给远程仓库，需要用到 `git push` 命令。现在假定我们在master分支下进行操作。

```Bash
$ git push -u origin master 
Enumerating objects: 22, done.
Counting objects: 100% (22/22), done.
Delta compression using up to 4 threads
Compressing objects: 100% (16/16), done.
Writing objects: 100% (22/22), 1.94 KiB | 994.00 KiB/s, done.
Total 22 (delta 3), reused 0 (delta 0), pack-reused 0
To gitlab.xxhf.cc:devops/git-learning.git
 * [new branch]      master -> master
branch 'master' set up to track 'origin/master'.

```

执行 git push 命令，当前分支的内容就会被推送给远程仓库origin的master分支。-u 参数可以在推送的同时，将origin 仓库的master分支设置为本地仓库当前分支的 upstream（上游）。添加了这个参数，将来运行git pull命令从远程仓库获取内容时，本地仓库的这个分支就可以直接从origin的master分支获取内容，省去了另外添加参数的麻烦。

执行该操作后，当前本地仓库master分支的内容将会被推送到 GitLab 的远程仓库中。在 GitLab上也可以确认远程master分支的内容和本地master分支相同。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/18.png)

#### 推送其它分支到远程仓库 

除了master分支之外，远程仓库也可以创建其他分支。举个例子，我们在本地仓库中创建 feature-D 分支，并将它以同名形式push至远程仓库。

```Bash
$ git checkout -b feature-D 
Switched to a new branch 'feature-D'

$ git push -u origin feature-D 
Total 0 (delta 0), reused 0 (delta 0), pack-reused 0
remote: 
remote: To create a merge request for feature-D, visit:
remote:   http://gitlab.xxhf.cc/devops/git-learning/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature-D
remote: 
To gitlab.xxhf.cc:devops/git-learning.git
 * [new branch]      feature-D -> feature-D
branch 'feature-D' set up to track 'origin/feature-D'.

```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/19.png)

现在，在远程仓库的GitHub页面就可以查看到feature-D分支了。

如果希望将本地的所有分支都推送到远端仓库可以执行下面的命令： 

```Bash
git push --set-upstream origin --all
git push --set-upstream origin --tags
```

推送所有分支：--all 选项表示将本地所有分支推送到远程仓库（在这里是 origin）。

设置上游分支：--set-upstream 

## 从远程仓库获取代码 

我们把在 GitLab 上新建的仓库设置成了远程仓库，并向这个仓库push了feature-D分支。现在，所有能够访问这个远程仓库的人都可以获取feature-D分支并加以修改。本节中我们从实际开发者的角度出发，在另一个目录下新建一个本地仓库，学习从远程仓库获取内容的相关操作。这就相当于我们刚刚执行过push操作的目标仓库又有了另一名新开发者来共同开发。

### `git clone` 克隆远端仓库 

首先我们换到其他目录下，将 GitLab 上的仓库clone到本地。注意不要与之前操作的仓库在同一目录下。

```Bash
$ git clone git@gitlab.xxhf.cc:devops/git-learning.git
Cloning into 'git-learning'...
remote: Enumerating objects: 22, done.
remote: Counting objects: 100% (22/22), done.
remote: Compressing objects: 100% (16/16), done.
remote: Total 22 (delta 3), reused 0 (delta 0), pack-reused 0
Receiving objects: 100% (22/22), done.
Resolving deltas: 100% (3/3), done.

```

执行git clone命令后我们会默认处于master分支下，同时系统会自动将origin设置成该远程仓库的标识符。也就是说，当前本地仓库的master分支与GitHub端远程仓库（origin）的master分支在内容上是完全相同的。

```Bash
$ git branch  -a 
* master
  remotes/origin/HEAD -> origin/master
  remotes/origin/feature-D
  remotes/origin/master
```

我们用git branch -a命令查看当前分支的相关信息。添加 -a参数可以同时显示本地仓库和远程仓库的分支信息。

结果中显示了remotes/origin/feature-D，证明我们的远程仓库中已经有了feature-D分支

#### 获取远程分支 

我们试着将feature-D分支获取至本地仓库。

```Bash
$ git checkout -b feature-D origin/feature-D 
branch 'feature-D' set up to track 'origin/feature-D'.
Switched to a new branch 'feature-D'
```

-b参数的后面是本地仓库中新建分支的名称。为了便于理解，我们仍将其命名为feature-D，让它与远程仓库的对应分支保持同名。新建分支名称后面是获取来源的分支名称。例子中指定了origin/feature-D，就是说以名为origin的仓库（这里指GitHub端的仓库）的feature-D分支为来源，在本地仓库中创建feature-D分支。

#### 向本地的feature-D分支提交更改

现在假定我们是另一名开发者，要做一个新的提交。在README. md文件中添加一行文字，查看更改。

```Bash
$ git diff 
diff --git a/README.md b/README.md
index 0e3a733..083b0fc 100644
--- a/README.md
+++ b/README.md
@@ -2,3 +2,4 @@
 - feature-A
 - fix-B
 - feature-C
+- feature-D

```

按照之前学过的方式提交即可。

```Bash
$ git commit -am "Add feature-D"
[feature-D 03a9537] Add feature-D
 1 file changed, 1 insertion(+)

```

#### 推送feature-D分支

现在来推送feature-D分支。

```Bash
$ git push 
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 4 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 317 bytes | 317.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
remote: 
remote: To create a merge request for feature-D, visit:
remote:   http://gitlab.xxhf.cc/devops/git-learning/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature-D
remote: 
To gitlab.xxhf.cc:devops/git-learning.git
   e8c0b0f..03a9537  feature-D -> feature-D

```

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-04/20.png)

从远程仓库获取feature-D分支，在本地仓库中提交更改，再将feature-D分支推送回远程仓库，通过这一系列操作，就可以与其他开发者相互合作。

### `git pull` 获取最新远程仓库分支 

现在我们放下刚刚操作的目录，回到原先的那个目录下。这边的本地仓库中只创建了feature-D分支，并没有在feature-D分支中进行任何提交。然而远程仓库的feature-D分支中已经有了我们刚刚推送的提交。这时我们就可以使用git pull命令，将本地的feature-D分支更新到最新状态。当前分支为feature-D分支。

```Bash
$ git pull origin feature-D 
remote: Enumerating objects: 5, done.
remote: Counting objects: 100% (5/5), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), 297 bytes | 297.00 KiB/s, done.
From gitlab.xxhf.cc:devops/git-learning
 * branch            feature-D  -> FETCH_HEAD
   e8c0b0f..03a9537  feature-D  -> origin/feature-D
Updating e8c0b0f..03a9537
Fast-forward
 README.md | 1 +
 1 file changed, 1 insertion(+)

```

GitHub端远程仓库中的feature-D分支是最新状态，所以本地仓库中的feature-D分支就得到了更新。今后只需要像平常一样在本地进行提交再push给远程仓库，就可以与其他开发者同时在同一个分支中进行作业，不断给feature-D增加新功能。

如果两人同时修改了同一部分的源代码，push时就很容易发生冲突。所以多名开发者在同一个分支中进行作业时，为减少冲突情况的发生，建议更频繁地进行push和pull操作。

## 图形界面客户端 

Sourcetree 

SmartGit
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/Era5w4KDLiZd4Gkwm0Gc68QunZg)
- 导入日期：2026-06-22