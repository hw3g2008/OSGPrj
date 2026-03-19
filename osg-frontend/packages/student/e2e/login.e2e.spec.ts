import { expect, test, type Page } from '@playwright/test'

async function mockLoginApis(page: Page) {
  await page.route('**/api/student/login', async route => {
    await new Promise(resolve => setTimeout(resolve, 150))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        token: 'student-token'
      })
    })
  })

  await page.route('**/api/getInfo', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          user: {
            userId: 10001,
            userName: 'student'
          }
        }
      })
    })
  })
}

test.describe('student login story S-001', () => {
  test('renders the login shell and required form ids @student-s001-shell', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    await expect(page.locator('#login-username')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('#login-btn')).toBeVisible()
    await expect(page.getByText('专业求职辅导')).toBeVisible()
    await expect(page.getByText('资深导师团队')).toBeVisible()
    await expect(page.getByText('全程进度跟踪')).toBeVisible()
  })

  test('shows field errors on empty submit and keeps forgot-password navigation @student-s001-validation', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#login-username').fill('')
    await page.locator('#login-password').fill('')
    await page.locator('#login-btn').click()
    await expect(page.locator('.field-error').filter({ hasText: '请输入用户名' })).toBeVisible()
    await expect(page.locator('.field-error').filter({ hasText: '请输入密码' })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByRole('link', { name: '忘记密码？' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('submits, shows loading text, persists token, and redirects to dashboard @student-s001-submit', async ({ page }) => {
    await mockLoginApis(page)
    await page.goto('/login')

    await page.locator('#login-username').fill(' student ')
    await page.locator('#login-password').fill('secret')

    const loginResponse = page.waitForResponse('**/api/student/login')
    await page.locator('#login-btn').click()

    await expect(page.getByRole('button', { name: '登录中...' })).toBeVisible()
    await loginResponse
    await expect(page).toHaveURL(/\/dashboard$/)

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token).toBe('student-token')
  })
})
