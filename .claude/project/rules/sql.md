# SQL 代码规范

## 命名规范

### 表名

- 使用小写下划线命名
- 业务前缀：`sys_`（系统）、`biz_`（业务）
- 示例：`sys_user`、`biz_order`

### 字段名

- 使用小写下划线命名
- 主键：`id`
- 外键：`xxx_id`
- 状态：`status`
- 时间：`xxx_time` 或 `xxx_at`

### 索引名

- 普通索引：`idx_表名_字段名`
- 唯一索引：`uk_表名_字段名`
- 主键：`pk_表名`

## 必备字段

```sql
CREATE TABLE xxx (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    -- 业务字段
    create_by VARCHAR(64) COMMENT '创建者',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by VARCHAR(64) COMMENT '更新者',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag CHAR(1) DEFAULT '0' COMMENT '删除标志（0存在 1删除）',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='xxx表';
```

## SQL 编写规范

### SELECT

```sql
SELECT 
    u.id,
    u.user_name,
    d.dept_name
FROM sys_user u
LEFT JOIN sys_dept d ON u.dept_id = d.id
WHERE u.status = '0'
    AND u.del_flag = '0'
ORDER BY u.create_time DESC
LIMIT 10, 20;
```

### INSERT

```sql
INSERT INTO sys_user (user_name, nick_name, email)
VALUES ('admin', '管理员', 'admin@example.com');
```

### UPDATE

```sql
UPDATE sys_user
SET nick_name = '新昵称',
    update_by = 'admin',
    update_time = NOW()
WHERE id = 1;
```

## 禁止事项

- 禁止 `SELECT *`
- 禁止无 WHERE 的 UPDATE/DELETE
- 禁止在循环中执行 SQL
- 禁止使用存储过程
