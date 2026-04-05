import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mainLayoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8',
)

const profileModalSource = fs.readFileSync(
  path.resolve(__dirname, '../components/ProfileModal.vue'),
  'utf-8',
)

describe('个人设置入口与弹窗契约', () => {
  it('keeps the user-card menu flow while exposing the profile entry as the modal-setting trigger', () => {
    expect(mainLayoutSource).toContain('toggleUserMenu')
    expect(mainLayoutSource).toContain('个人设置')
    expect(mainLayoutSource).toContain('data-surface-trigger="modal-setting"')
    expect(mainLayoutSource).toContain('openProfileSettings')
    expect(mainLayoutSource).toContain('user-card__profile-entry')
  })

  it('uses the shared overlay shell for modal-setting instead of an ant modal tabs layout', () => {
    expect(profileModalSource).toContain('<OverlaySurfaceModal')
    expect(profileModalSource).toContain('surface-id="modal-setting"')
    expect(profileModalSource).toContain('data-content-part="field-group"')
    expect(profileModalSource).toContain('data-content-part="action-row"')
    expect(profileModalSource).not.toContain('<a-modal')
    expect(profileModalSource).not.toContain('<a-tabs')
  })

  it('matches the prototype field and action contract for profile settings', () => {
    expect(profileModalSource).toContain('姓名')
    expect(profileModalSource).toContain('账号')
    expect(profileModalSource).toContain('新密码')
    expect(profileModalSource).toContain('确认密码')
    expect(profileModalSource).toContain('取消')
    expect(profileModalSource).toContain('保存')
    expect(profileModalSource).toContain('data-surface-part="cancel-control"')
    expect(profileModalSource).toContain("await http.put('/system/user/profile'")
    expect(profileModalSource).toContain("await http.put('/system/user/profile/updatePwd'")
    expect(profileModalSource).toContain("message.success('保存成功')")
    expect(profileModalSource).toContain('handleClose()')
  })
})
