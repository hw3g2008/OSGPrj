import { test, expect } from '@playwright/test'

const ASSISTANT_URL = process.env.ASSISTANT_URL || 'http://localhost:5175'
const ASSISTANT_USERNAME = process.env.E2E_ASSISTANT_USERNAME || 'test_asst'
const ASSISTANT_PASSWORD = process.env.E2E_ASSISTANT_PASSWORD || 'admin123'

test.describe('Assistant Class Records Dual Tab (§7.4)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto(`${ASSISTANT_URL}/login`)
    await page.fill('input[placeholder*="用户名"], input[name="username"], #username', ASSISTANT_USERNAME)
    await page.fill('input[placeholder*="密码"], input[name="password"], input[type="password"]', ASSISTANT_PASSWORD)
    await page.click('button[type="submit"], .login-btn, button:has-text("登录")')
    await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => {})
  })

  test('should navigate to class records page', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await expect(page.locator('text=课程记录')).toBeVisible({ timeout: 10000 })
  })

  test('should show dual scope tabs (mine / managed)', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await expect(page.locator('.scope-tabs')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=我的申报')).toBeVisible()
    await expect(page.locator('text=我管理的学员')).toBeVisible()
  })

  test('should default to mine tab', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await page.waitForSelector('.scope-tabs', { timeout: 10000 })
    const activeTab = page.locator('.scope-tabs .ant-tabs-tab-active')
    await expect(activeTab).toContainText('我的申报')
  })

  test('should switch scope tab and refresh data', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await page.waitForSelector('.scope-tabs', { timeout: 10000 })

    // Click managed tab
    await page.click('text=我管理的学员')
    await page.waitForTimeout(500)

    const activeTab = page.locator('.scope-tabs .ant-tabs-tab-active')
    await expect(activeTab).toContainText('我管理的学员')

    // URL should not change (SPA)
    expect(page.url()).toContain('/class-records')
  })

  test('should show report button in header', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    const reportBtn = page.locator('button:has-text("上报课程记录")')
    await expect(reportBtn).toBeVisible({ timeout: 10000 })
  })

  test('should open report modal on button click', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await page.click('button:has-text("上报课程记录")')

    // Modal should appear
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.ant-modal-title, .ant-modal-header')).toContainText('上报课程记录')
  })

  test('report modal should contain required form fields', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await page.click('button:has-text("上报课程记录")')
    await page.waitForSelector('.ant-modal', { timeout: 5000 })

    // Verify key form labels
    await expect(page.locator('text=选择学员')).toBeVisible()
    await expect(page.locator('text=课程类型')).toBeVisible()
    await expect(page.locator('text=课程内容')).toBeVisible()
    await expect(page.locator('text=上课日期')).toBeVisible()
    await expect(page.locator('text=学习时长')).toBeVisible()
  })

  test('should show status sub-tabs (all/pending/approved/rejected)', async ({ page }) => {
    await page.goto(`${ASSISTANT_URL}/class-records`)
    await page.waitForSelector('.status-tabs', { timeout: 10000 })
    await expect(page.locator('.status-tabs :text("全部")')).toBeVisible()
    await expect(page.locator('.status-tabs :text("待审核")')).toBeVisible()
    await expect(page.locator('.status-tabs :text("已通过")')).toBeVisible()
    await expect(page.locator('.status-tabs :text("已驳回")')).toBeVisible()
  })
})
