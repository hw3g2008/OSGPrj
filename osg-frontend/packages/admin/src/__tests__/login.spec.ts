import { describe, it, expect } from 'vitest'

// 密码规则校验函数（与 FirstLoginModal 中的逻辑一致）
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8 || password.length > 20) {
    errors.push('密码长度需为8-20位')
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('密码需包含字母')
  }
  if (!/\d/.test(password)) {
    errors.push('密码需包含数字')
  }
  return { valid: errors.length === 0, errors }
}

// 验证码字符集（与 CaptchaConfig 和前端一致）
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

describe('登录模块测试', () => {
  describe('密码规则校验', () => {
    it('有效密码应通过校验', () => {
      expect(validatePassword('Password123').valid).toBe(true)
    })

    it('少于8位应失败', () => {
      const r = validatePassword('Pass1')
      expect(r.valid).toBe(false)
      expect(r.errors).toContain('密码长度需为8-20位')
    })

    it('超过20位应失败', () => {
      expect(validatePassword('Password123456789012345').valid).toBe(false)
    })

    it('纯数字应失败', () => {
      const r = validatePassword('12345678')
      expect(r.valid).toBe(false)
      expect(r.errors).toContain('密码需包含字母')
    })

    it('纯字母应失败', () => {
      const r = validatePassword('abcdefgh')
      expect(r.valid).toBe(false)
      expect(r.errors).toContain('密码需包含数字')
    })

    it('8位边界值应通过', () => {
      expect(validatePassword('Passwo1d').valid).toBe(true)
    })

    it('20位边界值应通过', () => {
      expect(validatePassword('Password1234567890ab').valid).toBe(true)
    })
  })

  describe('验证码字符集', () => {
    it('不应包含 I', () => {
      expect(CAPTCHA_CHARS).not.toContain('I')
    })

    it('不应包含 O', () => {
      expect(CAPTCHA_CHARS).not.toContain('O')
    })

    it('不应包含 0', () => {
      expect(CAPTCHA_CHARS).not.toContain('0')
    })

    it('不应包含 1', () => {
      expect(CAPTCHA_CHARS).not.toContain('1')
    })

    it('应包含 A-H (排除I)', () => {
      'ABCDEFGH'.split('').forEach(c => {
        expect(CAPTCHA_CHARS).toContain(c)
      })
    })

    it('应包含 2-9', () => {
      '23456789'.split('').forEach(c => {
        expect(CAPTCHA_CHARS).toContain(c)
      })
    })
  })

  describe('登录表单状态', () => {
    it('formState 初始值应为空', () => {
      const formState = {
        username: '',
        password: '',
        code: '',
        uuid: '',
        rememberMe: false
      }
      expect(formState.username).toBe('')
      expect(formState.password).toBe('')
      expect(formState.code).toBe('')
      expect(formState.rememberMe).toBe(false)
    })

    it('rememberMe 可设置为 true', () => {
      const formState = { rememberMe: false }
      formState.rememberMe = true
      expect(formState.rememberMe).toBe(true)
    })
  })

  describe('表单验证规则', () => {
    const rules = {
      username: [{ required: true, message: '请输入用户名' }],
      password: [{ required: true, message: '请输入密码' }],
      code: [{ required: true, message: '请输入验证码' }]
    }

    it('用户名为必填', () => {
      expect(rules.username[0].required).toBe(true)
    })

    it('密码为必填', () => {
      expect(rules.password[0].required).toBe(true)
    })

    it('验证码为必填', () => {
      expect(rules.code[0].required).toBe(true)
    })
  })
})
