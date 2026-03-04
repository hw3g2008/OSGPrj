import { expect, type APIResponse, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'

const E2E_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 15000)
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123'
const ADMIN_CAPTCHA_CODE = process.env.E2E_CAPTCHA_CODE || '1234'
const REDIS_HOST = process.env.E2E_REDIS_HOST || '127.0.0.1'
const REDIS_PORT = process.env.E2E_REDIS_PORT || '26379'
const REDIS_PASSWORD = process.env.E2E_REDIS_PASSWORD || 'redis123456'
const REDIS_CONTAINER = process.env.E2E_REDIS_CONTAINER || 'osg_test-redis-1'

function asRegExpPath(path: string): RegExp {
  return new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`
}

function normalizeRedisGetOutput(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) {
    return null
  }
  let value = lines[lines.length - 1]
  if (value === '(nil)') {
    return null
  }
  value = value.replace(/^"(.*)"$/, '$1')
  return value || null
}

function readCaptchaFromRedis(uuid: string): string | null {
  if (!/^[a-f0-9]{32}$/i.test(uuid)) {
    return null
  }
  const key = `captcha_codes:${uuid}`
  const directCmd = [
    `REDISCLI_AUTH=${shellQuote(REDIS_PASSWORD)}`,
    'redis-cli',
    '--raw',
    '-h', REDIS_HOST,
    '-p', REDIS_PORT,
    'GET', key
  ].map((item, idx) => (idx === 0 ? item : shellQuote(item))).join(' ')
  try {
    const out = execSync(`bash -lc ${shellQuote(directCmd)}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const value = normalizeRedisGetOutput(out)
    if (value) {
      return value
    }
  } catch {
    // fallback to docker exec
  }

  const dockerInner = `REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --raw GET ${shellQuote(key)}`
  const dockerCmd = `docker exec ${shellQuote(REDIS_CONTAINER)} sh -lc ${shellQuote(dockerInner)}`
  try {
    const out = execSync(`bash -lc ${shellQuote(dockerCmd)}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const value = normalizeRedisGetOutput(out)
    if (value) {
      return value
    }
  } catch {
    return null
  }
  return null
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
  expect(body.code, `${endpointPath} should return code=200`).toBe(200)

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
  await newPasswordInput.fill(ADMIN_PASSWORD)
  await confirmPasswordInput.fill(ADMIN_PASSWORD)

  const submitPromise = waitForApi(page, '/api/system/user/profile/updateFirstLoginPwd', 'PUT')
  await page.getByRole('button', { name: '确认修改' }).click()
  await assertRuoyiSuccess(submitPromise, '/api/system/user/profile/updateFirstLoginPwd')
  await expect(modalTitle).toBeHidden({ timeout: E2E_TIMEOUT_MS })
}

export async function loginAsAdmin(page: Page): Promise<void> {
  const captchaResponsePromise = waitForApi(page, '/api/captchaImage', 'GET')
  await page.goto('/login')
  await expect(page).toHaveURL(asRegExpPath('/login'))

  const usernameInput = page.locator(
    'input[placeholder*="用户名"], input[placeholder*="账号"], input[type="text"]'
  ).first()
  const passwordInput = page.locator('input[type="password"]').first()
  const captchaInput = page.locator('input[placeholder*="验证码"]').first()
  const submitButton = page.locator('button[type="submit"], button:has-text("登录")').first()

  await expect(usernameInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })
  await expect(passwordInput).toBeVisible({ timeout: E2E_TIMEOUT_MS })

  await usernameInput.fill(ADMIN_USERNAME)
  await passwordInput.fill(ADMIN_PASSWORD)

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
    await captchaInput.fill(resolvedCaptchaCode || ADMIN_CAPTCHA_CODE)
  }

  const loginPromise = waitForApi(page, '/api/login', 'POST')
  const infoPromise = waitForApi(page, '/api/getInfo', 'GET')

  await submitButton.click()

  const loginBody = await assertRuoyiSuccess(loginPromise, '/api/login')
  expect(loginBody?.token || loginBody?.data?.token, '/api/login should include token').toBeTruthy()

  await assertRuoyiSuccess(infoPromise, '/api/getInfo')
  await page.waitForURL(asRegExpPath('/dashboard'), { timeout: E2E_TIMEOUT_MS })
  await dismissFirstLoginModalIfNeeded(page)
}
