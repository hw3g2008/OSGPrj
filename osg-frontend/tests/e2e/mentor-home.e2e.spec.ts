import { expect, test } from '@playwright/test'

import { loginAsAdmin, waitForApi, assertRuoyiSuccess } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Mentor Home @mentor @api', () => {
  test.skip(moduleName !== 'mentor', 'mentor home spec only runs for mentor module gate')

  test('dashboard renders real mentor overview instead of placeholder copy and links to live pages @mentor-t202-home', async ({
    page,
  }) => {
    test.setTimeout(90000)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)

    const profilePromise = assertRuoyiSuccess(
      waitForApi(page, '/api/mentor/profile'),
      '/api/mentor/profile',
    )
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const profileBody = await profilePromise

    const expectedProfile = profileBody?.data || profileBody || {}
    const expectedName = String(expectedProfile?.nickName || expectedProfile?.userName || '').trim()
    const expectedEmail = String(expectedProfile?.email || '').trim()

    await expect(page.locator('#mentor-home')).toBeVisible()
    await expect(page.locator('#mentor-home')).not.toContainText('敬请期待')
    await expect(page.locator('#mentor-home')).not.toContainText('Coming Soon')
    await expect(page.locator('#mentor-home')).toContainText(expectedName)
    await expect(page.locator('#mentor-home')).toContainText(expectedEmail)

    const schedulePromise = assertRuoyiSuccess(
      waitForApi(page, '/api/mentor/schedule'),
      '/api/mentor/schedule',
    )
    await page.getByRole('button', { name: '我的排期' }).click()
    await schedulePromise

    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('.page-title')).toContainText('我的排期')

    await recordBehaviorScenario({
      capabilityId: 'mentor-home-overview',
      scenarioId: 'render-real-mentor-identity',
      inputClass: 'authenticated_mentor_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/dashboard',
        nickName: expectedName,
        email: expectedEmail,
        placeholderAbsent: true,
      },
      evidenceRef: 'osg-frontend/tests/e2e/mentor-home.e2e.spec.ts#mentor-t202-home',
    })

    await recordBehaviorScenario({
      capabilityId: 'mentor-home-overview',
      scenarioId: 'navigate-from-home-to-schedule',
      inputClass: 'valid_navigation_target',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        from: '/dashboard',
        to: '/schedule',
      },
      evidenceRef: 'osg-frontend/tests/e2e/mentor-home.e2e.spec.ts#mentor-t202-home',
    })
  })
})
