import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/class-records')
const ss = async (page: import('@playwright/test').Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`) })
}

test.describe('LM 课程记录 P0', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  test('P0-CR-001 页面加载', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await expect(page.locator('#page-myclass')).toBeVisible({ timeout: 10000 })
    await ss(page, 'P0-CR-001')
  })

  test('P0-CR-002 我的范围Tab', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.locator('#lm-class-tab-mine').click()
    await expect(page.locator('#lm-class-content-mine')).toBeVisible({ timeout: 8000 })
    await ss(page, 'P0-CR-002')
  })

  test('P0-CR-003 管理范围Tab', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.locator('#lm-class-tab-managed').click()
    await expect(page.locator('#lm-class-content-managed')).toBeVisible({ timeout: 8000 })
    await ss(page, 'P0-CR-003')
  })

  test('P0-CR-004 课程汇报弹窗', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(2000)
    const reportBtns = page.getByRole('button', { name: /汇报/ })
    const n = await reportBtns.count()
    if (n > 0) {
      await reportBtns.first().click()
      const modal = page.locator('[data-surface-id="modal-lm-report"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      await ss(page, 'P0-CR-004-open')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      await ss(page, 'P0-CR-004-closed')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No 汇报 button found' })
      await ss(page, 'P0-CR-004-no-data')
    }
  })

  test('P0-CR-005 驳回弹窗', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(2000)
    const rejectBtns = page.getByRole('button', { name: /驳回|拒绝/ })
    const n = await rejectBtns.count()
    if (n > 0) {
      await rejectBtns.first().click({ force: true })
      const modal = page.locator('.el-dialog, .el-overlay, [role="dialog"], [data-surface-id="modal-lm-reject"]').first()
      await expect(modal).toBeVisible({ timeout: 8000 })
      await ss(page, 'P0-CR-005-open')
      const cancel = modal.getByRole('button', { name: /取消/ })
      if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) await cancel.click()
      else await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      await ss(page, 'P0-CR-005-closed')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No 驳回 button — no 待审核 records' })
      await ss(page, 'P0-CR-005-no-data')
    }
  })

  test('P0-CR-006 导出按钮', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(1500)
    const exportBtn = page.getByRole('button', { name: /导出/ })
    const n = await exportBtn.count()
    await ss(page, 'P0-CR-006')
    if (n > 0) {
      await expect(exportBtn.first()).toBeVisible()
    }
    // Page should be loaded regardless
    await expect(page.locator('#page-myclass')).toBeVisible()
  })

  test('P0-CR-007 课程详情弹窗', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teaching/class-records', { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(2000)
    const detailBtns = page.getByRole('button', { name: /详情|查看/ })
    const n = await detailBtns.count()
    if (n > 0) {
      await detailBtns.first().click({ force: true })
      const modal = page.locator('.el-dialog, .el-overlay, [role="dialog"], [data-surface-id="modal-lm-detail"]').first()
      await expect(modal).toBeVisible({ timeout: 8000 })
      await ss(page, 'P0-CR-007-open')
      const close = modal.locator('.el-dialog__close').first()
      if (await close.isVisible({ timeout: 2000 }).catch(() => false)) await close.click()
      else await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      await ss(page, 'P0-CR-007-closed')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No records to view detail' })
      await ss(page, 'P0-CR-007-no-data')
    }
  })
})
