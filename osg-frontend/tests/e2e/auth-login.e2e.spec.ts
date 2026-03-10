import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, requestCaptchaChallenge, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

test.describe('Auth Login @ui-smoke @ui-only', () => {
  test('login page renders with form fields @perm-s001-login-form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="text"], input[placeholder*="账号"], input[placeholder*="用户名"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('login with empty fields shows validation @perm-s001-login-validation', async ({ page }) => {
    await page.goto('/login')
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first()
    await submitBtn.click()
    // Should stay on login page (not navigate away)
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Auth Login @api', () => {
  test('login success redirects to dashboard @perm-s001-login-success', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token, 'login should persist token in localStorage').toBeTruthy()

    await recordBehaviorScenario({
      capabilityId: 'login-success',
      scenarioId: 'valid-credentials',
      inputClass: 'valid_credentials',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/dashboard',
        token_present: Boolean(token),
      },
      evidenceRef: 'osg-frontend/tests/e2e/auth-login.e2e.spec.ts#perm-s001-login-success',
    })
  })

  test('invalid credentials are rejected @perm-s001-login-invalid-credentials', async ({ page }) => {
    const captcha = await requestCaptchaChallenge(page.request)
    const response = await page.request.post('/api/login', {
      data: {
        username: 'admin',
        password: 'WrongPassword123',
        code: captcha.code,
        uuid: captcha.uuid,
      },
    })
    expect(response.ok(), '/api/login invalid-credentials should still return HTTP 2xx').toBeTruthy()
    const body = await response.json()
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'login-success',
      scenarioId: 'invalid-credentials',
      inputClass: 'invalid_credentials',
      expectedResult: 'rejected',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? null,
        token_present: Boolean(body?.token || body?.data?.token),
      },
      evidenceRef: 'osg-frontend/tests/e2e/auth-login.e2e.spec.ts#perm-s001-login-invalid-credentials',
    })
  })

  test('logout clears token and returns to login @perm-s001-logout', async ({ page }) => {
    await loginAsAdmin(page)

    const logoutPromise = waitForApi(page, '/api/logout', 'POST')
    await page.locator('.user-card').click()
    await page.getByRole('button', { name: '退出登录' }).click()
    await page.getByRole('button', { name: /确\s*定/ }).click()

    await assertRuoyiSuccess(logoutPromise, '/api/logout')
    await page.waitForURL(/\/login/, { timeout: 15000 })

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token, 'logout should clear token in localStorage').toBeFalsy()

    await recordBehaviorScenario({
      capabilityId: 'logout',
      scenarioId: 'authenticated-session',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/login',
        token_present: Boolean(token),
      },
      evidenceRef: 'osg-frontend/tests/e2e/auth-login.e2e.spec.ts#perm-s001-logout',
    })
  })

  test('anonymous logout is rejected @perm-s001-logout-anonymous', async ({ page }) => {
    const response = await page.request.post('/api/logout')
    expect(response.ok(), '/api/logout anonymous-session should still return HTTP 2xx').toBeTruthy()
    const raw = await response.text()
    let body: any = null
    try {
      body = JSON.parse(raw)
    } catch {
      body = { raw }
    }
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'logout',
      scenarioId: 'anonymous-session',
      inputClass: 'anonymous_session',
      expectedResult: 'rejected',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? body?.raw ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/auth-login.e2e.spec.ts#perm-s001-logout-anonymous',
    })
  })

  test('superadmin sees all menu items @perm-s003-superadmin-menu', async ({ page }) => {
    await loginAsAdmin(page)

    const sidebar = page.getByTestId('main-sidebar')
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    const menuLabel = (text: string) =>
      sidebar.getByText(text, { exact: false }).first()

    await expect(menuLabel('权限管理')).toBeVisible()
    await expect(menuLabel('用户中心')).toBeVisible()
    await expect(menuLabel('求职中心')).toBeVisible()
    await expect(menuLabel('教学中心')).toBeVisible()
    await expect(menuLabel('财务中心')).toBeVisible()
    await expect(menuLabel('资源中心')).toBeVisible()
    await expect(menuLabel('个人中心')).toBeVisible()
  })
})
