import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const REAL_API_WAIT_MS = 8000
const FIXTURE_SOURCE = path.resolve(__dirname, './support/java/StudentPositionFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, './support/java/.compiled')
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'

type AjaxResult<T> = {
  code: number
  msg?: string
  data: T
}

type MockPracticeSnapshot = {
  requestGroup: 'practice' | 'course'
  requestType: string
  courseType: string
  company: string
  jobStatus: string
  requestStatus: string
  requestContent: string
  requestReason: string
  mentorCount: string
  preferredMentor: string
  excludedMentor: string
  mentorName: string
  mentorMeta: string
  hoursFeedback: string
  feedbackSummary: string
  feedbackHint: string
  remark: string
  submittedAt: string
  completedAt: string
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

function runFixture(command: 'reset-mock-practice' | 'snapshot-mock-practice'): string {
  hydrateDbEnvFromRuntimeFile()
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentPositionFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8'
  }).trim()
}

function resetMockPracticeScenario() {
  runFixture('reset-mock-practice')
}

function readSnapshot(): MockPracticeSnapshot[] {
  return JSON.parse(runFixture('snapshot-mock-practice')) as MockPracticeSnapshot[]
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

test.describe('student mock practice real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
    resetMockPracticeScenario()
  })

  test('loads overview from real API and persists practice plus class requests to MySQL @student-s006-real-state', async ({ page }) => {
    await authenticateStudentSession(page)

    const metaResponsePromise = page.waitForResponse('**/student/mock-practice/meta', { timeout: REAL_API_WAIT_MS })
    const overviewResponsePromise = page.waitForResponse('**/student/mock-practice/overview', { timeout: REAL_API_WAIT_MS })
    await page.goto('/mock-practice')
    const metaResponse = await metaResponsePromise
    const overviewResponse = await overviewResponsePromise
    const metaBody = (await metaResponse.json()) as AjaxResult<{
      pageSummary: { titleZh: string; titleEn: string; subtitle: string }
      practiceCards: Array<{ id: string; title: string; cta: string }>
      requestTabs: Array<{ key: string; label: string; count: number }>
      requestFilters: { typeOptions: Array<{ value: string; label: string }>; statusOptions: Array<{ value: string; label: string }> }
      requestCourseOptions: Array<{ value: string; label: string }>
    }>
    const overviewBody = (await overviewResponse.json()) as AjaxResult<{
      practiceRecords: Array<{ type: string; content: string; mentor: string }>
      requestRecords: Array<{ type: string; company: string; status: string }>
    }>

    await expect(page.getByRole('heading', { name: /应聘演练/ })).toBeVisible()
    expect(metaResponse.ok()).toBeTruthy()
    expect(metaBody.code).toBe(200)
    expect(metaBody.data.pageSummary).toMatchObject({
      titleZh: '应聘演练',
      titleEn: 'Mock Practice',
      subtitle: '申请模拟面试、人际关系测试或期中考试'
    })
    expect(metaBody.data.practiceCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'mock', title: '模拟面试', cta: '申请模拟面试' }),
        expect.objectContaining({ id: 'networking', title: '人际关系测试', cta: '申请测试' }),
        expect.objectContaining({ id: 'midterm', title: '期中考试', cta: '申请考试' })
      ])
    )
    expect(metaBody.data.requestTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'all', label: '全部' }),
        expect.objectContaining({ key: 'processing', label: '处理中' }),
        expect.objectContaining({ key: 'completed', label: '已完成' })
      ])
    )
    expect(metaBody.data.requestCourseOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'interview', label: '我有一个入职面试' }),
        expect.objectContaining({ value: 'network', label: '人际关系期中考试' })
      ])
    )
    expect(overviewResponse.ok()).toBeTruthy()
    expect(overviewBody.code).toBe(200)
    expect(
      overviewBody.data.practiceRecords.some((record) => record.type === '模拟面试' && record.content === 'Case Study Round')
    ).toBeTruthy()
    expect(
      overviewBody.data.requestRecords.some((record) => record.type === 'Staffing' && record.company === 'Goldman Sachs')
    ).toBeTruthy()
    await expect(page.getByText('全部 2')).toBeVisible()
    await expect(page.getByText('处理中 1')).toBeVisible()
    await expect(page.getByText('已完成 1')).toBeVisible()

    await page.getByRole('button', { name: '申请模拟面试' }).click()
    const practiceDialog = page.getByRole('dialog', { name: /申请模拟面试/ })
    await practiceDialog.getByPlaceholder(/请描述您申请模拟面试的原因/).fill('真实联调模拟面试申请')

    const practiceCreateResponsePromise = page.waitForResponse('**/student/mock-practice/practice-request', {
      timeout: REAL_API_WAIT_MS
    })
    await practiceDialog.getByRole('button', { name: /提交申请/ }).click()
    const practiceCreateResponse = await practiceCreateResponsePromise

    expect(practiceCreateResponse.ok()).toBeTruthy()
    await expect
      .poll(() =>
        readSnapshot().some(
          (record) =>
            record.requestGroup === 'practice' &&
            record.requestType === '模拟面试' &&
            record.requestReason === '真实联调模拟面试申请' &&
            record.mentorCount === '2位导师'
        )
      )
      .toBe(true)

    await page.getByRole('button', { name: '新建申请' }).click()
    const classDialog = page.getByRole('dialog', { name: /新建课程申请/ })
    await classDialog.getByRole('button', { name: '我有一个笔试，需要帮我做题' }).click()
    const visibleComboboxes = classDialog.getByRole('combobox')
    await visibleComboboxes.nth(0).click()
    await visibleComboboxes.nth(0).press('ArrowDown')
    await visibleComboboxes.nth(0).press('Enter')
    await visibleComboboxes.nth(1).click()
    await visibleComboboxes.nth(1).press('ArrowDown')
    await visibleComboboxes.nth(1).press('Enter')
    await classDialog.getByPlaceholder('如有其他需求请在此说明').fill('真实 OT 辅导联调')

    const classCreateResponsePromise = page.waitForResponse('**/student/mock-practice/class-request', {
      timeout: REAL_API_WAIT_MS
    })
    await classDialog.getByRole('button', { name: /提交申请/ }).click()
    const classCreateResponse = await classCreateResponsePromise

    expect(classCreateResponse.ok()).toBeTruthy()
    await expect
      .poll(() =>
        readSnapshot().some(
          (record) =>
            record.requestGroup === 'course' &&
            record.requestType === 'OT' &&
            record.courseType === 'test' &&
            record.company === 'JP Morgan' &&
            record.jobStatus === '面试中' &&
            record.remark === '真实 OT 辅导联调'
        )
      )
      .toBe(true)
  })

  test('persists midterm and networking class-request variants to MySQL @student-s006-real-variants', async ({ page }) => {
    await authenticateStudentSession(page)

    const overviewResponsePromise = page.waitForResponse('**/student/mock-practice/overview', { timeout: REAL_API_WAIT_MS })
    await page.goto('/mock-practice')
    const overviewResponse = await overviewResponsePromise

    expect(overviewResponse.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /应聘演练/ })).toBeVisible()

    await page.getByRole('button', { name: '新建申请' }).click()
    const classDialog = page.getByRole('dialog', { name: /新建课程申请/ })

    await classDialog.getByRole('button', { name: '模拟期中考试' }).click()
    const midtermComboboxes = classDialog.getByRole('combobox')
    await midtermComboboxes.nth(0).click()
    await midtermComboboxes.nth(0).press('ArrowDown')
    await midtermComboboxes.nth(0).press('Enter')
    await midtermComboboxes.nth(1).click()
    await midtermComboboxes.nth(1).press('ArrowDown')
    await midtermComboboxes.nth(1).press('ArrowDown')
    await midtermComboboxes.nth(1).press('Enter')
    await classDialog.getByPlaceholder('如有其他需求请在此说明').fill('真实联调模拟期中考试申请')

    const midtermResponsePromise = page.waitForResponse('**/student/mock-practice/class-request', {
      timeout: REAL_API_WAIT_MS
    })
    await classDialog.getByRole('button', { name: /提交申请/ }).click()
    const midtermResponse = await midtermResponsePromise
    const midtermRequestBody = midtermResponse.request().postDataJSON()

    expect(midtermResponse.ok()).toBeTruthy()
    expect(midtermRequestBody).toMatchObject({
      courseType: 'midterm',
      company: expect.any(String),
      status: expect.any(String),
      remark: '真实联调模拟期中考试申请'
    })
    await expect
      .poll(() =>
        readSnapshot().some(
          (record) =>
            record.requestGroup === 'course' &&
            record.requestType === 'Hirevue' &&
            record.courseType === 'midterm' &&
            record.company === midtermRequestBody.company &&
            record.jobStatus === midtermRequestBody.status &&
            record.requestContent === '模拟期中考试' &&
            record.remark === '真实联调模拟期中考试申请'
        )
      )
      .toBe(true)

    await page.getByRole('button', { name: '新建申请' }).click()
    const networkingDialog = page.getByRole('dialog', { name: /新建课程申请/ })

    await networkingDialog.getByRole('button', { name: '人际关系期中考试' }).click()
    const networkingComboboxes = networkingDialog.getByRole('combobox')
    await networkingComboboxes.nth(0).click()
    await networkingComboboxes.nth(0).press('ArrowDown')
    await networkingComboboxes.nth(0).press('ArrowDown')
    await networkingComboboxes.nth(0).press('ArrowDown')
    await networkingComboboxes.nth(0).press('Enter')
    await networkingComboboxes.nth(1).click()
    await networkingComboboxes.nth(1).press('ArrowDown')
    await networkingComboboxes.nth(1).press('Enter')
    await networkingDialog.getByPlaceholder('如有其他需求请在此说明').fill('真实联调人际关系期中考试申请')

    const networkingResponsePromise = page.waitForResponse('**/student/mock-practice/class-request', {
      timeout: REAL_API_WAIT_MS
    })
    await networkingDialog.getByRole('button', { name: /提交申请/ }).click()
    const networkingResponse = await networkingResponsePromise
    const networkingRequestBody = networkingResponse.request().postDataJSON()

    expect(networkingResponse.ok()).toBeTruthy()
    expect(networkingRequestBody).toMatchObject({
      courseType: 'network',
      company: expect.any(String),
      status: expect.any(String),
      remark: '真实联调人际关系期中考试申请'
    })
    await expect
      .poll(() =>
        readSnapshot().some(
          (record) =>
            record.requestGroup === 'course' &&
            record.requestType === 'Hirevue' &&
            record.courseType === 'network' &&
            record.company === networkingRequestBody.company &&
            record.jobStatus === networkingRequestBody.status &&
            record.requestContent === '人际关系期中考试' &&
            record.remark === '真实联调人际关系期中考试申请'
        )
      )
      .toBe(true)
  })
})
