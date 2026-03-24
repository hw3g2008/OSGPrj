import { http } from '../utils/request'
import type { LoginParams, UserInfo } from '../types'

const PUBLIC_AUTH_REQUEST = {
  skipErrorMessage: true,
  skipAuthRedirect: true,
} as const

export function login(data: LoginParams): Promise<{ token: string }> {
  return http.post('/login', data)
}

export function leadMentorLogin(data: LoginParams): Promise<{ token: string }> {
  return http.post('/lead-mentor/login', data, PUBLIC_AUTH_REQUEST)
}

export function assistantLogin(data: LoginParams): Promise<{ token: string }> {
  return http.post('/assistant/login', data, PUBLIC_AUTH_REQUEST)
}

export function studentLogin(data: LoginParams): Promise<{ token: string }> {
  return http.post('/student/login', data)
}

export function logout(): Promise<void> {
  return http.post('/logout')
}

export function getInfo(): Promise<{
  user: UserInfo
  roles: string[]
  permissions: string[]
  firstLogin: boolean
}> {
  return http.get('/getInfo')
}

export function getLeadMentorInfo(): Promise<{
  user: UserInfo
  roles: string[]
  permissions: string[]
}> {
  return http.get('/lead-mentor/getInfo')
}

export function getAssistantInfo(): Promise<{
  user: UserInfo
  roles: string[]
  permissions: string[]
}> {
  return http.get('/assistant/getInfo')
}

export const getUserInfo = getInfo

export function getRouters(): Promise<any[]> {
  return http.get('/getRouters')
}

export function getCaptchaImage(): Promise<{
  captchaEnabled: boolean
  uuid?: string
  img?: string
}> {
  return http.get('/captchaImage')
}
