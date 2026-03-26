import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student communication story S-008', () => {
  test('keeps communication routes behind the limited-rollout coming-soon surface @student-s008-communication', async ({ page }) => {
    for (const blockedRoute of [
      { path: '/communication', title: '人际关系沟通记录' },
      { path: '/netlog', title: '沟通记录' },
    ]) {
      await page.goto(blockedRoute.path)
      await expect(page).toHaveURL(/\/coming-soon/)
      await expect(page.getByRole('heading', { name: blockedRoute.title })).toBeVisible()
      await expect(page.getByText('敬请期待')).toBeVisible()
      await expect(page.getByText('当前页面不在本次学生端交付范围内')).toBeVisible()
    }
  })
})
