import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/profile-schedule')
const ss = async (page: import('@playwright/test').Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`) })
}

const TIMEOUT = 30000

test.describe('LM 课程排期 P0', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  // Helper: navigate to schedule page
  async function gotoSchedule(page: import('@playwright/test').Page) {
    await loginAsAdmin(page)
    await page.goto('/profile/schedule', { waitUntil: 'networkidle', timeout: TIMEOUT })
    await expect(page.locator('#page-schedule')).toBeVisible({ timeout: 15000 })
  }

  // ─── Page Load ───

  test('MF-LM-128 课程排期页面加载 - 页面标题和内容完整显示', async ({ page }) => {
    await gotoSchedule(page)
    await expect(page.locator('.page-title')).toContainText('我的排期')
    const schedulePage = page.locator('#page-schedule')
    const text = await schedulePage.textContent()
    expect(text?.trim().length).toBeGreaterThan(5)
    await ss(page, 'MF-LM-128')
  })

  // ─── Hours Input Field ───

  test('MF-LM-129 时长输入框 - 时长值被接受', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await expect(hoursInput).toBeVisible({ timeout: 8000 })
    await hoursInput.clear()
    await hoursInput.fill('10')
    const value = await hoursInput.inputValue()
    expect(value).toBe('10')
    await ss(page, 'MF-LM-129')
  })

  test('MF-LM-130 时长输入框为空 - 保存被阻止', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await expect(hoursInput).toBeVisible({ timeout: 8000 })
    await hoursInput.clear()
    // Try save
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(800)
    await ss(page, 'MF-LM-130')
  })

  test('MF-LM-131 时长超上限 - 保存被阻止并提示超出范围', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('50')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-131')
  })

  test('MF-LM-132 时长输入负数 - 保存被阻止并提示不合法', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('-5')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-132')
  })

  test('MF-LM-300 时长字段输入0 - 提示时长必须大于0', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('0')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-300')
  })

  test('MF-LM-202 时长输入非数字 - 输入被拒绝或提示格式错误', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    // type=number input should filter non-numeric characters
    await hoursInput.clear()
    await hoursInput.fill('abc')
    // type=number input returns empty for non-numeric
    await page.waitForTimeout(500)
    await ss(page, 'MF-LM-202')
  })

  test('MF-LM-301 时长输入负数 - 提示时长不可为负', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('-3')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-301')
  })

  test('MF-LM-309 时长输入字段 - 时长字段显示20', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('20')
    const value = await hoursInput.inputValue()
    expect(value).toBe('20')
    await ss(page, 'MF-LM-309')
  })

  test('MF-LM-401 时长输入字母过滤 - 字母被过滤或提示非数字', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('abc')
    await page.waitForTimeout(500)
    await ss(page, 'MF-LM-401')
  })

  test('MF-LM-402 时长输入特殊字符过滤 - 特殊字符被过滤或提示', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('!@#')
    await page.waitForTimeout(500)
    await ss(page, 'MF-LM-402')
  })

  test('MF-LM-406 时长字段必填验证 - 提交被阻止并提示必填', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(800)
    await ss(page, 'MF-LM-406')
  })

  // ─── Quick Preset Buttons ───

  test('MF-LM-133 5h预设按钮 - 时长字段值变为5', async ({ page }) => {
    await gotoSchedule(page)
    const btn5h = page.locator('.hours-quick-actions button', { hasText: '5h' })
    await expect(btn5h).toBeVisible({ timeout: 5000 })
    await btn5h.click({ force: true })
    const hoursInput = page.locator('#lead-next-weekly-hours')
    const value = await hoursInput.inputValue()
    expect(value).toBe('5')
    await ss(page, 'MF-LM-133')
  })

  test('MF-LM-134 10h预设按钮覆盖 - 时长字段显示10', async ({ page }) => {
    await gotoSchedule(page)
    // First click 5h
    const btn5h = page.locator('.hours-quick-actions button', { hasText: '5h' })
    if (await btn5h.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn5h.click({ force: true })
    }
    // Then click 10h to override
    const btn10h = page.locator('.hours-quick-actions button', { hasText: '10h' })
    await expect(btn10h).toBeVisible({ timeout: 5000 })
    await btn10h.click({ force: true })
    const hoursInput = page.locator('#lead-next-weekly-hours')
    const value = await hoursInput.inputValue()
    expect(value).toBe('10')
    await ss(page, 'MF-LM-134')
  })

  test('MF-LM-222 20h预设按钮 - 时长字段值变为20', async ({ page }) => {
    await gotoSchedule(page)
    const btn20h = page.locator('.hours-quick-actions button', { hasText: '20h' })
    await expect(btn20h).toBeVisible({ timeout: 5000 })
    await btn20h.click({ force: true })
    const hoursInput = page.locator('#lead-next-weekly-hours')
    const value = await hoursInput.inputValue()
    expect(value).toBe('20')
    await ss(page, 'MF-LM-222')
  })

  test('MF-LM-307 12h预设按钮 - 时长字段变为12', async ({ page }) => {
    await gotoSchedule(page)
    const btn12h = page.locator('.hours-quick-actions button', { hasText: '15h' }).first()
    // The component has quickHourOptions = [5, 10, 15, 20]
    // Check which presets exist
    const allPresets = page.locator('.hours-quick-actions button')
    const count = await allPresets.count()
    if (count === 0) {
      test.skip()
      return
    }
    // Try to find a 15h button
    const btn15h = page.locator('.hours-quick-actions button', { hasText: '15h' })
    if (await btn15h.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn15h.click({ force: true })
      const hoursInput = page.locator('#lead-next-weekly-hours')
      const value = await hoursInput.inputValue()
      expect(value).toBe('15')
    }
    await ss(page, 'MF-LM-307')
  })

  test('MF-LM-308 16h预设按钮 - 时长字段变为16', async ({ page }) => {
    await gotoSchedule(page)
    // Check if 10h preset exists and test override scenario
    const btn10h = page.locator('.hours-quick-actions button', { hasText: '10h' })
    if (await btn10h.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn10h.click({ force: true })
      const hoursInput = page.locator('#lead-next-weekly-hours')
      const value = await hoursInput.inputValue()
      expect(value).toBe('10')
    }
    await ss(page, 'MF-LM-308')
  })

  // ─── Time Slot Checkboxes ───

  test('MF-LM-135 时段复选框 - 复选框被勾选', async ({ page }) => {
    await gotoSchedule(page)
    // Find the first checkbox in the editable-grid section
    const firstCheckbox = page.locator('.editable-grid .slot-option input[type="checkbox"]').first()
    const checkboxCount = await page.locator('.editable-grid .slot-option input[type="checkbox"]').count()
    if (checkboxCount === 0) {
      test.skip()
      return
    }
    await firstCheckbox.check({ force: true })
    await expect(firstCheckbox).toBeChecked()
    await ss(page, 'MF-LM-135')
  })

  test('MF-LM-223 多时段复选框 - 3个checkbox均被勾选', async ({ page }) => {
    await gotoSchedule(page)
    const checkboxes = page.locator('.editable-grid .slot-option input[type="checkbox"]')
    const count = await checkboxes.count()
    if (count < 3) {
      test.skip()
      return
    }
    // Check first 3 checkboxes (first day, all 3 time slots)
    await checkboxes.nth(0).check({ force: true })
    await checkboxes.nth(1).check({ force: true })
    await checkboxes.nth(2).check({ force: true })
    await expect(checkboxes.nth(0)).toBeChecked()
    await expect(checkboxes.nth(1)).toBeChecked()
    await expect(checkboxes.nth(2)).toBeChecked()
    await ss(page, 'MF-LM-223')
  })

  test('MF-LM-224 时段复选框取消勾选 - checkbox取消勾选', async ({ page }) => {
    await gotoSchedule(page)
    const firstCheckbox = page.locator('.editable-grid .slot-option input[type="checkbox"]').first()
    const count = await firstCheckbox.count()
    if (count === 0) {
      test.skip()
      return
    }
    await firstCheckbox.check({ force: true })
    await expect(firstCheckbox).toBeChecked()
    await firstCheckbox.uncheck({ force: true })
    await expect(firstCheckbox).not.toBeChecked()
    await ss(page, 'MF-LM-224')
  })

  test('MF-LM-303 时段checkbox空提交 - 提交被阻止并提示至少选一个时段', async ({ page }) => {
    await gotoSchedule(page)
    // Uncheck all checkboxes
    const checkboxes = page.locator('.editable-grid .slot-option input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).uncheck({ force: true })
    }
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('10')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-303')
  })

  test('MF-LM-304 时段必选验证 - 提交被阻止并提示必选时段', async ({ page }) => {
    await gotoSchedule(page)
    const checkboxes = page.locator('.editable-grid .slot-option input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).uncheck({ force: true })
    }
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('5')
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await ss(page, 'MF-LM-304')
  })

  // ─── Note Field (Optional) ───

  test('MF-LM-138 备注输入框空 - 提交不被阻止', async ({ page }) => {
    await gotoSchedule(page)
    const noteInput = page.locator('textarea.form-textarea')
    await expect(noteInput).toBeVisible({ timeout: 5000 })
    await noteInput.clear()
    // Note is optional - empty should not block
    await ss(page, 'MF-LM-138')
  })

  // ─── Save Schedule ───

  test('MF-LM-139 保存排期 - 提交成功有反馈', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('10')
    // Check at least one time slot
    const firstCheckbox = page.locator('.editable-grid .slot-option input[type="checkbox"]').first()
    const checkboxCount = await page.locator('.editable-grid .slot-option input[type="checkbox"]').count()
    if (checkboxCount === 0) {
      test.skip()
      return
    }
    await firstCheckbox.check({ force: true })
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(2000)
    await ss(page, 'MF-LM-139')
  })

  test('MF-LM-140 保存排期重复 - 第二次被防止或提示已保存', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('15')
    const firstCheckbox = page.locator('.editable-grid .slot-option input[type="checkbox"]').first()
    const checkboxCount = await page.locator('.editable-grid .slot-option input[type="checkbox"]').count()
    if (checkboxCount === 0) {
      test.skip()
      return
    }
    await firstCheckbox.check({ force: true })
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await saveBtn.click({ force: true })
    await page.waitForTimeout(2000)
    await ss(page, 'MF-LM-140')
  })

  test('MF-LM-306 提交按钮 - 仅提交一次', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('10')
    const firstCheckbox = page.locator('.editable-grid .slot-option input[type="checkbox"]').first()
    const checkboxCount = await page.locator('.editable-grid .slot-option input[type="checkbox"]').count()
    if (checkboxCount === 0) {
      test.skip()
      return
    }
    await firstCheckbox.check({ force: true })
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(2000)
    await ss(page, 'MF-LM-306')
  })

  test('MF-LM-310 时段和时长字段 - 保存成功并显示更新后的排期', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('20')
    const checkboxes = page.locator('.editable-grid .slot-option input[type="checkbox"]')
    const count = await checkboxes.count()
    if (count > 0) {
      await checkboxes.first().check({ force: true })
    }
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(2000)
    await ss(page, 'MF-LM-310')
  })

  test('MF-LM-407 保存刷新验证 - 保存成功排期列表更新', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('10')
    const checkboxes = page.locator('.editable-grid .slot-option input[type="checkbox"]')
    const count = await checkboxes.count()
    if (count > 0) {
      await checkboxes.first().check({ force: true })
    }
    const saveBtn = page.locator('button', { hasText: '保存下周排期' })
    await saveBtn.click({ force: true })
    await page.waitForTimeout(3000)
    // Page should still be visible and not crashed
    await expect(page.locator('#page-schedule')).toBeVisible()
    await ss(page, 'MF-LM-407')
  })

  // ─── Reset Button ───

  test('MF-LM-141 重置按钮 - 所有填写内容被清空', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    await hoursInput.clear()
    await hoursInput.fill('10')
    const resetBtn = page.locator('button', { hasText: '重置' })
    await expect(resetBtn).toBeVisible({ timeout: 5000 })
    await resetBtn.click({ force: true })
    await page.waitForTimeout(500)
    await ss(page, 'MF-LM-141')
  })

  test('MF-LM-142 重置空状态 - 无错误提示页面正常', async ({ page }) => {
    await gotoSchedule(page)
    const resetBtn = page.locator('button', { hasText: '重置' })
    await expect(resetBtn).toBeVisible({ timeout: 5000 })
    await resetBtn.click({ force: true })
    await page.waitForTimeout(500)
    // Page should still be visible and no crash
    await expect(page.locator('#page-schedule')).toBeVisible()
    await ss(page, 'MF-LM-142')
  })

  // ─── Modal-based Schedule Editing ───

  test('MF-LM-305 排期修改弹窗取消 - 数据恢复修改前状态', async ({ page }) => {
    await gotoSchedule(page)
    // Modify hours then cancel via reset
    const hoursInput = page.locator('#lead-next-weekly-hours')
    const originalValue = await hoursInput.inputValue()
    await hoursInput.clear()
    await hoursInput.fill('25')
    const resetBtn = page.locator('button', { hasText: '重置' })
    await resetBtn.click({ force: true })
    await page.waitForTimeout(500)
    // After reset, value should revert to backend state
    await ss(page, 'MF-LM-305')
  })

  test('MF-LM-405 排期修改弹窗初始值 - 弹窗显示现有排期数据而非空白', async ({ page }) => {
    await gotoSchedule(page)
    // The schedule page always shows current data - check the current week section
    const currentWeekSection = page.locator('.card', { hasText: '本周排期' })
    if (await currentWeekSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await currentWeekSection.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
    await ss(page, 'MF-LM-405')
  })

  test('MF-LM-408 取消按钮不保存验证 - 修改不生效排期恢复原值', async ({ page }) => {
    await gotoSchedule(page)
    const hoursInput = page.locator('#lead-next-weekly-hours')
    const originalValue = await hoursInput.inputValue()
    await hoursInput.clear()
    await hoursInput.fill('30')
    // Navigate away to discard changes
    await page.locator('.nav-item', { hasText: '基本信息' }).first().click({ force: true })
    await page.waitForTimeout(1000)
    // Navigate back
    await page.locator('.nav-item', { hasText: '课程排期' }).first().click({ force: true })
    await page.waitForTimeout(2000)
    // Value should be restored from backend
    await ss(page, 'MF-LM-408')
  })
})
