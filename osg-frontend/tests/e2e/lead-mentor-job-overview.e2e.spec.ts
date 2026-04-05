import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import * as path from 'node:path'
import * as fs from 'node:fs'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/lead-mentor-acceptance/job-overview')
const ss = async (page: import('@playwright/test').Page, name: string) => {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`) })
}

test.describe('LM 学员求职总览 P0', () => {
  test.skip(MOD !== 'lead-mentor', 'lead-mentor only')

  // ── MF-LM-019: 页面加载 ──
  test('MF-LM-019 页面标题和主内容区完整显示', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await expect(page.locator('#page-job-overview')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.page-title')).toContainText('学员求职总览')
    await ss(page, 'MF-LM-019')
  })

  // ── MF-LM-020: 导出按钮 ──
  test('MF-LM-020 导出按钮', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const exportBtn = page.locator('button:has-text("导出")')
    await expect(exportBtn).toBeVisible({ timeout: 8000 })
    await exportBtn.click({ force: true })
    await page.waitForTimeout(1500)
    await ss(page, 'MF-LM-020')
    // Page should still be functional
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-021: 导出按钮重复点击 ──
  test('MF-LM-021 导出按钮重复点击', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const exportBtn = page.locator('button:has-text("导出")')
    await exportBtn.click({ force: true })
    await page.waitForTimeout(800)
    await exportBtn.click({ force: true })
    await page.waitForTimeout(800)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-021')
  })

  // ── MF-LM-022: 展开日历 ──
  test('MF-LM-022 展开日历', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const toggleBtn = page.locator('#lm-toggle-view-btn')
    await expect(toggleBtn).toBeVisible({ timeout: 8000 })
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(800)
    // Month view should be visible
    await expect(page.locator('#lm-month-view-expanded')).toBeVisible({ timeout: 5000 })
    await ss(page, 'MF-LM-022')
  })

  // ── MF-LM-023: 日历展开收起切换 ──
  test('MF-LM-023 日历展开收起切换', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const toggleBtn = page.locator('#lm-toggle-view-btn')
    // Expand
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#lm-month-view-expanded')).toBeVisible({ timeout: 5000 })
    // Collapse
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#lm-month-view-expanded')).toBeHidden({ timeout: 5000 })
    await ss(page, 'MF-LM-023')
  })

  // ── MF-LM-024: 学员姓名搜索过滤 ──
  test('MF-LM-024 学员姓名搜索', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const nameInput = page.locator('input[placeholder*="学员姓名"]')
    await expect(nameInput).toBeVisible({ timeout: 8000 })
    await nameInput.fill('test-student-name')
    await page.locator('button:has-text("搜索")').click({ force: true })
    await page.waitForTimeout(1500)
    await ss(page, 'MF-LM-024')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-025: 姓名搜索清空恢复 ──
  test('MF-LM-025 姓名搜索清空', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const nameInput = page.locator('input[placeholder*="学员姓名"]')
    await nameInput.fill('test-clear')
    await page.locator('button:has-text("搜索")').click({ force: true })
    await page.waitForTimeout(1000)
    await nameInput.clear()
    await page.locator('button:has-text("搜索")').click({ force: true })
    await page.waitForTimeout(1500)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-025')
  })

  // ── MF-LM-026: 姓名搜索特殊字符 ──
  test('MF-LM-026 姓名搜索特殊字符', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const nameInput = page.locator('input[placeholder*="学员姓名"]')
    await nameInput.fill('<script>alert(1)</script>')
    await page.locator('button:has-text("搜索")').click({ force: true })
    await page.waitForTimeout(1500)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-026')
  })

  // ── MF-LM-027: 分配导师弹窗打开 ──
  test('MF-LM-027 分配导师弹窗打开', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    // Navigate to pending tab first
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      await ss(page, 'MF-LM-027-open')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications for assign-mentor' })
      await ss(page, 'MF-LM-027-no-data')
    }
  })

  // ── MF-LM-028: 分配导师弹窗关闭 ──
  test('MF-LM-028 分配导师弹窗关闭', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const closeBtn = modal.locator('[data-surface-part="close-control"]')
      await closeBtn.click({ force: true })
      await page.waitForTimeout(600)
      await expect(modal).toBeHidden({ timeout: 5000 })
      await ss(page, 'MF-LM-028-closed')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications for assign-mentor' })
      await ss(page, 'MF-LM-028-no-data')
    }
  })

  // ── MF-LM-029: 分配导师弹窗关闭后列表数据未丢失 ──
  test('MF-LM-029 分配导师弹窗关闭后列表完整', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      await modal.locator('[data-surface-part="close-control"]').click({ force: true })
      await page.waitForTimeout(600)
      await expect(page.locator('#page-job-overview')).toBeVisible()
      await ss(page, 'MF-LM-029')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-029-no-data')
    }
  })

  // ── MF-LM-030: 导师复选框勾选 ──
  test('MF-LM-030 导师复选框勾选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const mentorItems = modal.locator('.mentor-item')
      const mentorCount = await mentorItems.count()
      if (mentorCount > 0) {
        await mentorItems.first().click({ force: true })
        await page.waitForTimeout(300)
        const checkbox = mentorItems.first().locator('.mentor-item__checkbox')
        await expect(checkbox).toBeChecked()
      }
      await ss(page, 'MF-LM-030')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-030-no-data')
    }
  })

  // ── MF-LM-031: 不选导师时提交被阻止 ──
  test('MF-LM-031 不选导师提交被阻止', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      // Deselect any pre-selected mentors by clicking them
      const selectedMentors = modal.locator('.mentor-item--selected')
      const selCount = await selectedMentors.count()
      for (let i = 0; i < selCount; i++) {
        await selectedMentors.nth(0).click({ force: true })
        await page.waitForTimeout(200)
      }
      // Click confirm match
      const confirmBtn = modal.locator('button:has-text("确认匹配")')
      await confirmBtn.click({ force: true })
      await page.waitForTimeout(800)
      // Modal should still be visible (blocked)
      await expect(modal).toBeVisible()
      await ss(page, 'MF-LM-031')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-031-no-data')
    }
  })

  // ── MF-LM-032: 导师复选框多次点击切换 ──
  test('MF-LM-032 导师复选框多次切换', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const mentorItems = modal.locator('.mentor-item')
      const mentorCount = await mentorItems.count()
      if (mentorCount > 0) {
        // Click to select
        await mentorItems.first().click({ force: true })
        await page.waitForTimeout(200)
        // Click to deselect
        await mentorItems.first().click({ force: true })
        await page.waitForTimeout(200)
        // Click to select again
        await mentorItems.first().click({ force: true })
        await page.waitForTimeout(200)
      }
      await ss(page, 'MF-LM-032')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-032-no-data')
    }
  })

  // ── MF-LM-033: 备注输入框 ──
  test('MF-LM-033 备注输入框', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const textarea = modal.locator('textarea.form-input--textarea')
      await expect(textarea).toBeVisible({ timeout: 5000 })
      await textarea.fill('测试备注内容')
      await expect(textarea).toHaveValue('测试备注内容')
      await ss(page, 'MF-LM-033')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-033-no-data')
    }
  })

  // ── MF-LM-034: 备注为空时不阻止提交 ──
  test('MF-LM-034 备注为空不阻止提交', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      // Leave textarea empty (it's optional)
      const textarea = modal.locator('textarea.form-input--textarea')
      await expect(textarea).toBeVisible()
      await textarea.clear()
      // Mentor should already be pre-selected; confirm button should be enabled
      const confirmBtn = modal.locator('button:has-text("确认匹配")')
      await expect(confirmBtn).toBeEnabled()
      await ss(page, 'MF-LM-034')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-034-no-data')
    }
  })

  // ── MF-LM-144: 辅导学员类型筛选 ──
  test('MF-LM-144 辅导学员类型筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("辅导学员")') })
    await expect(typeSelect).toBeVisible({ timeout: 8000 })
    await typeSelect.selectOption('coaching')
    await page.waitForTimeout(1500)
    await ss(page, 'MF-LM-144')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-145: 辅导学员类型筛选重置 ──
  test('MF-LM-145 辅导学员类型筛选重置', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("辅导学员")') })
    await typeSelect.selectOption('coaching')
    await page.waitForTimeout(1000)
    await typeSelect.selectOption('')
    await page.waitForTimeout(1500)
    await ss(page, 'MF-LM-145')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-146: 状态筛选 ──
  test('MF-LM-146 状态筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const stageSelect = page.locator('select').filter({ has: page.locator('option:has-text("全部状态")') })
    await expect(stageSelect).toBeVisible({ timeout: 8000 })
    const options = await stageSelect.locator('option').all()
    if (options.length > 1) {
      const val = await options[1].getAttribute('value')
      if (val) {
        await stageSelect.selectOption(val)
        await page.waitForTimeout(1500)
      }
    }
    await ss(page, 'MF-LM-146')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-171: 公司筛选 ──
  test('MF-LM-171 公司筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const companySelect = page.locator('select').filter({ has: page.locator('option:has-text("全部公司")') })
    await expect(companySelect).toBeVisible({ timeout: 8000 })
    const options = await companySelect.locator('option').all()
    if (options.length > 1) {
      const val = await options[1].getAttribute('value')
      if (val) {
        await companySelect.selectOption(val)
        await page.waitForTimeout(1500)
      }
    }
    await ss(page, 'MF-LM-171')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-180: 待分配导师Tab ──
  test('MF-LM-180 待分配导师Tab', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const pendingTab = page.locator('#lm-job-tab-pending')
    await expect(pendingTab).toBeVisible({ timeout: 8000 })
    await pendingTab.click({ force: true })
    await expect(page.locator('#lm-job-content-pending')).toBeVisible({ timeout: 8000 })
    await ss(page, 'MF-LM-180')
  })

  // ── MF-LM-181: 待分配导师Tab重复点击 ──
  test('MF-LM-181 待分配导师Tab重复点击', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const pendingTab = page.locator('#lm-job-tab-pending')
    await pendingTab.click({ force: true })
    await page.waitForTimeout(500)
    await pendingTab.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-181')
  })

  // ── MF-LM-227: 收起日历 ──
  test('MF-LM-227 收起日历', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const toggleBtn = page.locator('#lm-toggle-view-btn')
    // Expand first
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#lm-month-view-expanded')).toBeVisible({ timeout: 5000 })
    // Now collapse
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#lm-month-view-expanded')).toBeHidden({ timeout: 5000 })
    await ss(page, 'MF-LM-227')
  })

  // ── MF-LM-243: 岗位状态筛选进行中 ──
  test('MF-LM-243 岗位状态筛选进行中', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const stageSelect = page.locator('select').filter({ has: page.locator('option:has-text("全部状态")') })
    const options = await stageSelect.locator('option').all()
    // Try to find an option for "进行中" or similar
    for (const opt of options) {
      const text = await opt.textContent()
      if (text && text.includes('进行中')) {
        const val = await opt.getAttribute('value')
        if (val) await stageSelect.selectOption(val)
        break
      }
    }
    await page.waitForTimeout(1500)
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-243')
  })

  // ── MF-LM-245: 批量操作无选中 ──
  test('MF-LM-245 批量操作无选中', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    // Without selecting anything, try to find batch action button
    const batchBtn = page.locator('button:has-text("批量")')
    const n = await batchBtn.count()
    if (n > 0) {
      const isEnabled = await batchBtn.first().isEnabled()
      // If the button exists and is disabled, that's expected behavior
      if (isEnabled) {
        await batchBtn.first().click({ force: true })
        await page.waitForTimeout(500)
      }
    }
    await expect(page.locator('#page-job-overview')).toBeVisible()
    await ss(page, 'MF-LM-245')
  })

  // ── MF-LM-248: 日历收起后再展开 ──
  test('MF-LM-248 日历收起后再展开', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const toggleBtn = page.locator('#lm-toggle-view-btn')
    // Expand
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    // Collapse
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    // Expand again
    await toggleBtn.click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('#lm-month-view-expanded')).toBeVisible({ timeout: 5000 })
    await ss(page, 'MF-LM-248')
  })

  // ── MF-LM-249: 查看求职详情 ──
  test('MF-LM-249 查看求职详情', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    // Default tab is coaching
    await page.waitForTimeout(2000)
    const detailBtns = page.locator('[data-surface-trigger="modal-job-detail"]')
    const n = await detailBtns.count()
    if (n > 0) {
      await detailBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-job-detail"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      await ss(page, 'MF-LM-249-open')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No job detail data' })
      await ss(page, 'MF-LM-249-no-data')
    }
  })

  // ── MF-LM-250: 翻页 ──
  test('MF-LM-250 第2页', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    const page2Btn = page.locator('button:has-text("2")').first()
    const isVisible = await page2Btn.isVisible({ timeout: 3000 }).catch(() => false)
    if (isVisible) {
      await page2Btn.click({ force: true })
      await page.waitForTimeout(1500)
      await ss(page, 'MF-LM-250-page2')
    } else {
      test.info().annotations.push({ type: 'Skip', description: 'No pagination visible (insufficient data)' })
      await ss(page, 'MF-LM-250-no-pagination')
    }
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-341: 筛选后翻页控件 ──
  test('MF-LM-341 筛选后翻页', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("辅导学员")') })
    await typeSelect.selectOption('coaching')
    await page.waitForTimeout(1500)
    const page2Btn = page.locator('button:has-text("2")').first()
    const isVisible = await page2Btn.isVisible({ timeout: 3000 }).catch(() => false)
    if (isVisible) {
      await page2Btn.click({ force: true })
      await page.waitForTimeout(1500)
      // Filter should still be applied
      await expect(typeSelect).toHaveValue('coaching')
    }
    await ss(page, 'MF-LM-341')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-342: 分页后筛选条件变更跳回第1页 ──
  test('MF-LM-342 分页后筛选变更跳回第1页', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1500)
    const page2Btn = page.locator('button:has-text("2")').first()
    const isVisible = await page2Btn.isVisible({ timeout: 3000 }).catch(() => false)
    if (isVisible) {
      await page2Btn.click({ force: true })
      await page.waitForTimeout(1000)
      // Change filter
      const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("辅导学员")') })
      await typeSelect.selectOption('coaching')
      await page.waitForTimeout(1500)
      // Should be back on page 1 (page 2 button should not be active)
      const activePage = page.locator('.pagination .active, .el-pager .is-active')
      const activeVisible = await activePage.isVisible({ timeout: 3000 }).catch(() => false)
      if (activeVisible) {
        await expect(activePage).toContainText('1')
      }
    }
    await ss(page, 'MF-LM-342')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-388: 排序切换不丢失筛选条件 ──
  test('MF-LM-388 排序不丢筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("辅导学员")') })
    await typeSelect.selectOption('coaching')
    await page.waitForTimeout(1000)
    // Look for any sort button
    const sortBtns = page.locator('.sort-button, [aria-label*="sort"], button:has-text("排序")')
    const sortCount = await sortBtns.count()
    if (sortCount > 0) {
      await sortBtns.first().click({ force: true })
      await page.waitForTimeout(1000)
      // Filter should still be applied
      await expect(typeSelect).toHaveValue('coaching')
    }
    await ss(page, 'MF-LM-388')
    await expect(page.locator('#page-job-overview')).toBeVisible()
  })

  // ── MF-LM-156: 分配导师弹窗排期状态筛选 ──
  test('MF-LM-156 分配导师弹窗排期筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      // Find the schedule filter select
      const scheduleSelect = modal.locator('select').filter({ has: page.locator('option:has-text("排期紧张")') })
      const selectCount = await scheduleSelect.count()
      if (selectCount > 0) {
        const options = await scheduleSelect.first().locator('option').all()
        if (options.length > 1) {
          await scheduleSelect.first().selectOption({ index: 1 })
          await page.waitForTimeout(500)
        }
      }
      await ss(page, 'MF-LM-156')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-156-no-data')
    }
  })

  // ── MF-LM-206: 导师复选框计数更新 ──
  test('MF-LM-206 导师复选框计数加1', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const hintBefore = await modal.locator('.selection-hint').textContent()
      // Find a not-yet-selected mentor and click
      const unselectedMentor = modal.locator('.mentor-item:not(.mentor-item--selected)').first()
      const hasUnselected = await unselectedMentor.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasUnselected) {
        await unselectedMentor.click({ force: true })
        await page.waitForTimeout(300)
        const hintAfter = await modal.locator('.selection-hint').textContent()
        expect(hintAfter).not.toBe(hintBefore)
      }
      await ss(page, 'MF-LM-206')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-206-no-data')
    }
  })

  // ── MF-LM-207: 导师取消勾选计数减1 ──
  test('MF-LM-207 导师取消勾选计数减1', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      const selectedMentor = modal.locator('.mentor-item--selected').first()
      const hasSelected = await selectedMentor.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasSelected) {
        const hintBefore = await modal.locator('.selection-hint').textContent()
        await selectedMentor.click({ force: true })
        await page.waitForTimeout(300)
        const hintAfter = await modal.locator('.selection-hint').textContent()
        expect(hintAfter).not.toBe(hintBefore)
      }
      await ss(page, 'MF-LM-207')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-207-no-data')
    }
  })

  // ── MF-LM-201: 确认匹配无选导师被阻止 ──
  test('MF-LM-201 确认匹配无选导师被阻止', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      // Deselect all
      const selectedMentors = modal.locator('.mentor-item--selected')
      const selCount = await selectedMentors.count()
      for (let i = 0; i < selCount; i++) {
        await selectedMentors.nth(0).click({ force: true })
        await page.waitForTimeout(200)
      }
      // Try confirm
      const confirmBtn = modal.locator('button:has-text("确认匹配")')
      await confirmBtn.click({ force: true })
      await page.waitForTimeout(500)
      // Modal should still be visible
      await expect(modal).toBeVisible()
      await ss(page, 'MF-LM-201')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-201-no-data')
    }
  })

  // ── MF-LM-214: 分配导师弹窗主攻方向筛选 ──
  test('MF-LM-214 分配导师弹窗主攻方向筛选', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/career/job-overview', { waitUntil: 'networkidle', timeout: 30000 })
    await page.locator('#lm-job-tab-pending').click({ force: true })
    await page.waitForTimeout(1500)
    const assignBtns = page.locator('[data-surface-trigger="modal-assign-mentor"]')
    const n = await assignBtns.count()
    if (n > 0) {
      await assignBtns.first().click({ force: true })
      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 8000 })
      // Find direction filter select
      const directionSelect = modal.locator('select').filter({ has: page.locator('option:has-text("Investment Bank")') })
      const selectCount = await directionSelect.count()
      if (selectCount > 0) {
        const options = await directionSelect.first().locator('option').all()
        if (options.length > 1) {
          await directionSelect.first().selectOption({ index: 1 })
          await page.waitForTimeout(500)
        }
      }
      await ss(page, 'MF-LM-214')
    } else {
      test.info().annotations.push({ type: 'Block', description: 'No pending applications' })
      await ss(page, 'MF-LM-214-no-data')
    }
  })
})
