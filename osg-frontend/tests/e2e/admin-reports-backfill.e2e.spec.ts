import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

interface ReportRow {
  recordId: number
  classId?: string | null
  mentorName: string
  studentName: string
  status: 'pending' | 'approved' | 'rejected'
}

function trackRuntimeErrors(page: Page) {
  const pageErrors: string[] = []
  const apiErrors: string[] = []

  page.on('pageerror', (error) => {
    pageErrors.push(String(error))
  })

  page.on('response', async (response) => {
    const request = response.request()
    const url = response.url()
    const isApi = request.resourceType() === 'xhr' || request.resourceType() === 'fetch'
    if (!isApi || !url.includes('/api/')) {
      return
    }
    if (response.status() >= 500) {
      apiErrors.push(`${response.status()} ${url}`)
      return
    }
    const contentType = response.headers()['content-type'] || ''
    if (!contentType.includes('application/json')) {
      return
    }
    try {
      const body = await response.json()
      if (body && typeof body === 'object' && 'code' in body && body.code !== 200) {
        apiErrors.push(`${body.code} ${url} msg=${String(body.msg || '').slice(0, 120)}`)
      }
    } catch {
      // ignore invalid json bodies advertised incorrectly
    }
  })

  return { pageErrors, apiErrors }
}

async function withRetries<T>(operation: () => Promise<T>, attempts: number = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === attempts) {
        throw error
      }
    }
  }
  throw lastError
}

function repoRoot() {
  return path.resolve(__dirname, '../../..')
}

function reportRowLabel(row: ReportRow) {
  return `#${row.recordId}`
}

function seedReportRows(count: number) {
  expect(count, 'report seed count should stay positive').toBeGreaterThan(0)
  const raw = execFileSync(
    'python3',
    [path.join(repoRoot(), 'bin/runtime_seed_admin.py'), 'report', '--count', String(count)],
    {
      cwd: repoRoot(),
      encoding: 'utf-8',
    },
  ).trim()
  const body = JSON.parse(raw) as { created?: Array<Record<string, unknown>> }
  expect(Array.isArray(body.created), `report seed should return created rows, raw=${raw}`).toBeTruthy()
  expect(body.created!.length, `report seed should create ${count} rows, raw=${raw}`).toBe(count)
}

function reportListPromise(page: Page): Promise<APIResponse> {
  return waitForApi(page, '/api/admin/report/list', 'GET')
}

async function openReportsPage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  await page.goto('/reports', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /课时审核/i })).toBeVisible()
  await expect(page.locator('.reports-table')).toBeVisible()
  return runtime
}

async function fetchReportRows(
  request: APIRequestContext,
  tab: 'all' | 'pending' | 'approved' | 'rejected',
): Promise<ReportRow[]> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/report/list?tab=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    '/api/admin/report/list',
  )
  return (body?.rows || []) as ReportRow[]
}

async function ensurePendingReportRows(
  request: APIRequestContext,
  minimumCount: number,
): Promise<ReportRow[]> {
  let pendingRows = await fetchReportRows(request, 'pending')
  if (pendingRows.length >= minimumCount) {
    return pendingRows
  }
  seedReportRows(minimumCount - pendingRows.length)
  pendingRows = await fetchReportRows(request, 'pending')
  expect(pendingRows.length, `report seed should lift pending rows to at least ${minimumCount}`).toBeGreaterThanOrEqual(minimumCount)
  return pendingRows
}

test.describe('Admin Reports Ticket Backfill @ticket-backfill', () => {
  test('reports page loads pending review data, tabs, and detail modal without runtime errors', async ({ page, request }) => {
    const pendingRows = await ensurePendingReportRows(request, 1)
    const referenceRow = pendingRows[0]
    const runtime = await openReportsPage(page)

    const pendingResponses = reportListPromise(page)
    await page.getByRole('button', { name: /待审核/i }).click()
    await pendingResponses

    const row = page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(referenceRow) }).first()
    await expect(row).toContainText(referenceRow.mentorName)
    await expect(page.getByText('批量通过').first()).toBeVisible()
    await expect(page.getByText('批量驳回').first()).toBeVisible()

    const detailResponse = waitForApi(page, `/api/admin/report/${referenceRow.recordId}`, 'GET')
    await row.getByRole('button', { name: '详情' }).click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="report-review-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal).toContainText(referenceRow.mentorName)
    await expect(detailModal).toContainText(referenceRow.studentName)
    if (referenceRow.classId) {
      await expect(detailModal).toContainText(referenceRow.classId)
    }
    await detailModal.getByRole('button', { name: '关闭' }).click()
    await expect(detailModal).toBeHidden()

    expect(runtime.pageErrors, 'reports page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'reports page api runtime errors').toEqual([])
  })

  test('single approve and batch reject persist through the live reports surface', async ({ page, request }) => {
    const pendingRows = await ensurePendingReportRows(request, 3)
    const [approveTarget, rejectTargetOne, rejectTargetTwo] = pendingRows
    const runtime = await openReportsPage(page)

    const pendingResponses = reportListPromise(page)
    await page.getByRole('button', { name: /待审核/i }).click()
    await pendingResponses

    const approveRow = page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(approveTarget) }).first()
    await expect(approveRow).toBeVisible()
    const approveDetailResponse = waitForApi(page, `/api/admin/report/${approveTarget.recordId}`, 'GET')
    await approveRow.getByRole('button', { name: '通过' }).click()
    await approveDetailResponse

    const detailModal = page.locator('[data-surface-id="report-review-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await detailModal.getByLabel('审核备注').fill('runtime approve')
    const approveResponses = Promise.all([
      waitForApi(page, `/api/admin/report/${approveTarget.recordId}/approve`, 'PUT'),
      waitForApi(page, '/api/admin/report/list', 'GET'),
    ])
    await detailModal.getByRole('button', { name: '通过' }).click()
    await approveResponses
    await expect(page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(approveTarget) })).toHaveCount(0)

    const rejectRowOne = page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(rejectTargetOne) }).first()
    const rejectRowTwo = page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(rejectTargetTwo) }).first()
    await rejectRowOne.locator('input[type="checkbox"]').check()
    await rejectRowTwo.locator('input[type="checkbox"]').check()

    const batchRejectResponses = Promise.all([
      waitForApi(page, '/api/admin/report/batch-reject', 'PUT'),
      waitForApi(page, '/api/admin/report/list', 'GET'),
    ])
    await page.getByRole('button', { name: '批量驳回' }).click()
    await batchRejectResponses

    const approvedTabResponses = reportListPromise(page)
    await page.getByRole('button', { name: /已通过/i }).click()
    await approvedTabResponses
    await expect(page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(approveTarget) }).first()).toBeVisible()

    const rejectedTabResponses = reportListPromise(page)
    await page.getByRole('button', { name: /已驳回/i }).click()
    await rejectedTabResponses
    await expect(page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(rejectTargetOne) }).first()).toBeVisible()
    await expect(page.locator('.reports-table tbody tr').filter({ hasText: reportRowLabel(rejectTargetTwo) }).first()).toBeVisible()

    const approvedRows = await fetchReportRows(request, 'approved')
    const rejectedRows = await fetchReportRows(request, 'rejected')
    expect(approvedRows.some((row) => row.recordId === approveTarget.recordId)).toBeTruthy()
    expect(rejectedRows.some((row) => row.recordId === rejectTargetOne.recordId)).toBeTruthy()
    expect(rejectedRows.some((row) => row.recordId === rejectTargetTwo.recordId)).toBeTruthy()

    const { token } = await withRetries(() => loginAsAdminApi(request))
    const duplicateResponse = await request.put(`/api/admin/report/${approveTarget.recordId}/approve`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { remark: 'duplicate approve' },
    })
    expect(duplicateResponse.ok(), 'duplicate report approve should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('不能重复')

    expect(runtime.pageErrors, 'reports review runtime errors').toEqual([])
    expect(runtime.apiErrors, 'reports review api runtime errors').toEqual([])
  })

  test('report apis reject anonymous access at runtime', async ({ request }) => {
    const response = await request.get('/api/admin/report/list')
    const raw = await response.text()
    let body: Record<string, unknown> | null = null
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      body = null
    }

    const httpRejected = !response.ok()
    const bodyRejected = body != null && 'code' in body && body.code !== 200
    expect(httpRejected || bodyRejected, `anonymous report list should be rejected, raw=${raw.slice(0, 300)}`).toBeTruthy()
  })
})
