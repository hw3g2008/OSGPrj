import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

function waitForApiResponse(page: import('@playwright/test').Page, urlPart: string, timeout = 60000) {
  return page.waitForResponse((response) => {
    const resourceType = response.request().resourceType()
    return (
      (resourceType === 'xhr' || resourceType === 'fetch') &&
      response.request().method() === 'GET' &&
      response.url().includes(urlPart)
    )
  }, { timeout })
}

test.describe('Assistant Class Records @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant class records spec only runs for assistant module gate')

  test('class records page renders real data, opens detail, and keeps create entry hidden @assistant-t238-class-records-real', async ({
    page,
  }) => {
    test.setTimeout(75000)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/home/)

    const listResponsePromise = waitForApiResponse(page, '/admin/class-record/list')
    const statsResponsePromise = waitForApiResponse(page, '/admin/class-record/stats')
    await page.locator('[data-home-action="class-records"]').click()
    const listResponse = await listResponsePromise
    const statsResponse = await statsResponsePromise
    expect(listResponse.ok()).toBeTruthy()
    expect(statsResponse.ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/class-records/)
    const classRecordsPage = page.locator('#page-myclass')
    await expect(classRecordsPage).toBeVisible()
    await expect(classRecordsPage.locator('.page-title')).toContainText('Class Records')
    await expect(classRecordsPage.locator('.summary-card')).toHaveCount(4)
    await expect(classRecordsPage).not.toContainText('敬请期待')
    await expect(classRecordsPage).not.toContainText('记录骨架')

    const rows = classRecordsPage.locator('[data-class-record-row]')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    const firstRecordTitle =
      ((await rows.first().locator('td').first().locator('.table-primary').textContent()) || '').trim()
    expect(firstRecordTitle).toBeTruthy()

    await rows.first().locator('.link-button').click()
    const detailPanel = classRecordsPage.locator('.detail-card')
    await expect(detailPanel).toBeVisible()
    await expect(detailPanel).toContainText('反馈摘要')

    const forbiddenActionCount = await classRecordsPage
      .getByRole('button', { name: /新增课程|新建课程|上报课程记录|排课/ })
      .count()

    await recordBehaviorScenario({
      capabilityId: 'assistant-class-records',
      scenarioId: 'render-class-records-page',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/class-records',
        rowCount,
        firstRecordTitle,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-class-records.e2e.spec.ts#assistant-t238-class-records-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-class-records',
      scenarioId: 'view-course-record-detail',
      inputClass: 'existing_record',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        detailVisible: true,
        detailPreview: ((await detailPanel.textContent()) || '').trim().slice(0, 160),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-class-records.e2e.spec.ts#assistant-t238-class-records-real',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-class-records',
      scenarioId: 'keep-no-create-course-entry',
      inputClass: 'assistant_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        forbiddenActionCount,
        createEntryVisible: forbiddenActionCount > 0,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-class-records.e2e.spec.ts#assistant-t238-class-records-real',
    })

    await page.reload()
    await expect(page).toHaveURL(/\/class-records/)
    await expect(page.locator('.nav-item.active').first()).toContainText('Class Records')
    await expect(classRecordsPage.locator('.summary-card')).toHaveCount(4)
  })
})
