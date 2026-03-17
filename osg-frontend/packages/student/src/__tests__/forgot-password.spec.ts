import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  getForgotPasswordResendMeta,
  getForgotPasswordStepDescription,
  getPasswordStrengthMeta,
  maskForgotPasswordEmail,
  validateForgotPasswordCode,
  validateForgotPasswordConfirmation,
  validateForgotPasswordPassword
} from '../views/forgot-password/forgot-password-workflow'

const forgotPasswordViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/forgot-password/index.vue'),
  'utf-8'
)

describe('student forgot password workflow', () => {
  describe('maskForgotPasswordEmail', () => {
    it('masks the local part and keeps the full domain', () => {
      expect(maskForgotPasswordEmail('student@example.com')).toBe('s***@example.com')
    })

    it('returns empty string when email is blank', () => {
      expect(maskForgotPasswordEmail('')).toBe('')
    })
  })

  describe('getForgotPasswordStepDescription', () => {
    it('describes the first three steps and clears the success state copy', () => {
      expect(getForgotPasswordStepDescription(1)).toBe('请输入您的注册邮箱')
      expect(getForgotPasswordStepDescription(2)).toBe('请输入验证码')
      expect(getForgotPasswordStepDescription(3)).toBe('请设置新密码')
      expect(getForgotPasswordStepDescription(4)).toBe('')
    })
  })

  describe('getForgotPasswordResendMeta', () => {
    it('keeps resend disabled while the countdown is running', () => {
      expect(getForgotPasswordResendMeta(60)).toEqual({
        disabled: true,
        label: '60s'
      })
    })

    it('enables resend when the countdown reaches zero', () => {
      expect(getForgotPasswordResendMeta(0)).toEqual({
        disabled: false,
        label: '重新发送'
      })
    })
  })

  describe('getPasswordStrengthMeta', () => {
    it('returns the neutral state for an empty password', () => {
      expect(getPasswordStrengthMeta('')).toEqual({
        className: '',
        text: '密码强度'
      })
    })

    it('returns a strong state for a mixed password that meets the prototype threshold', () => {
      expect(getPasswordStrengthMeta('Abcd1234')).toEqual({
        className: 'strength-strong',
        text: '强'
      })
    })
  })

  describe('validators', () => {
    it('requires a full six-digit verification code', () => {
      expect(validateForgotPasswordCode('12345')).toBe('请输入6位验证码')
      expect(validateForgotPasswordCode('123456')).toBe('')
    })

    it('rejects mismatched confirmation passwords', () => {
      expect(validateForgotPasswordConfirmation('secret123', 'secret999')).toBe('两次输入的密码不一致')
      expect(validateForgotPasswordConfirmation('secret123', 'secret123')).toBe('')
    })

    it('matches the shared backend password rules before submit', () => {
      expect(validateForgotPasswordPassword('')).toBe('请输入新密码')
      expect(validateForgotPasswordPassword('short1')).toBe('密码长度需为8-20字符')
      expect(validateForgotPasswordPassword('12345678')).toBe('密码需包含字母')
      expect(validateForgotPasswordPassword('Password')).toBe('密码需包含数字')
      expect(validateForgotPasswordPassword('VeryLongPassword123456789')).toBe('密码长度需为8-20字符')
      expect(validateForgotPasswordPassword('Abcd1234')).toBe('')
    })
  })

  describe('forgot password page source contract', () => {
    it('keeps the progress ids and send-code controls required by the current prototype contract', () => {
      expect(forgotPasswordViewSource).toContain('id="step-1"')
      expect(forgotPasswordViewSource).toContain('id="send-btn"')
      expect(forgotPasswordViewSource).toContain('id="fp-resend-btn"')
    })

    it('keeps the shared login-page anchor and success return link', () => {
      expect(forgotPasswordViewSource).toContain('class="forgot-page login-page"')
      expect(forgotPasswordViewSource).toContain('to="/login"')
    })

    it('keeps the prototype native reset shell instead of the Ant form shell', () => {
      expect(forgotPasswordViewSource).toContain('class="login-logo-icon"')
      expect(forgotPasswordViewSource).toContain('class="form-group"')
      expect(forgotPasswordViewSource).toContain('class="form-input"')
      expect(forgotPasswordViewSource).toContain('class="btn-code"')
      expect(forgotPasswordViewSource).not.toContain('<a-form')
    })

    it('wires the real password reset APIs instead of local-only delay mocks', () => {
      expect(forgotPasswordViewSource).toContain('sendResetCode')
      expect(forgotPasswordViewSource).toContain('verifyResetCode')
      expect(forgotPasswordViewSource).toContain('resetPassword')
      expect(forgotPasswordViewSource).toContain('validateForgotPasswordPassword')
    })
  })
})
