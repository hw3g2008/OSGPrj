import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'
import { reseedStudentDemoUser } from './support/student-demo-user'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const FIXTURE_SOURCE = path.resolve(__dirname, './support/java/StudentPositionFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, './support/java/.compiled')
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'

type AjaxResult<T> = {
  code: number
  msg?: string
  data: T
}

type ApplicationMetaResponse = {
  pageSummary: {
    titleZh: string
    titleEn: string
    subtitle: string
  }
  tabCounts: {
    all: number
    applied: number
    ongoing: number
    completed: number
  }
  filterOptions: {
    progressStages: Array<{ value: string; label: string }>
    coachingStatuses: Array<{ value: string; label: string }>
    companyTypes: Array<{ value: string; label: string }>
    applyMethods: Array<{ value: string; label: string }>
  }
  schedule: Array<{
    id: number
    shortLabel: string
    title: string
    modalTime: string
  }>
}

type ApplicationSnapshot = {
  title: string
  company: string
  sourceType: string
  favorited: boolean
  applied: boolean
  appliedDate: string
  applyMethod: string
  progressStage: string
  progressNote: string
  coachingStatus: string
  mentorName: string
  mentorMeta: string
  hoursFeedback: string
  feedbackSummary: string
  interviewAt: string
}

function mysqlConnectorJar(): string {
  return path.join(
    os.homedir(),
    '.m2/repository/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar'
  )
}

function fixtureClasspath(): string {
  return [FIXTURE_BUILD_DIR, mysqlConnectorJar()].join(':')
}

function hydrateDbEnvFromRuntimeFile() {
  const envFile = process.env.DEV_ENV_FILE ?? DEFAULT_DEV_ENV_FILE
  if (!fs.existsSync(envFile)) {
    return
  }

  const source = fs.readFileSync(envFile, 'utf-8')
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (process.env[key]) {
      continue
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const normalizedValue = rawValue.replace(/^['"]|['"]$/g, '')
    process.env[key] = normalizedValue
  }
}

function compileFixture() {
  execFileSync('mkdir', ['-p', FIXTURE_BUILD_DIR], { stdio: 'pipe' })
  execFileSync('javac', ['-d', FIXTURE_BUILD_DIR, FIXTURE_SOURCE], {
    stdio: 'pipe',
    env: process.env
  })
}

function runFixture(command: 'reset-applications' | 'snapshot'): string {
  hydrateDbEnvFromRuntimeFile()
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentPositionFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8'
  }).trim()
}

function resetApplicationsScenario() {
  runFixture('reset-applications')
}

function readSnapshot(): ApplicationSnapshot[] {
  return JSON.parse(runFixture('snapshot')) as ApplicationSnapshot[]
}

function findSnapshot(company: string, title: string): ApplicationSnapshot {
  const record = readSnapshot().find((item) => item.company === company && item.title === title)
  if (!record) {
    throw new Error(`snapshot missing ${company} / ${title}`)
  }
  return record
}

function formatInterviewModalTime(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

async function authenticateStudentSession(page: Parameters<typeof test>[0]['page']) {
  const loginResponse = await page.request.post('/api/student/login', {
    data: {
      username: STUDENT_USERNAME,
      password: STUDENT_PASSWORD
    }
  })
  const body = await loginResponse.json()

  expect(loginResponse.ok()).toBeTruthy()
  expect(body.code).toBe(200)
  expect(body.token).toEqual(expect.any(String))

  await page.addInitScript((token, username) => {
    localStorage.setItem('osg_token', token)
    localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userName: username,
        nickName: 'Test Student',
        roles: ['student']
      })
    )
  }, body.token, STUDENT_USERNAME)
}

test.describe('student applications real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
    resetApplicationsScenario()
  })

  test('loads real application data and persists progress/apply changes to MySQL @student-s005-real-state', async ({ page }) => {
    await authenticateStudentSession(page)

    const listResponsePromise = page.waitForResponse('**/api/student/application/list', { timeout: 3000 })
    const metaResponsePromise = page.waitForResponse('**/api/student/application/meta', { timeout: 3000 })
    await page.goto('/applications')
    const [listResponse, metaResponse] = await Promise.all([listResponsePromise, metaResponsePromise])
    const listBody = (await listResponse.json()) as AjaxResult<{
      applications: Array<{ company: string; position: string; stage: string }>
    }>

    await expect(page.getByRole('heading', { name: /我的求职\s*My Applications/ })).toBeVisible()
    expect(listResponse.ok()).toBeTruthy()
    expect(metaResponse.ok()).toBeTruthy()
    expect(listBody.code).toBe(200)
    expect(listBody.data.applications.some((record) => record.company === 'JP Morgan' && record.position === 'S&T Analyst')).toBeTruthy()

    await page.getByRole('tab', { name: /面试中/ }).click()
    const gsRow = page.locator('tr').filter({ hasText: 'Goldman Sachs' }).first()
    await gsRow.getByRole('button', { name: /更新阶段/ }).click()

    const progressDialog = page.getByRole('dialog', { name: /更新申请进度/ })
    await progressDialog.locator('.ant-select-selector').click()
    await page.locator('.ant-select-dropdown:visible').getByText('Offer', { exact: true }).click()
    await progressDialog.getByRole('button', { name: /保\s*存/ }).click()

    await expect
      .poll(() => findSnapshot('Goldman Sachs', 'IB Analyst').progressStage)
      .toBe('offer')

    await page.getByRole('tab', { name: /已投递/ }).click()
    const jpmRow = page.locator('tr').filter({ hasText: 'JP Morgan' }).first()
    await jpmRow.getByRole('button', { name: /标记已投递/ }).click()

    const appliedDialog = page.getByRole('dialog', { name: /标记已投递/ })
    await appliedDialog.locator('input[type="date"]').fill('2026-03-16')
    const methodCombobox = appliedDialog.getByRole('combobox')
    await appliedDialog.locator('.ant-select-selector').click()
    await methodCombobox.press('ArrowDown')
    await methodCombobox.press('Enter')

    const applyResponsePromise = page.waitForResponse('**/api/student/position/apply')
    await appliedDialog.getByRole('button', { name: /确\s*认/ }).evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
    const applyResponse = await applyResponsePromise
    const applyRequestBody = applyResponse.request().postDataJSON()

    expect(applyResponse.ok()).toBeTruthy()
    expect(applyRequestBody).toMatchObject({
      positionId: expect.any(Number),
      applied: true,
      date: '2026-03-16',
      method: '内推'
    })

    await expect
      .poll(() => {
        const record = findSnapshot('JP Morgan', 'S&T Analyst')
        return JSON.stringify({
          applied: record.applied,
          appliedDate: record.appliedDate,
          applyMethod: record.applyMethod
        })
      })
      .toBe(
        JSON.stringify({
          applied: true,
          appliedDate: '2026-03-16',
          applyMethod: '内推'
        })
      )
  })

  test('loads backend-owned application meta for subtitle, tabs, filters, and interview schedule @student-s005-real-meta', async ({
    page
  }) => {
    await authenticateStudentSession(page)

    const listResponsePromise = page.waitForResponse('**/api/student/application/list', { timeout: 3000 })
    const metaResponsePromise = page.waitForResponse('**/api/student/application/meta', { timeout: 3000 })
    await page.goto('/applications')
    const [listResponse, metaResponse] = await Promise.all([listResponsePromise, metaResponsePromise])
    const listBody = (await listResponse.json()) as AjaxResult<{
      applications: Array<{ company: string; position: string }>
    }>
    const metaBody = (await metaResponse.json()) as AjaxResult<ApplicationMetaResponse>

    expect(listResponse.ok()).toBeTruthy()
    expect(metaResponse.ok()).toBeTruthy()
    expect(listBody.code).toBe(200)
    expect(metaBody.code).toBe(200)
    expect(metaBody.data.pageSummary).toMatchObject({
      titleZh: '我的求职',
      titleEn: 'My Applications',
      subtitle: '查看您的岗位申请和面试安排'
    })
    expect(metaBody.data.tabCounts).toEqual({
      all: 3,
      applied: 1,
      ongoing: 2,
      completed: 0
    })
    expect(metaBody.data.filterOptions.progressStages.some((option) => option.value === 'offer')).toBeTruthy()
    expect(metaBody.data.filterOptions.coachingStatuses.some((option) => option.value === 'pending')).toBeTruthy()
    expect(metaBody.data.filterOptions.companyTypes.map((option) => option.value)).toEqual(['ib', 'consulting'])
    expect(metaBody.data.filterOptions.applyMethods.map((option) => option.value)).toEqual(['官网投递', '内推', '邮件投递'])
    expect(metaBody.data.schedule).toHaveLength(2)
    expect(metaBody.data.schedule[0]).toMatchObject({
      shortLabel: 'GS First Round',
      title: 'Goldman Sachs - First Round'
    })

    await expect(page.getByText('查看您的岗位申请和面试安排')).toBeVisible()
    await expect(page.getByRole('tab', { name: /全部 3/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /已投递 1/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /面试中 2/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /已结束 0/ })).toBeVisible()
    await expect(page.getByRole('button', { name: metaBody.data.schedule[0].shortLabel })).toBeVisible()

    await page.locator('.filter-card .ant-select-selector').first().click()
    const filterDropdown = page.locator('.ant-select-dropdown:visible').last()
    await expect(filterDropdown.getByText('Offer', { exact: true }).first()).toBeVisible()
    await expect(filterDropdown.getByText('已拒绝', { exact: true }).first()).toBeVisible()
    await page.keyboard.press('Escape')

    const jpmRow = page.locator('tr').filter({ hasText: 'JP Morgan' }).first()
    await jpmRow.getByRole('button', { name: /标记已投递/ }).click()
    const appliedDialog = page.getByRole('dialog', { name: /标记已投递/ })
    await expect(appliedDialog.locator('.ant-select-selector')).toBeVisible()
    await appliedDialog.getByRole('button', { name: /取\s*消/ }).click()
  })

  test('interview schedule modal reflects real interview data from MySQL-backed applications @student-s005-real-interview', async ({
    page
  }) => {
    await authenticateStudentSession(page)

    const listResponsePromise = page.waitForResponse('**/api/student/application/list', { timeout: 3000 })
    const metaResponsePromise = page.waitForResponse('**/api/student/application/meta', { timeout: 3000 })
    await page.goto('/applications')
    const [listResponse, metaResponse] = await Promise.all([listResponsePromise, metaResponsePromise])
    const listBody = (await listResponse.json()) as AjaxResult<{
      applications: Array<{
        company: string
        position: string
        stageLabel: string
        interviewAt: string
      }>
    }>

    expect(listResponse.ok()).toBeTruthy()
    expect(metaResponse.ok()).toBeTruthy()
    expect(listBody.code).toBe(200)

    const gsInterview = listBody.data.applications.find(
      (record) => record.company === 'Goldman Sachs' && record.interviewAt
    )
    expect(gsInterview).toBeTruthy()

    const gsSnapshot = findSnapshot('Goldman Sachs', 'IB Analyst')
    expect(gsSnapshot.interviewAt).toBe(gsInterview?.interviewAt)

    await page.getByRole('button', { name: '展开' }).click()
    await expect(page.getByText('本月面试安排')).toBeVisible()
    await expect(page.getByText('Goldman Sachs - First Round')).toBeVisible()

    await page.getByRole('button', { name: 'GS First Round' }).click()

    const interviewDialog = page.getByRole('dialog', { name: /面试安排/ })
    await expect(interviewDialog).toBeVisible()
    await expect(interviewDialog.getByText(`Goldman Sachs - ${gsInterview?.stageLabel}`)).toBeVisible()
    await expect(interviewDialog.getByText(formatInterviewModalTime(gsInterview!.interviewAt))).toBeVisible()

    await interviewDialog.getByRole('button', { name: /确\s*定/ }).click()
    await expect(interviewDialog).not.toBeVisible()
  })
})
