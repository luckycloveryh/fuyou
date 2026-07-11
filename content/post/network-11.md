---
title: "安装过程中需交互配置的核心选项（无需手动输入，按提示选择即可）"
date: 2025-12-25T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-11/1200/600"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["网络基础"]
slug: "network-11"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
## 一、课前与复习环节
1. 明确分享要求，强调后续所有阶段分享需还原标准流程，做好细节处理（如“该标注的内容需明确标注”），完成后及时归位相关配置或文件。
2. 回顾前一天课程内容，包括演示相关组件的联合工作逻辑、讲解MySQL相关基础内容，提及已发放管理环境的源码包，说明课程主要以RPM包（原“IPM/IPN”疑为口误）为主；针对脚本安装的相关疑问，指出感兴趣的学员可自行拓展了解其他安装方式。

## 二、Web服务与环境搭建
### （一）NGINX相关知识
1. 功能与应用场景：NGINX（原口误“n j x”“NDX”）并非仅用于反向代理，还可直接处理静态请求，反向代理多适用于动态请求场景；对比反向代理与跳转的区别，说明反向代理常用于服务间请求转发，一般不代理到自身服务，可与Apache（原“阿化器”为口误）及虚拟主机关联使用。
2. 虚拟主机配置：域名与IP的使用场景取决于配置方式（基于域名或端口），不同配置下域名解析存在差异（如特定环境内启动时解析为IP，独立环境下动态解析）。
3. 反向代理配置：解答单RS（Real Server，真实服务器）与多RS的配置标签问题，说明单RS的配置位置及多RS的不同配置方式，解释不同配置位置中使用域名的差异原因。

### （二）组件关联逻辑
1. Apache与PHP关联：通过PHP模块或PHP-FPM实现关联，验证方式为访问Apache网页，查看页面内容及源代码确认关联状态。
2. PHP与MySQL关联：MySQL对PHP而言属于扩展组件，需在Apache相关界面中编写数据库操作的PHP代码（原“平均存在码”疑为口误）。
3. Tomcat与Java关联：二者通过相关配置文件及依赖包建立联系（原“models and this”为口误）。

### （三）LAMP/LNMP环境搭建
#### 1. 安装方式概述
LAMP环境安装方式多样，包括源码包安装、RPM包安装、使用现成脚本（如LNMP、LNP脚本）等；LNMP环境搭建核心是将LAMP中的Apache替换为NGINX，NGINX支持多节点处理。

#### 2. 脚本安装细节
- 版本选择：推荐脚本安装包2.1稳定版，2.2版本暂不稳定；脚本包分为含完整软件包的版本（无需联网下载依赖，体积大）和仅含脚本的精简版（需联网获取依赖，体积小）。
- 安装步骤：
  ```bash
  # 1. 下载脚本（示例命令，实际需根据脚本来源调整）
  wget 脚本下载地址
  # 2. 解压脚本文件
  unzip 脚本压缩包.zip  # 或 tar -zxvf 脚本压缩包.tar.gz
  # 3. 运行安装脚本
  sh install.sh
  ```
  - 命令解释：`wget` 用于下载网络文件，`unzip/tar` 用于解压对应格式压缩包，`sh install.sh` 执行安装脚本（原“Insta 点 S h”“安音词道”为“install.sh”的发音误读）。
  - 执行要求：脚本需以root用户运行，运行后自动检测系统环境变量，默认安装LNMP，支持手动选择安装LAMP。
- 依赖问题解决：
  - 方式1：联网获取网络源依赖；
  - 方式2：使用本地备份源或公司/学校内部共享源；
  - 实操示例：针对缺失的两个依赖包，可通过挂载本地镜像、替换系统源或提前手动安装依赖解决。

#### 3. 安装配置选项
```bash
# 安装过程中需交互配置的核心选项（无需手动输入，按提示选择即可）
# 1. 数据库选择：MySQL（原“myself”为口误）
# 2. 设置MySQL root用户密码（示例：123）
# 3. 存储引擎选择：InnoDB（原“n g”为缩写发音）
# 4. PHP版本选择：PHP 8.x
# 5. 配置内存回收机制
# 6. 设置Apache管理员邮箱
# 7. Apache版本选择：2.4.34或其他适配版本（原“57”疑为版本号误读）
```
- 安装耗时：约20分钟，安装日志自动生成在root目录，可通过日志判断安装是否成功。
- 安装方式对比：源码包安装（耗时久、需手动配置组件关联）vs 脚本安装（高效便捷、自动完成组件关联）。

#### 4. MySQL基础安装与操作
```bash
# 安装MariaDB（兼容MySQL）
dnf install mariadb
# 启动MySQL/MariaDB服务
systemctl start mariadb
# 查看MySQL服务状态
systemctl status mariadb
# 登录MySQL（root用户，密码123）
mysql -u root -p123
```
- 命令解释：
  - `dnf install mariadb`：安装MariaDB（MySQL的分支版本，核心功能兼容），原“d f 杠外 install moriar d b”为命令发音误读；
  - `systemctl start/status mariadb`：用于启动和查看服务运行状态；
  - `mysql -u root -p123`：登录MySQL，`-u` 指定用户名（root），`-p` 后接密码（示例123，原“myself 杠右 路特 杠屁123”为该命令的发音误读）。
- 基础数据库命令：
  ```sql
  -- 查看所有数据库
  SHOW DATABASES;
  -- 创建数据库（示例：创建test_db数据库）
  CREATE DATABASE test_db;
  -- 进入指定数据库（示例：进入test_db）
  USE test_db;
  -- 查看当前数据库中的所有表
  SHOW TABLES;
  ```
  - 命令说明：原“days”疑为“CREATE DATABASE”的发音误读，SQL语句需以英文分号结尾，关键字不区分大小写。

## 三、MySQL核心基础
### （一）数据库分类
- 关系型数据库 vs 非关系型数据库（NoSQL，原“Nostle”疑为发音误读）；
- 非关系型数据库示例：Redis、MongoDB（原“芒果 BB”为发音误读）等（原“HV 4”疑为口误）；
- 记忆建议：结合实际使用场景反复练习巩固。

### （二）MySQL数据文件路径
- 源码包安装：可自定义数据文件存储路径；
- 数据文件格式：由所选存储引擎决定，MySQL默认存储引擎为InnoDB（原“in the d b”为发音误读）。

### （三）SQL语句基础
1. 定义：SQL（Structured Query Language，结构化查询语言，原“structure private language”为英文表述误读），由ISO（国际标准化组织）规定，不同数据库厂商有“方言”扩展。
2. 核心特点：
   - 语句以英文分号结尾；
   - 关键字（如CREATE DATABASE）不区分大小写；
   - 数据库名、表名、变量名区分大小写；
   - 列名（表头）不区分大小写。
3. 语句分类：
   - DDL（数据定义语言）：定义数据存储结构，如`CREATE DATABASE`（创建数据库）、`CREATE TABLE`（创建表）；
   - DML（数据操作语言）：操作数据，如INSERT（插入）、DELETE（删除）、UPDATE（修改）；
   - DQL（数据查询语言）：查询数据，如SELECT（最常用，例：京东用户查看购物车）；
   - DCL（数据控制语言）：用户管理与权限控制，如创建用户、授权。
4. 学习顺序建议：先练习查询（DQL）→ 再学数据修改（DML）→ 接着定义数据结构（DDL）→ 最后掌握权限控制（DCL）。

## 四、SQL核心操作
### （一）DQL（数据查询语言）核心操作
#### 1. 基础查询语法
```sql
-- 1. 全列查询（查询表中所有列的所有行数据）
SELECT * FROM 表名;
-- 2. 指定列查询（查询表中指定列的所有行数据）
SELECT 列名1, 列名2 FROM 表名;
-- 3. 列别名设置（两种格式）
SELECT 列名1 AS 别名 FROM 表名;
SELECT 列名2 别名 FROM 表名;
```
- 语法说明：
  - `*` 代表表中所有列（非所有行）；
  - 列名不区分大小写，列之间用英文逗号分隔，列顺序不影响查询结果；
  - 别名仅作用于查询结果显示，不修改数据库中实际列名。

#### 2. 数据类型与符号规则
- 字符串类型：查询条件中必须用单引号包裹，示例：`name = '钱'`；
- 数字类型：可加单引号或不加，示例：`sex = 1` 或 `sex = '1'`，建议规则统一。

#### 3. 条件查询（WHERE子句）
```sql
-- 1. 精确匹配
SELECT * FROM 信息 WHERE 学号 = '201203';
-- 2. 模糊匹配（通配符：_ 单个任意字符，% 0个或多个任意字符）
SELECT * FROM 信息 WHERE name LIKE '张%';  -- 姓“张”的数据
SELECT * FROM 信息 WHERE name LIKE '_i%';  -- 第二个字符为“i”的数据
-- 3. NULL值处理
SELECT * FROM 信息 WHERE address IS NULL;  -- 查询地址为空的数据
SELECT * FROM 信息 WHERE address IS NOT NULL;  -- 查询地址非空的数据
-- 4. 多条件组合（AND 与，OR 或）
SELECT * FROM 信息 WHERE sex = 0 AND address = '北京';  -- 北京的男性
SELECT * FROM 信息 WHERE sex = 0 OR address = '北京';   -- 男性或北京的所有数据
-- 5. 批量条件匹配（IN）
SELECT * FROM 信息 WHERE sex IN (0, 1);  -- 性别为0或1的数据（支持最多两千余个值）
-- 6. 范围查询（BETWEEN ... AND ...）
SELECT * FROM 信息 WHERE id BETWEEN 2 AND 4;  -- id在2-4之间（含边界）
SELECT * FROM 信息 WHERE id NOT BETWEEN 2 AND 4;  -- 不在该范围
-- 7. 逻辑非（NOT）
SELECT * FROM 信息 WHERE name NOT LIKE '张%';  -- 不姓“张”的数据
```

#### 4. 查询结果限制与排序
```sql
-- 1. 限制返回行数（LIMIT）
SELECT * FROM 信息 LIMIT 3;  -- 返回前3行数据
-- 2. 排序（ORDER BY）
SELECT * FROM 信息 ORDER BY id;  -- 按id升序（ASC，可省略）
SELECT * FROM 信息 ORDER BY id DESC;  -- 按id降序
-- 3. 多字段排序（先按列1排序，列1值相同则按列2排序）
SELECT * FROM 信息 ORDER BY boss ASC, id DESC;
```

#### 5. SQL语句执行顺序
- 逻辑流程：`FROM`（确定目标表）→ `WHERE`（过滤行）→ `SELECT`（提取列），该顺序可减少资源浪费，避免低效操作。

### （二）DML（数据操作语言）核心操作
#### 1. 插入数据（INSERT）
```sql
-- 1. 完整语法（指定列名）
INSERT INTO 信息 (ID, 学号, 姓名) VALUES (1, '001', '张三');
-- 2. 简化语法（按表结构列顺序传值）
INSERT INTO 信息 VALUES (2, '002', '李四', '北京', 0);
-- 3. 多行插入
INSERT INTO 信息 (ID, 学号, 姓名) VALUES (3, '003', '王五'), (4, '004', '赵六');
-- 4. 特殊值处理（NULL值与空字符串）
INSERT INTO 信息 (ID, 学号, 姓名, address) VALUES (5, '005', '孙七', NULL);  -- NULL值（无需单引号）
INSERT INTO 信息 (ID, 学号, 姓名, address) VALUES (6, '006', '周八', '');    -- 空字符串
```
- 注意事项：
  - 字符串和日期类型值必须加单引号，数值类型可省略；
  - 未指定的列若有默认值则填充默认值，无默认值且允许NULL则存为NULL，不允许NULL则报错；
  - 插入NULL值时切勿加单引号，否则会被识别为字符串“NULL”。

#### 2. 修改数据（UPDATE）
```sql
-- 1. 单条件修改
UPDATE 信息 SET sex=0 WHERE sex=228;  -- 将sex=228的行改为0
-- 2. 批量修改（按空值筛选）
UPDATE 信息 SET address='杭州' WHERE address IS NULL;  -- 地址为空的行统一更新为杭州
```
- 关键提醒：务必添加`WHERE`条件（除非确需批量修改所有数据），修改前建议用`SELECT`验证条件准确性；判断NULL值需用`IS NULL`，不可用`=`。

#### 3. 删除数据（DELETE）
```sql
-- 1. 按条件删除
DELETE FROM 信息 WHERE name = '钱';  -- 删除姓名为“钱”的数据
DELETE FROM 信息 WHERE name LIKE '_i%';  -- 删除第二个字符为“i”的数据
-- 2. 清空表数据（保留表结构）
DELETE FROM 信息;
```
- 注意事项：
  - `DELETE`仅删除行数据，不删除表结构；
  - 若需清除指定列内容，需用`UPDATE`，删除操作无法单独删除某一列数据。

### （三）表结构查看（DESCRIBE/desc）
```bash
# 查看表结构（两种写法）
DESCRIBE 信息;
desc 信息;
```
- 功能：查看表的字段名、数据类型（Type）、是否允许NULL（Null列）、默认值（Default列）等核心信息；
- 关键字段含义：
  - Null：“YES”表示允许NULL，“NO”表示不允许；
  - Default：字段预设默认值，显示NULL则无默认值；
  - Type：字段数据类型（如int、varchar、date等）。

## 五、MySQL进阶配置与规则
### （一）MySQL数据类型详解
#### 1. 数值类型
| 类型           | 字节数 | 特点说明                                |
| ------------ | --- | ----------------------------------- |
| tinyint      | 1   | 有符号范围：-128~127；无符号（UNSIGNED）：0~255  |
| smallint     | 2   | 数值范围大于tinyint，适用于中等大小整数             |
| int          | 4   | 常用整数类型，支持有符号/无符号，范围足够满足多数场景         |
| bigint       | 8   | 支持超大整数，适用于需要存储极大数值的场景（如海量数据ID）      |
| float        | 4   | 单精度小数，精度较低，适用于对精度要求不高的场景            |
| double       | 8   | 双精度小数，精度高于float，适用于中等精度需求           |
| decimal(m,n) | -   | 精确小数（m为整数位，n为小数位），无计算误差，适用于金额、税率等场景 |

#### 2. 字符串类型
- char(n)：定长字符串，n为固定字符数，存储时不足n用空格补齐，适用于手机号、身份证号等长度固定的数据；
- varchar(n)：变长字符串，n为最大允许字符数，按实际字符数占用空间，适用于姓名、地址等长度不固定的数据；
- text系列（text/mediumtext/longtext）：用于存储大量文本数据，longtext容量最大；
- blob：二进制数据类型，用于存储图片、文件等二进制内容。

#### 3. 日期时间类型
- date：仅存储年月日（YYYY-MM-DD），适用于出生日期、注册日期；
- time：仅存储时分秒（HH:MM:SS），适用于上下班时间、活动时长；
- datetime：存储年月日时分秒（YYYY-MM-DD HH:MM:SS），适用于订单创建时间、操作日志；
- year：仅存储年份（YYYY/YY），适用于毕业年份、生产年份；
- timestamp：存储格式同datetime，转为整数存储便于比较，默认自动更新为数据最后修改时间（可关闭）。

### （二）表结构与数据插入规则
1. 必填字段判断：通过`DESCRIBE`语句查看，若字段“Null”为“NO”且“Default”为NULL，则为必填项（如ID、学号）；
2. 默认值生效规则：非必填字段未传值时，优先用预设默认值→无默认值且允许NULL则存为NULL→不允许NULL且无默认值则报错；
3. 数据类型匹配规则：插入值需与字段类型一致（如int字段不可插入字符串），date类型需严格遵循YYYY-MM-DD格式。

### （三）MySQL中文支持配置
#### 1. 问题根源：MySQL默认字符集不支持汉字编码，直接插入中文会乱码或报错。
#### 2. 解决步骤：
```bash
# 1. 编辑MySQL配置文件（示例路径，实际需根据系统调整）
vim /etc/my.cnf.d/dbconsole.cnf
# 2. 在[mysqld]标签下添加字符集配置
character-set-server=utf8
# 3. 保存配置并退出vim（按Esc，输入:wq回车）
# 4. 重启MySQL服务使配置生效
systemctl restart mariadb
# 5. 删除旧表（若已创建表，需重新建表继承新字符集）
mysql -u root -p123 -e "DROP TABLE 旧表名;"
# 6. 重新创建表（新表默认使用UTF-8字符集）
```
- 配置说明：`utf8`字符集支持全球大部分语言（含中文），修改配置后必须重启服务，旧表不会自动继承新字符集，需重建。

## 六、环境验证与问题排查
### （一）安装结果验证
1. 服务状态检查：
   ```bash
   # 检查Apache服务状态
   systemctl status httpd
   # 检查MySQL/MariaDB服务状态
   systemctl status mariadb
   ```
2. MySQL登录验证：
   ```bash
   mysql -u root -p123
   ```
   - 成功登录则说明MySQL安装正常，失败需检查密码是否正确、服务是否启动。
3. Apache网页验证：
   ```bash
   # 搜索Apache网页文件路径（DocumentRoot）
   grep "DocumentRoot" /etc/httpd/conf/httpd.conf
   ```
   - 原“document 和入诊”为“DocumentRoot”的英文表述误读，通过该命令确认网页文件存放路径；
   - 若默认网页未显示“Apache”页面，排查原因：虚拟主机配置被修改导致默认配置失效，解决方案：修改回原路径并重启Apache。

### （二）Apache重启命令
```bash
# 方式1：通过service命令重启（适用于RPM包安装）
service httpd restart
# 方式2：通过systemctl命令重启（通用）
systemctl restart httpd
# 方式3：通过安装脚本重启（若脚本支持）
sh 安装脚本路径 restart httpd
```
- 注意：RPM包安装的service文件位置与源码包安装不同，自行编写的service文件一般存放于系统指定目录（如`/usr/lib/systemd/system/`）。

### （三）核心提醒
- 使用过程中需注意虚拟主机配置对Apache默认功能的影响，避免配置冲突导致服务异常。

## 七、课程安排
1. 下课前小测：检查学员是否成功安装Apache、MySQL组件，及组件是否能正常启动、登录；
2. 课程最后安排休息环节。

## 八、核心避坑注意事项
1. SQL语句结尾必须添加英文分号（;），否则数据库判定语句未结束，无法执行；
2. 字符串和日期类型值必须加单引号，数值类型可省略单引号（不推荐冗余写法）；
3. 执行UPDATE、DELETE语句时，务必添加WHERE条件（除非确需批量操作），操作前用SELECT验证条件准确性，避免数据丢失；
4. 插入NULL值时切勿加单引号，否则会被识别为字符串“NULL”，而非真正的空值；
5. 配置文件修改后需重启对应服务（如MySQL、Apache），否则配置不生效。