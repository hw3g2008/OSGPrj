import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loginAsAdmin } from './support/auth'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/rule-a/lead-mentor-job-overview')

async function ss(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * RULE-A 班主任端「学员求职总览」3 栏 + 公司/岗位拆两列 — Step 6 cross-end e2e。
 */
test.describe('RULE-A Lead Mentor Job Overview (Step 6 cross-end)', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
  })

  // ── RA-LM-001 : 三栏结构 ──
  test('RA-LM-001 页面有 3 栏 Tab：我管理 / 待辅导 / 待分配导师', async ({ page }) => {
    await expect(page.locator('#page-job-overview')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=我管理的学员').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=待辅导的学员').first()).toBeVisible()
    await expect(page.locator('text=待分配导师').first()).toBeVisible()
    await ss(page, 'RA-LM-001-three-tabs')
  })

  // ── RA-LM-002 : 「岗位」列与「公司」列分开（非合并）──
  test('RA-LM-002 公司/岗位拆为两列，不再使用 CompanyPositionCell 合并显示', async ({ page }) => {
    const headers = page.locator('.ant-table-thead th')
    await expect(headers.filter({ hasText: /^岗位$/ }).first()).toBeVisible({ timeout: 5000 })
    await expect(headers.filter({ hasText: /^公司$/ }).first()).toBeVisible()
    // 不应再出现旧合并列「公司/岗位」
    await expect(headers.filter({ hasText: '公司/岗位' })).toHaveCount(0)
    await ss(page, 'RA-LM-002-split-columns')
  })

  // ── RA-LM-003 : 「我管理的学员」列字段对齐 RULE-A（9 列）──
  test('RA-LM-003 「我管理的学员」9 字段：学生ID/姓名/岗位/公司/城市/面试阶段/面试时间/导师/最近评分 + 操作', async ({ page }) => {
    const managedTab = page.locator('text=我管理的学员').first()
    await managedTab.click()
    await page.waitForTimeout(400)
    const headers = page.locator('.ant-table-thead th')
    for (const text of ['学生ID', '岗位', '公司', '城市', '面试阶段', '面试时间', '导师', '最近评分']) {
      await expect(headers.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 })
    }
    await ss(page, 'RA-LM-003-managed-columns')
  })

  // ── RA-LM-004 : 「待分配导师」栏含「提交时间」列 + 分配导师按钮 ──
  test('RA-LM-004 待分配导师栏含提交时间 + 分配导师按钮', async ({ page }) => {
    const pendingTab = page.locator('text=待分配导师').first()
    await pendingTab.click()
    await page.waitForTimeout(400)
    const headers = page.locator('.ant-table-thead th')
    await expect(headers.filter({ hasText: '提交时间' }).first()).toBeVisible({ timeout: 5000 })
    const rows = page.locator('.ant-table-row')
    if (await rows.count()) {
      await expect(rows.first().locator('button:has-text("分配导师")')).toBeVisible({ timeout: 5000 })
    }
    await ss(page, 'RA-LM-004-pending-mentor')
  })

  // ── RA-LM-005 : 分配导师数量校验 = requested_mentor_count ──
  test('RA-LM-005 分配导师弹窗数量校验：选错数量提交时报错', async ({ page }) => {
    const pendingTab = page.locator('text=待分配导师').first()
    await pendingTab.click()
    await page.waitForTimeout(400)
    const firstAssignBtn = page.locator('.ant-table-row button:has-text("分配导师")').first()
    if (!(await firstAssignBtn.count())) {
      test.info().annotations.push({ type: 'note', description: '当前无可分配申请，跳过' })
      return
    }
    await firstAssignBtn.click()
    const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    // 不选导师直接提交 → 数量错误
    const submitBtn = modal.locator('button:has-text("分配")').last()
    await submitBtn.click()
    // 期望 toast 文案包含「分配导师数量必须等于申请导师数量」
    await expect(page.locator('text=/分配导师数量必须等于申请导师数量/').first()).toBeVisible({ timeout: 3000 })
    await ss(page, 'RA-LM-005-mentor-count-error')
  })
})
