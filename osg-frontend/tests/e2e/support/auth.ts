import { expect, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { resolveAuthRuntimeConfig } from './auth-config'
import { readRedisValue } from './redis-runtime'

const E2E_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 15000)
const authConfig = resolveAuthRuntimeConfig()

function asRegExpPath(path: string): RegExp {
  return new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}

function readCaptchaFromRedis(uuid: string): string | null {
  if (!/^[a-f0-9]{32}$/i.test(uuid)) {
    return null
  }
  const key = `captcha_codes:${uuid}`
  try {
    return readRedisValue(key)
  } catch {
    return null
  }
}

export async function requestCaptchaChallenge(request: APIRequestContext): Promise<{ uuid: string; code: string }> {
  const response = await request.get('/api/captchaImage')
  expect(response.ok(), '/api/captchaImage should return HTTP 2xx').toBeTruthy()

  const body = await response.json()
  expect(body.code, '/api/captchaImage should return code=200').toBe(200)
  expect(body.captchaEnabled, '/api/captchaImage should keep captcha enabled in dev/test').toBeTruthy()

  const uuid = typeof body.uuid === 'string' ? body.uuid : ''
  expect(uuid, '/api/captchaImage should include uuid').toBeTruthy()

  const code = readCaptchaFromRedis(uuid)
  expect(code, `/api/captchaImage uuid=${uuid} should resolve captcha value from redis`).toBeTruthy()

  return { uuid, code: code! }
}

export async function loginAsAdminApi(request: APIRequestContext): Promise<{ token: string }> {
  const captcha = await requestCaptchaChallenge(request)
  const loginResponse = await request.post('/api/login', {
    data: {
      username: authConfig.username,
      password: authConfig.password,
      code: captcha.code,
      uuid: captcha.uuid,
    },
  })
  const raw = await loginResponse.text()
  let loginBody: any
  try {
    loginBody = JSON.parse(raw)
  } catch {
    throw new Error(`/api/login should return JSON, raw=${raw.slice(0, 500)}`)
  }
  expect(
    loginBody.code,
    `/api/login should return code=200, username=${String(authConfig.username)}, passwordLength=${String(authConfig.password).length}, body=${JSON.stringify(loginBody).slice(0, 500)}`,
  ).toBe(200)
  const token = loginBody?.token || loginBody?.data?.token
  expect(token, '/api/login should include token').toBeTruthy()
  return { token }
}

export async function ensureAdminProfileEmail(request: APIRequestContext, email: string): Promise<void> {
  const { token } = await loginAsAdminApi(request)
  const headers = { Authorization: `Bearer ${token}` }
  const infoBody = await assertRuoyiSuccess(
    Promise.resolve(request.get(authConfig.infoPath, { headers })),
    authConfig.infoPath,
  )
  const user = infoBody.user || {}
  const userId = user.userId
  expect(userId, `${authConfig.infoPath} should expose user.userId for profile convergence checks`).toBeTruthy()
  const profileResponse = await request.put('/api/system/user/profile', {
    headers,
    data: {
      nickName: user.nickName || '管理员',
      email,
      phonenumber: user.phonenumber || '',
      sex: user.sex || '0',
    },
  })
  await assertRuoyiSuccess(Promise.resolve(profileResponse), '/api/system/user/profile')

  const deadline = Date.now() + E2E_TIMEOUT_MS
  while (Date.now() < deadline) {
    const userInfoBody = await assertRuoyiSuccess(
      Promise.resolve(request.get(`/api/system/user/${userId}`, { headers })),
      `/api/system/user/${userId}`,
    )
    const observedUser = userInfoBody?.data || {}
    const observedEmail = typeof observedUser.email === 'string' ? observedUser.email.trim() : ''
    if (observedEmail === email) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  throw new Error(`admin profile email did not converge to ${email} within ${E2E_TIMEOUT_MS}ms`)
}

function normalizeApiPath(path: string): string[] {
  if (path.startsWith('/api/')) {
    return [path, path.replace(/^\/api/, '')]
  }
  if (path.startsWith('/')) {
    return [path, `/api${path}`]
  }
  return [path]
}

export function waitForApi(page: Page, path: string, method: string = 'GET'): Promise<APIResponse> {
  const candidates = normalizeApiPath(path)
  return page.waitForResponse((response) => {
    if (response.request().method() !== method) {
      return false
    }
    const requestType = response.request().resourceType()
    if (requestType !== 'xhr' && requestType !== 'fetch') {
      return false
    }
    return candidates.some((candidate) => response.url().includes(candidate))
  }, { timeout: E2E_TIMEOUT_MS })
}

export async function assertRuoyiSuccess(
  responsePromise: Promise<APIResponse>,
  endpointPath: string
): Promise<any> {
  const response = await responsePromise
  expect(response.ok(), `${endpointPath} should return HTTP 2xx`).toBeTruthy()

  const raw = await response.text()
  let body: any
  try {
    body = JSON.parse(raw)
  } catch (error) {
    throw new Error(`${endpointPath} response should be valid JSON, got: ${raw.slice(0, 200)}`)
  }
  expect(body && typeof body === 'object', `${endpointPath} response body should be JSON object`).toBeTruthy()
  expect(
    body.code,
    `${endpointPath} should return code=200, body=${JSON.stringify(body).slice(0, 500)}`,
  ).toBe(200)

  return body
}

async function dismissFirstLoginModalIfNeeded(page: Page): Promise<void> {
  const modalTitle = page.getByText('首次登录 - 请修改密码').first()
  const visible = await modalTitle.isVisible().catch(() => false)
  if (!visible) {
    return
  }

  const newPasswordInput = page.locator('input[placeholder*="8-20位，包含字母和数字"]').first()
  const confirmPasswordInput = page.locator('input[placeholder*="请再次输入新密码"]').first()
  await expect(newPasswordInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })
  await expect(confirmPasswordInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })

  // 使用固定 E2E 密码消除首登弹窗干扰，不改变后续登录口径
  await newPasswordInput.fill(authConfig.password)
  await confirmPasswordInput.fill(authConfig.password)

  const submitPromise = waitForApi(page, '/api/system/user/profile/updateFirstLoginPwd', 'PUT')
  await page.getByRole('button', { name: '确认修改' }).click()
  await assertRuoyiSuccess(submitPromise, '/api/system/user/profile/updateFirstLoginPwd')
  await expect(modalTitle).toBeHidden({ timeout: E2E_TIMEOUT_MS })
}

export async function loginAsAdmin(page: Page): Promise<void> {
  const captchaResponsePromise = waitForApi(page, '/api/captchaImage', 'GET')
  await page.goto(authConfig.loginPath)
  await expect(page).toHaveURL(asRegExpPath(authConfig.loginPath))

  const usernameInput = page.locator(
    'input[placeholder*="用户名"], input[placeholder*="账号"], input[type="text"]'
  ).first()
  const passwordInput = page.locator('input[type="password"]').first()
  const captchaInput = page.locator('input[placeholder*="验证码"]').first()
  const submitButton = page.locator('button[type="submit"], button:has-text("登录")').first()

  await expect(usernameInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })
  await expect(passwordInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })

  await usernameInput.fill(authConfig.username)
  await passwordInput.fill(authConfig.password)

  let captchaUuid: string | undefined
  try {
    const captchaResponse = await captchaResponsePromise
    const captchaBody = await captchaResponse.json()
    captchaUuid = typeof captchaBody?.uuid === 'string' ? captchaBody.uuid : undefined
  } catch {
    // ignore; fallback to static captcha code
  }

  await page.waitForTimeout(1000)
  if (await captchaInput.isVisible()) {
    const resolvedCaptchaCode = captchaUuid ? readCaptchaFromRedis(captchaUuid) : null
    const fallbackCaptchaCode = authConfig.captchaCode.trim()
    const finalCaptchaCode = resolvedCaptchaCode || fallbackCaptchaCode
    if (!finalCaptchaCode) {
      throw new Error(`Failed to resolve captcha code for login uuid='${captchaUuid || 'unknown'}'`)
    }
    await captchaInput.fill(finalCaptchaCode)
  }

  const loginPromise = waitForApi(page, '/api/login', 'POST')
  const infoPromise = waitForApi(page, authConfig.infoPath, 'GET')

  await submitButton.click()

  const loginBody = await assertRuoyiSuccess(loginPromise, '/api/login')
  expect(loginBody?.token || loginBody?.data?.token, '/api/login should include token').toBeTruthy()

  await assertRuoyiSuccess(infoPromise, authConfig.infoPath)
  await page.waitForURL(asRegExpPath(authConfig.postLoginPath), { timeout: E2E_TIMEOUT_MS })
  await dismissFirstLoginModalIfNeeded(page)
}
