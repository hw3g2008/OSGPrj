import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess } from './support/auth'

type CaseStatus = 'pass' | 'fail' | 'block'

interface CaseResult {
  status: CaseStatus
  reason?: string
  screenshot?: string
  extra?: Record<string, any>
}

const backendBaseUrl = process.env.E2E_BACKEND_URL || process.env.BASE_URL || 'http://127.0.0.1:28080'
const evidenceDir = '/Users/hw/workspace/OSGPrj/screenshots/mentor-regression/final-rerun/page-schedule'
const summaryPath = path.join(evidenceDir, 'summary.json')

function ensureEvidenceDir(): void {
  fs.mkdirSync(evidenceDir, { recursive: true })
}

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

function addDaysIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function writeSummary(results: Record<string, CaseResult>): void {
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf-8')
}

async function openSchedulePage(page: Page): Promise<{ currentWeekStartDate: string; nextWeekStartDate: string }> {
  const scheduleResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') {
      return false
    }
    return response.url().includes('/api/mentor/schedule')
  })
  await page.goto('/schedule', { waitUntil: 'domcontentloaded' })
  const scheduleResponse = await scheduleResponsePromise
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/schedule/)
  await expect(page.locator('#page-schedule')).toBeVisible({ timeout: 30000 })
  const scheduleBody = await scheduleResponse.json()
  const currentWeekStartDate = scheduleBody?.data?.weekStartDate
  expect(currentWeekStartDate, 'current weekStartDate should come from live schedule API').toBeTruthy()
  const nextWeekStartDate = addDaysIsoDate(String(currentWeekStartDate), 7)
  return { currentWeekStartDate, nextWeekStartDate }
}

async function clickByText(page: Page, selector: string, text: string): Promise<void> {
  const button = page.locator(selector).filter({ hasText: text }).first()
  await expect(button, `button "${text}" should exist`).toBeVisible()
  await button.click()
}

async function snapshot(page: Page, caseId: string, status: CaseStatus): Promise<string> {
  const file = path.join(evidenceDir, `${caseId}-${status}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function restoreSchedule(page: Page, token: string, weekStartDate: string, payload: Record<string, any>): Promise<void> {
  const response = await page.request.put(`${backendBaseUrl}/api/mentor/schedule`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload ?? blankWeekPayload(weekStartDate),
  })
  await assertRuoyiSuccess(Promise.resolve(response), '/api/mentor/schedule')
}

async function loginMentor(page: Page): Promise<string> {
  const loginResponse = await page.request.post('/api/mentor/login', {
    data: {
      username: 'mentor',
      password: 'Osg@2026',
    },
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.ok(), '/api/mentor/login should return HTTP 2xx').toBeTruthy()
  expect(loginBody?.code, '/api/mentor/login should return code=200').toBe(200)
  const token = loginBody?.token || loginBody?.data?.token
  expect(token, '/api/mentor/login should include token').toBeTruthy()

  const infoResponse = await page.request.get('/api/mentor/getInfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const infoBody = await infoResponse.json()
  expect(infoResponse.ok(), '/api/mentor/getInfo should return HTTP 2xx').toBeTruthy()
  expect(infoBody?.code, '/api/mentor/getInfo should return code=200').toBe(200)

  await page.addInitScript(({ nextToken, nextUser }) => {
    window.localStorage.removeItem('osg_token')
    window.localStorage.removeItem('osg_user')
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

async function runCase(page: Page, caseId: string, fn: () => Promise<Record<string, any> | void>): Promise<CaseResult> {
  try {
    const extra = await fn()
    const screenshot = await snapshot(page, caseId, 'pass')
    return { status: 'pass', screenshot, extra: extra || undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const screenshot = await snapshot(page, caseId, 'fail')
    return { status: 'fail', reason: message, screenshot }
  }
}

test.describe('mentor schedule full rerun @mentor-schedule-rerun', () => {
  test('runs page-schedule P0 then P1 with restore and evidence capture', async ({ page }) => {
    test.setTimeout(240000)
    ensureEvidenceDir()

    const token = await loginMentor(page)
    expect(token, 'mentor login should persist osg_token').toBeTruthy()

    const { currentWeekStartDate, nextWeekStartDate } = await openSchedulePage(page)

    await restoreSchedule(page, token, currentWeekStartDate, blankWeekPayload(currentWeekStartDate))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#page-schedule')).toBeVisible()
    await expect(page.locator('#mentor-this-weekly-hours')).toHaveValue('0')

    const results: Record<string, CaseResult> = {}
    const p0Cases: Array<[string, () => Promise<Record<string, any> | void>]> = [
      ['MTR-PW-SC-002', async () => {
        const reminderButton = page.locator('#page-schedule button:has-text("立即填写")').first()
        await expect(reminderButton).toBeVisible()
        const hoursInput = page.locator('#mentor-this-weekly-hours')
        await expect(hoursInput).toBeVisible()
        await reminderButton.click()
        await expect(hoursInput).toBeFocused()
        return {
          route: '/schedule',
          focusedElement: await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id || ''),
        }
      }],
      ['MTR-PW-SC-003', async () => {
    await clickByText(page, '#page-schedule button', '10h')
        const hoursInput = page.locator('#mentor-this-weekly-hours')
        await expect(hoursInput).toHaveValue('10')
        return {
          route: '/schedule',
          currentHours: await hoursInput.inputValue(),
        }
      }],
      ['MTR-PW-SC-005', async () => {
        await clickByText(page, '#page-schedule button', '15h')
        const hoursInput = page.locator('#mentor-next-weekly-hours')
        await expect(hoursInput).toHaveValue('15')
        return {
          route: '/schedule',
          nextHours: await hoursInput.inputValue(),
        }
      }],
      ['MTR-PW-SC-006', async () => {
        await clickByText(page, '#page-schedule button', '15h')
        const nextHours = page.locator('#mentor-next-weekly-hours')
        const nextTextarea = page.locator('#mentor-next-week-panel textarea')
        const nextCheckbox = page.locator('#mentor-next-week-panel input[type="checkbox"]').first()
        await nextCheckbox.check()
        await nextTextarea.fill('元旦假期安排')
        await clickByText(page, '#page-schedule button', '重置')
        await expect(nextHours).toHaveValue('')
        await expect(nextTextarea).toHaveValue('')
        await expect(nextCheckbox).not.toBeChecked()
        return {
          route: '/schedule',
          nextHours: await nextHours.inputValue(),
        }
      }],
      ['MTR-PW-SC-007', async () => {
        await clickByText(page, '#page-schedule button', '15h')
        const nextHours = page.locator('#mentor-next-weekly-hours')
        const nextTextarea = page.locator('#mentor-next-week-panel textarea')
        const nextCheckbox = page.locator('#mentor-next-week-panel input[type="checkbox"]').first()
        await nextCheckbox.check()
        await nextTextarea.fill('元旦假期安排')
        await clickByText(page, '#page-schedule button', '保存下周排期')
        await expect(page.locator('#modal-mentor-schedule-feedback')).toContainText('下周排期已保存！')
        return {
          route: '/schedule',
          currentHours: await nextHours.inputValue(),
        }
      }],
      ['MTR-PW-SC-004', async () => {
        await clickByText(page, '#page-schedule button', '10h')
        const currentCheckbox = page.locator('#this-week-unfilled input[type="checkbox"]').first()
        await currentCheckbox.check()
        await clickByText(page, '#page-schedule button', '提交本周排期')
        await expect(page.locator('#modal-mentor-schedule-feedback')).toContainText('本周排期已提交！')
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle')
        await expect(page.locator('#mentor-this-weekly-hours')).toHaveValue('10')
        await expect(page.locator('#this-week-unfilled')).toContainText('已填写')
        return {
          route: '/schedule',
          reloadedWeekStartDate: currentWeekStartDate,
          reloadedHours: 10,
        }
      }],
    ]

    for (const [caseId, fn] of p0Cases) {
      const result = await runCase(page, caseId, fn)
      results[caseId] = result
      writeSummary(results)
      if (result.status !== 'pass') {
        break
      }
    }

    const p0Statuses = ['MTR-PW-SC-002', 'MTR-PW-SC-003', 'MTR-PW-SC-005', 'MTR-PW-SC-006', 'MTR-PW-SC-007', 'MTR-PW-SC-004']
      .map((id) => results[id]?.status)
    const p0AllPass = p0Statuses.length === 6 && p0Statuses.every((status) => status === 'pass')

    if (p0AllPass) {
      await restoreSchedule(page, token, currentWeekStartDate, blankWeekPayload(currentWeekStartDate))

      const p1Result = await runCase(page, 'MTR-PW-SC-001', async () => {
        const title = page.locator('#page-schedule .page-title')
        const reminder = page.locator('#this-week-unfilled')
        const nextPanel = page.locator('#mentor-next-week-panel')
        await expect(title).toContainText('我的排期')
        await expect(reminder).toBeVisible()
        await expect(page.locator('#mentor-next-weekly-hours')).toBeVisible()
        await expect(nextPanel).toBeVisible()
        await expect(page.locator('#page-schedule')).toContainText('本周排期')
        return {
          route: '/schedule',
          reminderVisible: await reminder.isVisible(),
          currentPanelVisible: await page.locator('#this-week-unfilled').isVisible(),
          nextPanelVisible: await nextPanel.isVisible(),
        }
      })
      results['MTR-PW-SC-001'] = p1Result
      writeSummary(results)
    } else {
      results['MTR-PW-SC-001'] = {
        status: 'block',
        reason: 'P0 gate not satisfied; P1 not run',
      }
      writeSummary(results)
    }

    try {
      await restoreSchedule(page, token, nextWeekStartDate, blankWeekPayload(nextWeekStartDate))
    } catch {
      // best effort only; do not overwrite the primary test verdict
    }

    const passCount = Object.values(results).filter((item) => item.status === 'pass').length
    const failCount = Object.values(results).filter((item) => item.status === 'fail').length
    const blockCount = Object.values(results).filter((item) => item.status === 'block').length

    // Make the test fail if anything did not pass, but preserve the evidence JSON above.
    expect(
      { passCount, failCount, blockCount, results },
      'mentor schedule rerun should be fully green',
    ).toMatchObject({
      failCount: 0,
      blockCount: 0,
    })
  })
})
