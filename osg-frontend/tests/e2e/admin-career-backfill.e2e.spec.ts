import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

interface StudentPositionSeedRow {
  student_position_id: number
  student_id: number
  student_name: string
  company_name: string
  position_name: string
}

interface StudentPositionRow {
  studentPositionId: number
  positionId?: number | null
  studentName?: string
  companyName: string
  positionName: string
  status: string
}

interface PositionRow {
  positionId: number
  companyName: string
  positionName: string
}

interface JobOverviewSeedRow {
  company_name: string
  pending_application_id: number
  pending_student_id: number
  pending_student_name: string
  mentor_names: string[]
  expected_stats: {
    applied_count: number
    interviewing_count: number
    offer_count: number
  }
}

interface JobOverviewStats {
  appliedCount: number
  interviewingCount: number
  offerCount: number
}

interface JobOverviewFunnelNode {
  label: string
  count: number
}

interface JobOverviewRow {
  applicationId: number
  companyName: string
  studentName?: string
  assignedStatus?: string
  coachingStatus?: string
  mentorName?: string | null
}

interface MockPracticeSeedRow {
  practice_id: number
  student_id: number
  student_name: string
  request_content: string
  mentor_names: string[]
}

interface MockPracticeRow {
  practiceId: number
  studentName?: string
  requestContent: string
  status: string
  mentorNames?: string | null
}

interface AdminSession {
  token: string
  headers: Record<string, string>
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

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue
    }
    query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

function nextDateTimeLocal(daysAhead: number = 2) {
  const value = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  value.setSeconds(0, 0)
  const offsetMinutes = value.getTimezoneOffset()
  const local = new Date(value.getTime() - offsetMinutes * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function seedRows<T>(target: 'student-position' | 'job-overview' | 'mock-practice', count: number): T[] {
  expect(count, `${target} seed count should stay positive`).toBeGreaterThan(0)
  const raw = execFileSync(
    'python3',
    [path.join(repoRoot(), 'bin/runtime_seed_admin.py'), target, '--count', String(count)],
    {
      cwd: repoRoot(),
      encoding: 'utf-8',
    },
  ).trim()
  const body = JSON.parse(raw) as { created?: T[] }
  expect(Array.isArray(body.created), `${target} seed should return created rows, raw=${raw}`).toBeTruthy()
  expect(body.created!.length, `${target} seed should create ${count} rows, raw=${raw}`).toBe(count)
  return body.created!
}

async function createAdminSession(request: APIRequestContext): Promise<AdminSession> {
  const { token } = await withRetries(() => loginAsAdminApi(request), 5)
  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

async function fetchStudentPositionRows(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<StudentPositionRow[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/student-position/list${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/student-position/list',
  )
  return (body?.rows || []) as StudentPositionRow[]
}

async function fetchPositionRows(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<PositionRow[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/position/list${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/position/list',
  )
  return (body?.rows || []) as PositionRow[]
}

async function fetchJobOverviewStats(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<JobOverviewStats> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/job-overview/stats${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/job-overview/stats',
  )
  return body?.data as JobOverviewStats
}

async function fetchJobOverviewFunnel(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<JobOverviewFunnelNode[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/job-overview/funnel${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/job-overview/funnel',
  )
  return (body?.data || []) as JobOverviewFunnelNode[]
}

async function fetchJobOverviewRows(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<JobOverviewRow[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/job-overview/list${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/job-overview/list',
  )
  return (body?.rows || []) as JobOverviewRow[]
}

async function fetchJobOverviewUnassignedRows(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<JobOverviewRow[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/job-overview/unassigned${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/job-overview/unassigned',
  )
  return (body?.rows || []) as JobOverviewRow[]
}

async function fetchMockPracticeRows(
  request: APIRequestContext,
  session: AdminSession,
  params: Record<string, string | number | undefined>,
): Promise<MockPracticeRow[]> {
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/mock-practice/list${buildQuery(params)}`, {
      headers: session.headers,
    }),
    '/api/admin/mock-practice/list',
  )
  return (body?.rows || []) as MockPracticeRow[]
}

async function bootstrapAdminPage(page: Page, token: string) {
  await page.addInitScript(({ value }) => {
    window.localStorage.setItem('osg_token', value)
  }, { value: token })
}

async function openStudentPositionsPage(page: Page, session: AdminSession) {
  const runtime = trackRuntimeErrors(page)
  await bootstrapAdminPage(page, session.token)
  const listResponse = waitForApi(page, '/api/admin/student-position/list').catch(() => null)
  await page.goto('/career/student-positions', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /学生自添岗位/i })).toBeVisible()
  await listResponse
  await expect(page.locator('.student-positions-table')).toBeVisible()
  return runtime
}

async function openJobOverviewPage(page: Page, session: AdminSession) {
  const runtime = trackRuntimeErrors(page)
  await bootstrapAdminPage(page, session.token)
  const statsResponse = waitForApi(page, '/api/admin/job-overview/stats').catch(() => null)
  const listResponse = waitForApi(page, '/api/admin/job-overview/list').catch(() => null)
  const unassignedResponse = waitForApi(page, '/api/admin/job-overview/unassigned').catch(() => null)
  await page.goto('/career/job-overview', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /学员求职总览/i })).toBeVisible()
  await Promise.all([statsResponse, listResponse, unassignedResponse])
  await expect(page.locator('.job-overview-table')).toBeVisible()
  return runtime
}

async function openMockPracticePage(page: Page, session: AdminSession) {
  const runtime = trackRuntimeErrors(page)
  await bootstrapAdminPage(page, session.token)
  const listResponse = waitForApi(page, '/api/admin/mock-practice/list').catch(() => null)
  await page.goto('/career/mock-practice', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /模拟应聘管理/i })).toBeVisible()
  await listResponse
  await expect(page.locator('.mock-practice-table')).toBeVisible()
  return runtime
}

test.describe('Admin Career Ticket Backfill @ticket-backfill', () => {
  test('student added position approval persists into the public library and rejects duplicate approvals', async ({ page, request }) => {
    const seeded = seedRows<StudentPositionSeedRow>('student-position', 1)[0]
    const session = await createAdminSession(request)
    const runtime = await openStudentPositionsPage(page, session)

    const searchResponse = waitForApi(page, '/api/admin/student-position/list')
    await page.getByPlaceholder('搜索公司或岗位名称').fill(seeded.company_name)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const row = page.locator('.student-positions-table tbody tr').filter({ hasText: seeded.company_name }).first()
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: /审核 \/ 编辑|审核/i }).click()
    const reviewModal = page.locator('[data-surface-id="review-student-position-modal"]')
    await expect(reviewModal).toBeVisible()
    await expect(reviewModal).toContainText(seeded.student_name)

    const approveResponses = Promise.all([
      waitForApi(page, `/api/admin/student-position/${seeded.student_position_id}/approve`, 'PUT'),
      waitForApi(page, '/api/admin/student-position/list', 'GET'),
    ])
    await reviewModal.getByRole('button', { name: '保存并通过' }).click()
    await approveResponses

    await expect(page.locator('.student-positions-table tbody tr').filter({ hasText: seeded.company_name })).toHaveCount(0)

    const approvedRows = await fetchStudentPositionRows(request, session, {
      status: 'approved',
      keyword: seeded.company_name,
    })
    const approvedRow = approvedRows.find((item) => item.studentPositionId === seeded.student_position_id)
    expect(approvedRow, `approved student position should exist for ${seeded.company_name}`).toBeTruthy()
    expect(approvedRow?.positionId, 'approved student position should expose public position id').toBeTruthy()

    const publicRows = await fetchPositionRows(request, session, { companyName: seeded.company_name })
    expect(
      publicRows.some((item) => item.companyName === seeded.company_name && item.positionName === seeded.position_name),
      `public position list should contain ${seeded.company_name} / ${seeded.position_name}`,
    ).toBeTruthy()

    const duplicateResponse = await request.put(`/api/admin/student-position/${seeded.student_position_id}/approve`, {
      headers: session.headers,
      data: { department: 'Runtime Review' },
    })
    expect(duplicateResponse.ok(), 'duplicate student-position approval should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('不能重复')

    expect(runtime.pageErrors, 'student-position page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'student-position page api runtime errors').toEqual([])
  })

  test('job overview stats stay real and mentor assignment persists into the live overview surface', async ({ page, request }) => {
    const seeded = seedRows<JobOverviewSeedRow>('job-overview', 1)[0]
    const session = await createAdminSession(request)

    const stats = await fetchJobOverviewStats(request, session, { companyName: seeded.company_name })
    expect(stats.appliedCount).toBe(seeded.expected_stats.applied_count)
    expect(stats.interviewingCount).toBe(seeded.expected_stats.interviewing_count)
    expect(stats.offerCount).toBe(seeded.expected_stats.offer_count)

    const funnel = await fetchJobOverviewFunnel(request, session, { companyName: seeded.company_name })
    const funnelByLabel = new Map(funnel.map((item) => [item.label, item.count]))
    expect(funnelByLabel.get('已投递')).toBe(seeded.expected_stats.applied_count)
    expect(funnelByLabel.get('面试中')).toBe(seeded.expected_stats.interviewing_count)
    expect(funnelByLabel.get('获Offer')).toBe(seeded.expected_stats.offer_count)

    const runtime = await openJobOverviewPage(page, session)
    const pendingRow = page.locator('.job-overview-table tbody tr').filter({ hasText: seeded.company_name }).first()
    await expect(pendingRow).toBeVisible()

    await pendingRow.getByRole('button', { name: '分配导师' }).click()
    const assignModal = page.locator('[data-surface-id="assign-mentor-modal"]')
    await expect(assignModal).toBeVisible()
    if (await assignModal.locator('.assign-mentor-modal__checkbox:checked').count() === 0) {
      await assignModal.locator('.assign-mentor-modal__checkbox').first().check()
    }
    const selectedMentorLabel = assignModal.locator('.assign-mentor-modal__option--selected strong').first()
    await expect(selectedMentorLabel).toBeVisible()
    const expectedMentorName = (await selectedMentorLabel.textContent())?.trim() || ''
    expect(expectedMentorName, 'job overview assignment should expose a selected mentor name').toBeTruthy()
    await assignModal.locator('textarea').fill('runtime mentor assign')

    const assignResponse = waitForApi(page, '/api/admin/job-overview/assign-mentor', 'POST')
    await assignModal.getByRole('button', { name: '确认分配' }).click()
    await assignResponse
    await expect(assignModal).toBeHidden()

    const allTabResponse = waitForApi(page, '/api/admin/job-overview/list', 'GET')
    await page.getByRole('button', { name: /全部学员/i }).click()
    await allTabResponse
    const allRow = page.locator('.job-overview-table tbody tr').filter({ hasText: seeded.company_name }).first()
    await expect(allRow).toBeVisible()
    await expect(allRow).toContainText(expectedMentorName)

    const unassignedRows = await fetchJobOverviewUnassignedRows(request, session, { companyName: seeded.company_name })
    expect(
      unassignedRows.some((item) => item.applicationId === seeded.pending_application_id),
      'assigned application should disappear from unassigned list',
    ).toBeFalsy()

    const allRows = await fetchJobOverviewRows(request, session, { companyName: seeded.company_name })
    const assignedRow = allRows.find((item) => item.applicationId === seeded.pending_application_id)
    expect(assignedRow, `job overview row should exist for application ${seeded.pending_application_id}`).toBeTruthy()
    expect(assignedRow?.assignedStatus).toBe('assigned')
    expect(assignedRow?.coachingStatus).toBe('辅导中')

    const duplicateResponse = await request.post('/api/admin/job-overview/assign-mentor', {
      headers: session.headers,
      data: {
        applicationId: seeded.pending_application_id,
        mentorIds: [9101],
        mentorNames: [expectedMentorName],
      },
    })
    expect(duplicateResponse.ok(), 'duplicate mentor assignment should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('已分配导师')

    expect(runtime.pageErrors, 'job-overview page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'job-overview page api runtime errors').toEqual([])
  })

  test('mock practice assignment persists and duplicate assignment is rejected at runtime', async ({ page, request }) => {
    const seeded = seedRows<MockPracticeSeedRow>('mock-practice', 1)[0]
    const session = await createAdminSession(request)
    const runtime = await openMockPracticePage(page, session)

    const row = page.locator('.mock-practice-table tbody tr').filter({ hasText: seeded.request_content }).first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: '分配导师' }).click()

    const assignModal = page.locator('[data-surface-id="assign-mock-practice-modal"]')
    await expect(assignModal).toBeVisible()
    if (await assignModal.locator('.assign-mock-modal__checkbox:checked').count() === 0) {
      await assignModal.locator('.assign-mock-modal__checkbox').first().check()
    }
    const selectedMentorLabel = assignModal.locator('.assign-mock-modal__option--selected strong').first()
    await expect(selectedMentorLabel).toBeVisible()
    const expectedMentorName = (await selectedMentorLabel.textContent())?.trim() || ''
    expect(expectedMentorName, 'mock-practice assignment should expose a selected mentor name').toBeTruthy()
    await assignModal.locator('input[type="datetime-local"]').fill(nextDateTimeLocal())
    await assignModal.locator('textarea').fill('runtime mock assignment')

    const assignResponses = Promise.all([
      waitForApi(page, '/api/admin/mock-practice/assign', 'POST'),
      waitForApi(page, '/api/admin/mock-practice/list', 'GET'),
    ])
    await assignModal.getByRole('button', { name: '确认安排' }).click()
    await assignResponses

    await expect(page.locator('.mock-practice-table tbody tr').filter({ hasText: seeded.request_content })).toHaveCount(0)

    const allTabResponse = waitForApi(page, '/api/admin/mock-practice/list', 'GET')
    await page.getByRole('button', { name: /全部记录/i }).click()
    await allTabResponse
    const allRow = page.locator('.mock-practice-table tbody tr').filter({ hasText: seeded.request_content }).first()
    await expect(allRow).toBeVisible()
    await expect(allRow).toContainText(expectedMentorName)

    const pendingRows = await fetchMockPracticeRows(request, session, { tab: 'pending', keyword: seeded.student_name })
    expect(
      pendingRows.some((item) => item.practiceId === seeded.practice_id),
      'assigned mock practice should disappear from pending tab',
    ).toBeFalsy()

    const allRows = await fetchMockPracticeRows(request, session, { tab: 'all', keyword: seeded.student_name })
    const assignedRow = allRows.find((item) => item.practiceId === seeded.practice_id)
    expect(assignedRow, `mock practice row should exist for practice ${seeded.practice_id}`).toBeTruthy()
    expect(assignedRow?.status).toBe('scheduled')
    expect(String(assignedRow?.mentorNames || '')).toContain(expectedMentorName)

    const duplicateResponse = await request.post('/api/admin/mock-practice/assign', {
      headers: session.headers,
      data: {
        practiceId: seeded.practice_id,
        mentorIds: [9101],
        mentorNames: [expectedMentorName],
        mentorBackgrounds: ['Runtime Backfill Mentor'],
        scheduledAt: nextDateTimeLocal(3),
      },
    })
    expect(duplicateResponse.ok(), 'duplicate mock-practice assignment should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('不能重复')

    expect(runtime.pageErrors, 'mock-practice page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'mock-practice page api runtime errors').toEqual([])
  })
})
