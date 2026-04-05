import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { chromium } from '@playwright/test'

const STUDENT_USERNAME = 'student_demo'
const STUDENT_PASSWORD = 'student123'
const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_ENV_FILE = path.resolve(process.cwd(), 'deploy/.env.dev')
const FIXTURE_SOURCE = path.resolve(process.cwd(), 'osg-frontend/packages/student/e2e/support/java/StudentPositionFixture.java')
const FIXTURE_BUILD_DIR = path.resolve(process.cwd(), 'osg-frontend/packages/student/e2e/support/java/.compiled')
const EVIDENCE_DIR = path.resolve(process.cwd(), 'artifacts/five-end-course-flow')
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'c1-bu002-applications-summary-headful.png')
const RESET_FIXTURE = process.env.C1_RESET_APPLICATION_FIXTURE === '1'

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

function resolveJar(groupPath, artifactName, versions) {
  for (const version of versions) {
    const candidate = path.join(
      os.homedir(),
      '.m2',
      'repository',
      ...groupPath.split('/'),
      artifactName,
      version,
      `${artifactName}-${version}.jar`,
    )
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`missing required jar for ${artifactName}`)
}

function fixtureClasspath() {
  return [
    FIXTURE_BUILD_DIR,
    resolveJar('com/mysql', 'mysql-connector-j', ['8.4.0', '8.3.0', '8.2.0']),
  ].join(path.delimiter)
}

function compileFixture() {
  fs.mkdirSync(FIXTURE_BUILD_DIR, { recursive: true })
  execFileSync('javac', ['-d', FIXTURE_BUILD_DIR, FIXTURE_SOURCE], {
    stdio: 'pipe',
    env: process.env,
  })
}

function runFixture(command) {
  compileFixture()
  return execFileSync('java', ['-cp', fixtureClasspath(), 'StudentPositionFixture', command, STUDENT_USERNAME], {
    stdio: 'pipe',
    env: process.env,
    encoding: 'utf-8',
  }).trim()
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
  if (RESET_FIXTURE) {
    console.log('[c1-bu002] reset fixture')
    runFixture('reset-applications')
  } else {
    console.log('[c1-bu002] skip fixture reset and use live student_demo data')
  }

  console.log('[c1-bu002] launch browser')
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    console.log('[c1-bu002] login student')
    await loginStudent(page)

    console.log('[c1-bu002] open applications page')
    const listResponsePromise = page.waitForResponse('**/api/student/application/list', { timeout: 20_000 })
    const metaResponsePromise = page.waitForResponse('**/api/student/application/meta', { timeout: 20_000 })
    await page.goto('http://127.0.0.1:4000/applications', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const [listResponse, metaResponse] = await Promise.all([listResponsePromise, metaResponsePromise])
    await page.waitForSelector('#page-job-tracking', { timeout: 20_000 })

    const listBody = await listResponse.json()
    const metaBody = await metaResponse.json()
    const applications = Array.isArray(listBody?.data?.applications) ? listBody.data.applications : []
    const pageSummary = metaBody?.data?.pageSummary ?? {}
    const placeholderRecord = applications.find((record) =>
      [record?.mentorMeta, record?.hoursFeedback, record?.feedback].some((value) => value === '-'),
    ) ?? applications[0]

    if (!applications.length) {
      throw new Error('application list is empty, cannot verify summary boundary')
    }
    if (!placeholderRecord) {
      throw new Error('cannot locate an application row for summary boundary verification')
    }

    console.log('[c1-bu002] assert summary boundary before reload')
    const beforeReload = await page.locator('#page-job-tracking').innerText()
    const requiredBeforeReload = [
      pageSummary.titleZh || '我的求职',
      pageSummary.titleEn || 'My Applications',
      placeholderRecord.company,
      placeholderRecord.position,
    ]
    const forbiddenEverywhere = ['课程详情', '课程记录详情', '立即评分', '提交评价', '学生评分']
    assertContains(beforeReload, requiredBeforeReload, 'beforeReload')
    assertNotContains(beforeReload, forbiddenEverywhere, 'beforeReload')

    const targetRow = page.locator('tr').filter({ hasText: placeholderRecord.company }).first()
    await targetRow.waitFor({ state: 'visible', timeout: 20_000 })
    const targetRowText = await targetRow.innerText()
    assertContains(targetRowText, [placeholderRecord.company, placeholderRecord.position], 'targetRow')
    if (placeholderRecord.mentorMeta) {
      assertContains(targetRowText, [placeholderRecord.mentorMeta], 'targetRow')
    }
    if (placeholderRecord.hoursFeedback) {
      assertContains(targetRowText, [placeholderRecord.hoursFeedback], 'targetRow')
    }
    if (placeholderRecord.feedback) {
      assertContains(targetRowText, [placeholderRecord.feedback], 'targetRow')
    }

    console.log('[c1-bu002] reload applications page')
    const reloadListResponsePromise = page.waitForResponse('**/api/student/application/list', { timeout: 20_000 })
    const reloadMetaResponsePromise = page.waitForResponse('**/api/student/application/meta', { timeout: 20_000 })
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 })
    const [reloadListResponse] = await Promise.all([reloadListResponsePromise, reloadMetaResponsePromise])
    await page.waitForSelector('#page-job-tracking', { timeout: 20_000 })

    const reloadListBody = await reloadListResponse.json()
    const reloadedApplications = Array.isArray(reloadListBody?.data?.applications) ? reloadListBody.data.applications : []
    const reloadedRecord = reloadedApplications.find((record) =>
      record.company === placeholderRecord.company && record.position === placeholderRecord.position,
    )
    if (!reloadedRecord) {
      throw new Error(`row disappeared after reload: ${placeholderRecord.company} / ${placeholderRecord.position}`)
    }

    console.log('[c1-bu002] assert summary boundary after reload')
    const afterReload = await page.locator('#page-job-tracking').innerText()
    const requiredAfterReload = [placeholderRecord.company, placeholderRecord.position]
    assertContains(afterReload, requiredAfterReload, 'afterReload')
    assertNotContains(afterReload, forbiddenEverywhere, 'afterReload')

    console.log('[c1-bu002] write screenshot')
    await page.screenshot({
      path: SCREENSHOT_PATH,
      fullPage: true,
    })

    console.log(JSON.stringify({
      status: 'pass',
      screenshot: SCREENSHOT_PATH,
      checked: {
        requiredBeforeReload,
        requiredAfterReload,
        forbiddenEverywhere,
        placeholderRecord: {
          company: placeholderRecord.company,
          position: placeholderRecord.position,
          mentorMeta: placeholderRecord.mentorMeta,
          hoursFeedback: placeholderRecord.hoursFeedback,
          feedback: placeholderRecord.feedback,
        },
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
