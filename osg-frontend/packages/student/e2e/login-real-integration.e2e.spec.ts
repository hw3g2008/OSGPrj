import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'
import { reseedStudentDemoUser } from './support/student-demo-user'

const PASSWORD_RESET_LOG = path.resolve(
  __dirname,
  '../../../../osg-spec-docs/tasks/audit/password-reset-mailbox.log'
)

const STUDENT_EMAIL = 'student_demo@osg.local'
const STUDENT_USERNAME = 'student_demo'
const ORIGINAL_PASSWORD = 'student123'
const PASSWORD_RESET_RATE_LIMIT_KEY =
  'pwd_reset_code:127.0.0.1-com.ruoyi.web.controller.system.SysPasswordController-sendCode'

type MailboxEntry = {
  sentAt: string
  email: string
  code: string
}

function clearPasswordResetThrottle() {
  execFileSync(
    'redis-cli',
    [
      '-h',
      '47.94.213.128',
      '-p',
      '26379',
      '-a',
      'redis123456',
      '--raw',
      'DEL',
      PASSWORD_RESET_RATE_LIMIT_KEY
    ],
    { stdio: 'pipe' }
  )
}

async function waitForLatestResetCode(email: string, sinceMs: number): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (fs.existsSync(PASSWORD_RESET_LOG)) {
      const entries = fs
        .readFileSync(PASSWORD_RESET_LOG, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line) as MailboxEntry)
        .filter(entry => entry.email === email && Date.parse(entry.sentAt) >= sinceMs)

      const latestEntry = entries.at(-1)
      if (latestEntry?.code) {
        return latestEntry.code
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`No password reset mail entry found for ${email}`)
}

async function restoreOriginalPassword(
  request: { post: Function },
  sinceMs: number,
  password: string
) {
  clearPasswordResetThrottle()

  const sendResponse = await request.post('/api/system/password/sendCode', {
    data: { email: STUDENT_EMAIL },
  })
  const sendBody = await sendResponse.json()
  expect(sendResponse.ok()).toBeTruthy()
  expect(sendBody.code).toBe(200)

  const code = await waitForLatestResetCode(STUDENT_EMAIL, sinceMs)
  const verifyResponse = await request.post('/api/system/password/verify', {
    data: { email: STUDENT_EMAIL, code },
  })
  const verifyBody = await verifyResponse.json()
  const resetToken = verifyBody.data?.resetToken ?? verifyBody.resetToken
  expect(verifyResponse.ok()).toBeTruthy()
  expect(resetToken).toEqual(expect.any(String))

  const resetResponse = await request.post('/api/system/password/reset', {
    data: {
      email: STUDENT_EMAIL,
      password,
      resetToken,
    },
  })
  const resetBody = await resetResponse.json()
  expect(resetResponse.ok()).toBeTruthy()
  expect(resetBody.code).toBe(200)

  const loginResponse = await request.post('/api/student/login', {
    data: {
      username: STUDENT_USERNAME,
      password,
    },
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.ok()).toBeTruthy()
  expect(loginBody.code).toBe(200)
}

test.describe('student auth real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    reseedStudentDemoUser()
    clearPasswordResetThrottle()
    fs.rmSync(PASSWORD_RESET_LOG, { force: true })
  })

  test.afterAll(() => {
    clearPasswordResetThrottle()
    reseedStudentDemoUser()
  })

  test('student backend login endpoint succeeds without captcha for the student shell @student-s001-real-api', async ({ page }) => {
    const response = await page.request.post('/api/student/login', {
      data: {
        username: STUDENT_USERNAME,
        password: ORIGINAL_PASSWORD
      }
    })
    const body = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(body.code).toBe(200)
    expect(body.token).toEqual(expect.any(String))
  })

  test('student login page submits to the student auth endpoint and reaches dashboard @student-s001-real-submit', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#login-username').fill(STUDENT_USERNAME)
    await page.locator('#login-password').fill(ORIGINAL_PASSWORD)

    const loginResponsePromise = page.waitForResponse('**/api/student/login')
    await page.locator('#login-btn').click()

    const loginResponse = await loginResponsePromise
    const body = await loginResponse.json()

    expect(loginResponse.ok()).toBeTruthy()
    expect(body.code).toBe(200)
    await expect(page).toHaveURL(/\/dashboard$/)

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token).toEqual(expect.any(String))
  })

  test('student forgot-password page resets the real account and restores the original login baseline @student-s002-real-submit', async ({
    page,
    request,
  }) => {
    test.setTimeout(120000)
    const startedAt = Date.now()
    const nextPassword = `Stu${String(startedAt).slice(-6)}A1`
    let passwordChanged = false

    clearPasswordResetThrottle()
    fs.rmSync(PASSWORD_RESET_LOG, { force: true })

    try {
      await page.goto('/forgot-password')
      await page.getByPlaceholder('请输入注册邮箱').fill(STUDENT_EMAIL)
      const sendResponsePromise = page.waitForResponse('**/api/system/password/sendCode')
      await page.locator('#send-btn').click()
      const sendResponse = await sendResponsePromise
      const sendBody = await sendResponse.json()

      expect(sendResponse.ok()).toBeTruthy()
      expect(sendBody.code).toBe(200)
      await expect(page.locator('#step-2')).toHaveClass(/active/)
      await expect(page.locator('#step-2 .masked-email')).toContainText('验证码已发送至')
      const resetCode = await waitForLatestResetCode(STUDENT_EMAIL, startedAt)

      await page.locator('#fp-code').fill(resetCode)
      await page.locator('#verify-btn').click()
      await expect(page.locator('#step-3')).toBeVisible()

      await page.locator('#new-password').fill(nextPassword)
      await page.locator('#confirm-password').fill(nextPassword)
      await page.locator('#reset-btn').click()

      await expect(page.getByText('密码重置成功')).toBeVisible()
      passwordChanged = true

      await page.goto('/login')
      await page.locator('#login-username').fill(STUDENT_USERNAME)
      await page.locator('#login-password').fill(nextPassword)

      const loginResponsePromise = page.waitForResponse('**/api/student/login')
      await page.locator('#login-btn').click()
      const loginResponse = await loginResponsePromise
      const loginBody = await loginResponse.json()

      expect(loginResponse.ok()).toBeTruthy()
      expect(loginBody.code).toBe(200)
      await expect(page).toHaveURL(/\/dashboard$/)
    } finally {
      if (passwordChanged) {
        const restoreStartedAt = Date.now()
        await restoreOriginalPassword(request, restoreStartedAt, ORIGINAL_PASSWORD)
      } else {
        reseedStudentDemoUser()
      }
      clearPasswordResetThrottle()
    }
  })
})
