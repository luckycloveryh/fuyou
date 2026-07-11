---
title: "Redis全面知识体系详解"
date: 2026-01-04T09:00:00+08:00
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["网络基础"]
slug: "network-16"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
# Redis全面知识体系详解
## 一、Redis定位与核心特性
### （一）数据库分类对比
| 数据库类型          | 代表产品  | 核心结构      | 数据关联            | 存储方式         | 关键特性                   | 局限性                                 |
| -------------- | ----- | --------- | --------------- | ------------ | ---------------------- | ----------------------------------- |
| 关系型数据库（RDBMS）  | MySQL | 行列结构（二维表） | 强关联（表间、行间、字段约束） | 磁盘持久化存储      | 支持事务、SQL语句、工具生态完善      | 扩展性弱、操作约束多、读写速度较慢                   |
| 非关系型数据库（NoSQL） | Redis | KV（键值）结构  | 无关联             | 内存存储为主，支持持久化 | 开源部署、存储格式多样、解析性能高、扩展性好 | 维护工具/资源有限、不支持SQL、多数不支持事务（仅部分支持存储过程） |
|                |       |           |                 |              |                        |                                     |

### （二）Redis核心优势
1. 开发语言：基于C语言开发，性能底层优化出色。
2. 性能表现：官方测试50并发下，读速度约11万次/秒，写速度约8万次/秒。
3. 双重角色：既可作为独立非关系型数据库，也可作为MySQL等关系型数据库的缓存。
4. 数据类型支持：键（key）固定为字符串，值（value）支持字符串、哈希、列表、集合、有序集合5种核心类型，区别于memcached等其他KV数据库。
5. 学习资源：官网及中文站点提供完整文档，上手门槛适中。


## 二、Redis安装与启动配置
### （一）安装方式详解
#### 1. 源码包安装（通用方式）
```bash
# 1. 安装基础依赖（GCC编译器）
yum install -y gcc  # CentOS/Rocky Linux系统
# 或 apt install -y gcc  # Ubuntu/Debian系统

# 2. 下载并解压Redis源码包（以6.2.14版本为例）
wget https://download.redis.io/releases/redis-6.2.14.tar.gz
tar -zxvf redis-6.2.14.tar.gz
cd redis-6.2.14

# 3. 生成执行计划
./configure --prefix=/usr/local/redis  # --prefix指定安装路径，默认/usr/local/bin

# 4. 编译与测试（测试会检查60+项配置，确保环境兼容）
make && make test

# 5. 安装到指定目录
make install
```
安装后核心文件说明：
- `redis-server`：Redis服务端启动命令
- `redis-cli`：Redis客户端连接命令
- `redis-benchmark`：Redis性能压力测试工具

#### 2. RPM包安装（简化方式）
```bash
# 1. Rocky Linux 9（预装RPM包）
dnf install -y redis  # 直接安装，无需额外依赖

# 2. CentOS 7（需手动安装原装包）
wget https://download.fedoraproject.org/pub/epel/7/x86_64/Packages/r/redis-3.2.12-2.el7.x86_64.rpm
rpm -ivh redis-3.2.12-2.el7.x86_64.rpm
```


### （二）启动与连接配置
#### 1. 核心默认参数
- 默认端口：6379（类比MySQL的3306端口）
- 监听地址：默认127.0.0.1（仅本地访问）
- 认证方式：默认无用户名，密码需手动配置
- 启动模式：默认前台启动

#### 2. 启动方式切换
```bash
# 方式1：前台启动（调试用，关闭终端服务停止）
redis-server  # 直接执行，终端会被占用

# 方式2：后台启动（生产环境推荐）
# 方法A：修改配置文件（永久生效）
vim /usr/local/redis/redis.conf  # 打开配置文件
daemonize yes  # 将默认no改为yes，开启后台运行

# 方法B：命令行加&（临时生效）
redis-server /usr/local/redis/redis.conf &  # 需指定配置文件路径

# 验证启动状态
ps -ef | grep redis  # 查看Redis进程
netstat -tnlp | grep 6379  # 查看6379端口监听
```

#### 3. 客户端连接命令
```bash
# 本地连接（默认IP=127.0.0.1，端口=6379）
redis-cli

# 远程连接（指定IP、端口、密码）
redis-cli -h 192.168.66.193 -p 6379 -a 1234  # -h=服务器IP，-p=端口，-a=密码（不推荐命令行明文输密码）

# 安全连接方式（先连接再验证密码）
redis-cli -h 192.168.66.193 -p 6379
auth 1234  # 连接后输入密码，避免明文暴露
```

#### 4. 远程连接配置（允许外部机器访问）
```bash
# 1. 编辑配置文件
vim /usr/local/redis/redis.conf

# 2. 修改核心参数
bind 0.0.0.0  # 从127.0.0.1改为0.0.0.0，监听所有IP
protected-mode no  # 关闭保护模式（默认yes，仅允许本地访问）

# 3. 重启Redis服务生效
systemctl restart redis  # RPM包安装的服务
# 或 源码包安装的服务：先杀进程再重启
pkill redis-server
redis-server /usr/local/redis/redis.conf
```


## 三、Redis配置文件关键参数详解
| 参数类别  | 核心参数             | 默认值                | 功能说明                                           |
| ----- | ---------------- | ------------------ | ---------------------------------------------- |
| 网络配置  | `bind`           | 127.0.0.1          | 指定监听的IP地址，0.0.0.0表示监听所有网卡                      |
|       | `port`           | 6379               | Redis服务端口，可自定义（如6380）                          |
|       | `protected-mode` | yes                | 保护模式，远程连接需设为no                                 |
| 安全配置  | `requirepass`    | 注释状态               | 连接密码，取消注释后设置（如requirepass 1234）                |
|       | `masterauth`     | 无                  | 从节点连接主节点的认证密码（主从复制用）                           |
| 进程与日志 | `daemonize`      | no                 | 是否后台运行，yes=后台启动                                |
|       | `pidfile`        | /var/run/redis.pid | 进程号存储文件路径                                      |
|       | `logfile`        | 空（终端输出）            | 日志文件路径（如/var/log/redis/redis.log）              |
|       | `loglevel`       | notice             | 日志级别（debug/verbose/notice/warning）             |
| 持久化配置 | `save 3600 1`    | 启用                 | RDB模式：1小时内至少1个键变化触发快照                          |
|       | `save 300 100`   | 启用                 | RDB模式：5分钟内至少100个键变化触发快照                        |
|       | `save 60 10000`  | 启用                 | RDB模式：1分钟内至少10000个键变化触发快照                      |
|       | `appendonly`     | no                 | AOF模式开关，yes=开启AOF持久化                           |
|       | `appendfsync`    | everysec           | AOF同步频率（everysec=每秒同步，always=每次操作同步，no=系统自动同步） |
| 其他配置  | `databases`      | 16                 | 默认数据库数量（下标0-15）                                |
|       | `tcp-keepalive`  | 300                | TCP长连接超时时间（秒）                                  |


## 四、Redis基础命令操作
### （一）通用命令（适用于所有数据类型）
```bash
# 1. 查看所有键（通配符支持：*匹配所有，?匹配单个字符）
keys *  # 初始状态返回empty（空）

# 2. 查看键类型（返回string/hash/list/set/zset）
type key_name  # 例：type user:1

# 3. 检查键是否存在（返回1=存在，0=不存在）
exists key_name  # 例：exists user:1

# 4. 删除键（可删除任意类型，返回删除成功的键数）
del key_name1 key_name2  # 例：del user:1 product:3

# 5. 设置键过期时间（单位：秒，到期自动删除）
expire key_name 3600  # 例：expire verify_code 60（验证码1分钟过期）

# 6. 查看键剩余存活时间（-1=永不过期，-2=已过期/不存在，正数=剩余秒数）
TTL key_name  # 例：TTL verify_code

# 7. 切换数据库（下标0-15，默认0号库）
select 15  # 切换到15号库，不同库键名可重复
```


### （二）核心数据类型及操作命令
#### 字符串类型（String）
**特点**：单个字符串存储，适用于简单值（如名称、验证码）
```bash
# 增加/修改键值（覆盖原有值）
set key value  # 例：set name zhangsan
# 获取键值
get key  # 例：get name → 返回"zhangsan"
```


#### 哈希类型（Hash）
**特点**：键对应嵌套KV结构，适用于多属性对象（如用户信息、商品详情）
```bash
# 增加/修改字段（单个字段）
hset key field value  # 例：hset user:1 id 1 name lisi age 25
# 批量增加/修改字段
hmset key field1 value1 field2 value2  # 例：hmset user:2 id 2 name wangwu age 30
# 获取单个字段值
hget key field  # 例：hget user:1 name → 返回"lisi"
# 获取所有字段和值
hgetall key  # 例：hgetall user:1 → 返回id 1 name lisi age 25
# 删除指定字段（返回删除成功的字段数）
hdel key field1 field2  # 例：hdel user:1 age → 删除用户1的age字段
```


#### 列表类型（List）
**特点**：有序、可重复的“数组式”集合，支持两端操作
```bash
# 左侧添加元素（从列表头部插入）
lpush key value1 value2  # 例：lpush fruit apple banana → 列表：banana,apple
# 右侧添加元素（从列表尾部插入）
rpush key value1 value2  # 例：rpush fruit orange → 列表：banana,apple,orange
# 查看指定下标范围的元素（0=起始，-1=末尾，支持负数下标）
lrange key start end  # 例：lrange fruit 0 -1 → 查看所有元素
# 根据下标修改元素
lset key index value  # 例：lset fruit 1 pear → 将下标1改为pear
# 左侧弹出元素（删除并返回列表头部元素）
lpop key  # 例：lpop fruit → 返回"banana"，列表剩余：pear,orange
# 右侧弹出元素（删除并返回列表尾部元素）
rpop key  # 例：rpop fruit → 返回"orange"，列表剩余：pear
# 删除指定元素（count=删除数量，count>0=从左到右删count个，count<0=从右到左删）
lrem key count value  # 例：lrem num_list 2 3 → 删除num_list中2个值为3的元素
# 获取列表长度
llen key  # 例：llen fruit → 返回列表元素个数
# 根据下标获取单个元素
lindex key index  # 例：lindex fruit 0 → 返回下标0的元素
```


#### 集合类型（Set）
**特点**：无序、不可重复集合，不支持下标访问
```bash
# 添加元素（自动去重，重复元素无法存入）
sadd key value1 value2  # 例：sadd tag java python java → 实际存入java,python
# 查看所有元素（顺序不固定）
smembers key  # 例：smembers tag → 返回java,python（顺序随机）
# 删除指定元素（返回删除成功的元素数）
srem key value1 value2  # 例：srem tag python → 删除python元素
# 注：修改元素需先删除再重新添加
```


#### 有序集合类型（ZSet）
**特点**：无序不重复，新增“分值（score）”排序字段
```bash
# 添加元素（指定分值，可批量添加）
zadd key score1 value1 score2 value2  # 例：zadd rank 95 zhangsan 88 lisi
# 查看元素（默认按分值升序，withscores=显示分值）
zrange key start end [withscores]  # 例：zrange rank 0 -1 withscores → 显示排名及分数
# 删除指定元素
zrem key value1 value2  # 例：zrem rank lisi → 删除lisi的排名记录
# 注：修改元素需先删除再重新添加；重复添加同一元素会更新分值（调整排序）
```


## 五、Redis持久化机制
### （一）RDB模式（默认开启）
#### 1. 核心原理
通过“快照”机制，将内存中当前所有数据以二进制格式写入`dump.rdb`文件（默认存储在安装目录），快照生成由触发机制控制。

#### 2. 触发机制（配置文件中默认启用）
- 3600秒（1小时）内至少1个键变化
- 300秒（5分钟）内至少100个键变化
- 60秒（1分钟）内至少10000个键变化
- 键变化越频繁，快照生成越密集，数据丢失风险越低

#### 3. 优缺点
- 优点：文件体积紧凑、节省磁盘空间；通过子进程执行快照，不阻塞客户端操作；恢复速度快。
- 缺点：子进程创建（fork操作）可能短暂影响服务器性能；二进制文件可读性差，版本升级时数据迁移可能中断；间隔性备份，极端情况（如服务器宕机）会丢失上次快照后的所有数据。


### （二）AOF模式（需手动开启）
#### 1. 开启配置
```bash
# 1. 编辑配置文件
vim /usr/local/redis/redis.conf

# 2. 开启AOF模式（默认no）
appendonly yes

# 3. 配置同步频率（三选一）
appendfsync always  # 每次操作都同步，数据零丢失但性能消耗高
appendfsync everysec  # 每秒同步一次（默认），平衡性能与数据安全性
appendfsync no  # 不主动同步，依赖系统刷盘，数据丢失风险高

# 4. 重启Redis服务生效
systemctl restart redis
```
开启后会生成`appendonly.aof`文件（与`dump.rdb`同目录），文件以Redis命令追加形式存储（如`set name zhangsan`）。

#### 2. 优缺点
- 优点：同步频率高，数据丢失概率极低（最多丢失1秒数据）；文件为文本格式，可读性强，便于故障排查和数据恢复。
- 缺点：文件体积随操作增多持续增大；每秒同步会消耗一定CPU和IO资源，性能略低于RDB模式。


### （三）使用建议
- 测试环境/非核心数据：仅启用RDB模式，兼顾性能与基础数据备份。
- 生产环境/核心数据：同时开启RDB+AOF模式，AOF保障数据安全性，RDB用于快速恢复；开启AOF前需备份现有数据，避免配置错误导致数据清空。


## 六、Redis主从复制（读写分离与备份）
### （一）配置前提
- 准备多台已安装Redis的服务器（示例：3台机器，IP=192.168.66.193/194/195，密码=1234）。
- 所有服务器Redis配置文件已完成基础配置（关闭IPv6、关闭保护模式、开启后台启动、指定日志/数据存储路径）。


### （二）主从配置步骤（从节点配置）
```bash
# 1. 编辑从节点Redis配置文件
vim /etc/redis/redis.conf

# 2. 指定主节点IP和端口（Redis 5.0+用replicaof，5.0以下用slaveof）
replicaof 192.168.66.193 6379  # 主节点IP=192.168.66.193，端口=6379

# 3. 配置主节点认证密码（主节点设密码时必须配置）
masterauth 1234  # 与主节点requirepass参数值一致

# 4. 配置从节点自身密码（可选）
requirepass 1234  # 客户端连接从节点需输入的密码

# 5. 重启从节点Redis服务
systemctl restart redis
```


### （三）主从同步原理与验证
#### 1. 同步流程
- 从节点重启后，主动向主节点发送同步请求。
- 主节点生成全量数据快照（RDB文件），发送给从节点，从节点载入快照完成初始同步。
- 后续主节点数据发生修改时，通过AOF日志将操作命令实时推送给从节点，从节点执行命令完成增量同步。

#### 2. 状态验证命令
```bash
# 连接从节点，查看主从复制状态
redis-cli -h 192.168.66.194 -p 6379 -a 1234
info replication  # 输出结果中包含主节点IP、端口、同步状态等信息
```


### （四）主从架构特性与局限
#### 1. 核心特性
- 同步方向：单向同步（主→从），主节点写入数据，从节点自动同步。
- 从节点权限：默认处于只读（readonly）模式，尝试写入操作不会生效，也不会同步到其他节点。
- 功能价值：实现读写分离（主写从读），减轻主节点压力；从节点作为备份，提升数据可用性。

#### 2. 局限
- 无自动故障转移：主节点宕机后，需手动将从节点提升为主节点，服务中断时间长。
- 存储容量限制：从节点仅为数据备份，未提升集群总存储容量，仍受主节点内存限制。


## 七、Redis哨兵模式（自动故障转移）
### （一）核心作用
解决主从架构“无自动故障转移”的问题，通过哨兵进程监控主从节点状态，当主节点宕机时，自动选举新主节点，重新配置主从关系，保障服务持续可用。


### （二）部署建议
- 哨兵节点数量：至少3个，部署在不同服务器上，避免“脑裂”（多个哨兵对主节点状态判断不一致）。
- 哨兵与主从节点：哨兵节点需能访问所有主从节点，建议与主从节点部署在同一局域网。


### （三）工作流程
1. 监控：哨兵进程实时发送心跳检测（ping命令）给所有主从节点，判断节点存活状态。
2. 判定故障：当主节点未在指定时间内响应心跳（默认超时时间30秒），哨兵集群通过投票机制判定主节点“客观下线”。
3. 选举新主：从所有健康的从节点中，根据节点优先级、同步进度等条件选举新主节点。
4. 重新配置：将其他从节点重新指向新主节点，完成主从关系切换；原主节点恢复后，自动成为新主节点的从节点。


## 八、Redis集群（Redis Cluster，分布式存储与扩容）
### （一）核心作用
解决主从架构和哨兵模式的“存储容量限制”问题，实现分布式存储，支持海量数据存储和水平扩容。


### （二）集群核心特性
1. 无中间件损耗：客户端直接与集群节点连接，无需代理中间件，通过`-c`参数可连接整个集群（任意节点可获取集群全量信息）。
2. 节点通信：采用“乒乓机制”进行心跳检测，数据通过二进制传输；半数以上节点判定某节点下线，则该节点正式下线。
3. 高可用设计：每个主节点需配置从节点，主节点宕机后，从节点自动升级为新主节点。
4. 主节点数量：建议不超过1000个，至少3个主节点（满足“半数以上”投票原则，避免脑裂）。


### （三）集群搭建步骤（最小集群：3主3从，6个Redis服务）
#### 1. 节点准备
- 服务器：3台机器（IP=192.168.66.193/194/195），每台部署2个Redis服务（端口=6379、6380）。
- 基础配置：所有服务关闭保护模式、绑定0.0.0.0、开启后台启动、配置独立的日志/数据/PID文件路径（避免冲突）。


#### 2. 开启集群配置
```bash
# 1. 编辑每个Redis服务的配置文件（以192.168.66.193的6379端口为例）
vim /etc/redis/6379.conf

# 2. 开启集群模式（默认no）
cluster-enabled yes

# 3. 集群配置文件（自动生成，无需手动编辑）
cluster-config-file nodes-6379.conf

# 4. 集群节点超时时间（默认15000毫秒=15秒）
cluster-node-timeout 15000

# 5. 复制配置文件到6380端口目录，修改端口相关参数
cp /etc/redis/6379.conf /etc/redis/6380.conf
sed -i 's/6379/6380/g' /etc/redis/6380.conf  # 批量替换端口号

# 6. 其他服务器重复上述步骤，完成6个服务的配置
```


#### 3. 启动所有集群节点
```bash
# 启动192.168.66.193的2个服务
redis-server /etc/redis/6379.conf
redis-server /etc/redis/6380.conf

# 启动192.168.66.194的2个服务
redis-server /etc/redis/6379.conf
redis-server /etc/redis/6380.conf

# 启动192.168.66.195的2个服务
redis-server /etc/redis/6379.conf
redis-server /etc/redis/6380.conf

# 验证启动状态（6个服务均需正常运行）
ps -ef | grep redis-server
```


#### 4. 创建Redis集群
```bash
# 用redis-cli创建集群，--cluster-replicas 1表示每个主节点配1个从节点
redis-cli --cluster create \
192.168.66.193:6379 192.168.66.193:6380 \
192.168.66.194:6379 192.168.66.194:6380 \
192.168.66.195:6379 192.168.66.195:6380 \
--cluster-replicas 1

# 执行后会提示集群分配方案（主从节点分布、槽位分配），输入yes确认
```


### （四）集群存储原理
#### 1. 哈希槽位分配
- 集群内置16384个哈希槽（固定总数），创建集群时均匀分配给每个主节点。
- 例：3个主节点时，每个主节点分配约5461个槽位（16384÷3）。

#### 2. 数据存储逻辑
```bash
# 1. 存储数据时，Redis对键（key）执行CRC16算法
CRC16(key) → 得到一个整数结果

# 2. 对16384取余，确定数据所属槽位
slot = CRC16(key) % 16384

# 3. 将数据存储到该槽位对应的主节点及从节点
# 例：key=user:1的CRC16结果取余后为1234，若1234属于节点A的槽位，则存储到A节点
```


### （五）集群测试与稳定性验证
#### 1. 数据存储测试
```bash
# 连接集群（需加-c参数，支持槽位自动跳转）
redis-cli -h 192.168.66.193 -p 6379 -a 1234 -c

# 存储数据
set user:1 zhangsan
set product:1001 phone

# 查看数据存储位置（通过cluster keyslot命令查看键所属槽位）
cluster keyslot user:1  # 返回该键对应的槽位
cluster nodes  # 查看各节点的槽位分配范围，确定数据存储节点
```

#### 2. 稳定性测试场景
- 场景1：关闭某从节点 → 集群正常运行，主节点数据无影响。
- 场景2：关闭某主节点 → 对应的从节点自动升级为新主节点，集群正常提供服务。
- 场景3：修复原主节点 → 原主节点重启后自动成为新主节点的从节点，同步新数据。
- 场景4：关闭一对主从节点 → 对应槽位无法提供服务，集群挂掉，无法存储/读取该槽位数据。


## 九、Redis缓存实践（以MySQL表数据缓存为例）
### （一）缓存数据类型选择
推荐使用**哈希类型（Hash）** 存储数据库表数据，原因：
- 哈希类型的KV结构与MySQL表的“字段-值”结构完全对应，便于按字段查询和修改。
- 避免列表类型“字段含义不明确、取值需遍历”的问题，也避免字符串类型“修改单个字段需全量更新”的低效问题。


### （二）键名命名规则（确保唯一性）
格式：`库名:表名:主键值`
```bash
# 例：MySQL库名=mysql_db，表名=user，主键id=1
# 存储用户信息（哈希类型）
hset mysql_db:user:1 id 1 name zhangsan age 25 gender male
```


### （三）缓存更新策略
1. MySQL表数据新增/修改/删除时，同步更新Redis缓存（避免缓存与数据库数据不一致）。
2. 为缓存设置合理过期时间（如热点数据1小时过期），通过`expire`命令实现，避免缓存数据长期无效。


