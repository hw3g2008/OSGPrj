import { http } from '@osg/shared/utils/request'

const PUBLIC_AUTH_REQUEST = {
  skipErrorMessage: true,
  skipAuthRedirect: true
} as const

export function login(data: { username: string; password: string }) {
  return http.post<{ token: string }>('/mentor/login', data, PUBLIC_AUTH_REQUEST)
}

export function getInfo() {
  return http.get<{ user: any; roles: string[]; permissions: string[] }>('/mentor/getInfo')
}

export function logout() {
  return http.post('/logout')
}

export function sendResetCode(email: string) {
  return http.post('/mentor/forgot-password/send-code', { email }, PUBLIC_AUTH_REQUEST)
}

export function verifyResetCode(email: string, code: string) {
  return http.post('/mentor/forgot-password/verify-code', { email, code }, PUBLIC_AUTH_REQUEST)
}

export function resetPassword(email: string, resetToken: string, password: string) {
  return http.post('/mentor/forgot-password/reset', { email, resetToken, password }, PUBLIC_AUTH_REQUEST)
}
