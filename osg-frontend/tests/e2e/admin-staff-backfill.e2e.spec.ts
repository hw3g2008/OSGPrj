import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdminApi, waitForApi } from './support/auth'

interface StaffSeed {
  staffId: number
  staffName: string
  staffType?: string
  accountStatus?: string
  isBlacklisted?: boolean
  email?: string
  phone?: string
  majorDirection?: string
  subDirection?: string
  region?: string
  city?: string
  hourlyRate?: number
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

async function createAdminSession(request: APIRequestContext): Promise<AdminSession> {
  const { token } = await withRetries(() => loginAsAdminApi(request), 5)
  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

async function bootstrapAdminPage(page: Page, token: string) {
  await page.addInitScript(({ value }) => {
    window.localStorage.setItem('osg_token', value)
  }, { value: token })
}

async function openStaffPage(page: Page, session: AdminSession) {
  const runtime = trackRuntimeErrors(page)
  await bootstrapAdminPage(page, session.token)
  await page.goto('/users/staff', { waitUntil: 'domcontentloaded' })
  const listResponse = waitForApi(page, '/api/admin/staff/list').catch(() => null)
  await expect(page.getByRole('heading', { name: /导师列表/i })).toBeVisible()
  await listResponse
  await expect(page.locator('.staff-table tbody tr').first()).toBeVisible()
  return runtime
}

async function fetchPrimaryStaff(request: APIRequestContext): Promise<StaffSeed> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const body = await assertRuoyiSuccess(
    request.get('/api/admin/staff/list?pageNum=1&pageSize=20', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    '/api/admin/staff/list',
  )
  const first = body?.rows?.[0]
  expect(first?.staffId, 'staff list should expose at least one runtime seed row').toBeTruthy()
  return {
    staffId: first.staffId,
    staffName: first.staffName,
    staffType: first.staffType,
    accountStatus: first.accountStatus,
    isBlacklisted: first.isBlacklisted,
    email: first.email,
    phone: first.phone,
    majorDirection: first.majorDirection,
    subDirection: first.subDirection,
    region: first.region,
    city: first.city,
    hourlyRate: first.hourlyRate,
  }
}

async function fetchStaffRows(request: APIRequestContext, params: Record<string, string | number | undefined> = {}) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const query = new URLSearchParams()
  query.set('pageNum', '1')
  query.set('pageSize', '20')
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue
    }
    query.set(key, String(value))
  }
  const body = await assertRuoyiSuccess(
    request.get(`/api/admin/staff/list?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    '/api/admin/staff/list',
  )
  return (body?.rows || []) as Array<Record<string, any>>
}

async function fetchStaffListPayload(
  request: APIRequestContext,
  params: Record<string, string | number | undefined> = {},
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const query = new URLSearchParams()
  query.set('pageNum', '1')
  query.set('pageSize', '20')
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue
    }
    query.set(key, String(value))
  }
  return assertRuoyiSuccess(
    request.get(`/api/admin/staff/list?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    '/api/admin/staff/list',
  )
}

async function submitStaffChangeRequest(
  request: APIRequestContext,
  staffId: number,
  overrides: {
    fieldKey?: string
    fieldLabel?: string
    beforeValue?: string
    afterValue: string
    remark?: string
  },
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  return assertRuoyiSuccess(
    request.post('/api/admin/staff/change-request', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        staffId,
        fieldKey: overrides.fieldKey || 'city',
        fieldLabel: overrides.fieldLabel || '所在城市',
        beforeValue: overrides.beforeValue || 'London',
        afterValue: overrides.afterValue,
        remark: overrides.remark || 'runtime backfill staff change request',
      },
    }),
    '/api/admin/staff/change-request',
  )
}

async function ensureStaffBaseline(request: APIRequestContext, staff: StaffSeed): Promise<StaffSeed> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const headers = { Authorization: `Bearer ${token}` }
  const normalized: StaffSeed = { ...staff }

  if (normalized.isBlacklisted) {
    await assertRuoyiSuccess(
      request.post('/api/admin/staff/blacklist', {
        headers,
        data: {
          staffId: normalized.staffId,
          action: 'remove',
          reason: 'runtime_backfill_reset',
        },
      }),
      '/api/admin/staff/blacklist',
    )
    normalized.isBlacklisted = false
  }

  if (normalized.accountStatus === '1') {
    await assertRuoyiSuccess(
      request.put('/api/admin/staff/status', {
        headers,
        data: {
          staffId: normalized.staffId,
          action: 'restore',
        },
      }),
      '/api/admin/staff/status',
    )
    normalized.accountStatus = '0'
  }

  if (!normalized.email || normalized.email.length > 30) {
    const suffix = `${Date.now()}`.slice(-6)
    const safeEmail = `sf${normalized.staffId}${suffix}@t.cn`
    await assertRuoyiSuccess(
      request.put('/api/admin/staff', {
        headers,
        data: {
          staffId: normalized.staffId,
          staffName: normalized.staffName,
          email: safeEmail,
          phone: normalized.phone || '13600001111',
          staffType: normalized.staffType || 'mentor',
          majorDirection: normalized.majorDirection || '咨询',
          subDirection: normalized.subDirection || 'Strategy',
          region: normalized.region || '欧洲',
          city: normalized.city || 'London',
          hourlyRate: normalized.hourlyRate ?? 680,
          accountStatus: normalized.accountStatus || '0',
        },
      }),
      '/api/admin/staff',
    )
    normalized.email = safeEmail
  }

  return normalized
}

function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function seedStudentForMentor(
  request: APIRequestContext,
  mentor: StaffSeed,
  studentName: string,
) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const suffix = `${Date.now()}`.slice(-6) + `${Math.floor(Math.random() * 100)}`.padStart(2, '0')
  const email = `mentorbf${suffix}@t.cn`
  return assertRuoyiSuccess(
    request.post('/api/admin/student', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        studentName,
        gender: 'female',
        email,
        school: 'Mentor Runtime University',
        major: 'Finance',
        graduationYear: 2027,
        studyPlan: 'normal',
        targetRegion: 'United Kingdom',
        recruitmentCycle: ['2026 Autumn'],
        majorDirections: ['Consulting'],
        subDirection: 'Strategy',
        leadMentorIds: [mentor.staffId],
        assistantIds: [],
        contractAmount: 9800,
        totalHours: 20,
        startDate: offsetDate(-5),
        endDate: offsetDate(120),
        contractStatus: 'active',
      },
    }),
    '/api/admin/student',
  )
}

test.describe('Admin Staff Ticket Backfill @ticket-backfill', () => {
  test('staff detail and reset-password actions use real backend data', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const runtime = await openStaffPage(page, session)

    const searchResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
    await page.getByPlaceholder('搜索姓名或 ID').fill(primaryStaff.staffName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    const detailResponse = waitForApi(page, `/api/admin/staff/${primaryStaff.staffId}`, 'GET')
    await page.getByRole('menu').getByText('详情', { exact: true }).click()
    await detailResponse

    const detailModal = page.locator('[data-surface-id="staff-detail-modal"]')
    await expect(detailModal).toBeVisible()
    await expect(detailModal).toContainText(primaryStaff.staffName)
    if (primaryStaff.email) {
      await expect(detailModal).toContainText(primaryStaff.email)
    }
    await detailModal.getByRole('button', { name: '关闭' }).click()
    await expect(detailModal).toBeHidden()

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    const resetResponse = waitForApi(page, '/api/admin/staff/reset-password', 'POST')
    await page.getByRole('menu').getByText('重置密码', { exact: true }).click()
    await resetResponse
    const resetModal = page.locator('[data-surface-id="staff-reset-password-modal"]')
    await expect(resetModal).toBeVisible()
    await expect(resetModal).toContainText('Osg@2025')
    await expect(resetModal).toContainText(primaryStaff.email || '')

    expect(runtime.pageErrors, 'staff detail/reset runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff detail/reset api runtime errors').toEqual([])
  })

  test('staff list supports search, filter, tab switch, and mentor students modal', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const seededStudentName = `Mentor Linked ${Date.now()}`
    await seedStudentForMentor(request, primaryStaff, seededStudentName)

    const runtime = await openStaffPage(page, session)

    const searchResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
    await page.getByPlaceholder('搜索姓名或 ID').fill(primaryStaff.staffName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    const firstRow = page.locator('.staff-table tbody tr').first()
    await expect(firstRow).toContainText(primaryStaff.staffName)

    if (primaryStaff.staffType) {
      const filterResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
      await page.locator('.staff-field').filter({ hasText: '类型' }).locator('select').selectOption(primaryStaff.staffType)
      await page.getByRole('button', { name: /^搜索$/ }).click()
      await filterResponse
      await expect(firstRow).toContainText(primaryStaff.staffName)
    }

    await page.getByRole('button', { name: /黑名单列表/i }).click()
    await expect(page.getByRole('button', { name: /正常列表/i })).toBeVisible()
    await page.getByRole('button', { name: /正常列表/i }).click()

    const mentorStudentsResponse = waitForApi(page, '/api/admin/student/list', 'GET')
    await page.locator('.staff-count').first().click()
    await mentorStudentsResponse
    const mentorStudentsModal = page.locator('[data-surface-id="mentor-students-modal"]')
    await expect(mentorStudentsModal).toBeVisible()
    await expect(mentorStudentsModal).toContainText(primaryStaff.staffName)
    await expect(mentorStudentsModal).toContainText(seededStudentName)
    await mentorStudentsModal.getByRole('button', { name: '关闭' }).click()
    await expect(mentorStudentsModal).toBeHidden()

    expect(runtime.pageErrors, 'staff list runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff list api runtime errors').toEqual([])
  })

  test('staff pending review banner is backed by real change request data', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const afterValue = `Runtime City ${Date.now()}`
    await submitStaffChangeRequest(request, primaryStaff.staffId, {
      afterValue,
      beforeValue: primaryStaff.city || 'London',
    })
    const staffListPayload = await fetchStaffListPayload(request)
    expect(Number(staffListPayload?.pendingReviewCount || 0)).toBeGreaterThan(0)

    const runtime = await openStaffPage(page, session)

    const banner = page.locator('.staff-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('导师信息变更待审核')
    await expect(banner).toContainText(/当前有 \d+ 位导师的资料变更待处理/)

    expect(runtime.pageErrors, 'staff pending review runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff pending review api runtime errors').toEqual([])
  })

  test('staff freeze and restore actions persist through the real list page', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const runtime = await openStaffPage(page, session)

    const searchResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
    await page.getByPlaceholder('搜索姓名或 ID').fill(primaryStaff.staffName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    await page.getByRole('menu').getByText('禁用', { exact: true }).click()
    const statusModal = page.locator('[data-surface-id="staff-status-change-modal"]')
    await expect(statusModal).toBeVisible()
    await statusModal.getByRole('combobox').click()
    await page.getByText('排期长期未维护', { exact: true }).click()
    const freezeResponses = Promise.all([
      waitForApi(page, '/api/admin/staff/status', 'PUT'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await statusModal.getByRole('button', { name: '确认' }).click()
    await freezeResponses
    await expect(page.locator('.staff-table tbody tr').first()).toContainText('冻结')

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    await page.getByRole('menu').getByText('解冻', { exact: true }).click()
    await expect(statusModal).toBeVisible()
    const restoreResponses = Promise.all([
      waitForApi(page, '/api/admin/staff/status', 'PUT'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await statusModal.getByRole('button', { name: '确认' }).click()
    await restoreResponses
    await expect(page.locator('.staff-table tbody tr').first()).toContainText('正常')

    expect(runtime.pageErrors, 'staff freeze/restore runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff freeze/restore api runtime errors').toEqual([])
  })

  test('staff blacklist and remove actions persist across normal and blacklist tabs', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const runtime = await openStaffPage(page, session)

    const searchResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
    await page.getByPlaceholder('搜索姓名或 ID').fill(primaryStaff.staffName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    await page.getByRole('menu').getByText('加入黑名单', { exact: true }).click()
    const statusModal = page.locator('[data-surface-id="staff-status-change-modal"]')
    await expect(statusModal).toBeVisible()
    await statusModal.getByRole('combobox').click()
    await page.getByText('严重服务投诉', { exact: true }).click()
    const blacklistResponses = Promise.all([
      waitForApi(page, '/api/admin/staff/blacklist', 'POST'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await statusModal.getByRole('button', { name: '确认' }).click()
    await blacklistResponses

    await page.getByRole('button', { name: /黑名单列表/i }).click()
    await expect(page.locator('.staff-table tbody tr').first()).toContainText(primaryStaff.staffName)

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    await page.getByRole('menu').getByText('移出黑名单', { exact: true }).click()
    await expect(statusModal).toBeVisible()
    const removeResponses = Promise.all([
      waitForApi(page, '/api/admin/staff/blacklist', 'POST'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await statusModal.getByRole('button', { name: '确认' }).click()
    await removeResponses

    await expect(page.locator('.staff-empty')).toContainText('暂无黑名单导师')
    await page.getByRole('button', { name: /正常列表/i }).click()
    await expect(page.locator('.staff-table tbody tr').first()).toContainText(primaryStaff.staffName)

    expect(runtime.pageErrors, 'staff blacklist runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff blacklist api runtime errors').toEqual([])
  })

  test('staff create action persists through the real list page', async ({ page, request }) => {
    const session = await createAdminSession(request)
    const runtime = await openStaffPage(page, session)
    const suffix = `${Date.now()}`.slice(-6)
    const staffName = `Runtime Mentor ${suffix}`
    const email = `st${suffix}@t.cn`

    await page.getByRole('button', { name: /新增导师/i }).click()
    const formModal = page.locator('[data-surface-id="staff-form-modal"]')
    await expect(formModal).toBeVisible()
    await formModal.getByPlaceholder('请输入英文名').fill(staffName)
    await formModal.getByPlaceholder('请输入邮箱').fill(email)
    await formModal.getByPlaceholder('请输入手机号').fill('13600001111')
    await formModal.locator('select').nth(0).selectOption('mentor')
    await formModal.locator('select').nth(1).selectOption('咨询')
    await formModal.getByPlaceholder('请输入子方向').fill('Strategy')
    await formModal.locator('select').nth(2).selectOption('欧洲')
    await formModal.getByPlaceholder('请输入城市').fill('London')
    await formModal.getByPlaceholder('请输入课时单价').fill('680')

    const createResponses = Promise.all([
      waitForApi(page, '/api/admin/staff', 'POST'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await formModal.getByRole('button', { name: '确认' }).click()
    await createResponses
    await expect(formModal).toBeHidden()

    const rows = await fetchStaffRows(request, { staffName })
    const created = rows.find((item) => item.staffName === staffName)
    expect(created, `created staff row should exist for ${staffName}`).toBeTruthy()
    expect(created?.email).toBe(email)
    expect(created?.staffType).toBe('mentor')

    expect(runtime.pageErrors, 'staff create runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff create api runtime errors').toEqual([])
  })

  test('staff edit action persists through the real list page', async ({ page, request }) => {
    const session = await createAdminSession(request)
    let primaryStaff = await fetchPrimaryStaff(request)
    primaryStaff = await ensureStaffBaseline(request, primaryStaff)
    const runtime = await openStaffPage(page, session)
    const editedName = `${primaryStaff.staffName} Edited`
    const editedCity = 'Paris'

    const searchResponse = waitForApi(page, '/api/admin/staff/list', 'GET')
    await page.getByPlaceholder('搜索姓名或 ID').fill(primaryStaff.staffName)
    await page.getByRole('button', { name: /^搜索$/ }).click()
    await searchResponse

    await page.getByRole('button', { name: /更多操作/i }).first().click()
    await page.getByRole('menu').getByText('编辑', { exact: true }).click()
    const formModal = page.locator('[data-surface-id="staff-form-modal"]')
    await expect(formModal).toBeVisible()
    await formModal.getByPlaceholder('请输入英文名').fill(editedName)
    await formModal.getByPlaceholder('请输入城市').fill(editedCity)
    await formModal.getByPlaceholder('请输入邮箱').fill(`ed${String(Date.now()).slice(-6)}@t.cn`)

    const editResponses = Promise.all([
      waitForApi(page, '/api/admin/staff', 'PUT'),
      waitForApi(page, '/api/admin/staff/list', 'GET'),
    ])
    await formModal.getByRole('button', { name: '确认' }).click()
    await editResponses
    await expect(formModal).toBeHidden()

    const rows = await fetchStaffRows(request, { staffName: editedName })
    const edited = rows.find((item) => item.staffId === primaryStaff.staffId)
    expect(edited, `edited staff row should exist for staffId=${primaryStaff.staffId}`).toBeTruthy()
    expect(edited?.staffName).toBe(editedName)
    expect(edited?.city).toBe(editedCity)

    expect(runtime.pageErrors, 'staff edit runtime errors').toEqual([])
    expect(runtime.apiErrors, 'staff edit api runtime errors').toEqual([])
  })
})
