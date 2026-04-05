import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Assistant Career Negative Boundary @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant career negative spec only runs for assistant module')

  /**
   * Navigate to a career sub-page and wait for the content area to settle.
   * The assistant app routes are: /career/positions, /career/job-overview, /career/mock-practice
   */
  async function navigateTo(page: import('@playwright/test').Page, path: string) {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 })
    // Give the page a moment to mount and start data loading
    await page.waitForTimeout(500)
  }

  // ============================================================
  // POSITIONS — NEGATIVE BOUNDARY
  // ============================================================

  test('N01 positions — empty keyword filter does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    // Type a non-existent keyword
    const keywordInput = posPage.locator('#assistant-positions-keyword')
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill('XXXXNOTEXIST999')
    await page.waitForTimeout(400)

    // Page should still render — either empty state card or 0 rows
    const pageStillIntact = await posPage.isVisible()
    expect(pageStillIntact).toBeTruthy()

    // Should NOT white-screen: at least the title or toolbar is still present
    await expect(posPage.locator('.page-title')).toBeVisible()
    await expect(posPage.locator('.toolbar-card')).toBeVisible()
  })

  test('N02 positions — XSS in keyword search does not inject', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    const keywordInput = posPage.locator('#assistant-positions-keyword')
    await keywordInput.fill('<script>alert(1)</script>')
    await page.waitForTimeout(400)

    // Page should still render without executing any script
    await expect(posPage.locator('.page-title')).toBeVisible()
    await expect(posPage.locator('.toolbar-card')).toBeVisible()

    // Verify no alert dialog was triggered
    let dialogTriggered = false
    page.once('dialog', () => { dialogTriggered = true })
    await page.waitForTimeout(500)
    expect(dialogTriggered).toBeFalsy()
  })

  test('N03 positions — SQL injection in keyword search shows no error', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    const keywordInput = posPage.locator('#assistant-positions-keyword')
    await keywordInput.fill("' OR 1=1 --")
    await page.waitForTimeout(400)

    // Page should still render; no SQL error visible to user
    await expect(posPage.locator('.page-title')).toBeVisible()
    await expect(posPage.locator('.toolbar-card')).toBeVisible()

    // No error card should appear (SQL errors are not surfaced to the client)
    const errorCard = posPage.locator('.state-card--error')
    const errorVisible = await errorCard.isVisible().catch(() => false)
    expect(errorVisible).toBeFalsy()
  })

  test('N04 positions — filter selects do not crash on option change', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    const selects = posPage.locator('.form-select')
    const selectCount = await selects.count()
    expect(selectCount).toBeGreaterThanOrEqual(4)

    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i)
      // Pick the last option (if available) to exercise a non-default value
      const options = sel.locator('option')
      const optionCount = await options.count()
      if (optionCount > 1) {
        const lastOptionValue = await options.nth(optionCount - 1).getAttribute('value')
        if (lastOptionValue !== null && lastOptionValue !== '') {
          await sel.selectOption(lastOptionValue)
          await page.waitForTimeout(300)
          // Page must still be intact
          await expect(posPage.locator('.page-title')).toBeVisible()
        }
      }
    }
  })

  test('N05 positions — reset after empty results restores page', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    // First produce empty results
    const keywordInput = posPage.locator('#assistant-positions-keyword')
    await keywordInput.fill('XXXXNOTEXIST999')
    await page.waitForTimeout(400)

    // Click reset (the ghost-button inside toolbar-card__meta)
    const resetBtn = posPage.locator('.toolbar-card__meta .ghost-button')
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.waitForTimeout(400)

    // Page returns to normal: toolbar, title still visible
    await expect(posPage.locator('.page-title')).toBeVisible()
    await expect(posPage.locator('.toolbar-card')).toBeVisible()
    // Keyword input should be empty now
    await expect(keywordInput).toHaveValue('')
  })

  test('N06 positions — student modal open/close without saving', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    // Find a student-link button (only appears when studentCount > 0)
    const studentLink = posPage.locator('.student-link').first()
    const hasStudentLink = await studentLink.isVisible().catch(() => false)

    if (hasStudentLink) {
      await studentLink.click()
      await page.waitForTimeout(500)

      // Modal should appear
      const modal = posPage.locator('.modal-backdrop')
      await expect(modal).toBeVisible()

      // Close button
      const closeBtn = modal.locator('.icon-button')
      await expect(closeBtn).toBeVisible()
      await closeBtn.click()
      await page.waitForTimeout(300)

      // Modal should be gone
      await expect(modal).not.toBeVisible()

      // Page still intact
      await expect(posPage.locator('.page-title')).toBeVisible()
    } else {
      // No student links available — verify page is still stable
      await expect(posPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N07 positions — view switch while filtering does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/positions')
    const posPage = page.locator('#page-positions')
    await expect(posPage).toBeVisible({ timeout: 30000 })

    // Apply a filter first
    const keywordInput = posPage.locator('#assistant-positions-keyword')
    await keywordInput.fill('Test')
    await page.waitForTimeout(300)

    // Switch to list view
    const listBtn = posPage.locator('#asst-view-list')
    await listBtn.click()
    await page.waitForTimeout(300)
    await expect(posPage.locator('.page-title')).toBeVisible()

    // Switch back to drilldown view
    const drillBtn = posPage.locator('#asst-view-drilldown')
    await drillBtn.click()
    await page.waitForTimeout(300)
    await expect(posPage.locator('.page-title')).toBeVisible()

    // Page did not crash
    await expect(posPage.locator('.toolbar-card')).toBeVisible()
  })

  // ============================================================
  // JOB OVERVIEW — NEGATIVE BOUNDARY
  // ============================================================

  test('N08 job overview — empty keyword search does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    // The keyword input has no id; locate by placeholder
    const keywordInput = joPage.locator('input[placeholder="搜索学员、公司或岗位"]')
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill('XXXXNOTEXIST999')
    await page.waitForTimeout(400)

    // Page still renders
    await expect(joPage.locator('.page-title')).toBeVisible()
    await expect(joPage.locator('.toolbar-card')).toBeVisible()
  })

  test('N09 job overview — XSS in keyword search does not inject', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    const keywordInput = joPage.locator('input[placeholder="搜索学员、公司或岗位"]')
    await keywordInput.fill('<script>alert(1)</script>')
    await page.waitForTimeout(400)

    await expect(joPage.locator('.page-title')).toBeVisible()

    let dialogTriggered = false
    page.once('dialog', () => { dialogTriggered = true })
    await page.waitForTimeout(500)
    expect(dialogTriggered).toBeFalsy()
  })

  test('N10 job overview — SQL injection in keyword shows no error', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    const keywordInput = joPage.locator('input[placeholder="搜索学员、公司或岗位"]')
    await keywordInput.fill("' OR 1=1 --")
    await page.waitForTimeout(400)

    await expect(joPage.locator('.page-title')).toBeVisible()
    await expect(joPage.locator('.toolbar-card')).toBeVisible()

    // No error card
    const errorCard = joPage.locator('.state-card--error')
    const errorVisible = await errorCard.isVisible().catch(() => false)
    expect(errorVisible).toBeFalsy()
  })

  test('N11 job overview — reset filter does not crash and reloads data', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    // Apply some filter first
    const keywordInput = joPage.locator('input[placeholder="搜索学员、公司或岗位"]')
    await keywordInput.fill('XXXXNOTEXIST')
    await page.waitForTimeout(300)

    // Click reset
    const resetBtn = joPage.locator('.toolbar-card .ghost-button')
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.waitForTimeout(400)

    // Page still intact, input cleared
    await expect(joPage.locator('.page-title')).toBeVisible()
    await expect(joPage.locator('.toolbar-card')).toBeVisible()
    await expect(keywordInput).toHaveValue('')
  })

  test('N12 job overview — click each visible detail link does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    // Wait for data to load
    await page.waitForTimeout(1000)

    // Find all detail links
    const detailLinks = joPage.locator('.link-button:has-text("查看详情")')
    const linkCount = await detailLinks.count()

    // Click up to 3 detail links to avoid very long test
    const maxToTest = Math.min(linkCount, 3)
    for (let i = 0; i < maxToTest; i++) {
      await detailLinks.nth(i).click()
      await page.waitForTimeout(500)
      // Page must not crash — title and side panel still visible
      await expect(joPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N13 job overview — stage filter with no results does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/job-overview')
    const joPage = page.locator('#page-job-overview')
    await expect(joPage).toBeVisible({ timeout: 30000 })

    // Select a stage option from the second select
    const stageSelect = joPage.locator('.form-select').first()
    const options = stageSelect.locator('option')
    const optionCount = await options.count()

    if (optionCount > 1) {
      // Select the last non-empty option
      const lastOptionValue = await options.nth(optionCount - 1).getAttribute('value')
      if (lastOptionValue !== null && lastOptionValue !== '') {
        await stageSelect.selectOption(lastOptionValue)
        await page.waitForTimeout(400)
        // Page must not crash
        await expect(joPage.locator('.page-title')).toBeVisible()
        await expect(joPage.locator('.toolbar-card')).toBeVisible()
      }
    } else {
      // Only "all" option — just verify page is still intact
      await expect(joPage.locator('.page-title')).toBeVisible()
    }
  })

  // ============================================================
  // MOCK PRACTICE — NEGATIVE BOUNDARY
  // ============================================================

  test('N14 mock practice — empty keyword search does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    const keywordInput = mpPage.locator('input[placeholder="搜索学员姓名或申请内容"]')
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill('XXXXNOTEXIST999')
    await page.waitForTimeout(400)

    await expect(mpPage.locator('.page-title')).toBeVisible()
    await expect(mpPage.locator('.toolbar-card')).toBeVisible()
  })

  test('N15 mock practice — XSS in keyword search does not inject', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    const keywordInput = mpPage.locator('input[placeholder="搜索学员姓名或申请内容"]')
    await keywordInput.fill('<script>alert(1)</script>')
    await page.waitForTimeout(400)

    await expect(mpPage.locator('.page-title')).toBeVisible()

    let dialogTriggered = false
    page.once('dialog', () => { dialogTriggered = true })
    await page.waitForTimeout(500)
    expect(dialogTriggered).toBeFalsy()
  })

  test('N16 mock practice — tab switch does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    // Switch to each tab: 全部, 待开始, 已完成
    const tabs = mpPage.locator('.tab-button')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(3)

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click()
      await page.waitForTimeout(400)
      // Page must not crash after each tab switch
      await expect(mpPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N17 mock practice — type filter does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    // Type select is the first .form-select inside toolbar-row
    const typeSelect = mpPage.locator('.toolbar-row .form-select').first()
    const options = typeSelect.locator('option')
    const optionCount = await options.count()

    if (optionCount > 1) {
      for (let i = 1; i < optionCount; i++) {
        const val = await options.nth(i).getAttribute('value')
        if (val !== null) {
          await typeSelect.selectOption(val)
          await page.waitForTimeout(300)
          await expect(mpPage.locator('.page-title')).toBeVisible()
        }
      }
    } else {
      await expect(mpPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N18 mock practice — status filter does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    // Status select is the second .form-select inside toolbar-row
    const selects = mpPage.locator('.toolbar-row .form-select')
    const selectCount = await selects.count()
    if (selectCount >= 2) {
      const statusSelect = selects.nth(1)
      const options = statusSelect.locator('option')
      const optionCount = await options.count()

      if (optionCount > 1) {
        for (let i = 1; i < optionCount; i++) {
          const val = await options.nth(i).getAttribute('value')
          if (val !== null) {
            await statusSelect.selectOption(val)
            await page.waitForTimeout(300)
            await expect(mpPage.locator('.page-title')).toBeVisible()
          }
        }
      }
    } else {
      await expect(mpPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N19 mock practice — reset filters does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    // Apply some filter first
    const keywordInput = mpPage.locator('input[placeholder="搜索学员姓名或申请内容"]')
    await keywordInput.fill('XXXXNOTEXIST')
    await page.waitForTimeout(300)

    // Click reset
    const resetBtn = mpPage.locator('.toolbar-row .ghost-button')
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.waitForTimeout(400)

    // Page still intact, input cleared
    await expect(mpPage.locator('.page-title')).toBeVisible()
    await expect(mpPage.locator('.toolbar-card')).toBeVisible()
    await expect(keywordInput).toHaveValue('')
  })

  test('N20 mock practice — detail modal open/close does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    // Wait for data to load
    await page.waitForTimeout(1000)

    // Find the first detail button
    const detailBtn = mpPage.locator('.link-button:has-text("查看详情")').first()
    const hasDetailBtn = await detailBtn.isVisible().catch(() => false)

    if (hasDetailBtn) {
      await detailBtn.click()
      await page.waitForTimeout(500)

      // Modal should appear
      const modal = mpPage.locator('.modal-backdrop')
      await expect(modal).toBeVisible()

      // Close via close button
      const closeBtn = modal.locator('.icon-button')
      await expect(closeBtn).toBeVisible()
      await closeBtn.click()
      await page.waitForTimeout(300)

      // Modal gone, page still intact
      await expect(modal).not.toBeVisible()
      await expect(mpPage.locator('.page-title')).toBeVisible()
    } else {
      // No records — page is still fine
      await expect(mpPage.locator('.page-title')).toBeVisible()
    }
  })

  test('N21 mock practice — no forbidden action buttons exist (read-only role)', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)

    await navigateTo(page, '/career/mock-practice')
    const mpPage = page.locator('#page-mock-practice')
    await expect(mpPage).toBeVisible({ timeout: 30000 })

    await page.waitForTimeout(1000)

    // The assistant has a read-only view. Verify no create/reschedule/confirm buttons.
    const createButtons = mpPage.locator('button:has-text("创建")')
    const rescheduleButtons = mpPage.locator('button:has-text("重新安排")')
    const confirmButtons = mpPage.locator('button:has-text("确认")')
    const addButtons = mpPage.locator('button:has-text("新增")')

    expect(await createButtons.count()).toBe(0)
    expect(await rescheduleButtons.count()).toBe(0)
    expect(await confirmButtons.count()).toBe(0)
    expect(await addButtons.count()).toBe(0)

    // Page title confirms read-only nature
    await expect(mpPage.locator('.page-title')).toContainText('模拟应聘')
  })
})
