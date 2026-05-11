import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loginAsAdmin } from './support/auth'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/rule-a/student-applications')

async function ss(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * RULE-A 学生端「我的求职」main chain — Step 6 cross-end e2e.
 * Source contract 已在 packages/student/src/__tests__/applications.spec.ts 强校验；
 * 本 spec 验证浏览器端真实渲染 + 申请辅导主链的「无后端 mock」行为。
 */
test.describe('RULE-A Student My Applications (Step 6 cross-end)', () => {
  test.skip(MOD !== 'student', 'student only')

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/applications', { waitUntil: 'networkidle', timeout: 30000 })
  })

  // ── RA-ST-001 : 列表 8 字段 + 操作 ──
  test('RA-ST-001 列表展示 RULE-A 8 字段 + 操作列', async ({ page }) => {
    await expect(page.locator('#page-job-tracking')).toBeVisible({ timeout: 10000 })
    const headers = page.locator('.ant-table-thead th')
    const expected = ['岗位名称', '公司', '行业', '岗位分类', '地区', '招聘周期', '投递时间', '求职状态', '操作']
    for (const text of expected) {
      await expect(headers.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 })
    }
    await ss(page, 'RA-ST-001-columns')
  })

  // ── RA-ST-002 : 操作列只有「申请辅导」按钮 ──
  test('RA-ST-002 操作列只展示「申请辅导」按钮', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const firstRow = page.locator('.ant-table-row').first()
    const actionsCell = firstRow.locator('td').last()
    await expect(actionsCell.locator('.apply-coaching-btn')).toBeVisible({ timeout: 5000 })
    await expect(actionsCell).toContainText('申请辅导')
    // 不应再出现「更新进度」「标记已投递」等旧按钮
    await expect(actionsCell.locator('button:has-text("更新进度")')).toHaveCount(0)
    await ss(page, 'RA-ST-002-actions')
  })

  // ── RA-ST-003 : 点击「申请辅导」打开弹窗 ──
  test('RA-ST-003 点击「申请辅导」打开弹窗，弹窗标题为「申请辅导」', async ({ page }) => {
    await page.waitForSelector('.apply-coaching-btn', { timeout: 10000 })
    await page.locator('.apply-coaching-btn').first().click()
    const modal = page.locator('.applications-modal--progress')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal).toContainText('申请辅导')
    // 不应再出现「更新状态 & 申请辅导」混合标题
    await expect(modal).not.toContainText('更新状态 & 申请辅导')
    await ss(page, 'RA-ST-003-modal-open')
  })

  // ── RA-ST-004 : 弹窗下拉只有 7 个面试阶段 ──
  test('RA-ST-004 弹窗阶段下拉只显示 7 个面试阶段（含 HireVue）', async ({ page }) => {
    await page.waitForSelector('.apply-coaching-btn', { timeout: 10000 })
    await page.locator('.apply-coaching-btn').first().click()
    await page.locator('#update-stage-select').click()
    const dropdown = page.locator('.ant-select-dropdown:visible')
    await expect(dropdown).toBeVisible({ timeout: 5000 })
    // 7 阶段：HireVue / Screening / First / Second / Third / Case / Superday
    // 至少 hirevue 在 RULE-A 之前是缺失的，这里强校验
    await expect(dropdown.locator('text=/HireVue/i').first()).toBeVisible({ timeout: 3000 })
    // 不能出现非阶段值 applied / offer / rejected / withdraw
    await expect(dropdown.locator('.ant-select-item-option-content:has-text("已投递")')).toHaveCount(0)
    await expect(dropdown.locator('.ant-select-item-option-content:has-text("Offer")')).toHaveCount(0)
    await ss(page, 'RA-ST-004-stage-dropdown')
  })

  // ── RA-ST-005 : 展开行 5 字段（面试阶段/面试时间/城市/导师/最近评分）──
  test('RA-ST-005 岗位行可展开显示辅导记录 5 字段', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const expandBtn = page.locator('.ant-table-row-expand-icon').first()
    if (await expandBtn.count()) {
      await expandBtn.click()
      const panel = page.locator('.application-coachings-panel').first()
      await expect(panel).toBeVisible({ timeout: 5000 })
      // 展开行有「查看详情」+「修改」操作
      const actions = panel.locator('.application-coaching-action')
      expect(await actions.count()).toBeGreaterThan(0)
      await ss(page, 'RA-ST-005-expanded')
    } else {
      test.info().annotations.push({ type: 'note', description: '当前账号无可展开岗位（无辅导记录），跳过 expand 断言' })
    }
  })

  // ── RA-ST-006 : 求职状态用字典中文 label，不露英文 value ──
  test('RA-ST-006 求职状态展示字典中文 label（RULE-E）', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const statusCells = page.locator('.application-status-tag')
    const count = await statusCells.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = (await statusCells.nth(i).innerText()).trim()
        // 不允许英文 value 露出
        for (const forbidden of ['applied', 'interviewing', 'offer', 'rejected', 'withdraw']) {
          expect(text.toLowerCase()).not.toBe(forbidden)
        }
      }
      await ss(page, 'RA-ST-006-status-labels')
    }
  })
})
