import { execFileSync } from 'node:child_process'
import path from 'node:path'
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

async function openStudentsPage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  const listResponse = waitForApi(page, '/api/admin/student/list').catch(() => null)
  await page.goto('/users/students', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /学员列表/i })).toBeVisible()
  await listResponse
  await expect(page.locator('.permission-table tbody tr').first()).toBeVisible()
  return runtime
}

function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
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

interface StudentHoursSeedRow {
  student_id: number
  student_name: string
  contract_no: string
  total_hours: number
  approved_hours: number
  remaining_hours: number
}

function seedStudentHours(count: number): StudentHoursSeedRow[] {
  expect(count, 'student-hours seed count should stay positive').toBeGreaterThan(0)
  const raw = execFileSync(
    'python3',
    [path.join(repoRoot(), 'bin/runtime_seed_admin.py'), 'student-hours', '--count', String(count)],
    {
      cwd: repoRoot(),
      encoding: 'utf-8',
    },
  ).trim()
  const body = JSON.parse(raw) as { created?: StudentHoursSeedRow[] }
  expect(Array.isArray(body.created), `student-hours seed should return created rows, raw=${raw}`).toBeTruthy()
  expect(body.created!.length, `student-hours seed should create ${count} rows, raw=${raw}`).toBe(count)
  return body.created!
}

async function seedStudent(
  request: APIRequestContext,
  overrides: Partial<{
    studentName: string
    email: string
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
  const studentName = overrides.studentName ?? `BF ${suffix}`
  const email = overrides.email ?? `bf${suffix}@t.cn`

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
        contractAmount: 12800,
        totalHours: overrides.totalHours ?? 32,
        startDate: overrides.startDate ?? offsetDate(-7),
        endDate: overrides.endDate ?? offsetDate(180),
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

async function submitStudentChangeRequest(
  request: APIRequestContext,
  studentId: number,
  afterValue: string,
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  return assertRuoyiSuccess(
    request.post('/api/admin/student/change-request', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        studentId,
        changeType: 'profile',
        fieldKey: 'school',
        fieldLabel: '学校',
        beforeValue: 'Backfill University',
        afterValue,
        remark: 'runtime backfill',
      },
    }),
    '/api/admin/student/change-request',
  )
}

async function submitContactChangeRequest(
  request: APIRequestContext,
  studentId: number,
  afterValue: string,
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  return assertRuoyiSuccess(
    request.post('/api/admin/student/change-request', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        studentId,
        changeType: 'contact',
        fieldKey: 'phone',
        fieldLabel: '电话',
        beforeValue: '',
        afterValue,
        remark: 'runtime backfill contact',
      },
    }),
    '/api/admin/student/change-request',
  )
}

async function fetchStudentChangeRequestList(
  request: APIRequestContext,
  studentId: number,
  status?: string,
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const query = status ? `?studentId=${studentId}&status=${status}` : `?studentId=${studentId}`
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/student/change-request/list${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    '/api/admin/student/change-request/list',
  )
  return body?.rows || []
}

async function changeStudentStatus(
  request: APIRequestContext,
  studentId: number,
  action: 'freeze' | 'restore' | 'refund',
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  return assertRuoyiSuccess(
    request.put('/api/admin/student/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        studentId,
        action,
      },
    }),
    '/api/admin/student/status',
  )
}

async function fetchStudentExport(request: APIRequestContext, studentName?: string) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const query = studentName ? `?studentName=${encodeURIComponent(studentName)}` : ''
  const response = await request.get(`/api/admin/student/export${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(response.ok(), 'student export api should return HTTP 2xx').toBeTruthy()
  return response.body()
}

test.describe('Admin Students Ticket Backfill @ticket-backfill', () => {
  test('students list supports tab switching, filtering, export, add modal shell, and detail modal', async ({ page, request }) => {
    const seeded = await seedStudent(request)
    const runtime = await openStudentsPage(page)

    const searchResponseInitial = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponseInitial

    await expect(page.locator('.students-link').first()).toContainText(seeded.studentName)

    const blacklistTabResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByRole('button', { name: /黑名单/i }).click()
    await blacklistTabResponse
    await expect(page.getByRole('cell', { name: '暂无黑名单学员' })).toBeVisible()

    const normalTabResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByRole('button', { name: /正常列表/i }).click()
    await normalTabResponse

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse
    await expect(page.locator('.permission-table tbody tr').first()).toContainText(seeded.studentName)

    await expect(page.locator('.students-filter-bar').getByRole('button', { name: /^导出$/ })).toBeVisible()
    const exportBody = await fetchStudentExport(request, seeded.studentName)
    expect(exportBody.length).toBeGreaterThan(0)

    const resetResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByRole('button', { name: /^重置$/ }).click()
    await resetResponse

    await page.locator('.students-page__add-button').click()
    const addModal = page.locator('[data-surface-id="student-add-modal"]')
    await expect(addModal).toBeVisible()
    await expect(addModal.getByText('Step 1 · 基本信息')).toBeVisible()
    await expect(addModal.getByPlaceholder('例如 Emily Zhang')).toBeVisible()
    await expect(addModal.getByPlaceholder('学生邮箱将自动作为登录账号')).toBeVisible()
    await expect(addModal.getByText('班主任与助教均支持搜索后多选')).toBeVisible()
    await expect(addModal.getByText('选择主攻方向后，这里会自动显示对应的子方向。')).toBeVisible()
    await addModal.getByRole('button', { name: /Finance \/ 金融/i }).click()
    await expect(addModal.getByText('当前已开放 6 个子方向选项。')).toBeVisible()
    await addModal.locator('[data-surface-part="close-control"]').click()
    await expect(addModal).toBeHidden()

    const detailResponse = Promise.all([
      waitForApi(page, `/api/admin/student/${seeded.studentId}`, 'GET'),
      waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await page.locator('.students-link').first().click()
    await detailResponse
    await expect(page.locator('[data-surface-id="student-detail-modal"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /基本信息/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /信息变更/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /合同信息/i })).toBeVisible()

    expect(runtime.pageErrors, 'students page runtime errors').toEqual([])
    expect(runtime.apiErrors, 'students page api runtime errors').toEqual([])
  })

  test('student detail supports switching to the edit modal from the real detail surface', async ({ page, request }) => {
    const seeded = await seedStudent(request)
    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const detailResponse = Promise.all([
      waitForApi(page, `/api/admin/student/${seeded.studentId}`, 'GET'),
      waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await page.locator('.students-link').first().click()
    await detailResponse
    await page.getByRole('button', { name: /前往编辑页/i }).click()

    await expect(page.locator('[data-surface-id="student-detail-modal"]')).toBeHidden()
    await expect(page.locator('[data-surface-id="student-edit-modal"]')).toBeVisible()
    await expect(page.getByText(/编辑学员 -/i)).toBeVisible()

    expect(runtime.pageErrors, 'detail edit flow runtime errors').toEqual([])
    expect(runtime.apiErrors, 'detail edit flow api runtime errors').toEqual([])
  })

  test('student edit and reset-password actions persist through the real list page', async ({ page, request }) => {
    const seeded = await seedStudent(request, {
      studentName: `Edit Student ${Date.now()}`,
    })
    const runtime = await openStudentsPage(page)
    const updatedEmail = `ed${String(Date.now()).slice(-6)}@t.cn`
    const updatedSchool = `Edited University ${Date.now()}`
    const updatedDirection = '咨询'
    const updatedTarget = `Strategy ${Date.now()}`

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: '编辑' }).first().click()
    const editModal = page.locator('[data-surface-id="student-edit-modal"]')
    await expect(editModal).toBeVisible()
    await editModal.getByLabel('邮箱').fill(updatedEmail)
    await editModal.getByLabel('学校').fill(updatedSchool)
    await editModal.getByLabel('主攻方向').fill(updatedDirection)
    await editModal.getByLabel('目标岗位').fill(updatedTarget)

    const editResponses = Promise.all([
      waitForApi(page, '/api/admin/student', 'PUT'),
      waitForApi(page, '/api/admin/student/list', 'GET'),
    ])
    await editModal.getByRole('button', { name: '保存修改' }).click()
    await editResponses
    await expect(editModal).toBeHidden()

    const firstRow = page.locator('.permission-table tbody tr').first()
    await expect(firstRow).toContainText(updatedEmail)
    await expect(firstRow).toContainText(updatedSchool)
    await expect(firstRow).toContainText(updatedDirection)
    await expect(firstRow).toContainText(updatedTarget)

    await page.getByRole('button', { name: /更多/i }).first().click()
    const resetResponse = waitForApi(page, '/api/admin/student/reset-password', 'POST')
    await page.getByRole('menu').getByText('重置密码', { exact: true }).click()
    await resetResponse
    const resetDialog = page.getByRole('dialog')
    await expect(resetDialog).toContainText('Osg@2026')
    await expect(resetDialog).toContainText(`登录账号：${updatedEmail}`)

    expect(runtime.pageErrors, 'student edit/reset runtime errors').toEqual([])
    expect(runtime.apiErrors, 'student edit/reset api runtime errors').toEqual([])
  })

  test('student status action should open the real status-change modal instead of placeholder info copy', async ({ page, request }) => {
    const seeded = await seedStudent(request)
    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多/i }).first().click()
    await page.getByText('冻结', { exact: true }).click()

    await expect(page.locator('[data-surface-id="student-status-change-modal"]')).toBeVisible()
    await expect(page.getByText('原因 *', { exact: true })).toBeVisible()

    expect(runtime.pageErrors, 'status change flow runtime errors').toEqual([])
    expect(runtime.apiErrors, 'status change flow api runtime errors').toEqual([])
  })

  test('student blacklist action should open the real blacklist modal instead of placeholder info copy', async ({ page, request }) => {
    const seeded = await seedStudent(request)
    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多/i }).first().click()
    await page.getByText('加入黑名单', { exact: true }).click()

    await expect(page.locator('[data-surface-id="student-blacklist-modal"]')).toBeVisible()
    await expect(page.getByText('加入原因')).toBeVisible()

    expect(runtime.pageErrors, 'blacklist flow runtime errors').toEqual([])
    expect(runtime.apiErrors, 'blacklist flow api runtime errors').toEqual([])
  })

  test('students page shows pending-review banner and real row states for low-hours, expiring, and refunded students', async ({ page, request }) => {
    const lowHours = await seedStudent(request, {
      studentName: `Low Hours ${Date.now()}`,
      totalHours: 4,
      endDate: offsetDate(90),
      contractStatus: 'active',
    })
    const expiring = await seedStudent(request, {
      studentName: `Expiring ${Date.now()}`,
      totalHours: 12,
      endDate: offsetDate(10),
      contractStatus: 'active',
    })
    const pending = await seedStudent(request, {
      studentName: `Pending ${Date.now()}`,
      totalHours: 18,
      endDate: offsetDate(45),
      contractStatus: 'active',
    })
    const refunded = await seedStudent(request, {
      studentName: `Refunded ${Date.now()}`,
      totalHours: 20,
      endDate: offsetDate(60),
      contractStatus: 'active',
    })
    await submitStudentChangeRequest(request, pending.studentId, `Updated University ${Date.now()}`)
    await changeStudentStatus(request, refunded.studentId, 'refund')

    const runtime = await openStudentsPage(page)

    const searchPending = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(pending.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchPending
    await expect(page.locator('.students-banner')).toContainText('信息变更待审核')
    await expect(page.locator('.permission-table tbody tr').first()).toHaveClass(/students-row--pending-review/)
    await expect(page.locator('.students-banner')).toContainText('待审核')

    const searchLowHours = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(lowHours.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchLowHours
    await expect(page.locator('.permission-table tbody tr').first()).toHaveClass(/students-row--low-hours/)
    await expect(page.locator('.students-reminder-cell .students-tag').first()).toContainText('课时不足')

    const searchExpiring = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(expiring.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchExpiring
    await expect(page.locator('.permission-table tbody tr').first()).toHaveClass(/students-row--contract-expiring/)
    await expect(page.locator('.students-reminder-cell .students-tag').first()).toContainText('合同到期')

    const searchRefunded = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(refunded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchRefunded
    await expect(page.locator('.permission-table tbody tr').first()).toHaveClass(/students-row--refunded/)
    await expect(page.locator('.permission-table tbody tr').first().locator('td').nth(13)).toContainText('退费')

    expect(runtime.pageErrors, 'student row state runtime errors').toEqual([])
    expect(runtime.apiErrors, 'student row state api runtime errors').toEqual([])
  })

  test('students api rejects anonymous access at runtime', async ({ request }) => {
    const response = await request.get('/api/admin/student/list')
    const raw = await response.text()
    let body: Record<string, unknown> | null = null
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      body = null
    }

    const httpRejected = !response.ok()
    const bodyRejected = body != null && 'code' in body && body.code !== 200
    expect(httpRejected || bodyRejected, `anonymous student list should be rejected, raw=${raw.slice(0, 300)}`).toBeTruthy()
  })

  test('student detail contract summary reflects real approved class hours at runtime', async ({ page }) => {
    const seeded = seedStudentHours(1)[0]
    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.student_name)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const detailResponse = Promise.all([
      waitForApi(page, `/api/admin/student/${seeded.student_id}`, 'GET'),
      waitForApi(page, `/api/admin/student/${seeded.student_id}/contracts`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await page.locator('.students-link').first().click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="student-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal.locator('.student-detail-modal__stat-card').filter({ hasText: '总课时' })).toContainText(`${seeded.total_hours}h`)
    await expect(detailModal.locator('.student-detail-modal__stat-card').filter({ hasText: '剩余课时' })).toContainText(`${seeded.remaining_hours}h`)

    await detailModal.getByRole('button', { name: /合同信息/i }).click()
    const contractTab = detailModal.locator('.contract-tab')
    await expect(contractTab).toContainText(seeded.contract_no)
    await expect(contractTab).toContainText(`已用课时${seeded.approved_hours}h`)
    await expect(contractTab).toContainText(`${seeded.total_hours}h / 剩余 ${seeded.remaining_hours}h`)

    expect(runtime.pageErrors, 'student detail hours runtime errors').toEqual([])
    expect(runtime.apiErrors, 'student detail hours api runtime errors').toEqual([])
  })

  test('contact-field changes auto-apply and appear in student detail history immediately', async ({ page, request }) => {
    const seeded = await seedStudent(request, {
      studentName: `Contact Change ${Date.now()}`,
    })
    const nextPhone = `+1 617-555-${String(Date.now()).slice(-4)}`
    await submitContactChangeRequest(request, seeded.studentId, nextPhone)

    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const detailResponse = Promise.all([
      waitForApi(page, `/api/admin/student/${seeded.studentId}`, 'GET'),
      waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await page.locator('.students-link').first().click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="student-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal).toContainText(nextPhone)

    await detailModal.getByRole('button', { name: /信息变更/i }).click()
    await expect(detailModal).toContainText('当前没有待审核的信息变更。')
    await expect(detailModal).toContainText('自动生效')
    await expect(detailModal).toContainText('电话')
    await expect(detailModal).toContainText(nextPhone)

    expect(runtime.pageErrors, 'contact change runtime errors').toEqual([])
    expect(runtime.apiErrors, 'contact change api runtime errors').toEqual([])
  })

  test('pending student change approvals persist profile updates and reject duplicate approvals', async ({ page, request }) => {
    const seeded = await seedStudent(request, {
      studentName: `Approve Change ${Date.now()}`,
    })
    const nextSchool = `Updated University ${Date.now()}`
    await submitStudentChangeRequest(request, seeded.studentId, nextSchool)
    const pendingRequests = await fetchStudentChangeRequestList(request, seeded.studentId, 'pending')
    const targetRequest = pendingRequests.find((item: Record<string, unknown>) => item.afterValue === nextSchool)
    expect(targetRequest?.requestId, 'pending student change request should exist before approval').toBeTruthy()

    const runtime = await openStudentsPage(page)

    const searchResponse = waitForApi(page, '/api/admin/student/list')
    await page.getByPlaceholder('姓名').fill(seeded.studentName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const detailResponse = Promise.all([
      waitForApi(page, `/api/admin/student/${seeded.studentId}`, 'GET'),
      waitForApi(page, `/api/admin/student/${seeded.studentId}/contracts`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await page.locator('.students-link').first().click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="student-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await detailModal.getByRole('button', { name: /信息变更/i }).click()
    await expect(detailModal).toContainText(nextSchool)

    const approveResponses = Promise.all([
      waitForApi(page, `/api/admin/student/change-request/${targetRequest.requestId}/approve`, 'PUT'),
      waitForApi(page, `/api/admin/student/${seeded.studentId}`, 'GET'),
      waitForApi(page, '/api/admin/student/change-request/list', 'GET'),
    ])
    await detailModal.getByRole('button', { name: '通过' }).first().click()
    await approveResponses

    await expect(detailModal).toContainText('当前没有待审核的信息变更。')
    await expect(detailModal).toContainText('已通过')
    await detailModal.getByRole('button', { name: /基本信息/i }).click()
    await expect(detailModal).toContainText(nextSchool)

    const { token } = await withRetries(() => loginAsAdminApi(request))
    const duplicateResponse = await request.put(`/api/admin/student/change-request/${targetRequest.requestId}/approve`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {},
    })
    expect(duplicateResponse.ok(), 'duplicate student change approval should still return HTTP 2xx').toBeTruthy()
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.code).not.toBe(200)
    expect(String(duplicateBody.msg || '')).toContain('不能重复')

    expect(runtime.pageErrors, 'student change approval runtime errors').toEqual([])
    expect(runtime.apiErrors, 'student change approval api runtime errors').toEqual([])
  })
})
