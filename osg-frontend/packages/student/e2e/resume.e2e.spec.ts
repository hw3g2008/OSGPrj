import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student resume story S-010', () => {
  test('keeps resume routes behind the limited-rollout coming-soon surface @student-s010-resume', async ({ page }) => {
    for (const blockedRoute of [
      { path: '/resume', title: '简历管理' },
      { path: '/ai-resume', title: 'AI简历分析' },
    ]) {
      await page.goto(blockedRoute.path)
      await expect(page).toHaveURL(/\/coming-soon/)
      await expect(page.getByRole('heading', { name: blockedRoute.title })).toBeVisible()
      await expect(page.getByText('敬请期待')).toBeVisible()
      await expect(page.getByText('当前页面不在本次学生端交付范围内')).toBeVisible()
    }
  })
})
