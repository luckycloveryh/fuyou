---
title: "MySQL 四种常见语言"
date: 2026-06-17T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-network-18/1200/600"
draft: false
tags: ["网络基础", "Obsidian"]
categories: ["网络基础"]
slug: "network-18"
description: "从 Obsidian 导入的 网络基础 学习笔记"
---
MySQL 常见可以分为四类：

| 类型  | 全称                         | 作用             | 常见关键字                      |
| --- | -------------------------- | -------------- | -------------------------- |
| DDL | Data Definition Language   | 数据定义语言，操作库、表结构 | CREATE、ALTER、DROP、TRUNCATE |
| DML | Data Manipulation Language | 数据操作语言，增删改数据   | INSERT、UPDATE、DELETE       |
| DQL | Data Query Language        | 数据查询语言，查询数据    | SELECT                     |
| DCL | Data Control Language      | 数据控制语言，管理权限    | GRANT、REVOKE               |

---

## 一、DDL：数据定义语言

作用：用于操作数据库、表、字段等结构。

常见关键字：

```sql
CREATE
ALTER
DROP
TRUNCATE
```

### 1. 创建数据库

```sql
CREATE DATABASE test_db DEFAULT CHARSET utf8mb4;
```

### 2. 使用数据库

```sql
USE test_db;
```

### 3. 创建表

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    age INT,
    email VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 修改表，增加字段

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### 5. 修改字段类型

```sql
ALTER TABLE users MODIFY COLUMN username VARCHAR(100) NOT NULL;
```

### 6. 删除字段

```sql
ALTER TABLE users DROP COLUMN phone;
```

### 7. 清空表数据，保留表结构

```sql
TRUNCATE TABLE users;
```

### 8. 删除表

```sql
DROP TABLE users;
```

---

## 二、DML：数据操作语言

作用：用于对表中的数据进行新增、修改、删除。

常见关键字：

```sql
INSERT
UPDATE
DELETE
```

### 1. 插入一条数据

```sql
INSERT INTO users (username, age, email)
VALUES ('zhangsan', 20, 'zhangsan@example.com');
```

### 2. 插入多条数据

```sql
INSERT INTO users (username, age, email)
VALUES
('lisi', 22, 'lisi@example.com'),
('wangwu', 25, 'wangwu@example.com');
```

### 3. 修改数据

```sql
UPDATE users
SET age = 23
WHERE username = 'lisi';
```

### 4. 删除数据

```sql
DELETE FROM users
WHERE username = 'wangwu';
```

---

## 三、DQL：数据查询语言

作用：用于查询表中的数据。

常见关键字：

```sql
SELECT
```

### 1. 查询所有字段

```sql
SELECT * FROM users;
```

### 2. 查询指定字段

```sql
SELECT username, age FROM users;
```

### 3. 条件查询

```sql
SELECT * FROM users
WHERE age >= 18;
```

### 4. 模糊查询

```sql
SELECT * FROM users
WHERE username LIKE '%san%';
```

### 5. 排序查询

```sql
SELECT * FROM users
ORDER BY age DESC;
```

### 6. 分页查询

```sql
SELECT * FROM users
LIMIT 0, 10;
```

### 7. 聚合查询

```sql
SELECT COUNT(*) AS total FROM users;
```

### 8. 分组查询

```sql
SELECT age, COUNT(*) AS count
FROM users
GROUP BY age;
```

---

## 四、DCL：数据控制语言

作用：用于管理数据库用户和权限。

常见关键字：

```sql
GRANT
REVOKE
```

### 1. 创建用户

```sql
CREATE USER 'testuser'@'%' IDENTIFIED BY '123456';
```

### 2. 给用户授权

```sql
GRANT ALL PRIVILEGES ON test_db.* TO 'testuser'@'%';
```

### 3. 刷新权限

```sql
FLUSH PRIVILEGES;
```

### 4. 查看用户权限

```sql
SHOW GRANTS FOR 'testuser'@'%';
```

### 5. 回收权限

```sql
REVOKE ALL PRIVILEGES ON test_db.* FROM 'testuser'@'%';
```

### 6. 删除用户

```sql
DROP USER 'testuser'@'%';
```

---

## 五、补充：TCL 事务控制语言

有些教程还会把 MySQL 分成五类，多出来一个 TCL。

TCL：Transaction Control Language，事务控制语言。

常见关键字：

```sql
START TRANSACTION
COMMIT
ROLLBACK
```

### 事务提交示例

```sql
START TRANSACTION;

UPDATE users
SET age = 30
WHERE username = 'zhangsan';

COMMIT;
```

### 事务回滚示例

```sql
START TRANSACTION;

UPDATE users
SET age = 30
WHERE username = 'zhangsan';

ROLLBACK;
```

---

你粘贴的时候注意：**不要把全部内容放进一个大代码块里**。  
正确方式是：标题用 `#`、`##`、`###`，SQL 命令单独用 ```sql 包起来。