import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'
import { loginAsAdminApi } from './auth'

/**
 * RULE-A 5 端联动主链 e2e 用——自建测试账号工厂。
 *
 * 不依赖 pre-existing demo 账号；每次 spec 创建独立账号、跑完链路、
 * afterAll 清理。所有创建走 admin API + 默认密码 Osg@2026。
 */

const DEFAULT_PASSWORD = 'Osg@2026'

export interface SeededStudent {
  studentId: number
  studentName: string
  email: string
  password: string
}

export interface SeededStaff {
  staffId: number
  staffName: string
  email: string
  staffType: 'mentor' | 'lead_mentor' | 'assistant'
  password: string
}

interface AdminAuth {
  request: APIRequestContext
  token: string
}

export async function adminAuth(request: APIRequestContext): Promise<AdminAuth> {
  const { token } = await loginAsAdminApi(request)
  return { request, token }
}

/**
 * 调用 admin POST /api/admin/student 创建测试学员。
 * payload 字段参照 osg-frontend/packages/admin/src/views/users/students/index.vue
 * AddStudentFormPayload（line 267-288）。
 */
export async function createTestStudent(
  auth: AdminAuth,
  options: { name: string; email: string }
): Promise<SeededStudent> {
  const payload = {
    studentName: options.name,
    gender: 'male',
    email: options.email,
    school: 'E2E Test University',
    major: 'Finance',
    graduationYear: new Date().getFullYear() + 1,
    studyPlan: 'normal',
    targetRegion: ['na'],
    recruitmentCycle: ['2026 Summer'],
    majorDirections: ['finance'],
    subDirections: ['investment_banking'],
    leadMentorIds: [],
    assistantIds: [],
    currency: 'USD',
    amountUsd: 10000,
    totalHours: 80,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    attachmentPath: '/tmp/e2e-test-contract.pdf',
  }
  const response = await auth.request.post('/api/admin/student', {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: payload,
  })
  const raw = await response.text()
  let body: any
  try { body = JSON.parse(raw) } catch { throw new Error(`/admin/student returned non-JSON: ${raw.slice(0, 500)}`) }
  expect(response.ok(), `create student ${options.name}: HTTP ${response.status()}, body=${raw.slice(0, 500)}`).toBeTruthy()
  expect(body?.code, `/admin/student should return code=200, body=${raw.slice(0, 500)}`).toBe(200)
  const studentId = body?.data?.studentId ?? body?.studentId
  expect(studentId, `created student should expose studentId, body=${JSON.stringify(body).slice(0, 300)}`).toBeTruthy()
  return {
    studentId,
    studentName: options.name,
    email: options.email,
    password: DEFAULT_PASSWORD,
  }
}

/**
 * 调用 admin POST /api/admin/staff 创建测试 mentor / lead_mentor / assistant。
 */
export async function createTestStaff(
  auth: AdminAuth,
  options: { name: string; email: string; staffType: 'mentor' | 'lead_mentor' | 'assistant' }
): Promise<SeededStaff> {
  const payload = {
    staffName: options.name,
    staffType: options.staffType,
    email: options.email,
    phone: `100${Math.floor(Math.random() * 1e8)}`.slice(0, 11),
    majorDirection: 'finance',
    subDirection: 'investment_banking',
    region: 'na',
    city: 'new_york',
    hourlyRate: 80,
    accountStatus: 'active',
  }
  const response = await auth.request.post('/api/admin/staff', {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: payload,
  })
  const raw = await response.text()
  let body: any
  try { body = JSON.parse(raw) } catch { throw new Error(`/admin/staff returned non-JSON: ${raw.slice(0, 500)}`) }
  expect(response.ok(), `create staff ${options.name}: HTTP ${response.status()}, body=${raw.slice(0, 500)}`).toBeTruthy()
  expect(body?.code, `/admin/staff should return code=200, body=${raw.slice(0, 500)}`).toBe(200)
  const staffId = body?.staffId ?? body?.data?.staffId
  expect(staffId, `created staff should expose staffId, body=${JSON.stringify(body).slice(0, 300)}`).toBeTruthy()
  return {
    staffId,
    staffName: options.name,
    email: options.email,
    staffType: options.staffType,
    password: DEFAULT_PASSWORD,
  }
}

/**
 * 把 lead-mentor 和 assistant 绑到 student 的督导关系上（关键：让 lead-mentor / assistant
 * 能在「我管理的学员」栏看到该 student）。
 */
export async function bindMentorshipToStudent(
  auth: AdminAuth,
  studentId: number,
  options: { leadMentorIds?: number[]; assistantIds?: number[] }
) {
  const payload: Record<string, unknown> = { studentId }
  if (options.leadMentorIds) payload.leadMentorIds = options.leadMentorIds
  if (options.assistantIds) payload.assistantIds = options.assistantIds
  const response = await auth.request.put('/api/admin/student', {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: payload,
  })
  const body = await response.json()
  expect(response.ok(), `bind mentorship should succeed: ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy()
  expect(body?.code, 'PUT /admin/student should return code=200').toBe(200)
}

/**
 * 拆迁后清理：admin 端目前无 DELETE student / staff 端点，
 * 改用 PUT /admin/students/status 把账号置为 refunded (3) 实现软删除。
 * 邮箱已带 timestamp，二次跑不冲突，cleanup 失败不阻塞 e2e。
 */
export async function softDeleteTestStudent(auth: AdminAuth, studentId: number) {
  try {
    await auth.request.put('/api/admin/students/status', {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: { studentId, action: 'refund' },
    })
  } catch {
    // ignore
  }
}

export async function softDeleteTestStaff(auth: AdminAuth, staffId: number) {
  try {
    await auth.request.post('/api/admin/staff/change-request', {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: { staffId, action: 'freeze' },
    })
  } catch {
    // ignore
  }
}

/**
 * 学员 + staff 登录用 username = email（OsgStudentServiceImpl#createStudentAccount
 * line 489 把 sysUser.userName 设置为 student.email；OsgStaffServiceImpl 同口径）。
 */
export function studentLoginUsername(student: SeededStudent): string {
  return student.email
}

export function staffLoginUsername(staff: SeededStaff): string {
  return staff.email
}
