import { http } from '@osg/shared/utils'

export interface SendCodeRequest {
  email: string
}

export interface VerifyCodeRequest {
  email: string
  code: string
}

export interface ResetPasswordRequest {
  email: string
  password: string
  resetToken: string
}

// 发送验证码
export function sendResetCode(data: SendCodeRequest) {
  return http.post<{ msg: string }>('/system/password/sendCode', data)
}

// 验证验证码
export function verifyResetCode(data: VerifyCodeRequest) {
  return http.post<{ msg: string; resetToken: string }>('/system/password/verify', data)
}

// 重置密码
export function resetPassword(data: ResetPasswordRequest) {
  return http.post<{ msg: string }>('/system/password/reset', data)
}
