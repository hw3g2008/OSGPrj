/**
 * forgotPasswordHelpers unit tests
 *
 * SSOT：迁移自 assistant/src/views/forgot-password/forgot-password-workflow.ts 业务逻辑
 */
import { describe, expect, it } from 'vitest'

import {
  getForgotPasswordResendMeta,
  getForgotPasswordStepDescription,
  getPasswordStrengthMeta,
  maskForgotPasswordEmail,
  validateForgotPasswordCode,
  validateForgotPasswordConfirmation,
  validateForgotPasswordEmail,
  validateForgotPasswordPassword,
} from './forgotPasswordHelpers'

describe('maskForgotPasswordEmail', () => {
  it('1. 正常 email → a***@domain', () => {
    expect(maskForgotPasswordEmail('alice@osg.local')).toBe('a***@osg.local')
  })

  it('2. 含子域名 → 保留全域名', () => {
    expect(maskForgotPasswordEmail('bob@mail.osg.test')).toBe('b***@mail.osg.test')
  })

  it('3. 空字符串 → 空', () => {
    expect(maskForgotPasswordEmail('')).toBe('')
  })

  it('4. 仅空白 → 空', () => {
    expect(maskForgotPasswordEmail('   ')).toBe('')
  })

  it('5. 无 @ → 原样返回', () => {
    expect(maskForgotPasswordEmail('invalid')).toBe('invalid')
  })

  it('6. trim 处理前后空白', () => {
    expect(maskForgotPasswordEmail('  alice@osg.local  ')).toBe('a***@osg.local')
  })

  it('7. 单字符邮箱前缀', () => {
    expect(maskForgotPasswordEmail('a@osg.local')).toBe('a***@osg.local')
  })

  it('8. 多 @ 异常 → 原样返回', () => {
    expect(maskForgotPasswordEmail('a@b@c')).toBe('a@b@c')
  })
})

describe('getForgotPasswordStepDescription', () => {
  it('9. step=1 → 输入邮箱引导', () => {
    expect(getForgotPasswordStepDescription(1)).toBe(
      '请输入您注册时使用的邮箱，我们将发送验证码',
    )
  })

  it('10. step=2 → 输入验证码', () => {
    expect(getForgotPasswordStepDescription(2)).toBe('请输入验证码')
  })

  it('11. step=3 → 设置新密码', () => {
    expect(getForgotPasswordStepDescription(3)).toBe('请设置新密码')
  })

  it('12. step=4 → 空', () => {
    expect(getForgotPasswordStepDescription(4)).toBe('')
  })

  it('13. 未知 step → 空', () => {
    expect(getForgotPasswordStepDescription(99)).toBe('')
  })
})

describe('getForgotPasswordResendMeta', () => {
  it('14. countdown>0 → disabled + Ns 文案', () => {
    expect(getForgotPasswordResendMeta(60)).toEqual({
      disabled: true,
      label: '60s',
    })
    expect(getForgotPasswordResendMeta(1)).toEqual({
      disabled: true,
      label: '1s',
    })
  })

  it('15. countdown=0 → enabled + 重新发送', () => {
    expect(getForgotPasswordResendMeta(0)).toEqual({
      disabled: false,
      label: '重新发送',
    })
  })

  it('16. countdown<0 (异常) → enabled + 重新发送', () => {
    expect(getForgotPasswordResendMeta(-1)).toEqual({
      disabled: false,
      label: '重新发送',
    })
  })
})

describe('getPasswordStrengthMeta', () => {
  it('17. 空 → 默认提示（无 className）', () => {
    expect(getPasswordStrengthMeta('')).toEqual({
      className: '',
      text: '密码强度',
    })
  })

  it('18. 仅长度（无字母无数字）→ 弱', () => {
    expect(getPasswordStrengthMeta('!!!!!!!!')).toEqual({
      className: 'strength-weak',
      text: '弱',
    })
  })

  it('19. 长度+字母（无数字）→ 中', () => {
    expect(getPasswordStrengthMeta('abcdefgh')).toEqual({
      className: 'strength-medium',
      text: '中',
    })
  })

  it('20. 长度+字母+数字 → 强', () => {
    expect(getPasswordStrengthMeta('abc12345')).toEqual({
      className: 'strength-strong',
      text: '强',
    })
  })

  it('21. 短密码 + 字母（score=1）→ 弱', () => {
    expect(getPasswordStrengthMeta('abc')).toEqual({
      className: 'strength-weak',
      text: '弱',
    })
  })

  it('22. 短密码 + 字母 + 数字（score=2）→ 中', () => {
    expect(getPasswordStrengthMeta('a1')).toEqual({
      className: 'strength-medium',
      text: '中',
    })
  })
})

describe('validateForgotPasswordCode', () => {
  it('23. 6 位 → 通过', () => {
    expect(validateForgotPasswordCode('123456')).toBe('')
  })

  it('24. 含空白 6 位 → 通过（trim）', () => {
    expect(validateForgotPasswordCode('  123456  ')).toBe('')
  })

  it('25. 5 位 → 错误', () => {
    expect(validateForgotPasswordCode('12345')).toBe('请输入 6 位验证码')
  })

  it('26. 7 位 → 错误', () => {
    expect(validateForgotPasswordCode('1234567')).toBe('请输入 6 位验证码')
  })

  it('27. 空 → 错误', () => {
    expect(validateForgotPasswordCode('')).toBe('请输入 6 位验证码')
  })
})

describe('validateForgotPasswordConfirmation', () => {
  it('28. 一致 → 通过', () => {
    expect(validateForgotPasswordConfirmation('abc123XX', 'abc123XX')).toBe('')
  })

  it('29. 不一致 → 错误', () => {
    expect(validateForgotPasswordConfirmation('abc123', 'xyz789')).toBe(
      '两次输入的密码不一致',
    )
  })

  it('30. 确认密码为空 → 通过（跳过校验，由 password 校验兜底）', () => {
    expect(validateForgotPasswordConfirmation('abc123', '')).toBe('')
  })
})

describe('validateForgotPasswordPassword', () => {
  it('31. 空 → 请输入新密码', () => {
    expect(validateForgotPasswordPassword('')).toBe('请输入新密码')
  })

  it('32. 长度<8 → 长度错误', () => {
    expect(validateForgotPasswordPassword('abc12')).toBe('密码长度需为 8-20 字符')
  })

  it('33. 长度>20 → 长度错误', () => {
    expect(validateForgotPasswordPassword('a'.repeat(21))).toBe(
      '密码长度需为 8-20 字符',
    )
  })

  it('34. 无字母 → 字母错误', () => {
    expect(validateForgotPasswordPassword('12345678')).toBe('密码需包含字母')
  })

  it('35. 无数字 → 数字错误', () => {
    expect(validateForgotPasswordPassword('abcdefgh')).toBe('密码需包含数字')
  })

  it('36. 长度+字母+数字 → 通过', () => {
    expect(validateForgotPasswordPassword('abc12345')).toBe('')
  })

  it('37. 边界 8 字符 → 通过', () => {
    expect(validateForgotPasswordPassword('abcd1234')).toBe('')
  })

  it('38. 边界 20 字符 → 通过', () => {
    expect(validateForgotPasswordPassword('a1' + 'b'.repeat(18))).toBe('')
  })
})

describe('validateForgotPasswordEmail', () => {
  it('39. 标准 email → true', () => {
    expect(validateForgotPasswordEmail('alice@osg.local')).toBe(true)
  })

  it('40. 子域名 → true', () => {
    expect(validateForgotPasswordEmail('bob@mail.osg.test')).toBe(true)
  })

  it('41. 缺 @ → false', () => {
    expect(validateForgotPasswordEmail('alice')).toBe(false)
  })

  it('42. 缺域名 → false', () => {
    expect(validateForgotPasswordEmail('alice@')).toBe(false)
  })

  it('43. 缺 TLD → false', () => {
    expect(validateForgotPasswordEmail('alice@local')).toBe(false)
  })

  it('44. 含空格 → false', () => {
    expect(validateForgotPasswordEmail('alice @osg.local')).toBe(false)
  })

  it('45. trim 后通过', () => {
    expect(validateForgotPasswordEmail('  alice@osg.local  ')).toBe(true)
  })
})
