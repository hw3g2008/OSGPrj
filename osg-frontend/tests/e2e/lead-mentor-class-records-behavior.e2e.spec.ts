import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || process.env.UI_VISUAL_MODULE || ''
const studentListPath = '/api/lead-mentor/students/list'
const classRecordCreatePath = '/api/lead-mentor/class-records'

async function openClassRecordsPage(page: Page): Promise<void> {
  await page.goto('/teaching/class-records', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/teaching\/class-records/)
  await expect(page.locator('#page-myclass')).toBeVisible()
}

test.describe('Lead Mentor Class Records Behavior @lead-mentor @api', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor behavior spec only runs for lead-mentor module gate')

  test('submitting a class record records class-record-create behavior evidence @lead-mentor-s045-class-record-create', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await openClassRecordsPage(page)

    const studentListPromise = waitForApi(page, studentListPath, 'GET')
    await page.locator('[data-surface-trigger="modal-lm-report"]').click()
    const studentListBody = await assertRuoyiSuccess(studentListPromise, studentListPath)
    const students = Array.isArray(studentListBody?.rows) ? studentListBody.rows : []

    expect(students.length, 'lead-mentor students list should expose managed students for class record submit').toBeGreaterThan(0)

    const studentId = String(students[0].studentId)
    const studentName = String(students[0].studentName || '')
    const feedbackContent = `E2E class record submit ${Date.now()}`

    await page.locator('[data-report-field="student-id"]').selectOption(studentId)
    await page.locator('[data-report-field="class-date"]').fill('2026-03-23')
    await page.locator('[data-report-field="duration-hours"]').fill('1')
    await page.locator('[data-report-field="job-content"]').selectOption('case_prep')
    await page.locator('[data-report-field="feedback-content"]').fill(feedbackContent)

    const createResponsePromise = waitForApi(page, classRecordCreatePath, 'POST')
    await page.locator('.lm-report-footer .btn-primary').click()

    const createBody = await assertRuoyiSuccess(createResponsePromise, classRecordCreatePath)
    const created = createBody?.data || {}

    expect(created.studentId, 'class-record-create should echo the submitted studentId').toBe(Number(studentId))
    expect(created.courseType, 'class-record-create should echo the real courseType').toBe('job_coaching')
    expect(created.classStatus, 'class-record-create should echo the real content type').toBe('case_prep')
    expect(created.durationHours, 'class-record-create should persist the real duration').toBe(1)
    expect(created.status, 'class-record-create should return pending after submit').toBe('pending')

    await expect(page.locator('#lm-class-content-mine tbody tr').first()).toContainText(String(created.recordId))
    await expect(page.locator('#lm-class-content-mine tbody tr').first()).toContainText(studentName)
    await expect(page.locator('#lm-class-content-mine tbody tr').first()).toContainText('待审核')

    await recordBehaviorScenario({
      capabilityId: 'class-record-create',
      scenarioId: 'submit-class-record',
      inputClass: 'create_record',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/teaching/class-records',
        recordId: created.recordId,
        studentId: created.studentId,
        courseType: created.courseType,
        classDate: created.classDate,
        durationHours: created.durationHours,
        status: created.status,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/lead-mentor-class-records-behavior.e2e.spec.ts#lead-mentor-s045-class-record-create',
    })
  })
})
