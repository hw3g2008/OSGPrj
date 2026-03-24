import { test, expect } from '@playwright/test'
import { ensureAdminProfileEmail, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'
import { readProviderEvidenceText } from './support/provider-evidence'
import { normalizeRuntimeEnvValue } from './support/runtime-env'
import { buildIpRateLimitKey, deleteRedisKeys } from './support/redis-runtime'

test.describe('Forgot Password @ui-smoke @ui-only', () => {
  test('forgot password modal can be opened from login page @perm-s002-forgot-entry', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    await expect(page.locator('[data-surface-id="modal-forgot-password"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('forgot password form shows email input @perm-s002-forgot-form', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()
    await expect(page.locator('[data-surface-id="modal-forgot-password"] input').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Forgot Password @api', () => {
  async function waitForResetCodeFromProviderLog(email: string, notBeforeMs: number): Promise<string> {
    const providerLogPath = process.env.PASSWORD_RESET_PROVIDER_LOG_PATH
    expect(providerLogPath, 'PASSWORD_RESET_PROVIDER_LOG_PATH must be configured for real delivery evidence').toBeTruthy()

    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      const evidenceText = readProviderEvidenceText(process.env)
      if (evidenceText) {
        const lines = evidenceText.trim().split(/\r?\n/).filter(Boolean)
        for (const line of lines.reverse()) {
          try {
            const entry = JSON.parse(line)
            const sentAtMs = Date.parse(entry?.sentAt || '')
            if (
              entry?.email === email &&
              typeof entry?.code === 'string' &&
              /^\d{6}$/.test(entry.code) &&
              Number.isFinite(sentAtMs) &&
              sentAtMs >= notBeforeMs
            ) {
              return entry.code
            }
          } catch {
            // ignore malformed lines and keep polling
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error(`Reset code evidence not found in provider log for ${email}`)
  }

  async function ensureResetEmailReady(page: import('@playwright/test').Page, email: string) {
    await ensureAdminProfileEmail(page.request, email)
  }

  async function resetIpRateLimiterBucket(): Promise<void> {
    const rateLimitKey = buildIpRateLimitKey({
      keyPrefix: 'pwd_reset_code:',
      targetClass: 'com.ruoyi.web.controller.system.SysPasswordController',
      methodName: 'sendCode',
    })
    deleteRedisKeys([rateLimitKey])
  }

  test('4-step forgot password flow completes @perm-s002-forgot-flow', async ({ page }) => {
    test.setTimeout(120000)

    const adminPassword = normalizeRuntimeEnvValue(process.env.E2E_ADMIN_PASSWORD) || 'Osg@2026'
    const e2eEmail = normalizeRuntimeEnvValue(process.env.E2E_RESET_EMAIL) || 'test@example.com'
    const newPassword = normalizeRuntimeEnvValue(process.env.E2E_RESET_PASSWORD) || adminPassword

    await ensureResetEmailReady(page, e2eEmail)
    await resetIpRateLimiterBucket()

    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()

    const modal = page.locator('[data-surface-id="modal-forgot-password"]').first()
    const emailInput = modal.locator('input[placeholder*="邮箱"]').first()
    await emailInput.fill(e2eEmail)

    const sendCodePromise = waitForApi(page, '/api/system/password/sendCode', 'POST')
    const requestStartedAt = Date.now()
    await modal.locator('button:has-text("发送验证码")').click()
    const sendCodeResponse = await sendCodePromise
    expect(sendCodeResponse.ok(), '/api/system/password/sendCode should return HTTP 2xx').toBeTruthy()
    expect(sendCodeResponse.status(), '/api/system/password/sendCode should return HTTP 200').toBe(200)
    const sendCodeBody = await sendCodeResponse.json()
    expect(sendCodeBody.code, '/api/system/password/sendCode should return business code=200').toBe(200)

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-send-code',
      scenarioId: 'known-identity',
      inputClass: 'known_identity',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        http_status: sendCodeResponse.status(),
        business_code: sendCodeBody.code,
        message: sendCodeBody.msg ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-forgot-flow-send-code',
    })

    await expect(modal.getByText('验证码已发送至')).toBeVisible({ timeout: 10000 })

    const e2eCode = await waitForResetCodeFromProviderLog(e2eEmail, requestStartedAt)
    await modal.locator('input[placeholder*="6位验证码"]').fill(e2eCode)
    const verifyPromise = waitForApi(page, '/api/system/password/verify', 'POST')
    await modal.getByRole('button', { name: /验\s*证/ }).click()
    const verifyResponse = await verifyPromise
    const verifyBody = await verifyResponse.json()
    expect(verifyBody.code, '/api/system/password/verify should return business code=200').toBe(200)
    const resetToken = verifyBody?.data?.resetToken
    expect(resetToken, '/api/system/password/verify should return resetToken').toBeTruthy()

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-verify-code',
      scenarioId: 'valid-code',
      inputClass: 'valid_code',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        http_status: verifyResponse.status(),
        business_code: verifyBody.code,
        message: verifyBody.msg ?? null,
        reset_token_present: Boolean(resetToken),
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-forgot-flow-verify',
    })

    // verify 成功后 UI 必须进入 Step 3（即出现新密码输入框）
    await expect(modal.locator('input[placeholder*="8-20位，包含字母和数字"]')).toBeVisible({ timeout: 10000 })

    await modal.locator('input[placeholder*="8-20位，包含字母和数字"]').fill(newPassword)
    await modal.locator('input[placeholder*="请再次输入新密码"]').fill(newPassword)
    const resetPromise = waitForApi(page, '/api/system/password/reset', 'POST')
    await modal.getByRole('button', { name: /重\s*置\s*密\s*码/ }).click()
    const resetResponse = await resetPromise
    const resetBody = await resetResponse.json()
    expect(resetBody.code, '/api/system/password/reset should return business code=200').toBe(200)

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-reset-password',
      scenarioId: 'valid-reset-token',
      inputClass: 'valid_reset_token',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        http_status: resetResponse.status(),
        business_code: resetBody.code,
        message: resetBody.msg ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-forgot-flow-reset',
    })

    // reset 成功后 UI 必须进入完成态
    await expect(modal.getByText('密码重置成功')).toBeVisible({ timeout: 10000 })
  })

  test('unknown identity keeps same observable send-code response @perm-s002-forgot-unknown-identity', async ({ page }) => {
    const unknownEmail = 'unknown-behavior-check@example.com'
    await resetIpRateLimiterBucket()
    const response = await page.request.post('/api/system/password/sendCode', {
      data: { email: unknownEmail },
    })
    expect(response.ok(), '/api/system/password/sendCode unknown-identity should return HTTP 2xx').toBeTruthy()
    const body = await response.json()
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-send-code',
      scenarioId: 'unknown-identity',
      inputClass: 'unknown_identity',
      expectedResult: 'accepted',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-forgot-unknown-identity',
    })
  })

  test('invalid reset code is rejected @perm-s002-verify-invalid-code', async ({ page }) => {
    const email = normalizeRuntimeEnvValue(process.env.E2E_RESET_EMAIL) || 'test@example.com'
    await ensureResetEmailReady(page, email)
    await resetIpRateLimiterBucket()
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()

    const modal = page.locator('[data-surface-id="modal-forgot-password"]').first()
    await modal.locator('input[placeholder*="邮箱"]').fill(email)

    const sendCodePromise = waitForApi(page, '/api/system/password/sendCode', 'POST')
    await modal.locator('button:has-text("发送验证码")').click()
    const sendCodeResponse = await sendCodePromise
    expect(sendCodeResponse.ok(), '/api/system/password/sendCode invalid-code setup should return HTTP 2xx').toBeTruthy()
    const sendCodeBody = await sendCodeResponse.json()
    expect(sendCodeBody.code, '/api/system/password/sendCode invalid-code setup should return business code=200').toBe(200)
    await expect(modal.getByText('验证码已发送至')).toBeVisible({ timeout: 10000 })

    await modal.locator('input[placeholder*="6位验证码"]').fill('000000')
    const responsePromise = waitForApi(page, '/api/system/password/verify', 'POST')
    await modal.getByRole('button', { name: /验\s*证/ }).click()
    const response = await responsePromise
    expect(response.ok(), '/api/system/password/verify invalid-code should return HTTP 2xx').toBeTruthy()
    const body = await response.json()
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    const errorMessages = page.locator('.ant-message-notice').filter({ hasText: body?.msg ?? '验证码错误' })
    await expect(errorMessages).toHaveCount(1, { timeout: 5000 })
    const visibleErrorMessageCount = await errorMessages.count()

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-verify-code',
      scenarioId: 'invalid-code',
      inputClass: 'invalid_code',
      expectedResult: 'rejected',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? null,
        error_owner: 'component_local',
        visible_error_message_count: visibleErrorMessageCount,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-verify-invalid-code',
    })
  })

  test('repeated invalid reset-code submissions reuse a single visible error toast @perm-s002-verify-invalid-code-dedupe', async ({ page }) => {
    const email = normalizeRuntimeEnvValue(process.env.E2E_RESET_EMAIL) || 'test@example.com'
    await ensureResetEmailReady(page, email)
    await resetIpRateLimiterBucket()
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()

    const modal = page.locator('[data-surface-id="modal-forgot-password"]').first()
    await modal.locator('input[placeholder*="邮箱"]').fill(email)

    const sendCodePromise = waitForApi(page, '/api/system/password/sendCode', 'POST')
    await modal.locator('button:has-text("发送验证码")').click()
    const sendCodeResponse = await sendCodePromise
    expect(sendCodeResponse.ok(), '/api/system/password/sendCode invalid-code dedupe setup should return HTTP 2xx').toBeTruthy()
    const sendCodeBody = await sendCodeResponse.json()
    expect(sendCodeBody.code, '/api/system/password/sendCode invalid-code dedupe setup should return business code=200').toBe(200)
    await expect(modal.getByText('验证码已发送至')).toBeVisible({ timeout: 10000 })

    await modal.locator('input[placeholder*="6位验证码"]').fill('000000')
    const verifyButton = modal.getByRole('button', { name: /验\s*证/ })

    let responsePromise = waitForApi(page, '/api/system/password/verify', 'POST')
    await verifyButton.click()
    let response = await responsePromise
    expect(response.ok(), '/api/system/password/verify invalid-code first submission should return HTTP 2xx').toBeTruthy()

    await page.waitForTimeout(800)

    responsePromise = waitForApi(page, '/api/system/password/verify', 'POST')
    await verifyButton.click()
    response = await responsePromise
    expect(response.ok(), '/api/system/password/verify invalid-code repeated submission should return HTTP 2xx').toBeTruthy()

    const body = await response.json()
    const dedupedErrorMessages = page.locator('.ant-message-notice').filter({ hasText: body?.msg ?? '验证码错误' })
    await page.waitForTimeout(300)
    expect(await dedupedErrorMessages.count()).toBe(1)
  })

  test('expired reset code is rejected @perm-s002-verify-expired-code', async ({ page }) => {
    const response = await page.request.post('/api/system/password/verify', {
      data: {
        email: 'expired-code-check@example.com',
        code: '123456',
      },
    })
    expect(response.ok(), '/api/system/password/verify expired-code should return HTTP 2xx').toBeTruthy()
    const body = await response.json()
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-verify-code',
      scenarioId: 'expired-code',
      inputClass: 'expired_code',
      expectedResult: 'rejected',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-verify-expired-code',
    })
  })

  test('invalid reset token is rejected @perm-s002-reset-invalid-token', async ({ page }) => {
    const email = normalizeRuntimeEnvValue(process.env.E2E_RESET_EMAIL) || 'test@example.com'
    await ensureResetEmailReady(page, email)
    const response = await page.request.post('/api/system/password/reset', {
      data: {
        email,
        password: normalizeRuntimeEnvValue(process.env.E2E_RESET_PASSWORD) || 'Osg@2026',
        resetToken: 'invalid-reset-token',
      },
    })
    expect(response.ok(), '/api/system/password/reset invalid-reset-token should return HTTP 2xx').toBeTruthy()
    const body = await response.json()
    const observedResult = response.ok() && body?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'forgot-password-reset-password',
      scenarioId: 'invalid-reset-token',
      inputClass: 'invalid_reset_token',
      expectedResult: 'rejected',
      observedResult,
      observableResponse: {
        http_status: response.status(),
        business_code: body?.code ?? null,
        message: body?.msg ?? null,
      },
      evidenceRef: 'osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-reset-invalid-token',
    })
  })
})
