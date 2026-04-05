import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'

const moduleName = process.env.E2E_MODULE || ''
const scheduleDayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

test.describe('Assistant Profile Negative Boundary @assistant @api', () => {
  test.skip(moduleName !== 'assistant', 'assistant profile negative spec only runs for assistant module')

  // ────────────────────────────────────────────────────────
  // Profile negative cases (N01-N10)
  // ────────────────────────────────────────────────────────

  test('N01 profile — empty nickName blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-save').click()

    await expect(page.locator('.field-error').first()).toBeVisible()
    await expect(page.locator('.field-error').first()).toContainText(/2|字符/)

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N02 profile — short nickName (1 char) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-nick-name').fill('A')
    await page.locator('#assistant-profile-save').click()

    await expect(page.locator('.field-error').first()).toBeVisible()
    await expect(page.locator('.field-error').first()).toContainText(/2|字符/)

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N03 profile — whitespace-only nickName blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    // v-model.trim means whitespace is trimmed before validation, so "   " becomes ""
    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-nick-name').fill('   ')
    await page.locator('#assistant-profile-save').click()

    await expect(page.locator('.field-error').first()).toBeVisible()
    await expect(page.locator('.field-error').first()).toContainText(/2|字符/)

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N04 profile — invalid email (no @) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-email').clear()
    await page.locator('#assistant-profile-email').fill('notanemail')
    await page.locator('#assistant-profile-save').click()

    // The validation message from Vue source: '请输入正确的邮箱格式。'
    const emailError = page.locator('.field-error').filter({ hasText: /邮箱/ })
    await expect(emailError).toBeVisible()
    await expect(emailError).toContainText('邮箱')

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N05 profile — invalid email (no domain) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-email').clear()
    await page.locator('#assistant-profile-email').fill('test@')
    await page.locator('#assistant-profile-save').click()

    const emailError = page.locator('.field-error').filter({ hasText: /邮箱/ })
    await expect(emailError).toBeVisible()

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N06 profile — invalid phone (letters) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-phone').clear()
    await page.locator('#assistant-profile-phone').fill('abc123')
    await page.locator('#assistant-profile-save').click()

    // Vue validation: phone is only checked when non-empty: /^1\d{10}$/
    const phoneError = page.locator('.field-error').filter({ hasText: /手机号|11/ })
    await expect(phoneError).toBeVisible()

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N07 profile — short phone (4 digits) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-phone').clear()
    await page.locator('#assistant-profile-phone').fill('1234')
    await page.locator('#assistant-profile-save').click()

    const phoneError = page.locator('.field-error').filter({ hasText: /手机号|11/ })
    await expect(phoneError).toBeVisible()

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N08 profile — empty all fields shows multiple errors', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-email').clear()
    await page.locator('#assistant-profile-phone').clear()
    await page.locator('#assistant-profile-save').click()

    // Should show at least nickName error and email error (phone is optional when empty)
    const errors = page.locator('.field-error')
    await expect(errors).toHaveCount(2)

    // Also expect the editor notice banner
    await expect(page.locator('.feedback-banner--error')).toContainText('无法保存')

    await page.locator('#assistant-profile-cancel').click()
  })

  test('N09 profile — cancel discards changes', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    // Record original nickName display
    const infoItems = page.locator('.info-item')
    const originalNickName = await infoItems.nth(0).locator('.info-item__value').textContent()

    // Change nickName in editor
    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-nick-name').fill('CancelledName')
    await page.locator('#assistant-profile-cancel').click()

    // Editor should be closed
    await expect(page.locator('.editor-card')).not.toBeVisible()

    // Original display should be unchanged
    const afterCancelNickName = await infoItems.nth(0).locator('.info-item__value').textContent()
    expect(afterCancelNickName).toBe(originalNickName)
  })

  test('N10 profile — double-click save does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('#assistant-profile-edit').click()
    await expect(page.locator('.editor-card')).toBeVisible()

    // Fill all fields with valid data
    const seed = Date.now()
    await page.locator('#assistant-profile-nick-name').clear()
    await page.locator('#assistant-profile-nick-name').fill(`Bot ${String(seed).slice(-4)}`)
    await page.locator('#assistant-profile-email').clear()
    await page.locator('#assistant-profile-email').fill(`double.click+${seed}@example.com`)
    await page.locator('#assistant-profile-phone').clear()
    await page.locator('#assistant-profile-phone').fill(`138${String(seed).slice(-8)}`)

    // Rapidly click save twice
    const saveButton = page.locator('#assistant-profile-save')
    await Promise.all([
      saveButton.click(),
      saveButton.click(),
    ])

    // Page should not crash — either editor closes (save succeeded) or remains visible
    // Just verify the page is still responsive
    await expect(page.locator('#page-profile')).toBeVisible()

    // If editor is still open (e.g. one request went through and page reloaded),
    // close it to leave clean state
    if (await page.locator('.editor-card').isVisible()) {
      await page.locator('#assistant-profile-cancel').click()
    }
  })

  // ────────────────────────────────────────────────────────
  // Schedule negative cases (N11-N16)
  // ────────────────────────────────────────────────────────

  test('N11 schedule — all days unavailable with 0 hours blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set all days to unavailable
    for (const day of scheduleDayKeys) {
      await page.locator(`#assistant-schedule-${day}`).selectOption('unavailable')
    }
    await page.locator('#assistant-schedule-total-hours').fill('0')
    await page.locator('#assistant-schedule-save').click()

    // Feedback should show the error about needing at least one available day
    await expect(page.locator('#assistant-schedule-feedback')).toContainText('请至少选择一天可授课时间段')

    // Restore valid state
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    await page.locator('#assistant-schedule-total-hours').fill('2')
    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')
  })

  test('N12 schedule — all days unavailable with positive hours still blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set all days to unavailable but hours to 10
    for (const day of scheduleDayKeys) {
      await page.locator(`#assistant-schedule-${day}`).selectOption('unavailable')
    }
    await page.locator('#assistant-schedule-total-hours').fill('10')
    await page.locator('#assistant-schedule-save').click()

    // Should still block because no available days
    await expect(page.locator('#assistant-schedule-feedback')).toContainText('请至少选择一天可授课时间段')

    // Restore valid state
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    await page.locator('#assistant-schedule-total-hours').fill('2')
    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')
  })

  test('N13 schedule — empty hours with available day blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set at least one day available
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    // Clear hours (will make totalHours NaN or empty)
    await page.locator('#assistant-schedule-total-hours').clear()
    await page.locator('#assistant-schedule-save').click()

    // Should show error about total hours
    await expect(page.locator('#assistant-schedule-feedback')).toContainText('总时长')

    // Restore valid state
    await page.locator('#assistant-schedule-total-hours').fill('2')
    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')
  })

  test('N14 schedule — negative hours blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set at least one day available
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    await page.locator('#assistant-schedule-total-hours').fill('-1')
    await page.locator('#assistant-schedule-save').click()

    // Should show error about total hours > 0
    await expect(page.locator('#assistant-schedule-feedback')).toContainText('总时长')

    // Restore valid state
    await page.locator('#assistant-schedule-total-hours').fill('2')
    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')
  })

  test('N15 schedule — excessive hours (200) blocked', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set at least one day available
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    await page.locator('#assistant-schedule-total-hours').fill('200')
    await page.locator('#assistant-schedule-save').click()

    // Should show error about exceeding 80 hours
    await expect(page.locator('#assistant-schedule-feedback')).toContainText('80')

    // Restore valid state
    await page.locator('#assistant-schedule-total-hours').fill('2')
    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')
  })

  test('N16 schedule — restore to valid state after testing', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('#page-schedule')).toBeVisible()

    // Set a valid schedule: at least one day available, reasonable hours
    await page.locator('#assistant-schedule-monday').selectOption('morning')
    await page.locator('#assistant-schedule-tuesday').selectOption('afternoon')
    await page.locator('#assistant-schedule-total-hours').fill('8')

    // Clear any prior feedback
    const feedbackEl = page.locator('#assistant-schedule-feedback')
    if (await feedbackEl.isVisible()) {
      // Dismiss by triggering a change — just save the valid state
    }

    await page.locator('#assistant-schedule-save').click()
    await expect(page.locator('#page-schedule .feedback-banner--success')).toContainText('保存成功')

    // Verify the schedule banner shows availability
    await expect(page.locator('.schedule-banner__value')).toContainText('天可用')
  })
})
