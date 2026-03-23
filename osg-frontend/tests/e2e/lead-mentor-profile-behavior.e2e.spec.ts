import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess, ensureLeadMentorRuntimeCredentials, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const frontendBaseUrl = process.env.E2E_FRONTEND_BASE_URL || 'http://localhost:3003'
const backendBaseUrl = process.env.E2E_BACKEND_BASE_URL || 'http://127.0.0.1:28080'
const loginApiUrl = `${backendBaseUrl}/lead-mentor/login`
const infoApiUrl = `${backendBaseUrl}/lead-mentor/getInfo`
const changeRequestApiPath = '/lead-mentor/profile/change-request'

function resolveRepoRoot(): string {
  return path.resolve(__dirname, '../../..')
}

function ensureLeadMentorProfileSeed(): void {
  execFileSync(
    'python3',
    ['-c', `
from pathlib import Path
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

with conn.cursor() as cur:
    cur.execute(
        '''
        insert into osg_staff (
          staff_name, email, phone, staff_type, major_direction, sub_direction,
          region, city, hourly_rate, account_status, create_by, update_by, remark
        ) values (
          %s, %s, %s, 'lead_mentor', %s, %s, %s, %s, %s, 'active', 'codex', 'codex', %s
        )
        on duplicate key update
          staff_name = values(staff_name),
          phone = values(phone),
          staff_type = 'lead_mentor',
          major_direction = values(major_direction),
          sub_direction = values(sub_direction),
          region = values(region),
          city = values(city),
          hourly_rate = values(hourly_rate),
          account_status = 'active',
          update_by = 'codex',
          update_time = now(),
          remark = values(remark)
        ''',
        (
          'student_demo',
          'student_demo@osg.local',
          '13800001234',
          '金融 Finance',
          'Investment Banking / Capital Markets',
          '中国大陆',
          'Shanghai 上海',
          500,
          'Codex E2E lead-mentor profile seed',
        ),
    )

conn.commit()
conn.close()
`],
    {
      cwd: resolveRepoRoot(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
}

async function fetchLeadMentorProfile(token: string, requestPage: Page) {
  const responseBody = await assertRuoyiSuccess(
    Promise.resolve(requestPage.request.get(`${backendBaseUrl}/lead-mentor/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })),
    `${backendBaseUrl}/lead-mentor/profile`,
  )

  return responseBody?.data || {}
}

async function openProfilePage(page: Page) {
  await page.goto(`${frontendBaseUrl}/profile/basic`, { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/profile\/basic/)
  await expect(page.locator('#page-profile')).toBeVisible()
  await expect(page.locator('[data-surface-trigger="modal-lead-edit-profile"]')).toBeEnabled({ timeout: 30000 })

  return page.locator('#page-profile')
}

async function waitForCreatedRequests(
  token: string,
  initialPendingCount: number,
  expectedAfterValues: string[],
  page: Page,
): Promise<{ refreshedPayload: any; createdRequests: any[] }> {
  const deadline = Date.now() + 30000

  while (Date.now() < deadline) {
    const refreshedPayload = await fetchLeadMentorProfile(token, page)
    const pendingChanges = Array.isArray(refreshedPayload?.pendingChanges) ? refreshedPayload.pendingChanges : []
    const createdRequests = pendingChanges.filter((item: any) => expectedAfterValues.includes(item.afterValue))

    if (Number(refreshedPayload?.pendingCount || 0) > initialPendingCount && createdRequests.length > 0) {
      return { refreshedPayload, createdRequests }
    }

    await page.waitForTimeout(500)
  }

  throw new Error(`Pending profile change requests did not materialize within timeout for values: ${expectedAfterValues.join(', ')}`)
}

function nextPhoneValue(currentPhone: string): string {
  const suffix = String(Date.now()).slice(-4)
  if (currentPhone.includes(suffix)) {
    return `1390000${String(Number(suffix) + 1).padStart(4, '0')}`
  }
  return `1390000${suffix}`
}

async function loginAsLeadMentorRuntime(page: Page): Promise<string> {
  ensureLeadMentorRuntimeCredentials('student_demo', 'student123', 'student_demo@osg.local')

  const loginBody = await assertRuoyiSuccess(
    Promise.resolve(page.request.post(loginApiUrl, {
      data: {
        username: 'student_demo',
        password: 'student123',
      },
    })),
    loginApiUrl,
  )
  const token = loginBody?.token || loginBody?.data?.token
  expect(token, `${loginApiUrl} should include token`).toBeTruthy()

  const infoBody = await assertRuoyiSuccess(
    Promise.resolve(page.request.get(infoApiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })),
    infoApiUrl,
  )

  await page.addInitScript(({ nextToken, nextUser }) => {
    window.localStorage.clear()
    window.localStorage.setItem('osg_token', nextToken)
    window.localStorage.setItem('osg_user', JSON.stringify(nextUser))
  }, {
    nextToken: token,
    nextUser: {
      ...(infoBody?.user || {}),
      roles: Array.isArray(infoBody?.roles) ? infoBody.roles : [],
      permissions: Array.isArray(infoBody?.permissions) ? infoBody.permissions : [],
    },
  })

  await page.goto(`${frontendBaseUrl}/home`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  return token as string
}

test.describe('Lead Mentor Profile Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('submitting profile change records profile-change-request behavior evidence @lead-mentor-s046-profile-change-request', async ({
    page,
  }) => {
    test.setTimeout(180000)
    ensureLeadMentorProfileSeed()
    const token = await loginAsLeadMentorRuntime(page)

    const initialPayload = await fetchLeadMentorProfile(token, page)
    const initialProfile = initialPayload?.profile || {}
    const initialPendingCount = Number(initialPayload?.pendingCount || 0)
    const nextPhone = nextPhoneValue(String(initialProfile.phone || ''))
    const nextRegionArea = initialProfile.regionArea === '中国大陆' ? '北美' : '中国大陆'
    const nextRegionCity = nextRegionArea === '中国大陆' ? 'Shanghai 上海' : 'New York 纽约'
    const expectedAfterValues = [nextPhone, nextRegionArea, nextRegionCity]

    await openProfilePage(page)
    const trigger = page.locator('[data-surface-trigger="modal-lead-edit-profile"]')
    await expect(trigger).toBeVisible()
    await trigger.click()

    const modal = page.locator('[data-surface-id="modal-lead-edit-profile"]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('主攻方向、二级方向和课单价不可自行修改')
    await expect(modal.locator('text=主攻方向 *')).toHaveCount(0)
    await expect(modal.locator('text=二级方向 *')).toHaveCount(0)
    await expect(modal.locator('text=课单价 *')).toHaveCount(0)

    const phoneField = modal.locator('.form-input').nth(1)
    await phoneField.fill(nextPhone)
    await modal.locator('.region-row .form-select').nth(0).selectOption(nextRegionArea)
    await modal.locator('.region-row .form-select').nth(1).selectOption(nextRegionCity)

    const submitResponse = waitForApi(page, changeRequestApiPath, 'POST')
    await modal.getByRole('button', { name: '保存修改' }).click()
    await assertRuoyiSuccess(submitResponse, changeRequestApiPath)
    const { refreshedPayload, createdRequests } = await waitForCreatedRequests(
      token,
      initialPendingCount,
      expectedAfterValues,
      page,
    )

    expect(Number(refreshedPayload?.pendingCount || 0)).toBeGreaterThan(initialPendingCount)
    expect(createdRequests.length, 'reloaded profile should expose the freshly created pending requests').toBeGreaterThan(0)

    const feedbackText = await page.locator('.page-feedback--info').textContent()
    expect(feedbackText).toBeTruthy()
    expect(
      createdRequests.some((item: any) => feedbackText?.includes(`最近一条：${item.fieldLabel} -> ${item.afterValue}`)),
      'page feedback should expose one of the freshly created pending requests',
    ).toBeTruthy()

    const latestCreatedRequest = createdRequests[0]
    const createdRequestId = latestCreatedRequest?.changeRequestId
    const createdCount = createdRequests.length

    expect(initialProfile.staffId, 'profile-change-request should keep the scoped staffId').toBeTruthy()
    expect(createdRequestId, 'profile-change-request should expose a real changeRequestId after reload').toBeTruthy()

    await recordBehaviorScenario({
      capabilityId: 'profile-change-request',
      scenarioId: 'submit-profile-change',
      inputClass: 'change_request',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/profile/basic',
        staffId: initialProfile.staffId,
        changeRequestId: createdRequestId,
        createdCount,
        pendingCountAfterReload: refreshedPayload.pendingCount,
        fields: createdRequests.map((item: any) => ({
          fieldKey: item.fieldKey,
          afterValue: item.afterValue,
          status: item.status,
        })),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-profile-behavior.e2e.spec.ts#lead-mentor-s046-profile-change-request',
    })
  })
})
