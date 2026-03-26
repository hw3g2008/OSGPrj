import { expect, test } from '@playwright/test'

import { loginAsAdmin, waitForApi, assertRuoyiSuccess } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Student Home @student @api', () => {
  test.skip(moduleName !== 'student', 'student home spec only runs for student module gate')

  test('dashboard binds real student profile and navigation instead of static demo identity @student-t201-home', async ({
    page,
  }) => {
    test.setTimeout(90000)

    await loginAsAdmin(page)
    const profilePromise = assertRuoyiSuccess(
      waitForApi(page, '/api/student/profile'),
      '/api/student/profile',
    )
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/dashboard/)
    const profileBody = await profilePromise

    const expectedProfile = profileBody?.data?.profile || profileBody?.profile
    const expectedName = String(expectedProfile?.fullName || '').trim()
    const expectedEmail = String(expectedProfile?.email || '').trim()
    const expectedSchool = String(expectedProfile?.school || '').trim()

    await expect(page.locator('#page-home')).toBeVisible()
    await expect(page.locator('#page-home')).not.toContainText('Test Student')
    await expect(page.locator('#page-home')).not.toContainText('test@example.com')
    await expect(page.locator('#page-home')).toContainText(expectedName)
    await expect(page.locator('#page-home')).toContainText(expectedEmail)
    await expect(page.locator('#page-home')).toContainText(expectedSchool)

    const positionsPromise = assertRuoyiSuccess(
      waitForApi(page, '/api/student/position/list'),
      '/api/student/position/list',
    )
    await page.getByRole('button', { name: '岗位信息' }).click()
    const positionsBody = await positionsPromise

    await expect(page).toHaveURL(/\/positions/)
    await expect(page.locator('#page-positions')).toBeVisible()

    const positionCount = Array.isArray(positionsBody?.data)
      ? positionsBody.data.length
      : Array.isArray(positionsBody)
        ? positionsBody.length
        : 0

    await recordBehaviorScenario({
      capabilityId: 'student-home-overview',
      scenarioId: 'render-real-student-identity',
      inputClass: 'authenticated_student_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/dashboard',
        fullName: expectedName,
        email: expectedEmail,
        school: expectedSchool,
        staticDemoIdentityAbsent: true,
      },
      evidenceRef: 'osg-frontend/tests/e2e/student-home.e2e.spec.ts#student-t201-home',
    })

    await recordBehaviorScenario({
      capabilityId: 'student-home-overview',
      scenarioId: 'navigate-from-home-to-positions',
      inputClass: 'valid_navigation_target',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        from: '/dashboard',
        to: '/positions',
        positionsCount: positionCount,
      },
      evidenceRef: 'osg-frontend/tests/e2e/student-home.e2e.spec.ts#student-t201-home',
    })
  })
})
