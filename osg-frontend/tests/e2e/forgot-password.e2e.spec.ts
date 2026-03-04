import { test, expect } from '@playwright/test'
import { waitForApi } from './support/auth'

test.describe('Forgot Password @ui-smoke @ui-only', () => {
  test('forgot password modal can be opened from login page @perm-s002-forgot-entry', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    // Modal content should appear (title "找回密码")
    await expect(page.locator('.ant-modal-content, .ant-modal-title:has-text("找回密码")').first()).toBeVisible({ timeout: 5000 })
  })

  test('forgot password form shows email input @perm-s002-forgot-form', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()
    await expect(page.locator('.ant-modal-content input').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Forgot Password @api', () => {
  async function ensureResetEmailReady(page: import('@playwright/test').Page, email: string) {
    const loginResp = await page.request.post('/api/login', {
      data: {
        username: process.env.E2E_ADMIN_USERNAME || 'admin',
        password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
        code: process.env.E2E_CAPTCHA_CODE || '1234',
        uuid: '',
      },
    })
    expect(loginResp.ok(), '/api/login should return HTTP 2xx').toBeTruthy()
    const loginBody = await loginResp.json()
    expect(loginBody.code, '/api/login should return code=200').toBe(200)
    const token = loginBody.token
    expect(token, '/api/login should include token').toBeTruthy()

    const headers = { Authorization: `Bearer ${token}` }

    const infoResp = await page.request.get('/api/getInfo', { headers })
    expect(infoResp.ok(), '/api/getInfo should return HTTP 2xx').toBeTruthy()
    const infoBody = await infoResp.json()
    expect(infoBody.code, '/api/getInfo should return code=200').toBe(200)

    const user = infoBody.user || {}
    const profileResp = await page.request.put('/api/system/user/profile', {
      headers,
      data: {
        nickName: user.nickName || '管理员',
        email,
        phonenumber: user.phonenumber || '',
        sex: user.sex || '0',
      },
    })
    expect(profileResp.ok(), '/api/system/user/profile should return HTTP 2xx').toBeTruthy()
    const profileBody = await profileResp.json()
    expect(profileBody.code, '/api/system/user/profile should return code=200').toBe(200)
  }

  test('4-step forgot password flow completes @perm-s002-forgot-flow', async ({ page }) => {
    test.setTimeout(120000)

    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'
    const e2eEmail = process.env.E2E_RESET_EMAIL || 'test@example.com'
    const e2eCode = process.env.E2E_RESET_CODE || '123456'
    const newPassword = process.env.E2E_RESET_PASSWORD || adminPassword

    await ensureResetEmailReady(page, e2eEmail)

    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()

    const modal = page.locator('.ant-modal-content').first()
    const emailInput = modal.locator('input[placeholder*="邮箱"]').first()
    await emailInput.fill(e2eEmail)

    const sendCodePromise = waitForApi(page, '/api/system/password/sendCode', 'POST')
    await modal.locator('button:has-text("发送验证码")').click()
    const sendCodeResponse = await sendCodePromise
    expect(sendCodeResponse.ok(), '/api/system/password/sendCode should return HTTP 2xx').toBeTruthy()
    expect(sendCodeResponse.status(), '/api/system/password/sendCode should return HTTP 200').toBe(200)

    await expect(modal.getByText('验证码已发送至')).toBeVisible({ timeout: 10000 })

    await modal.locator('input[placeholder*="6位验证码"]').fill(e2eCode)
    await modal.getByRole('button', { name: /验\s*证/ }).click()
    // verify 成功后 UI 必须进入 Step 3（即出现新密码输入框）
    await expect(modal.locator('input[placeholder*="8-20位，包含字母和数字"]')).toBeVisible({ timeout: 10000 })

    await modal.locator('input[placeholder*="8-20位，包含字母和数字"]').fill(newPassword)
    await modal.locator('input[placeholder*="请再次输入新密码"]').fill(newPassword)
    await modal.getByRole('button', { name: /重\s*置\s*密\s*码/ }).click()
    // reset 成功后 UI 必须进入完成态
    await expect(modal.getByText('密码重置成功')).toBeVisible({ timeout: 10000 })
  })
})
