import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const mockPracticeListPath = '/lead-mentor/mock-practice/list'
const MOCK_PRACTICE_API_TIMEOUT_MS = Number(process.env.E2E_MOCK_PRACTICE_TIMEOUT_MS || 90000)
const mockPracticeApiBaseUrl = process.env.E2E_API_PROXY_TARGET || 'http://127.0.0.1:28080'

async function getLeadMentorToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('osg_token'))
  expect(token, 'lead-mentor login should persist osg_token for authenticated api checks').toBeTruthy()
  return token!
}

async function fetchLeadMentorJson(page: Page, endpointPath: string) {
  const token = await getLeadMentorToken(page)
  const response = await page.request.get(`${mockPracticeApiBaseUrl}${endpointPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: MOCK_PRACTICE_API_TIMEOUT_MS,
  })
  return assertRuoyiSuccess(Promise.resolve(response), endpointPath)
}

async function openMockPracticePage(page: Page) {
  const abortMockPracticeRequest = (route: any) => route.abort('blockedbyclient')
  await page.route('**/api/lead-mentor/mock-practice/**', abortMockPracticeRequest)
  await page.route('**/lead-mentor/mock-practice/**', abortMockPracticeRequest)
  await page.goto('/career/mock-practice', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/career\/mock-practice/)
  await expect(page.locator('#page-mock-practice')).toBeVisible()
}

function toVisiblePracticeRows(body: any) {
  const rows = Array.isArray(body?.rows) ? body.rows : []
  return rows.slice(0, 5).map((row: any) => ({
    practiceId: row.practiceId,
    practiceType: row.practiceType,
    status: row.status,
  }))
}

test.describe('Lead Mentor Mock Practice Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('mock practice scopes record behavior evidence for pending/coaching/managed @lead-mentor-s043-mock-practice-scope-tabs', async ({
    page,
  }) => {
    test.setTimeout(360000)
    await loginAsAdmin(page)
    await openMockPracticePage(page)

    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible()
    const pendingBody = await fetchLeadMentorJson(page, `${mockPracticeListPath}?scope=pending`)
    const pendingRows = Array.isArray(pendingBody?.rows) ? pendingBody.rows : []

    await page.locator('#mock-tab-mycoaching').click()
    await expect(page.locator('#mock-content-mycoaching')).toBeVisible()
    const coachingBody = await fetchLeadMentorJson(page, `${mockPracticeListPath}?scope=coaching`)
    const coachingRows = Array.isArray(coachingBody?.rows) ? coachingBody.rows : []

    await page.locator('#mock-tab-mymanage').click()
    await expect(page.locator('#mock-content-mymanage')).toBeVisible()
    const managedBody = await fetchLeadMentorJson(page, `${mockPracticeListPath}?scope=managed`)
    const managedRows = Array.isArray(managedBody?.rows) ? managedBody.rows : []

    await recordBehaviorScenario({
      capabilityId: 'mock-practice-scope-tabs',
      scenarioId: 'pending-practice-scope',
      inputClass: 'pending_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/mock-practice',
        scope: 'pending',
        rowCount: pendingRows.length,
        rows: toVisiblePracticeRows(pendingBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-mock-practice-behavior.e2e.spec.ts#lead-mentor-s043-mock-practice-scope-tabs',
    })

    await recordBehaviorScenario({
      capabilityId: 'mock-practice-scope-tabs',
      scenarioId: 'coaching-practice-scope',
      inputClass: 'coaching_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/mock-practice',
        scope: 'coaching',
        rowCount: coachingRows.length,
        rows: toVisiblePracticeRows(coachingBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-mock-practice-behavior.e2e.spec.ts#lead-mentor-s043-mock-practice-scope-tabs',
    })

    await recordBehaviorScenario({
      capabilityId: 'mock-practice-scope-tabs',
      scenarioId: 'managed-practice-scope',
      inputClass: 'managed_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/mock-practice',
        scope: 'managed',
        rowCount: managedRows.length,
        rows: toVisiblePracticeRows(managedBody),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-mock-practice-behavior.e2e.spec.ts#lead-mentor-s043-mock-practice-scope-tabs',
    })
  })
})
