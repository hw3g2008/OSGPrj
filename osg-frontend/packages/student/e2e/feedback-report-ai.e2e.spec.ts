import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student feedback/report/ai interview story S-009', () => {
  test('renders feedback tabs, report rate modal, and ai interview details @student-s009-feedback', async ({ page }) => {
    await page.goto('/feedback')

    await expect(page.getByText('课程反馈 Feedback')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Prep Feedback' })).toBeVisible()
    await page.getByRole('button', { name: 'View' }).first().click()
    await expect(page.getByRole('dialog', { name: /Feedback Detail/ })).toBeVisible()

    await page.goto('/report')

    await expect(page.getByText('上课记录 Class Report')).toBeVisible()
    await page.locator('tr', { hasText: '231776' }).getByRole('button').click()
    const rateDialog = page.getByRole('dialog', { name: /课程评价/ })
    await expect(rateDialog).toBeVisible()
    await rateDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.goto('/ai-interview')

    await expect(page.getByText('AI面试分析 AI Interview Analysis')).toBeVisible()
    await page.getByRole('button', { name: '上传面试' }).click()
    const uploadDialog = page.getByRole('dialog', { name: /上传面试素材/ })
    await expect(uploadDialog).toBeVisible()
    await uploadDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByRole('button', { name: '查看详情' }).first().click()
    await expect(page.getByRole('dialog', { name: /AI面试分析详情/ })).toBeVisible()
  })
})
