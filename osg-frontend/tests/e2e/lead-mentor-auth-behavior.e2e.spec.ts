import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { assertRuoyiSuccess, ensureLeadMentorRuntimeCredentials } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'
import { buildIpRateLimitKey, deleteRedisKeys } from './support/redis-runtime'
import { readProviderEvidenceText } from './support/provider-evidence'
import { normalizeRuntimeEnvValue } from './support/runtime-env'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const leadMentorLoginPath = '/api/lead-mentor/login'
const leadMentorInfoPath = '/api/lead-mentor/getInfo'
const passwordSendCodePath = '/api/system/password/sendCode'
const passwordVerifyPath = '/api/system/password/verify'
const passwordResetPath = '/api/system/password/reset'
const leadMentorUsername =
  normalizeRuntimeEnvValue(process.env.E2E_LEAD_MENTOR_USERNAME) ||
  normalizeRuntimeEnvValue(process.env.E2E_ADMIN_USERNAME) ||
  'lead_mentor_demo'
const leadMentorPassword =
  normalizeRuntimeEnvValue(process.env.E2E_LEAD_MENTOR_PASSWORD) ||
  normalizeRuntimeEnvValue(process.env.E2E_ADMIN_PASSWORD) ||
  'Osg@2026'
const leadMentorEmail = normalizeRuntimeEnvValue(process.env.E2E_LEAD_MENTOR_EMAIL) || 'lead_mentor_demo@osg.local'

interface ForbiddenLeadMentorAccount {
  username: string
  password: string
  email: string
}

function resolveRepoRoot(): string {
  return path.resolve(__dirname, '../../..')
}

function ensureForbiddenLeadMentorAccount(): ForbiddenLeadMentorAccount {
  const output = execFileSync(
    'python3',
    ['-c', `
from pathlib import Path
import json
import bcrypt
import pymysql
import re

vals = {}
for line in Path('deploy/.env.dev').read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    vals[key.strip()] = value.strip().strip('"').strip("'")

url = vals['SPRING_DATASOURCE_DRUID_MASTER_URL']
match = re.match(r'jdbc:mysql://([^:/]+)(?::(\\d+))?/([^?]+)', url)
host = match.group(1)
port = int(match.group(2) or 3306)
database = match.group(3)

conn = pymysql.connect(
    host=host,
    port=port,
    user=vals['SPRING_DATASOURCE_DRUID_MASTER_USERNAME'],
    password=vals['SPRING_DATASOURCE_DRUID_MASTER_PASSWORD'],
    database=database,
    charset='utf8mb4',
)
username = 'leadmentor_forbidden_e2e'
email = 'leadmentor_forbidden_e2e@osg.local'
password = 'Osg@2026'
nick_name = 'Lead Mentor Forbidden E2E'
remark = 'Codex E2E unauthorized lead-mentor account'
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

with conn.cursor() as cur:
    cur.execute("select user_id from sys_user where user_name = %s limit 1", (username,))
    existing = cur.fetchone()
    if existing:
        user_id = existing[0]
        cur.execute(
            '''
            update sys_user
               set nick_name = %s,
                   email = %s,
                   password = %s,
                   status = '0',
                   del_flag = '0',
                   user_type = '00',
                   first_login = '0',
                   update_by = 'codex',
                   update_time = now(),
                   remark = %s
             where user_id = %s
            ''',
            (nick_name, email, password_hash, remark, user_id),
        )
        cur.execute('delete from sys_user_role where user_id = %s', (user_id,))
    else:
        cur.execute(
            '''
            insert into sys_user (
              dept_id, user_name, nick_name, user_type, email, phonenumber, sex,
              avatar, password, status, del_flag, create_by, create_time, update_by,
              update_time, remark, first_login
            ) values (
              null, %s, %s, '00', %s, '', '0', '', %s, '0', '0',
              'codex', now(), 'codex', now(), %s, '0'
            )
            ''',
            (username, nick_name, email, password_hash, remark),
        )
        user_id = cur.lastrowid
        cur.execute('delete from sys_user_role where user_id = %s', (user_id,))

conn.commit()
conn.close()
print(json.dumps({'username': username, 'password': password, 'email': email}))
`],
    {
      cwd: resolveRepoRoot(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  return JSON.parse(output.trim()) as ForbiddenLeadMentorAccount
}

async function waitForResetCodeFromProviderLog(email: string, notBeforeMs: number): Promise<string> {
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
          // ignore malformed lines
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Reset code evidence not found in provider log for ${email}`)
}

function resetPasswordSendRateLimit(): void {
  deleteRedisKeys([buildIpRateLimitKey({
    keyPrefix: 'pwd_reset_code:',
    targetClass: 'com.ruoyi.web.controller.system.SysPasswordController',
    methodName: 'sendCode',
  })])
}

test.describe('Lead Mentor Auth Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('lead-mentor login records accepted and unauthorized-role behavior evidence @lead-mentor-s039-auth-login', async ({ page }) => {
    test.setTimeout(90000)
    ensureLeadMentorRuntimeCredentials(leadMentorUsername, leadMentorPassword, leadMentorEmail)

    const validLoginBody = await assertRuoyiSuccess(
      Promise.resolve(page.request.post(leadMentorLoginPath, {
        data: {
          username: leadMentorUsername,
          password: leadMentorPassword,
        },
      })),
      leadMentorLoginPath,
    )
    const token = validLoginBody?.token || validLoginBody?.data?.token
    expect(token, `${leadMentorLoginPath} should return token for authorized lead-mentor`).toBeTruthy()

    const infoBody = await assertRuoyiSuccess(
      Promise.resolve(page.request.get(leadMentorInfoPath, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })),
      leadMentorInfoPath,
    )

    await recordBehaviorScenario({
      capabilityId: 'auth-login',
      scenarioId: 'valid-lead-mentor',
      inputClass: 'authorized_role',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        token_present: Boolean(token),
        roles: Array.isArray(infoBody?.roles) ? infoBody.roles : [],
        route: '/home',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-auth-behavior.e2e.spec.ts#lead-mentor-s039-auth-login',
    })

    const forbiddenAccount = ensureForbiddenLeadMentorAccount()
    const forbiddenResponse = await page.request.post(leadMentorLoginPath, {
      data: {
        username: forbiddenAccount.username,
        password: forbiddenAccount.password,
      },
    })
    expect(forbiddenResponse.ok(), `${leadMentorLoginPath} unauthorized role should still return HTTP 2xx`).toBeTruthy()
    const forbiddenBody = await forbiddenResponse.json()
    const forbiddenObservedResult = forbiddenBody?.code === 200 ? 'accepted' : 'rejected'

    await recordBehaviorScenario({
      capabilityId: 'auth-login',
      scenarioId: 'non-lead-mentor-role',
      inputClass: 'unauthorized_role',
      expectedResult: 'rejected',
      observedResult: forbiddenObservedResult,
      observableResponse: {
        business_code: forbiddenBody?.code ?? null,
        message: forbiddenBody?.msg ?? null,
        token_present: Boolean(forbiddenBody?.token || forbiddenBody?.data?.token),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-auth-behavior.e2e.spec.ts#lead-mentor-s039-auth-login',
    })
  })

  test('forgot-password send-verify-reset records behavior evidence and restores password @lead-mentor-s039-auth-forgot-password', async ({ page }) => {
    test.setTimeout(180000)
    ensureLeadMentorRuntimeCredentials(leadMentorUsername, leadMentorPassword, leadMentorEmail)
    const temporaryPassword = `Stud${String(Date.now()).slice(-6)}1`

    const runResetCycle = async (nextPassword: string) => {
      await page.goto('/login')
      await page.locator('[data-surface-trigger="modal-forgot-password"]').click()

      const modal = page.locator('[data-surface-id="modal-forgot-password"]').first()
      await modal.locator('input[placeholder*="邮箱"]').fill(leadMentorEmail)

      resetPasswordSendRateLimit()
      const sendStartedAt = Date.now()
      const sendCodePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST' && response.url().includes(passwordSendCodePath)
      })
      await modal.locator('button:has-text("发送验证码")').click()
      const sendCodeBody = await assertRuoyiSuccess(sendCodePromise, passwordSendCodePath)

      await expect(modal.getByText('验证码已发送至')).toBeVisible({ timeout: 10000 })
      const resetCode = await waitForResetCodeFromProviderLog(leadMentorEmail, sendStartedAt)
      await modal.locator('input[placeholder*="6位验证码"]').fill(resetCode)

      const verifyPromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST' && response.url().includes(passwordVerifyPath)
      })
      await modal.getByRole('button', { name: /验\s*证/ }).click()
      const verifyBody = await assertRuoyiSuccess(verifyPromise, passwordVerifyPath)
      const resetToken = verifyBody?.data?.resetToken
      expect(resetToken, `${passwordVerifyPath} should return resetToken`).toBeTruthy()

      await expect(modal.locator('input[placeholder*="8-20位，包含字母和数字"]')).toBeVisible({ timeout: 10000 })
      await modal.locator('input[placeholder*="8-20位，包含字母和数字"]').fill(nextPassword)
      await modal.locator('input[placeholder*="请再次输入新密码"]').fill(nextPassword)

      const resetPromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST' && response.url().includes(passwordResetPath)
      })
      await modal.getByRole('button', { name: /重\s*置\s*密\s*码/ }).click()
      const resetBody = await assertRuoyiSuccess(resetPromise, passwordResetPath)

      await expect(modal.getByText('密码重置成功')).toBeVisible({ timeout: 10000 })
      return { sendCodeBody, verifyBody, resetBody }
    }

    const firstCycle = await runResetCycle(temporaryPassword)

    const temporaryLoginBody = await assertRuoyiSuccess(
      Promise.resolve(page.request.post(leadMentorLoginPath, {
        data: {
          username: leadMentorUsername,
          password: temporaryPassword,
        },
      })),
      leadMentorLoginPath,
    )

    const secondCycle = await runResetCycle(leadMentorPassword)

    const restoredLoginBody = await assertRuoyiSuccess(
      Promise.resolve(page.request.post(leadMentorLoginPath, {
        data: {
          username: leadMentorUsername,
          password: leadMentorPassword,
        },
      })),
      leadMentorLoginPath,
    )

    await recordBehaviorScenario({
      capabilityId: 'auth-forgot-password',
      scenarioId: 'send-verify-reset',
      inputClass: 'reset_flow',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        email: leadMentorEmail,
        send_code_message: firstCycle.sendCodeBody?.msg ?? null,
        verify_business_code: firstCycle.verifyBody?.code ?? null,
        reset_token_present: Boolean(firstCycle.verifyBody?.data?.resetToken),
        reset_business_code: firstCycle.resetBody?.code ?? null,
        temporary_login_token_present: Boolean(temporaryLoginBody?.token || temporaryLoginBody?.data?.token),
        restore_business_code: secondCycle.resetBody?.code ?? null,
        restored_login_token_present: Boolean(restoredLoginBody?.token || restoredLoginBody?.data?.token),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-auth-behavior.e2e.spec.ts#lead-mentor-s039-auth-forgot-password',
    })
  })
})
