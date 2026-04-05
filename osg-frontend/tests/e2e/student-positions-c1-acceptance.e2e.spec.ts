import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test, type Page } from '@playwright/test'

import { loginAsAdmin, waitForApi, assertRuoyiSuccess } from './support/auth'
import { reseedStudentDemoUser } from '../../packages/student/e2e/support/student-demo-user'

const moduleName = process.env.E2E_MODULE || ''
const STUDENT_USERNAME = process.env.E2E_STUDENT_USERNAME || 'student_demo'
const FIXTURE_SOURCE = path.resolve(__dirname, '../../packages/student/e2e/support/java/StudentPositionFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, '../../packages/student/e2e/support/java/.compiled')
const REAL_E2E_TIMEOUT_MS = 120000

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

function resolveVersionedJar(groupPath: string, artifactName: string, versions: string[]): string {
  const candidates = versions.map((version) =>
    path.join(
      os.homedir(),
      '.m2',
      'repository',
      ...groupPath.split('/'),
      artifactName,
      version,
      `${artifactName}-${version}.jar`,
    ),
  )
  const existing = candidates.find((candidate) => fs.existsSync(candidate))
  if (!existing) {
    throw new Error(`missing required jar for student position fixture: ${candidates.join(', ')}`)
  }
  return existing
}

function fixtureClasspath(): string {
  return [
    FIXTURE_BUILD_DIR,
    resolveVersionedJar('com/mysql', 'mysql-connector-j', ['8.4.0', '8.3.0', '8.2.0']),
  ].join(path.delimiter)
}

function ensureDbEnv() {
  const requiredKeys = [
    'SPRING_DATASOURCE_DRUID_MASTER_URL',
    'SPRING_DATASOURCE_DRUID_MASTER_USERNAME',
    'SPRING_DATASOURCE_DRUID_MASTER_PASSWORD',
  ] as const

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      throw new Error(`missing required env for student positions acceptance: ${key}`)
    }
  }
}

function compileFixture() {
  fs.mkdirSync(FIXTURE_BUILD_DIR, { recursive: true })
  execFileSync('javac', ['-d', FIXTURE_BUILD_DIR, FIXTURE_SOURCE], {
    stdio: 'pipe',
    env: process.env,
  })
}

function runFixture(command: 'reset' | 'reset-applications' | 'snapshot'): string {
  ensureDbEnv()
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentPositionFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8',
  }).trim()
}

function resetPositionScenario() {
  runFixture('reset')
}

function resetApplicationsScenario() {
  runFixture('reset-applications')
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

async function gotoPositionsPage(page: Page) {
  const listResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/position/list'), '/api/student/position/list')
  const metaResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/position/meta'), '/api/student/position/meta')
  await page.goto('/positions', { waitUntil: 'domcontentloaded' })
  await Promise.all([listResponsePromise, metaResponsePromise])
  await expect(page.locator('#page-positions')).toBeVisible()
}

async function gotoApplicationsPage(page: Page) {
  const listResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/application/list'), '/api/student/application/list')
  const metaResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/application/meta'), '/api/student/application/meta')
  await page.goto('/applications', { waitUntil: 'domcontentloaded' })
  await Promise.all([listResponsePromise, metaResponsePromise])
  await expect(page.locator('#page-job-tracking')).toBeVisible()
}

async function reloadPositionsPage(page: Page) {
  const listResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/position/list'), '/api/student/position/list')
  const metaResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/position/meta'), '/api/student/position/meta')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await Promise.all([listResponsePromise, metaResponsePromise])
  await expect(page.locator('#page-positions')).toBeVisible()
}

async function reloadApplicationsPage(page: Page) {
  const listResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/application/list'), '/api/student/application/list')
  const metaResponsePromise = assertRuoyiSuccess(waitForApi(page, '/api/student/application/meta'), '/api/student/application/meta')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await Promise.all([listResponsePromise, metaResponsePromise])
  await expect(page.locator('#page-job-tracking')).toBeVisible()
}

async function switchToListView(page: Page) {
  const listViewToggle = page.getByText('列表视图')
  if (await listViewToggle.count()) {
    await listViewToggle.click()
  }
}

async function searchPositions(page: Page, keyword: string) {
  await switchToListView(page)
  await page.getByPlaceholder('搜索岗位名称...').fill(keyword)
}

async function searchApplications(page: Page, keyword: string) {
  await page.getByPlaceholder('搜索公司/岗位...').fill(keyword)
}

async function ensurePositionRowVisible(page: Page, companyName: string, positionTitle: string) {
  const row = page.locator('tr').filter({ hasText: positionTitle }).first()
  if ((await row.count()) > 0) {
    return row
  }

  await page.locator('.company-header').filter({ hasText: companyName }).first().click()
  await expect(row).toBeVisible()
  return row
}

async function expectSelectedStage(row: ReturnType<Page['locator']>, stageValue: string, stageLabel: string) {
  const stageSelect = row.locator('select').first()
  await expect(stageSelect).toHaveValue(stageValue)
  await expect(stageSelect.locator('option:checked')).toHaveText(stageLabel)
}

test.describe('Student Positions C1 Acceptance @student @api', () => {
  test.skip(moduleName !== 'student', 'student positions acceptance spec only runs for student module gate')
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
  })

  test('manual pending positions stay review-only and never appear in applications @student-c1-pilot-004-review-only', async ({
    page,
  }) => {
    test.setTimeout(REAL_E2E_TIMEOUT_MS)
    resetPositionScenario()
    const manualTitle = `Pending Analyst ${Date.now()}`
    const manualCompany = 'Student Added Co'

    await loginAsAdmin(page)
    await gotoPositionsPage(page)

    await page.getByRole('button', { name: '手动添加' }).click()
    const manualDialog = page.getByRole('dialog', { name: /手动添加岗位/ })
    await manualDialog.locator('.ant-select-selector').click()
    await page.locator('.ant-select-dropdown:visible').getByText('暑期实习', { exact: true }).click()
    await manualDialog.getByPlaceholder('如：IB Analyst').fill(manualTitle)
    await manualDialog.getByPlaceholder('如：Goldman Sachs').fill(manualCompany)
    await manualDialog.getByPlaceholder('如：Hong Kong').fill('Shanghai')
    await manualDialog.getByRole('button', { name: '添加岗位' }).click()

    await expect
      .poll(() => {
        const record = readSnapshot().find((item) => item.company === manualCompany && item.title === manualTitle)
        return record?.sourceType ?? ''
      })
      .toBe('manual')

    await searchPositions(page, manualTitle)
    const manualRow = page.locator('tr').filter({ hasText: manualTitle }).first()
    await expect(manualRow).toBeVisible()
    await expect(manualRow.getByRole('button', { name: '待审核' })).toBeDisabled()
    await expect(manualRow).not.toContainText('申请辅导')
    await expect(manualRow).not.toContainText('投递')

    await gotoApplicationsPage(page)
    await searchApplications(page, manualTitle)
    await expect(page.locator('tbody')).not.toContainText(manualTitle)
    await expect(page.locator('tbody')).not.toContainText(manualCompany)
  })

  test('formal coaching state stays consistent across positions and applications after reload @student-c1-pilot-004-refresh', async ({
    page,
  }) => {
    test.setTimeout(REAL_E2E_TIMEOUT_MS)
    resetApplicationsScenario()

    await expect
      .poll(() => {
        const record = findSnapshot('McKinsey', 'Business Analyst')
        return JSON.stringify({
          applied: record.applied,
          progressStage: record.progressStage,
          coachingStatus: record.coachingStatus,
        })
      })
      .toBe(
        JSON.stringify({
          applied: true,
          progressStage: 'case',
          coachingStatus: 'pending',
        }),
      )

    await loginAsAdmin(page)
    await gotoPositionsPage(page)
    await searchPositions(page, 'Business Analyst')

    const seededPositionRow = await ensurePositionRowVisible(page, 'McKinsey', 'Business Analyst')
    await expect(seededPositionRow).toContainText('McKinsey')
    await expect(seededPositionRow.getByRole('button', { name: /已投递/ })).toBeVisible()
    await expectSelectedStage(seededPositionRow, 'case', 'Case Study')
    await expect(seededPositionRow).not.toContainText('申请辅导')

    await reloadPositionsPage(page)
    await searchPositions(page, 'Business Analyst')
    const refreshedPositionRow = await ensurePositionRowVisible(page, 'McKinsey', 'Business Analyst')
    await expect(refreshedPositionRow.getByRole('button', { name: /已投递/ })).toBeVisible()
    await expectSelectedStage(refreshedPositionRow, 'case', 'Case Study')
    await expect(refreshedPositionRow).not.toContainText('申请辅导')

    await gotoApplicationsPage(page)
    await searchApplications(page, 'Business Analyst')
    const applicationRow = page.locator('tr').filter({ hasText: 'Business Analyst' }).first()
    await expect(applicationRow).toBeVisible()
    await expect(applicationRow).toContainText('McKinsey')
    await expectSelectedStage(applicationRow, 'case', 'Case Study')
    await expect(applicationRow).toContainText('待审批')

    await reloadApplicationsPage(page)
    await searchApplications(page, 'Business Analyst')
    const refreshedApplicationRow = page.locator('tr').filter({ hasText: 'Business Analyst' }).first()
    await expect(refreshedApplicationRow).toBeVisible()
    await expect(refreshedApplicationRow).toContainText('McKinsey')
    await expectSelectedStage(refreshedApplicationRow, 'case', 'Case Study')
    await expect(refreshedApplicationRow).toContainText('待审批')
  })
})
