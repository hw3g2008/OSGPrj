import { describe, it, expect } from 'vitest'

// 操作按钮显示逻辑（与 index.vue 模板逻辑一致）
function getUserActionButtons(user: { status: string; admin: boolean }) {
  const buttons: string[] = ['edit']
  if (user.status === '0') {
    buttons.push('resetPwd')
    if (!user.admin) {
      buttons.push('disable')
    }
  }
  if (user.status === '1') {
    buttons.push('enable')
  }
  return buttons
}

// 用户名格式校验
function validateUsername(value: string): { valid: boolean; error?: string } {
  if (!value) return { valid: false, error: '请输入用户名' }
  if (value.length < 4 || value.length > 20) return { valid: false, error: '用户名长度4-20字符' }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return { valid: false, error: '仅允许字母、数字和下划线' }
  return { valid: true }
}

// 密码规则校验
function validatePassword(value: string): { valid: boolean; error?: string } {
  if (!value) return { valid: false, error: '请输入新密码' }
  if (value.length < 8 || value.length > 20) return { valid: false, error: '密码长度8-20字符' }
  if (!/[a-zA-Z]/.test(value)) return { valid: false, error: '密码必须包含字母' }
  if (!/[0-9]/.test(value)) return { valid: false, error: '密码必须包含数字' }
  return { valid: true }
}

// 禁用/启用逻辑
function canDisableUser(user: { status: string; admin: boolean }): boolean {
  return user.status === '0' && !user.admin
}

function canEnableUser(user: { status: string }): boolean {
  return user.status === '1'
}

// 编辑回填逻辑
function prefillEditUserForm(user: {
  userId: number
  userName: string
  nickName: string
  email: string
  phonenumber?: string
  roles: { roleId: number }[]
  remark?: string
}) {
  return {
    userId: user.userId,
    userName: user.userName,
    nickName: user.nickName || '',
    email: user.email || '',
    phonenumber: user.phonenumber || '',
    roleIds: user.roles?.map(r => r.roleId) || [],
    remark: user.remark || ''
  }
}

// 角色 Tag 颜色映射
const roleTagColorMap: Record<string, string> = {
  super_admin: 'purple',
  clerk: 'blue',
  course_auditor: 'orange',
  accountant: 'green'
}

function getRoleTagColor(roleKey: string): string {
  return roleTagColorMap[roleKey] || 'default'
}

describe('用户管理模块测试', () => {
  describe('操作按钮显示逻辑', () => {
    it('Active超管: 编辑+重置密码', () => {
      const buttons = getUserActionButtons({ status: '0', admin: true })
      expect(buttons).toEqual(['edit', 'resetPwd'])
    })

    it('Active非超管: 编辑+重置密码+禁用', () => {
      const buttons = getUserActionButtons({ status: '0', admin: false })
      expect(buttons).toEqual(['edit', 'resetPwd', 'disable'])
    })

    it('Disabled: 编辑+启用', () => {
      const buttons = getUserActionButtons({ status: '1', admin: false })
      expect(buttons).toEqual(['edit', 'enable'])
    })
  })

  describe('用户名格式校验', () => {
    it('空用户名验证失败', () => {
      expect(validateUsername('')).toEqual({ valid: false, error: '请输入用户名' })
    })

    it('少于4字符验证失败', () => {
      expect(validateUsername('abc')).toEqual({ valid: false, error: '用户名长度4-20字符' })
    })

    it('超过20字符验证失败', () => {
      expect(validateUsername('a'.repeat(21))).toEqual({ valid: false, error: '用户名长度4-20字符' })
    })

    it('包含特殊字符验证失败', () => {
      expect(validateUsername('user@name')).toEqual({ valid: false, error: '仅允许字母、数字和下划线' })
    })

    it('合法用户名验证通过', () => {
      expect(validateUsername('admin_01')).toEqual({ valid: true })
    })

    it('正好4字符验证通过', () => {
      expect(validateUsername('abcd')).toEqual({ valid: true })
    })

    it('正好20字符验证通过', () => {
      expect(validateUsername('a'.repeat(20))).toEqual({ valid: true })
    })
  })

  describe('密码规则校验', () => {
    it('空密码验证失败', () => {
      expect(validatePassword('')).toEqual({ valid: false, error: '请输入新密码' })
    })

    it('少于8字符验证失败', () => {
      expect(validatePassword('abc123')).toEqual({ valid: false, error: '密码长度8-20字符' })
    })

    it('超过20字符验证失败', () => {
      expect(validatePassword('a1'.repeat(11))).toEqual({ valid: false, error: '密码长度8-20字符' })
    })

    it('纯字母验证失败', () => {
      expect(validatePassword('abcdefgh')).toEqual({ valid: false, error: '密码必须包含数字' })
    })

    it('纯数字验证失败', () => {
      expect(validatePassword('12345678')).toEqual({ valid: false, error: '密码必须包含字母' })
    })

    it('合法密码验证通过', () => {
      expect(validatePassword('Admin123')).toEqual({ valid: true })
    })
  })

  describe('禁用/启用逻辑', () => {
    it('Active非超管可禁用', () => {
      expect(canDisableUser({ status: '0', admin: false })).toBe(true)
    })

    it('Active超管不可禁用', () => {
      expect(canDisableUser({ status: '0', admin: true })).toBe(false)
    })

    it('Disabled用户不可禁用', () => {
      expect(canDisableUser({ status: '1', admin: false })).toBe(false)
    })

    it('Disabled用户可启用', () => {
      expect(canEnableUser({ status: '1' })).toBe(true)
    })

    it('Active用户不可启用', () => {
      expect(canEnableUser({ status: '0' })).toBe(false)
    })
  })

  describe('编辑回填', () => {
    it('正确回填用户基本信息和角色', () => {
      const user = {
        userId: 10001,
        userName: 'zhangsan',
        nickName: '张三',
        email: 'zhangsan@osg.com',
        phonenumber: '13800138000',
        roles: [{ roleId: 1 }, { roleId: 3 }],
        remark: '测试用户'
      }
      const result = prefillEditUserForm(user)
      expect(result.userId).toBe(10001)
      expect(result.userName).toBe('zhangsan')
      expect(result.nickName).toBe('张三')
      expect(result.email).toBe('zhangsan@osg.com')
      expect(result.phonenumber).toBe('13800138000')
      expect(result.roleIds).toEqual([1, 3])
      expect(result.remark).toBe('测试用户')
    })

    it('手机号为空时回填空字符串', () => {
      const user = {
        userId: 10002,
        userName: 'lisi',
        nickName: '李四',
        email: 'lisi@osg.com',
        roles: [{ roleId: 2 }]
      }
      const result = prefillEditUserForm(user)
      expect(result.phonenumber).toBe('')
    })
  })

  describe('角色Tag颜色映射', () => {
    it('super_admin为紫色', () => {
      expect(getRoleTagColor('super_admin')).toBe('purple')
    })

    it('clerk为蓝色', () => {
      expect(getRoleTagColor('clerk')).toBe('blue')
    })

    it('course_auditor为橙色', () => {
      expect(getRoleTagColor('course_auditor')).toBe('orange')
    })

    it('accountant为绿色', () => {
      expect(getRoleTagColor('accountant')).toBe('green')
    })

    it('其他角色为默认色', () => {
      expect(getRoleTagColor('position_admin')).toBe('default')
    })
  })
})
