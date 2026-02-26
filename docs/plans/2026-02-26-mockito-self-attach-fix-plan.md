# Mockito Self-Attach Warning Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 消除/规避 `Mockito self-attaching` 带来的未来 JDK 兼容风险，并明确 POM 修改边界。

**Architecture:** 采用“父 POM 统一配置 + 模块继承”的方式处理测试运行参数，避免在每个子模块重复配置。仅在存在模块级特例时再做局部覆盖。`.claude` 工作流层不做根因修复，只保留校验职责。

**Tech Stack:** Maven multi-module, Spring Boot Starter Test, Mockito 5, Surefire

---

## 结论先行（你关心的点）

- **必改**：`pom.xml`（根父 POM）
- **默认不改**：`ruoyi-admin/pom.xml`、`ruoyi-framework/pom.xml`（除非需要模块级差异）
- **不需要改所有 POM**：其余模块无需改
- **框架层（.claude/.windsurf）不是本问题的根因修复点**：可后续加审计检查，但不是本次必改

---

### Task 1: 基线确认（不改代码）

**Files:**
- Read: `pom.xml`
- Read: `ruoyi-admin/pom.xml`
- Read: `ruoyi-framework/pom.xml`

**Step 1: 确认模块继承关系与测试依赖位置**

Run:
```bash
mvn -pl ruoyi-admin dependency:tree -Dscope=test -Dincludes=org.mockito
```

Expected:
- 能看到 `spring-boot-starter-test -> mockito-core + mockito-junit-jupiter`
- 确认当前 warning 的来源是测试运行期，而不是业务代码

**Step 2: 记录当前风险基线**

Run:
```bash
mvn test -pl ruoyi-admin -am
```

Expected:
- 测试通过，但日志出现 `Mockito is currently self-attaching...`

---

### Task 2: 在根父 POM 统一注入测试运行参数（推荐）

**Files:**
- Modify: `pom.xml`

**Step 1: 添加 surefire 统一配置（父 POM 一处改动，全模块继承）**

在 `pom.xml` 的 `<build><plugins>` 中加入（或合并已有）`maven-surefire-plugin`：

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.2.5</version>
  <configuration>
    <argLine>@{argLine} -XX:+EnableDynamicAgentLoading</argLine>
  </configuration>
</plugin>
```

说明：
- 这是**最小改动**，避免未来 JDK 收紧动态 attach 时直接失败。
- 统一放根 POM，避免 `ruoyi-admin`/`ruoyi-framework` 重复维护。

**Step 2: 运行回归验证**

Run:
```bash
mvn -pl ruoyi-framework -Dtest=SysPasswordServiceTest test
mvn test -pl ruoyi-admin -am
```

Expected:
- 两条命令均 `BUILD SUCCESS`
- 即使还有 warning，也不再是阻断风险（后续可继续收敛）

---

### Task 3: 模块级覆盖策略（仅在必要时启用）

**Files:**
- Optional Modify: `ruoyi-admin/pom.xml`
- Optional Modify: `ruoyi-framework/pom.xml`

**Step 1: 仅在以下场景才做模块级配置**

- 某模块需要不同的 `argLine`
- 某模块测试框架需要独立 JVM 参数

**Step 2: 若无特例，保持模块 POM 不改**

- 由根 `pom.xml` 统一继承即可
- 减少配置漂移与维护成本

---

### Task 4: 可选增强（不是本次必改）

**Files:**
- Keep: `ruoyi-admin/src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`
- Keep: `ruoyi-framework/src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`

**Step 1: 保留现有文件**

- 内容保持 `mock-maker-subclass`
- 作为运行时策略补充

**Step 2: 后续若要“消灭告警文本”再做二期**

- 再评估 `javaagent` 显式注入方案
- 或逐步减少不必要 Mockito 场景（可反射/真实对象替代）

---

## 验收标准

- `pom.xml` 已有 surefire 统一配置
- 不需要改所有子模块 POM
- `mvn -pl ruoyi-framework -Dtest=SysPasswordServiceTest test` 通过
- `mvn test -pl ruoyi-admin -am` 通过
- 文档中明确“框架层不是根因修复点”

## 风险与边界

- `-XX:+EnableDynamicAgentLoading` 是兼容参数，不是业务逻辑变更
- 该方案优先保证 CI 稳定；若追求“零告警”，需要二期专门治理
- 本计划不改 `.claude` 逻辑，仅改项目构建配置

