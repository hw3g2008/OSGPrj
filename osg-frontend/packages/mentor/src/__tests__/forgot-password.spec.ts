/**
 * mentor login 页 forgot-password 集成契约测试
 *
 * M6 P5 阶段4：mentor 从独立 page 纠偏为 login 内嵌 modal（严格按原型 SSOT）。
 * 业务流核心断言（4 step 切换 + endpoints 调用）由 shared/components/ForgotPasswordModal.spec.ts (12 case) 覆盖。
 * 本 spec 仅验证 mentor login.vue 正确集成 shared 组件 + endpoints 注入正确。
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loginViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/login/index.vue'),
  'utf-8',
)

describe('mentor login.vue × ForgotPasswordModal 集成契约', () => {
  it('1. login template 引入 shared ForgotPasswordModal 组件 + 触发链接', () => {
    expect(loginViewSource).toContain('<ForgotPasswordModal')
    expect(loginViewSource).toContain(
      'data-surface-trigger="modal-forgot-password"',
    )
    expect(loginViewSource).toContain('@click.prevent="openForgotPassword"')
  })

  it('2. login.vue 注入了 endpoints 且适配 mentor 端 positional API 签名', () => {
    expect(loginViewSource).toContain('sendResetCode')
    expect(loginViewSource).toContain('verifyResetCodeApi')
    expect(loginViewSource).toContain('resetPasswordApi')
    expect(loginViewSource).toContain('forgotPasswordEndpoints')
    expect(loginViewSource).toContain(
      "import { ForgotPasswordModal } from '@osg/shared/components'",
    )
  })

  it('3. login.vue 不再链接到独立 forgot-password page', () => {
    expect(loginViewSource).not.toContain('to="/forgot-password"')
    expect(loginViewSource).not.toContain("to='/forgot-password'")
    expect(loginViewSource).not.toMatch(/<router-link[^>]*forgot-password/)
  })

  it('4. forgot-password 独立 page 已删除（纠偏到原型 modal SSOT）', () => {
    const pageDir = path.resolve(__dirname, '../views/forgot-password')
    expect(fs.existsSync(pageDir)).toBe(false)
  })
})
