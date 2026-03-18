import { http } from '@osg/shared/utils/request'

export function login(data: { username: string; password: string }) {
  return http.post<{ token: string }>('/login', data)
}

export function getInfo() {
  return http.get<{ user: any; roles: string[]; permissions: string[] }>('/getInfo')
}

export function logout() {
  return http.post('/logout')
}

export function sendResetCode(email: string) {
  return http.post('/api/mentor/forgot-password/send-code', { email })
}

export function verifyResetCode(email: string, code: string) {
  return http.post('/api/mentor/forgot-password/verify-code', { email, code })
}

export function resetPassword(email: string, code: string, password: string) {
  return http.post('/api/mentor/forgot-password/reset', { email, code, password })
}
