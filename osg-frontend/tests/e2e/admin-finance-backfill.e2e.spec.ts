import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

interface FinanceSettlementRow {
  settlementId: number
  recordId: number
  recordCode?: string | null
  mentorName: string
  studentName: string
  paymentStatus: 'unpaid' | 'paid'
  paymentDate?: string | null
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

function financeRowLabel(row: FinanceSettlementRow) {
  return row.recordCode || `#R${row.recordId}`
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function buildReference(prefix: string) {
  return `${prefix}-${Date.now()}`
}

function repoRoot() {
  return path.resolve(__dirname, '../../..')
}

function seedFinanceRows(count: number) {
  expect(count, 'finance seed count should stay positive').toBeGreaterThan(0)
  const raw = execFileSync(
    'python3',
    [path.join(repoRoot(), 'bin/runtime_seed_admin.py'), 'finance', '--count', String(count)],
    {
      cwd: repoRoot(),
      encoding: 'utf-8',
    },
  ).trim()
  const body = JSON.parse(raw) as { created?: Array<Record<string, unknown>> }
  expect(Array.isArray(body.created), `finance seed should return created rows, raw=${raw}`).toBeTruthy()
  expect(body.created!.length, `finance seed should create ${count} rows, raw=${raw}`).toBe(count)
}

async function openFinancePage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  await page.goto('/finance/settlement', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /财务结算/i })).toBeVisible()
  await expect(page.locator('.settlement-table')).toBeVisible()
  return runtime
}

function financeRefreshPromises(page: Page): [Promise<APIResponse>, Promise<APIResponse>] {
  return [
    waitForApi(page, '/api/admin/finance/list', 'GET'),
    waitForApi(page, '/api/admin/finance/stats', 'GET'),
  ]
}

async function fetchFinanceRows(
  request: APIRequestContext,
  tab: 'unpaid' | 'paid',
): Promise<FinanceSettlementRow[]> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/finance/list?tab=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    '/api/admin/finance/list',
  )
  return (body?.rows || []) as FinanceSettlementRow[]
}

async function ensureFinanceRows(
  request: APIRequestContext,
  minimumCount: number,
): Promise<FinanceSettlementRow[]> {
  let unpaidRows = await fetchFinanceRows(request, 'unpaid')
  if (unpaidRows.length >= minimumCount) {
    return unpaidRows
  }
  seedFinanceRows(minimumCount - unpaidRows.length)
  unpaidRows = await fetchFinanceRows(request, 'unpaid')
  expect(unpaidRows.length, `finance seed should lift unpaid rows to at least ${minimumCount}`).toBeGreaterThanOrEqual(minimumCount)
  return unpaidRows
}

test.describe('Admin Finance Ticket Backfill @ticket-backfill', () => {
  test('finance settlement page supports real stats, tab switch, and runtime stability', async ({ page, request }) => {
    const unpaidRows = await ensureFinanceRows(request, 1)
    const referenceRow = unpaidRows[0]
    const runtime = await openFinancePage(page)

    const matchedRow = page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(referenceRow) }).first()
    await expect(matchedRow).toContainText(financeRowLabel(referenceRow))
    await expect(page.locator('.stat-card').first()).toContainText('未支付')
    await expect(page.locator('.stat-card').nth(1)).toContainText('本月已支付')
    await expect(page.locator('.stat-card').nth(2)).toContainText('本周课程数')

    const paidResponses = Promise.all(financeRefreshPromises(page))
    await page.getByRole('button', { name: /已支付/i }).first().click()
    await paidResponses
    await expect(page.locator('.settlement-table')).toBeVisible()

    const unpaidResponses = Promise.all(financeRefreshPromises(page))
    await page.getByRole('button', { name: /未支付/i }).first().click()
    await unpaidResponses
    await expect(page.locator('.settlement-table')).toBeVisible()

    expect(runtime.pageErrors, 'finance page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'finance page api runtime errors').toEqual([])
  })

  test('single pay, batch pay, and duplicate rejection persist through the live finance surface', async ({ page, request }) => {
    const unpaidRows = await ensureFinanceRows(request, 3)
    const [singleTarget, batchTargetOne, batchTargetTwo] = unpaidRows
    const paymentDate = todayIsoDate()
    const runtime = await openFinancePage(page)

    const singleRow = page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(singleTarget) }).first()
    await expect(singleRow).toBeVisible()

    const singleResponses = Promise.all([
      waitForApi(page, `/api/admin/finance/${singleTarget.settlementId}/mark-paid`, 'PUT'),
      ...financeRefreshPromises(page),
    ])
    await singleRow.getByRole('button', { name: '标记支付' }).click()
    const markPaidModal = page.locator('.mark-paid-modal__panel')
    await expect(markPaidModal).toBeVisible()
    await markPaidModal.getByLabel('支付日期').fill(paymentDate)
    await markPaidModal.getByLabel('银行流水号').fill(buildReference('single'))
    await markPaidModal.getByLabel('备注').fill('runtime single pay')
    await markPaidModal.getByRole('button', { name: '确认已支付' }).click()
    await singleResponses

    await expect(page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(singleTarget) })).toHaveCount(0)

    const batchRowOne = page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(batchTargetOne) }).first()
    const batchRowTwo = page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(batchTargetTwo) }).first()
    await expect(batchRowOne).toBeVisible()
    await expect(batchRowTwo).toBeVisible()
    await batchRowOne.locator('input[type="checkbox"]').check()
    await batchRowTwo.locator('input[type="checkbox"]').check()

    const batchResponses = Promise.all([
      waitForApi(page, '/api/admin/finance/batch-pay', 'PUT'),
      ...financeRefreshPromises(page),
    ])
    await page.getByRole('button', { name: '批量标记已支付' }).click()
    await expect(markPaidModal).toBeVisible()
    await markPaidModal.getByLabel('支付日期').fill(paymentDate)
    await markPaidModal.getByLabel('银行流水号').fill(buildReference('batch'))
    await markPaidModal.getByLabel('备注').fill('runtime batch pay')
    await markPaidModal.getByRole('button', { name: '确认已支付' }).click()
    await batchResponses

    const paidResponses = Promise.all(financeRefreshPromises(page))
    await page.getByRole('button', { name: /已支付/i }).first().click()
    await paidResponses

    for (const row of [singleTarget, batchTargetOne, batchTargetTwo]) {
      await expect(page.locator('.settlement-table tbody tr').filter({ hasText: financeRowLabel(row) }).first()).toBeVisible()
    }

    const paidRows = await fetchFinanceRows(request, 'paid')
    const paidById = new Map(paidRows.map((row) => [row.settlementId, row]))
    for (const row of [singleTarget, batchTargetOne, batchTargetTwo]) {
      const paidRow = paidById.get(row.settlementId)
      expect(paidRow, `paid list should contain settlement ${row.settlementId}`).toBeTruthy()
      expect(paidRow?.paymentStatus).toBe('paid')
      expect(paidRow?.paymentDate, `settlement ${row.settlementId} should persist payment date`).toContain(paymentDate)
    }

    const { token } = await withRetries(() => loginAsAdminApi(request))
    const duplicateResponse = await request.put(`/api/admin/finance/${singleTarget.settlementId}/mark-paid`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        paymentDate,
        bankReferenceNo: buildReference('dup'),
      },
    })
    expect(duplicateResponse.ok(), 'duplicate finance mark-paid should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('不能重复')

    expect(runtime.pageErrors, 'finance mark-paid runtime errors').toEqual([])
    expect(runtime.apiErrors, 'finance mark-paid api runtime errors').toEqual([])
  })

  test('finance apis reject anonymous access at runtime', async ({ request }) => {
    const response = await request.get('/api/admin/finance/list')
    const raw = await response.text()
    let body: Record<string, unknown> | null = null
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      body = null
    }

    const httpRejected = !response.ok()
    const bodyRejected = body != null && 'code' in body && body.code !== 200
    expect(httpRejected || bodyRejected, `anonymous finance list should be rejected, raw=${raw.slice(0, 300)}`).toBeTruthy()
  })
})
