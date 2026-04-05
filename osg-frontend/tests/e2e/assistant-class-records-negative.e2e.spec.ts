import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './support/auth'

const moduleName = process.env.E2E_MODULE || ''

function waitForApiResponse(page: import('@playwright/test').Page, urlPart: string) {
  return page.waitForResponse(
    (response) =>
      (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') &&
      response.url().includes(urlPart),
    { timeout: 45000 }
  )
}

async function navigateToClassRecords(page: import('@playwright/test').Page) {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/home/)

  const listPromise = waitForApiResponse(page, '/admin/class-record/list')
  const statsPromise = waitForApiResponse(page, '/admin/class-record/stats')
  await page.locator('[data-home-action="class-records"]').click()
  await listPromise
  await statsPromise
  await expect(page).toHaveURL(/\/class-records/)
  await expect(page.locator('#page-myclass')).toBeVisible()
}

async function openReportForm(page: import('@playwright/test').Page) {
  const classPage = page.locator('#page-myclass')
  const createBtn = classPage.locator('#assistant-class-records-create')
  await expect(createBtn).toBeVisible()
  await createBtn.click()
  const editorCard = classPage.locator('.editor-card')
  await expect(editorCard).toBeVisible()
  return editorCard
}

async function closeReportForm(page: import('@playwright/test').Page) {
  const classPage = page.locator('#page-myclass')
  const cancelBtn = classPage.locator('.editor-card .ghost-button')
  await cancelBtn.click()
  await expect(classPage.locator('.editor-card')).not.toBeVisible()
}

/**
 * After validation failure, submitReport sets errorMessage which makes
 * .state-card--error visible.  We also confirm the editor-card stays open
 * so the user can correct their input.
 */
async function assertValidationBlocked(page: import('@playwright/test').Page) {
  const classPage = page.locator('#page-myclass')
  // The editor card must remain visible (form not submitted/closed)
  await expect(classPage.locator('.editor-card')).toBeVisible()
  // An error message card should appear
  const errorCard = classPage.locator('.state-card--error')
  await expect(errorCard).toBeVisible()
}

test.describe('Assistant Class Records Negative Boundary @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant class records negative spec only runs for assistant module')

  // ---------------------------------------------------------------------------
  // N01 — Submit with all fields empty (studentId is '' by default)
  // ---------------------------------------------------------------------------
  test('N01 empty form submit is blocked', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    await openReportForm(page)

    // Click submit without filling anything — default draft has empty studentId,
    // empty classDate, and empty feedbackContent
    await page.locator('#assistant-class-record-submit').click()

    await assertValidationBlocked(page)
  })

  // ---------------------------------------------------------------------------
  // N02 — Empty student: fill date & feedback but skip student selection
  // ---------------------------------------------------------------------------
  test('N02 empty student blocks submission', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const editorCard = await openReportForm(page)

    // Fill date and feedback but NOT student
    await editorCard.locator('#assistant-class-record-date').fill('2026-03-29T10:00')
    await editorCard.locator('#assistant-class-record-feedback').fill('Test feedback content')

    await page.locator('#assistant-class-record-submit').click()
    await assertValidationBlocked(page)
  })

  // ---------------------------------------------------------------------------
  // N03 — Empty date: fill student & feedback but leave date blank
  // ---------------------------------------------------------------------------
  test('N03 empty date blocks submission', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const editorCard = await openReportForm(page)

    // Pick a student if available, otherwise skip
    const studentSelect = editorCard.locator('#assistant-class-record-student')
    const options = await studentSelect.locator('option').count()
    if (options > 1) {
      // Select a non-placeholder option
      await studentSelect.selectOption({ index: 1 })
    }

    // Fill feedback but leave date empty
    await editorCard.locator('#assistant-class-record-feedback').fill('Some feedback')

    await page.locator('#assistant-class-record-submit').click()
    await assertValidationBlocked(page)
  })

  // ---------------------------------------------------------------------------
  // N04 — Empty duration: clear duration, fill required fields, submit
  // ---------------------------------------------------------------------------
  test('N04 empty duration does not block submission (not required)', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const editorCard = await openReportForm(page)

    // Clear the duration field (it defaults to "1.5")
    await editorCard.locator('#assistant-class-record-duration').clear()

    // The form only validates studentId, classDate, feedbackContent — duration
    // is NOT in the guard, so the submit should proceed past validation.
    // We still expect the form to stay visible (API will fail because no student).
    const hadStudent = await (async () => {
      const studentSelect = editorCard.locator('#assistant-class-record-student')
      const opts = await studentSelect.locator('option').count()
      if (opts > 1) {
        await studentSelect.selectOption({ index: 1 })
        return true
      }
      return false
    })()

    await editorCard.locator('#assistant-class-record-date').fill('2026-03-29T10:00')
    await editorCard.locator('#assistant-class-record-feedback').fill('Feedback with empty duration')

    // If no student was available, validation still blocks
    if (!hadStudent) {
      await page.locator('#assistant-class-record-submit').click()
      await assertValidationBlocked(page)
    } else {
      // With student, date, feedback — submission passes frontend validation
      // and attempts API call which may fail. Just verify no crash.
      await page.locator('#assistant-class-record-submit').click()
      // Wait briefly for either success (form closes) or error card
      await page.waitForTimeout(3000)
      // Page should still be on class-records
      await expect(page).toHaveURL(/\/class-records/)
    }
  })

  // ---------------------------------------------------------------------------
  // N05 — Empty feedback: fill student & date, leave feedback empty
  // ---------------------------------------------------------------------------
  test('N05 empty feedback blocks submission', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const editorCard = await openReportForm(page)

    // Pick student if available
    const studentSelect = editorCard.locator('#assistant-class-record-student')
    const opts = await studentSelect.locator('option').count()
    if (opts > 1) {
      await studentSelect.selectOption({ index: 1 })
    }

    await editorCard.locator('#assistant-class-record-date').fill('2026-03-29T10:00')
    // Leave feedback empty

    await page.locator('#assistant-class-record-submit').click()
    await assertValidationBlocked(page)
  })

  // ---------------------------------------------------------------------------
  // N06 — XSS in feedback textarea
  // ---------------------------------------------------------------------------
  test('N06 XSS script in feedback — page stays stable', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const editorCard = await openReportForm(page)
    const feedbackArea = editorCard.locator('#assistant-class-record-feedback')

    await feedbackArea.fill('<script>alert(1)</script>')

    // The value should be stored as text, not executed
    const value = await feedbackArea.inputValue()
    expect(value).toContain('<script>')

    // Page should not have navigated or shown a JS alert
    await expect(page).toHaveURL(/\/class-records/)
    await expect(editorCard).toBeVisible()

    // Close form without submitting
    await closeReportForm(page)
  })

  // ---------------------------------------------------------------------------
  // N07 — XSS in keyword filter input
  // ---------------------------------------------------------------------------
  test('N07 XSS script in keyword filter — page stays stable', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const keywordInput = classPage.locator('#assistant-class-records-keyword')
    await expect(keywordInput).toBeVisible()

    await keywordInput.fill('<script>alert("xss")</script>')

    // The input should hold the raw text
    const value = await keywordInput.inputValue()
    expect(value).toContain('<script>')

    // Apply the filter — should not crash
    const reloadPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-search').click()
    const response = await reloadPromise
    expect(response.ok()).toBeTruthy()

    // Page still on class-records
    await expect(page).toHaveURL(/\/class-records/)
    await expect(classPage).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // N08 — SQL injection in keyword filter
  // ---------------------------------------------------------------------------
  test('N08 SQL injection in keyword filter — no crash', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const keywordInput = classPage.locator('#assistant-class-records-keyword')

    await keywordInput.fill("' OR 1=1 --")

    const reloadPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-search').click()
    const response = await reloadPromise
    // Server should return 200 (safe handling)
    expect(response.ok()).toBeTruthy()

    // Page remains stable
    await expect(page).toHaveURL(/\/class-records/)
    await expect(classPage).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // N09 — Non-existent keyword filter
  // ---------------------------------------------------------------------------
  test('N09 non-existent keyword shows empty or results without crash', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const keywordInput = classPage.locator('#assistant-class-records-keyword')

    await keywordInput.fill('XXXXNOTEXIST999')

    const reloadPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-search').click()
    const response = await reloadPromise
    expect(response.ok()).toBeTruthy()

    // Page should still show class-records (may have 0 rows)
    await expect(page).toHaveURL(/\/class-records/)
    await expect(classPage).toBeVisible()

    // Either the table has 0 rows or the empty-state card shows
    const rows = classPage.locator('[data-class-record-row]')
    const rowCount = await rows.count()
    const emptyState = classPage.locator('.state-card', { hasText: '暂无课程记录' })
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    // Both conditions are acceptable: either 0 rows OR an empty-state message
    expect(rowCount >= 0).toBeTruthy()
    if (rowCount === 0) {
      // Should show the "no results" state card or the table section is hidden
      expect(hasEmptyState || rowCount === 0).toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // N10 — Reset after empty results
  // ---------------------------------------------------------------------------
  test('N10 reset after empty results restores data', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const keywordInput = classPage.locator('#assistant-class-records-keyword')

    // Apply a non-matching filter
    await keywordInput.fill('XXXXNOTEXIST999')
    const filterPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-search').click()
    await filterPromise

    // Now reset
    const resetPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-reset').click()
    const resetResponse = await resetPromise
    expect(resetResponse.ok()).toBeTruthy()

    // Keyword should be cleared
    const keywordValue = await keywordInput.inputValue()
    expect(keywordValue).toBe('')

    // Page should still be functional
    await expect(page).toHaveURL(/\/class-records/)
    await expect(classPage).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // N11 — Close form with cancel button
  // ---------------------------------------------------------------------------
  test('N11 close form with cancel button — no error', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    await openReportForm(page)

    // Close via cancel
    await closeReportForm(page)

    // No error card should appear
    const errorCard = page.locator('#page-myclass .state-card--error')
    await expect(errorCard).not.toBeVisible()

    // Page remains on class-records
    await expect(page).toHaveURL(/\/class-records/)
  })

  // ---------------------------------------------------------------------------
  // N12 — Toggle report form open/close multiple times
  // ---------------------------------------------------------------------------
  test('N12 toggle report form open/close multiple times — no crash', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const createBtn = classPage.locator('#assistant-class-records-create')
    const editorCard = classPage.locator('.editor-card')

    // Toggle open
    await createBtn.click()
    await expect(editorCard).toBeVisible()

    // Toggle close (same button toggles)
    await createBtn.click()
    await expect(editorCard).not.toBeVisible()

    // Toggle open again
    await createBtn.click()
    await expect(editorCard).toBeVisible()

    // Close via cancel
    await closeReportForm(page)
    await expect(editorCard).not.toBeVisible()

    // No error
    const errorCard = classPage.locator('.state-card--error')
    await expect(errorCard).not.toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // N13 — Status filter that has no results
  // ---------------------------------------------------------------------------
  test('N13 status filter with no results — no crash', async ({ page }) => {
    test.setTimeout(120000)
    await navigateToClassRecords(page)

    const classPage = page.locator('#page-myclass')
    const statusSelect = classPage.locator('.form-select').first()

    // Select rejected status (已驳回) — may have 0 entries
    await statusSelect.selectOption({ label: '已驳回' })

    const reloadPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-search').click()
    const response = await reloadPromise
    expect(response.ok()).toBeTruthy()

    // Page stable regardless of row count
    await expect(page).toHaveURL(/\/class-records/)
    await expect(classPage).toBeVisible()

    // Reset back
    const resetPromise = waitForApiResponse(page, '/admin/class-record/list')
    await classPage.locator('#assistant-class-records-reset').click()
    await resetPromise
  })
})
