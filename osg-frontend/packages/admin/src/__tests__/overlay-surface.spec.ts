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
const visualContractE2ePath = path.resolve(
  __dirname,
  '../../../../tests/e2e/visual-contract.e2e.spec.ts'
)
const permissionVisualContractPath = path.resolve(
  __dirname,
  '../../../../../osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml'
)

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

function readSurfaceBlock(source: string, surfaceId: string): string {
  const marker = `- surface_id: ${surfaceId}`
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(`surface block not found: ${surfaceId}`)
  }
  const next = source.indexOf('\n- surface_id: ', start + marker.length)
  return next === -1 ? source.slice(start) : source.slice(start, next)
}

function expectNoPassiveSurfaceTriggerWrappers(source: string): void {
  expect(source).not.toMatch(/<span[^>]*data-surface-trigger=/)
  expect(source).not.toMatch(/<div[^>]*data-surface-trigger=/)
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
    expect(source).toContain('data-content-part="title"')
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
    expect(source).toContain('border-radius: 20px')
  })

  it('centralizes shared ant form rhythm on the overlay shell', () => {
    const source = readSource(overlaySurfaceModalPath)
    expect(source).toContain(':deep(.ant-form-item)')
    expect(source).toContain('margin-bottom: 8px')
    expect(source).toContain(':deep(.ant-input),')
    expect(source).toContain(':deep(.ant-input-affix-wrapper),')
    expect(source).toContain(':deep(.ant-select-selector)')
    expect(source).toContain('padding: 12px 14px')
    expect(source).toContain('border: 2px solid var(--border')
    expect(source).toContain('border-radius: 10px')
    expect(source).toContain(':deep(.overlay-surface-modal__footer .ant-btn)')
    expect(source).toContain('min-width: 80px')
    expect(source).toContain('font-weight: 500')
  })

  it('marks login forgot-password trigger with a generic surface trigger', () => {
    const source = readSource(loginViewPath)
    expect(source).toContain('data-surface-trigger="modal-forgot-password"')
  })

  it('marks role page triggers with generic overlay surface ids', () => {
    const source = readSource(rolesViewPath)
    expect(source).toContain('data-surface-trigger="modal-new-role"')
    expect(source).toContain('data-surface-trigger="modal-edit-role"')
    expect(source).toContain('data-surface-sample="modal-edit-role"')
    expect(source).toContain(':data-surface-sample-key="record.roleKey"')
    expectNoPassiveSurfaceTriggerWrappers(source)
  })

  it('marks user page triggers with generic overlay surface ids', () => {
    const source = readSource(usersViewPath)
    expect(source).toContain('data-surface-trigger="modal-add-admin"')
    expect(source).toContain('data-surface-trigger="modal-edit-admin"')
    expect(source).toContain('data-surface-trigger="modal-reset-password"')
    expect(source).toContain('data-surface-sample="modal-edit-admin"')
    expect(source).toContain('data-surface-sample="modal-reset-password"')
    expectNoPassiveSurfaceTriggerWrappers(source)
  })

  it('keeps proof-case surface triggers on actionable controls instead of wrapper spans', () => {
    const rolesSource = readSource(rolesViewPath)
    const usersSource = readSource(usersViewPath)

    expect(rolesSource).toContain('<a-button')
    expect(rolesSource).toContain('data-surface-trigger="modal-new-role"')
    expect(usersSource).toContain('<a-button')
    expect(usersSource).toContain('data-surface-trigger="modal-add-admin"')
    expect(usersSource).toContain('data-surface-trigger="modal-edit-admin"')
    expect(usersSource).toContain('data-surface-trigger="modal-reset-password"')
  })

  it('binds sample-specific trigger selectors for edit and reset overlay captures', () => {
    const source = readSource(permissionVisualContractPath)
    expect(source).toContain(`selector: '[data-surface-trigger="modal-edit-role"][data-surface-sample-key="clerk"]'`)
    expect(source).toContain(`selector: '[data-surface-trigger="modal-edit-admin"][data-surface-sample-key="clerk001"]'`)
    expect(source).toContain(`selector: '[data-surface-trigger="modal-reset-password"][data-surface-sample-key="clerk001"]'`)
  })

  it('allows overlay surface contracts to define fixture routes', () => {
    const source = readSource(visualContractSupportPath)
    expect(source).toContain('fixture_routes?: VisualFixtureRoute[]')
    expect(source).toContain('prototype_selector?: string')
    expect(source).toContain('prototype_script?: string')
  })

  it('passes visualSource through the overlay trigger execution path', () => {
    const source = readSource(visualContractE2ePath)
    expect(source).toContain('await performSurfaceTrigger(page, hostPage, surfaceContract, visualSource)')
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

  it('keeps generated overlay shell radius aligned with the design-system modal token', () => {
    const source = readSource(permissionVisualContractPath)
    for (const surfaceId of [
      'modal-forgot-password',
      'modal-new-role',
      'modal-edit-role',
      'modal-add-admin',
      'modal-edit-admin',
      'modal-reset-password',
    ]) {
      const surfaceBlock = readSurfaceBlock(source, surfaceId)
      expect(surfaceBlock).toContain('border-radius: 20px')
      expect(surfaceBlock).not.toContain('border-radius: 16px')
    }
  })

  it('avoids shorthand background contracts for close controls in generated overlay skeletons', () => {
    const source = readSource(permissionVisualContractPath)
    expect(source).not.toContain("background: var(--bg)")
  })

  it('keeps forgot-password modal on the shared overlay shell while using contract-aligned primary styling', () => {
    const source = readSource(forgotPasswordModalPath)
    expect(source).toContain('<OverlaySurfaceModal')
    expect(source).toContain('data-content-part="progress-indicator"')
    expect(source).toContain('data-content-part="supporting-text"')
    expect(source).toContain('data-content-part="field-group"')
    expect(source).toContain('data-content-part="action-row"')
    expect(source).toContain('forgot-modal__primary-btn')
    expect(source).toContain('background: var(--primary-gradient')
    expect(source).toContain('mdi mdi-key')
    expect(source).toContain('mdi mdi-email-fast')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
    expect(source).toContain(':visibility-toggle="false"')
    expect(source).not.toContain(':deep(.ant-form-item)')
    expect(source).not.toContain(':deep(.ant-form-item-label > label)')
  })

  it('renders role permissions with grouped surface markup and mdi icons instead of ad-hoc emoji', () => {
    const source = readSource(roleModalPath)
    expect(source).toContain('data-content-part="field-group"')
    expect(source).toContain('data-content-part="supporting-text"')
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
    expect(source).toContain('data-content-part="field-group"')
    expect(source).toContain('data-content-part="supporting-text"')
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
    expect(source).toContain('data-content-part="status-banner"')
    expect(source).toContain('data-content-part="field-group"')
    expect(source).toContain('data-content-part="action-row"')
    expect(source).not.toContain('<a-alert')
    expect(source).toContain('reset-pwd-modal__warning')
    expect(source).toContain('mdi-lock-reset')
    expect(source).toContain('mdi-alert')
    expect(source).toContain(':required-mark="false"')
    expect(source).toContain('#label')
    expect(source).toContain(':visibility-toggle="false"')
  })

  it('declares generic content-part contracts for proof-case overlay surfaces', () => {
    const source = readSource(permissionVisualContractPath)
    for (const surfaceId of [
      'modal-forgot-password',
      'modal-new-role',
      'modal-edit-role',
      'modal-add-admin',
      'modal-edit-admin',
      'modal-reset-password',
    ]) {
      const surfaceBlock = readSurfaceBlock(source, surfaceId)
      expect(surfaceBlock).toContain('content_parts:')
      expect(surfaceBlock).toContain('part_id: title')
      expect(surfaceBlock).toContain('part_id: action-row')
    }
  })

  it('declares prototype-side content-part selectors for proof-case overlay surfaces', () => {
    const source = readSource(permissionVisualContractPath)
    const expectedPrototypeSelectors: Record<string, string[]> = {
      'modal-forgot-password': [
        "prototype_selector: '#modal-forgot-password .modal-title'",
        "prototype_selector: '#modal-forgot-password .step-progress, #modal-forgot-password .modal-body [id*=\"dot-\"]'",
        "prototype_selector: '#modal-forgot-password .modal-body > p, #modal-forgot-password .modal-body p'",
        "prototype_selector: '#modal-forgot-password .form-group'",
        "prototype_selector: '#modal-forgot-password .modal-footer, #modal-forgot-password .modal-body > div:has(button.btn-primary), #modal-forgot-password .modal-body > div:has(.btn-primary)'",
      ],
      'modal-new-role': [
        "prototype_selector: '#modal-new-role .modal-title'",
        "prototype_selector: '#modal-new-role .modal-body > p, #modal-new-role .modal-body p'",
        "prototype_selector: '#modal-new-role .form-group'",
        "prototype_selector: '#modal-new-role .modal-footer, #modal-new-role .modal-body > div:has(button.btn-primary), #modal-new-role .modal-body > div:has(.btn-primary)'",
      ],
      'modal-edit-role': [
        "prototype_selector: '#modal-edit-role .modal-title'",
        "prototype_selector: '#modal-edit-role .modal-body > p, #modal-edit-role .modal-body p'",
        "prototype_selector: '#modal-edit-role .form-group'",
        "prototype_selector: '#modal-edit-role .modal-footer, #modal-edit-role .modal-body > div:has(button.btn-primary), #modal-edit-role .modal-body > div:has(.btn-primary)'",
      ],
      'modal-add-admin': [
        "prototype_selector: '#modal-add-admin .modal-title'",
        "prototype_selector: '#modal-add-admin .modal-body > p, #modal-add-admin .modal-body p'",
        "prototype_selector: '#modal-add-admin .form-group'",
        "prototype_selector: '#modal-add-admin .modal-footer, #modal-add-admin .modal-body > div:has(button.btn-primary), #modal-add-admin .modal-body > div:has(.btn-primary)'",
      ],
      'modal-edit-admin': [
        "prototype_selector: '#modal-edit-admin .modal-title'",
        "prototype_selector: '#modal-edit-admin .modal-body > p, #modal-edit-admin .modal-body p'",
        "prototype_selector: '#modal-edit-admin .form-group'",
        "prototype_selector: '#modal-edit-admin .modal-footer, #modal-edit-admin .modal-body > div:has(button.btn-primary), #modal-edit-admin .modal-body > div:has(.btn-primary)'",
      ],
      'modal-reset-password': [
        "prototype_selector: '#modal-reset-password .modal-title'",
        "prototype_selector: '#modal-reset-password .alert, #modal-reset-password .status-banner, #modal-reset-password .warning-banner, #modal-reset-password .modal-body > div:has(.mdi-alert), #modal-reset-password .modal-body > div[style*=\"background:#FEF3C7\"], #modal-reset-password .modal-body > div[style*=\"background: #FEF3C7\"], #modal-reset-password .modal-body > div[style*=\"background:#ECFDF5\"], #modal-reset-password .modal-body > div[style*=\"background: #ECFDF5\"]'",
        "prototype_selector: '#modal-reset-password .form-group'",
        "prototype_selector: '#modal-reset-password .modal-footer, #modal-reset-password .modal-body > div:has(button.btn-primary), #modal-reset-password .modal-body > div:has(.btn-primary)'",
      ],
    }

    for (const [surfaceId, selectors] of Object.entries(expectedPrototypeSelectors)) {
      const surfaceBlock = readSurfaceBlock(source, surfaceId).replace(/\n\s+/g, ' ')
      for (const selector of selectors) {
        expect(surfaceBlock).toContain(selector)
      }
    }
  })

  it('derives content parts only from the matched prototype root', () => {
    const source = readSource(permissionVisualContractPath)
    const roleBlock = readSurfaceBlock(source, 'modal-edit-role').replace(/\n\s+/g, ' ')

    expect(roleBlock).not.toContain('part_id: status-banner')
    expect(roleBlock).toContain('part_id: supporting-text')
    expect(roleBlock).toContain('part_id: field-group')
    expect(roleBlock).toContain('part_id: action-row')
  })
})
