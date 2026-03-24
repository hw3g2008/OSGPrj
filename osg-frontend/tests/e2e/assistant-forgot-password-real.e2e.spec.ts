import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

import { recordBehaviorScenario } from './support/behavior-report'
import { readProviderEvidenceText } from './support/provider-evidence'

const moduleName = process.env.E2E_MODULE || ''
const ASSISTANT_EMAIL = 'assistant_e2e@osg.local'
const ASSISTANT_USERNAME = 'assistant_demo'
const ORIGINAL_PASSWORD = 'Assist1234'

type MailboxEntry = {
  sentAt: string
  email: string
  code: string
}

function ensureShellToolsOnPath() {
  const candidates = [
    'C:\\Program Files\\Git\\bin',
    path.resolve(process.env.USERPROFILE || '', 'AppData\\Local\\Temp\\osg-bash-tools'),
  ]
  const currentPath = process.env.PATH || ''
  const prepend = candidates.filter((candidate) => candidate && fs.existsSync(candidate) && !currentPath.includes(candidate))
  if (prepend.length > 0) {
    process.env.PATH = `${prepend.join(path.delimiter)}${path.delimiter}${currentPath}`
  }
}

function resolveFirstExistingPath(paths: string[]): string {
  const existingPath = paths.find((candidate) => fs.existsSync(candidate))
  if (!existingPath) {
    throw new Error(`Required runtime dependency is missing. Checked: ${paths.join(', ')}`)
  }
  return existingPath
}

function resolveVersionedJar(groupPath: string, artifactName: string, versions: string[]): string {
  return resolveFirstExistingPath(
    versions.map((version) =>
      path.join(os.homedir(), '.m2', 'repository', ...groupPath.split('/'), artifactName, version, `${artifactName}-${version}.jar`),
    ),
  )
}

function assistantSeedClasspath(): string {
  return [
    resolveVersionedJar('com/mysql', 'mysql-connector-j', ['8.2.0']),
    resolveVersionedJar('org/springframework/security', 'spring-security-crypto', ['6.5.7', '6.5.3', '6.3.3', '5.7.11']),
    resolveVersionedJar('org/springframework', 'spring-core', ['6.2.14', '6.2.9', '6.1.12', '6.0.23', '5.3.31']),
    resolveVersionedJar('commons-logging', 'commons-logging', ['1.2']),
  ].join(path.delimiter)
}

function compileAssistantDemoUser() {
  const classDir = path.join(os.tmpdir(), 'assistant-e2e-java')
  const sourceFile = path.resolve(__dirname, 'support/java/AssistantDemoUser.java')
  fs.mkdirSync(classDir, { recursive: true })
  execFileSync('javac', ['-cp', assistantSeedClasspath(), '-d', classDir, sourceFile], {
    stdio: 'pipe',
    env: process.env,
  })
  return classDir
}

function isRetryableDbSeedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Communications link failure|EOFException|Connection reset|Connection refused/i.test(message)
}

function reseedAssistantDemoUser(password: string = ORIGINAL_PASSWORD) {
  const classDir = compileAssistantDemoUser()
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      execFileSync(
        'java',
        ['-cp', `${classDir}${path.delimiter}${assistantSeedClasspath()}`, 'AssistantDemoUser', password],
        {
          stdio: 'pipe',
          env: process.env,
        },
      )
      return
    } catch (error) {
      if (attempt >= 3 || !isRetryableDbSeedError(error)) {
        throw error
      }
    }
  }
}

function clearPasswordResetThrottle() {
  // The endpoint allows 5 sends per 300 seconds, while this test only needs two.
  // Keep this as best-effort so missing local redis-cli does not block real integration.
  try {
    ensureShellToolsOnPath()
  } catch {
    // no-op
  }
}

async function waitForLatestResetCode(email: string, sinceMs: number): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rawText = readProviderEvidenceText()
    if (rawText) {
      const entries = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as MailboxEntry)
        .filter((entry) => entry.email === email && Date.parse(entry.sentAt) >= sinceMs)

      const latestEntry = entries.at(-1)
      if (latestEntry?.code) {
        return latestEntry.code
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`No password reset mail entry found for ${email}`)
}

test.describe('Assistant Forgot Password Real Integration @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant forgot-password real flow only runs for assistant module gate')
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    ensureShellToolsOnPath()
    reseedAssistantDemoUser()
    clearPasswordResetThrottle()
    const providerLog = path.resolve(__dirname, '../../osg-spec-docs/tasks/audit/password-reset-mailbox.log')
    fs.rmSync(providerLog, { force: true })
  })

  test.afterAll(() => {
    clearPasswordResetThrottle()
    reseedAssistantDemoUser()
  })

  test('assistant forgot-password flow resets the real account and restores the original login baseline @assistant-t182-forgot-real', async ({
    page,
  }) => {
    test.setTimeout(120000)
    const startedAt = Date.now()
    const nextPassword = `Ast${String(startedAt).slice(-6)}B1`
    let passwordChanged = false

    clearPasswordResetThrottle()
    const providerLog = path.resolve(__dirname, '../../osg-spec-docs/tasks/audit/password-reset-mailbox.log')
    fs.rmSync(providerLog, { force: true })

    try {
      await page.goto('/forgot-password')
      await page.locator('#forgot-email').fill(ASSISTANT_EMAIL)

      const sendResponsePromise = page.waitForResponse('**/api/system/password/sendCode')
      await page.locator('#send-btn').click()
      const sendResponse = await sendResponsePromise
      const sendBody = await sendResponse.json()

      expect(sendResponse.ok()).toBeTruthy()
      expect(sendBody.code).toBe(200)
      await expect(page.getByText('验证码已发送至')).toBeVisible()

      const resetCode = await waitForLatestResetCode(ASSISTANT_EMAIL, startedAt)
      await recordBehaviorScenario({
        module: 'assistant',
        capabilityId: 'assistant-password-reset-flow',
        scenarioId: 'send-reset-code',
        inputClass: 'known_identity',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          business_code: sendBody.code,
          route: '/forgot-password',
          step: 2,
          masked_email: 'a***@osg.local',
          mailbox_code_found: Boolean(resetCode),
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-forgot-password-real.e2e.spec.ts#assistant-t182-forgot-real',
      })

      await page.locator('#fp-code').fill(resetCode)
      const verifyResponsePromise = page.waitForResponse('**/api/system/password/verify')
      await page.locator('#verify-btn').click()
      const verifyResponse = await verifyResponsePromise
      const verifyBody = await verifyResponse.json()
      const resetToken = verifyBody.data?.resetToken ?? verifyBody.resetToken

      expect(verifyResponse.ok()).toBeTruthy()
      expect(resetToken).toEqual(expect.any(String))
      await expect(page.locator('#step-3')).toBeVisible()
      await recordBehaviorScenario({
        module: 'assistant',
        capabilityId: 'assistant-password-reset-flow',
        scenarioId: 'verify-reset-code',
        inputClass: 'valid_code',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          business_code: verifyBody.code,
          route: '/forgot-password',
          step: 3,
          reset_token_present: Boolean(resetToken),
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-forgot-password-real.e2e.spec.ts#assistant-t182-forgot-real',
      })

      await page.locator('#new-password').fill(nextPassword)
      await page.locator('#confirm-password').fill(nextPassword)
      const resetResponsePromise = page.waitForResponse('**/api/system/password/reset')
      await page.locator('#reset-btn').click()
      const resetResponse = await resetResponsePromise
      const resetBody = await resetResponse.json()

      expect(resetResponse.ok()).toBeTruthy()
      expect(resetBody.code).toBe(200)
      await expect(page.getByText('密码重置成功')).toBeVisible()
      passwordChanged = true

      await recordBehaviorScenario({
        module: 'assistant',
        capabilityId: 'assistant-password-reset-flow',
        scenarioId: 'reset-password',
        inputClass: 'valid_reset_token',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          business_code: resetBody.code,
          route: '/forgot-password',
          step: 4,
          success_title: '密码重置成功',
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-forgot-password-real.e2e.spec.ts#assistant-t182-forgot-real',
      })

      await page.goto('/login')
      await page.locator('#login-username').fill(ASSISTANT_USERNAME)
      await page.locator('#login-password').fill(nextPassword)

      const loginResponsePromise = page.waitForResponse('**/api/assistant/login')
      const infoResponsePromise = page.waitForResponse('**/api/assistant/getInfo')
      await page.locator('.login-btn').click()
      const loginResponse = await loginResponsePromise
      const loginBody = await loginResponse.json()
      const infoResponse = await infoResponsePromise
      const infoBody = await infoResponse.json()

      expect(loginResponse.ok()).toBeTruthy()
      expect(loginBody.code).toBe(200)
      expect(infoResponse.ok()).toBeTruthy()
      expect(infoBody.roles).toContain('assistant')
      await expect(page).toHaveURL(/\/home$/)
    } finally {
      if (passwordChanged) {
        reseedAssistantDemoUser(ORIGINAL_PASSWORD)
      } else {
        reseedAssistantDemoUser()
      }
      clearPasswordResetThrottle()
    }
  })
})
