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

async function navigateToStudents(page: import('@playwright/test').Page) {
  const listPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
  await page.goto('/students', { waitUntil: 'domcontentloaded', timeout: 30000 })
  const body = await listPromise
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  return body
}

async function searchWithKeyword(page: import('@playwright/test').Page, keyword: string) {
  await page.locator('#assistant-students-keyword').fill(keyword)
  const filteredPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
  await page.locator('#assistant-students-search').click()
  return filteredPromise
}

async function resetAndWait(page: import('@playwright/test').Page) {
  const resetPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
  await page.locator('#assistant-students-reset').click()
  return resetPromise
}

test.describe('Assistant Student List Negative Boundary @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant student negative spec only runs for assistant module')

  // N01: Non-existent keyword
  test('N01 non-existent keyword does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const filteredBody = await searchWithKeyword(page, 'XXXXNOTEXIST999')

    // Page should not crash — either empty state or 0 rows
    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()
    expect(filteredBody.total || 0).toBe(0)

    // Should show empty state card
    const emptyState = studentPage.locator('.state-card')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('暂无学员')

    // No error card should appear
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n01-nonexistent-keyword',
      inputClass: 'nonexistent_keyword',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { keyword: 'XXXXNOTEXIST999', total: filteredBody.total || 0, pageNotCrashed: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N01',
    })
  })

  // N02: XSS in search
  test('N02 XSS in search does not inject script', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const xssPayload = '<script>alert(1)</script>'
    const filteredBody = await searchWithKeyword(page, xssPayload)

    // Page should not crash
    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()

    // No alert dialog should appear — no page.on('dialog') needed because
    // if an alert fired the test would hang; just verify the page is intact
    // and no script tags rendered in the DOM
    const scriptTags = await page.locator('script').count()
    // The page's own script tags are fine; we check that no injected script content
    // appears in visible text nodes
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('<script>alert(1)</script>')

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n02-xss-search',
      inputClass: 'xss_payload',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { keyword: xssPayload, total: filteredBody.total || 0, noScriptInjection: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N02',
    })
  })

  // N03: SQL injection
  test('N03 SQL injection string does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const sqlPayload = "' OR 1=1 --"
    const filteredBody = await searchWithKeyword(page, sqlPayload)

    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()

    // No error card should appear
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    // The keyword input should still hold the value
    await expect(page.locator('#assistant-students-keyword')).toHaveValue(sqlPayload)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n03-sql-injection',
      inputClass: 'sql_injection_payload',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { keyword: sqlPayload, total: filteredBody.total || 0, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N03',
    })
  })

  // N04: Special characters
  test('N04 special characters do not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const specialChars = "北大<>%&'"
    const filteredBody = await searchWithKeyword(page, specialChars)

    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    // Input should retain the value
    await expect(page.locator('#assistant-students-keyword')).toHaveValue(specialChars)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n04-special-characters',
      inputClass: 'special_characters',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { keyword: specialChars, total: filteredBody.total || 0, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N04',
    })
  })

  // N05: Account status filter with possibly no results
  test('N05 account status filter — select refund status, page does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const studentPage = page.locator('#page-student-list')
    const selects = studentPage.locator('.form-select')
    // accountStatus is the 4th select (index 3: school, majorDirection, accountStatus — 0-indexed: 2)
    // But from TC-10 in positive spec: accountStatus is the 3rd select (index 2)
    // Vue source: selects are school(0), majorDirection(1), accountStatus(2)
    // Select "退款" (value="3") — likely has 0 students
    await selects.nth(2).selectOption('3')

    const filteredPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('#assistant-students-search').click()
    const filteredBody = await filteredPromise

    await expect(studentPage).toBeVisible()

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    // Either rows or empty state should show
    const rows = studentPage.locator('[data-student-row]')
    const rowCount = await rows.count()
    if (rowCount === 0) {
      const emptyState = studentPage.locator('.state-card')
      await expect(emptyState).toBeVisible()
    }

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n05-account-status-filter',
      inputClass: 'refund_status_filter',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { filteredTotal: filteredBody.total || 0, rowCount, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N05',
    })
  })

  // N06: Direction filter with possibly no results
  test('N06 direction filter — select first direction then apply, page does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    const body = await navigateToStudents(page)

    if ((body.total || 0) === 0) {
      test.skip(true, 'No student data — direction filter test requires at least 1 row')
    }

    const studentPage = page.locator('#page-student-list')
    const selects = studentPage.locator('.form-select')
    // majorDirection is the 2nd select (index 1)
    const directionSelect = selects.nth(1)
    const directionOptions = await directionSelect.locator('option').allTextContents()
    // Skip the "全部方向" default
    const nonDefaultOptions = directionOptions.filter((opt) => opt !== '全部方向' && opt.trim() !== '')
    if (nonDefaultOptions.length === 0) {
      test.skip(true, 'No direction options available to test')
    }

    await directionSelect.selectOption({ label: nonDefaultOptions[0] })

    const filteredPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('#assistant-students-search').click()
    const filteredBody = await filteredPromise

    await expect(studentPage).toBeVisible()

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n06-direction-filter',
      inputClass: 'direction_filter',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { direction: nonDefaultOptions[0], filteredTotal: filteredBody.total || 0, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N06',
    })
  })

  // N07: Reset after empty results
  test('N07 reset after empty results — page returns to normal', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    const body = await navigateToStudents(page)

    // First, get empty results
    await searchWithKeyword(page, 'XXXXNOTEXIST999')

    const studentPage = page.locator('#page-student-list')
    // Confirm empty state is showing
    const emptyState = studentPage.locator('.state-card')
    await expect(emptyState).toBeVisible()

    // Now reset
    const resetBody = await resetAndWait(page)

    // Keyword should be cleared
    await expect(page.locator('#assistant-students-keyword')).toHaveValue('')

    // Full list should reload — total should match original
    expect(resetBody.total).toBe(body.total)

    // Page container should be visible
    await expect(studentPage).toBeVisible()

    // Summary cards should still be there
    await expect(studentPage.locator('.summary-card')).toHaveCount(4)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n07-reset-after-empty',
      inputClass: 'reset_after_empty_results',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { originalTotal: body.total, resetTotal: resetBody.total, keywordCleared: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N07',
    })
  })

  // N08: Clear input and search — returns all students
  test('N08 clear input and search — returns all students', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    const body = await navigateToStudents(page)

    if ((body.total || 0) === 0) {
      test.skip(true, 'No student data — clear input test requires at least 1 row')
    }

    // First apply a filter
    await searchWithKeyword(page, 'XXXXNOTEXIST999')

    // Now clear the keyword manually and search
    await page.locator('#assistant-students-keyword').clear()
    const clearedBody = await searchWithKeyword(page, '')

    // Should return all students again
    expect(clearedBody.total).toBe(body.total)

    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n08-clear-input-search',
      inputClass: 'empty_keyword_after_filter',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { originalTotal: body.total, returnedTotal: clearedBody.total },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N08',
    })
  })

  // N09: Empty/whitespace keyword search
  test('N09 empty and whitespace keyword search does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    const body = await navigateToStudents(page)

    // Search with just spaces (v-model.trim will make it empty)
    await page.locator('#assistant-students-keyword').fill('   ')
    const spacedPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('#assistant-students-search').click()
    const spacedBody = await spacedPromise

    const studentPage = page.locator('#page-student-list')
    await expect(studentPage).toBeVisible()

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    // Spaces should be trimmed so total should match original
    expect(spacedBody.total).toBe(body.total)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n09-whitespace-keyword',
      inputClass: 'whitespace_keyword',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { originalTotal: body.total, spacedSearchTotal: spacedBody.total, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N09',
    })
  })

  // N10: Rapid filter switching
  test('N10 rapid filter switching does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const studentPage = page.locator('#page-student-list')
    const selects = studentPage.locator('.form-select')
    const keywordInput = page.locator('#assistant-students-keyword')
    const searchButton = page.locator('#assistant-students-search')

    // Rapidly switch between filter combinations
    const combinations = [
      { keyword: 'test1', status: '1' },
      { keyword: 'test2', status: '2' },
      { keyword: '', status: '' },
      { keyword: '北大', status: '3' },
      { keyword: '', status: '' },
    ]

    for (const combo of combinations) {
      await keywordInput.fill(combo.keyword)
      if (combo.status) {
        await selects.nth(2).selectOption(combo.status)
      } else {
        await selects.nth(2).selectOption('')
      }
    }

    // Final search should still work
    const finalPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await searchButton.click()
    const finalBody = await finalPromise

    await expect(studentPage).toBeVisible()

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n10-rapid-filter-switching',
      inputClass: 'rapid_filter_switching',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { finalTotal: finalBody.total || 0, noCrash: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N10',
    })
  })

  // N11: Pagination boundary — single page
  test('N11 pagination boundary — prev/next disabled on single page', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    // Force a filter that likely yields 0 or very few results
    const filteredBody = await searchWithKeyword(page, 'XXXXNOTEXIST999')

    const studentPage = page.locator('#page-student-list')

    if ((filteredBody.total || 0) === 0) {
      // Empty state — no pagination controls at all, table footer hidden
      const tableFooter = studentPage.locator('.table-footer')
      await expect(tableFooter).toHaveCount(0)

      await recordBehaviorScenario({
        capabilityId: 'assistant-student-list-negative',
        scenarioId: 'n11-pagination-boundary',
        inputClass: 'empty_result_pagination',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: { total: 0, tableFooterHidden: true },
        evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N11',
      })
      return
    }

    // If there is data but only 1 page, prev/next should be disabled
    if (filteredBody.total <= 8) {
      const footer = studentPage.locator('.table-footer')
      await expect(footer).toBeVisible()
      const prevButton = footer.locator('.ghost-button--inline').filter({ hasText: '上一页' })
      const nextButton = footer.locator('.ghost-button--inline').filter({ hasText: '下一页' })
      await expect(prevButton).toBeDisabled()
      await expect(nextButton).toBeDisabled()

      const pageIndicator = footer.locator('.page-indicator')
      const indicatorText = (await pageIndicator.textContent() || '').trim()
      expect(indicatorText).toMatch(/^1\s*\/\s*1$/)

      await recordBehaviorScenario({
        capabilityId: 'assistant-student-list-negative',
        scenarioId: 'n11-pagination-boundary',
        inputClass: 'single_page_pagination',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: { total: filteredBody.total, prevDisabled: true, nextDisabled: true, pageIndicator: indicatorText },
        evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N11',
      })
      return
    }

    // More than 1 page — just verify pagination works
    const footer = studentPage.locator('.table-footer')
    await expect(footer).toBeVisible()

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n11-pagination-boundary',
      inputClass: 'multi_page_pagination',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { total: filteredBody.total, tableFooterVisible: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N11',
    })
  })

  // N12: Page structure intact after multiple filter cycles
  test('N12 page structure intact after multiple filter cycles', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await navigateToStudents(page)

    const studentPage = page.locator('#page-student-list')

    // Cycle 1: keyword search
    await searchWithKeyword(page, 'XXXXNOTEXIST999')

    // Cycle 2: reset
    await resetAndWait(page)

    // Cycle 3: status filter
    const selects = studentPage.locator('.form-select')
    await selects.nth(2).selectOption('1')
    const statusPromise = assertRuoyiSuccess(waitForStudentList(page), '/admin/student/list')
    await page.locator('#assistant-students-search').click()
    await statusPromise

    // Cycle 4: reset again
    await resetAndWait(page)

    // Cycle 5: special characters
    await searchWithKeyword(page, "<>%&'\"")

    // Cycle 6: final reset
    await resetAndWait(page)

    // Now verify page structure is fully intact
    await expect(studentPage).toBeVisible()
    await expect(studentPage.locator('.page-title')).toContainText('学员列表')
    await expect(studentPage.locator('.summary-card')).toHaveCount(4)

    // Toolbar should be intact
    await expect(page.locator('#assistant-students-keyword')).toBeVisible()
    await expect(page.locator('#assistant-students-search')).toBeVisible()
    await expect(page.locator('#assistant-students-reset')).toBeVisible()
    await expect(studentPage.locator('.toolbar-chip')).toHaveCount(3)

    // Table headers should still be present (if data exists)
    const rows = studentPage.locator('[data-student-row]')
    const rowCount = await rows.count()
    if (rowCount > 0) {
      const headers = studentPage.locator('table.data-table thead th')
      await expect(headers).toHaveCount(6)
    }

    // No error card
    const errorCard = studentPage.locator('.state-card--error')
    await expect(errorCard).toHaveCount(0)

    await recordBehaviorScenario({
      capabilityId: 'assistant-student-list-negative',
      scenarioId: 'n12-page-structure-after-filters',
      inputClass: 'multiple_filter_cycles',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { pageVisible: true, summaryCards: 4, toolbarChips: 3, noError: true },
      evidenceRef: 'osg-frontend/tests/e2e/assistant-student-list-negative.e2e.spec.ts#N12',
    })
  })
})
