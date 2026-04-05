import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { reseedAssistantCarrier } from './support/assistant-carrier-seed.mjs'

const ASSISTANT_USERNAME = 'assistant_e_chain'
const ASSISTANT_PASSWORD = 'assistant12766'
const OWNED_STUDENT_ID = 12766
const OWNED_STUDENT_NAME = '张三'
const OWNED_COMPANY_NAME = 'Assistant Carrier Capital'
const OWNED_PRACTICE_CONTENT = 'Assistant carrier ownership rehearsal'

const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_ENV_FILE = path.resolve(process.cwd(), 'deploy/.env.dev')
const EVIDENCE_DIR = path.resolve(process.cwd(), 'artifacts/five-end-course-flow')
const JOB_SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'e-assistant-job-overview-headful.png')
const MOCK_SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'e-assistant-mock-practice-headful.png')
const BACKEND_BASE_URL = 'http://127.0.0.1:28080'
const ASSISTANT_FRONTEND_BASE_URL = 'http://127.0.0.1:3004'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const source = fs.readFileSync(filePath, 'utf-8')
  for (const line of source.split(/\r?\n/)) {
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

function assertContains(haystack, values, label) {
  for (const value of values) {
    if (!haystack.includes(value)) {
      throw new Error(`${label} missing required token: ${value}`)
    }
  }
}

function assertNotContains(haystack, values, label) {
  for (const value of values) {
    if (haystack.includes(value)) {
      throw new Error(`${label} leaked forbidden token: ${value}`)
    }
  }
}

function assertOwnedStudentIds(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${label} is empty`)
  }

  const leakedIds = rows
    .map((row) => row?.studentId)
    .filter((studentId) => Number(studentId) !== OWNED_STUDENT_ID)

  if (leakedIds.length > 0) {
    throw new Error(`${label} leaked foreign student ids: ${leakedIds.join(', ')}`)
  }
}

async function loginAssistant() {
  const response = await fetch(`${BACKEND_BASE_URL}/assistant/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: ASSISTANT_USERNAME,
      password: ASSISTANT_PASSWORD,
    }),
  })
  const body = await response.json()

  if (!response.ok || body.code !== 200 || !body.token) {
    throw new Error(`assistant login failed: ${JSON.stringify(body)}`)
  }

  return body.token
}

async function fetchBackendJson(pathname, token) {
  const response = await fetch(`${BACKEND_BASE_URL}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`backend request failed for ${pathname}: ${response.status}`)
  }

  return response.json()
}

async function putBackendJson(pathname, token, body = {}) {
  const response = await fetch(`${BACKEND_BASE_URL}${pathname}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`backend request failed for ${pathname}: ${response.status}`)
  }

  return response.json()
}

async function seedPortalSession(page, token) {
  await page.addInitScript((nextToken, username) => {
    localStorage.setItem('osg_token', nextToken)
    localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userName: username,
        nickName: 'Assistant E2E',
        roles: ['assistant'],
      }),
    )
  }, token, ASSISTANT_USERNAME)
}

async function main() {
  loadEnvFile(DEFAULT_DEV_ENV_FILE)
  loadEnvFile(REPO_ENV_FILE)
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

  console.log('[e] reseed assistant carrier')
  reseedAssistantCarrier({
    assistantPassword: ASSISTANT_PASSWORD,
  })

  console.log('[e] login assistant')
  const assistantToken = await loginAssistant()

  console.log('[e] probe backend carrier routes')
  const jobOverviewBody = await fetchBackendJson('/api/mentor/job-overview/list?pageNum=1&pageSize=20', assistantToken)
  const mockPracticeBody = await fetchBackendJson('/api/mentor/mock-practice/list?pageNum=1&pageSize=20', assistantToken)
  const jobRows = Array.isArray(jobOverviewBody?.rows) ? jobOverviewBody.rows : []
  const mockRows = Array.isArray(mockPracticeBody?.rows) ? mockPracticeBody.rows : []
  assertOwnedStudentIds(jobRows, 'jobOverviewRows')
  assertOwnedStudentIds(mockRows, 'mockPracticeRows')

  const targetPracticeId = mockRows[0]?.practiceId
  if (!targetPracticeId) {
    throw new Error('assistant mock-practice route returned no practiceId')
  }

  const confirmBody = await putBackendJson(`/api/mentor/mock-practice/${targetPracticeId}/confirm`, assistantToken)
  if (confirmBody?.code !== 500 || confirmBody?.msg !== '无权确认该模拟应聘记录') {
    throw new Error(`assistant confirm probe did not reject as expected: ${JSON.stringify(confirmBody)}`)
  }

  console.log('[e] launch visible browser')
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    await seedPortalSession(page, assistantToken)

    console.log('[e] verify job overview page')
    const jobListPromise = page.waitForResponse('**/api/mentor/job-overview/list**', { timeout: 60_000 })
    const jobCalendarPromise = page.waitForResponse('**/api/mentor/job-overview/calendar**', { timeout: 60_000 })
    await page.goto(`${ASSISTANT_FRONTEND_BASE_URL}/career/job-overview`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await Promise.all([jobListPromise, jobCalendarPromise])
    await page.waitForSelector('#page-job-overview', { timeout: 60_000 })
    await page.waitForTimeout(2_000)
    const jobText = await page.locator('body').innerText()
    assertContains(
      jobText,
      ['学员求职总览', 'Job Overview', OWNED_STUDENT_NAME, OWNED_COMPANY_NAME, '跟进详情'],
      'jobText',
    )
    assertNotContains(jobText, ['分配导师', '确认辅导'], 'jobText')
    await page.screenshot({ path: JOB_SCREENSHOT_PATH, fullPage: true })

    console.log('[e] verify mock practice page')
    const mockListPromise = page.waitForResponse('**/api/mentor/mock-practice/list**', { timeout: 60_000 })
    await page.goto(`${ASSISTANT_FRONTEND_BASE_URL}/career/mock-practice`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await mockListPromise
    await page.waitForSelector('#page-mock-practice', { timeout: 60_000 })
    await page.waitForTimeout(2_000)
    const mockText = await page.locator('body').innerText()
    assertContains(
      mockText,
      ['模拟应聘管理', 'Mock Practice', OWNED_STUDENT_NAME, '练习记录'],
      'mockText',
    )
    assertNotContains(mockText, ['分配导师', '确认辅导', '新建模拟应聘'], 'mockText')

    await page.getByRole('button', { name: '查看详情' }).first().click()
    await page.waitForTimeout(1_000)
    const mockDetailText = await page.locator('body').innerText()
    assertContains(mockDetailText, [OWNED_PRACTICE_CONTENT, 'Carrier Route Coach'], 'mockDetailText')
    await page.screenshot({ path: MOCK_SCREENSHOT_PATH, fullPage: true })

    console.log(
      JSON.stringify(
        {
          status: 'pass',
          assistantUsername: ASSISTANT_USERNAME,
          jobTotal: jobOverviewBody.total,
          jobStudentIds: jobRows.map((row) => row.studentId),
          jobCompanies: jobRows.map((row) => row.company),
          mockTotal: mockPracticeBody.total,
          mockStudentIds: mockRows.map((row) => row.studentId),
          mockPracticeIds: mockRows.map((row) => row.practiceId),
          unauthorizedConfirm: confirmBody,
          screenshots: [JOB_SCREENSHOT_PATH, MOCK_SCREENSHOT_PATH],
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error('[e] assistant carrier headful failed')
  console.error(error)
  process.exitCode = 1
})
