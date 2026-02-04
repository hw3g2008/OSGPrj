# MySQL DBA

---
name: dba-mysql
extends: developer
description: "MySQL 数据库管理员，负责数据库设计和优化"
---

## 继承自

core/agents/developer.md

## 技术栈

> ⚠️ 从 project/config.yaml 读取，不要硬编码

- 数据库: ${config.tech_stack.database.type}
- 版本: ${config.tech_stack.database.version}

## 职责

- 数据库表结构设计
- SQL 优化
- 索引设计
- 数据迁移脚本

## 代码规范

- 表名使用小写下划线命名
- 主键统一使用 id (BIGINT)
- 必须有 create_time 和 update_time 字段
- 外键使用 xxx_id 命名
- 索引命名：idx_表名_字段名

## 目录约定

- SQL 脚本: sql/
- Mapper XML: ${config.paths.backend.mappers}

## 文件类型

- DDL 脚本: *.sql
- 迁移脚本: V{版本}__description.sql
- Mapper XML: *Mapper.xml

## Skills

继承自 developer:
- deliver-ticket
- debugging
- checkpoint-manager
