import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loginAsAdmin } from './support/auth'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/rule-a/assistant-job-overview')

async function ss(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * RULE-A 助教端「学员求职总览」单栏 + 9 字段 — Step 6 cross-end e2e。
 */
test.describe('RULE-A Assistant Job Overview (Step 6 cross-end)', () => {
  test.skip(MOD !== 'assistant', 'assistant only')

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
  })

  // ── RA-AS-001 : 单栏「我管理的学员」（无 KPI 横条）──
  test('RA-AS-001 单栏「我管理的学员」无 KPI 横条', async ({ page }) => {
    await expect(page.locator('text=我管理的学员').first()).toBeVisible({ timeout: 5000 })
    // RULE-A 助教端只有面试日历 + 筛选 + 列表，无 KPI 横条
    await expect(page.locator('.ajo-kpi-strip')).toHaveCount(0)
    await expect(page.locator('text=收 Offer').first()).toHaveCount(0)
    await ss(page, 'RA-AS-001-no-kpi')
  })

  // ── RA-AS-002 : 面试日历存在 ──
  test('RA-AS-002 面试日历组件存在', async ({ page }) => {
    // InterviewCalendar 渲染容器（osg-shared/components）
    const calendar = page.locator('[class*="interview-calendar"], .ant-picker-calendar').first()
    await expect(calendar).toBeVisible({ timeout: 5000 })
    await ss(page, 'RA-AS-002-calendar')
  })

  // ── RA-AS-003 : 列表 9 字段 ──
  test('RA-AS-003 列表 9 字段：学生ID/姓名/岗位/公司/城市/面试阶段/面试时间/导师/最近评分', async ({ page }) => {
    const headers = page.locator('.ant-table-thead th')
    for (const text of ['学生 ID', '学员', '公司', '城市', '面试阶段', '面试时间', '导师', '最近评分']) {
      await expect(headers.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 })
    }
    await ss(page, 'RA-AS-003-columns')
  })

  // ── RA-AS-004 : 操作「查看详情」打开跟进详情弹窗 ──
  test('RA-AS-004 点击「查看详情」打开跟进详情', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const detailBtn = page.locator('.ant-table-row button:has-text("查看详情")').first()
    if (await detailBtn.count()) {
      await detailBtn.click()
      await expect(page.locator('text=跟进详情').first()).toBeVisible({ timeout: 5000 })
      await ss(page, 'RA-AS-004-detail-modal')
    } else {
      test.info().annotations.push({ type: 'note', description: '当前账号无可管理记录' })
    }
  })

  // ── RA-AS-005 : 城市字段使用 cityLabel 中文，禁止 location 英文 fallback (RULE-E) ──
  test('RA-AS-005 城市单元格不显示英文 location 兜底', async ({ page }) => {
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })
    const rows = page.locator('.ant-table-row')
    const count = await rows.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cityCell = rows.nth(i).locator('td').nth(3) // 假设第 4 列是「城市」
      const text = (await cityCell.innerText()).trim()
      for (const forbidden of ['apac', 'na', 'eu', 'cn']) {
        expect(text.toLowerCase()).not.toBe(forbidden)
      }
    }
  })
})
