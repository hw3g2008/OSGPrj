import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const repoRoot = path.resolve(__dirname, '../../..')
const evidenceDir = path.join(repoRoot, 'screenshots/mentor-regression/20260329-harness-repair')
const summaryPath = path.join(evidenceDir, 'summary.json')

async function ensureEvidenceDir() {
  await fs.mkdir(evidenceDir, { recursive: true })
}

async function updateSummary(caseId: string, payload: Record<string, unknown>) {
  await ensureEvidenceDir()
  let current: Record<string, unknown> = {}
  try {
    current = JSON.parse(await fs.readFile(summaryPath, 'utf-8')) as Record<string, unknown>
  } catch {
    current = {}
  }
  current[caseId] = payload
  await fs.writeFile(summaryPath, `${JSON.stringify(current, null, 2)}\n`, 'utf-8')
}

async function openCoursesPage(page: Page) {
  await page.goto('/courses', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#page-myclass')).toBeVisible()
  await expect(page.locator('#page-myclass .page-title')).toBeVisible()
  await expect(page.getByRole('button', { name: '上报课程记录' })).toBeVisible()
}

async function openJobOverviewPage(page: Page) {
  const listPromise = waitForApi(page, '/api/mentor/job-overview/list')
  const calendarPromise = waitForApi(page, '/api/mentor/job-overview/calendar')

  await page.goto('/job-overview', { waitUntil: 'domcontentloaded' })

  await assertRuoyiSuccess(listPromise, '/api/mentor/job-overview/list')
  await assertRuoyiSuccess(calendarPromise, '/api/mentor/job-overview/calendar')
  await expect(page.locator('#page-job-overview')).toBeVisible()
  await expect(page.locator('.calendar-month')).toBeVisible()
}

test.describe('Mentor Tail Harness @mentor @api', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(moduleName !== 'mentor', 'mentor harness spec only runs for mentor module gate')

  test('CR-001 waits for the stable class-records shell before asserting the page entrypoint @mentor-harness-cr-001', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await ensureEvidenceDir()
    await loginAsAdmin(page)

    await openCoursesPage(page)

    const screenshotPath = path.join(evidenceDir, 'CR-001-pass.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    await updateSummary('MTR-PW-CR-001', {
      status: 'pass',
      screenshot: screenshotPath,
      route: '/courses',
      selectors: ['#page-myclass', '#page-myclass .page-title', 'button:has-text("上报课程记录")'],
    })
  })

  test('JO-005 waits for both export response and download before accepting the result @mentor-harness-jo-005', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await ensureEvidenceDir()
    await loginAsAdmin(page)
    await openJobOverviewPage(page)

    const exportButton = page.getByRole('button', { name: '导出' })
    await expect(exportButton).toBeVisible()

    const exportResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'GET' && response.url().includes('/api/mentor/job-overview/export')
    })

    const [download, exportResponse] = await Promise.all([
      page.waitForEvent('download'),
      exportResponsePromise,
      exportButton.click(),
    ])

    expect(exportResponse.ok(), 'job overview export should return HTTP 2xx').toBeTruthy()
    expect(exportResponse.headers()['content-type'] || '').toContain('spreadsheetml.sheet')

    const suggestedFilename = download.suggestedFilename()
    const downloadPath = path.join(evidenceDir, suggestedFilename)
    await download.saveAs(downloadPath)

    const fileStat = await fs.stat(downloadPath)
    expect(fileStat.size).toBeGreaterThan(0)

    const screenshotPath = path.join(evidenceDir, 'JO-005-pass.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    await updateSummary('MTR-PW-JO-005', {
      status: 'pass',
      screenshot: screenshotPath,
      download: downloadPath,
      suggestedFilename,
      contentType: exportResponse.headers()['content-type'] || '',
    })
  })

  test('JO-006 and JO-007 wait for calendar month text transitions instead of sampling mid-state @mentor-harness-jo-006-007', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await ensureEvidenceDir()
    await loginAsAdmin(page)
    await openJobOverviewPage(page)

    const monthLabel = page.locator('#page-job-overview .calendar-nav .calendar-month')
    const arrows = page.locator('#page-job-overview .calendar-nav .calendar-arrow')
    const leftArrow = arrows.nth(0)
    const rightArrow = arrows.nth(1)

    const before = ((await monthLabel.textContent()) || '').trim()
    expect(before).toBeTruthy()

    await rightArrow.click()
    await expect
      .poll(async () => ((await monthLabel.textContent()) || '').trim(), { timeout: 10_000 })
      .not.toBe(before)

    const afterRight = ((await monthLabel.textContent()) || '').trim()
    const rightScreenshot = path.join(evidenceDir, 'JO-006-pass.png')
    await page.screenshot({ path: rightScreenshot, fullPage: true })

    await leftArrow.click()
    await expect
      .poll(async () => ((await monthLabel.textContent()) || '').trim(), { timeout: 10_000 })
      .toBe(before)

    const afterLeft = ((await monthLabel.textContent()) || '').trim()
    const leftScreenshot = path.join(evidenceDir, 'JO-007-pass.png')
    await page.screenshot({ path: leftScreenshot, fullPage: true })

    await updateSummary('MTR-PW-JO-006', {
      status: 'pass',
      screenshot: rightScreenshot,
      before,
      after: afterRight,
    })
    await updateSummary('MTR-PW-JO-007', {
      status: 'pass',
      screenshot: leftScreenshot,
      before: afterRight,
      after: afterLeft,
    })
  })
})
