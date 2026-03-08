import { test, expect } from '@playwright/test'
import { resolvePrototypePageKey } from './support/prototype-contract'
import type { VisualPageContract } from './support/visual-contract'

function makePageContract(partial: Partial<VisualPageContract> = {}): VisualPageContract {
  return {
    page_id: 'dashboard',
    route: '/dashboard',
    prototype_file: 'admin.html',
    prototype_selector: '#home-page',
    viewport: { width: 1440, height: 900 },
    auth_mode: 'protected',
    snapshot_name: 'dashboard-main',
    baseline_ref: 'osg-frontend/tests/e2e/visual-baseline/permission-dashboard-1440x900.png',
    diff_threshold: 0.05,
    stable_wait_ms: 500,
    required_anchors: ['.dashboard'],
    ...partial,
  }
}

test.describe('Prototype Contract Runtime', () => {
  test('uses explicit prototype_page_key when declared', () => {
    const contract = makePageContract({ prototype_page_key: 'home' })
    expect(resolvePrototypePageKey(contract)).toBe('home')
  })

  test('falls back to page_id when prototype_page_key is absent', () => {
    const contract = makePageContract({ page_id: 'roles' })
    expect(resolvePrototypePageKey(contract)).toBe('roles')
  })
})
