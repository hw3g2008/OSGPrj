# Rules 代码规范

本文档定义 `.claude/project/rules/` 目录下的代码规范文件内容。

---

## 目录结构

```
.claude/project/rules/
├── java.md            # Java 代码规范
├── vue.md             # Vue 代码规范
└── sql.md             # SQL 代码规范
```

---

## 1. java.md

```markdown
# Java 代码规范

## 参考标准

**阿里巴巴 Java 开发手册**
- 仓库: https://github.com/alibaba/p3c
- 版本: 嵩山版

## 命名规范

### 类名
- 使用 **UpperCamelCase** 风格
- 抽象类使用 `Abstract` 或 `Base` 前缀
- 异常类使用 `Exception` 后缀
- 测试类使用 `Test` 后缀

```java
// ✅ 正确
public class UserService {}
public abstract class AbstractController {}
public class BusinessException extends RuntimeException {}
public class UserServiceTest {}

// ❌ 错误
public class userService {}
public class User_Service {}
```

### 方法名
- 使用 **lowerCamelCase** 风格
- 动词或动宾短语

```java
// ✅ 正确
public User getUserById(Long id);
public void saveUser(User user);
public boolean isValidUser(User user);

// ❌ 错误
public User GetUserById(Long id);
public void user_save(User user);
```

### 常量名
- 使用 **UPPER_SNAKE_CASE** 风格
- 完全大写，下划线分隔

```java
// ✅ 正确
public static final String USER_STATUS_ACTIVE = "1";
public static final int MAX_RETRY_COUNT = 3;

// ❌ 错误
public static final String userStatusActive = "1";
public static final int maxRetryCount = 3;
```

### 变量名
- 使用 **lowerCamelCase** 风格
- 禁止使用单字母变量（循环变量除外）

```java
// ✅ 正确
private String userName;
private List<User> userList;
for (int i = 0; i < size; i++) {}

// ❌ 错误
private String UserName;
private List<User> ul;
String s = "abc";
```

## 代码格式

### 缩进
- 使用 **4 个空格**，禁止使用 Tab

### 行长度
- 单行不超过 **120 字符**

### 大括号
- 左大括号不换行
- 右大括号独占一行

```java
// ✅ 正确
if (condition) {
    doSomething();
}

// ❌ 错误
if (condition)
{
    doSomething();
}
```

## 注释规范

### 类注释
```java
/**
 * 用户服务实现类
 * 
 * @author xxx
 * @date 2026-02-01
 */
public class UserServiceImpl implements IUserService {
}
```

### 方法注释
```java
/**
 * 根据ID查询用户
 *
 * @param userId 用户ID
 * @return 用户对象，不存在返回 null
 * @throws BusinessException 当参数非法时
 */
public User getUserById(Long userId) {
}
```

## 禁止事项

### 禁止魔法数字
```java
// ❌ 错误
if (user.getStatus() == 1) {}

// ✅ 正确
private static final int STATUS_ACTIVE = 1;
if (user.getStatus() == STATUS_ACTIVE) {}
```

### 禁止 catch 空处理
```java
// ❌ 错误
try {
    doSomething();
} catch (Exception e) {
    // 什么都不做
}

// ✅ 正确
try {
    doSomething();
} catch (Exception e) {
    log.error("操作失败", e);
    throw new BusinessException("操作失败");
}
```

### 禁止使用过时 API
```java
// ❌ 错误
new Date().toLocaleString();

// ✅ 正确
LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
```

## Spring Boot 规范

### Controller
```java
@RestController
@RequestMapping("/system/user")
public class SysUserController extends BaseController {
    
    @Autowired
    private ISysUserService userService;
    
    @GetMapping("/list")
    public TableDataInfo list(SysUser user) {
        startPage();
        List<SysUser> list = userService.selectUserList(user);
        return getDataTable(list);
    }
}
```

### Service
```java
@Service
public class SysUserServiceImpl implements ISysUserService {
    
    @Autowired
    private SysUserMapper userMapper;
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertUser(SysUser user) {
        return userMapper.insertUser(user);
    }
}
```

## 若依项目特定规范

### 分页查询
```java
// 使用 startPage() 开启分页
startPage();
List<SysUser> list = userService.selectUserList(user);
return getDataTable(list);
```

### 返回结果
```java
// 成功
return AjaxResult.success();
return AjaxResult.success(data);

// 失败
return AjaxResult.error("操作失败");
```

### 日志记录
```java
// 使用 @Log 注解记录操作日志
@Log(title = "用户管理", businessType = BusinessType.INSERT)
@PostMapping
public AjaxResult add(@RequestBody SysUser user) {
    return toAjax(userService.insertUser(user));
}
```
```

---

## 2. vue.md

```markdown
# Vue 代码规范

## 参考标准

**Vue 官方风格指南**
- 文档: https://vuejs.org/style-guide/

## 组件命名

### 文件名
- 使用 **PascalCase** 或 **kebab-case**
- 推荐 PascalCase

```
✅ 正确
UserList.vue
UserDetail.vue

✅ 也可以
user-list.vue
user-detail.vue

❌ 错误
userlist.vue
user_list.vue
```

### 组件名
- 使用 **PascalCase**
- 多单词命名，避免与 HTML 元素冲突

```javascript
// ✅ 正确
export default {
  name: 'UserList'
}

// ❌ 错误
export default {
  name: 'userList'
}
export default {
  name: 'List'  // 太通用
}
```

## Props 规范

### 定义
- 使用对象形式定义
- 指定类型、默认值、是否必填

```javascript
// ✅ 正确
props: {
  userId: {
    type: Number,
    required: true
  },
  userName: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  }
}

// ❌ 错误
props: ['userId', 'userName']
```

### 命名
- 使用 **camelCase**

```javascript
// ✅ 正确
props: {
  greetingText: String
}

// ❌ 错误
props: {
  'greeting-text': String
}
```

## Data 规范

- 必须是函数
- 返回新对象

```javascript
// ✅ 正确
data() {
  return {
    userList: [],
    loading: false
  }
}

// ❌ 错误
data: {
  userList: []
}
```

## Methods 规范

### 命名
- 使用 **camelCase**
- 动词开头

```javascript
// ✅ 正确
methods: {
  getUserList() {},
  handleClick() {},
  submitForm() {},
  resetQuery() {}
}

// ❌ 错误
methods: {
  user_list() {},
  click() {}
}
```

### 事件处理
- 使用 `handle` 前缀

```javascript
// ✅ 正确
methods: {
  handleAdd() {},
  handleEdit(row) {},
  handleDelete(row) {},
  handleExport() {}
}
```

## 模板规范

### v-for
- 必须加 `:key`
- key 使用唯一标识

```html
<!-- ✅ 正确 -->
<div v-for="item in list" :key="item.id">
  {{ item.name }}
</div>

<!-- ❌ 错误 -->
<div v-for="item in list">
  {{ item.name }}
</div>

<!-- ❌ 错误：使用 index 作为 key -->
<div v-for="(item, index) in list" :key="index">
  {{ item.name }}
</div>
```

### v-if 和 v-for
- 禁止同时使用

```html
<!-- ❌ 错误 -->
<div v-for="item in list" v-if="item.isActive" :key="item.id">
  {{ item.name }}
</div>

<!-- ✅ 正确：使用计算属性过滤 -->
<div v-for="item in activeList" :key="item.id">
  {{ item.name }}
</div>

<script>
computed: {
  activeList() {
    return this.list.filter(item => item.isActive)
  }
}
</script>
```

## 样式规范

### Scoped
- 组件样式使用 `scoped`

```vue
<style scoped>
.user-list {
  padding: 20px;
}
</style>
```

### 类名
- 使用 **kebab-case**

```css
/* ✅ 正确 */
.user-list {}
.list-item {}

/* ❌ 错误 */
.userList {}
.list_item {}
```

## 若依 UI 特定规范

### API 调用
```javascript
import { listUser, addUser, updateUser, delUser } from '@/api/system/user'

methods: {
  getList() {
    this.loading = true
    listUser(this.queryParams).then(response => {
      this.userList = response.rows
      this.total = response.total
      this.loading = false
    })
  }
}
```

### 表格操作
```javascript
// 单行操作
handleUpdate(row) {
  this.reset()
  const userId = row.userId
  getUser(userId).then(response => {
    this.form = response.data
    this.open = true
    this.title = '修改用户'
  })
}

// 批量操作
handleDelete(row) {
  const userIds = row.userId || this.ids
  this.$modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？').then(() => {
    return delUser(userIds)
  }).then(() => {
    this.getList()
    this.$modal.msgSuccess('删除成功')
  })
}
```

### 表单重置
```javascript
reset() {
  this.form = {
    userId: undefined,
    userName: undefined,
    nickName: undefined,
    // ... 其他字段
  }
  this.resetForm('form')
}
```
```

---

## 3. sql.md

```markdown
# SQL 代码规范

## 表设计规范

### 命名
- 表名使用 **小写下划线** 风格
- 使用业务前缀区分模块

```sql
-- ✅ 正确
sys_user
sys_role
sys_dept

-- ❌ 错误
SysUser
sysuser
sys-user
```

### 字段命名
- 使用 **小写下划线** 风格
- 避免使用保留字

```sql
-- ✅ 正确
user_id
user_name
create_time

-- ❌ 错误
userId
UserName
```

### 主键
- 统一使用 `id` 或 `{表名}_id`
- 类型使用 `bigint`

```sql
-- ✅ 推荐
user_id bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID'
PRIMARY KEY (user_id)
```

### 必备字段
每个表必须包含：

```sql
create_by   varchar(64)  DEFAULT ''  COMMENT '创建者',
create_time datetime     DEFAULT NULL COMMENT '创建时间',
update_by   varchar(64)  DEFAULT ''  COMMENT '更新者',
update_time datetime     DEFAULT NULL COMMENT '更新时间',
remark      varchar(500) DEFAULT NULL COMMENT '备注'
```

### 删除标记
- 使用软删除

```sql
del_flag char(1) DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）'
```

## 查询规范

### SELECT
- 禁止使用 `SELECT *`
- 明确列出需要的字段

```sql
-- ❌ 错误
SELECT * FROM sys_user

-- ✅ 正确
SELECT user_id, user_name, nick_name, email 
FROM sys_user
```

### WHERE
- 注意字段顺序（遵循索引）
- 避免在 WHERE 中使用函数

```sql
-- ❌ 错误（无法使用索引）
SELECT * FROM sys_user WHERE YEAR(create_time) = 2026

-- ✅ 正确
SELECT user_id, user_name FROM sys_user 
WHERE create_time >= '2026-01-01' AND create_time < '2027-01-01'
```

### JOIN
- 明确指定 JOIN 类型
- 使用表别名

```sql
-- ✅ 正确
SELECT u.user_name, r.role_name
FROM sys_user u
LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
LEFT JOIN sys_role r ON ur.role_id = r.role_id
WHERE u.del_flag = '0'
```

### 分页
- 使用 LIMIT 分页
- 大数据量使用游标分页

```sql
-- 小数据量
SELECT user_id, user_name FROM sys_user
ORDER BY user_id
LIMIT 0, 10

-- 大数据量（游标分页）
SELECT user_id, user_name FROM sys_user
WHERE user_id > #{lastId}
ORDER BY user_id
LIMIT 10
```

## 索引规范

### 命名
```sql
-- 主键索引
PRIMARY KEY (user_id)

-- 唯一索引
UNIQUE INDEX idx_user_name (user_name)

-- 普通索引
INDEX idx_dept_id (dept_id)

-- 联合索引
INDEX idx_status_create_time (status, create_time)
```

### 原则
1. 区分度高的字段放前面
2. 最左前缀原则
3. 不超过 5 个字段
4. 避免冗余索引

## 禁止事项

### 禁止大事务
```sql
-- ❌ 错误：一次更新大量数据
UPDATE sys_user SET status = '1' WHERE dept_id = 100

-- ✅ 正确：分批更新
UPDATE sys_user SET status = '1' 
WHERE dept_id = 100 
LIMIT 1000
```

### 禁止 DELETE 不带 WHERE
```sql
-- ❌ 错误
DELETE FROM sys_user

-- ✅ 正确
DELETE FROM sys_user WHERE user_id = 1
```

### 禁止 TRUNCATE
```sql
-- ❌ 错误
TRUNCATE TABLE sys_user

-- ✅ 正确：使用软删除
UPDATE sys_user SET del_flag = '2'
```

## MyBatis 规范

### Mapper XML
```xml
<mapper namespace="com.ruoyi.system.mapper.SysUserMapper">
    
    <resultMap id="SysUserResult" type="SysUser">
        <id     property="userId"     column="user_id"     />
        <result property="userName"   column="user_name"   />
        <result property="nickName"   column="nick_name"   />
    </resultMap>
    
    <sql id="selectUserVo">
        select user_id, user_name, nick_name, email, phonenumber
        from sys_user
    </sql>
    
    <select id="selectUserList" parameterType="SysUser" resultMap="SysUserResult">
        <include refid="selectUserVo"/>
        <where>
            <if test="userName != null and userName != ''">
                AND user_name like concat('%', #{userName}, '%')
            </if>
            <if test="status != null and status != ''">
                AND status = #{status}
            </if>
        </where>
    </select>
    
</mapper>
```

### 参数处理
```xml
<!-- 使用 #{} 防止 SQL 注入 -->
<select id="selectUserById" resultMap="SysUserResult">
    select * from sys_user where user_id = #{userId}
</select>

<!-- ❌ 错误：使用 ${} 有 SQL 注入风险 -->
<select id="selectUserById" resultMap="SysUserResult">
    select * from sys_user where user_id = ${userId}
</select>
```
```

---

## 如何使用规范文件

### 在 Agent 中加载

```yaml
# .claude/project/agents/backend-java.md
---
name: backend-java
extends: developer
skills: deliver-ticket, tdd, checkpoint-manager
rules: java    # 加载 java.md 规范
---
```

### 在 Ticket 执行时

deliver-ticket skill 会自动：
1. 读取 Agent 的 rules 配置
2. 加载对应的规范文件
3. 在代码实现时遵循规范
4. lint 检查时验证规范

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [23_Agent_Developer](23_Agent_Developer.md) - 开发者 Agent
- [12_Skills_质量](12_Skills_质量.md) - 代码质量 Skills
