import { expect, test, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const studentListPath = '/api/lead-mentor/students/list'
const studentMetaPath = '/api/lead-mentor/students/meta'
const jobOverviewListPath = '/api/lead-mentor/job-overview/list'

async function waitForJobOverviewScope(page: Page, scope: 'pending' | 'coaching' | 'managed', studentName: string): Promise<APIResponse> {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') {
      return false
    }
    if (!response.url().includes(jobOverviewListPath)) {
      return false
    }
    const url = new URL(response.url())
    return url.searchParams.get('scope') === scope && url.searchParams.get('studentName') === studentName
  })
}

async function openStudentListPage(page: Page) {
  const metaPromise = waitForApi(page, studentMetaPath, 'GET')
  const listPromise = waitForApi(page, studentListPath, 'GET')

  await page.goto('/teaching/students', { waitUntil: 'domcontentloaded' })

  const metaBody = await assertRuoyiSuccess(metaPromise, studentMetaPath)
  const listBody = await assertRuoyiSuccess(listPromise, studentListPath)

  await expect(page).toHaveURL(/\/teaching\/students/)
  await expect(page.locator('#page-student-list')).toBeVisible()

  return { metaBody, listBody }
}

test.describe('Lead Mentor Student List Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('student list relation union records behavior evidence and linked filter persistence @lead-mentor-s044-student-list-relations', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    const { metaBody, listBody } = await openStudentListPage(page)

    const rows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const dualRelationRow = rows.find((row) => Array.isArray(row?.relations) && row.relations.length >= 2)

    expect(rows.length, 'student list should return at least one scoped student').toBeGreaterThan(0)
    expect(dualRelationRow, 'student list should expose at least one dual-relation student').toBeTruthy()
    expect(Array.isArray(metaBody?.data?.relationOptions), 'student list meta should expose relation options').toBeTruthy()

    const targetStudentName = String(dualRelationRow.studentName || '')
    const targetStudentId = String(dualRelationRow.studentId || '')
    expect(targetStudentName, 'dual-relation student should have a visible name').not.toBe('')

    const visibleRow = page
      .locator('#page-student-list tbody tr')
      .filter({ hasText: targetStudentName })
      .first()

    await expect(visibleRow).toBeVisible()
    await expect(visibleRow).toContainText('我教的学员')
    await expect(visibleRow).toContainText('班主任为我')

    const pendingPromise = waitForJobOverviewScope(page, 'pending', targetStudentName)
    const coachingPromise = waitForJobOverviewScope(page, 'coaching', targetStudentName)
    const managedPromise = waitForJobOverviewScope(page, 'managed', targetStudentName)

    await visibleRow.locator('[data-action="view-job-overview"]').click()

    const pendingBody = await assertRuoyiSuccess(pendingPromise, `${jobOverviewListPath}?scope=pending&studentName=${targetStudentName}`)
    const coachingBody = await assertRuoyiSuccess(coachingPromise, `${jobOverviewListPath}?scope=coaching&studentName=${targetStudentName}`)
    const managedBody = await assertRuoyiSuccess(managedPromise, `${jobOverviewListPath}?scope=managed&studentName=${targetStudentName}`)

    await expect(page).toHaveURL(/\/career\/job-overview\?studentName=/)
    expect(new URL(page.url()).searchParams.get('studentName')).toBe(targetStudentName)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await expect(page.locator('#page-job-overview input.form-input')).toHaveValue(targetStudentName)

    await recordBehaviorScenario({
      capabilityId: 'student-list-relations',
      scenarioId: 'relation-union-list',
      inputClass: 'relation_union',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/teaching/students',
        studentId: targetStudentId,
        studentName: targetStudentName,
        relations: dualRelationRow.relations,
        applyCount: dualRelationRow.applyCount,
        remainingHours: dualRelationRow.remainingHours,
        linkedJobOverview: {
          pendingCount: Array.isArray(pendingBody?.rows) ? pendingBody.rows.length : 0,
          coachingCount: Array.isArray(coachingBody?.rows) ? coachingBody.rows.length : 0,
          managedCount: Array.isArray(managedBody?.rows) ? managedBody.rows.length : 0,
        },
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-student-list-behavior.e2e.spec.ts#lead-mentor-s044-student-list-relations',
    })
  })
})
