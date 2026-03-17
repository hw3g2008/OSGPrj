import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const FIXTURE_SOURCE = path.resolve(__dirname, './support/java/StudentCourseFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(__dirname, './support/java/.compiled-course')
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'

type AjaxResult<T> = {
  code: number
  msg?: string
  data: T
}

type CourseSnapshot = {
  recordId: string
  coachingType: string
  coachingDetail: string
  courseContent: string
  mentor: string
  mentorRole: string
  classDate: string
  duration: string
  isNew: boolean
  ratingScore: string
  ratingTags: string
  ratingFeedback: string
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

    process.env[key] = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
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
  hydrateDbEnvFromRuntimeFile()
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentCourseFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8'
  }).trim()
}

function resetCourseScenario() {
  runFixture('reset')
}

function readSnapshot(): CourseSnapshot[] {
  return JSON.parse(runFixture('snapshot')) as CourseSnapshot[]
}

function waitForStudentApiResponse(
  page: Parameters<typeof test>[0]['page'],
  pathFragment: string
) {
  return page.waitForResponse(
    (response) =>
      response.url().includes(pathFragment) ||
      response.url().includes(`/api${pathFragment}`),
    { timeout: 3000 }
  )
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

test.describe('student class records real integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(() => {
    reseedStudentDemoUser()
    resetCourseScenario()
  })

  test('loads real class records and persists a student rating to MySQL @student-s007-real-state', async ({ page }) => {
    await authenticateStudentSession(page)

    const metaResponsePromise = waitForStudentApiResponse(page, '/student/class-records/meta')
    const listResponsePromise = waitForStudentApiResponse(page, '/student/class-records/list')
    await page.goto('/courses')
    const metaResponse = await metaResponsePromise
    const listResponse = await listResponsePromise
    const metaBody = (await metaResponse.json()) as AjaxResult<{
      pageSummary: { titleZh: string; titleEn: string; subtitle: string }
      reminderBanner: { title: string; ctaLabel: string }
      tabDefinitions: Array<{ key: string; label: string; count: number }>
      filters: {
        keywordPlaceholder: string
        coachingTypeOptions: Array<{ value: string; label: string }>
        courseContentOptions: Array<{ value: string; label: string }>
        timeRangeOptions: Array<{ value: string; label: string }>
      }
      ratingDialog: { title: string; tagPlaceholder: string; submitLabel: string }
    }>
    const listBody = (await listResponse.json()) as AjaxResult<{
      records: Array<{ recordId: string; courseContent: string; actionKind: string }>
    }>

    await expect(page.getByRole('heading', { name: /课程记录/ })).toBeVisible()
    expect(metaResponse.ok()).toBeTruthy()
    expect(metaBody.code).toBe(200)
    expect(metaBody.data.pageSummary).toMatchObject({
      titleZh: '课程记录',
      titleEn: 'Class Records',
      subtitle: '查看我的上课记录和导师反馈'
    })
    expect(metaBody.data.reminderBanner).toMatchObject({
      title: '新增课程记录',
      ctaLabel: '去评价'
    })
    expect(metaBody.data.tabDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'all', label: '全部', count: 6 }),
        expect.objectContaining({ key: 'pending', label: '待评价', count: 2 }),
        expect.objectContaining({ key: 'evaluated', label: '已评价', count: 4 })
      ])
    )
    expect(metaBody.data.filters.coachingTypeOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '岗位辅导', label: '岗位辅导' }),
        expect.objectContaining({ value: '模拟应聘', label: '模拟应聘' })
      ])
    )
    expect(metaBody.data.ratingDialog).toMatchObject({
      title: '课程评价',
      submitLabel: '提交评价'
    })
    expect(listResponse.ok()).toBeTruthy()
    expect(listBody.code).toBe(200)
    expect(listBody.data.records).toHaveLength(6)
    expect(listBody.data.records.some((record) => record.recordId === '#R231785' && record.actionKind === 'rate')).toBeTruthy()

    await page.getByRole('button', { name: '去评价' }).click()
    await expect(page.getByText('#R231785')).toBeVisible()
    await page.locator('tbody .action-button--primary').first().click()

    const rateDialog = page.getByRole('dialog', { name: /课程评价/ })
    await rateDialog.getByPlaceholder(/请详细描述您的上课体验/).fill('真实课程评价联调')

    const rateResponsePromise = waitForStudentApiResponse(page, '/student/class-records/rate')
    await rateDialog.getByRole('button', { name: /提交评价/ }).click()
    const rateResponse = await rateResponsePromise

    expect(rateResponse.ok()).toBeTruthy()
    await expect
      .poll(() =>
        readSnapshot().some(
          (record) =>
            record.recordId === '#R231785' &&
            record.ratingScore === '5.0' &&
            record.ratingFeedback === '真实课程评价联调'
        )
      )
      .toBe(true)

    await page.getByRole('tab', { name: '全部' }).click()
    await page.locator('tr', { hasText: '#R231778' }).getByRole('button', { name: '查看详情', exact: true }).click()
    await expect(page.getByRole('dialog', { name: /人际关系期中考试详情/ })).toBeVisible()
  })

  test('detail-to-rate cancel flow preserves the existing evaluated record state @student-s007-real-detail-cancel', async ({
    page
  }) => {
    await authenticateStudentSession(page)

    const metaResponsePromise = waitForStudentApiResponse(page, '/student/class-records/meta')
    const listResponsePromise = waitForStudentApiResponse(page, '/student/class-records/list')
    await page.goto('/courses')
    const metaResponse = await metaResponsePromise
    const listResponse = await listResponsePromise

    expect(metaResponse.ok()).toBeTruthy()
    expect(listResponse.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /课程记录/ })).toBeVisible()

    const beforeSnapshot = readSnapshot().find((record) => record.recordId === '#R231778')
    expect(beforeSnapshot).toMatchObject({
      recordId: '#R231778',
      ratingScore: '4.5',
      ratingTags: '反馈及时,准时守约',
      ratingFeedback: '软技能点评到位'
    })

    await page.getByRole('tab', { name: '全部' }).click()
    await page.locator('tr', { hasText: '#R231778' }).getByRole('button', { name: '查看详情', exact: true }).click()

    const detailDialog = page.getByRole('dialog', { name: /人际关系期中考试详情/ })
    await expect(detailDialog).toBeVisible()
    await expect(detailDialog.locator('strong').filter({ hasText: 'Mike Chen' })).toBeVisible()
    await detailDialog.getByRole('button', { name: '修改评价' }).click()

    const rateDialog = page.getByRole('dialog', { name: '课程评价' })
    await expect(rateDialog).toBeVisible()
    await expect(rateDialog.locator('textarea')).toHaveValue('软技能点评到位')
    await rateDialog.getByRole('button', { name: /取\s*消/ }).click()

    await expect(rateDialog).not.toBeVisible()
    await expect(detailDialog).not.toBeVisible()

    await expect
      .poll(() => readSnapshot().find((record) => record.recordId === '#R231778'))
      .toMatchObject({
        recordId: '#R231778',
        ratingScore: '4.5',
        ratingTags: '反馈及时,准时守约',
        ratingFeedback: '软技能点评到位'
      })

    await page.locator('tr', { hasText: '#R231778' }).getByRole('button', { name: '查看详情', exact: true }).click()
    const reopenedDetail = page.getByRole('dialog', { name: /人际关系期中考试详情/ })
    await expect(reopenedDetail).toBeVisible()
    await reopenedDetail.getByRole('button', { name: /关\s*闭/ }).click()
    await expect(reopenedDetail).not.toBeVisible()
  })
})
