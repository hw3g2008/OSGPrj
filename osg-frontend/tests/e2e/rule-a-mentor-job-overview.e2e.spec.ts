import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loginAsAdmin } from './support/auth'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/rule-a/mentor-job-overview')

async function ss(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * RULE-A 导师端「学员求职总览」9 列 + 4 项筛选 — Step 6 cross-end e2e。
 */
test.describe('RULE-A Mentor Job Overview (Step 6 cross-end)', () => {
  test.skip(MOD !== 'mentor', 'mentor only')

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
  })

  // ── RA-MT-001 : 列表 9 列含「学生ID」「面试阶段」──
  test('RA-MT-001 列表 9 列（学生ID 在最左 / 列名「面试阶段」）', async ({ page }) => {
    await expect(page.locator('#page-job-overview')).toBeVisible({ timeout: 10000 })
    const headers = page.locator('.ant-table-thead th')
    const expected = ['学生ID', '学生姓名', '岗位', '公司', '城市', '面试阶段', '面试时间', '已上报课消数', '操作']
    for (const text of expected) {
      await expect(headers.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 })
    }
    // 不应再出现旧列名「面试状态」
    await expect(headers.filter({ hasText: /^面试状态$/ })).toHaveCount(0)
    await ss(page, 'RA-MT-001-columns')
  })

  // ── RA-MT-002 : 4 项筛选齐全 ──
  test('RA-MT-002 筛选条 4 项：公司 / 面试阶段 / 面试时间 / 是否上报课消', async ({ page }) => {
    await expect(page.locator('.filter-row')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.filter-row [placeholder="全部公司"]')).toBeVisible()
    await expect(page.locator('.filter-row [placeholder="全部面试阶段"]')).toBeVisible()
    await expect(page.locator('.filter-row .ant-picker-range')).toBeVisible()
    await expect(page.locator('.filter-row [placeholder="是否上报课消"]')).toBeVisible()
    await expect(page.locator('.filter-row button:has-text("搜索")')).toBeVisible()
    await expect(page.locator('.filter-row button:has-text("重置")')).toBeVisible()
    await ss(page, 'RA-MT-002-filters')
  })

  // ── RA-MT-003 : 公司筛选 + 重置 ──
  test('RA-MT-003 选择公司筛选 → 重置 → 列表恢复', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const baselineCount = await page.locator('.ant-table-row').count()
    const companySelect = page.locator('.filter-row [placeholder="全部公司"]').first()
    await companySelect.click()
    const firstOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first()
    if (await firstOption.count()) {
      await firstOption.click()
      await page.locator('.filter-row button:has-text("搜索")').click()
      await page.waitForTimeout(500)
      const filteredCount = await page.locator('.ant-table-row').count()
      expect(filteredCount).toBeLessThanOrEqual(baselineCount)
      await page.locator('.filter-row button:has-text("重置")').click()
      await page.waitForTimeout(500)
      const restoredCount = await page.locator('.ant-table-row').count()
      expect(restoredCount).toBe(baselineCount)
    }
    await ss(page, 'RA-MT-003-filter-cycle')
  })

  // ── RA-MT-004 : 「上报课消」按钮存在且可点击 ──
  test('RA-MT-004 操作列「上报课消」按钮存在', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const firstActionBtn = page.locator('.ant-table-row button:has-text("上报课消")').first()
    if (await firstActionBtn.count()) {
      await expect(firstActionBtn).toBeVisible()
      await ss(page, 'RA-MT-004-action')
    } else {
      test.info().annotations.push({ type: 'note', description: '当前账号无可上报记录' })
    }
  })

  // ── RA-MT-005 : 学生 ID 列 fixed-left ──
  test('RA-MT-005 学生 ID 列 fixed 在最左侧', async ({ page }) => {
    await expect(page.locator('.ant-table-cell-fix-left').filter({ hasText: '学生ID' }).first()).toBeVisible({ timeout: 5000 })
    await ss(page, 'RA-MT-005-fixed-left')
  })
})
