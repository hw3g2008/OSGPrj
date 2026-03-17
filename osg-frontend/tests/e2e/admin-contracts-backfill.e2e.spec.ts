import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

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

async function openContractsPage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  await page.goto('/users/contracts', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /合同管理/i })).toBeVisible()
  await expect(page.locator('.contracts-table tbody tr').first()).toBeVisible()
  return runtime
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

function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function seedStudentWithContract(
  request: APIRequestContext,
  overrides: Partial<{
    studentName: string
    email: string
    contractAmount: number
    totalHours: number
    startDate: string
    endDate: string
    contractStatus: string
    targetRegion: string
    recruitmentCycle: string[]
    majorDirections: string[]
    subDirection: string
  }> = {},
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const suffix = `${Date.now()}`.slice(-6) + `${Math.floor(Math.random() * 100)}`.padStart(2, '0')
  const studentName = overrides.studentName ?? `Contract BF ${suffix}`
  const email = overrides.email ?? `contractbf${suffix}@t.cn`

  const body = await assertRuoyiSuccess(
    request.post('/api/admin/student', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        studentName,
        gender: 'female',
        email,
        school: 'Backfill University',
        major: 'Finance',
        graduationYear: 2027,
        studyPlan: 'normal',
        targetRegion: overrides.targetRegion ?? 'United Kingdom',
        recruitmentCycle: overrides.recruitmentCycle ?? ['2026 Autumn'],
        majorDirections: overrides.majorDirections ?? ['Consulting'],
        subDirection: overrides.subDirection ?? 'Strategy',
        leadMentorIds: [],
        assistantIds: [],
        contractAmount: overrides.contractAmount ?? 19800,
        totalHours: overrides.totalHours ?? 48,
        startDate: overrides.startDate ?? offsetDate(-10),
        endDate: overrides.endDate ?? offsetDate(150),
        contractStatus: overrides.contractStatus ?? 'active',
      },
    }),
    '/api/admin/student',
  )

  return {
    studentId: body?.data?.studentId as number,
    studentName,
    email,
  }
}

async function uploadInvalidAttachment(request: APIRequestContext) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const response = await request.post('/api/admin/contract/upload', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      contractId: '0',
      file: {
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not a pdf'),
      },
    },
  })
  expect(response.ok(), 'invalid upload should still return HTTP 2xx').toBeTruthy()
  return response.json()
}

test.describe('Admin Contracts Ticket Backfill @ticket-backfill', () => {
  test('contracts export button triggers the real export api', async ({ page, request }) => {
    const seeded = await seedStudentWithContract(request, {
      studentName: `Contracts Export ${Date.now()}`,
      contractAmount: 22800,
      totalHours: 40,
    })
    const runtime = await openContractsPage(page)

    const searchResponse = Promise.all([
      waitForApi(page, '/api/admin/contract/list', 'GET'),
      waitForApi(page, '/api/admin/contract/stats', 'GET'),
    ])
    await page.getByPlaceholder('姓名或学员ID').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const exportResponse = waitForApi(page, '/api/admin/contract/export', 'GET')
    await page.locator('.contracts-filters__actions').getByRole('button', { name: /导出/i }).click()
    const exportApi = await exportResponse
    expect(exportApi.status()).toBe(200)

    expect(runtime.pageErrors, 'contracts export runtime errors').toEqual([])
    expect(runtime.apiErrors, 'contracts export api runtime errors').toEqual([])
  })

  test('contracts page supports stats, search, summary row, and detail modal', async ({ page, request }) => {
    const seeded = await seedStudentWithContract(request, {
      studentName: `Contracts Detail ${Date.now()}`,
      contractAmount: 26800,
      totalHours: 64,
    })
    const runtime = await openContractsPage(page)

    const searchResponse = Promise.all([
      waitForApi(page, '/api/admin/contract/list', 'GET'),
      waitForApi(page, '/api/admin/contract/stats', 'GET'),
    ])
    await page.getByPlaceholder('姓名或学员ID').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const firstRow = page.locator('.contracts-table tbody tr').first()
    await expect(firstRow).toContainText(seeded.studentName)
    await expect(page.locator('.contracts-stats__card').first()).toContainText('总合同数')
    await expect(page.locator('.contracts-summary-bar')).toContainText('总金额:')
    await expect(page.locator('.contracts-summary-bar')).toContainText('剩余:')

    const detailResponse = waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET')
    await page.locator('.contracts-link').first().click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="contract-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal).toContainText(`${seeded.studentName}的合同记录`)
    await expect(detailModal).toContainText('合同总金额')
    await expect(detailModal.locator('table tbody tr').first()).toBeVisible()
    await expect(detailModal.getByText('查看附件').or(detailModal.getByText('—').first())).toBeVisible()

    expect(runtime.pageErrors, 'contracts list/detail runtime errors').toEqual([])
    expect(runtime.apiErrors, 'contracts list/detail api runtime errors').toEqual([])
  })

  test('top renew entry supports pdf upload, submit, and list/detail refresh', async ({ page, request }) => {
    const seeded = await seedStudentWithContract(request, {
      studentName: `Contracts Renew ${Date.now()}`,
      contractAmount: 18800,
      totalHours: 36,
    })
    const runtime = await openContractsPage(page)

    const initialSearch = Promise.all([
      waitForApi(page, '/api/admin/contract/list', 'GET'),
      waitForApi(page, '/api/admin/contract/stats', 'GET'),
    ])
    await page.getByPlaceholder('姓名或学员ID').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await initialSearch

    await page.locator('.page-header__actions').getByRole('button', { name: /续签合同/i }).click()
    const renewModal = page.locator('[data-surface-id="renew-contract-modal"]')
    await expect(renewModal).toBeVisible()
    await renewModal.locator('.renew-contract-modal__field').first().locator('select').selectOption(String(seeded.studentId))
    await renewModal.getByLabel('金额 Amount').fill('8800')
    await renewModal.getByLabel('Learn Time').fill('24')
    await renewModal.getByLabel('开始日期').fill(offsetDate(-1))
    await renewModal.getByLabel('结束日期').fill(offsetDate(120))
    await renewModal.getByLabel('续签原因').selectOption('合同到期续签')

    const uploadResponse = waitForApi(page, '/api/admin/contract/upload', 'POST')
    await renewModal.locator('input[type="file"]').setInputFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    })
    const uploadApi = await uploadResponse
    expect(uploadApi.status()).toBe(200)
    await expect(renewModal).toContainText('contract.pdf')

    const submitResponses = Promise.all([
      waitForApi(page, '/api/admin/contract/renew', 'POST'),
      waitForApi(page, '/api/admin/contract/list', 'GET'),
      waitForApi(page, '/api/admin/contract/stats', 'GET'),
    ])
    await renewModal.getByRole('button', { name: /确认续签/i }).click()
    await submitResponses
    await expect(renewModal).toBeHidden()

    await expect(page.locator('.contracts-table tbody tr').first()).toContainText('续签')
    await expect(page.locator('.contracts-table tbody tr').first()).toContainText('合同到期续签')

    const detailResponse = waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET')
    await page.locator('.contracts-link').first().click()
    await detailResponse
    const detailModal = page.locator('[data-surface-id="contract-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal.locator('table tbody tr')).toHaveCount(2)
    await expect(detailModal).toContainText('合同到期续签')
    await expect(detailModal.getByRole('link', { name: /查看附件/i }).first()).toBeVisible()

    expect(runtime.pageErrors, 'contracts renew flow runtime errors').toEqual([])
    expect(runtime.apiErrors, 'contracts renew flow api runtime errors').toEqual([])
  })

  test('row renew entry locks the student and live api rejects non-pdf upload', async ({ page, request }) => {
    const seeded = await seedStudentWithContract(request, {
      studentName: `Contracts Row ${Date.now()}`,
      contractAmount: 14800,
      totalHours: 28,
    })
    const invalidUploadBody = await uploadInvalidAttachment(request)
    expect(invalidUploadBody.code).not.toBe(200)
    expect(String(invalidUploadBody.msg || '')).toMatch(/pdf/i)

    const runtime = await openContractsPage(page)

    const searchResponse = Promise.all([
      waitForApi(page, '/api/admin/contract/list', 'GET'),
      waitForApi(page, '/api/admin/contract/stats', 'GET'),
    ])
    await page.getByPlaceholder('姓名或学员ID').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.locator('.contracts-actions').first().getByRole('button', { name: '续签' }).click()
    const renewModal = page.locator('[data-surface-id="renew-contract-modal"]')
    await expect(renewModal).toBeVisible()
    await expect(renewModal).toContainText('列表续签入口')
    await expect(renewModal).toContainText(`${seeded.studentName} · ID ${seeded.studentId}`)
    await expect(renewModal.locator('.renew-contract-modal__field').first().locator('.renew-contract-modal__locked')).toBeVisible()
    await renewModal.getByRole('button', { name: '取消' }).click()
    await expect(renewModal).toBeHidden()

    expect(runtime.pageErrors, 'contracts row renew runtime errors').toEqual([])
    expect(runtime.apiErrors, 'contracts row renew api runtime errors').toEqual([])
  })
})
