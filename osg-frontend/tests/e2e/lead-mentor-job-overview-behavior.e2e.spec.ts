import { expect, test, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const jobOverviewListPath = '/api/lead-mentor/job-overview/list'

async function waitForScopedOverview(page: Page, scope: 'pending' | 'coaching' | 'managed'): Promise<APIResponse> {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') {
      return false
    }
    if (!response.url().includes(jobOverviewListPath)) {
      return false
    }
    const url = new URL(response.url())
    return url.searchParams.get('scope') === scope
  })
}

async function openJobOverviewPage(page: Page) {
  const pendingPromise = waitForScopedOverview(page, 'pending')
  const coachingPromise = waitForScopedOverview(page, 'coaching')
  const managedPromise = waitForScopedOverview(page, 'managed')

  await page.goto('/career/job-overview', { waitUntil: 'domcontentloaded' })

  const pendingBody = await assertRuoyiSuccess(pendingPromise, `${jobOverviewListPath}?scope=pending`)
  const coachingBody = await assertRuoyiSuccess(coachingPromise, `${jobOverviewListPath}?scope=coaching`)
  const managedBody = await assertRuoyiSuccess(managedPromise, `${jobOverviewListPath}?scope=managed`)

  await expect(page).toHaveURL(/\/career\/job-overview/)
  await expect(page.locator('#page-job-overview')).toBeVisible()

  return { pendingBody, coachingBody, managedBody }
}

function toVisibleOverviewRows(body: any) {
  const rows = Array.isArray(body?.rows) ? body.rows : []
  return rows.slice(0, 5).map((row: any) => ({
    applicationId: row.applicationId,
    studentId: row.studentId,
    currentStage: row.currentStage,
    mentorNames: row.mentorNames,
  }))
}

test.describe('Lead Mentor Job Overview Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('job overview scopes record behavior evidence for pending/coaching/managed @lead-mentor-s042-job-overview-scope-tabs', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    const { pendingBody, coachingBody, managedBody } = await openJobOverviewPage(page)

    const pendingRows = Array.isArray(pendingBody?.rows) ? pendingBody.rows : []
    const coachingRows = Array.isArray(coachingBody?.rows) ? coachingBody.rows : []
    const managedRows = Array.isArray(managedBody?.rows) ? managedBody.rows : []

    await page.locator('#lm-job-tab-pending').click()
    await expect(page.locator('#lm-job-content-pending')).toBeVisible()

    await page.locator('#lm-job-tab-coaching').click()
    await expect(page.locator('#lm-job-content-coaching')).toBeVisible()

    await page.locator('#lm-job-tab-managed').click()
    await expect(page.locator('#lm-job-content-managed')).toBeVisible()

    await recordBehaviorScenario({
      capabilityId: 'job-overview-scope-tabs',
      scenarioId: 'pending-scope',
      inputClass: 'pending_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/job-overview',
        scope: 'pending',
        rowCount: pendingRows.length,
        rows: toVisibleOverviewRows(pendingBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-job-overview-behavior.e2e.spec.ts#lead-mentor-s042-job-overview-scope-tabs',
    })

    await recordBehaviorScenario({
      capabilityId: 'job-overview-scope-tabs',
      scenarioId: 'coaching-scope',
      inputClass: 'coaching_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/job-overview',
        scope: 'coaching',
        rowCount: coachingRows.length,
        rows: toVisibleOverviewRows(coachingBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-job-overview-behavior.e2e.spec.ts#lead-mentor-s042-job-overview-scope-tabs',
    })

    await recordBehaviorScenario({
      capabilityId: 'job-overview-scope-tabs',
      scenarioId: 'managed-scope',
      inputClass: 'managed_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/job-overview',
        scope: 'managed',
        rowCount: managedRows.length,
        rows: toVisibleOverviewRows(managedBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-job-overview-behavior.e2e.spec.ts#lead-mentor-s042-job-overview-scope-tabs',
    })
  })
})
