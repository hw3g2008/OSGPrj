/**
 * 忘记密码 / 重置密码 流程的纯函数工具集
 *
 * SSOT：迁移自 assistant/src/views/forgot-password/forgot-password-workflow.ts
 * 5 端业务流一致：发送验证码 → 验证 → 重置 → 成功
 *
 * i18n: pure helpers return **i18n keys** (not localized strings) so they remain
 * dependency-free and translation happens at the caller via `t(key)`.
 */

export const FORGOT_PASSWORD_I18N = {
  steps: {
    1: 'common.shared.forgotPassword.steps.1',
    2: 'common.shared.forgotPassword.steps.2',
    3: 'common.shared.forgotPassword.steps.3',
  },
  resend: 'common.shared.forgotPassword.resend',
  strength: {
    placeholder: 'common.shared.forgotPassword.strength.placeholder',
    weak: 'common.shared.forgotPassword.strength.weak',
    medium: 'common.shared.forgotPassword.strength.medium',
    strong: 'common.shared.forgotPassword.strength.strong',
  },
  errors: {
    codeLength6: 'common.shared.forgotPassword.errors.codeLength6',
    confirmMismatch: 'common.shared.forgotPassword.errors.confirmMismatch',
    newPasswordEmpty: 'common.shared.forgotPassword.errors.newPasswordEmpty',
    passwordLength: 'common.shared.forgotPassword.errors.passwordLength',
    passwordNeedLetters: 'common.shared.forgotPassword.errors.passwordNeedLetters',
    passwordNeedDigits: 'common.shared.forgotPassword.errors.passwordNeedDigits',
  },
} as const

/**
 * 将邮箱地址打码显示（保留首字母 + 域名）
 */
export function maskForgotPasswordEmail(email: string): string {
  const normalized = email.trim()
  if (!normalized) {
    return ''
  }

  const parts = normalized.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return normalized
  }

  return `${parts[0].charAt(0)}***@${parts[1]}`
}

/**
 * 按当前 step 返回流程引导文案的 i18n key
 *
 * Step 1: 输入邮箱 / Step 2: 输入验证码 / Step 3: 设置新密码 / Step 4: 完成
 * Returns i18n key (or '' for step 4 / unknown).
 */
export function getForgotPasswordStepDescription(step: number): string {
  const stepMap: Record<number, string> = {
    1: FORGOT_PASSWORD_I18N.steps[1],
    2: FORGOT_PASSWORD_I18N.steps[2],
    3: FORGOT_PASSWORD_I18N.steps[3],
    4: '',
  }

  return stepMap[step] ?? ''
}

/**
 * 重发按钮的显示状态。
 *
 * - 倒计时进行中：返回 disabled + 数字 `${countdown}s` 字面量（无需翻译）。
 * - 倒计时结束：返回 enabled + i18n key（caller 用 t() 翻成 "重新发送" / "Resend"）。
 */
export function getForgotPasswordResendMeta(countdown: number): {
  disabled: boolean
  /** "30s" 字面量 OR i18n key（如 'common.shared.forgotPassword.resend'）；caller 自行决定是否 t() */
  label: string
} {
  if (countdown > 0) {
    return {
      disabled: true,
      label: `${countdown}s`,
    }
  }

  return {
    disabled: false,
    label: FORGOT_PASSWORD_I18N.resend,
  }
}

/**
 * 评估密码强度（弱 / 中 / 强）；返回 i18n key 作为 text。
 *
 * 评分规则（每条 +1）：
 * - 长度 ≥ 8
 * - 含字母
 * - 含数字
 */
export function getPasswordStrengthMeta(password: string): {
  className: string
  /** i18n key（caller 用 t() 翻译） */
  text: string
} {
  if (!password) {
    return {
      className: '',
      text: FORGOT_PASSWORD_I18N.strength.placeholder,
    }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-zA-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1

  if (score <= 1) {
    return {
      className: 'strength-weak',
      text: FORGOT_PASSWORD_I18N.strength.weak,
    }
  }

  if (score === 2) {
    return {
      className: 'strength-medium',
      text: FORGOT_PASSWORD_I18N.strength.medium,
    }
  }

  return {
    className: 'strength-strong',
    text: FORGOT_PASSWORD_I18N.strength.strong,
  }
}

/**
 * 验证码格式校验：必须是 6 位
 *
 * @returns i18n key（空字符串表示通过）
 */
export function validateForgotPasswordCode(code: string): string {
  return code.trim().length === 6 ? '' : FORGOT_PASSWORD_I18N.errors.codeLength6
}

/**
 * 二次密码确认校验：与首次输入一致
 *
 * @returns i18n key（空字符串表示通过 / confirmPassword 为空时跳过）
 */
export function validateForgotPasswordConfirmation(
  newPassword: string,
  confirmPassword: string,
): string {
  if (confirmPassword && newPassword !== confirmPassword) {
    return FORGOT_PASSWORD_I18N.errors.confirmMismatch
  }

  return ''
}

/**
 * 新密码格式校验：长度 8-20 + 含字母 + 含数字
 *
 * @returns i18n key（空字符串表示通过）
 */
export function validateForgotPasswordPassword(password: string): string {
  if (!password) {
    return FORGOT_PASSWORD_I18N.errors.newPasswordEmpty
  }

  if (password.length < 8 || password.length > 20) {
    return FORGOT_PASSWORD_I18N.errors.passwordLength
  }

  if (!/[a-zA-Z]/.test(password)) {
    return FORGOT_PASSWORD_I18N.errors.passwordNeedLetters
  }

  if (!/[0-9]/.test(password)) {
    return FORGOT_PASSWORD_I18N.errors.passwordNeedDigits
  }

  return ''
}

/**
 * 邮箱格式校验（基础正则）
 */
export function validateForgotPasswordEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
