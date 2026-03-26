import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student limited rollout navigation access', () => {
  test('keeps delivered pages live and sends other routes to the coming-soon surface', async ({
    page,
  }) => {
    await page.goto('/positions')
    await expect(page).toHaveURL(/\/positions$/)

    for (const blockedRoute of [
      { path: '/resume', title: '简历管理' },
      { path: '/files', title: '文件' },
      { path: '/notice', title: '消息中心' },
      { path: '/ai-interview', title: 'AI面试分析' },
      { path: '/questions', title: '面试真题' },
    ]) {
      await page.goto(blockedRoute.path)
      await expect(page).toHaveURL(/\/coming-soon/)
      await expect(page.getByRole('heading', { name: blockedRoute.title })).toBeVisible()
      await expect(page.getByText('敬请期待')).toBeVisible()
      await expect(page.getByText('当前页面不在本次学生端交付范围内')).toBeVisible()
    }
  })
})
