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
} from '@osg/shared/utils/forgotPasswordHelpers'

const forgotPasswordViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/forgot-password/index.vue'),
  'utf-8'
)

// P0.6 之后：shared/forgotPasswordHelpers 已 i18n 化，返回 i18n key 而非中文字面量。
// 本期 W2-batch-1 同步把 student 端 spec 对齐到新契约（断言 key 而非 zh 文本）。
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
    it('returns i18n keys for the first three steps and clears the success state copy', () => {
      expect(getForgotPasswordStepDescription(1)).toBe('common.shared.forgotPassword.steps.1')
      expect(getForgotPasswordStepDescription(2)).toBe('common.shared.forgotPassword.steps.2')
      expect(getForgotPasswordStepDescription(3)).toBe('common.shared.forgotPassword.steps.3')
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

    it('enables resend with an i18n key when the countdown reaches zero', () => {
      expect(getForgotPasswordResendMeta(0)).toEqual({
        disabled: false,
        label: 'common.shared.forgotPassword.resend'
      })
    })
  })

  describe('getPasswordStrengthMeta', () => {
    it('returns the neutral state for an empty password', () => {
      expect(getPasswordStrengthMeta('')).toEqual({
        className: '',
        text: 'common.shared.forgotPassword.strength.placeholder'
      })
    })

    it('returns a strong state for a mixed password that meets the prototype threshold', () => {
      expect(getPasswordStrengthMeta('Abcd1234')).toEqual({
        className: 'strength-strong',
        text: 'common.shared.forgotPassword.strength.strong'
      })
    })
  })

  describe('validators', () => {
    it('requires a full six-digit verification code', () => {
      expect(validateForgotPasswordCode('12345')).toBe('common.shared.forgotPassword.errors.codeLength6')
      expect(validateForgotPasswordCode('123456')).toBe('')
    })

    it('rejects mismatched confirmation passwords', () => {
      expect(validateForgotPasswordConfirmation('secret123', 'secret999')).toBe('common.shared.forgotPassword.errors.confirmMismatch')
      expect(validateForgotPasswordConfirmation('secret123', 'secret123')).toBe('')
    })

    it('matches the shared backend password rules before submit', () => {
      expect(validateForgotPasswordPassword('')).toBe('common.shared.forgotPassword.errors.newPasswordEmpty')
      expect(validateForgotPasswordPassword('short1')).toBe('common.shared.forgotPassword.errors.passwordLength')
      expect(validateForgotPasswordPassword('12345678')).toBe('common.shared.forgotPassword.errors.passwordNeedLetters')
      expect(validateForgotPasswordPassword('Password')).toBe('common.shared.forgotPassword.errors.passwordNeedDigits')
      expect(validateForgotPasswordPassword('VeryLongPassword123456789')).toBe('common.shared.forgotPassword.errors.passwordLength')
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

    // [本期不落地] 原型 native reset shell vs Ant form — 本期用 Ant form
    it.skip('keeps the prototype native reset shell instead of the Ant form shell', () => {
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
      // M6: 业务逻辑迁移到 shared composable，view 不再直接 import 校验函数
      expect(forgotPasswordViewSource).toContain("import { useForgotPasswordFlow } from '@osg/shared/composables'")
    })
  })
})
