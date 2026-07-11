---
title: "Docker 容器优雅退出"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["7. Docker"]
slug: "docker-06"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 九、优雅退出

## Linux 信号 

### Kill 参数

信号是一种进程间通信的方法，应用于异步事件的处理。信号的实质是一种软中断。

使用`kill -l`可以查看Linux系统中的所有信号，如下：

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-06/01.png)

| 信号值 | 信号名 | 说明  | 备注 |
|-|-|-|-|
| 1 | SIGHUP | 启动被终止的程序，可让该进程重新读取自己的配置文件，类似重新启动。 |  |
| 2 | SIGINT   | 相当于用键盘输入 [ctrl]-c 来中断一个程序的进行。   | interrupt |
| 9 | SIGKILL |  代表**强制中断**一个程序的进行，如果该程序进行到一半，那么尚未完成的部分可能会有“半产品”产生，类似 vim 会有 .filename.swp 保留下来。 | 此信号无法捕捉  <br/>kill |
| 15 | SIGTERM  | 以正常的方式来终止该程序。由于是正常的终止，所以后续的动作会将他完成。不过，如果该程序已经发生问题，就是无法使用正常的方法终止时，输入这个 signal 也是没有用的。 | terminate |
| 19    | SIGSTOP  | 相当于用键盘输入 [ctrl]-z 来暂停一个程序的进行。 | 此信号无法捕捉  <br/>stopped |

### 什么是信号 

信号是 Linux 内核与进程以及进程间通信的一种方式。针对每个信号进程都有个默认的动作，不过进程可以通过定义信号处理程序来覆盖默认的动作，除了 `SIGSTOP` 和 `SIGKILL`。二者都不能被捕获或重写，前者用来将进程暂停在当前状态，而后者则是从内核层面立即杀掉进程。

有两个比较重要的进程 `SIGTERM` 和 `SIGKILL`。`SIGTERM` 是优雅地关闭命令，`SIGKILL` 则是暴力的关闭命令。比如 Docker，容器会先收到 `SIGTERM` 信号，10s 后会收到 `SIGKILL` 信号。 

## 容器中的信号 

### 容器中的进程属于容器的 1 号进程

Docker 的 stop 和 kill 命令都是用来向容器发送信号的。注意，只有容器中的 1 号进程能够收到信号，这一点非常关键！stop 命令会首先发送 SIGTERM 信号，并等待应用优雅的结束。如果发现应用没有结束(用户可以指定等待的时间)，就再发送一个 SIGKILL 信号强行结束程序。`docker kill` 命令默认发送的是 SIGKILL 信号，当然你可以通过 -s 选项指定任何信号。

app.js

```JavaScript
'use strict';

var http = require('http');

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(3000, '0.0.0.0');

console.log('server started');

var signals = {
  'SIGINT': 2,
  'SIGTERM': 15
};

function shutdown(signal, value) {
  server.close(function () {
    console.log('server stopped by ' + signal);
    process.exit(128 + value);
  });
}

Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    shutdown(signal, signals[signal]);
  });
});
```

package.json

```JSON
{
  "name": "normalize.css",
  "version": "3.0.3",
  "description": "Normalize.css as a node packaged module",
  "style": "normalize.css",
  "files": [
    "LICENSE.md",
    "normalize.css"
  ],
  "homepage": "http://necolas.github.io/normalize.css",
  "repository": {
    "type": "git",
    "url": "git://github.com/necolas/normalize.css.git"
  },
  "main": "normalize.css",
  "author": {
    "name": "Nicolas Gallagher"
  },
  "license": "MIT",
  "gitHead": "2bdda84272650aedfb45d8abe11a6d177933a803",
  "bugs": {
    "url": "https://github.com/necolas/normalize.css/issues"
  },
  "_id": "normalize.css@3.0.3",
  "scripts": {},
  "_shasum": "acc00262e235a2caa91363a2e5e3bfa4f8ad05c6",
  "_from": "normalize.css@3.0.3",
  "_npmVersion": "2.7.0",
  "_nodeVersion": "0.10.35",
  "_npmUser": {
    "name": "necolas",
    "email": "nicolasgallagher@gmail.com"
  },
  "maintainers": [
    {
      "name": "tjholowaychuk",
      "email": "tj@vision-media.ca"
    },
    {
      "name": "necolas",
      "email": "nicolasgallagher@gmail.com"
    }
  ],
  "dist": {
    "shasum": "acc00262e235a2caa91363a2e5e3bfa4f8ad05c6",
    "tarball": "https://registry.npmjs.org/normalize.css/-/normalize.css-3.0.3.tgz"
  },
  "directories": {},
  "_resolved": "https://registry.npmjs.org/normalize.css/-/normalize.css-3.0.3.tgz",
  "readme": "ERROR: No README data found!"
}
```

Dockerfile    

```Dockerfile
FROM iojs:onbuild
COPY ./app.js ./app.js
COPY ./package.json ./package.json
EXPOSE 3000
ENTRYPOINT ["node", "app"]
```

构建镜像、测试

```Dockerfile
[root@docker dockerfile-signal]# docker build  --no-cache -t signal-app -f Dockerfile .

# 运行容器
[root@docker dockerfile-signal]# docker run -it --rm -p 3000:3000 --name="my-app" signal-app
server started

# 发送信号
[root@docker dockerfile-signal]# docker container kill --signal="SIGTERM" my-app
my-app

# 收到 SIGTERM 信号 退出
[root@docker dockerfile-signal]# docker run -it --rm -p 3000:3000 --name="my-app" signal-app
server started

server stopped by SIGTERM

```

### 容器中的进程不属于容器的 1 号进程

创建 app1.sh 文件

```Dockerfile
#!/bin/bash
node app 
```

创建 Dockerfile1 文件

```Dockerfile
FROM iojs:onbuild
COPY ./app.js ./app.js
COPY ./app1.sh ./app1.sh
COPY ./package.json ./package.json
RUN chmod +x ./app1.sh
EXPOSE 3000
ENTRYPOINT ["./app1.sh"]
```

```Dockerfile
[root@docker dockerfile-signal]# docker build --no-cache -t signal-app1 -f Dockerfile1 .

[root@docker dockerfile-signal]# docker container kill --signal="SIGKILL" my-app1

[root@docker dockerfile-signal]# docker run -it --rm -p 3000:3000 --name="my-app1" signal-app1
server started

[root@docker dockerfile-signal]# 

```

### 在脚本中捕获信号

创建 app2.sh 文件

```Dockerfile
#!/bin/bash
# 打开调试级别
set -x

# 指定当前 pid 号
pid=0

# SIGUSR1-handler
my_handler() {
  echo "my_handler"
}

# SIGTERM-handler
term_handler() {
  if [ $pid -ne 0 ]; then
    kill -SIGTERM "$pid"
    # wait是用来阻塞当前进程的执行，直至指定的子进程执行结束后，才继续执行
    wait "$pid"
  fi
  exit 143; # 128 + 15 -- SIGTERM
}
# setup handlers
# on callback, kill the last background process, which is `tail -f /dev/null` and execute the specified handler

# 　trap 'commands' signal-list 当脚本收到 signal-list 清单内列出的信号时, trap 命令执行双引号中的命令
trap 'kill ${!}; my_handler' SIGUSR1
trap 'kill ${!}; term_handler' SIGTERM

# run application
node app &
pid="$!"

# wait forever
while true
do
  tail -f /dev/null & wait ${!}
done
```

创建 Dockerfile2 文件

```Dockerfile
FROM iojs:onbuild
COPY ./app.js ./app.js
COPY ./app2.sh ./app2.sh
COPY ./package.json ./package.json
RUN chmod +x ./app2.sh
EXPOSE 3000
ENTRYPOINT ["./app2.sh"]
```

构建镜像&测试

```Dockerfile
[root@docker dockerfile-signal]#  docker build --no-cache -t signal-app2 -f Dockerfile2 .

[root@docker dockerfile-signal]# docker run -it --rm -p 3000:3000 --name="my-app2" signal-app2
+ pid=0
+ trap 'kill ${!}; my_handler' SIGUSR1
+ trap 'kill ${!}; term_handler' SIGTERM
+ pid=7
+ true
+ node app
+ wait 8
+ tail -f /dev/null
server started

[root@docker dockerfile-signal]# docker container kill --signal="SIGTERM" my-app2
my-app2

[root@docker dockerfile-signal]# docker run -it --rm -p 3000:3000 --name="my-app2" signal-app2
...
server started

++ kill 8
++ term_handler
++ '[' 7 -ne 0 ']'
++ kill -SIGTERM 7
++ wait 7
server stopped by SIGTERM
++ exit 143

```

### 使用 tini 作为容器启动入口 

tini 是一套更简单的 init 系统，专门用来执行一个子程序(spawn a single child)，并等待子程序结束，即便子程序已经变成僵尸程序也能捕捉到，同时也能转送 Signal 给子程序。如果你使用docker来跑容器，可以非常简便的在docker run的时候用 --init 参数，就会自动注入tini程式 (/sbin/docker-init) 到容器中，并且自动取代ENTRYPOINT设定，让原本的程式直接跑在 tini程序底下。

> 注意：Docker 1.13 以后的版本开始支持 `--init` 参数，并內建 [tini](https://github.com/krallin/tini) 在內。

```Dockerfile
[root@docker dockerfile-signal]# docker run --rm --init --name my-app  signal-app 
server started

[root@docker ~]# docker container kill --signal="SIGTERM" my-app
my-app

[root@docker dockerfile-signal]# docker run --rm --init --name my-app  signal-app 
server started

server stopped by SIGTERM
```

[GitHub - krallin/tini: A tiny but valid \`init\` for containers](https://github.com/krallin/tini)

## 附录：

### 镜像地址：

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/iojs:onbuild
ccr.ccs.tencentyun.com/chijinjing/iojs:onbuild
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/Ft2MwaLlUiPuuLkiVHscpgW1nlg)
- 导入日期：2026-06-22