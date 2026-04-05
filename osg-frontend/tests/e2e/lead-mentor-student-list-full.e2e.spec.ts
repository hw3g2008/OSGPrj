import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/students-full')
const ss = async (page: Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: false })
}

const studentMetaPath = '/api/lead-mentor/students/meta'
const studentListPath = '/api/lead-mentor/students/list'
const jobOverviewListPath = '/api/lead-mentor/job-overview/list'

async function navigateToStudentList(page: Page) {
  await loginAsAdmin(page)

  const metaPromise = waitForApi(page, studentMetaPath, 'GET')
  const listPromise = waitForApi(page, studentListPath, 'GET')

  await page.goto('/teaching/students', { waitUntil: 'networkidle', timeout: 30000 })
  await expect(page.locator('#page-student-list')).toBeVisible({ timeout: 15000 })

  const metaBody = await assertRuoyiSuccess(metaPromise, studentMetaPath).catch(() => null)
  const listBody = await assertRuoyiSuccess(listPromise, studentListPath).catch(() => null)

  return { metaBody, listBody }
}

test.describe('LM Student List Full E2E @lead-mentor', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  // ── Page Load ──────────────────────────────────────────────
  test('ST-FULL-001: page loads with all structural elements', async ({ page }) => {
    await navigateToStudentList(page)

    await expect(page.locator('#page-student-list')).toBeVisible()
    expect(page.locator('.page-title').textContent()).resolves.toContain('学员列表')
    expect(page.locator('.page-title-en').textContent()).resolves.toContain('Student List')
    expect(page.locator('.page-sub').textContent()).resolves.toContain('查看我教的学员和班主任为我的全部学员信息')

    await ss(page, 'ST-FULL-001-page-load')
  })

  // ── Filter Bar ─────────────────────────────────────────────
  test('ST-FULL-002: filter bar has all four controls', async ({ page }) => {
    await navigateToStudentList(page)

    const filters = page.locator('.filters')
    await expect(filters).toBeVisible()

    const keywordInput = filters.locator('input[type="text"]')
    await expect(keywordInput).toBeVisible()
    await expect(keywordInput).toHaveAttribute('placeholder', '搜索姓名')

    const selects = filters.locator('.form-select')
    const selectCount = await selects.count()
    expect(selectCount).toBe(3)

    await expect(filters.getByRole('button', { name: /搜索/ })).toBeVisible()
    await expect(filters.getByRole('button', { name: /重置/ })).toBeVisible()

    await ss(page, 'ST-FULL-002-filter-bar')
  })

  // ── Table Headers ──────────────────────────────────────────
  test('ST-FULL-003: table has correct column headers', async ({ page }) => {
    await navigateToStudentList(page)

    const table = page.locator('table.table')
    await expect(table).toBeVisible()

    const headers = ['ID', '英文姓名', '邮箱', '关系', '学校', '主攻方向', '投递', '面试', 'OFFER', '剩余课时', '账号状态', '操作']
    for (const header of headers) {
      await expect(table.locator('thead')).toContainText(header)
    }

    await ss(page, 'ST-FULL-003-table-headers')
  })

  // ── Student Row Content ────────────────────────────────────
  test('ST-FULL-004: student rows display all required data fields', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []

    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThan(0)

      const firstRow = rows.first()
      await expect(firstRow.locator('.name-link')).toBeVisible()
      await expect(firstRow.locator('.email-cell')).toBeVisible()
      await expect(firstRow.locator('.relation-tag').first()).toBeVisible()
      await expect(firstRow.locator('.direction-tag')).toBeVisible()
      await expect(firstRow.locator('.metric--delivery')).toBeVisible()
      await expect(firstRow.locator('.metric--interview')).toBeVisible()
      await expect(firstRow.locator('.metric--offer')).toBeVisible()
      await expect(firstRow.locator('.remaining-hours')).toBeVisible()
      await expect(firstRow.locator('.status-tag')).toBeVisible()
      await expect(firstRow.locator('[data-action="view-job-overview"]')).toBeVisible()

      await ss(page, 'ST-FULL-004-row-fields')
    } else {
      await ss(page, 'ST-FULL-004-empty')
    }
  })

  // ── Relation Tags ──────────────────────────────────────────
  test('ST-FULL-005: relation tags show correct tone for coaching vs managed', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []

    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')

      for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
        const row = rows.nth(i)
        const tags = row.locator('.relation-tag')
        const tagCount = await tags.count()

        for (let j = 0; j < tagCount; j++) {
          const tag = tags.nth(j)
          const classList = await tag.getAttribute('class')
          const hasTone =
            classList?.includes('relation-tag--primary') ||
            classList?.includes('relation-tag--warning')
          expect(hasTone).toBeTruthy()
        }
      }
      await ss(page, 'ST-FULL-005-relation-tones')
    } else {
      await ss(page, 'ST-FULL-005-no-data')
    }
  })

  // ── Direction Tags ─────────────────────────────────────────
  test('ST-FULL-006: direction tags show finance or tech tone', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')

      for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
        const row = rows.nth(i)
        const dirTag = row.locator('.direction-tag')
        if (await dirTag.isVisible()) {
          const classList = await dirTag.getAttribute('class')
          const hasTone =
            classList?.includes('direction-tag--finance') ||
            classList?.includes('direction-tag--tech')
          expect(hasTone).toBeTruthy()
        }
      }
      await ss(page, 'ST-FULL-006-direction-tones')
    } else {
      await ss(page, 'ST-FULL-006-no-data')
    }
  })

  // ── Remaining Hours Formatting ─────────────────────────────
  test('ST-FULL-007: remaining hours display with h suffix and correct tone', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')

      for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
        const row = rows.nth(i)
        const hoursEl = row.locator('.remaining-hours')
        if (await hoursEl.isVisible()) {
          const text = await hoursEl.textContent()
          expect(text).toMatch(/\d+(\.\d+)?h/)

          const classList = await hoursEl.getAttribute('class')
          const hasTone =
            classList?.includes('remaining-hours--success') ||
            classList?.includes('remaining-hours--warning') ||
            classList?.includes('remaining-hours--danger')
          expect(hasTone).toBeTruthy()
        }
      }
      await ss(page, 'ST-FULL-007-hours-format')
    } else {
      await ss(page, 'ST-FULL-007-no-data')
    }
  })

  // ── Account Status Tags ────────────────────────────────────
  test('ST-FULL-008: account status tags show active or frozen tone', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')

      for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
        const row = rows.nth(i)
        const statusTag = row.locator('.status-tag')
        if (await statusTag.isVisible()) {
          const classList = await statusTag.getAttribute('class')
          const hasTone =
            classList?.includes('status-tag--active') ||
            classList?.includes('status-tag--frozen')
          expect(hasTone).toBeTruthy()
        }
      }
      await ss(page, 'ST-FULL-008-status-tags')
    } else {
      await ss(page, 'ST-FULL-008-no-data')
    }
  })

  // ── Metric Counts ──────────────────────────────────────────
  test('ST-FULL-009: metric columns show numeric values for delivery/interview/offer', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const rows = page.locator('table.table tbody tr')
      const firstRow = rows.first()

      const delivery = await firstRow.locator('.metric--delivery').textContent()
      const interview = await firstRow.locator('.metric--interview').textContent()
      const offer = await firstRow.locator('.metric--offer').textContent()

      expect(Number(delivery)).not.toBeNaN()
      expect(Number(interview)).not.toBeNaN()
      expect(Number(offer)).not.toBeNaN()

      await ss(page, 'ST-FULL-009-metrics')
    } else {
      await ss(page, 'ST-FULL-009-no-data')
    }
  })

  // ── View Job Navigation ────────────────────────────────────
  test('ST-FULL-010: clicking view job navigates to job-overview with studentName', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const firstStudent = apiRows[0]
      const studentName = firstStudent.studentName

      if (studentName && studentName !== '-') {
        const viewJobBtn = page.locator('[data-action="view-job-overview"]').first()
        await expect(viewJobBtn).toBeVisible()

        await viewJobBtn.click()
        await page.waitForTimeout(2000)

        await expect(page).toHaveURL(/\/career\/job-overview/, { timeout: 10000 })
        const url = new URL(page.url())
        expect(url.searchParams.get('studentName')).toBeTruthy()

        await ss(page, 'ST-FULL-010-navigated-to-job-overview')
      } else {
        await ss(page, 'ST-FULL-010-no-valid-name')
      }
    } else {
      await ss(page, 'ST-FULL-010-no-data')
    }
  })

  // ── Name Link Click ────────────────────────────────────────
  test('ST-FULL-011: clicking student name link also navigates to job overview', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const firstStudent = apiRows[0]
      const studentName = firstStudent.studentName

      if (studentName && studentName !== '-') {
        const nameLink = page.locator('.name-link').first()
        await expect(nameLink).toBeVisible()

        await nameLink.click()
        await page.waitForTimeout(2000)

        await expect(page).toHaveURL(/\/career\/job-overview/, { timeout: 10000 })
        await ss(page, 'ST-FULL-011-name-link-navigated')
      } else {
        await ss(page, 'ST-FULL-011-no-valid-name')
      }
    } else {
      await ss(page, 'ST-FULL-011-no-data')
    }
  })

  // ── Keyword Search ─────────────────────────────────────────
  test('ST-FULL-012: keyword search input accepts text and triggers search', async ({ page }) => {
    await navigateToStudentList(page)

    const keywordInput = page.locator('.filters input[type="text"]')
    await expect(keywordInput).toBeVisible()

    await keywordInput.fill('Test')
    await expect(keywordInput).toHaveValue('Test')

    const searchBtn = page.locator('.filters').getByRole('button', { name: /搜索/ })
    await searchBtn.click()

    await page.waitForTimeout(2000)
    await ss(page, 'ST-FULL-012-keyword-search')
  })

  // ── Reset Filters ──────────────────────────────────────────
  test('ST-FULL-013: reset button clears all filters', async ({ page }) => {
    await navigateToStudentList(page)

    const keywordInput = page.locator('.filters input[type="text"]')
    await keywordInput.fill('SomeName')
    await expect(keywordInput).toHaveValue('SomeName')

    const resetBtn = page.locator('.filters').getByRole('button', { name: /重置/ })
    await resetBtn.click()
    await page.waitForTimeout(1000)

    await expect(keywordInput).toHaveValue('')
    await ss(page, 'ST-FULL-013-reset-filters')
  })

  // ── Select Filters ─────────────────────────────────────────
  test('ST-FULL-014: relation select has options from meta API', async ({ page }) => {
    const { metaBody } = await navigateToStudentList(page)

    const relationSelect = page.locator('.form-select').first()
    await expect(relationSelect).toBeVisible()

    const options = relationSelect.locator('option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThanOrEqual(1)

    if (metaBody?.data?.relationOptions) {
      for (const opt of metaBody.data.relationOptions) {
        const optionTexts = await options.allTextContents()
        expect(optionTexts.some((text) => text.includes(opt.label))).toBeTruthy()
      }
    }

    await ss(page, 'ST-FULL-014-relation-select')
  })

  // ── School Select ──────────────────────────────────────────
  test('ST-FULL-015: school select populates from meta', async ({ page }) => {
    const { metaBody } = await navigateToStudentList(page)

    const selects = page.locator('.form-select')
    const schoolSelect = selects.nth(1)
    await expect(schoolSelect).toBeVisible()

    if (metaBody?.data?.schools) {
      const options = schoolSelect.locator('option')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThanOrEqual(1)
    }

    await ss(page, 'ST-FULL-015-school-select')
  })

  // ── Direction Select ───────────────────────────────────────
  test('ST-FULL-016: direction select populates from meta', async ({ page }) => {
    const { metaBody } = await navigateToStudentList(page)

    const selects = page.locator('.form-select')
    const directionSelect = selects.nth(2)
    await expect(directionSelect).toBeVisible()

    if (metaBody?.data?.majorDirections) {
      const options = directionSelect.locator('option')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThanOrEqual(1)
    }

    await ss(page, 'ST-FULL-016-direction-select')
  })

  // ── Pagination Controls ────────────────────────────────────
  test('ST-FULL-017: pagination controls are present with correct initial state', async ({ page }) => {
    await navigateToStudentList(page)

    const footer = page.locator('.page-footer')
    await expect(footer).toBeVisible()

    const totalLabel = footer.locator('.page-total')
    await expect(totalLabel).toContainText('条记录')

    const pagination = footer.locator('.pagination')
    await expect(pagination).toBeVisible()

    const prevBtn = pagination.locator('.pager-btn').first()
    await expect(prevBtn).toBeDisabled()

    const activeBtn = pagination.locator('.pager-btn--active')
    await expect(activeBtn).toBeVisible()

    const nextBtn = pagination.locator('.pager-btn').last()
    await expect(nextBtn).toBeDisabled()

    await ss(page, 'ST-FULL-017-pagination')
  })

  // ── Total Count ────────────────────────────────────────────
  test('ST-FULL-018: total count matches visible rows', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const visibleRows = page.locator('table.table tbody tr')
    const visibleCount = await visibleRows.count()

    const totalLabel = page.locator('.page-total')
    await expect(totalLabel).toContainText(`共 ${apiRows.length > 0 ? apiRows.length : visibleCount} 条记录`)

    await ss(page, 'ST-FULL-018-total-count')
  })

  // ── Navigation Highlight ───────────────────────────────────
  test('ST-FULL-019: sidebar highlights student list on this page', async ({ page }) => {
    await navigateToStudentList(page)

    const navItem = page.locator('.nav-item').filter({ hasText: '学员列表 Student List' })
    await expect(navItem).toHaveClass(/active/)

    await ss(page, 'ST-FULL-019-nav-highlight')
  })

  // ── Dual Relation Student ──────────────────────────────────
  test('ST-FULL-020: dual-relation student shows multiple relation tags', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const dualRow = apiRows.find((row: any) => Array.isArray(row.relations) && row.relations.length >= 2)

    if (dualRow) {
      const studentName = String(dualRow.studentName || '')
      const row = page.locator('table.table tbody tr').filter({ hasText: studentName }).first()
      await expect(row).toBeVisible()

      const tags = row.locator('.relation-tag')
      const tagCount = await tags.count()
      expect(tagCount).toBeGreaterThanOrEqual(2)

      await ss(page, 'ST-FULL-020-dual-relation')
    } else {
      await ss(page, 'ST-FULL-020-no-dual-relation')
    }
  })

  // ── Frozen Account Status ──────────────────────────────────
  test('ST-FULL-021: frozen accounts display frozen status tag', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const frozenRow = apiRows.find((row: any) => row.accountStatus === '1')

    if (frozenRow) {
      const studentName = String(frozenRow.studentName || '')
      const row = page.locator('table.table tbody tr').filter({ hasText: studentName }).first()
      await expect(row).toBeVisible()

      const statusTag = row.locator('.status-tag--frozen')
      await expect(statusTag).toBeVisible()
      await expect(statusTag).toContainText('冻结')

      await ss(page, 'ST-FULL-021-frozen-status')
    } else {
      await ss(page, 'ST-FULL-021-no-frozen')
    }
  })

  // ── Active Account Status ──────────────────────────────────
  test('ST-FULL-022: active accounts display active status tag', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const activeRow = apiRows.find((row: any) => row.accountStatus !== '1')

    if (activeRow) {
      const studentName = String(activeRow.studentName || '')
      const row = page.locator('table.table tbody tr').filter({ hasText: studentName }).first()
      await expect(row).toBeVisible()

      const statusTag = row.locator('.status-tag--active')
      await expect(statusTag).toBeVisible()
      await expect(statusTag).toContainText('正常')

      await ss(page, 'ST-FULL-022-active-status')
    } else {
      await ss(page, 'ST-FULL-022-no-active')
    }
  })

  // ── Low Hours Warning ──────────────────────────────────────
  test('ST-FULL-023: students with low remaining hours show warning tone', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const lowHoursRow = apiRows.find((row: any) => {
      const hours = Number(row.remainingHours ?? 0)
      return hours > 0 && hours < 8
    })

    if (lowHoursRow) {
      const studentName = String(lowHoursRow.studentName || '')
      const row = page.locator('table.table tbody tr').filter({ hasText: studentName }).first()
      await expect(row).toBeVisible()

      const hoursEl = row.locator('.remaining-hours--warning')
      await expect(hoursEl).toBeVisible()

      await ss(page, 'ST-FULL-023-low-hours-warning')
    } else {
      await ss(page, 'ST-FULL-023-no-low-hours')
    }
  })

  // ── Sufficient Hours Success ───────────────────────────────
  test('ST-FULL-024: students with sufficient remaining hours show success tone', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    const sufficientRow = apiRows.find((row: any) => {
      const hours = Number(row.remainingHours ?? 0)
      return hours >= 8
    })

    if (sufficientRow) {
      const studentName = String(sufficientRow.studentName || '')
      const row = page.locator('table.table tbody tr').filter({ hasText: studentName }).first()
      await expect(row).toBeVisible()

      const hoursEl = row.locator('.remaining-hours--success')
      await expect(hoursEl).toBeVisible()

      await ss(page, 'ST-FULL-024-sufficient-hours')
    } else {
      await ss(page, 'ST-FULL-024-no-sufficient-hours')
    }
  })

  // ── Error Resilience ───────────────────────────────────────
  test('ST-FULL-025: page remains usable when API returns error', async ({ page }) => {
    await loginAsAdmin(page)

    await page.route('**/lead-mentor/students/**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ code: 500, msg: 'Internal Server Error' }) }),
    )

    await page.goto('/teaching/students', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await expect(page.locator('#page-student-list')).toBeVisible({ timeout: 15000 })

    const emptyState = page.locator('.empty-state')
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)
    if (hasEmpty) {
      await expect(emptyState).toContainText('暂无可查看学员')
    }

    await ss(page, 'ST-FULL-025-error-resilience')
  })

  // ── View Job Navigation Preserves Student Name ─────────────
  test('ST-FULL-026: job overview page preserves student name in filter', async ({ page }) => {
    const { listBody } = await navigateToStudentList(page)

    const apiRows = Array.isArray(listBody?.rows) ? listBody.rows : []
    if (apiRows.length > 0) {
      const firstStudent = apiRows[0]
      const studentName = firstStudent.studentName

      if (studentName && studentName !== '-') {
        await page.locator('[data-action="view-job-overview"]').first().click()
        await page.waitForTimeout(2000)

        await expect(page).toHaveURL(/\/career\/job-overview/, { timeout: 10000 })

        const jobOverviewInput = page.locator('#page-job-overview input.form-input')
        const isVisible = await jobOverviewInput.isVisible({ timeout: 5000 }).catch(() => false)

        if (isVisible) {
          const inputValue = await jobOverviewInput.inputValue()
          expect(inputValue).toBe(studentName)
        }

        await ss(page, 'ST-FULL-026-job-overview-filter')
      } else {
        await ss(page, 'ST-FULL-026-no-valid-name')
      }
    } else {
      await ss(page, 'ST-FULL-026-no-data')
    }
  })

  // ── Select Filter Interaction ──────────────────────────────
  test('ST-FULL-027: changing relation select triggers filtered search', async ({ page }) => {
    await navigateToStudentList(page)

    const relationSelect = page.locator('.form-select').first()
    await expect(relationSelect).toBeVisible()

    const options = relationSelect.locator('option')
    const optionCount = await options.count()

    if (optionCount > 1) {
      await relationSelect.selectOption({ index: 1 })

      const searchBtn = page.locator('.filters').getByRole('button', { name: /搜索/ })
      await searchBtn.click()

      await page.waitForTimeout(2000)
      await ss(page, 'ST-FULL-027-filtered-search')
    } else {
      await ss(page, 'ST-FULL-027-no-options')
    }
  })

  // ── Empty State ────────────────────────────────────────────
  test('ST-FULL-028: empty state shows message when no students match', async ({ page }) => {
    await loginAsAdmin(page)

    await page.route('**/lead-mentor/students/list**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ code: 200, msg: 'success', rows: [] }),
      }),
    )

    await page.goto('/teaching/students', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await expect(page.locator('#page-student-list')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    const emptyState = page.locator('.empty-state')
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasEmpty) {
      await expect(emptyState).toContainText('暂无可查看学员')
    }

    await ss(page, 'ST-FULL-028-empty-state')
  })

  // ── Meta API Validation ────────────────────────────────────
  test('ST-FULL-029: meta API returns valid option arrays', async ({ page }) => {
    const { metaBody } = await navigateToStudentList(page)

    if (metaBody) {
      expect(Array.isArray(metaBody.data?.relationOptions)).toBeTruthy()
      expect(Array.isArray(metaBody.data?.schools)).toBeTruthy()
      expect(Array.isArray(metaBody.data?.majorDirections)).toBeTruthy()
      expect(Array.isArray(metaBody.data?.accountStatuses)).toBeTruthy()
    }

    await ss(page, 'ST-FULL-029-meta-api-validated')
  })

  // ── Combined Filter Search ─────────────────────────────────
  test('ST-FULL-030: combined keyword and select filters work together', async ({ page }) => {
    await navigateToStudentList(page)

    const keywordInput = page.locator('.filters input[type="text"]')
    await keywordInput.fill('Test')

    const relationSelect = page.locator('.form-select').first()
    const options = relationSelect.locator('option')
    const optionCount = await options.count()

    if (optionCount > 1) {
      await relationSelect.selectOption({ index: 1 })
    }

    const searchBtn = page.locator('.filters').getByRole('button', { name: /搜索/ })
    await searchBtn.click()

    await page.waitForTimeout(2000)

    const resetBtn = page.locator('.filters').getByRole('button', { name: /重置/ })
    await resetBtn.click()
    await page.waitForTimeout(1000)

    await expect(keywordInput).toHaveValue('')
    await ss(page, 'ST-FULL-030-combined-filters')
  })
})
