import { describe, it, expect } from 'vitest'

// 密码规则校验函数
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

describe('登录模块测试', () => {
  describe('密码规则校验', () => {
    it('有效密码应通过校验', () => {
      const result = validatePassword('Password123')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('少于8位应失败', () => {
      const result = validatePassword('Pass1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码长度需为8-20位')
    })

    it('超过20位应失败', () => {
      const result = validatePassword('Password123456789012345')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码长度需为8-20位')
    })

    it('纯数字应失败', () => {
      const result = validatePassword('12345678')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码需包含字母')
    })

    it('纯字母应失败', () => {
      const result = validatePassword('abcdefgh')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码需包含数字')
    })

    it('8位边界值应通过', () => {
      const result = validatePassword('Passwo1d')
      expect(result.valid).toBe(true)
    })

    it('20位边界值应通过', () => {
      const result = validatePassword('Password1234567890ab')
      expect(result.valid).toBe(true)
    })
  })
})
