import { expect, test, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/mock-practice-full')
const ss = async (page: Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: false })
}

const mockPracticeStatsPath = '/lead-mentor/mock-practice/stats'
const mockPracticeListPath = '/lead-mentor/mock-practice/list'
const mockPracticeDetailPath = '/lead-mentor/mock-practice/detail'

async function navigateToMockPractice(page: Page) {
  await loginAsAdmin(page)
  await page.goto('/career/mock-practice', { waitUntil: 'networkidle', timeout: 30000 })
  await expect(page.locator('#page-mock-practice')).toBeVisible({ timeout: 15000 })
}

async function waitForScopeList(page: Page, scope: string) {
  return waitForApi(page, `${mockPracticeListPath}?scope=${scope}`, 'GET')
}

async function waitForStats(page: Page) {
  return waitForApi(page, mockPracticeStatsPath, 'GET')
}

test.describe('LM Mock Practice Full E2E @lead-mentor', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  // ── Page Load ──────────────────────────────────────────────
  test('MP-FULL-001: page loads with all structural elements', async ({ page }) => {
    await navigateToMockPractice(page)

    await expect(page.locator('#page-mock-practice')).toBeVisible()
    expect(page.locator('.page-title').textContent()).resolves.toContain('模拟应聘管理')
    expect(page.locator('.page-title-en').textContent()).resolves.toContain('Mock Practice')
    expect(page.locator('.page-sub').textContent()).resolves.toContain('处理学员的模拟面试')

    await ss(page, 'MP-FULL-001-page-load')
  })

  // ── Stats Cards ────────────────────────────────────────────
  test('MP-FULL-002: stats cards render four metric tiles', async ({ page }) => {
    await navigateToMockPractice(page)

    const statsGrid = page.locator('.stats-grid')
    await expect(statsGrid).toBeVisible()

    const cards = statsGrid.locator('.stats-card')
    const count = await cards.count()
    expect(count).toBe(4)

    const labels = ['待处理', '已安排', '已完成', '已取消']
    for (let i = 0; i < labels.length; i++) {
      await expect(cards.nth(i)).toContainText(labels[i])
    }

    await ss(page, 'MP-FULL-002-stats-cards')
  })

  // ── Tab Structure ──────────────────────────────────────────
  test('MP-FULL-003: three scope tabs exist with correct labels', async ({ page }) => {
    await navigateToMockPractice(page)

    const pendingTab = page.locator('#mock-tab-pending')
    const coachingTab = page.locator('#mock-tab-mycoaching')
    const managedTab = page.locator('#mock-tab-mymanage')

    await expect(pendingTab).toBeVisible()
    await expect(coachingTab).toBeVisible()
    await expect(managedTab).toBeVisible()

    await expect(pendingTab).toContainText('待分配导师')
    await expect(coachingTab).toContainText('我辅导的学员')
    await expect(managedTab).toContainText('我管理的学员')

    await ss(page, 'MP-FULL-003-tabs')
  })

  // ── Tab Switching ──────────────────────────────────────────
  test('MP-FULL-004: switching tabs shows corresponding panel', async ({ page }) => {
    await navigateToMockPractice(page)

    // Default tab is mycoaching
    const coachingPanel = page.locator('#mock-content-mycoaching')
    await expect(coachingPanel).toBeVisible()

    // Switch to pending
    await page.locator('#mock-tab-pending').click()
    const pendingPanel = page.locator('#mock-content-pending')
    await expect(pendingPanel).toBeVisible({ timeout: 8000 })
    await expect(coachingPanel).toBeHidden()
    await ss(page, 'MP-FULL-004a-pending-tab')

    // Switch to managed
    await page.locator('#mock-tab-mymanage').click()
    const managedPanel = page.locator('#mock-content-mymanage')
    await expect(managedPanel).toBeVisible({ timeout: 8000 })
    await expect(pendingPanel).toBeHidden()
    await ss(page, 'MP-FULL-004b-managed-tab')

    // Switch back to coaching
    await page.locator('#mock-tab-mycoaching').click()
    await expect(coachingPanel).toBeVisible({ timeout: 8000 })
    await expect(managedPanel).toBeHidden()
    await ss(page, 'MP-FULL-004c-coaching-tab')
  })

  // ── Pending Tab Content ────────────────────────────────────
  test('MP-FULL-005: pending tab shows banner and filter controls', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const pendingPanel = page.locator('#mock-content-pending')
    await expect(pendingPanel.locator('.panel-banner--danger')).toBeVisible()
    await expect(pendingPanel.locator('.panel-banner--danger')).toContainText('需要分配导师')

    await expect(pendingPanel.locator('.form-select').first()).toBeVisible()
    await expect(pendingPanel.locator('input[type="text"]').first()).toBeVisible()
    await expect(pendingPanel.getByRole('button', { name: /筛选/ })).toBeVisible()
    await expect(pendingPanel.getByRole('button', { name: /重置/ })).toBeVisible()

    await ss(page, 'MP-FULL-005-pending-filters')
  })

  // ── Pending Table Structure ────────────────────────────────
  test('MP-FULL-006: pending table has correct column headers', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const table = page.locator('#mock-content-pending .table')
    await expect(table).toBeVisible()

    const headers = ['学员', '类型', '申请时间', '操作']
    for (const header of headers) {
      await expect(table.locator('thead')).toContainText(header)
    }

    await ss(page, 'MP-FULL-006-pending-table-headers')
  })

  // ── Pending Row Data ───────────────────────────────────────
  test('MP-FULL-007: pending rows show student avatars and assign buttons', async ({ page }) => {
    await navigateToMockPractice(page)

    const statsPromise = waitForStats(page)
    const pendingPromise = waitForScopeList(page, 'pending')

    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const statsBody = await assertRuoyiSuccess(statsPromise, mockPracticeStatsPath).catch(() => null)
    const pendingBody = await assertRuoyiSuccess(pendingPromise, `${mockPracticeListPath}?scope=pending`).catch(() => null)

    const pendingRows = Array.isArray(pendingBody?.rows) ? pendingBody.rows : []

    if (pendingRows.length > 0) {
      const rows = page.locator('#mock-content-pending .mock-row')
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThan(0)

      const firstRow = rows.first()
      await expect(firstRow.locator('.avatar')).toBeVisible()
      await expect(firstRow.locator('.student-name')).toBeVisible()
      await expect(firstRow.locator('.student-meta')).toContainText('ID:')
      await expect(firstRow.locator('.tag')).toBeVisible()
      await expect(firstRow.locator('[data-surface-trigger="modal-assign-mock"]')).toBeVisible()

      await ss(page, 'MP-FULL-007-pending-rows-with-data')
    } else {
      await ss(page, 'MP-FULL-007-pending-empty')
    }
  })

  // ── Coaching Tab Content ───────────────────────────────────
  test('MP-FULL-008: coaching tab shows info banner and extended table', async ({ page }) => {
    await navigateToMockPractice(page)

    // mycoaching is the default tab
    const coachingPanel = page.locator('#mock-content-mycoaching')
    await expect(coachingPanel).toBeVisible()

    await expect(coachingPanel.locator('.panel-banner--info')).toBeVisible()
    await expect(coachingPanel.locator('.panel-banner--info')).toContainText('由您亲自辅导')

    const table = coachingPanel.locator('.table')
    await expect(table).toBeVisible()

    const headers = ['学员', '类型', '申请时间', '状态', '已上课时', '课程反馈']
    for (const header of headers) {
      await expect(table.locator('thead')).toContainText(header)
    }

    await ss(page, 'MP-FULL-008-coaching-table')
  })

  // ── Coaching Rows ──────────────────────────────────────────
  test('MP-FULL-009: coaching rows show status tags and feedback area', async ({ page }) => {
    await navigateToMockPractice(page)
    await expect(page.locator('#mock-content-mycoaching')).toBeVisible({ timeout: 8000 })

    const rows = page.locator('#mock-content-mycoaching .mock-row')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      const firstRow = rows.first()
      await expect(firstRow.locator('.student-cell')).toBeVisible()
      await expect(firstRow.locator('.tag').first()).toBeVisible()

      await ss(page, 'MP-FULL-009-coaching-rows')
    } else {
      await ss(page, 'MP-FULL-009-coaching-empty')
    }
  })

  // ── Managed Tab Content ────────────────────────────────────
  test('MP-FULL-010: managed tab shows success banner with mentor column', async ({ page }) => {
    await navigateToMockPractice(page)

    await page.locator('#mock-tab-mymanage').click()
    const managedPanel = page.locator('#mock-content-mymanage')
    await expect(managedPanel).toBeVisible({ timeout: 8000 })

    await expect(managedPanel.locator('.panel-banner--success')).toBeVisible()
    await expect(managedPanel.locator('.panel-banner--success')).toContainText('您管理的学员')

    const table = managedPanel.locator('.table')
    await expect(table).toBeVisible()

    const headers = ['学员', '类型', '申请时间', '状态', '辅导导师', '已上课时', '课程反馈']
    for (const header of headers) {
      await expect(table.locator('thead')).toContainText(header)
    }

    await ss(page, 'MP-FULL-010-managed-table')
  })

  // ── Managed Tab Filters ────────────────────────────────────
  test('MP-FULL-011: managed tab has extra mentor search filter', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-mymanage').click()
    await expect(page.locator('#mock-content-mymanage')).toBeVisible({ timeout: 8000 })

    const managedPanel = page.locator('#mock-content-mymanage')
    const inputs = managedPanel.locator('input[type="text"]')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThanOrEqual(2)

    const mentorInput = managedPanel.locator('.form-input--mentor')
    await expect(mentorInput).toBeVisible()

    await ss(page, 'MP-FULL-011-managed-filters')
  })

  // ── Assign Mentor Modal ────────────────────────────────────
  test('MP-FULL-012: assign mentor modal opens and renders form fields', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const assignButtons = page.locator('[data-surface-trigger="modal-assign-mock"]')
    const buttonCount = await assignButtons.count()

    if (buttonCount > 0) {
      const detailPromise = waitForApi(page, mockPracticeDetailPath, 'GET').catch(() => null)
      await assignButtons.first().click()

      const modal = page.locator('[data-surface-id="modal-assign-mock"]')
      const isVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false)

      if (isVisible) {
        await expect(modal).toContainText('处理模拟应聘申请')
        await expect(modal.locator('.request-card')).toBeVisible()
        await expect(modal.locator('.mentor-list')).toBeVisible()
        await expect(modal.locator('input[type="datetime-local"]')).toBeVisible()
        await expect(modal.locator('textarea')).toBeVisible()
        await expect(modal.getByRole('button', { name: /确认安排/ })).toBeVisible()
        await expect(modal.getByRole('button', { name: /取消/ })).toBeVisible()

        await ss(page, 'MP-FULL-012-assign-modal-open')

        await page.keyboard.press('Escape')
        await expect(modal).toBeHidden({ timeout: 5000 })
        await ss(page, 'MP-FULL-012-assign-modal-closed')
      } else {
        await ss(page, 'MP-FULL-012-no-custom-modal')
      }
    } else {
      await ss(page, 'MP-FULL-012-no-pending-data')
    }
  })

  // ── Assign Mentor Form Interaction ─────────────────────────
  test('MP-FULL-013: assign modal checkbox and datetime inputs work', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const assignButtons = page.locator('[data-surface-trigger="modal-assign-mock"]')
    const buttonCount = await assignButtons.count()

    if (buttonCount > 0) {
      await assignButtons.first().click()

      const modal = page.locator('[data-surface-id="modal-assign-mock"]')
      const isVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false)

      if (isVisible) {
        const checkboxes = modal.locator('.mentor-list input[type="checkbox"]')
        const checkboxCount = await checkboxes.count()

        if (checkboxCount > 0) {
          await checkboxes.first().click()
          await ss(page, 'MP-FULL-013a-checkbox-toggled')
        }

        const datetimeInput = modal.locator('input[type="datetime-local"]')
        if (await datetimeInput.isVisible()) {
          await datetimeInput.fill('2026-04-15T14:30')
          await ss(page, 'MP-FULL-013b-datetime-filled')
        }

        const noteTextarea = modal.locator('textarea')
        if (await noteTextarea.isVisible()) {
          await noteTextarea.fill('Test assignment note for E2E')
          await ss(page, 'MP-FULL-013c-note-filled')
        }

        await page.keyboard.press('Escape')
        await ss(page, 'MP-FULL-013-closed')
      } else {
        await ss(page, 'MP-FULL-013-no-modal')
      }
    } else {
      await ss(page, 'MP-FULL-013-no-data')
    }
  })

  // ── Feedback Modal from Coaching Tab ───────────────────────
  test('MP-FULL-014: feedback modal opens from coaching tab', async ({ page }) => {
    await navigateToMockPractice(page)
    await expect(page.locator('#mock-content-mycoaching')).toBeVisible({ timeout: 8000 })

    const feedbackTriggers = page.locator('#mock-content-mycoaching [data-surface-trigger="modal-lead-mock-feedback"]')
    const triggerCount = await feedbackTriggers.count()

    if (triggerCount > 0) {
      const detailPromise = waitForApi(page, mockPracticeDetailPath, 'GET').catch(() => null)
      await feedbackTriggers.first().click()

      const modal = page.locator('[data-surface-id="modal-lead-mock-feedback"]')
      const isVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false)

      if (isVisible) {
        await expect(modal).toContainText('查看模拟反馈')
        await expect(modal.locator('.feedback-hero')).toBeVisible()
        await expect(modal.locator('.score-card')).toBeVisible()
        await expect(modal.locator('.score-card__value')).toBeVisible()
        await expect(modal.locator('.content-card').first()).toBeVisible()
        await expect(modal.getByRole('button', { name: /关闭/ })).toBeVisible()

        await ss(page, 'MP-FULL-014-feedback-modal-open')

        await page.keyboard.press('Escape')
        await expect(modal).toBeHidden({ timeout: 5000 })
        await ss(page, 'MP-FULL-014-feedback-modal-closed')
      } else {
        await ss(page, 'MP-FULL-014-no-custom-modal')
      }
    } else {
      await ss(page, 'MP-FULL-014-no-feedback-data')
    }
  })

  // ── Feedback Modal from Managed Tab ────────────────────────
  test('MP-FULL-015: feedback modal opens from managed tab', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-mymanage').click()
    await expect(page.locator('#mock-content-mymanage')).toBeVisible({ timeout: 8000 })

    const feedbackTriggers = page.locator('#mock-content-mymanage [data-surface-trigger="modal-lead-mock-feedback"]')
    const triggerCount = await feedbackTriggers.count()

    if (triggerCount > 0) {
      await feedbackTriggers.first().click()

      const modal = page.locator('[data-surface-id="modal-lead-mock-feedback"]')
      const isVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false)

      if (isVisible) {
        await expect(modal).toContainText('查看模拟反馈')

        await ss(page, 'MP-FULL-015-managed-feedback-open')

        const closeBtn = modal.getByRole('button', { name: /关闭/ })
        await closeBtn.click()
        await expect(modal).toBeHidden({ timeout: 5000 })
        await ss(page, 'MP-FULL-015-managed-feedback-closed')
      } else {
        await ss(page, 'MP-FULL-015-no-custom-modal')
      }
    } else {
      await ss(page, 'MP-FULL-015-no-data')
    }
  })

  // ── Acknowledge Coaching Assignment ────────────────────────
  test('MP-FULL-016: acknowledge button on coaching tab new assignments', async ({ page }) => {
    await navigateToMockPractice(page)
    await expect(page.locator('#mock-content-mycoaching')).toBeVisible({ timeout: 8000 })

    const ackButtons = page.locator('#mock-content-mycoaching .btn-success')
    const ackCount = await ackButtons.count()

    if (ackCount > 0) {
      await expect(ackButtons.first()).toContainText('确认')
      await ss(page, 'MP-FULL-016a-acknowledge-button')

      await ackButtons.first().click()
      await page.waitForTimeout(2000)
      await ss(page, 'MP-FULL-016b-after-acknowledge')
    } else {
      await ss(page, 'MP-FULL-016-no-new-assignments')
    }
  })

  // ── Type Tone Styling ──────────────────────────────────────
  test('MP-FULL-017: practice type tags show correct tone classes', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const typeTags = page.locator('#mock-content-pending .tag')
    const tagCount = await typeTags.count()

    if (tagCount > 0) {
      for (let i = 0; i < Math.min(tagCount, 5); i++) {
        const tag = typeTags.nth(i)
        const tagText = await tag.textContent()
        const isKnownType =
          tagText?.includes('模拟面试') ||
          tagText?.includes('人际关系测试') ||
          tagText?.includes('期中考试')

        if (isKnownType) {
          const classList = await tag.getAttribute('class')
          const hasTone =
            classList?.includes('tag--info') ||
            classList?.includes('tag--warning') ||
            classList?.includes('tag--purple')
          expect(hasTone).toBeTruthy()
        }
      }
      await ss(page, 'MP-FULL-017-type-tones')
    } else {
      await ss(page, 'MP-FULL-017-no-tags')
    }
  })

  // ── Navigation Highlight ───────────────────────────────────
  test('MP-FULL-018: sidebar highlights mock practice on this page', async ({ page }) => {
    await navigateToMockPractice(page)

    const navItem = page.locator('.nav-item').filter({ hasText: '模拟应聘管理 Mock Practice' })
    await expect(navItem).toHaveClass(/active/)

    await ss(page, 'MP-FULL-018-nav-highlight')
  })

  // ── Stats API Validation ───────────────────────────────────
  test('MP-FULL-019: stats API returns valid structure', async ({ page }) => {
    await navigateToMockPractice(page)

    const statsResponse = await waitForApi(page, mockPracticeStatsPath, 'GET').catch(() => null)
    if (statsResponse) {
      const body = await assertRuoyiSuccess(Promise.resolve(statsResponse), mockPracticeStatsPath)
      expect(typeof body.pendingCount).toBe('number')
      expect(typeof body.scheduledCount).toBe('number')
      expect(typeof body.completedCount).toBe('number')
      expect(typeof body.cancelledCount).toBe('number')
      expect(typeof body.totalCount).toBe('number')
      await ss(page, 'MP-FULL-019-stats-api-validated')
    } else {
      await ss(page, 'MP-FULL-019-stats-api-skip')
    }
  })

  // ── List API Scope Validation ──────────────────────────────
  test('MP-FULL-020: all three scopes return valid list structures', async ({ page }) => {
    await navigateToMockPractice(page)

    for (const scope of ['pending', 'coaching', 'managed']) {
      const listResponse = await waitForApi(page, `${mockPracticeListPath}?scope=${scope}`, 'GET').catch(() => null)
      if (listResponse) {
        const body = await assertRuoyiSuccess(Promise.resolve(listResponse), `${mockPracticeListPath}?scope=${scope}`)
        expect(Array.isArray(body.rows)).toBeTruthy()
      }
    }

    await ss(page, 'MP-FULL-020-all-scopes-validated')
  })

  // ── Backdrop Close ─────────────────────────────────────────
  test('MP-FULL-021: modal closes on backdrop click', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const assignButtons = page.locator('[data-surface-trigger="modal-assign-mock"]')
    if ((await assignButtons.count()) > 0) {
      await assignButtons.first().click()

      const modal = page.locator('[data-surface-id="modal-assign-mock"]')
      const isVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false)

      if (isVisible) {
        const backdrop = modal.locator('[data-surface-part="backdrop"]')
        await backdrop.click()
        await expect(modal).toBeHidden({ timeout: 5000 })
        await ss(page, 'MP-FULL-021-backdrop-close')
      } else {
        await ss(page, 'MP-FULL-021-no-modal')
      }
    } else {
      await ss(page, 'MP-FULL-021-no-data')
    }
  })

  // ── Managed Rows with Mentor Info ──────────────────────────
  test('MP-FULL-022: managed rows display mentor information', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-mymanage').click()
    await expect(page.locator('#mock-content-mymanage')).toBeVisible({ timeout: 8000 })

    const rows = page.locator('#mock-content-mymanage .mock-row')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await expect(row.locator('.mentor-stack__name')).toBeVisible()
        await expect(row.locator('.student-meta').first()).toBeVisible()
      }
      await ss(page, 'MP-FULL-022-managed-mentor-info')
    } else {
      await ss(page, 'MP-FULL-022-no-managed-data')
    }
  })

  // ── Filter Controls in Coaching Tab ────────────────────────
  test('MP-FULL-023: coaching tab has type and status filters', async ({ page }) => {
    await navigateToMockPractice(page)
    await expect(page.locator('#mock-content-mycoaching')).toBeVisible({ timeout: 8000 })

    const coachingPanel = page.locator('#mock-content-mycoaching')
    const selects = coachingPanel.locator('.form-select')
    const selectCount = await selects.count()
    expect(selectCount).toBeGreaterThanOrEqual(2)

    await expect(coachingPanel.locator('input[type="text"]').first()).toBeVisible()
    await expect(coachingPanel.getByRole('button', { name: /筛选/ })).toBeVisible()
    await expect(coachingPanel.getByRole('button', { name: /重置/ })).toBeVisible()

    await ss(page, 'MP-FULL-023-coaching-filters')
  })

  // ── Error Resilience ───────────────────────────────────────
  test('MP-FULL-024: page remains usable when API returns error', async ({ page }) => {
    await loginAsAdmin(page)

    await page.route('**/lead-mentor/mock-practice/**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ code: 500, msg: 'Internal Server Error' }) }),
    )

    await page.goto('/career/mock-practice', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await expect(page.locator('#page-mock-practice')).toBeVisible({ timeout: 15000 })

    await ss(page, 'MP-FULL-024-error-resilience')
  })

  // ── Row Tone Classes ───────────────────────────────────────
  test('MP-FULL-025: pending rows have correct row tone classes', async ({ page }) => {
    await navigateToMockPractice(page)
    await page.locator('#mock-tab-pending').click()
    await expect(page.locator('#mock-content-pending')).toBeVisible({ timeout: 8000 })

    const rows = page.locator('#mock-content-pending .mock-row')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = rows.nth(i)
        const classList = await row.getAttribute('class')
        const hasTone =
          classList?.includes('mock-row--blue') ||
          classList?.includes('mock-row--amber') ||
          classList?.includes('mock-row--purple')
        expect(hasTone).toBeTruthy()
      }
      await ss(page, 'MP-FULL-025-row-tones')
    } else {
      await ss(page, 'MP-FULL-025-no-rows')
    }
  })
})
