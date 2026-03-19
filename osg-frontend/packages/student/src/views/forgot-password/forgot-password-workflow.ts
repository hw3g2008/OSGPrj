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

export function getForgotPasswordStepDescription(step: number): string {
  const stepMap: Record<number, string> = {
    1: '请输入您的注册邮箱',
    2: '请输入验证码',
    3: '请设置新密码',
    4: ''
  }

  return stepMap[step] ?? ''
}

export function getForgotPasswordResendMeta(countdown: number): {
  disabled: boolean
  label: string
} {
  if (countdown > 0) {
    return {
      disabled: true,
      label: `${countdown}s`
    }
  }

  return {
    disabled: false,
    label: '重新发送'
  }
}

export function getPasswordStrengthMeta(password: string): {
  className: string
  text: string
} {
  if (!password) {
    return {
      className: '',
      text: '密码强度'
    }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-zA-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1

  if (score <= 1) {
    return {
      className: 'strength-weak',
      text: '弱'
    }
  }

  if (score === 2) {
    return {
      className: 'strength-medium',
      text: '中'
    }
  }

  return {
    className: 'strength-strong',
    text: '强'
  }
}

export function validateForgotPasswordCode(code: string): string {
  return code.trim().length === 6 ? '' : '请输入6位验证码'
}

export function validateForgotPasswordConfirmation(
  newPassword: string,
  confirmPassword: string
): string {
  if (confirmPassword && newPassword !== confirmPassword) {
    return '两次输入的密码不一致'
  }

  return ''
}

export function validateForgotPasswordPassword(password: string): string {
  if (!password) {
    return '请输入新密码'
  }

  if (password.length < 8 || password.length > 20) {
    return '密码长度需为8-20字符'
  }

  if (!/[a-zA-Z]/.test(password)) {
    return '密码需包含字母'
  }

  if (!/[0-9]/.test(password)) {
    return '密码需包含数字'
  }

  return ''
}
