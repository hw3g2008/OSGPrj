import { expect, test } from '@playwright/test'

import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

function waitForAssistantApi(
  page: import('@playwright/test').Page,
  urlPart: string,
  method: 'GET' | 'POST' = 'GET',
) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') &&
      response.url().includes(urlPart),
    { timeout: 45000 },
  )
}

async function clearAssistantAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem('osg_token')
    window.localStorage.removeItem('osg_user')
  })
}

test.describe('Assistant Login Shell @assistant @ui-smoke @ui-only', () => {
  test.skip(moduleName !== 'assistant', 'assistant shell contract only runs for assistant module gate')

  test('assistant login shell keeps prototype anchors and forgot-password route @assistant-t177-login-shell', async ({
    page,
  }) => {
    await clearAssistantAuth(page)
    await page.goto('/login')

    await expect(page.locator('#login-page')).toBeVisible()
    await expect(page.locator('.login-logo')).toContainText('OSG Assistant')
    await expect(page.locator('.login-title')).toBeVisible()
    await expect(page.locator('.login-role-tag')).toBeVisible()
    await expect(page.locator('.login-btn')).toBeVisible()
    await expect(page.locator('.login-links')).toContainText(/重置|reset/i)
    await expect(page.locator('.login-feature')).toHaveCount(4)

    const passwordInput = page.locator('#login-password')
    await passwordInput.fill('RealPass123!')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await page.locator('.pwd-toggle').click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await page.locator('.pwd-toggle').click()
    await expect(passwordInput).toHaveAttribute('type', 'password')

    await page.locator('.login-links a').click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.locator('.login-title')).toBeVisible()
    await expect(page.locator('.steps')).toBeVisible()
    await expect(page.locator('.back-link')).toBeVisible()
  })
})

test.describe('Assistant Login Flow @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant auth flow only runs for assistant module gate')

  test('valid assistant credentials redirect to /home @assistant-t179-login-success', async ({ page }) => {
    test.setTimeout(90000)

    await clearAssistantAuth(page)
    await page.goto('/login')

    await page.locator('#login-username').fill('admin')
    await page.locator('#login-password').fill('Osg@2026')

    const loginResponsePromise = waitForAssistantApi(page, '/api/assistant/login', 'POST')
    const infoResponsePromise = waitForAssistantApi(page, '/api/assistant/getInfo', 'GET')

    await page.locator('.login-btn').click()

    const response = await loginResponsePromise
    const loginBody = await response.json()
    expect(response.status()).toBe(200)
    expect(response.ok()).toBeTruthy()
    expect(loginBody.code).toBe(200)
    expect(loginBody.token).toBeTruthy()

    const infoResponse = await infoResponsePromise
    const infoBody = await infoResponse.json()
    expect(infoResponse.status()).toBe(200)
    expect(infoResponse.ok()).toBeTruthy()
    expect(infoBody.code).toBe(200)
    expect(infoBody.roles).toContain('assistant')

    await page.waitForURL(/\/home/, { timeout: 45000 })

    const token = await page.evaluate(() => window.localStorage.getItem('osg_token'))
    expect(token).toBeTruthy()

    await recordBehaviorScenario({
      capabilityId: 'assistant-login-access',
      scenarioId: 'valid-assistant-credentials',
      inputClass: 'valid_credentials',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/home',
        token,
        roles: infoBody.roles,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-login.e2e.spec.ts#assistant-t179-login-success',
    })
  })

  test('invalid credentials stay on /login and surface backend error @assistant-t179-login-invalid', async ({ page }) => {
    test.setTimeout(90000)

    await clearAssistantAuth(page)
    await page.goto('/login')

    await page.locator('#login-username').fill('admin')
    await page.locator('#login-password').fill('WrongPassword123')

    const loginResponsePromise = waitForAssistantApi(page, '/api/assistant/login', 'POST')

    await page.locator('.login-btn').click()

    const response = await loginResponsePromise
    const loginBody = await response.json()
    expect(response.status()).toBe(200)
    expect(response.ok()).toBeTruthy()
    expect(loginBody.code).toBe(401)
    await expect(page.locator('.login-error')).toContainText(loginBody.msg)
    await expect(page).toHaveURL(/\/login/)

    await recordBehaviorScenario({
      capabilityId: 'assistant-login-access',
      scenarioId: 'invalid-credentials',
      inputClass: 'invalid_credentials',
      expectedResult: 'rejected',
      observedResult: 'rejected',
      observableResponse: {
        route: '/login',
        business_code: loginBody.code,
        message: loginBody.msg,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-login.e2e.spec.ts#assistant-t179-login-invalid',
    })
  })

  test('non-assistant accounts are rejected with a single assistant boundary error @assistant-t179-login-boundary', async ({
    page,
  }) => {
    test.setTimeout(90000)

    await clearAssistantAuth(page)
    await page.goto('/login')

    await page.locator('#login-username').fill('student_demo')
    await page.locator('#login-password').fill('student123')

    const loginResponsePromise = waitForAssistantApi(page, '/api/assistant/login', 'POST')

    await page.locator('.login-btn').click()

    const response = await loginResponsePromise
    const loginBody = await response.json()
    expect(response.status()).toBe(200)
    expect(response.ok()).toBeTruthy()
    expect(loginBody.code).toBe(403)
    await expect(page.locator('.login-error')).toContainText(loginBody.msg)
    await expect(page).toHaveURL(/\/login/)

    const token = await page.evaluate(() => window.localStorage.getItem('osg_token'))
    expect(token).toBeFalsy()

    await recordBehaviorScenario({
      capabilityId: 'assistant-login-access',
      scenarioId: 'non-assistant-role',
      inputClass: 'unauthorized_role',
      expectedResult: 'rejected',
      observedResult: 'rejected',
      observableResponse: {
        route: '/login',
        business_code: loginBody.code,
        message: loginBody.msg,
        token_present: Boolean(token),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-login.e2e.spec.ts#assistant-t179-login-boundary',
    })
  })
})
