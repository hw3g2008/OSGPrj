import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const FIXTURE_SOURCE = path.resolve(__dirname, './support/java/StudentProfileFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, './support/java/.compiled-profile')
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'

type ProfileSnapshot = {
  profile: {
    studentCode: string
    fullName: string
    school: string
    recruitmentCycle: string
    phone: string
    wechatId: string
  }
  pendingChanges: Array<{
    fieldKey: string
    fieldLabel: string
    oldValue: string
    newValue: string
    status: string
  }>
}

type AjaxResult<T> = {
  code: number
  msg?: string
  data: T
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
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
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
      throw new Error(`missing required env for profile real integration: ${key}`)
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
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentProfileFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8'
  }).trim()
}

function resetProfileScenario() {
  runFixture('reset')
}

function readSnapshot(): ProfileSnapshot {
  return JSON.parse(runFixture('snapshot')) as ProfileSnapshot
}

async function loginAsStudent(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/login')
  await page.locator('#login-username').fill(STUDENT_USERNAME)
  await page.locator('#login-password').fill(STUDENT_PASSWORD)
  const loginResponsePromise = page.waitForResponse('**/api/student/login')
  await page.locator('#login-btn').click()
  const loginResponse = await loginResponsePromise
  const body = await loginResponse.json()

  expect(loginResponse.ok()).toBeTruthy()
  expect(body.code).toBe(200)
  await expect(page).toHaveURL(/\/dashboard$/)
}

test.describe('student profile real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
    resetProfileScenario()
  })

  test('loads real profile data and persists live + pending edits to MySQL @student-s012-real-state', async ({
    page,
  }) => {
    await loginAsStudent(page)

    const profileResponsePromise = page.waitForResponse('**/api/student/profile')
    await page.goto('/profile')
    const profileResponse = await profileResponsePromise
    const profileBody = (await profileResponse.json()) as AjaxResult<unknown>

    expect(profileResponse.ok()).toBeTruthy()
    expect(profileBody.code).toBe(200)
    await expect(page.getByRole('heading', { name: /基本信息\s*My Profile/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emily Zhang' })).toBeVisible()
    await expect(page.getByText('Student ID: 12766')).toBeVisible()
    await expect(page.getByText('emily@example.com')).toBeVisible()

    await page.getByRole('button', { name: '编辑信息' }).click()
    const editDialog = page.getByRole('dialog', { name: /编辑基本信息/ })
    await expect(editDialog).toBeVisible()

    await editDialog.locator('#profile-school').fill('Columbia University')
    await editDialog.locator('#profile-recruitment-cycle').fill('2025 Full-time')
    await editDialog.locator('#profile-phone').fill('+1 987-654-3210')
    await editDialog.locator('#profile-wechat').fill('emily_real_profile')

    const saveResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/student/profile') && response.request().method() === 'PUT'
    )
    await editDialog.getByRole('button', { name: '保存修改' }).click()
    const saveResponse = await saveResponsePromise
    const saveBody = (await saveResponse.json()) as AjaxResult<unknown>

    expect(saveResponse.ok()).toBeTruthy()
    expect(saveBody.code).toBe(200)
    await expect(editDialog).not.toBeVisible()
    await expect(page.getByText('+1 987-654-3210')).toBeVisible()
    await expect(page.getByText('emily_real_profile')).toBeVisible()
    await expect(page.getByText('您有 2 项信息变更正在审核中')).toBeVisible()

    await page.getByRole('button', { name: '查看详情' }).click()
    const pendingDialog = page.getByRole('dialog', { name: /待审核的信息变更/ })
    await expect(pendingDialog).toBeVisible()
    await expect(pendingDialog.getByText('学校：NYU → Columbia University')).toBeVisible()
    await expect(pendingDialog.getByText('招聘周期：2025 Summer → 2025 Full-time')).toBeVisible()

    await expect
      .poll(() => readSnapshot())
      .toMatchObject({
        profile: {
          studentCode: '12766',
          fullName: 'Emily Zhang',
          school: 'NYU',
          recruitmentCycle: '2025 Summer',
          phone: '+1 987-654-3210',
          wechatId: 'emily_real_profile'
        },
        pendingChanges: [
          {
            fieldKey: 'school',
            fieldLabel: '学校',
            oldValue: 'NYU',
            newValue: 'Columbia University',
            status: 'pending'
          },
          {
            fieldKey: 'recruitmentCycle',
            fieldLabel: '招聘周期',
            oldValue: '2025 Summer',
            newValue: '2025 Full-time',
            status: 'pending'
          }
        ]
      })
  })

  test('canceling edit and closing pending-change dialog preserves the persisted profile state @student-s012-real-cancel', async ({
    page
  }) => {
    await loginAsStudent(page)

    const profileResponsePromise = page.waitForResponse('**/api/student/profile')
    await page.goto('/profile')
    const profileResponse = await profileResponsePromise

    expect(profileResponse.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /基本信息\s*My Profile/ })).toBeVisible()

    const beforeSnapshot = readSnapshot()
    expect(beforeSnapshot.pendingChanges).toHaveLength(2)

    await page.getByRole('button', { name: '编辑信息' }).click()
    const editDialog = page.getByRole('dialog', { name: /编辑基本信息/ })
    await expect(editDialog).toBeVisible()

    await editDialog.locator('#profile-school').fill('Princeton University')
    await editDialog.locator('#profile-phone').fill('+1 555-000-9999')
    await editDialog.locator('#profile-wechat').fill('cancel_should_not_persist')
    await editDialog.getByRole('button', { name: /取\s*消/ }).click()

    await expect(editDialog).not.toBeVisible()
    await expect(page.getByText(beforeSnapshot.profile.school, { exact: true })).toBeVisible()
    await expect(page.getByText(beforeSnapshot.profile.phone, { exact: true })).toBeVisible()
    await expect(page.getByText(beforeSnapshot.profile.wechatId, { exact: true })).toBeVisible()

    await expect.poll(() => readSnapshot()).toEqual(beforeSnapshot)

    await page.getByRole('button', { name: '查看详情' }).click()
    const pendingDialog = page.getByRole('dialog', { name: /待审核的信息变更/ })
    await expect(pendingDialog).toBeVisible()
    await expect(pendingDialog.getByText('学校：NYU → Columbia University')).toBeVisible()
    await expect(pendingDialog.getByText('招聘周期：2025 Summer → 2025 Full-time')).toBeVisible()
    await pendingDialog.getByRole('button', { name: /关\s*闭/ }).click()
    await expect(pendingDialog).not.toBeVisible()
  })
})
