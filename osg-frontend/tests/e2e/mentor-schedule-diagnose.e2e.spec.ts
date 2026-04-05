import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { assertRuoyiSuccess } from './support/auth'

const backendBaseUrl = process.env.E2E_BACKEND_URL || process.env.BASE_URL || 'http://127.0.0.1:28080'
const frontendBaseUrl = process.env.E2E_FRONTEND_BASE_URL || 'http://127.0.0.1:3002'
const evidenceDir = '/Users/hw/workspace/OSGPrj/screenshots/mentor-regression/final-rerun/page-schedule'

function currentWeekStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}

function blankPayload(weekStartDate: string) {
  return {
    weekStartDate,
    totalHours: 0,
    monday: 'unavailable',
    tuesday: 'unavailable',
    wednesday: 'unavailable',
    thursday: 'unavailable',
    friday: 'unavailable',
    saturday: 'unavailable',
    sunday: 'unavailable',
    remark: '',
  }
}

async function loginMentor(page: Parameters<typeof test> extends never ? never : any): Promise<{ token: string; user: any }> {
  const loginResponse = await page.request.post('/api/mentor/login', {
    data: { username: 'mentor', password: 'Osg@2026' },
  })
  const loginBody = await loginResponse.json()
  const token = loginBody?.token || loginBody?.data?.token
  expect(token, '/api/mentor/login should include token').toBeTruthy()
  const infoResponse = await page.request.get('/api/mentor/getInfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const infoBody = await infoResponse.json()
  expect(infoResponse.ok(), '/api/mentor/getInfo should return HTTP 2xx').toBeTruthy()
  return {
    token,
    user: {
      ...(infoBody?.user || {}),
      roles: Array.isArray(infoBody?.roles) ? infoBody.roles : [],
      permissions: Array.isArray(infoBody?.permissions) ? infoBody.permissions : [],
    },
  }
}

test.describe('mentor schedule diagnosis @mentor-schedule-diagnose', () => {
  test.describe.configure({ mode: 'serial' })

  test('SC-004 request / backend / reload chain', async ({ page }) => {
    test.setTimeout(180000)
    fs.mkdirSync(evidenceDir, { recursive: true })

    const { token, user } = await loginMentor(page)
    await page.addInitScript(({ nextToken, nextUser }) => {
      window.localStorage.setItem('osg_token', nextToken)
      window.localStorage.setItem('osg_user', JSON.stringify(nextUser))
    }, { nextToken: token, nextUser: user })

    const weekStartDate = currentWeekStart()
    const headers = { Authorization: `Bearer ${token}` }
    const resetResponse = await page.request.put(`${backendBaseUrl}/api/mentor/schedule`, {
      headers,
      data: blankPayload(weekStartDate),
    })
    await assertRuoyiSuccess(Promise.resolve(resetResponse), '/api/mentor/schedule')

    const putEvents: Array<{ url: string; method: string; postData: string | null }> = []
    const responseEvents: Array<{ url: string; method: string; status: number; body: string }> = []
    page.on('request', (request) => {
      if (request.url().includes('/api/mentor/schedule')) {
        putEvents.push({ url: request.url(), method: request.method(), postData: request.postData() })
      }
    })
    page.on('response', async (response) => {
      if (response.url().includes('/api/mentor/schedule')) {
        responseEvents.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          body: await response.text(),
        })
      }
    })

    await page.goto('/schedule', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#page-schedule')).toBeVisible()
    await expect(page.locator('#mentor-this-weekly-hours')).toHaveValue('0')

    await page.locator('#page-schedule button:has-text("10h")').first().click()
    await page.locator('#this-week-unfilled input[type="checkbox"]').first().check()
    const inputAfterFill = await page.locator('#mentor-this-weekly-hours').inputValue()

    await page.locator('#page-schedule button:has-text("提交本周排期")').first().click()
    await expect(page.locator('#modal-mentor-schedule-feedback')).toContainText('本周排期已提交！')

    const backendAfter = await page.request.get('/api/mentor/schedule', { headers })
    const backendAfterBody = await backendAfter.json()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    const inputAfterReload = await page.locator('#mentor-this-weekly-hours').inputValue()

    const result = {
      weekStartDate,
      inputAfterFill,
      inputAfterReload,
      backendAfterBody,
      putEvents,
      responseEvents,
    }
    fs.writeFileSync(path.join(evidenceDir, 'SC-004-diagnostic.json'), JSON.stringify(result, null, 2), 'utf-8')

    expect(result).toBeDefined()
  })
})
