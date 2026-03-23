import { expect, test, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const schedulePath = '/api/lead-mentor/schedule'
const scheduleStatusPath = '/api/lead-mentor/schedule/status'
const saveNextSchedulePath = '/api/lead-mentor/schedule/next'

function waitForScheduleScope(page: Page, weekScope: 'current' | 'next'): Promise<APIResponse> {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') {
      return false
    }
    if (!response.url().includes(schedulePath)) {
      return false
    }
    const url = new URL(response.url())
    return url.searchParams.get('weekScope') === weekScope
  })
}

async function openSchedulePage(page: Page): Promise<void> {
  const currentPromise = waitForScheduleScope(page, 'current')
  const nextPromise = waitForScheduleScope(page, 'next')
  const statusPromise = waitForApi(page, scheduleStatusPath, 'GET')

  await page.goto('/profile/schedule', { waitUntil: 'domcontentloaded' })

  await assertRuoyiSuccess(currentPromise, `${schedulePath}?weekScope=current`)
  await assertRuoyiSuccess(nextPromise, `${schedulePath}?weekScope=next`)
  await assertRuoyiSuccess(statusPromise, scheduleStatusPath)

  await expect(page).toHaveURL(/\/profile\/schedule/)
  await expect(page.locator('#page-schedule')).toBeVisible()
}

async function closeForceModalIfVisible(page: Page): Promise<void> {
  const modal = page.locator('[data-surface-id="modal-lead-force-schedule"]')
  if (await modal.isVisible().catch(() => false)) {
    await page
      .locator('[data-surface-id="modal-lead-force-schedule"] [data-surface-part="backdrop"]')
      .evaluate((element: HTMLElement) => {
        element.click()
      })
    await expect(modal).toBeHidden()
  }
}

async function clearNextWeekSelections(page: Page): Promise<void> {
  const inputs = page.locator('.editable-day input[type="checkbox"]')
  const count = await inputs.count()
  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index)
    if (await input.isChecked()) {
      await input.uncheck()
    }
  }
}

test.describe('Lead Mentor Schedule Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('saving next week schedule records schedule-self-edit behavior evidence @lead-mentor-s047-schedule-self-edit', async ({
    page,
  }) => {
    test.setTimeout(120000)

    await loginAsAdmin(page)
    await openSchedulePage(page)
    await closeForceModalIfVisible(page)
    await clearNextWeekSelections(page)

    const weeklyHoursInput = page.locator('#lead-next-weekly-hours')
    await expect(weeklyHoursInput).toBeVisible()
    await weeklyHoursInput.fill('18')

    const mondayMorning = page.locator('.editable-day').nth(0).locator('input[value="morning"]')
    const wednesdayEvening = page.locator('.editable-day').nth(2).locator('input[value="evening"]')

    await mondayMorning.check()
    await wednesdayEvening.check()
    await page.locator('.form-textarea').fill('周三晚上保留模拟面试时段')

    const savePromise = waitForApi(page, saveNextSchedulePath, 'PUT')
    const nextRefreshPromise = waitForScheduleScope(page, 'next')
    const statusRefreshPromise = waitForApi(page, scheduleStatusPath, 'GET')

    await page.getByRole('button', { name: '保存下周排期' }).click()

    const saveBody = await assertRuoyiSuccess(savePromise, saveNextSchedulePath)
    const nextBody = await assertRuoyiSuccess(nextRefreshPromise, `${schedulePath}?weekScope=next`)
    const statusBody = await assertRuoyiSuccess(statusRefreshPromise, scheduleStatusPath)
    const saved = saveBody?.data || {}
    const refreshedNext = nextBody?.data || {}
    const refreshedStatus = statusBody?.data || {}

    expect(saved.weekScope).toBe('next')
    expect(saved.availableHours).toBe(18)
    expect(saved.selectedSlotKeys).toEqual(['1-morning', '3-evening'])
    expect(refreshedNext.selectedSlotKeys).toEqual(['1-morning', '3-evening'])
    expect(refreshedStatus.scheduleStatus).toBe('已提交')

    await expect(page.locator('#page-schedule')).toContainText('已提交')
    await expect(page.locator('#lead-next-weekly-hours')).toHaveValue('18')

    const reloadNextPromise = waitForScheduleScope(page, 'next')
    await page.reload({ waitUntil: 'domcontentloaded' })
    const reloadedNextBody = await assertRuoyiSuccess(reloadNextPromise, `${schedulePath}?weekScope=next`)
    const reloadedNext = reloadedNextBody?.data || {}

    await expect(page.locator('#lead-next-weekly-hours')).toHaveValue('18')
    expect(reloadedNext.selectedSlotKeys).toEqual(['1-morning', '3-evening'])

    await recordBehaviorScenario({
      capabilityId: 'schedule-self-edit',
      scenarioId: 'save-next-week-schedule',
      inputClass: 'schedule_update',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/profile/schedule',
        weekScope: saved.weekScope,
        availableHours: saved.availableHours,
        selectedSlotKeys: saved.selectedSlotKeys,
        note: saved.note,
        refreshedStatus: refreshedStatus.scheduleStatus,
        persistedSelection: reloadedNext.selectedSlotKeys,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-schedule-behavior.e2e.spec.ts#lead-mentor-s047-schedule-self-edit',
    })
  })
})
