// TODO(i18n-refactor): 该文件返回的中文校验/通知字符串目前直接绑定到 view 模板，
// 现有 login.spec.ts 也以字面量断言这些字符串。要 i18n 化需重构成 errorCode 或
// 注入 t() 翻译函数，并同步更新 6 处 spec 断言。本期 batch-1 不做改造，留待
// W2 收尾或 P2 review 阶段统一处理。涉及文案：
//   - '请输入邮箱' / '邮箱格式不正确' / '请输入密码'
//   - '登录成功' / '邮箱或密码错误'
export interface LoginFormState {
  username: string
  password: string
}

export interface LoginFieldErrors {
  username: string
  password: string
}

interface LoginDeps {
  login: (payload: LoginFormState) => Promise<{ token: string }>
  getInfo: () => Promise<{
    user: unknown
    mustChangePassword?: boolean
    accountStatus?: string
    blacklisted?: boolean
  }>
  setToken: (token: string) => void
  setUser: (user: unknown) => void
  setMustChangePassword?: (value: boolean) => void
  push: (target: string) => Promise<unknown> | unknown
  notifySuccess: (message: string) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginForm(formState: LoginFormState): LoginFieldErrors {
  const username = formState.username.trim()
  let usernameError = ''
  if (!username) {
    usernameError = t('student.loginWorkflow.k1') // TODO(i18n-refactor)
  } else if (!EMAIL_RE.test(username)) {
    usernameError = t('student.loginWorkflow.k2') // TODO(i18n-refactor)
  }

  return {
    username: usernameError,
    password: formState.password ? '' : t('student.loginWorkflow.k3') // TODO(i18n-refactor)
  }
}

export function hasLoginErrors(fieldErrors: LoginFieldErrors): boolean {
  return Boolean(fieldErrors.username || fieldErrors.password)
}

export function resolveLoginRedirect(redirect?: string): string {
  return redirect && redirect.trim() ? redirect : '/positions'
}

function buildLoginPayload(formState: LoginFormState): LoginFormState {
  return {
    username: formState.username.trim(),
    password: formState.password
  }
}

export async function submitLogin(
  formState: LoginFormState,
  redirect: string | undefined,
  deps: LoginDeps
): Promise<{ ok: true; loginError: '' } | { ok: false; loginError: string }> {
  try {
    const payload = buildLoginPayload(formState)
    const { token } = await deps.login(payload)
    deps.setToken(token)

    const userData = await deps.getInfo()
    // 把 accountStatus / blacklisted 一并塞进 user 对象，路由守卫从 getUser() 直接读取
    const enrichedUser =
      userData.user && typeof userData.user === 'object'
        ? {
            ...(userData.user as Record<string, unknown>),
            accountStatus: userData.accountStatus ?? '0',
            blacklisted: Boolean(userData.blacklisted),
          }
        : userData.user
    deps.setUser(enrichedUser)
    deps.setMustChangePassword?.(Boolean(userData.mustChangePassword))

    deps.notifySuccess(t('student.loginWorkflow.k4')) // TODO(i18n-refactor)
    // 已结束 / 黑名单：跳 lock 页（reason 由路由守卫读取也可，这里登录直跳更直观）
    if (userData.accountStatus === '2') {
      await deps.push('/account-locked?reason=contract_ended')
    } else if (userData.blacklisted) {
      await deps.push('/account-locked?reason=blacklisted')
    } else {
      await deps.push(resolveLoginRedirect(redirect))
    }

    return { ok: true, loginError: '' }
  } catch (error) {
    const loginError = error instanceof Error ? error.message : t('student.loginWorkflow.k5') // TODO(i18n-refactor)

    return {
      ok: false,
      loginError
    }
  }
}
