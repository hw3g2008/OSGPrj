import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { reseedMentorChain } from './support/mentor-chain-seed.mjs'

const REVIEWER_USERNAME = 'student_demo'
const REVIEWER_PASSWORD = 'student123'
const MENTOR_USERNAME = 'mentor_d_chain'
const MENTOR_PASSWORD = 'mentor12767'
const STUDENT_USERNAME = 'student_d_chain'
const STUDENT_PASSWORD = 'student12766'
const TARGET_STUDENT_ID = '12766'

const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_ENV_FILE = path.resolve(process.cwd(), 'deploy/.env.dev')
const EVIDENCE_DIR = path.resolve(process.cwd(), 'artifacts/five-end-course-flow')
const MENTOR_SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'd-mentor-submit-headful.png')
const STUDENT_SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'd-student-approved-headful.png')
const BACKEND_BASE_URL = 'http://127.0.0.1:28080'
const MENTOR_FRONTEND_BASE_URL = 'http://127.0.0.1:3002'
const STUDENT_FRONTEND_BASE_URL = 'http://127.0.0.1:4000'

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

async function loginPortal(username, password, route) {
  const response = await fetch(`${BACKEND_BASE_URL}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 200 || !body.token) {
    throw new Error(`${route} login failed: ${JSON.stringify(body)}`)
  }
  return body.token
}

async function seedPortalSession(page, token, username, roles) {
  await page.addInitScript((nextToken, nextUsername, nextRoles) => {
    localStorage.setItem('osg_token', nextToken)
    localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userName: nextUsername,
        nickName: nextUsername,
        roles: nextRoles,
      }),
    )
  }, token, username, roles)
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

async function putBackendJson(pathname, token, body) {
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

function findCreatedMentorRecord(rows, feedbackText) {
  return rows.find((row) => row.feedbackContent === feedbackText)
}

async function waitForStudentRecord(token, recordId, timeoutMs = 60_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const body = await fetchBackendJson('/student/class-records/list', token)
    const rows = Array.isArray(body?.data?.records) ? body.data.records : []
    const matched = rows.find((row) => row.recordId === `#${recordId}`)
    if (matched) {
      return { rows, matched }
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500))
  }
  throw new Error(`student list never exposed approved record #${recordId}`)
}

async function main() {
  loadEnvFile(DEFAULT_DEV_ENV_FILE)
  loadEnvFile(REPO_ENV_FILE)
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

  const uniqueSuffix = new Date().toISOString()
  const mentorFeedback = `D mentor submit ${uniqueSuffix}`
  const reviewRemark = `D admin approve ${uniqueSuffix}`

  console.log('[d] reseed mentor chain')
  reseedMentorChain({
    mentorPassword: MENTOR_PASSWORD,
    studentPassword: STUDENT_PASSWORD,
  })

  console.log('[d] login reviewer, mentor, student')
  const reviewerToken = await loginPortal(REVIEWER_USERNAME, REVIEWER_PASSWORD, '/lead-mentor/login')
  const mentorToken = await loginPortal(MENTOR_USERNAME, MENTOR_PASSWORD, '/mentor/login')
  const studentToken = await loginPortal(STUDENT_USERNAME, STUDENT_PASSWORD, '/student/login')

  console.log('[d] prewarm student backend before browser')
  const beforeStudentList = await fetchBackendJson('/student/class-records/list', studentToken)
  const beforeStudentRecords = Array.isArray(beforeStudentList?.data?.records) ? beforeStudentList.data.records : []

  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const mentorPage = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  const studentPage = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    await seedPortalSession(mentorPage, mentorToken, MENTOR_USERNAME, ['mentor'])
    await seedPortalSession(studentPage, studentToken, STUDENT_USERNAME, ['student'])

    console.log('[d] mentor submits one class record in visible browser')
    const mentorListBefore = await fetchBackendJson('/api/mentor/class-records/list?pageNum=1&pageSize=20', mentorToken)
    const mentorRowsBefore = Array.isArray(mentorListBefore?.rows) ? mentorListBefore.rows : []

    const mentorListResponsePromise = mentorPage.waitForResponse('**/api/mentor/class-records/list**', { timeout: 60_000 })
    await mentorPage.goto(`${MENTOR_FRONTEND_BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await mentorListResponsePromise
    await mentorPage.getByRole('button', { name: /上报课程记录/ }).click()
    await mentorPage.locator('.modal.active').waitFor({ state: 'visible', timeout: 60_000 })

    await mentorPage.locator('.modal.active select.form-select.full').selectOption(TARGET_STUDENT_ID)
    await mentorPage.locator('.modal.active input[type="date"]').fill('2026-03-28')
    await mentorPage.locator('.modal.active input[type="number"]').fill('1')
    await mentorPage.locator('.modal.active .type-option').filter({ hasText: '岗位辅导' }).click()
    await mentorPage.locator('.modal.active textarea.form-textarea').fill(mentorFeedback)

    const submitResponsePromise = mentorPage.waitForResponse('**/api/mentor/class-records', { timeout: 60_000 })
    const refreshMentorListPromise = mentorPage.waitForResponse('**/api/mentor/class-records/list**', { timeout: 60_000 })
    await mentorPage.locator('.modal.active .modal-footer .btn-primary').click()
    const submitResponse = await submitResponsePromise
    const submitBody = await submitResponse.json()
    if (!submitResponse.ok() || submitBody?.code !== 200) {
      throw new Error(`mentor class-record submit failed: ${JSON.stringify(submitBody)}`)
    }
    await refreshMentorListPromise
    await mentorPage.locator('.modal.active').waitFor({ state: 'hidden', timeout: 60_000 })

    const mentorListAfter = await fetchBackendJson('/api/mentor/class-records/list?pageNum=1&pageSize=20', mentorToken)
    const mentorRowsAfter = Array.isArray(mentorListAfter?.rows) ? mentorListAfter.rows : []
    const createdMentorRecord = findCreatedMentorRecord(mentorRowsAfter, mentorFeedback)
    if (!createdMentorRecord) {
      throw new Error(`cannot find created mentor record for feedback: ${mentorFeedback}`)
    }
    if (mentorRowsAfter.length <= mentorRowsBefore.length) {
      throw new Error('mentor record list did not grow after submit')
    }
    if (createdMentorRecord.status !== 'pending') {
      throw new Error(`created mentor record is not pending: ${JSON.stringify(createdMentorRecord)}`)
    }

    const mentorText = await mentorPage.locator('body').innerText()
    assertContains(mentorText, ['课程记录', '查看和上报课程记录', '张三', '待审核'], 'mentorText')
    await mentorPage.screenshot({ path: MENTOR_SCREENSHOT_PATH, fullPage: true })

    console.log('[d] student page confirms pending record is invisible before review')
    const studentMetaPromise = studentPage.waitForResponse('**/api/student/class-records/meta', { timeout: 60_000 })
    const studentListPromise = studentPage.waitForResponse('**/api/student/class-records/list', { timeout: 60_000 })
    await studentPage.goto(`${STUDENT_FRONTEND_BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await Promise.all([studentMetaPromise, studentListPromise])
    await studentPage.waitForSelector('#page-myclass', { timeout: 60_000 })
    const beforeApproveText = await studentPage.locator('#page-myclass').innerText()
    assertNotContains(beforeApproveText, [String(createdMentorRecord.recordId), mentorFeedback], 'beforeApproveText')

    const pendingVisibilityProbe = await fetchBackendJson('/student/class-records/list', studentToken)
    const pendingVisibilityRows = Array.isArray(pendingVisibilityProbe?.data?.records) ? pendingVisibilityProbe.data.records : []
    if (pendingVisibilityRows.some((row) => row.recordId === `#${createdMentorRecord.recordId}`)) {
      throw new Error(`student could see pending record before approve: ${createdMentorRecord.recordId}`)
    }

    console.log('[d] approve record through real admin review endpoint')
    const approveBody = await putBackendJson(`/admin/report/${createdMentorRecord.recordId}/approve`, reviewerToken, {
      remark: reviewRemark,
    })
    if (approveBody?.code !== 200 || approveBody?.data?.status !== 'approved') {
      throw new Error(`admin report approve failed: ${JSON.stringify(approveBody)}`)
    }

    console.log('[d] student page reloads and confirms the approved record is now visible')
    const { matched: approvedBackendRecord } = await waitForStudentRecord(studentToken, createdMentorRecord.recordId)
    const studentReloadPromise = studentPage.waitForResponse('**/api/student/class-records/list', { timeout: 60_000 })
    await studentPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await studentReloadPromise
    await studentPage.waitForSelector('#page-myclass', { timeout: 60_000 })
    await studentPage.waitForFunction(
      (recordId) => document.body.innerText.includes(`#${recordId}`),
      createdMentorRecord.recordId,
      { timeout: 60_000 },
    )
    const approvedText = await studentPage.locator('body').innerText()
    assertContains(
      approvedText,
      [approvedBackendRecord.recordId, approvedBackendRecord.mentor, approvedBackendRecord.courseContent],
      'approvedText',
    )

    await studentPage.screenshot({ path: STUDENT_SCREENSHOT_PATH, fullPage: true })

    console.log(
      JSON.stringify(
        {
          status: 'pass',
          screenshots: {
            mentor: MENTOR_SCREENSHOT_PATH,
            student: STUDENT_SCREENSHOT_PATH,
          },
          checked: {
            mentorRecordId: createdMentorRecord.recordId,
            mentorRecordStatusAfterSubmit: createdMentorRecord.status,
            studentRecordsBeforeApprove: beforeStudentRecords.length,
            studentVisibleBeforeApprove: false,
            studentVisibleAfterApprove: true,
            studentActionAfterApprove: approvedBackendRecord.actionKind,
            approvedRecordId: approvedBackendRecord.recordId,
            reviewRemark,
          },
        },
        null,
        2,
      ),
    )
  } finally {
    await mentorPage.close().catch(() => {})
    await studentPage.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error.stack || String(error))
  process.exit(1)
})
