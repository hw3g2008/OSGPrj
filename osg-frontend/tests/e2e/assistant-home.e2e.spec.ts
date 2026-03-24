import { expect, test } from '@playwright/test'

import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Assistant Home @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant home spec only runs for assistant module gate')

  test('home page renders real sections and quick links navigate with refresh persistence @assistant-t192-home', async ({
    page,
  }) => {
    test.setTimeout(90000)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    await expect(page.locator('.assistant-home')).toBeVisible()
    const heroTitle = ((await page.locator('.assistant-home__hero-title').textContent()) || '').trim()
    expect(heroTitle).toBeTruthy()

    await expect(page.locator('[data-home-card]')).toHaveCount(3)
    await expect(page.locator('[data-home-stat]')).toHaveCount(4)
    await expect(page.locator('[data-quick-link]')).toHaveCount(4)
    await expect(page.locator('.assistant-home')).toContainText('岗位信息')
    await expect(page.locator('.assistant-home')).toContainText('学员列表')
    await expect(page.locator('.assistant-home')).toContainText('课程记录')
    await expect(page.locator('.assistant-home')).toContainText('课程排期')

    await expect(page.locator('.assistant-home')).not.toContainText('敬请期待')
    await expect(page.locator('.assistant-home')).not.toContainText('可用导师')
    await expect(page.locator('.assistant-home')).not.toContainText('待排课')
    await expect(page.locator('.assistant-home')).not.toContainText('报销')

    const scheduleResponsePromise = assertRuoyiSuccess(
      waitForApi(page, '/api/mentor/schedule'),
      '/api/mentor/schedule',
    )
    await page.locator('[data-quick-link="/schedule"]').click()
    await scheduleResponsePromise
    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('.nav-item.active').first()).toContainText('Schedule')

    const scheduleReloadPromise = assertRuoyiSuccess(
      waitForApi(page, '/api/mentor/schedule'),
      '/api/mentor/schedule',
    )
    await page.reload()
    await scheduleReloadPromise
    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('.nav-item.active').first()).toContainText('Schedule')

    await recordBehaviorScenario({
      capabilityId: 'assistant-home-overview',
      scenarioId: 'render-home-overview',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/home',
        heroTitle,
        quickLinkCount: 4,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-home.e2e.spec.ts#assistant-t192-home',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-home-overview',
      scenarioId: 'render-stat-cards',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        statCount: 4,
        cardCount: 3,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-home.e2e.spec.ts#assistant-t192-home',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-home-overview',
      scenarioId: 'jump-via-quick-entry',
      inputClass: 'valid_navigation_target',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        from: '/home',
        to: '/schedule',
        activeNav: 'Schedule',
        persistedAfterReload: true,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-home.e2e.spec.ts#assistant-t192-home',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-home-overview',
      scenarioId: 'exclude-lead-mentor-only-blocks',
      inputClass: 'assistant_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        absentBlocks: ['mentor-availability', 'mentor-scheduling', 'expense-entry'],
        placeholderPresent: false,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-home.e2e.spec.ts#assistant-t192-home',
    })
  })
})
