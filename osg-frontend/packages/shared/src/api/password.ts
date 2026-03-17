import { http } from '../utils/request'

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

export function sendResetCode(data: SendCodeRequest): Promise<{ code: number; msg: string }> {
  return http.post('/system/password/sendCode', data, { skipErrorMessage: true })
}

export function verifyResetCode(data: VerifyCodeRequest): Promise<{ resetToken: string }> {
  return http.post('/system/password/verify', data, { skipErrorMessage: true })
}

export function resetPassword(data: ResetPasswordRequest): Promise<{ code: number; msg: string }> {
  return http.post('/system/password/reset', data, { skipErrorMessage: true })
}
