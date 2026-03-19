import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const FIXTURE_SOURCE = path.resolve(__dirname, './support/java/StudentPositionFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, './support/java/.compiled')
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'

type PositionSnapshot = {
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
  coachingStage: string
  coachingMentorCount: string
  coachingNote: string
}

type AjaxResult<T> = {
  code: number
  msg?: string
  data: T
}

type PositionOption = {
  value: string
  label: string
  color?: string
  code?: string
  iconKey?: string
  brandColor?: string
}

type PositionPageMeta = {
  intentSummary: {
    recruitmentCycle: string
    targetRegion: string
    primaryDirection: string
  }
  filterOptions: {
    categories: PositionOption[]
    industries: PositionOption[]
    companies: PositionOption[]
    locations: PositionOption[]
    applyMethods: PositionOption[]
    progressStages: PositionOption[]
    coachingStages: PositionOption[]
    mentorCounts: PositionOption[]
  }
}

function mysqlConnectorJar(): string {
  return path.join(
    os.homedir(),
    '.m2/repository/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar'
  )
}

function studentSeedClasspath(): string {
  const home = os.homedir()
  return [
    '/tmp',
    mysqlConnectorJar(),
    path.join(
      home,
      '.m2/repository/org/springframework/security/spring-security-crypto/6.5.3/spring-security-crypto-6.5.3.jar'
    ),
    path.join(home, '.m2/repository/org/springframework/spring-core/6.2.14/spring-core-6.2.14.jar'),
    path.join(home, '.m2/repository/commons-logging/commons-logging/1.2/commons-logging-1.2.jar')
  ].join(':')
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

function ensureDbEnv() {
  hydrateDbEnvFromRuntimeFile()

  const requiredKeys = [
    'SPRING_DATASOURCE_DRUID_MASTER_URL',
    'SPRING_DATASOURCE_DRUID_MASTER_USERNAME',
    'SPRING_DATASOURCE_DRUID_MASTER_PASSWORD'
  ] as const

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      throw new Error(`missing required env for positions real integration: ${key}`)
    }
  }
}

function reseedStudentDemoUser() {
  execFileSync('java', ['-cp', studentSeedClasspath(), 'CreateStudentDemoUser'], {
    stdio: 'pipe',
    env: process.env
  })
}

function compileFixture() {
  execFileSync('mkdir', ['-p', FIXTURE_BUILD_DIR], { stdio: 'pipe' })
  execFileSync('javac', ['-d', FIXTURE_BUILD_DIR, FIXTURE_SOURCE], {
    stdio: 'pipe',
    env: process.env
  })
}

function runFixture(command: 'reset' | 'snapshot'): string {
  ensureDbEnv()
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentPositionFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8'
  }).trim()
}

function resetPositionScenario() {
  runFixture('reset')
}

function readSnapshot(): PositionSnapshot[] {
  return JSON.parse(runFixture('snapshot')) as PositionSnapshot[]
}

function findSnapshot(company: string, title: string): PositionSnapshot {
  const record = readSnapshot().find((item) => item.company === company && item.title === title)
  if (!record) {
    throw new Error(`snapshot missing ${company} / ${title}`)
  }
  return record
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

async function ensurePositionRowVisible(
  page: Parameters<typeof test>[0]['page'],
  companyName: string,
  positionTitle: string
) {
  const row = page.locator('tr').filter({ hasText: positionTitle }).first()
  if ((await row.count()) > 0) {
    return row
  }

  await page.locator('.company-header').filter({ hasText: companyName }).first().click()
  await expect(row).toBeVisible()
  return row
}

async function gotoPositionsPage(page: Parameters<typeof test>[0]['page']) {
  const listResponsePromise = page.waitForResponse('**/api/student/position/list')
  const metaResponsePromise = page.waitForResponse('**/api/student/position/meta')
  await page.goto('/positions')
  const [listResponse, metaResponse] = await Promise.all([listResponsePromise, metaResponsePromise])
  return { listResponse, metaResponse }
}

test.describe('student positions real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
    resetPositionScenario()
  })

  test('persists favorite, apply, and progress state to the real student positions tables @student-s004-real-state', async ({ page }) => {
    await authenticateStudentSession(page)
    const { listResponse } = await gotoPositionsPage(page)
    const listBody = (await listResponse.json()) as AjaxResult<PositionSnapshot[]>

    await expect(page.getByRole('heading', { name: /岗位信息/ })).toBeVisible()
    expect(listResponse.ok()).toBeTruthy()
    expect(listBody.code).toBe(200)
    expect(Array.isArray(listBody.data)).toBeTruthy()
    expect(
      listBody.data.some((record) => record.company === 'JP Morgan' && record.title === 'S&T Analyst')
    ).toBeTruthy()
    await page.getByRole('tab', { name: /我的收藏/ }).click()

    const favoriteRow = page.locator('tr').filter({ hasText: 'JP Morgan' }).first()
    await favoriteRow.getByRole('button', { name: '取消收藏' }).click()

    await expect
      .poll(() => findSnapshot('JP Morgan', 'S&T Analyst').favorited)
      .toBe(false)

    await page.reload()
    await page.getByText('列表视图').click()

    const listRow = page.locator('tr').filter({ hasText: 'JP Morgan' }).first()
    await listRow.getByRole('button', { name: /投\s*递/ }).evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })

    const appliedDialog = page.getByRole('dialog', { name: /标记已投递/ })
    await expect(appliedDialog).toBeVisible()
    await appliedDialog.locator('input[type="date"]').fill('2026-03-16')
    await appliedDialog.getByPlaceholder('如：投递了哪个部门或是否有内推').fill('真实投递联调')
    await appliedDialog.getByRole('button', { name: '确认投递' }).click()

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
          applyMethod: '官网投递'
        })
      )

    const progressedRow = page.locator('tr').filter({ hasText: 'JP Morgan' }).first()
    await progressedRow.getByRole('button', { name: /进\s*度/ }).click()

    const progressDialog = page.getByRole('dialog', { name: /记录岗位进度/ })
    await progressDialog.locator('.ant-select-selector').click()
    await page.locator('.ant-select-dropdown:visible').getByText('Offer', { exact: true }).click()
    await progressDialog.getByPlaceholder('记录这一轮的关键进展或提醒').fill('拿到 offer，等待确认')
    await progressDialog.getByRole('button', { name: '保存进度' }).click()

    await expect
      .poll(() => {
        const record = findSnapshot('JP Morgan', 'S&T Analyst')
        return JSON.stringify({
          progressStage: record.progressStage,
          progressNote: record.progressNote
        })
      })
      .toBe(
        JSON.stringify({
          progressStage: 'offer',
          progressNote: '拿到 offer，等待确认'
        })
      )
  })

  test('loads the intent banner and filter options from real business-side meta instead of frontend constants @student-s004-real-meta', async ({ page }) => {
    await authenticateStudentSession(page)
    const { metaResponse } = await gotoPositionsPage(page)
    const metaBody = (await metaResponse.json()) as AjaxResult<PositionPageMeta>

    expect(metaResponse.ok()).toBeTruthy()
    expect(metaBody.code).toBe(200)
    expect(metaBody.data.intentSummary).toEqual({
      recruitmentCycle: '2026 Spring',
      targetRegion: 'Shanghai',
      primaryDirection: 'Consulting'
    })
    expect(metaBody.data.filterOptions.categories.map((item) => item.value)).toEqual(['summer', 'fulltime'])
    expect(metaBody.data.filterOptions.industries.map((item) => item.value)).toEqual(['ib', 'consulting'])
    expect(metaBody.data.filterOptions.companies.map((item) => item.value)).toEqual(['gs', 'jpm', 'mck'])
    expect(metaBody.data.filterOptions.locations.map((item) => item.value)).toEqual(['Hong Kong', 'New York', 'Shanghai'])

    await expect(page.locator('.permission-notice')).toContainText('2026 Spring')
    await expect(page.locator('.permission-notice')).toContainText('Shanghai')
    await expect(page.locator('.permission-notice')).toContainText('Consulting')

  })

  test('manual add survives reload because the new position is stored in MySQL @student-s004-real-manual', async ({ page }) => {
    const manualTitle = `Real QA Intern ${Date.now()}`

    await authenticateStudentSession(page)
    await gotoPositionsPage(page)
    await page.getByRole('button', { name: '手动添加' }).click()

    const manualDialog = page.getByRole('dialog', { name: /手动添加岗位/ })
    await manualDialog.locator('.ant-select-selector').click()
    await page.locator('.ant-select-dropdown:visible').getByText('暑期实习', { exact: true }).click()
    await manualDialog.getByPlaceholder('如：IB Analyst').fill(manualTitle)
    await manualDialog.getByPlaceholder('如：Goldman Sachs').fill('OpenAI')
    await manualDialog.getByPlaceholder('如：Hong Kong').fill('San Francisco')
    await manualDialog.getByRole('button', { name: '添加岗位' }).click()

    await expect
      .poll(() => {
        const record = readSnapshot().find((item) => item.company === 'OpenAI' && item.title === manualTitle)
        return record?.sourceType ?? ''
      })
      .toBe('manual')

    await page.reload()
    await page.getByText('列表视图').click()
    await page.getByPlaceholder('搜索岗位名称...').fill(manualTitle)

    await expect(page.getByText(manualTitle)).toBeVisible()
  })

  test('coaching application persists pending coaching state to MySQL @student-s004-real-coaching', async ({ page }) => {
    await authenticateStudentSession(page)
    await gotoPositionsPage(page)

    const coachingRow = await ensurePositionRowVisible(page, 'JP Morgan', 'S&T Analyst')
    await coachingRow.getByRole('button', { name: /申请辅导/ }).click()

    const coachingDialog = page.getByRole('dialog', { name: /申请面试辅导/ })
    await expect(coachingDialog).toBeVisible()

    const comboboxes = coachingDialog.getByRole('combobox')
    await comboboxes.nth(0).click()
    await page.locator('.ant-select-dropdown:visible').getByText('First Round', { exact: true }).click()
    await comboboxes.nth(1).click()
    await page.locator('.ant-select-dropdown:visible').getByText('2 位导师', { exact: true }).click()
    await coachingDialog.getByPlaceholder('如有特殊辅导需求，请在这里补充').fill('真实辅导申请联调')
    await coachingDialog.getByRole('button', { name: '提交申请' }).click()

    await expect
      .poll(() => {
        const record = findSnapshot('JP Morgan', 'S&T Analyst')
        return JSON.stringify({
          coachingStatus: record.coachingStatus,
          coachingStage: record.coachingStage,
          coachingMentorCount: record.coachingMentorCount,
          coachingNote: record.coachingNote,
        })
      })
      .toBe(
        JSON.stringify({
          coachingStatus: 'pending',
          coachingStage: 'first',
          coachingMentorCount: '2',
          coachingNote: '真实辅导申请联调',
        })
      )
  })

  test('favorite creation, apply cancellation, and keyword filtering stay aligned with real data @student-s004-real-filtering', async ({ page }) => {
    await authenticateStudentSession(page)
    await gotoPositionsPage(page)

    const goldmanRow = await ensurePositionRowVisible(page, 'Goldman Sachs', 'IB Analyst')
    await goldmanRow.locator('button').nth(1).click()

    await expect
      .poll(() => findSnapshot('Goldman Sachs', 'IB Analyst').favorited)
      .toBe(true)

    await page.getByRole('tab', { name: /我的收藏/ }).click()
    const favoriteGoldmanRow = page.locator('tr').filter({ hasText: 'Goldman Sachs' }).first()
    await expect(favoriteGoldmanRow).toContainText('IB Analyst')
    await favoriteGoldmanRow.getByRole('button', { name: /已投递/ }).click()

    await expect
      .poll(() => findSnapshot('Goldman Sachs', 'IB Analyst').applied)
      .toBe(false)

    await page.getByRole('tab', { name: /全部岗位/ }).click()
    await page.getByText('列表视图').click()
    await page.getByPlaceholder('搜索岗位名称...').fill('Business Analyst')

    await expect
      .poll(async () => {
        return await page.locator('tbody tr').evaluateAll((rows) =>
          rows.filter((row) => row.textContent?.includes('Business Analyst') && row.checkVisibility()).length
        )
      })
      .toBe(1)

    await expect
      .poll(async () => {
        return await page.locator('tbody tr').evaluateAll((rows) =>
          rows.filter((row) => row.textContent?.includes('S&T Analyst') && row.checkVisibility()).length
        )
      })
      .toBe(0)
  })
})
