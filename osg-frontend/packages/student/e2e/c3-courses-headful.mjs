import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { reseedManagedStudentPortalUser } from './support/managed-student-user.mjs'

const LEAD_MENTOR_USERNAME = 'student_demo'
const LEAD_MENTOR_PASSWORD = 'student123'
const STUDENT_USERNAME = 'student_c3_chain'
const STUDENT_PASSWORD = 'student12766'
const MANAGED_STUDENT_ID = 12766
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_ENV_FILE = path.resolve(process.cwd(), 'deploy/.env.dev')
const EVIDENCE_DIR = path.resolve(process.cwd(), 'artifacts/five-end-course-flow')
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'c3-courses-headful.png')
const BACKEND_BASE_URL = 'http://127.0.0.1:28080'
const FRONTEND_BASE_URL = 'http://127.0.0.1:4000'

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

async function loginStudent(page) {
  const loginResponse = await page.request.post(`${BACKEND_BASE_URL}/student/login`, {
    data: {
      username: STUDENT_USERNAME,
      password: STUDENT_PASSWORD,
    },
  })
  const loginBody = await loginResponse.json()

  if (!loginResponse.ok() || loginBody.code !== 200 || !loginBody.token) {
    throw new Error(`student login failed: ${JSON.stringify(loginBody)}`)
  }

  await page.addInitScript((token, username) => {
    localStorage.setItem('osg_token', token)
    localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userName: username,
        nickName: 'Test Student',
        roles: ['student'],
      }),
    )
  }, loginBody.token, STUDENT_USERNAME)

  return loginBody.token
}

async function loginLeadMentor() {
  const response = await fetch(`${BACKEND_BASE_URL}/lead-mentor/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: LEAD_MENTOR_USERNAME,
      password: LEAD_MENTOR_PASSWORD,
    }),
  })
  const body = await response.json()

  if (!response.ok || body.code !== 200 || !body.token) {
    throw new Error(`lead-mentor login failed: ${JSON.stringify(body)}`)
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

async function postBackendJson(pathname, token, body) {
  const response = await fetch(`${BACKEND_BASE_URL}${pathname}`, {
    method: 'POST',
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

function pickFirst(records, predicate, label) {
  const matched = records.find(predicate)
  if (!matched) {
    throw new Error(`cannot find ${label}`)
  }
  return matched
}

async function main() {
  loadEnvFile(DEFAULT_DEV_ENV_FILE)
  loadEnvFile(REPO_ENV_FILE)
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

  const uniqueSuffix = new Date().toISOString()
  const uniqueLeadFeedback = `C3 lead-mentor submit ${uniqueSuffix}`
  const uniqueStudentFeedback = `C3 student rate ${uniqueSuffix}`
  console.log('[c3] reseed managed student portal user')
  reseedManagedStudentPortalUser(STUDENT_PASSWORD)

  console.log('[c3] create and approve one real class record before student acceptance')
  const leadMentorToken = await loginLeadMentor()
  const createBody = await postBackendJson('/lead-mentor/class-records', leadMentorToken, {
    studentId: MANAGED_STUDENT_ID,
    classDate: '2026-03-28T00:00:00+08:00',
    durationHours: 1.5,
    courseType: 'job_coaching',
    classStatus: 'case_prep',
    feedbackContent: uniqueLeadFeedback,
    comments: `C3 comments ${uniqueSuffix}`,
    topics: `C3 topics ${uniqueSuffix}`,
  })
  const createdRecordId = createBody?.data?.recordId
  if (!createdRecordId) {
    throw new Error(`lead-mentor class record create failed: ${JSON.stringify(createBody)}`)
  }
  const approveBody = await putBackendJson(`/admin/report/${createdRecordId}/approve`, leadMentorToken, {
    remark: `C3 approve ${uniqueSuffix}`,
  })
  if (approveBody?.code !== 200 || approveBody?.data?.status !== 'approved') {
    throw new Error(`admin report approve failed: ${JSON.stringify(approveBody)}`)
  }
  const createdStudentRecordId = `#${createdRecordId}`

  console.log('[c3] launch browser')
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    console.log('[c3] login student')
    const token = await loginStudent(page)

    console.log('[c3] warm backend meta/list before opening student page')
    const metaBody = await fetchBackendJson('/student/class-records/meta', token)
    const listBody = await fetchBackendJson('/student/class-records/list', token)
    const pageSummary = metaBody?.data?.pageSummary ?? {}
    const reminderBanner = metaBody?.data?.reminderBanner ?? {}
    const tabDefinitions = Array.isArray(metaBody?.data?.tabDefinitions) ? metaBody.data.tabDefinitions : []
    const records = Array.isArray(listBody?.data?.records) ? listBody.data.records : []
    const pendingRecords = records.filter((record) => record.actionKind === 'rate')
    const evaluatedRecords = records.filter((record) => record.actionKind === 'detail')

    if (!records.length) {
      throw new Error('student class-record list is empty')
    }
    if (!pendingRecords.length) {
      throw new Error('student class-record list has no pending records to rate')
    }

    const pendingRecord = pickFirst(
      pendingRecords,
      (record) => record.recordId === createdStudentRecordId,
      'created pendingRecord',
    )
    const pendingTab = tabDefinitions.find((tab) => tab.key === 'pending')
    const evaluatedTab = tabDefinitions.find((tab) => tab.key === 'evaluated')

    if ((pendingTab?.count ?? -1) !== pendingRecords.length) {
      throw new Error(`pending tab count mismatch: ${JSON.stringify({ tab: pendingTab, listCount: pendingRecords.length })}`)
    }
    if ((evaluatedTab?.count ?? -1) !== evaluatedRecords.length) {
      throw new Error(`evaluated tab count mismatch: ${JSON.stringify({ tab: evaluatedTab, listCount: evaluatedRecords.length })}`)
    }

    console.log('[c3] open courses page')
    const metaResponsePromise = page.waitForResponse('**/api/student/class-records/meta', { timeout: 60_000 })
    const listResponsePromise = page.waitForResponse('**/api/student/class-records/list', { timeout: 60_000 })
    await page.goto(`${FRONTEND_BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await Promise.all([metaResponsePromise, listResponsePromise])
    await page.waitForSelector('#page-myclass', { timeout: 60_000 })

    const beforeText = await page.locator('#page-myclass').innerText()
    assertContains(
      beforeText,
      [
        pageSummary.titleZh || '课程记录',
        pageSummary.titleEn || 'Class Records',
        pageSummary.subtitle || '查看我的上课记录和导师反馈',
        reminderBanner.title || '新增课程记录',
      ],
      'beforeText',
    )
    assertNotContains(
      beforeText,
      [
        '申请模拟面试',
        '申请测试',
        '申请考试',
        '提交申请',
        '课程申请',
      ],
      'beforeText',
    )

    console.log('[c3] rate one pending approved record in visible browser')
    await page.locator('[role="tab"]').filter({ hasText: '待评价' }).first().click()
    const pendingRow = page.locator('tbody tr').filter({ hasText: pendingRecord.recordId }).first()
    await pendingRow.waitFor({ state: 'visible', timeout: 60_000 })
    await pendingRow.getByRole('button', { name: pendingRecord.actionLabel || '评价' }).click()

    const rateDialog = page.getByRole('dialog', { name: /课程评价/ })
    await rateDialog.waitFor({ state: 'visible', timeout: 60_000 })
    await rateDialog.getByPlaceholder(/请详细描述您的上课体验/).fill(uniqueStudentFeedback)

    const rateResponsePromise = page.waitForResponse('**/api/student/class-records/rate', { timeout: 60_000 })
    const refreshListPromise = page.waitForResponse('**/api/student/class-records/list', { timeout: 60_000 })
    await rateDialog.getByRole('button', { name: /提交评价/ }).click()
    const [rateResponse] = await Promise.all([rateResponsePromise, refreshListPromise])
    const rateResponseBody = await rateResponse.json()
    if (!rateResponse.ok() || rateResponseBody?.code !== 200) {
      throw new Error(`rate request failed: ${JSON.stringify(rateResponseBody)}`)
    }

    console.log('[c3] verify same main record was updated')
    const updatedListBody = await fetchBackendJson('/student/class-records/list', token)
    const updatedRecords = Array.isArray(updatedListBody?.data?.records) ? updatedListBody.data.records : []
    const updatedRecord = updatedRecords.find((record) => record.recordId === pendingRecord.recordId)
    if (!updatedRecord) {
      throw new Error(`cannot find updated course record ${pendingRecord.recordId}`)
    }
    if (updatedRecord.actionKind !== 'detail') {
      throw new Error(`updated record did not switch to detail state: ${JSON.stringify(updatedRecord)}`)
    }
    if (updatedRecord.ratingFeedback !== uniqueStudentFeedback) {
      throw new Error(`updated feedback mismatch: ${JSON.stringify(updatedRecord)}`)
    }

    console.log('[c3] inspect detail flow stays in courses page')
    await page.locator('[role="tab"]').filter({ hasText: '已评价' }).first().click()
    const evaluatedRow = page.locator('tbody tr').filter({ hasText: pendingRecord.recordId }).first()
    await evaluatedRow.waitFor({ state: 'visible', timeout: 60_000 })
    await evaluatedRow.getByRole('button', { name: updatedRecord.actionLabel || '查看详情' }).click()

    const detailDialog = page.getByRole('dialog', { name: new RegExp(updatedRecord.detailTitle || '课程详情') })
    await detailDialog.waitFor({ state: 'visible', timeout: 60_000 })
    await detailDialog.getByRole('button', { name: /关\s*闭|修改评价/ }).first().waitFor({ state: 'visible', timeout: 60_000 })
    const detailText = await detailDialog.innerText()
    assertContains(
      detailText,
      [pendingRecord.recordId, updatedRecord.mentor, updatedRecord.courseContent],
      'detailText',
    )

    console.log('[c3] write screenshot')
    await page.screenshot({
      path: SCREENSHOT_PATH,
      fullPage: true,
    })

    console.log(
      JSON.stringify(
        {
          status: 'pass',
          screenshot: SCREENSHOT_PATH,
          checked: {
            records: records.length,
            pendingBefore: pendingRecords.length,
            evaluatedBefore: evaluatedRecords.length,
            ratedRecordId: pendingRecord.recordId,
            createdRecordId: createdRecordId,
            createdLeadFeedback: uniqueLeadFeedback,
            ratedRecordActionAfter: updatedRecord.actionKind,
            ratedRecordFeedbackAfter: updatedRecord.ratingFeedback,
            inspectedDetailRecordId: pendingRecord.recordId,
            tabCounts: tabDefinitions.map((tab) => ({
              key: tab.key,
              count: tab.count,
            })),
            hiddenTokens: ['申请模拟面试', '申请测试', '申请考试', '提交申请', '课程申请'],
          },
        },
        null,
        2,
      ),
    )
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error.stack || String(error))
  process.exit(1)
})
