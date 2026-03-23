import { expect, test, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const positionsListPath = '/api/lead-mentor/positions/list'
const positionsMetaPath = '/api/lead-mentor/positions/meta'

async function openPositionsPage(page: Page): Promise<void> {
  const metaPromise = waitForApi(page, positionsMetaPath, 'GET')
  const listPromise = waitForApi(page, positionsListPath, 'GET')
  await page.goto('/career/positions', { waitUntil: 'domcontentloaded' })

  await assertRuoyiSuccess(metaPromise, positionsMetaPath)
  await assertRuoyiSuccess(listPromise, positionsListPath)

  await expect(page).toHaveURL(/\/career\/positions/)
  await expect(page.locator('#page-positions')).toBeVisible()
}

async function switchToListView(page: Page): Promise<void> {
  const listViewButton = page.locator('#lead-view-list')
  await expect(listViewButton).toBeVisible()
  await listViewButton.click()
  await expect(listViewButton).toHaveClass(/btn--active/)
  await expect(page.locator('#lead-position-list')).toBeVisible()
}

async function filterByCompany(page: Page, companyName: string): Promise<any> {
  const filteredListPromise = waitForApi(page, positionsListPath, 'GET')
  await page.getByLabel('公司').selectOption(companyName)
  return assertRuoyiSuccess(filteredListPromise, positionsListPath)
}

async function extractStudentsBody(response: APIResponse): Promise<any> {
  expect(response.ok(), 'positions students endpoint should return HTTP 2xx').toBeTruthy()
  const raw = await response.text()
  const body = JSON.parse(raw)
  expect(body?.code, `positions students endpoint should return code=200, body=${raw.slice(0, 500)}`).toBe(200)
  return body
}

test.describe('Lead Mentor Positions Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('filtered positions list records positions-list behavior evidence @lead-mentor-s041-positions-list-behavior', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await openPositionsPage(page)
    await switchToListView(page)

    const filteredBody = await filterByCompany(page, 'Goldman Sachs')
    const rows = Array.isArray(filteredBody?.rows) ? filteredBody.rows : []

    expect(rows.length, 'filtered positions-list should return Goldman Sachs rows').toBeGreaterThan(0)
    expect(rows.every((row) => row.companyName === 'Goldman Sachs')).toBeTruthy()

    const visibleRows = page.locator('#lead-position-list tbody tr')
    await expect(visibleRows).toHaveCount(3)
    await expect(visibleRows.first()).toContainText('Goldman Sachs')
    await expect(page.locator('.page-footer-stats')).toContainText('我的学员 2人')

    await recordBehaviorScenario({
      capabilityId: 'positions-list',
      scenarioId: 'list-with-real-filters',
      inputClass: 'filtered_query',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/positions',
        filters: { companyName: 'Goldman Sachs' },
        rows: rows.map((row) => ({
          positionId: row.positionId,
          companyName: row.companyName,
          myStudentCount: row.myStudentCount,
        })),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-positions-behavior.e2e.spec.ts#lead-mentor-s041-positions-list-behavior',
    })
  })

  test('opening my students modal records positions-my-students behavior evidence @lead-mentor-s041-my-students-behavior', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await openPositionsPage(page)
    await switchToListView(page)
    await filterByCompany(page, 'Goldman Sachs')

    const jobRow = page
      .locator('#lead-position-list tbody tr')
      .filter({ hasText: 'Goldman Sachs' })
      .filter({ hasText: 'IB Analyst' })
      .first()

    await expect(jobRow).toBeVisible()

    const studentsResponsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'GET' &&
        /\/api\/lead-mentor\/positions\/\d+\/students(?:\?|$)/.test(response.url())
      )
    })

    await jobRow.locator('[data-surface-trigger="modal-position-mystudents"]').click()

    const studentsBody = await extractStudentsBody(await studentsResponsePromise)
    const students = Array.isArray(studentsBody?.data) ? studentsBody.data : []

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Goldman Sachs - IB Analyst 我的学员申请')

    const visibleStudents = await modal.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || '')
        return {
          studentId: cells[0],
          studentName: cells[1],
          currentStage: cells[3],
          usedHours: cells[4],
        }
      }),
    )

    expect(students.length, 'positions-my-students should return three scoped students').toBe(3)
    expect(visibleStudents).toEqual([
      { studentId: '12766', studentName: '张三', currentStage: '面试中', usedHours: '24h' },
      { studentId: '12890', studentName: '李四', currentStage: '已投递', usedHours: '18h' },
      { studentId: '12345', studentName: '王五', currentStage: '获得Offer', usedHours: '32h' },
    ])

    await recordBehaviorScenario({
      capabilityId: 'positions-my-students',
      scenarioId: 'open-my-students-modal',
      inputClass: 'modal_detail',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/career/positions',
        positionName: 'IB Analyst',
        companyName: 'Goldman Sachs',
        students: students.map((student) => ({
          studentId: student.studentId,
          currentStage: student.currentStage,
          usedHours: student.usedHours,
        })),
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-positions-behavior.e2e.spec.ts#lead-mentor-s041-my-students-behavior',
    })
  })
})
