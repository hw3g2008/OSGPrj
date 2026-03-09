import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const overlaySurfaceModalPath = path.resolve(
  __dirname,
  '../components/OverlaySurfaceModal.vue'
)
const loginViewPath = path.resolve(__dirname, '../views/login/index.vue')
const rolesViewPath = path.resolve(__dirname, '../views/permission/roles/index.vue')
const usersViewPath = path.resolve(__dirname, '../views/permission/users/index.vue')
const forgotPasswordModalPath = path.resolve(__dirname, '../components/ForgotPasswordModal.vue')
const roleModalPath = path.resolve(
  __dirname,
  '../views/permission/roles/components/RoleModal.vue',
)
const userModalPath = path.resolve(
  __dirname,
  '../views/permission/users/components/UserModal.vue',
)
const resetPwdModalPath = path.resolve(
  __dirname,
  '../views/permission/users/components/ResetPwdModal.vue',
)
const visualContractSupportPath = path.resolve(
  __dirname,
  '../../../../tests/e2e/support/visual-contract.ts'
)
const permissionVisualContractPath = path.resolve(
  __dirname,
  '../../../../../osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml'
)

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

describe('overlay surface framework contract', () => {
  it('provides a reusable overlay surface wrapper component', () => {
    expect(fs.existsSync(overlaySurfaceModalPath)).toBe(true)

    const source = readSource(overlaySurfaceModalPath)
    expect(source).toContain('data-surface-id')
    expect(source).toContain('data-surface-part="header"')
    expect(source).toContain('data-surface-part="body"')
    expect(source).toContain('data-surface-part="footer"')
    expect(source).toContain('data-surface-part="close-control"')
  })

  it('supports reusable shell sizing hooks for modal surfaces', () => {
    const source = readSource(overlaySurfaceModalPath)
    expect(source).toContain('maxHeight?: string | number')
    expect(source).toContain('bodyClass?: string')
    expect(source).toContain('footerClass?: string')
    expect(source).toContain("width: '90%'")
    expect(source).toContain("maxHeight: '90vh'")
    expect(source).toContain('box-shadow: none')
    expect(source).toContain('z-index: 1000')
  })

  it('marks login forgot-password trigger with a generic surface trigger', () => {
    const source = readSource(loginViewPath)
    expect(source).toContain('data-surface-trigger="modal-forgot-password"')
  })

  it('marks role page triggers with generic overlay surface ids', () => {
    const source = readSource(rolesViewPath)
    expect(source).toContain('data-surface-trigger="modal-new-role"')
    expect(source).toContain('data-surface-trigger="modal-edit-role"')
  })

  it('marks user page triggers with generic overlay surface ids', () => {
    const source = readSource(usersViewPath)
    expect(source).toContain('data-surface-trigger="modal-add-admin"')
    expect(source).toContain('data-surface-trigger="modal-edit-admin"')
    expect(source).toContain('data-surface-trigger="modal-reset-password"')
    expect(source).toContain('data-surface-sample="modal-edit-admin"')
    expect(source).toContain('data-surface-sample="modal-reset-password"')
  })

  it('allows overlay surface contracts to define fixture routes', () => {
    const source = readSource(visualContractSupportPath)
    expect(source).toContain('fixture_routes?: VisualFixtureRoute[]')
    expect(source).toContain('prototype_selector?: string')
    expect(source).toContain('prototype_script?: string')
  })

  it('provides prototype-side trigger selectors for overlay surfaces that open from static prototype interactions', () => {
    const source = readSource(permissionVisualContractPath)
    expect(source).toContain('prototype_selector: a[onclick*="openModal(\'modal-forgot-password\')"]')
    expect(source).toContain('prototype_selector: button[onclick*="openModal(\'modal-new-role\')"]')
    expect(source).toContain('prototype_selector: button[onclick*="openModal(\'modal-edit-role\')"]')
    expect(source).toContain('prototype_selector: button[onclick*="openModal(\'modal-add-admin\')"]')
    expect(source).toContain('prototype_selector: button[onclick*="openModal(\'modal-edit-admin\')"]')
    expect(source).toContain('prototype_selector: button[onclick*="openModal(\'modal-reset-password\')"]')
  })

  it('binds overlay app selectors to the shell part instead of the root container', () => {
    const source = readSource(permissionVisualContractPath)
    for (const surfaceId of [
      'modal-forgot-password',
      'modal-new-role',
      'modal-edit-role',
      'modal-add-admin',
      'modal-edit-admin',
      'modal-reset-password',
    ]) {
      expect(source).toContain(`app_selector: '[data-surface-id="${surfaceId}"] [data-surface-part="shell"]'`)
      expect(source).toContain(`surface_root_selector: '[data-surface-id="${surfaceId}"] [data-surface-part="shell"]'`)
    }
  })

  it('avoids shorthand background contracts for close controls in generated overlay skeletons', () => {
    const source = readSource(permissionVisualContractPath)
    expect(source).not.toContain("background: var(--bg)")
  })

  it('keeps forgot-password modal on the shared overlay shell while using contract-aligned primary styling', () => {
    const source = readSource(forgotPasswordModalPath)
    expect(source).toContain('<OverlaySurfaceModal')
    expect(source).toContain('forgot-modal__primary-btn')
    expect(source).toContain('background: var(--primary-gradient')
    expect(source).toContain('mdi mdi-key')
    expect(source).toContain('mdi mdi-email-fast')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
    expect(source).toContain(':visibility-toggle="false"')
  })

  it('renders role permissions with grouped surface markup and mdi icons instead of ad-hoc emoji', () => {
    const source = readSource(roleModalPath)
    expect(source).not.toContain('<a-tree')
    expect(source).toContain('role-modal__perm-group')
    expect(source).toContain('role-modal__perm-items')
    expect(source).toContain('mdi-shield-key')
    expect(source).toContain('mdi-account-group')
  })

  it('keeps role modal footer and remark field aligned to prototype shell patterns', () => {
    const source = readSource(roleModalPath)
    expect(source).not.toContain('show-count')
    expect(source).toContain('class="role-modal__cancel-btn"')
    expect(source).toContain('class="role-modal__confirm-btn"')
    expect(source).not.toContain('<a-button type="primary" :loading="loading" @click="handleSubmit">')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
  })

  it('renders user role selection with select-based modal fields instead of checkbox stacks', () => {
    const source = readSource(userModalPath)
    expect(source).not.toContain('<a-checkbox-group')
    expect(source).toContain('user-modal__grid')
    expect(source).toContain('selectedRoleId')
    expect(source).toContain('mdi-account-plus')
  })

  it('keeps user modal footer and remark field aligned to prototype shell patterns', () => {
    const source = readSource(userModalPath)
    expect(source).not.toContain('show-count')
    expect(source).toContain('class="user-modal__cancel-btn"')
    expect(source).toContain('class="user-modal__confirm-btn"')
    expect(source).not.toContain('<a-button type="primary" :loading="loading" @click="handleSubmit">')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
  })

  it('renders password reset warning content with custom surface markup instead of Ant alert defaults', () => {
    const source = readSource(resetPwdModalPath)
    expect(source).not.toContain('<a-alert')
    expect(source).toContain('reset-pwd-modal__warning')
    expect(source).toContain('mdi-lock-reset')
    expect(source).toContain('mdi-alert')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
    expect(source).toContain(':visibility-toggle="false"')
  })
})
