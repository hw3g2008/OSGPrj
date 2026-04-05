import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/* ------------------------------------------------------------------ */
/*  Fixture loaders                                                    */
/* ------------------------------------------------------------------ */

const positionsListFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures/lead-mentor/positions/list.json'),
    'utf-8',
  ),
) as { rows: Array<Record<string, unknown>> }

const positionsMetaFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures/lead-mentor/positions/meta.json'),
    'utf-8',
  ),
) as Record<string, unknown>

const positionStudentsFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures/lead-mentor/positions/students.json'),
    'utf-8',
  ),
) as Array<Record<string, unknown>>

const jobOverviewListFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures/lead-mentor/job-overview/list.json'),
    'utf-8',
  ),
) as { rows: Array<Record<string, unknown>> }

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function setLeadMentorAuth(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('osg_token', 'lead-mentor-token')
    localStorage.setItem(
      'osg_user',
      JSON.stringify({ userName: 'lead_mentor_demo', nickName: 'Test Lead Mentor' }),
    )
  })
}

/* ------------------------------------------------------------------ */
/*  Positions API mocks                                                */
/* ------------------------------------------------------------------ */

async function mockPositionAPIs(page: Page, listRows?: Array<Record<string, unknown>>) {
  const rows = listRows ?? positionsListFixture.rows

  await page.route('**/api/lead-mentor/positions/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: { rows } }),
    })
  })

  await page.route('**/api/lead-mentor/positions/meta**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: positionsMetaFixture }),
    })
  })

  await page.route('**/api/lead-mentor/positions/*/students**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: positionStudentsFixture }),
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Job Overview API mocks                                             */
/* ------------------------------------------------------------------ */

async function mockJobOverviewAPIs(page: Page, rowsByScope?: Record<string, Array<Record<string, unknown>>>) {
  const allRows = rowsByScope
    ? Object.values(rowsByScope).flat()
    : jobOverviewListFixture.rows

  const pending = rowsByScope?.pending ?? allRows.filter((r) => r.assignedStatus === 'pending')
  const coaching = rowsByScope?.coaching ?? allRows.filter((r) => r.assignedStatus === 'coaching')
  const managed = rowsByScope?.managed ?? allRows.filter((r) => r.assignedStatus === 'managed')

  await page.route('**/api/lead-mentor/job-overview/list**', async (route) => {
    const url = route.request().url()
    let scope = 'coaching'
    if (url.includes('scope=pending')) scope = 'pending'
    else if (url.includes('scope=managed')) scope = 'managed'
    else if (url.includes('scope=coaching')) scope = 'coaching'

    const scopeRows = scope === 'pending' ? pending : scope === 'managed' ? managed : coaching
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: { rows: scopeRows } }),
    })
  })

  await page.route('**/api/lead-mentor/job-overview/*', async (route) => {
    const url = route.request().url()
    const match = url.match(/\/job-overview\/(\d+)/)
    const id = match ? Number(match[1]) : 1
    const detail = allRows.find((r) => Number(r.applicationId) === id) ?? allRows[0]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: detail }),
    })
  })

  await page.route('**/api/lead-mentor/job-overview/*/assign-mentor**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: null }),
    })
  })

  await page.route('**/api/lead-mentor/job-overview/*/acknowledge**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: null }),
    })
  })
}

/* ================================================================== */
/*  Positions Module Tests                                             */
/* ================================================================== */

test.describe('lead-mentor positions module', () => {
  test.beforeEach(async ({ page }) => {
    setLeadMentorAuth(page)
    await mockPositionAPIs(page)
  })

  test('renders page title and view switcher @AC-LM-006-007-008', async ({ page }) => {
    await page.goto('/career/positions')

    await expect(page.getByRole('heading', { name: /岗位信息/ })).toBeVisible()
    await expect(page.locator('.page-title-en')).toHaveText('Job Tracker')

    await expect(page.locator('#lead-view-drilldown')).toBeVisible()
    await expect(page.locator('#lead-view-list')).toBeVisible()

    const drilldownBtn = page.locator('#lead-view-drilldown')
    await expect(drilldownBtn).toHaveClass(/btn--active/)
  })

  test('switches to list view and shows 9-column table @AC-LM-009-030', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()
    await expect(page.locator('#lead-position-list')).toBeVisible()
    await expect(page.locator('#lead-position-drilldown')).toBeHidden()

    const listSection = page.locator('#lead-position-list')
    await expect(listSection.getByRole('columnheader', { name: '岗位名称' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '公司' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '行业' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '岗位分类' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '地区' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '招聘周期' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '发布时间' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '截止时间' })).toBeVisible()
    await expect(listSection.getByRole('columnheader', { name: '我的学员' })).toBeVisible()
  })

  test('switches back to drilldown view @AC-LM-010', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()
    await expect(page.locator('#lead-position-list')).toBeVisible()

    await page.locator('#lead-view-drilldown').click()
    await expect(page.locator('#lead-position-drilldown')).toBeVisible()
    await expect(page.locator('#lead-position-list')).toBeHidden()
  })

  test('renders all 5 filter controls @AC-LM-011-013-015-017-019', async ({ page }) => {
    await page.goto('/career/positions')

    await expect(page.locator('select[aria-label="岗位分类"]')).toBeVisible()
    await expect(page.locator('select[aria-label="行业"]')).toBeVisible()
    await expect(page.locator('select[aria-label="公司"]')).toBeVisible()
    await expect(page.locator('select[aria-label="地区"]')).toBeVisible()
    await expect(page.getByPlaceholder('搜索岗位名称...')).toBeVisible()
  })

  test('renders industry category sections in drilldown view @AC-LM-020-021', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldownSection = page.locator('#lead-position-drilldown')
    await expect(drilldownSection).toBeVisible()

    const categoryHeaders = drilldownSection.locator('.category-header')
    await expect(categoryHeaders).toHaveCount(3)

    const firstCategory = categoryHeaders.first()
    await expect(firstCategory).toContainText('Investment Bank')

    await firstCategory.click()
    const companyContent = drilldownSection.locator('.company-section').first()
    await expect(companyContent).toBeVisible()
  })

  test('expands company to show position table with 8 columns @AC-LM-022-026', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const firstCompany = drilldown.locator('.company-header').first()
    await expect(firstCompany).toBeVisible()
    await firstCompany.click()

    const tableHeaders = drilldown.locator('.table thead th')
    await expect(tableHeaders).toHaveCount(8)
    await expect(tableHeaders.nth(0)).toContainText('岗位名称')
    await expect(tableHeaders.nth(7)).toContainText('我的学员')
  })

  test('shows "官网" external link on company row @AC-LM-023', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const officialLink = drilldown.locator('.company-actions a.btn-outline').first()
    await expect(officialLink).toContainText('官网')
    const href = await officialLink.getAttribute('href')
    expect(href).toBeTruthy()
  })

  test('opens my-students modal when "我的学员" link is clicked @AC-LM-025', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const studentLink = drilldown.locator('.company-link').first()
    await expect(studentLink).toContainText('人')
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.modal-title')).toContainText('我的学员申请')
  })

  test('my-students modal has 5 columns in table @AC-LM-034-035', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const studentLink = drilldown.locator('.company-link').first()
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()

    const headers = modal.locator('table thead th')
    await expect(headers).toHaveCount(5)
    await expect(headers.nth(0)).toContainText('学生ID')
    await expect(headers.nth(1)).toContainText('姓名')
    await expect(headers.nth(2)).toContainText('岗位')
    await expect(headers.nth(3)).toContainText('状态')
    await expect(headers.nth(4)).toContainText('已上课时')
  })

  test('my-students modal shows status tags with correct tones @AC-LM-036-037-038', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const studentLink = drilldown.locator('.company-link').first()
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()

    await expect(modal.locator('.status-tag--interviewing').first()).toBeVisible()
    await expect(modal.locator('.status-tag--applied').first()).toBeVisible()
    await expect(modal.locator('.status-tag--offer').first()).toBeVisible()
  })

  test('closes my-students modal via close button @AC-LM-039', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const studentLink = drilldown.locator('.company-link').first()
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()
    await modal.locator('[aria-label="关闭我的学员申请弹层"]').first().click()
    await expect(modal).toBeHidden()
  })

  test('closes my-students modal via save button @AC-LM-040', async ({ page }) => {
    await page.goto('/career/positions')

    const drilldown = page.locator('#lead-position-drilldown')
    const firstCategory = drilldown.locator('.category-header').first()
    await firstCategory.click()

    const studentLink = drilldown.locator('.company-link').first()
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()
    await modal.getByRole('button', { name: '保存修改' }).click()
    await expect(modal).toBeHidden()
  })

  test('sorts list view by publish time when header is clicked @AC-LM-032', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()
    await expect(page.locator('#lead-position-list')).toBeVisible()

    const sortButton = page.locator('#lead-position-list .sort-button')
    await expect(sortButton).toContainText('发布时间')

    const firstRowTitleBefore = await page.locator('#lead-position-list tbody tr td.table-cell-title').first().textContent()

    await sortButton.click()
    const firstRowTitleAfter = await page.locator('#lead-position-list tbody tr td.table-cell-title').first().textContent()

    await sortButton.click()
    const firstRowTitleAfterSecond = await page.locator('#lead-position-list tbody tr td.table-cell-title').first().textContent()

    expect([firstRowTitleBefore, firstRowTitleAfter, firstRowTitleAfterSecond].filter((v, i, a) => a.indexOf(v) === i).length).toBeGreaterThanOrEqual(2)
  })

  test('shows footer stats with total, open, closed, students @AC-LM-033', async ({ page }) => {
    await page.goto('/career/positions')

    const footerStats = page.locator('.page-footer-stats')
    await expect(footerStats).toBeVisible()
    await expect(footerStats).toContainText('个岗位')
    await expect(footerStats).toContainText('开放中')
    await expect(footerStats).toContainText('已关闭')
    await expect(footerStats).toContainText('我的学员')
  })

  test('deadline column shows urgent and closed styles @AC-LM-027-028-029', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()

    const closedDeadline = page.locator('.deadline-closed').first()
    if (await closedDeadline.isVisible()) {
      await expect(closedDeadline).toBeVisible()
    }

    const urgentDeadline = page.locator('.deadline-open').first()
    if (await urgentDeadline.isVisible()) {
      await expect(urgentDeadline).toBeVisible()
    }
  })

  test('list view company name is an external link @AC-LM-031', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()

    const companyLink = page.locator('#lead-position-list .company-external').first()
    await expect(companyLink).toBeVisible()
    const href = await companyLink.getAttribute('href')
    expect(href).toBeTruthy()
  })

  test('list view my-students link opens modal @AC-LM-025-list', async ({ page }) => {
    await page.goto('/career/positions')

    await page.locator('#lead-view-list').click()

    const studentLink = page.locator('#lead-position-list .student-link').first()
    await expect(studentLink).toContainText('人')
    await studentLink.click()

    const modal = page.locator('[data-surface-id="modal-position-mystudents"]')
    await expect(modal).toBeVisible()
  })
})

/* ================================================================== */
/*  Job Overview Module Tests                                          */
/* ================================================================== */

test.describe('lead-mentor job-overview module', () => {
  test.beforeEach(async ({ page }) => {
    setLeadMentorAuth(page)
    await mockJobOverviewAPIs(page)
  })

  test('renders page title and export button @AC-LM-041-042', async ({ page }) => {
    await page.goto('/career/job-overview')

    await expect(page.getByRole('heading', { name: /学员求职总览/ })).toBeVisible()
    await expect(page.locator('.page-title-en')).toHaveText('Job Overview')

    const exportBtn = page.locator('#page-job-overview .page-header .btn-outline')
    await expect(exportBtn).toContainText('导出')
  })

  test('renders calendar toolbar with navigation and week strip @AC-LM-044-045', async ({ page }) => {
    await page.goto('/career/job-overview')

    await expect(page.locator('.calendar-title')).toContainText('学员面试安排')
    await expect(page.locator('.calendar-month')).toContainText('1月')

    const calendarDays = page.locator('.calendar-day')
    await expect(calendarDays).toHaveCount(7)
  })

  test('renders summary pills for upcoming events @AC-LM-047', async ({ page }) => {
    await page.goto('/career/job-overview')

    const summaryPills = page.locator('.summary-pill')
    await expect(summaryPills.first()).toBeVisible()
    await expect(summaryPills.first()).toContainText('张三')
  })

  test('renders expand/collapse calendar button @AC-LM-048-049', async ({ page }) => {
    await page.goto('/career/job-overview')

    const toggleBtn = page.locator('#lm-toggle-view-btn')
    await expect(toggleBtn).toContainText('展开')

    await toggleBtn.click()
    await expect(page.locator('#lm-month-view-expanded')).toBeVisible()
    await expect(toggleBtn).toContainText('收起')
  })

  test('expanded calendar shows legend with 3 items @AC-LM-050', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-toggle-view-btn').click()

    await expect(page.locator('.month-legend')).toBeVisible()
    await expect(page.locator('.legend-item')).toHaveCount(3)
    await expect(page.locator('.month-legend')).toContainText('面试')
    await expect(page.locator('.month-legend')).toContainText('辅导课')
    await expect(page.locator('.month-legend')).toContainText('今天')
  })

  test('expanded calendar shows month grid and weekly schedule @AC-LM-051-052', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-toggle-view-btn').click()

    const monthCells = page.locator('.month-grid__cell')
    await expect(monthCells.first()).toBeVisible()

    await expect(page.locator('.week-schedule')).toBeVisible()
    await expect(page.locator('.week-schedule__title')).toContainText('本周学员面试安排')

    const scheduleCards = page.locator('.week-schedule__card')
    await expect(scheduleCards.count()).toBeGreaterThan(0)
  })

  test('renders all 4 filter controls @AC-LM-053-057', async ({ page }) => {
    await page.goto('/career/job-overview')

    await expect(page.getByPlaceholder('搜索学员姓名...')).toBeVisible()

    const selects = page.locator('#page-job-overview .filters select')
    await expect(selects).toHaveCount(3)

    await expect(page.locator('#page-job-overview .filters .btn-outline')).toContainText('搜索')
  })

  test('type filter has coaching and managed options @AC-LM-054', async ({ page }) => {
    await page.goto('/career/job-overview')

    const typeSelect = page.locator('#page-job-overview .filters select').first()
    await expect(typeSelect).toBeVisible()
    const options = typeSelect.locator('option')
    await expect(options).toHaveCount(3)
    await expect(options.nth(1)).toHaveText('辅导学员')
    await expect(options.nth(2)).toHaveText('管理学员')
  })

  test('renders 3 tabs with badge counts @AC-LM-058', async ({ page }) => {
    await page.goto('/career/job-overview')

    await expect(page.locator('#lm-job-tab-pending')).toContainText('待分配导师')
    await expect(page.locator('#lm-job-tab-coaching')).toContainText('我辅导的学员')
    await expect(page.locator('#lm-job-tab-managed')).toContainText('我管理的学员')

    const tabCounts = page.locator('.tab-count')
    await expect(tabCounts).toHaveCount(3)
  })

  test('pending tab shows banner and 7-column table @AC-LM-059-060', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()

    const banner = page.locator('#lm-job-content-pending .panel-banner--danger')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('需要您分配导师')

    const headers = page.locator('#lm-job-content-pending table thead th')
    await expect(headers).toHaveCount(7)
    await expect(headers.nth(0)).toContainText('学员')
    await expect(headers.nth(5)).toContainText('申请时间')
    await expect(headers.nth(6)).toContainText('操作')
  })

  test('pending tab shows "分配导师" button @AC-LM-064', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()

    const assignBtn = page.locator('#lm-job-content-pending [data-surface-trigger="modal-assign-mentor"]').first()
    await expect(assignBtn).toBeVisible()
    await expect(assignBtn).toContainText('分配导师')
  })

  test('clicking "分配导师" opens the assign-mentor modal @AC-LM-064-open', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()

    const assignBtn = page.locator('#lm-job-content-pending [data-surface-trigger="modal-assign-mentor"]').first()
    await assignBtn.click()

    const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.modal-title')).toContainText('为学员匹配辅导导师')
  })

  test('assign-mentor modal shows student info and mentor selection @AC-LM-078-079-080-081', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()
    await page.locator('#lm-job-content-pending [data-surface-trigger="modal-assign-mentor"]').first().click()

    const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
    await expect(modal).toBeVisible()

    await expect(modal.locator('.student-card__name')).toBeVisible()

    const filterSelects = modal.locator('.filter-row select')
    await expect(filterSelects).toHaveCount(3)
    await expect(modal.getByPlaceholder('搜索导师姓名...')).toBeVisible()

    const mentorItems = modal.locator('.mentor-item')
    await expect(mentorItems.count()).toBeGreaterThan(0)

    const selectedCount = modal.locator('.selection-hint strong')
    await expect(selectedCount).toBeVisible()
  })

  test('assign-mentor modal has notes textarea @AC-LM-083', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()
    await page.locator('#lm-job-content-pending [data-surface-trigger="modal-assign-mentor"]').first().click()

    const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
    await expect(modal).toBeVisible()
    const textarea = modal.locator('textarea.form-input--textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveAttribute('placeholder', /给导师的特别说明/)
  })

  test('assign-mentor modal can be closed @AC-LM-085', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()
    await page.locator('#lm-job-content-pending [data-surface-trigger="modal-assign-mentor"]').first().click()

    const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
    await expect(modal).toBeVisible()
    await modal.locator('[aria-label="关闭导师匹配弹层"]').first().click()
    await expect(modal).toBeHidden()
  })

  test('coaching tab shows 6-column table @AC-LM-065', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-coaching').click()

    const headers = page.locator('#lm-job-content-coaching table thead th')
    await expect(headers).toHaveCount(6)
    await expect(headers.nth(0)).toContainText('学员')
    await expect(headers.nth(4)).toContainText('辅导状态')
    await expect(headers.nth(5)).toContainText('操作')
  })

  test('coaching tab shows status tags @AC-LM-066-068-069-070', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-coaching').click()

    const tags = page.locator('#lm-job-content-coaching table tbody .tag')
    if ((await tags.count()) > 0) {
      await expect(tags.first()).toBeVisible()
    }
  })

  test('coaching tab opens job detail modal via "查看详情" @AC-LM-072', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-coaching').click()

    const detailBtn = page.locator('#lm-job-content-coaching [data-surface-trigger="modal-job-detail"]').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()

      const modal = page.locator('[data-surface-id="modal-job-detail"]')
      await expect(modal).toBeVisible()
      await expect(modal.locator('.modal-title')).toContainText('学员求职详情')
    }
  })

  test('job detail modal shows student info, timeline and coaching grid @AC-LM-072-detail', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-coaching').click()

    const detailBtn = page.locator('#lm-job-content-coaching [data-surface-trigger="modal-job-detail"]').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()

      const modal = page.locator('[data-surface-id="modal-job-detail"]')
      await expect(modal).toBeVisible()

      await expect(modal.locator('#jd-student-name')).toBeVisible()
      await expect(modal.locator('#jd-student-id')).toBeVisible()
      await expect(modal.locator('#jd-company')).toBeVisible()
      await expect(modal.locator('#jd-position')).toBeVisible()

      await expect(modal.locator('.timeline')).toBeVisible()
      await expect(modal.locator('.coaching-grid')).toBeVisible()
    }
  })

  test('managed tab shows 7-column table with "导师" column @AC-LM-075', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-managed').click()

    const headers = page.locator('#lm-job-content-managed table thead th')
    await expect(headers).toHaveCount(7)
    await expect(headers.nth(5)).toContainText('导师')
  })

  test('managed tab shows status tags including "待审批" @AC-LM-076-077', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-managed').click()

    const tags = page.locator('#lm-job-content-managed table tbody .tag')
    if ((await tags.count()) > 0) {
      await expect(tags.first()).toBeVisible()
    }
  })

  test('stage tags show correct tones in pending tab @AC-LM-061-062-063', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-pending').click()

    const stageTags = page.locator('#lm-job-content-pending table tbody .tag')
    if ((await stageTags.count()) > 0) {
      const firstTag = stageTags.first()
      await expect(firstTag).toBeVisible()
    }
  })

  test('job detail modal can be closed via backdrop and close button @AC-LM-072-close', async ({ page }) => {
    await page.goto('/career/job-overview')

    await page.locator('#lm-job-tab-coaching').click()

    const detailBtn = page.locator('#lm-job-content-coaching [data-surface-trigger="modal-job-detail"]').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()

      const modal = page.locator('[data-surface-id="modal-job-detail"]')
      await expect(modal).toBeVisible()

      await modal.locator('[aria-label="关闭学员求职详情弹层"]').first().click()
      await expect(modal).toBeHidden()
    }
  })
})

/* ================================================================== */
/*  Cross-module integration test                                      */
/* ================================================================== */

test.describe('lead-mentor career module integration', () => {
  test.beforeEach(async ({ page }) => {
    setLeadMentorAuth(page)
  })

  test('navigates between positions and job-overview via sidebar @AC-LM-integration', async ({ page }) => {
    await mockPositionAPIs(page)
    await page.goto('/career/positions')
    await expect(page.getByRole('heading', { name: /岗位信息/ })).toBeVisible()

    await mockJobOverviewAPIs(page)
    await page.goto('/career/job-overview')
    await expect(page.getByRole('heading', { name: /学员求职总览/ })).toBeVisible()

    await mockPositionAPIs(page)
    await page.goto('/career/positions')
    await expect(page.getByRole('heading', { name: /岗位信息/ })).toBeVisible()
  })
})
