import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess } from './support/auth'

const backendBaseUrl = process.env.E2E_BACKEND_URL || process.env.BASE_URL || 'http://127.0.0.1:28080'
const evidenceDir = '/Users/hw/workspace/OSGPrj/screenshots/mentor-regression/final-rerun/page-schedule'

function blankWeekPayload(weekStartDate: string) {
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

async function loginMentor(page: Page): Promise<string> {
  const loginResponse = await page.request.post('/api/mentor/login', {
    data: { username: 'mentor', password: 'Osg@2026' },
  })
  const loginBody = await loginResponse.json()
  const token = loginBody?.token || loginBody?.data?.token
  expect(loginResponse.ok(), '/api/mentor/login should return HTTP 2xx').toBeTruthy()
  expect(loginBody?.code, '/api/mentor/login should return code=200').toBe(200)
  expect(token, '/api/mentor/login should include token').toBeTruthy()

  const infoResponse = await page.request.get('/api/mentor/getInfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const infoBody = await infoResponse.json()
  expect(infoResponse.ok(), '/api/mentor/getInfo should return HTTP 2xx').toBeTruthy()
  expect(infoBody?.code, '/api/mentor/getInfo should return code=200').toBe(200)

  await page.addInitScript(({ nextToken, nextUser }) => {
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

  return token
}

async function saveSchedule(page: Page, token: string, payload: Record<string, any>) {
  const response = await page.request.put(`${backendBaseUrl}/api/mentor/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  })
  await assertRuoyiSuccess(Promise.resolve(response), '/api/mentor/schedule')
}

async function openSchedule(page: Page): Promise<string> {
  const scheduleResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') {
      return false
    }
    return response.url().includes('/api/mentor/schedule')
  })
  await page.goto('/schedule', { waitUntil: 'domcontentloaded' })
  const scheduleResponse = await scheduleResponsePromise
  await expect(page.locator('#page-schedule')).toBeVisible({ timeout: 30000 })
  const scheduleBody = await scheduleResponse.json()
  const weekStartDate = scheduleBody?.data?.weekStartDate
  expect(weekStartDate, 'schedule weekStartDate should come from live API').toBeTruthy()
  return String(weekStartDate)
}

test.describe('mentor schedule final check @mentor-schedule-rerun', () => {
  test('SC-004 submits and reloads current week', async ({ page }) => {
    test.setTimeout(120000)
    fs.mkdirSync(evidenceDir, { recursive: true })

    const token = await loginMentor(page)
    const weekStartDate = await openSchedule(page)
    await saveSchedule(page, token, blankWeekPayload(weekStartDate))

    const reopenedWeekStartDate = await openSchedule(page)
    expect(reopenedWeekStartDate).toBe(weekStartDate)
    await expect(page.locator('#page-schedule button:has-text("立即填写")').first()).toBeVisible()

    await page.locator('#page-schedule button:has-text("10h")').first().click()
    await page.locator('#this-week-unfilled input[type="checkbox"]').first().check()

    await page.locator('#page-schedule button:has-text("提交本周排期")').first().click()
    await expect(page.locator('#modal-mentor-schedule-feedback')).toContainText('本周排期已提交！')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#mentor-this-weekly-hours')).toHaveValue('10', { timeout: 30000 })
    await page.screenshot({ path: path.join(evidenceDir, 'MTR-PW-SC-004-pass.png'), fullPage: true })
  })

  test('SC-001 shows schedule shell after restore', async ({ page }) => {
    test.setTimeout(60000)
    fs.mkdirSync(evidenceDir, { recursive: true })

    const token = await loginMentor(page)
    const weekStartDate = await openSchedule(page)
    await saveSchedule(page, token, blankWeekPayload(weekStartDate))

    const reopenedWeekStartDate = await openSchedule(page)
    expect(reopenedWeekStartDate).toBe(weekStartDate)
    await expect(page.locator('#page-schedule .page-title')).toContainText('我的排期')
    await expect(page.locator('#this-week-unfilled')).toBeVisible()
    await expect(page.locator('#mentor-next-week-panel')).toBeVisible()
    await expect(page.locator('#mentor-next-weekly-hours')).toBeVisible()
    await page.screenshot({ path: path.join(evidenceDir, 'MTR-PW-SC-001-pass.png'), fullPage: true })
  })
})
