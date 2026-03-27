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
  getInfo: () => Promise<{ user: unknown }>
  setToken: (token: string) => void
  setUser: (user: unknown) => void
  push: (target: string) => Promise<unknown> | unknown
  notifySuccess: (message: string) => void
}

export function validateLoginForm(formState: LoginFormState): LoginFieldErrors {
  const username = formState.username.trim()

  return {
    username: username ? '' : '请输入用户名',
    password: formState.password ? '' : '请输入密码'
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
    deps.setUser(userData.user)

    deps.notifySuccess('登录成功')
    await deps.push(resolveLoginRedirect(redirect))

    return { ok: true, loginError: '' }
  } catch (error) {
    const loginError = error instanceof Error ? error.message : '用户名或密码错误'

    return {
      ok: false,
      loginError
    }
  }
}
