# M6 / B-02 ForgotPasswordFlow Quick Assessment

**日期**：2026-04-26  
**状态**：⏳ 待启动（无阻塞）  
**触发**：`2026-04-26-three-ends-overall-extraction-survey.md` §4 第 1 批

---

## 1. 范围（5 端 V1）

按 V1 业务边界（memory `2c14519e`），5 端登录模块均含"忘记密码"功能：

| 端 | 文件 | 行数 | 实现形态 |
|---|---|---:|---|
| admin | `admin/src/views/forgot-password/index.vue` | 待核 | 独立 page |
| **assistant** | `assistant/src/views/forgot-password/index.vue` | 791 | 独立 page（拟为 SSOT） |
| **mentor** | `mentor/src/views/forgot-password/index.vue` | 259 | 独立 page（含密码强度） |
| **lead-mentor** | `lead-mentor/src/views/login/index.vue:80-258` | 内嵌 ~178 | **modal 嵌入 login 页** |
| student | `student/src/views/forgot-password/index.vue` | 待核 | 独立 page |

**改造对象端**：5 端齐全（含 admin/student，因为 B-02 是"原子流程组件"，5 端业务流一致）。

---

## 2. 共性快速估算（极高）

### 2.1 业务流 100% 同构

5 端均为 4 步：

```
Step 1: 输入注册邮箱 → 发送验证码
Step 2: 输入 6 位验证码 → 验证 + 倒计时重发
Step 3: 设置新密码 + 确认密码 → 重置
Step 4: 显示成功 → 返回登录
```

实测：
- **asst** 在 line 25-29 用 step-dot 1/2/3 + line 40/61/97 三个 step-content
- **mentor** 在 line 20-22 用 v-for="i in 3" step-dot + line 28/47/68/110 四步（含 success view）
- **LM** 在 line 124-130 用 step-dot + line 137/164/204/246 四步（modal 内）

### 2.2 字段命名一致

| 字段 | asst | mentor | LM |
|---|---|---|---|
| email | `step1Form.email` | `email` | `forgotPasswordForm.email` |
| code | `step2Form.code` | `code` | `forgotPasswordForm.code` |
| newPassword | `step3Form.newPassword` | `newPwd` | `forgotPasswordForm.newPassword` |
| confirmPassword | (line 120+) | `confirmPwd` | `forgotPasswordForm.confirmPassword` |

字段语义一致，命名差异仅命名风格。

### 2.3 共性覆盖率估算

按行数：
- 业务逻辑（state machine + form + countdown + send/verify/reset）：~200 行 / 端
- 模板（4 步骨架 + 3 个 form-group + 4 个 button）：~150 行 / 端
- 样式（login-page / form-input / step-dot 等）：~100 行 / 端

**估算共性覆盖率：70-80%**（按 roadmap §5.1.2 → "全量抽 + props 注入差异"档）

---

## 3. 抽取方案

### 3.1 候选资产清单

| ID | 名称 | 类型 | 估算行数 |
|---|---|---|---:|
| **C-04** | `useForgotPasswordFlow.ts` | composable | ~150 |
| **B-02** | `ForgotPasswordFlow.vue` | 业务片段组件 | ~300 |

### 3.2 useForgotPasswordFlow.ts API 草案

```ts
export interface ForgotPasswordFlowOptions {
  /** API 端点（5 端可能各有不同） */
  endpoints: {
    sendCode: (email: string) => Promise<void>
    verifyCode: (email: string, code: string) => Promise<void>
    resetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  }
  /** 倒计时秒数（默认 60） */
  countdownSeconds?: number
  /** 密码最小长度（默认 8） */
  minPasswordLength?: number
}

export function useForgotPasswordFlow(options: ForgotPasswordFlowOptions) {
  const currentStep = ref<1 | 2 | 3 | 4>(1)
  const email = ref('')
  const code = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  
  const errors = reactive({ email: '', code: '', newPassword: '', confirmPassword: '' })
  const loading = reactive({ send: false, verify: false, reset: false })
  
  const countdown = ref(0)              // 重发倒计时
  const maskedEmail = computed(() => maskEmail(email.value))
  const passwordStrength = computed(() => evaluateStrength(newPassword.value))
  
  async function handleSendCode() { /* ... */ }
  async function handleVerifyCode() { /* ... */ }
  async function handleResetPassword() { /* ... */ }
  
  return {
    currentStep, email, code, newPassword, confirmPassword,
    errors, loading, countdown, maskedEmail, passwordStrength,
    handleSendCode, handleVerifyCode, handleResetPassword,
  }
}
```

### 3.3 ForgotPasswordFlow.vue Props 草案

```ts
interface Props {
  /** API endpoints（必填，由各端注入） */
  endpoints: ForgotPasswordFlowOptions['endpoints']
  /** 标题 */
  title?: string                    // 默认 '重置密码'
  /** 副标题 */
  subtitle?: string                 // 默认按 currentStep 切换
  /** 返回登录按钮的 router-link to */
  loginRoute?: string               // 默认 '/login'
  /** 是否在 modal 内嵌（LM 模式） */
  inModal?: boolean                 // 默认 false
  /** 自定义品牌 logo（5 端 logo 不同） */
  logoText?: string                 // 默认 'OSG'
  /** 是否显示密码强度提示 */
  showPasswordStrength?: boolean    // 默认 true
}

interface Emits {
  /** 流程完成（Step 4 成功） */
  (e: 'completed'): void
  /** modal 关闭（仅 inModal 模式） */
  (e: 'close'): void
}

// slots:
// #brand 自定义左侧品牌区域
// #beforeForm 表单顶部插入内容
```

---

## 4. 工作量分解

| 阶段 | 任务 | 工作量 |
|---|---|---:|
| **Step 0** | 写本文档 + 用户审阅 | ✅ 完成 |
| **Step 1** | 抽 `useForgotPasswordFlow.ts` + 单测（≥ 15 case：状态机/表单校验/密码强度/倒计时） | 0.5 天 |
| **Step 2** | 抽 `ForgotPasswordFlow.vue` + 视觉与 SSOT (asst) 对齐 + snapshot 测试 | 0.5 天 |
| **Step 3** | Asst 端接入（SSOT 验证）+ 浏览器实拍 | 0.3 天 |
| **Step 4** | Mentor 端接入（注入密码强度 + 4 步流程） | 0.3 天 |
| **Step 5** | LM 端接入（inModal=true 模式 + 注入到 login 内嵌） | 0.5 天 |
| **Step 6**（可选） | Admin 端接入 | 0.2 天 |
| **Step 7**（可选） | Student 端接入 | 0.2 天 |
| **总计 3 端必做** | | **2-2.5 天** |
| **总计 5 端全做** | | **3 天** |

---

## 5. 净瘦身估算

| 端 | 当前行数 | 接入后行数 | 净瘦身 |
|---|---:|---:|---:|
| asst | 791 | ~50（仅注入 endpoints + 渲染 `<ForgotPasswordFlow>`） | −741 |
| mentor | 259 | ~50 | −209 |
| LM | 178（modal 部分） | ~30（仅 modal 包装 + `<ForgotPasswordFlow inModal>`） | −148 |
| **3 端必做** | **1228** | **130** | **−1098** |
| 加 admin/student（5 端） | + 待核 | — | **预计 −1500 行** |

---

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 5 端 API endpoint 路径不同 | props 注入 endpoints，组件不感知 |
| LM 是 modal 内嵌，asst/mentor 是独立 page | `inModal` prop 切换外壳样式（modal 容器 vs login-page 容器） |
| mentor 有密码强度提示，其他端可能没 | `showPasswordStrength` prop 控制 |
| 5 端 logo / 文案不同 | `logoText` prop + `#brand` slot |
| 各端 toast / message 系统可能不同（asst antd / 旧端自实现） | composable 不直接调 message，由父组件捕获 emit 自处理 |
| 5 端样式 base 不同（login-page / login-decor 等） | shared 组件**只负责右侧 box 内容**，左侧品牌区由各端自己渲染（slot #brand） |

---

## 7. 验收标准

### 7.1 单元测试（Step 1 + Step 2）

- `useForgotPasswordFlow.spec.ts` ≥ 15 cases
- `ForgotPasswordFlow.spec.ts` snapshot + 5 个交互 case

### 7.2 集成测试（Step 3-7）

- 各端进入忘记密码 → 完整跑通 4 步流程 → 浏览器实拍对比 SSOT (asst)
- 倒计时正常、重发可点
- 密码强度提示（仅 mentor 启用，其他端禁用）

### 7.3 全量回归

- 5 端 typecheck + lint 全部通过
- 5 端 unit tests 全部通过

---

## 8. 启动入口

按 RPIV 流程：

1. 用户审批本文档
2. `/brainstorm forgot-password` 需求分析
3. `/split-story M6` 拆 Story
4. `/split-ticket S-xxx` 拆 Ticket（每个 2-5 分钟）
5. `/next` 循环执行

或独立 ticket 模式（不挂 milestone）：直接按 §4 工作量分解动手实施。

---

## 9. 状态

⏳ Quick assessment 完成，等用户决策启动方式。
