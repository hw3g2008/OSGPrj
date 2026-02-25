import { http } from '../utils/request'
import type { LoginParams, UserInfo } from '../types'

// 登录
export function login(data: LoginParams): Promise<{ token: string }> {
  return http.post('/login', data)
}

// 登出
export function logout(): Promise<void> {
  return http.post('/logout')
}

// 获取当前用户信息
export function getInfo(): Promise<{
  user: UserInfo
  roles: string[]
  permissions: string[]
  firstLogin: boolean
}> {
  return http.get('/getInfo')
}

// 获取路由信息
export function getRouters(): Promise<any[]> {
  return http.get('/getRouters')
}

// 获取验证码
export function getCaptchaImage(): Promise<{
  captchaEnabled: boolean
  uuid?: string
  img?: string
}> {
  return http.get('/captchaImage')
}
