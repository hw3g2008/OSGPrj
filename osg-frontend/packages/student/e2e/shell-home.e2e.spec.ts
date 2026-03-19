import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student shell and home story S-003', () => {
  test('renders the full grouped sidebar and home overview @student-s003-shell', async ({ page }) => {
    await page.goto('/dashboard')

    const sidebar = page.locator('.sidebar-nav')

    await expect(sidebar.getByText('求职中心 Career').first()).toBeVisible()
    await expect(sidebar.getByText('学习中心 Learning').first()).toBeVisible()
    await expect(sidebar.getByText('简历中心 Resume').first()).toBeVisible()
    await expect(sidebar.getByText('资源中心 Resources').first()).toBeVisible()
    await expect(sidebar.getByText('个人中心 Profile').first()).toBeVisible()

    await expect(sidebar.getByText('人际关系沟通记录').first()).toBeVisible()
    await expect(sidebar.getByText('AI面试分析').first()).toBeVisible()
    await expect(sidebar.getByText('AI简历分析').first()).toBeVisible()
    await expect(sidebar.getByText('在线测试题库').first()).toBeVisible()
    await expect(sidebar.getByText('投诉建议').first()).toBeVisible()

    await expect(page.getByText('学员信息 Student Profile')).toBeVisible()
    await expect(page.getByText('快捷操作 Quick Actions')).toBeVisible()
  })

  test('routes home quick actions to the prototype targets @student-s003-actions', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: '我的课程' }).click()
    await expect(page).toHaveURL(/\/courses$/)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '填写面试真题' }).click()
    await expect(page).toHaveURL(/\/questions$/)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '填写沟通记录' }).click()
    await expect(page).toHaveURL(/\/netlog$/)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '岗位信息' }).click()
    await expect(page).toHaveURL(/\/positions$/)
  })

  test('logs out from the sidebar user card and clears auth @student-s003-logout', async ({ page }) => {
    await page.goto('/dashboard')

    await page.locator('.user-card').click()
    await expect(page).toHaveURL(/\/login$/)

    const authState = await page.evaluate(() => ({
      token: localStorage.getItem('osg_token'),
      user: localStorage.getItem('osg_user')
    }))

    expect(authState).toEqual({
      token: null,
      user: null
    })
  })
})
