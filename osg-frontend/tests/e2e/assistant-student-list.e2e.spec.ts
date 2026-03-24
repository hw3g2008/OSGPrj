import { expect, test } from '@playwright/test'

import { assertRuoyiSuccess, loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

function waitForStudentList(page: import('@playwright/test').Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') &&
      (response.url().includes('/admin/student/list') || response.url().includes('/api/admin/student/list')),
    { timeout: 45000 },
  )
}

test.describe('Assistant Student List @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant student list spec only runs for assistant module gate')

  test('student list page renders real data, filters it, and persists after reload @assistant-t235-students-real', async ({
    page,
  }) => {
    test.setTimeout(90000)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    const initialListBodyPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('[data-quick-link="/students"]').click()
    const initialListBody = await initialListBodyPromise

    await expect(page).toHaveURL(/\/students/)
    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()
    await expect(studentPage.locator('.page-title')).toContainText('Student List')
    await expect(studentPage.locator('.summary-card')).toHaveCount(4)
    await expect(studentPage).not.toContainText('鏁鏈熷緟')

    const studentRows = studentPage.locator('[data-student-row]')
    await expect(studentRows.first()).toBeVisible()

    const initialRowCount = await studentRows.count()
    const firstStudentName =
      ((await studentRows.first().locator('td').first().locator('.student-primary').textContent()) || '').trim()
    expect(firstStudentName).toBeTruthy()

    await page.locator('#assistant-students-keyword').fill(firstStudentName)
    const filteredListBodyPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('#assistant-students-search').click()
    const filteredListBody = await filteredListBodyPromise

    await expect(page.locator('#assistant-students-keyword')).toHaveValue(firstStudentName)
    await expect(studentRows.first().locator('td').first()).toContainText(firstStudentName)

    const filteredRowCount = await studentRows.count()
    const statusLabels = (await studentRows.first().locator('.status-chip').allTextContents()).map((text) => text.trim())
    expect(statusLabels.length).toBeGreaterThan(0)

    const followupPreview = ((await studentRows.first().locator('.followup-note').textContent()) || '').trim().slice(0, 120)

    const reloadListBodyPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.reload()
    await reloadListBodyPromise

    await expect(page).toHaveURL(/\/students/)
    await expect(page.locator('#assistant-students-keyword')).toHaveValue(firstStudentName)
    await expect(page.locator('[data-student-row]').first().locator('td').first()).toContainText(firstStudentName)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list',
      scenarioId: 'render-student-list-page',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/students',
        total: initialListBody.total,
        rowCount: initialRowCount,
        firstStudentName,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-student-list.e2e.spec.ts#assistant-t235-students-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list',
      scenarioId: 'filter-student-list',
      inputClass: 'valid_query',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        keyword: firstStudentName,
        total: filteredListBody.total,
        filteredRowCount,
        persistedAfterReload: true,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-student-list.e2e.spec.ts#assistant-t235-students-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list',
      scenarioId: 'show-student-status',
      inputClass: 'student_status_set',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        firstStudentName,
        statusLabels,
        followupPreview,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-student-list.e2e.spec.ts#assistant-t235-students-real',
    })
  })
})
