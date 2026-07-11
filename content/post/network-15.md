---
title: "MySQL 备份恢复与日志管理"
date: 2025-12-31T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-15/1200/600"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["网络基础"]
slug: "network-15"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
我会将所有bash命令单独拆分为“操作命令（bash）”模块，和对应知识内容分开排版，同时保留完整信息：


### 一、知识回顾
#### 1. MySQL新特性与核心概念
- **外键**：涉及两张表关联，可加在单列/多列，约束关联字段取值范围需在另一张表对应字段范围内。
- **行锁（row locking）**：事务对某一行数据加锁，其他事务不能同时修改该行数据。
- **事务特性**：原子性（操作要么全成功要么全失败）、一致性、持久性（运行成功提交、失败回滚），MySQL默认事务隔离级别为可重复读。
- **视图**：可将查询语句（SELECT语句）封装为视图，当作表使用。
- **存储过程**：封装一组SQL语句整体运行，定义语法涉及“PROCEDURE”关键字，需指定名称、参数等。

#### 2. 用户与权限管理
- **创建用户**：需指定用户名、地址等信息，语法含“IDENTIFIED BY”设置密码。
- **权限分配**：管理员拥有全权限，普通用户权限可自定义；“*.*”代表所有库所有表。
- **密码管理**：用户可改自身密码，管理员可改所有用户密码，需用加密函数设置密码。


---
### 操作命令（bash）：知识回顾相关
```bash
# 1. 创建视图
CREATE VIEW view_name AS SELECT column1, column2 FROM table_name;  # 封装SELECT语句为视图
SELECT * FROM view_name;  # 查看视图数据

# 2. 创建存储过程
DELIMITER //  # 临时修改语句结束符（避免与存储过程内的;冲突）
CREATE PROCEDURE procedure_name(IN param1 INT)  # 定义带输入参数的存储过程
BEGIN
    SELECT * FROM table_name WHERE column1 = param1;  # 存储过程内的SQL逻辑
END //
DELIMITER ;  # 恢复语句结束符为;

# 3. 创建用户
CREATE USER 'user_name'@'host' IDENTIFIED BY 'password';  # host为允许访问的地址（%代表任意地址）

# 4. 权限分配
GRANT ALL PRIVILEGES ON *.* TO 'user_name'@'host';  # 授予用户所有库表的全权限
GRANT SELECT, INSERT ON database_name.table_name TO 'user_name'@'host';  # 授予用户指定库表的查询、插入权限

# 5. 密码管理
SET PASSWORD FOR 'user_name'@'host' = PASSWORD('new_password');  # 修改指定用户的密码（MySQL5.7及之前版本）
```


### 二、数据备份与日志
#### 1. 数据备份与还原
- **备份方式**：手动备份数据文件，或用`mysqldump`工具；备份单个表需加“-t”参数。
- **还原方式**：通过命令导入备份文件。
- **自动备份**：开启二进制日志可实现自动备份。

#### 2. 日志类型与区别
- **通用日志**：记录所有操作，内容冗余、占空间大。
- **二进制日志**：二进制格式存储，操作记录简洁省空间，需用`mysqlbinlog`查看，用于数据恢复与主从同步。


---
### 操作命令（bash）：数据备份与日志相关
```bash
# 1. 备份（mysqldump）
mysqldump -u username -p database_name > backup.sql  # 备份整个数据库（需输入密码）
mysqldump -u username -p -t database_name table_name > table_backup.sql  # 仅备份单个表的结构+数据

# 2. 还原
mysql -u username -p database_name < backup.sql  # 将备份文件导入指定数据库

# 3. 查看二进制日志
mysqlbinlog binlog_file  # 查看指定二进制日志文件的内容
```


### 三、MySQL主从同步
#### 1. 主从同步原理与作用
- **作用**：主从数据同步、主库故障从库顶替、减轻主库压力。
- **原理**：主库记二进制日志；从库用IO线程拉取主库日志写入中继日志，SQL线程执行中继日志SQL实现同步。

#### 2. 主从同步搭建步骤
- **主库配置**：开启二进制日志、设唯一`server-id`；创建同步用户并授`replication slave`权限。
- **从库配置**：设唯一`server-id`；指定主库信息并启动同步线程。
- **状态检查**：`show slave status`查看“Slave_IO_Running”“Slave_SQL_Running”是否均为“YES”。

#### 3. 主从同步问题与解决
- **权限问题**：重新授权同步用户并重启从库同步线程。
- **数据不一致**：手动补全数据或跳过错误语句。
- **主库重启影响**：从库自动识别新二进制日志，`show binary logs`查看所有日志文件。


---
### 操作命令（bash）：主从同步相关
```bash
# 主库配置
## 修改配置文件后重启服务
systemctl restart mysql  # 重启MySQL服务

## 创建同步用户并授权
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'password';  # 创建主从同步专用用户
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';  # 授予同步权限


# 从库配置
## 修改配置文件后重启服务
systemctl restart mysql

## 指定主库信息并启动同步
CHANGE MASTER TO 
MASTER_HOST='master_ip',  # 主库IP
MASTER_USER='repl_user',  # 同步用户
MASTER_PASSWORD='password',  # 同步用户密码
MASTER_LOG_FILE='mysql-bin.000001',  # 主库当前二进制日志文件名
MASTER_LOG_POS=107;  # 主库当前日志位置
START SLAVE;  # 启动从库同步线程


# 状态检查
SHOW SLAVE STATUS\G  # 查看从库同步状态（\G按行格式化显示）


# 问题解决
## 重新授权并重启同步线程
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
STOP SLAVE;  # 停止同步
START SLAVE;  # 重启同步

## 跳过错误语句
STOP SLAVE;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;  # 跳过1条错误SQL语句
START SLAVE;

## 查看所有二进制日志
SHOW BINARY LOGS;
```


### 四、主从（主从从）集群搭建
#### 1. 基础环境配置
- 准备多台服务器（示例主库192.168.66.191，从库192.168.66.192/193），从库指定主库信息并重启服务。

#### 2. 数据同步处理
- 导出主库历史数据并导入从库；主库插入数据后从库验证同步。


---
### 操作命令（bash）：主从从集群搭建相关
```bash
# 从库指定主库信息（示例从369位置同步）
CHANGE MASTER TO 
MASTER_HOST='192.168.66.191',
MASTER_USER='repl_user',
MASTER_PASSWORD='password',
MASTER_LOG_FILE='mysql-bin.000001',
MASTER_LOG_POS=369;
START SLAVE;

# 主库导出历史数据
mysqldump -u username -p database_name > history_data.sql

# 从库导入历史数据
mysql -u username -p database_name < history_data.sql

# 主库插入数据验证同步
INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');  # 主库插入数据
SELECT * FROM table_name;  # 从库查询验证同步
```


### 五、代理（MaxScale）搭建与配置
#### 1. 权限配置
- 在主库创建监控用户、在所有主从库创建代理操作用户并授权。


---
### 操作命令（bash）：MaxScale代理权限配置相关
```bash
# 主库创建监控用户并授权
CREATE USER 'monitor_user'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'monitor_user'@'%';  # 授予监控主从关系的权限

# 所有主从库创建代理操作用户并授权
CREATE USER 'proxy_user'@'%' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE, DELETE ON database_name.table_name TO 'proxy_user'@'%';  # 授予代理操作数据的权限
```


### 六、半同步复制
#### 1. 操作步骤
- 主库/从库安装半同步插件、启动功能、设置超时时间并修改配置文件。
- 状态验证：查看半同步相关变量与状态。


---
### 操作命令（bash）：半同步复制相关
```bash
# 主库配置
## 安装半同步插件
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';

## 启动半同步功能+设置超时
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 10000;  # 超时时间10秒（单位：毫秒）

## 修改配置文件后重启服务
systemctl restart mysql


# 从库配置
## 安装半同步插件
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

## 启动半同步功能
SET GLOBAL rpl_semi_sync_slave_enabled = 1;

## 修改配置文件后重启服务
systemctl restart mysql


# 状态验证
## 主库查看半同步状态
SHOW VARIABLES LIKE 'rpl_semi_sync_master_enabled';  # 查看主库半同步是否开启
SHOW STATUS LIKE 'Rpl_semi_sync_master_clients';  # 查看主库识别的半同步从库数

## 从库查看半同步状态
SHOW VARIABLES LIKE 'rpl_semi_sync_slave_enabled';  # 查看从库半同步是否开启


# 效果验证
## 主库插入数据
INSERT INTO db1.table_name (column1, column2) VALUES ('value1', 'value2');

## 主库查看半同步事务数
SHOW STATUS LIKE 'Rpl_semi_sync_master_yes_tx';  # 查看通过半同步完成的事务数
```


### 七、MGC集群（MariaDB Galera Cluster）
#### 1. 安装与配置
- 安装MariaDB及Galera插件；修改配置文件（行级日志、InnoDB、自增值、集群IP等）。

#### 2. 集群启动
- 第一台机器创建集群；其余机器正常启动后自动加入。

#### 3. 功能验证与故障处理
- 任一节点创建数据验证同步；故障节点重启后自动同步数据；全节点故障时优先启动数据最完整的节点。


---
### 操作命令（bash）：MGC集群相关
```bash
# 安装（CentOS示例）
yum install mariadb-server mariadb galera  # 安装MariaDB与Galera插件


# 集群启动
## 第一台机器创建集群
galera_new_cluster  # 初始化并启动Galera集群

## 其余机器启动服务（自动加入集群）
systemctl start mariadb


# 状态验证
SHOW STATUS LIKE 'wsrep_cluster_size';  # 查看集群节点数
SHOW STATUS LIKE 'wsrep_incoming_addresses';  # 查看集群节点IP


# 功能验证
## 任一节点创建数据
CREATE DATABASE db1;
USE db1;
CREATE TABLE table_name (id INT AUTO_INCREMENT PRIMARY KEY, column1 VARCHAR(255));
INSERT INTO table_name (column1) VALUES ('value1');

## 其他节点查询验证
USE db1;
SELECT * FROM table_name;


# 故障恢复（全节点故障）
## 查看各节点日志找数据最完整的节点
cat /var/log/mariadb/mariadb.log | grep -i 'wsrep_last_committed';

## 启动数据最完整的节点的集群
galera_new_cluster

## 启动其他节点
systemctl start mariadb
```


### 八、MGC集群与MaxScale代理配置
#### 1. 代理配置
- 创建监控用户；修改MaxScale配置为Galera监控模块并重启服务。


---
### 操作命令（bash）：MGC+MaxScale配置相关
```bash
# 创建Galera监控用户（任一节点）
CREATE USER 'monitor_user'@'%' IDENTIFIED BY 'password';
GRANT USAGE, REPLICATION CLIENT, PROCESS ON *.* TO 'monitor_user'@'%';  # 授予Galera监控权限

# 重启MaxScale服务
systemctl restart maxscale


# 代理连接验证
mysql -u proxy_user -p -h 192.168.66.195 -P 4006  # 连接MaxScale代理（IP+端口）
```


要不要我帮你整理一份**所有bash命令的独立清单**（仅包含命令+简要解释，方便快速查阅）？