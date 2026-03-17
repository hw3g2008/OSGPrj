import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

test.describe('student communication story S-008', () => {
  test('renders communication records and the networking log workflows @student-s008-communication', async ({ page }) => {
    await page.goto('/communication')

    await expect(page.getByText('人际关系沟通记录 Communication Records')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '记录人' })).toBeVisible()
    await expect(page.getByRole('button', { name: '详情' }).first()).toBeVisible()
    await page.getByRole('button', { name: '详情' }).first().click()
    await expect(page.getByRole('dialog', { name: /沟通记录详情/ })).toBeVisible()

    await page.goto('/netlog')

    await expect(page.getByText('沟通记录 Networking Log')).toBeVisible()
    await expect(page.getByText('完成了一次沟通？')).toBeVisible()
    await page.getByRole('button', { name: '填写记录' }).click()
    const formDialog = page.getByRole('dialog', { name: /填写沟通记录/ })
    await expect(formDialog).toBeVisible()
    await formDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByRole('button', { name: '查看' }).first().click()
    const detailDialog = page.getByRole('dialog', { name: /沟通记录详情/ })
    await expect(detailDialog).toBeVisible()
    await detailDialog.getByRole('button', { name: /编\s*辑/ }).click()
    await expect(page.getByRole('dialog', { name: /填写沟通记录/ })).toBeVisible()
  })
})
