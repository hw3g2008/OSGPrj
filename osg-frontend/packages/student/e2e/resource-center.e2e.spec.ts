import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student resource center story S-011', () => {
  test('renders the resource pages and question workflows from the prototype @student-s011-resource-center', async ({ page }) => {
    await page.goto('/files')
    await expect(page.getByRole('heading', { name: /文件\s*Files/ })).toBeVisible()

    await page.goto('/online-test-bank')
    await expect(page.getByRole('heading', { name: /在线测试题库\s*Online Test Bank/ })).toBeVisible()

    await page.goto('/interview-bank')
    await expect(page.getByRole('heading', { name: /真人面试题库\s*Interview Question Bank/ })).toBeVisible()

    await page.goto('/questions')
    await expect(page.getByRole('heading', { name: /面试真题\s*Interview Questions/ })).toBeVisible()
    await page.getByRole('button', { name: '填写真题' }).click()
    const createDialog = page.getByRole('dialog', { name: /^填写真题$/ })
    await expect(createDialog).toBeVisible()
    await createDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByRole('tab', { name: '我的提交' }).click()
    await expect(page.getByRole('columnheader', { name: '状态' })).toBeVisible()
    await expect(page.getByText('待填写').first()).toBeVisible()
  })
})
