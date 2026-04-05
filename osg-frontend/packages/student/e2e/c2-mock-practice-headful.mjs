import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_ENV_FILE = path.resolve(process.cwd(), 'deploy/.env.dev')
const EVIDENCE_DIR = path.resolve(process.cwd(), 'artifacts/five-end-course-flow')
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'c2-mock-practice-headful.png')

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

async function loginStudent(page) {
  const loginResponse = await page.request.post('http://127.0.0.1:28080/student/login', {
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

async function main() {
  loadEnvFile(DEFAULT_DEV_ENV_FILE)
  loadEnvFile(REPO_ENV_FILE)
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

  const uniqueRemark = `C2 headed acceptance ${new Date().toISOString()}`
  console.log('[c2] launch browser')
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    console.log('[c2] login student')
    await loginStudent(page)

    console.log('[c2] open mock-practice page')
    const metaResponsePromise = page.waitForResponse('**/api/student/mock-practice/meta', { timeout: 20_000 })
    const overviewResponsePromise = page.waitForResponse('**/api/student/mock-practice/overview', { timeout: 20_000 })
    await page.goto('http://127.0.0.1:4000/mock-practice', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const [metaResponse, overviewResponse] = await Promise.all([metaResponsePromise, overviewResponsePromise])
    await page.waitForSelector('#page-mock-practice', { timeout: 20_000 })

    const metaBody = await metaResponse.json()
    const overviewBody = await overviewResponse.json()
    const pageSummary = metaBody?.data?.pageSummary ?? {}
    const practiceRecords = Array.isArray(overviewBody?.data?.practiceRecords) ? overviewBody.data.practiceRecords : []
    const rowsBefore = await page.locator('#page-mock-practice tbody tr').count()

    console.log('[c2] assert visible boundary before submit')
    const beforeText = await page.locator('#page-mock-practice').innerText()
    assertContains(
      beforeText,
      [
        pageSummary.titleZh || '应聘演练',
        pageSummary.titleEn || 'Mock Practice',
        '申请模拟面试',
        '申请测试',
        '申请考试',
      ],
      'beforeText',
    )
    assertNotContains(
      beforeText,
      [
        '课程申请',
        'Class Request',
        '新建申请',
        '申请记录 My Requests',
        '我有一个入职面试',
      ],
      'beforeText',
    )

    console.log('[c2] submit networking practice request')
    await page.getByRole('button', { name: '申请测试' }).click()
    const dialog = page.getByRole('dialog', { name: /申请人际关系测试/ })
    await dialog.waitFor({ state: 'visible', timeout: 20_000 })
    await dialog.getByPlaceholder('如有特殊需求或说明，请在此填写...').fill(uniqueRemark)

    const createResponsePromise = page.waitForResponse('**/api/student/mock-practice/practice-request', { timeout: 20_000 })
    const refreshOverviewPromise = page.waitForResponse('**/api/student/mock-practice/overview', { timeout: 20_000 })
    await dialog.getByRole('button', { name: /提交申请/ }).click()
    const [createResponse] = await Promise.all([createResponsePromise, refreshOverviewPromise])
    const createBody = await createResponse.json()

    if (!createResponse.ok() || createBody?.code !== 200 || !createBody?.data?.requestId) {
      throw new Error(`practice request failed: ${JSON.stringify(createBody)}`)
    }

    const requestId = createBody.data.requestId
    await page.waitForFunction(
      (previousRowCount) => {
        const rows = document.querySelectorAll('#page-mock-practice tbody tr')
        return rows.length > previousRowCount
      },
      rowsBefore,
      { timeout: 20_000 },
    )

    console.log('[c2] assert new main-row appears')
    const createdRow = page.locator('#page-mock-practice tbody tr').filter({ hasText: uniqueRemark }).first()
    await createdRow.waitFor({ state: 'visible', timeout: 20_000 })
    const createdRowText = await createdRow.innerText()
    assertContains(createdRowText, ['人际关系测试', '待分配', '班主任分配中', uniqueRemark], 'createdRowText')

    console.log('[c2] verify overview api after submit')
    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    const verifyOverviewResponse = await page.request.get('http://127.0.0.1:28080/student/mock-practice/overview', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const verifyOverviewBody = await verifyOverviewResponse.json()
    const verifyPracticeRecords = Array.isArray(verifyOverviewBody?.data?.practiceRecords)
      ? verifyOverviewBody.data.practiceRecords
      : []
    const createdRecord = verifyPracticeRecords.find((record) => record.id === `MP${requestId}`)

    if (!createdRecord) {
      throw new Error(`cannot find created practice record MP${requestId}`)
    }
    if (createdRecord.statusValue !== 'pending' || createdRecord.status !== '待分配导师') {
      throw new Error(`unexpected created practice state: ${JSON.stringify(createdRecord)}`)
    }
    if (createdRecord.feedbackHint !== uniqueRemark) {
      throw new Error(`remark not projected into practice summary: ${JSON.stringify(createdRecord)}`)
    }

    console.log('[c2] write screenshot')
    await page.screenshot({
      path: SCREENSHOT_PATH,
      fullPage: true,
    })

    console.log(JSON.stringify({
      status: 'pass',
      screenshot: SCREENSHOT_PATH,
      checked: {
        rowsBefore,
        rowsAfter: await page.locator('#page-mock-practice tbody tr').count(),
        requestId,
        uniqueRemark,
        createdRecord: {
          id: createdRecord.id,
          status: createdRecord.status,
          statusValue: createdRecord.statusValue,
          mentor: createdRecord.mentor,
          mentorMeta: createdRecord.mentorMeta,
          feedbackHint: createdRecord.feedbackHint,
        },
        hiddenCompatibilityTokens: ['课程申请', 'Class Request', '新建申请', '申请记录 My Requests', '我有一个入职面试'],
        existingPracticeCount: practiceRecords.length,
      },
    }, null, 2))
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error.stack || String(error))
  process.exit(1)
})
