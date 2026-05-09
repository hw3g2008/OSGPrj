const TOKEN_KEY = 'osg_token'
const USER_KEY = 'osg_user'
const MUST_CHANGE_PWD_KEY = 'osg_must_change_pwd'

// Token 管理
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// 用户信息管理
export function getUser<T = any>(): T | null {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setUser(user: any): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY)
}

// 强制改密标志
export function getMustChangePwd(): boolean {
  return localStorage.getItem(MUST_CHANGE_PWD_KEY) === '1'
}

export function setMustChangePwd(value: boolean): void {
  if (value) {
    localStorage.setItem(MUST_CHANGE_PWD_KEY, '1')
  } else {
    localStorage.removeItem(MUST_CHANGE_PWD_KEY)
  }
}

// 清除所有登录信息
export function clearAuth(): void {
  removeToken()
  removeUser()
  setMustChangePwd(false)
}
