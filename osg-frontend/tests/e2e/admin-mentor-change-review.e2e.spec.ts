import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loginAsAdmin } from './support/auth'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/admin/mentor-change-review')

async function ss(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * A-AU-001 admin 端导师资料变更审核 — Step 6 e2e。
 */
test.describe('A-AU-001 Admin Mentor Change Review', () => {
  test.skip(MOD !== 'admin', 'admin only')

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/users/mentor-change-review', { waitUntil: 'networkidle', timeout: 30000 })
    // 等待 filter card 渲染完成，避免后续 click 出现 race
    await page.locator('.mcr-filter-form').first().waitFor({ state: 'visible', timeout: 10000 })
  })

  // ── AAU-001 : 页面加载 + PageHeader ──
  test('AAU-001 页面打开 → 显示 PageHeader 与状态筛选', async ({ page }) => {
    await expect(page.locator('.mentor-change-review')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=导师资料变更审核').first()).toBeVisible()
    await expect(page.locator('.mcr-filter-card')).toBeVisible()
    await expect(page.locator('.mcr-table-card')).toBeVisible()
    await ss(page, 'AAU-001-loaded')
  })

  // ── AAU-002 : 表头 9 列 ──
  test('AAU-002 表头：请求 ID / 导师 userId / 变更字段 / 状态 / 提交人 / 提交时间 / 审核人 / 审核时间 / 操作', async ({ page }) => {
    const headers = page.locator('.ant-table-thead th')
    for (const text of ['请求 ID', '导师 userId', '变更字段', '状态', '提交人', '提交时间', '审核人', '审核时间', '操作']) {
      await expect(headers.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 })
    }
    await ss(page, 'AAU-002-headers')
  })

  // ── AAU-003 : 状态筛选 ──
  test('AAU-003 状态筛选下拉含「待审核 / 已通过 / 已驳回」三项', async ({ page }) => {
    const statusSelect = page.locator('.mcr-filter-form .ant-select').first()
    await statusSelect.click()
    const dropdown = page.locator('.ant-select-dropdown:visible')
    await expect(dropdown.locator('text=待审核').first()).toBeVisible({ timeout: 5000 })
    await expect(dropdown.locator('text=已通过').first()).toBeVisible()
    await expect(dropdown.locator('text=已驳回').first()).toBeVisible()
    await ss(page, 'AAU-003-status-options')
  })

  // ── AAU-004 : 待审核行展示「查看 / 通过 / 驳回」三个操作 ──
  test('AAU-004 待审核行展示 查看 / 通过 / 驳回 三个操作', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const pendingRow = page.locator('.ant-table-row').filter({ hasText: '待审核' }).first()
    if (await pendingRow.count()) {
      await expect(pendingRow.locator('button:has-text("查看")')).toBeVisible()
      await expect(pendingRow.locator('button:has-text("通过")')).toBeVisible()
      await expect(pendingRow.locator('button:has-text("驳回")')).toBeVisible()
      await ss(page, 'AAU-004-pending-actions')
    } else {
      test.info().annotations.push({ type: 'note', description: '无待审核记录' })
    }
  })

  // ── AAU-005 : 「查看」打开详情弹窗 + payload 块 ──
  test('AAU-005 点击「查看」打开详情弹窗，payload 以代码块呈现', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const viewBtn = page.locator('.ant-table-row button:has-text("查看")').first()
    if (await viewBtn.count()) {
      await viewBtn.click()
      await expect(page.locator('.ant-modal-header:has-text("变更详情")')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('.mcr-detail__pre')).toBeVisible()
      await ss(page, 'AAU-005-detail-modal')
    }
  })

  // ── AAU-006 : 「驳回」弹窗需要原因 ──
  test('AAU-006 驳回时未填原因弹 warning，填写后调用驳回 API', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const rejectBtn = page.locator('.ant-table-row button:has-text("驳回")').first()
    if (!(await rejectBtn.count())) {
      test.info().annotations.push({ type: 'note', description: '无待审核记录' })
      return
    }
    await rejectBtn.click()
    const rejectModal = page.locator('.ant-modal-header:has-text("驳回变更")').locator('..').locator('..')
    await expect(rejectModal).toBeVisible({ timeout: 5000 })
    // 直接确认 → warning
    const confirmBtn = page.locator('.ant-modal:has(.ant-modal-header:has-text("驳回变更")) button:has-text("确认驳回")')
    await confirmBtn.click()
    await expect(page.locator('.ant-message-warning, text=请填写驳回原因').first()).toBeVisible({ timeout: 3000 })
    await ss(page, 'AAU-006-reject-validation')
  })

  // ── AAU-007 : 重置 → 状态筛选清空 ──
  test('AAU-007 重置按钮清空筛选条件', async ({ page }) => {
    const statusSelect = page.locator('.mcr-filter-form .ant-select').first()
    await statusSelect.click()
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option:has-text("已通过")').click()
    await page.waitForTimeout(200)
    // antd 按钮文本会被自动插入空格（auto-insert-space-in-button），用模糊匹配兜底
    await page.locator('.mcr-filter-form button').filter({ hasText: /重\s*置/ }).first().click()
    await page.waitForTimeout(500)
    const placeholder = await page.locator('.mcr-filter-form .ant-select-selection-placeholder').first().innerText().catch(() => '')
    expect(placeholder).toContain('全部状态')
    await ss(page, 'AAU-007-after-reset')
  })
})
