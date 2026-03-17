import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student positions story S-004', () => {
  test('opens the key positions workflows from the prototype shell @student-s004-positions', async ({ page }) => {
    await page.goto('/positions')

    await expect(page.getByText('岗位信息 Job Tracker')).toBeVisible()
    await expect(page.getByPlaceholder('搜索岗位名称...')).toBeVisible()

    await page.getByRole('button', { name: '手动添加' }).click()
    const manualDialog = page.getByRole('dialog', { name: /手动添加岗位/ })
    await expect(manualDialog).toBeVisible()
    await manualDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByText('列表视图').click()
    await expect(page.getByRole('columnheader', { name: '公司' })).toBeVisible()

    await page.getByRole('button', { name: /进\s*度/ }).first().click()
    const progressDialog = page.getByRole('dialog', { name: /记录岗位进度/ })
    await expect(progressDialog).toBeVisible()
    await progressDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByText('我的收藏').click()
    await page.getByRole('button', { name: /投\s*递/ }).first().click()
    await expect(page.getByRole('dialog', { name: /标记已投递/ })).toBeVisible()
  })
})
