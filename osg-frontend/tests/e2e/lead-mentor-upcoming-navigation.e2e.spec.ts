import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

test.describe('Lead Mentor Upcoming Navigation @lead-mentor @api', () => {
  test('clicking an upcoming sidebar entry keeps the user on /home and shows the unified toast @lead-mentor-s040-upcoming-nav', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    const expenseNav = page.locator('.sidebar-nav .nav-item').filter({ hasText: '报销管理 Expense' }).first()
    await expect(expenseNav).toBeVisible()
    await expenseNav.click()

    const toast = page.locator('.ant-message-notice').filter({ hasText: '敬请期待' }).last()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/home/)

    const activeNavText = await page.locator('.sidebar-nav .nav-item.active').first().textContent()

    await recordBehaviorScenario({
      capabilityId: 'upcoming-navigation-toast',
      scenarioId: 'click-upcoming-nav',
      inputClass: 'protected_route',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/home',
        toast_message: '敬请期待',
        active_nav: activeNavText?.trim() || null,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-upcoming-navigation.e2e.spec.ts#lead-mentor-s040-upcoming-nav',
    })
  })
})
