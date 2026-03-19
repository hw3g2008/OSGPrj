import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student resume story S-010', () => {
  test('renders resume shells and ai resume report workflow @student-s010-resume', async ({ page }) => {
    await page.goto('/resume')

    await expect(page.getByRole('heading', { name: /我的简历\s*My Resume/ })).toBeVisible()
    await page.getByRole('button', { name: '预览' }).first().click()
    const previewDialog = page.getByRole('dialog', { name: /简历预览/ })
    await expect(previewDialog).toBeVisible()
    await previewDialog.getByRole('button', { name: /关\s*闭/ }).click()

    await page.goto('/ai-resume')

    await expect(page.getByRole('heading', { name: /AI简历分析\s*AI Resume Analysis/ })).toBeVisible()
    await page.getByRole('button', { name: '查看报告' }).first().click()
    await expect(page.getByRole('dialog', { name: /AI简历分析报告/ })).toBeVisible()
  })
})
