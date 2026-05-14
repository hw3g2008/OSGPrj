/**
 * 忘记密码 / 重置密码 流程的纯函数工具集
 *
 * SSOT：迁移自 assistant/src/views/forgot-password/forgot-password-workflow.ts
 * 5 端业务流一致：发送验证码 → 验证 → 重置 → 成功
 *
 * 用法：
 *   import {
 *     maskForgotPasswordEmail,
 *     getForgotPasswordStepDescription,
 *     getForgotPasswordResendMeta,
 *     getPasswordStrengthMeta,
 *     validateForgotPasswordCode,
 *     validateForgotPasswordConfirmation,
 *     validateForgotPasswordPassword,
 *   } from '@osg/shared/utils/forgotPasswordHelpers'
 */
import { i18n } from '../i18n'

/**
 * 将邮箱地址打码显示（保留首字母 + 域名）
 *
 * 例：
 * - 'alice@osg.local' → 'a***@osg.local'
 * - '' → ''
 * - 'invalid' → 'invalid'（无 @ 时原样返回）
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
 * 按当前 step 返回流程引导文案
 *
 * Step 1: 输入邮箱 / Step 2: 输入验证码 / Step 3: 设置新密码 / Step 4: 完成
 */
export function getForgotPasswordStepDescription(step: number): string {
  const stepMap: Record<number, string> = {
    1: i18n.global.t('please_enter_the_email_address_you_used_'),
    2: i18n.global.t('please_enter_the_verification_code'),
    3: i18n.global.t('please_set_your_new_password_2'),
    4: '',
  }

  return stepMap[step] ?? ''
}

/**
 * 重发按钮的显示状态
 *
 * @param countdown 剩余倒计时秒数
 * @returns disabled + 文案（'30s' 或 '重新发送'）
 */
export function getForgotPasswordResendMeta(countdown: number): {
  disabled: boolean
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
    label: i18n.global.t('resend'),
  }
}

/**
 * 评估密码强度（弱 / 中 / 强）
 *
 * 评分规则（每条 +1）：
 * - 长度 ≥ 8
 * - 含字母
 * - 含数字
 *
 * 总分映射：
 * - score=0 (空) → '密码强度' (无 className)
 * - score≤1 → 弱（strength-weak）
 * - score=2 → 中（strength-medium）
 * - score=3 → 强（strength-strong）
 */
export function getPasswordStrengthMeta(password: string): {
  className: string
  text: string
} {
  if (!password) {
    return {
      className: '',
      text: i18n.global.t('password_strength'),
    }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-zA-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1

  if (score <= 1) {
    return {
      className: 'strength-weak',
      text: '弱',
    }
  }

  if (score === 2) {
    return {
      className: 'strength-medium',
      text: '中',
    }
  }

  return {
    className: 'strength-strong',
    text: '强',
  }
}

/**
 * 验证码格式校验：必须是 6 位
 *
 * @returns 错误文案（空字符串表示通过）
 */
export function validateForgotPasswordCode(code: string): string {
  return code.trim().length === 6 ? '' : i18n.global.t('please_enter_the_6_digit_verification_co_2')
}

/**
 * 二次密码确认校验：与首次输入一致
 *
 * @returns 错误文案（空字符串表示通过 / confirmPassword 为空时跳过）
 */
export function validateForgotPasswordConfirmation(
  newPassword: string,
  confirmPassword: string,
): string {
  if (confirmPassword && newPassword !== confirmPassword) {
    return i18n.global.t('the_passwords_entered_twice_are_inconsis')
  }

  return ''
}

/**
 * 新密码格式校验：长度 8-20 + 含字母 + 含数字
 *
 * @returns 错误文案（空字符串表示通过）
 */
export function validateForgotPasswordPassword(password: string): string {
  if (!password) {
    return i18n.global.t('please_enter_new_password')
  }

  if (password.length < 8 || password.length > 20) {
    return i18n.global.t('password_must_be_8_20_characters_2')
  }

  if (!/[a-zA-Z]/.test(password)) {
    return i18n.global.t('password_must_contain_letters')
  }

  if (!/[0-9]/.test(password)) {
    return i18n.global.t('password_must_contain_numbers')
  }

  return ''
}

/**
 * 邮箱格式校验（基础正则）
 *
 * 与 asst views/forgot-password/index.vue 中 validEmail 等价。
 */
export function validateForgotPasswordEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
