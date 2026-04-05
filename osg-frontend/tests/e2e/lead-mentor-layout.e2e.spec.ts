import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/layout')
const ss = async (page: import('@playwright/test').Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`) })
}

test.describe('LM 主布局 P0', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  test('MF-LM-229 用户卡片展开按钮', async ({ page }) => {
    await loginAsAdmin(page)
    const userCard = page.locator('.user-card')
    await expect(userCard).toBeVisible({ timeout: 10000 })
    await expect(userCard).toContainText('点击展开')
    await userCard.click()
    const userMenu = page.locator('.user-menu')
    await expect(userMenu).toBeVisible({ timeout: 5000 })
    await ss(page, 'MF-LM-229-user-menu-open')
  })

  test('MF-LM-230 用户卡片展开收起切换', async ({ page }) => {
    await loginAsAdmin(page)
    const userCard = page.locator('.user-card')
    await expect(userCard).toBeVisible({ timeout: 10000 })

    await userCard.click()
    const userMenu = page.locator('.user-menu')
    await expect(userMenu).toBeVisible({ timeout: 5000 })
    await ss(page, 'MF-LM-230-menu-expanded')

    await userCard.click()
    await page.waitForTimeout(500)
    await expect(userMenu).toBeHidden({ timeout: 5000 })
    await ss(page, 'MF-LM-230-menu-collapsed')

    await userCard.click()
    await expect(userMenu).toBeVisible({ timeout: 5000 })
    await ss(page, 'MF-LM-230-menu-re-expanded')
  })

  test('MF-LM-152 退出登录', async ({ page }) => {
    await loginAsAdmin(page)
    const userCard = page.locator('.user-card')
    await expect(userCard).toBeVisible({ timeout: 10000 })
    await userCard.click()
    const logoutBtn = page.locator('.user-menu-item--danger', { hasText: '退出登录' })
    await expect(logoutBtn).toBeVisible({ timeout: 5000 })

    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await logoutBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    await ss(page, 'MF-LM-152-logout')
  })

  test('MF-LM-153 退出后受保护页面重定向', async ({ page }) => {
    await loginAsAdmin(page)
    // Use the logout flow to properly clear auth
    const userCard = page.locator('.user-card')
    await userCard.click()
    page.on('dialog', async dialog => { await dialog.accept() })
    await page.locator('.user-menu-item--danger', { hasText: '退出登录' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Use addInitScript to ensure no token persists across navigation
    await page.addInitScript(() => {
      window.localStorage.removeItem('osg_token')
      window.localStorage.removeItem('osg_user')
    })
    await page.goto('/profile/basic', { waitUntil: 'networkidle', timeout: 25000 })
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    await ss(page, 'MF-LM-153-redirect')
  })

  test('MF-LM-381 导航菜单可达性验证', async ({ page }) => {
    await loginAsAdmin(page)
    await page.waitForTimeout(1000)

    const availablePaths = [
      '/career/positions',
      '/career/job-overview',
      '/career/mock-practice',
      '/teaching/students',
      '/teaching/class-records',
      '/profile/basic',
      '/profile/schedule',
    ]

    for (const navPath of availablePaths) {
      await page.goto(navPath, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(1500)
      const url = page.url()
      expect(url, `Navigation to ${navPath} should succeed`).toContain(navPath)
    }
    await ss(page, 'MF-LM-381-last-nav')
  })

  test('MF-LM-382 无权限URL访问被拦截', async ({ page }) => {
    await loginAsAdmin(page)
    await page.waitForTimeout(500)

    // Clear auth and use addInitScript to keep it cleared across navigations
    await page.evaluate(() => {
      window.localStorage.removeItem('osg_token')
      window.localStorage.removeItem('osg_user')
    })
    await page.addInitScript(() => {
      window.localStorage.removeItem('osg_token')
      window.localStorage.removeItem('osg_user')
    })
    await page.goto('/career/positions', { waitUntil: 'networkidle', timeout: 25000 })
    await ss(page, 'MF-LM-382-no-auth-access')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('MF-LM-383 导航高亮与当前路由匹配', async ({ page }) => {
    await loginAsAdmin(page)
    await page.waitForTimeout(500)

    await page.goto('/teaching/class-records', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1500)

    const activeNavItem = page.locator('.nav-item.active')
    await expect(activeNavItem).toBeVisible({ timeout: 5000 })
    const activeText = await activeNavItem.textContent()
    expect(activeText).toContain('课程记录')
    await ss(page, 'MF-LM-383-active-highlight')
  })

  test('MF-LM-431 班主任权限菜单过滤验证', async ({ page }) => {
    await loginAsAdmin(page)
    await page.waitForTimeout(1000)

    const sidebar = page.locator('.sidebar-nav')
    await expect(sidebar).toBeVisible({ timeout: 5000 })

    const navItems = page.locator('.nav-item')
    const count = await navItems.count()
    expect(count).toBeGreaterThan(0)

    const navSections = page.locator('.nav-section')
    const sectionCount = await navSections.count()
    expect(sectionCount).toBeGreaterThanOrEqual(2)

    await ss(page, 'MF-LM-431-menu-items')
  })

  test('MF-LM-432 登录过期重定向至登录页面', async ({ page }) => {
    await loginAsAdmin(page)
    await page.waitForTimeout(500)

    await page.evaluate(() => {
      window.localStorage.removeItem('osg_token')
      window.localStorage.removeItem('osg_user')
    })
    await page.addInitScript(() => {
      window.localStorage.removeItem('osg_token')
      window.localStorage.removeItem('osg_user')
    })
    await page.goto('/career/positions', { waitUntil: 'networkidle', timeout: 25000 })
    await ss(page, 'MF-LM-432-expired-redirect')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
