import { http } from '../utils/request'
import type { LoginParams, LoginResult, UserInfo } from '../types'

// 登录
export function login(data: LoginParams): Promise<LoginResult> {
  return http.post('/auth/login', data)
}

// 登出
export function logout(): Promise<void> {
  return http.post('/auth/logout')
}

// 获取当前用户信息
export function getUserInfo(): Promise<UserInfo> {
  return http.get('/auth/info')
}

// 刷新 Token
export function refreshToken(): Promise<LoginResult> {
  return http.post('/auth/refresh')
}
