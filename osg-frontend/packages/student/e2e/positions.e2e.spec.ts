import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const positionsFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../tests/e2e/fixtures/student/positions/list.json'),
    'utf-8',
  ),
) as { code: number; msg: string; data: Array<Record<string, unknown>> }

const mockPositionsList = positionsFixture.data.map((record) => {
  if (record.company === 'Goldman Sachs' && record.title === 'IB Analyst') {
    return {
      ...record,
      applied: false,
      progressStage: 'applied',
      progressNote: '',
    }
  }

  return record
})

const mockPositionsMeta = {
  code: 200,
  msg: '操作成功',
  data: {
    intentSummary: {
      recruitmentCycle: '2025 Summer',
      targetRegion: 'Hong Kong',
      primaryDirection: '金融 Finance',
    },
    filterOptions: {
      categories: [
        { value: 'summer', label: '暑期实习', color: 'blue' },
        { value: 'fulltime', label: '全职招聘', color: 'green' },
      ],
      industries: [
        { value: 'ib', label: 'Investment Banking', iconKey: 'bank', sort: 1 },
        { value: 'consulting', label: 'Consulting', iconKey: 'bulb', sort: 2 },
      ],
      companies: [
        { value: 'gs', label: 'Goldman Sachs', brandColor: '#9B7A3B' },
        { value: 'jpm', label: 'JP Morgan', brandColor: '#2B4C7E' },
        { value: 'mck', label: 'McKinsey', brandColor: '#0A5C8F' },
      ],
      locations: [
        { value: 'Hong Kong', label: 'Hong Kong' },
        { value: 'London', label: 'London' },
        { value: 'New York', label: 'New York' },
      ],
      applyMethods: [
        { value: '官网投递', label: '官网投递' },
        { value: '内推', label: '内推' },
      ],
      progressStages: [
        { value: 'applied', label: '已投递' },
        { value: 'first', label: 'First Round' },
        { value: 'second', label: 'Second Round' },
      ],
      coachingStages: [
        { value: 'first', label: 'First Round' },
        { value: 'second', label: 'Second Round' },
      ],
      mentorCounts: [
        { value: '1', label: '1位导师' },
        { value: '2', label: '2位导师' },
      ],
    },
  },
}

async function mockPositionApis(page: Page) {
  await page.route('**/api/student/position/meta', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPositionsMeta),
    })
  })

  await page.route('**/api/student/position/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: mockPositionsList,
      }),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockPositionApis(page)
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ userName: 'student_demo', nickName: 'Test Student' }))
  })
})

test.describe('student positions story S-004', () => {
  test('opens the key positions workflows from the prototype shell @student-s004-positions', async ({ page }) => {
    await page.goto('/positions')

    await expect(page.getByRole('heading', { name: /岗位信息/ })).toBeVisible()
    await expect(page.locator('.page-title-en')).toHaveText('Job Tracker')
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
