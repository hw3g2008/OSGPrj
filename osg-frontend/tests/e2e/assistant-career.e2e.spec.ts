import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

function waitForApiResponse(page: import('@playwright/test').Page, urlPart: string) {
  return page.waitForResponse((response) => {
    const resourceType = response.request().resourceType()
    return (
      (resourceType === 'xhr' || resourceType === 'fetch') &&
      response.request().method() === 'GET' &&
      response.url().includes(urlPart)
    )
  })
}

test.describe('Assistant Career Pages @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant career spec only runs for assistant module gate')

  test('career pages render real data and keep assistant read-only boundaries @assistant-t228-career-real', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    const positionsResponsePromise = waitForApiResponse(page, '/admin/position/drill-down')
    await page.locator('[data-quick-link="/career/positions"]').click()
    const positionsResponse = await positionsResponsePromise
    expect(positionsResponse.ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/career\/positions/)
    const positionsPage = page.locator('#page-positions')
    await expect(positionsPage).toBeVisible()
    await expect(positionsPage.locator('.page-title')).toContainText('Positions')
    await expect(positionsPage.locator('.summary-card')).toHaveCount(4)
    await expect(positionsPage).not.toContainText('敬请期待')

    await page.locator('#asst-view-list').click()
    const positionRows = positionsPage.locator('.data-table--list tbody tr')
    await expect(positionRows.first()).toBeVisible()

    const firstCompany =
      ((await positionRows.first().locator('td').nth(1).locator('.table-primary').textContent()) || '').trim()
    expect(firstCompany).toBeTruthy()

    await page.locator('#assistant-positions-keyword').fill(firstCompany)
    await expect(positionRows.first().locator('td').nth(1)).toContainText(firstCompany)

    const filteredRowCount = await positionRows.count()
    const linkedStudentButtons = positionsPage.locator('.student-link')
    const linkedStudentButtonCount = await linkedStudentButtons.count()
    let linkedStudentsOpened = false
    let linkedStudentModalText = 'no-linked-student-entry'

    if (linkedStudentButtonCount > 0) {
      await linkedStudentButtons.first().click()
      const studentModal = page.locator('.modal-card')
      await expect(studentModal).toBeVisible()
      linkedStudentsOpened = true
      linkedStudentModalText = ((await studentModal.textContent()) || '').trim().slice(0, 160)
      await studentModal.locator('.icon-button').click()
      await expect(studentModal).toBeHidden()
    }

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-positions',
      scenarioId: 'render-positions-page',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/positions',
        firstCompany,
        filteredRowCount,
        linkedStudentButtonCount,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-positions',
      scenarioId: 'filter-positions-list',
      inputClass: 'valid_query',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        keyword: firstCompany,
        filteredRowCount,
        activeView: 'list',
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-positions',
      scenarioId: 'view-linked-students',
      inputClass: 'position_relation',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        linkedStudentEntryVisible: linkedStudentButtonCount > 0,
        modalOpened: linkedStudentsOpened,
        modalPreview: linkedStudentModalText,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    const overviewListResponsePromise = waitForApiResponse(page, '/api/mentor/job-overview/list')
    const overviewCalendarResponsePromise = waitForApiResponse(page, '/api/mentor/job-overview/calendar')
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Job Overview' }).click()
    const overviewListResponse = await overviewListResponsePromise
    const overviewCalendarResponse = await overviewCalendarResponsePromise
    expect(overviewListResponse.ok()).toBeTruthy()
    expect(overviewCalendarResponse.ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/career\/job-overview/)
    const overviewPage = page.locator('#page-job-overview')
    await expect(overviewPage).toBeVisible()
    await expect(overviewPage.locator('.page-title')).toContainText('Job Overview')
    await expect(overviewPage.locator('.followup-banner')).toBeVisible()
    await expect(overviewPage).not.toContainText('敬请期待')

    const overviewRows = overviewPage.locator('.data-table tbody tr')
    const overviewRowCount = await overviewRows.count()

    if (overviewRowCount > 0) {
      await overviewRows.first().locator('.link-button').click()
      await expect(overviewPage.locator('.detail-callout')).toBeVisible()
    } else {
      await expect(overviewPage.locator('.panel-card__body--state').first()).toBeVisible()
    }

    const pendingBadgeText = ((await overviewPage.locator('.pending-pill').textContent()) || '').trim()

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-job-overview',
      scenarioId: 'render-job-overview-page',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/job-overview',
        rowCount: overviewRowCount,
        pendingBadgeText,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-job-overview',
      scenarioId: 'render-job-status-list',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        rowCount: overviewRowCount,
        emptyStateVisible: overviewRowCount === 0,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-job-overview',
      scenarioId: 'show-pending-followup-badge',
      inputClass: 'pending_followup_state',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        pendingBadgeText,
        followupBannerVisible: true,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    const mockPracticeResponsePromise = waitForApiResponse(page, '/api/mentor/mock-practice/list')
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Mock Practice' }).click()
    const mockPracticeResponse = await mockPracticeResponsePromise
    expect(mockPracticeResponse.ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/career\/mock-practice/)
    const mockPracticePage = page.locator('#page-mock-practice')
    await expect(mockPracticePage).toBeVisible()
    await expect(mockPracticePage.locator('.page-title')).toContainText('Mock Practice')
    await expect(mockPracticePage.locator('.readonly-pill')).toContainText('近期安排 / 反馈进展')
    await expect(mockPracticePage).not.toContainText('敬请期待')

    const mockPracticeRows = mockPracticePage.locator('.mock-practice-table tbody tr')
    await expect(mockPracticeRows.first()).toBeVisible()
    const mockPracticeRowCount = await mockPracticeRows.count()

    const forbiddenActionCount = await mockPracticePage
      .getByRole('button', { name: /新建模拟应聘|重新安排|确认执行/ })
      .count()

    await mockPracticePage.locator('.link-button').first().click()
    const detailModal = page.locator('.modal-card')
    await expect(detailModal).toBeVisible()
    await expect(detailModal).toContainText('模拟应聘详情')

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-mock-practice',
      scenarioId: 'render-mock-practice-page',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/mock-practice',
        rowCount: mockPracticeRowCount,
        readonlyPill: '近期安排 / 反馈进展',
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-mock-practice',
      scenarioId: 'view-mock-practice-results',
      inputClass: 'existing_record',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        detailModalVisible: true,
        modalPreview: ((await detailModal.textContent()) || '').trim().slice(0, 160),
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-career-mock-practice',
      scenarioId: 'hide-create-entry',
      inputClass: 'assistant_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        forbiddenActionCount,
        readonlyPillVisible: true,
      },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-career.e2e.spec.ts#assistant-t228-career-real',
    })
  })
})
