---
title: "Docker Compose 使用指南"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-docker-01/1200/600"
draft: false
tags: ["Docker", "Obsidian"]
categories: ["Docker"]
slug: "docker-01"
description: "从 Obsidian 导入的 Docker 学习笔记"
---
# 八、 docker compose

## 1 简介

`Compose` 项目是 Docker 官方的开源项目，负责实现对 Docker 容器集群的快速编排。

`Compose` 定位是 "定义和运行多个 Docker 容器的应用（Defining and running multi-container Docker applications) "

我们通过一个 `Dockerfile` 文件可以让用户很方便的定义一个单独的应用容器镜像。然而，在日常工作中，经常会碰到需要多个容器相互配合来完成某项任务的情况。例如要实现一个 Web 项目，除了 Web 服务容器本身，往往还需要再加上后端的数据库服务容器，甚至还包括负载均衡容器等。

`Compose` 恰好满足了这样的需求。它允许用户通过一个单独的 `docker-compose.yml` 或 `compose.yml`模板文件（YAML 格式）来定义一组相关联的应用容器为一个项目（project）。

`Compose` 中有两个重要的概念：

- 服务 (`service`)：一个应用的容器，实际上可以包括若干运行相同镜像的容器实例。
- 项目 (`project`)：由一组关联的应用容器组成的一个完整业务单元，在 `docker-compose.yml` 文件中定义。

`Compose` 的默认管理对象是项目，通过子命令对项目中的一组容器进行便捷地生命周期管理。

## 2 安装 

目前 Docker 官方用 GO 语言重写了 Docker Compose，并将其作为了 docker cli 的子命令，称为 `Compose V2`。你可以参照官方文档安装，然后将 v1 版的 `docker-compose` 命令替换为 `docker compose`，即可使用 Docker Compose。

V1 版本的安装

```YAML
curl -L https://github.com/docker/compose/releases/download/1.27.4/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose
```

V2 版本的安装

```YAML
yum install docker-compose-plugin
```

## Compose 应用模型

一个项目由以下几部分组成：

- services 
- networks 
- volumes
- configs
- secrets

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/docker-01/01.png)

这个应用由以下几部分组成：

- 2 个 services: webapp 和 database
- 1 个 secret (HTTPS 证书)，注入到前端容器
- 1 个 config 配置文件，注入到前端容器
- 1 个 Volume 持久化卷
- 2 个网络 

Compose 声明文件：

```YAML
services:  # 描述 容器
  frontend:
    image: example/webapp
    ports:
      - "443:443"
      - "8080:80"
    networks:
      - front-tier
      - back-tier
    configs:
      - httpd-config  # 名字  
    secrets:
      - server-certificate

  backend:
    image: example/database
    volumes:
      - db-data: /data/database
    networks:
      - back-tier

volumes:
  db-data:
    driver: local
    driver_opts:
      size: "10GiB"

configs:
  httpd-config:
    file: ./httpd-config.conf

secrets:
  server-certificate:
    file: ./xxx.crt

networks:
  # The presence of these objects is sufficient to define them
  front-tier: {}
  back-tier: {}
```

## 体验项目

现在有一个 Python 的项目，依赖 redis 服务，我们使用 compose 的方式将服务运行起来。

### 步骤一 创建应用文件 

创建目录  compose-python-demo ，进入目录 创建文件  `app.py `,内容如下：

```Python
import time

import redis
from flask import Flask

app = Flask(__name__)
cache = redis.Redis(host='redis', port=6379)

def get_hit_count():
    retries = 5
    while True:
        try:
            return cache.incr('hits')
        except redis.exceptions.ConnectionError as exc:
            if retries == 0:
                raise exc
            retries -= 1
            time.sleep(0.5)

@app.route('/')
def hello():
    count = get_hit_count()
    return 'Hello World! I have been seen {} times.\n'.format(count)
    
@app.route('/ping')
def ping():
    return 'pong'
```

创建文件 `requirements.txt` ，内容如下：

```Python
flask
redis
```

### 步骤二 创建 Dockerfile 文件 

创建  Dockerfile 文件 ，内容如下：

```Dockerfile
FROM python:3.7-alpine
WORKDIR /code
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
EXPOSE 5000
COPY . .
CMD ["flask", "run"]
```

### 步骤三 定义 compose 声明文件 

定义 compose 服务 

```YAML
services:
  web:
    build: . 
    ports:
      - "8000:5000"
  redis:
    image: "redis:alpine"
```

### 步骤四 构建和运行应用

```Bash
[root@docker project-python-demo]# docker compose up
[+] Running 8/8
 ✔ redis 7 layers [⣿⣿⣿⣿⣿⣿⣿]      0B/0B      Pulled                                                                      5.2s 
   ✔ 96526aa774ef Already exists                                                                                        0.0s 
   ✔ b11f9c76abbd Pull complete                                                                                         0.7s 
   ✔ 6617b52cbeba Pull complete                                                                                         0.7s 
   ✔ d690774d7e1a Pull complete                                                                                         0.8s 
   ✔ 7c08c8068f7a Pull complete                                                                                         1.3s 
   ✔ 4f4fb700ef54 Pull complete                                                                                         1.4s 
   ✔ ea389a5fca7b Pull complete                                                                                         1.5s 
[+] Building 18.5s (17/17) FINISHED                                                                           docker:default
 => [web internal] load build definition from Dockerfile                                                                0.1s
```

### 步骤四 测试效果

```Bash
[root@docker project-python-demo]# curl http://127.0.0.1:8000
Hello World! I have been seen 1 times.
[root@docker project-python-demo]# 
[root@docker project-python-demo]# curl http://127.0.0.1:8000
Hello World! I have been seen 2 times.
[root@docker project-python-demo]# curl http://127.0.0.1:8000
Hello World! I have been seen 3 times.

[root@docker compose-python-demo]# docker ps 
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS          PORTS                                       NAMES
5aa5ac2d0e05   project-python-demo-web   "flask run"              32 minutes ago   Up 32 minutes   0.0.0.0:8000->5000/tcp, :::8000->5000/tcp   project-python-demo-web-1
08311d1a5985   redis:alpine              "docker-entrypoint.s…"   32 minutes ago   Up 32 minutes   6379/tcp                                    project-python-demo-redis-1

```

## Docker compose 命令

### 语法 

```Bash
# docker compose --help 

Usage:  docker compose [OPTIONS] COMMAND

Define and run multi-container applications with Docker.
Commands:
  config      Parse, resolve and render compose file in canonical format
  cp          Copy files/folders between a service container and the local filesystem
  down        Stop and remove containers, networks
  events      Receive real time events from containers.
  logs        View output from containers
  ls          List running compose projects
  ps          List containers
  pull        Pull service images
  restart     Restart service containers
  top         Display the running processes
  up          Create and start containers
  version     Show the Docker Compose version information
```

### 启动项目

```Bash
[root@docker 01-compose-python-demo]# docker compose up -d 
[+] Running 3/3
 ✔ Network 01-compose-python-demo_default    Created                                                                             0.0s 
 ✔ Container 01-compose-python-demo-web-1    Started                                                                             0.1s 
 ✔ Container 01-compose-python-demo-redis-1  Started                                                                             0.1s 
```

### 停止项目

```Bash
[root@docker 01-compose-python-demo]# docker compose down -v 
[+] Running 3/2
 ✔ Container 01-compose-python-demo-redis-1  Removed                                                                             0.1s 
 ✔ Container 01-compose-python-demo-web-1    Removed                                                                            10.1s 
 ✔ Network 01-compose-python-demo_default    Removed                                                                             0.0s 
```

### 查看服务日志

```Bash
[root@docker 01-compose-python-demo]# docker compose logs 
01-compose-python-demo-web-1  |  * Serving Flask app 'app.py'
01-compose-python-demo-web-1  |  * Debug mode: off
01-compose-python-demo-web-1  | WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
01-compose-python-demo-web-1  |  * Running on all addresses (0.0.0.0)
01-compose-python-demo-web-1  |  * Running on http://127.0.0.1:5000
01-compose-python-demo-web-1  |  * Running on http://172.28.0.2:5000

# 查看指定服务的日志
[root@docker 01-compose-python-demo]# docker compose logs web
01-compose-python-demo-web-1  |  * Serving Flask app 'app.py'
01-compose-python-demo-web-1  |  * Debug mode: off
01-compose-python-demo-web-1  | WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.

```

> docker compose  命令在执行时 必须在 compose.yaml  文件所在的目录下，
> 
> `docker compose -f compose.yml up -d`    默认省略了参数  `-f compose.yml`

## 理解 Compose 文件 

Compose 文件 是通过 YAML 文件定义的，由以下几个顶级元素组成 ：

- version (弃用)
- name (可选) 
- services (必须)
- networks
- volumes
- configs   明文配置
- secrets   密文配置

### version 和 name 元素属性

- `version `

version 是为了向后兼容保留的，没有实际用途，也不会影响运行效果。 

- `name `

定义 项目名称，默认使用 compose.yml 文件所在的目录名

```YAML
version: "3" 
name: project-busy
services:
  foo:
    image: busybox
    environment:
      - COMPOSE_PROJECT_NAME
    command: echo "I'm running ${COMPOSE_PROJECT_NAME}"

```

```YAML
[root@docker 02-compose-version-name]# docker compose up 
[+] Running 2/0
 ✔ Network project-busy_default  Created                                                                                         0.0s 
 ✔ Container project-busy-foo-1  Created                                                                                         0.0s 
Attaching to project-busy-foo-1
project-busy-foo-1  | I'm running project-busy
project-busy-foo-1 exited with code 0
```

### services 指令属性

Services 是计算资源的抽象定义，由一组容器组成，services 中的所有容器都是根据这些参数创建的。

Compose 文件中必须声明 services 元素。

```YAML
services:
  web: # 服务名
    image: nginx:1.22.1
   
    
  redis:
    image: redis:alpine
```

#### build   

指定 `Dockerfile` 所在文件夹的路径（可以是绝对路径，或者相对 compose.yml 文件的路径）。 `Compose` 将会利用它自动构建这个镜像，然后使用这个镜像。

可以使用 `context` 指令指定 `Dockerfile` 所在文件夹的路径。

使用 `dockerfile` 指令指定 `Dockerfile` 文件名。

使用 `target `指令指定要构建的阶段，如在多阶段构建中。

```Python
services:
  frontend:
    #image: example/webapp
    build: ./webapp   # 构建上下文  Dockerfile 

  backend:
    image: example/database
    build:
      context: backend    # 构建上下文  
      dockerfile: ../backend.Dockerfile
      target: builder     # 多阶段构建  

```

#### command  

覆盖容器启动后默认执行的命令。  CMD      docker run  image-name  command 

```YAML
version: "3" 
name: project-busy
services:
  busy:
    image: busybox
    command: echo "hello compose"
```

```Bash
[root@docker 04-compose-command]# docker compose up 
[+] Running 2/0
 ✔ Network project-busy_default   Created                                                                                        0.0s 
 ✔ Container project-busy-busy-1  Created                                                                                        0.1s 
Attaching to project-busy-busy-1
project-busy-busy-1  | hello compose
project-busy-busy-1 exited with code 0

```

#### restart    

指定容器退出后的重启策略为始终重启。该命令对保持服务始终运行十分有效，在生产环境中推荐配置为 `always` 或者 `unless-stopped`。

```Python
restart: always
```

#### healthcheck 

通过命令检查容器是否健康运行。

```YAML
version: "3" 
name: nginx-demo
services:
  busyapp:
    image: nginx:1.22.1 
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 5s
      retries: 3

```

```Bash
[root@docker 05-compose-healthcheck]# docker compose up -d 
[+] Running 2/2
 ✔ Network nginx-demo_default      Created                                                                                       0.0s 
 ✔ Container nginx-demo-busyapp-1  Started                                                                                       0.1s 
[root@docker 05-compose-healthcheck]# 
[root@docker 05-compose-healthcheck]# docker compose ps 
NAME                   IMAGE          COMMAND                                          SERVICE   CREATED         STATUS                            PORTS
nginx-demo-busyapp-1   nginx:1.22.1   "/docker-entrypoint.sh nginx -g 'daemon off;'"   busyapp   4 seconds ago   Up 3 seconds (health: starting)   80/tcp

[root@docker 05-compose-healthcheck]# docker compose ps 
NAME                   IMAGE          COMMAND                                          SERVICE   CREATED          STATUS                    PORTS
nginx-demo-busyapp-1   nginx:1.22.1   "/docker-entrypoint.sh nginx -g 'daemon off;'"   busyapp   32 seconds ago   Up 31 seconds (healthy)   80/tcp
```

#### environment

设置环境变量。你可以使用  **数组或对象**  两种格式。

给定名称的变量会自动获取运行 Compose 主机上对应变量的值，可以用来防止泄露不必要的数据。

```YAML
environment:
  RACK_ENV: development
  SHOW: 'true'
```

```YAML
environment:
  - RACK_ENV=development
  - SHOW=true
```

> 如果变量名称或者值中用到 `true|false，yes|no` 等表达[布尔](https://yaml.org/type/bool.html)含义的词汇，最好放到引号里，避免 YAML 自动解析某些内容为对应的布尔语义。这些特定词汇，包括 

> y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF

```YAML
[root@docker 06-enviroment]# docker compose  up 

[root@docker dockercompose-example]# docker exec -it project-env-foo-1 sh 
# env
HOSTNAME=fd0ddabf737b
HOME=/root
PKG_RELEASE=1~bullseye
SHOW=true
TERM=xterm
RACK_ENV=development

```

#### expose   

暴露端口，但不映射到宿主机，服务间可以互相访问。

仅可以指定内部端口为参数

```Python
expose:  # 声明应用监听 的端口 
 - "3000"
 - "8000"
```

#### depends_on

解决容器的依赖、启动先后的问题。以下例子中会先启动 `redis` 、`db` 再启动 `web`

```Python
version: '3'

services:
  web:
    build: .
    depends_on:
      - db
      - redis

  redis:
    image: redis

  db:
    image: postgres
```

#### ports

映射端口到宿主机  。 `  docker run  -p 8080:80    -p 18080:8080  -P   `  

使用 宿主机端口：容器端口 `(HOST:CONTAINER)` 格式，或者仅仅指定容器的端口（宿主将会随机选择端口）都可以。

```YAML
ports:
 - "3000"  # 容器里服务端口    docker run -P
 - "8080:80"  # docker run -p 8080:80 
 - "49100:80"
 - "127.0.0.1:8001:8001"
```

*注意：当使用 `HOST:CONTAINER` 格式来映射端口时，如果你使用的容器端口小于 60 并且没放到引号里，可能会得到错误结果，因为 `YAML` 会自动解析 `xx:yy` 这种数字格式为 60 进制。为避免出现这种问题，建议数字串都采用引号包括起来的字符串格式。*

long 语法支持配置 short 语法中不支持的附加字段。这些附加字段如下：

- target：指定容器内的端口。
- published：指定公开的端口。
- protocol：指定端口协议（tcp或udp）。
- mode：使用`host`在每个节点公开一个主机端口

```YAML
ports:
  - target: 80       # 目标 容器中监听 的端口     -p 8080:80
    published: 8080  # 发布 宿主机
    protocol: tcp
    mode: host
  - target: 8090       # 容器
    published: 8090  # 宿主机
    protocol: tcp
    mode: host
```

```YAML
version: "3" 
name: project-demo
services:
  nginx:
    image: nginx:1.22.1 
    ports:
      - target: 80
        published: 8080
        protocol: tcp
        mode: host
```

```YAML
[root@docker dockercompose-example]# netstat -nltp 
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      15439/docker-proxy  
tcp6       0      0 :::8080                 :::*                    LISTEN      15444/docker-proxy  
[root@docker dockercompose-example]# 
[root@docker dockercompose-example]# 
[root@docker dockercompose-example]# 
[root@docker dockercompose-example]# curl 127.0.0.1:8080
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>

```

### networks 指令属性

配置容器连接的网络。  

```YAML
services:
  frontend:
    image: nginx:1.22.1
    networks:
      - front-tier  # 根据名字引用 
      - back-tier

networks:
  front-tier:   # 使用默认的参数

  back-tier:   # 空的属性    默认值   分配 网段   网关 
```

### volumes 指令属性

定义容器可访问的挂载主机路径或命名卷。

docker run -v log-dir:/var/log/nginx 

```YAML
services:
  front:
    image: nginx:1.22.1 
    volumes:
      - log-dir:/var/log/nginx

  database:
    image: mysql:5.7 
    environment:
      MYSQL_ROOT_PASSWORD: 123456
    volumes:
      - /data/mysql:/var/lib/mysql/

volumes:
  log-dir:  

```

```YAML
[root@docker 08-compose-volumes]# docker compose up 

[root@docker dockercompose-example]# docker volume  ls 
DRIVER    VOLUME NAME
local     08-compose-volumes_db-data
local     08-compose-volumes_log-dir
```

可以使用 volumes 指定多种类型的挂载 比如`volume`, `bind`, `tmpfs`.

```YAML
services:
  front:
    image: nginx:1.22.1 
    volumes:
      - type: volume
        source: nginx-log 
        target: /var/log/nginx

  database:
    image: mysql:5.7 
    environment:
      MYSQL_ROOT_PASSWORD: 123456
    volumes:
      - type: bind 
        source: /data/mysql 
        target: /var/lib/mysql 

volumes:
  nginx-log:

```

```Bash
[root@docker 08-compose-volumes]# mkdir /data/mysql
[root@docker 08-compose-volumes]# docker compose -f compose2.yaml up 

[root@docker dockercompose-example]# docker volume  ls 
DRIVER    VOLUME NAME
local     08-compose-volumes_db-data
local     08-compose-volumes_log-dir
local     08-compose-volumes_nginx-log
[root@docker dockercompose-example]# ll /data/mysql/
total 188476
-rw-r----- 1 polkitd input       56 Nov 14 22:12 auto.cnf
-rw------- 1 polkitd input     1680 Nov 14 22:12 ca-key.pem
-rw-r--r-- 1 polkitd input     1112 Nov 14 22:12 ca.pem
-rw-r--r-- 1 polkitd input     1112 Nov 14 22:12 client-cert.pem
-rw------- 1 polkitd input     1680 Nov 14 22:12 client-key.pem
-rw-r----- 1 polkitd input     1318 Nov 14 22:13 ib_buffer_pool

```

### configs 指令属性     明文配置文件 

`config `允许服务调整自己的配置，而无需重建 Docker 镜像。

与卷一样，配置作为文件挂载到服务容器的文件系统中。容器内挂载点的位置在 Linux 容器中默认为 /<config-name>。

```YAML
version: "3" 
name: project-demo
services:
  busyapp:
    image: busybox
    command: cat /my_config   # 默认挂载目录 
    configs:
      - my_config    # 容器启动时 使用 my_config 配置文件 

configs:
  my_config:
    file: ./my_config.conf  # my_config 配置文件  位置 
```

```YAML
[root@docker 09-compose-config]# docker compose up 
WARN[0000] Found orphan containers ([project-demo-nginx-1]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up. 
[+] Running 1/0
 ✔ Container project-demo-busyapp-1  Recreated                                                                                   0.1s 
Attaching to project-demo-busyapp-1
project-demo-busyapp-1  | This is a config file.
project-demo-busyapp-1 exited with code 0

[root@docker 09-compose-config]# cat my_config.conf 
This is a config file.

```

指定 配置文件挂载路径 

```YAML
version: "3" 
name: nginx-demo
services:
  busyapp:
    image: nginx:1.22.1 
    ports:
      - "80:80"
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf

configs:
  nginx_config:
    file: ./default.conf
```

```Bash
[root@docker 09-compose-config]# docker compose -f compose2.yml up 

[root@docker 09-compose-config]# curl 127.0.0.1/ping
Pong[root@docker 09-compose-config]# 

```

### secrets 指令属性   密文配置文件 

存储敏感数据，例如 证书、`MySQL `服务密码。

```YAML
version: "3" 
name: project-demo
services:
  busyapp:
    image: busybox
    command: cat /run/secrets/my_secret   # 默认挂载目录 
    secrets:
      - my_secret

secrets:
  my_secret:
    file: ./my_secret.info
```

```Bash
[root@docker compose-secret]# docker compose up 
WARN[0000] Found orphan containers ([project-demo-nginx-1]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up. 
[+] Running 1/0
 ✔ Container project-demo-busyapp-1  Recreated                                                                                   0.1s 
Attaching to project-demo-busyapp-1
project-demo-busyapp-1  | password
project-demo-busyapp-1 exited with code 0

```

## 案例讲解:  部署 Wordpress

```YAML
services:
  db:
    image: mysql:8.0
    volumes:
      - db_data:/var/lib/mysql
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=somewordpress
      - MYSQL_DATABASE=wordpress
      - MYSQL_USER=wordpress
      - MYSQL_PASSWORD=wordpress
    expose:
      - 3306
      - 33060
      
  wordpress:
    image: wordpress:php7.4 
    volumes:
      - wp_data:/var/www/html
    ports:
      - "80:80"
    restart: always
    environment:
      - WORDPRESS_DB_HOST=db:3306
      - WORDPRESS_DB_USER=wordpress
      - WORDPRESS_DB_PASSWORD=wordpress
      - WORDPRESS_DB_NAME=wordpress
    depends_on: 
      - db

volumes:
  db_data:
  wp_data:
```

## 附录:

### 使用 Docker Compose 管理小型项目： 

https://mp.weixin.qq.com/s/eUcdVUc6VCUdjhlNtoJx7A

### 官网文档 

[Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3/)

[Docker compose overview](https://docs.docker.com/compose/compose-file/)

[compose-spec/spec.md at main · compose-spec/compose-spec](https://github.com/compose-spec/compose-spec/blob/main/spec.md)

### 镜像地址： 

Python 3.7

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/python:3.7-alpine
ccr.ccs.tencentyun.com/chijinjing/python:3.7-alpine
```

MySQL:

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/mysql:8.0
ccr.ccs.tencentyun.com/chijinjing/mysql:8.0
```

WordPress:

```Bash
registry.cn-beijing.aliyuncs.com/xxhf/wordpress:php7.4
ccr.ccs.tencentyun.com/chijinjing/wordpress:php7.4
```
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/F7Row9wneixA1ek6a2ScuuKPnrh)
- 导入日期：2026-06-22