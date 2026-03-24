import { expect, test } from '@playwright/test'

import { assertRuoyiSuccess, loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''
const scheduleDayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function waitForAssistantApi(
  page: import('@playwright/test').Page,
  urlPart: string,
  method: 'GET' | 'PUT' = 'GET',
) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') &&
      response.url().includes(urlPart),
    { timeout: 45000 },
  )
}

function extractAjaxData<T>(body: any): T {
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data as T
  }
  return body as T
}

function createNextPhone(seed: number) {
  return `138${String(seed).slice(-8)}`
}

function currentWeekStartString() {
  const current = new Date()
  const normalizedDay = current.getDay() === 0 ? 7 : current.getDay()
  current.setDate(current.getDate() - normalizedDay + 1)
  const year = current.getFullYear()
  const month = String(current.getMonth() + 1).padStart(2, '0')
  const day = String(current.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildRestoreSchedulePayload(source: Record<string, any> | null) {
  return {
    id: source?.id,
    mentorId: source?.mentorId,
    weekStartDate: source?.weekStartDate || currentWeekStartString(),
    totalHours: Number(source?.totalHours || 0),
    monday: source?.monday || 'unavailable',
    tuesday: source?.tuesday || 'unavailable',
    wednesday: source?.wednesday || 'unavailable',
    thursday: source?.thursday || 'unavailable',
    friday: source?.friday || 'unavailable',
    saturday: source?.saturday || 'unavailable',
    sunday: source?.sunday || 'unavailable',
  }
}

test.describe('Assistant Personal Center @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant personal center spec only runs for assistant module gate')

  test('profile and schedule pages render real data, persist valid saves, and block invalid submissions @assistant-t243-profile-center-real', async ({
    page,
  }) => {
    test.setTimeout(180000)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    let originalProfile: Record<string, any> | null = null
    let originalSchedule: Record<string, any> | null = null

    try {
      const profileResponseBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/profile'),
        '/api/mentor/profile',
      )
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Profile' }).click()
      const profileResponseBody = await profileResponseBodyPromise
      originalProfile = extractAjaxData<Record<string, any>>(profileResponseBody)

      await expect(page).toHaveURL(/\/profile/)
      const profilePage = page.locator('#page-profile')
      await expect(profilePage).toBeVisible()
      await expect(profilePage.locator('.page-title')).toContainText('Profile')
      await expect(profilePage).not.toContainText('敬请期待')

      await page.locator('#assistant-profile-edit').click()
      await expect(page.locator('#assistant-profile-save')).toBeVisible()

      const editVisible = await page.locator('.editor-card').isVisible()
      const profileSeed = Date.now()
      const nextNickName = `Amy ${String(profileSeed).slice(-4)}`
      const nextEmail = `assistant.profile+${profileSeed}@example.com`
      const nextPhone = createNextPhone(profileSeed)

      await page.locator('#assistant-profile-nick-name').fill(nextNickName)
      await page.locator('#assistant-profile-email').fill(nextEmail)
      await page.locator('#assistant-profile-phone').fill(nextPhone)

      const profileSaveBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/profile', 'PUT'),
        '/api/mentor/profile',
      )
      const profileReloadBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/profile'),
        '/api/mentor/profile',
      )
      await page.locator('#assistant-profile-save').click()
      await profileSaveBodyPromise
      await profileReloadBodyPromise

      await expect(profilePage).toContainText(nextNickName)
      await expect(profilePage).toContainText(nextEmail)
      await expect(profilePage.locator('.feedback-banner--success')).toContainText('保存成功')

      const profileReloadAfterRefreshPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/profile'),
        '/api/mentor/profile',
      )
      await page.reload()
      await profileReloadAfterRefreshPromise
      await expect(page).toHaveURL(/\/profile/)
      await expect(page.locator('#page-profile')).toContainText(nextNickName)
      await expect(page.locator('#page-profile')).toContainText(nextEmail)

      await page.locator('#assistant-profile-edit').click()
      await page.locator('#assistant-profile-email').fill('invalid-email')
      await page.locator('#assistant-profile-save').click()
      await expect(page.locator('.field-error')).toContainText('请输入正确的邮箱格式')

      await recordBehaviorScenario({
        capabilityId: 'assistant-profile',
        scenarioId: 'render-profile-page',
        inputClass: 'authenticated_session',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          route: '/profile',
          userName: originalProfile?.userName || '',
          nickName: nextNickName,
          editorVisible: editVisible,
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })

      await recordBehaviorScenario({
        capabilityId: 'assistant-profile',
        scenarioId: 'open-profile-editor',
        inputClass: 'edit_action',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          editorVisible: true,
          editableFields: ['nickName', 'email', 'phonenumber', 'sex'],
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })

      await recordBehaviorScenario({
        capabilityId: 'assistant-profile',
        scenarioId: 'submit-profile-update',
        inputClass: 'valid_profile_payload',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          nickName: nextNickName,
          email: nextEmail,
          phonenumber: nextPhone,
          persistedAfterReload: true,
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })

      const scheduleResponseBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/schedule'),
        '/api/mentor/schedule',
      )
      await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Schedule' }).click()
      const scheduleResponseBody = await scheduleResponseBodyPromise
      originalSchedule = extractAjaxData<Record<string, any>>(scheduleResponseBody) || null

      await expect(page).toHaveURL(/\/schedule/)
      const schedulePage = page.locator('#page-schedule')
      await expect(schedulePage).toBeVisible()
      await expect(schedulePage.locator('.page-title')).toContainText('Schedule')
      await expect(schedulePage).not.toContainText('敬请期待')

      const originalMonday = await page.locator('#assistant-schedule-monday').inputValue()
      const originalHours = Number(await page.locator('#assistant-schedule-total-hours').inputValue())
      const nextMonday = originalMonday === 'all_day' ? 'morning' : 'all_day'
      const nextHours = Math.min(80, Math.max(originalHours, 2) + 1)

      await page.locator('#assistant-schedule-monday').selectOption(nextMonday)
      await page.locator('#assistant-schedule-total-hours').fill(String(nextHours))

      const scheduleSaveBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/schedule', 'PUT'),
        '/api/mentor/schedule',
      )
      const scheduleReloadBodyPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/schedule'),
        '/api/mentor/schedule',
      )
      await page.locator('#assistant-schedule-save').click()
      await scheduleSaveBodyPromise
      await scheduleReloadBodyPromise

      await expect(page.locator('#assistant-schedule-feedback')).not.toBeVisible()
      await expect(schedulePage.locator('.feedback-banner--success')).toContainText('保存成功')

      const scheduleReloadAfterRefreshPromise = assertRuoyiSuccess(
        waitForAssistantApi(page, '/api/mentor/schedule'),
        '/api/mentor/schedule',
      )
      await page.reload()
      await scheduleReloadAfterRefreshPromise
      await expect(page).toHaveURL(/\/schedule/)
      await expect(page.locator('#assistant-schedule-monday')).toHaveValue(nextMonday)
      await expect(page.locator('#assistant-schedule-total-hours')).toHaveValue(String(nextHours))

      for (const day of scheduleDayKeys) {
        await page.locator(`#assistant-schedule-${day}`).selectOption('unavailable')
      }
      await page.locator('#assistant-schedule-total-hours').fill('0')
      await page.locator('#assistant-schedule-save').click()
      await expect(page.locator('#assistant-schedule-feedback')).toContainText('请至少选择一天可授课时间段')

      await recordBehaviorScenario({
        capabilityId: 'assistant-schedule',
        scenarioId: 'render-schedule-page',
        inputClass: 'authenticated_session',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          route: '/schedule',
          availableDayCountText: ((await schedulePage.locator('.schedule-banner__value').textContent()) || '').trim(),
          weekRangeLabel: ((await schedulePage.locator('.status-pill').textContent()) || '').trim(),
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })

      await recordBehaviorScenario({
        capabilityId: 'assistant-schedule',
        scenarioId: 'edit-weekly-schedule',
        inputClass: 'schedule_edit_action',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          monday: nextMonday,
          totalHours: nextHours,
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })

      await recordBehaviorScenario({
        capabilityId: 'assistant-schedule',
        scenarioId: 'submit-schedule-update',
        inputClass: 'valid_schedule_payload',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          monday: nextMonday,
          totalHours: nextHours,
          persistedAfterReload: true,
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-profile-center.e2e.spec.ts#assistant-t243-profile-center-real',
      })
    } finally {
      const token = await page.evaluate(() => window.localStorage.getItem('osg_token'))
      if (token && originalProfile) {
        await assertRuoyiSuccess(
          Promise.resolve(
            page.request.put('/api/api/mentor/profile', {
              headers: { Authorization: `Bearer ${token}` },
              data: {
                ...originalProfile,
                nickName: originalProfile.nickName || '',
                email: originalProfile.email || '',
                phonenumber: originalProfile.phonenumber || '',
                sex: originalProfile.sex || '0',
              },
            }),
          ),
          '/api/mentor/profile',
        )
      }

      if (token) {
        await assertRuoyiSuccess(
          Promise.resolve(
            page.request.put('/api/api/mentor/schedule', {
              headers: { Authorization: `Bearer ${token}` },
              data: buildRestoreSchedulePayload(originalSchedule),
            }),
          ),
          '/api/mentor/schedule',
        )
      }
    }
  })
})
