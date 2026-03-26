import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student feedback/report/ai interview story S-009', () => {
  test('keeps feedback, report, and ai interview routes behind coming soon @student-s009-feedback', async ({ page }) => {
    for (const blockedRoute of [
      { path: '/feedback', title: '课程反馈' },
      { path: '/report', title: '上课记录' },
      { path: '/ai-interview', title: 'AI面试分析' },
    ]) {
      await page.goto(blockedRoute.path)
      await expect(page).toHaveURL(/\/coming-soon/)
      await expect(page.getByRole('heading', { name: blockedRoute.title })).toBeVisible()
      await expect(page.getByText('敬请期待')).toBeVisible()
      await expect(page.getByText('当前页面不在本次学生端交付范围内')).toBeVisible()
    }
  })
})
