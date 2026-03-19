import { expect, test } from '@playwright/test'

test.describe('student forgot password story S-002', () => {
  test('renders the forgot-password shell and send-code entry @student-s002-shell', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByRole('link', { name: '返回登录' })).toBeVisible()
    await expect(page.locator('#step-1')).toBeVisible()
    await expect(page.locator('#send-btn')).toBeVisible()
    await expect(page.getByRole('heading', { name: '重置密码' })).toBeVisible()
  })

  test('advances from email to verification and enables resend after countdown @student-s002-code', async ({ page }) => {
    await page.route('**/api/system/password/sendCode', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '我们会往您的注册邮箱发送验证码，请查收'
        })
      })
    })

    await page.goto('/forgot-password')

    await page.getByPlaceholder('请输入注册邮箱').fill('student@example.com')
    await page.locator('#send-btn').click()

    await expect(page.getByText('验证码已发送至')).toBeVisible()
    await expect(page.getByText('s***@example.com')).toBeVisible()
    await expect(page.locator('#fp-resend-btn')).toHaveText('60s')
    await expect(page.locator('#fp-resend-btn')).toBeDisabled()
  })

  test('rejects mismatched passwords and completes the success flow @student-s002-reset', async ({ page }) => {
    await page.route('**/api/system/password/sendCode', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '我们会往您的注册邮箱发送验证码，请查收'
        })
      })
    })

    await page.route('**/api/system/password/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '操作成功',
          data: {
            resetToken: 'mock-reset-token'
          }
        })
      })
    })

    await page.route('**/api/system/password/reset', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          msg: '密码重置成功'
        })
      })
    })

    await page.goto('/forgot-password')

    await page.getByPlaceholder('请输入注册邮箱').fill('student@example.com')
    await page.locator('#send-btn').click()
    await expect(page.getByText('验证码已发送至')).toBeVisible()
    await page.getByPlaceholder('请输入6位验证码').fill('123456')
    await page.locator('#verify-btn').click()

    await page.getByPlaceholder('请输入新密码').fill('Abcd1234')
    await page.getByPlaceholder('请再次输入新密码').fill('Mismatch123')
    await page.locator('#reset-btn').click()
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible()

    await page.getByPlaceholder('请再次输入新密码').fill('Abcd1234')
    await page.locator('#reset-btn').click()

    await expect(page.getByText('密码重置成功')).toBeVisible()
    await page.locator('.success-content .login-link').click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
