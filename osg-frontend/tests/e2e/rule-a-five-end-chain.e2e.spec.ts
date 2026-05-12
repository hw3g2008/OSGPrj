import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  adminAuth,
  adminApproveLatestClassRecordForCoaching,
  adminApproveMentorChangeRequest,
  adminApproveStudentPositionMerge,
  bindMentorshipToStudent,
  createTestPosition,
  createTestStaff,
  createTestStudent,
  getStudentApplicationList,
  leadMentorAssignCoachingMentor,
  loginAsStaff,
  loginAsStudent,
  mentorSubmitJobCoachingReport,
  mentorSubmitProfileChange,
  studentSubmitManualPosition,
  softDeleteTestStaff,
  softDeleteTestStudent,
  staffLoginUsername,
  studentApplyPosition,
  studentLoginUsername,
  studentRequestCoaching,
  type AdminAuth,
  type SeededPosition,
  type SeededStaff,
  type SeededStudent,
} from './support/accountFactory'

const MOD = process.env.E2E_MODULE || ''
const SSDIR = path.resolve(__dirname, '../../../screenshots/rule-a/five-end-chain')

async function ss(page: Page, name: string) {
  fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: true })
}

/**
 * RULE-A 5 端联动主链 — 端到端（自带数据，硬断言）。
 *
 * beforeAll 完整 seed：
 *   admin 建 student/mentor/lead-mentor/assistant 4 账号
 *   admin 绑 lead-mentor + assistant 到 student
 *   admin 建一条 osg_position
 *   student 投递该岗位 → 生成 osg_job_application
 *   student 在该 application 上 申请阶段辅导(First Round) → 生成 osg_coaching
 *
 * 各 CHAIN-0X 在浏览器中验证真实数据可见性，**禁用空状态早返**。
 */
test.describe.configure({ mode: 'serial', timeout: 90_000 })
test.describe('RULE-A 5 端联动主链（端到端，硬断言）', () => {
  test.skip(MOD !== 'chain', 'chain only — set E2E_MODULE=chain')

  const STUDENT_BASE = process.env.E2E_STUDENT_BASE_URL || 'http://127.0.0.1:3001'
  const MENTOR_BASE = process.env.E2E_MENTOR_BASE_URL || 'http://127.0.0.1:3002'
  const LEAD_MENTOR_BASE = process.env.E2E_LEAD_MENTOR_BASE_URL || 'http://127.0.0.1:3003'
  const ASSISTANT_BASE = process.env.E2E_ASSISTANT_BASE_URL || 'http://127.0.0.1:3004'

  let auth: AdminAuth
  let student: SeededStudent
  let studentToken: string
  let mentor: SeededStaff
  let leadMentor: SeededStaff
  let assistant: SeededStaff
  let position: SeededPosition
  let applicationId: number
  let coachingId: number
  // email 总长 ≤ 30 字符（后端限制）。`e2e_${type}_${stamp}@o.t` 最长约 26 字符。
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 36 ** 3).toString(36)}`

  test.beforeAll(async ({ request }) => {
    auth = await adminAuth(request)

    // 1) seed 4 角色账号
    student = await createTestStudent(auth, {
      name: `e2e_stu_${stamp}`,
      email: `e2e_stu_${stamp}@o.t`,
    })
    leadMentor = await createTestStaff(auth, {
      name: `e2e_lm_${stamp}`,
      email: `e2e_lm_${stamp}@o.t`,
      staffType: 'lead_mentor',
    })
    assistant = await createTestStaff(auth, {
      name: `e2e_as_${stamp}`,
      email: `e2e_as_${stamp}@o.t`,
      staffType: 'assistant',
    })
    mentor = await createTestStaff(auth, {
      name: `e2e_mt_${stamp}`,
      email: `e2e_mt_${stamp}@o.t`,
      staffType: 'mentor',
    })

    // 2) 绑督导关系
    await bindMentorshipToStudent(auth, student.studentId, {
      leadMentorIds: [leadMentor.staffId],
      assistantIds: [assistant.staffId],
    })

    // 3) 建岗位
    position = await createTestPosition(auth, {
      positionName: `E2E Analyst ${stamp}`,
      companyName: `E2E_Co_${stamp}`,
    })

    // 4) student 投递 → application
    const studentLogin = await loginAsStudent(request, student)
    studentToken = studentLogin.token
    await studentApplyPosition(request, studentToken, position.positionId)

    // 5) 拿到 applicationId
    const apps = await getStudentApplicationList(request, studentToken)
    const seeded = apps.find((row) => row.positionId === position.positionId)
    expect(seeded, `student should see application for position ${position.positionId}, got ${apps.length} apps`).toBeTruthy()
    applicationId = seeded!.id

    // 6) student 申请阶段辅导（First Round）
    const coaching = await studentRequestCoaching(request, studentToken, applicationId, 'first', '1')
    coachingId = coaching.coachingId
  })

  test.afterAll(async () => {
    if (auth) {
      if (student?.studentId) await softDeleteTestStudent(auth, student.studentId)
      if (mentor?.staffId) await softDeleteTestStaff(auth, mentor.staffId)
      if (leadMentor?.staffId) await softDeleteTestStaff(auth, leadMentor.staffId)
      if (assistant?.staffId) await softDeleteTestStaff(auth, assistant.staffId)
    }
  })

  // ── CHAIN-01 学生「我的求职」看到投递岗位 + 展开行有辅导记录 ──
  test('CHAIN-01 student 我的求职：8 字段 + 申请辅导按钮 + 展开行 First Round', async ({ browser, request }) => {
    const stu = await loginAsStudent(request, student)
    const ctx = await browser.newContext({ baseURL: STUDENT_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), stu.token)
      await page.goto('/applications', { waitUntil: 'networkidle' })
      await expect(page.locator('#page-job-tracking')).toBeVisible({ timeout: 10000 })

      // 列表至少有 1 行（刚 seed 的 application）
      const rows = page.locator('.ant-table-row')
      await expect(rows.first()).toBeVisible({ timeout: 8000 })
      const count = await rows.count()
      expect(count).toBeGreaterThan(0)

      // 验证后端确实返回了 coaching（避免误判 UI）
      const apiCheck = await page.request.get('/api/student/application/list', {
        headers: { Authorization: `Bearer ${stu.token}` },
      })
      const apiBody = await apiCheck.json()
      const seededApi = apiBody?.data?.applications?.find((a: any) => a.id === applicationId)
      expect(seededApi, `seed application ${applicationId} should appear in student list`).toBeTruthy()
      expect(seededApi.coachings?.length, `seed coaching should appear, got ${JSON.stringify(seededApi?.coachings)}`).toBeGreaterThan(0)
      await ss(page, 'CHAIN-01-before-expand')

      // 找到 e2e seed 那行（用 positionName + stamp 唯一识别）
      const seededRow = rows.filter({ hasText: position.positionName })
      await expect(seededRow.first()).toBeVisible()
      // 操作列「申请辅导」按钮
      await expect(seededRow.first().locator('.apply-coaching-btn')).toBeVisible()

      // 展开行查辅导记录：点 seeded row 的 expand 图标
      const expandIcon = seededRow.first().locator('.ant-table-row-expand-icon')
      await expandIcon.click()
      await page.waitForTimeout(500)
      await ss(page, 'CHAIN-01-after-expand')
      // 期望某个 panel 含 First Round
      const panel = page.locator('.application-coachings-panel').filter({ hasText: /First Round|first/i }).first()
      await expect(panel).toBeVisible({ timeout: 5000 })
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-02 班主任「待分配导师」看到 student + 分配数量校验 ──
  test('CHAIN-02 lead-mentor 待分配栏看到 student；分配数量校验生效', async ({ browser, request }) => {
    const lm = await loginAsStaff(request, leadMentor)
    const ctx = await browser.newContext({ baseURL: LEAD_MENTOR_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), lm.token)
      await page.goto('/career/job-overview', { waitUntil: 'networkidle' })
      await ss(page, 'CHAIN-02-loaded')

      // 切到「待分配导师」栏 — 用 id 精确定位
      await page.locator('#lm-job-tab-pending').click()
      await page.waitForTimeout(1200)
      await ss(page, 'CHAIN-02-pending-tab')

      // 用 positionName (含 stamp) 唯一识别 seed 行，避开 studentName 截断问题
      const studentRow = page.locator('.ant-table-row:visible', { hasText: position.positionName })
      await expect(studentRow.first()).toBeVisible({ timeout: 12000 })

      // 操作列 分配导师 按钮
      const assignBtn = studentRow.first().locator('button:has-text("分配导师")')
      await expect(assignBtn).toBeVisible()
      await assignBtn.click()

      const modal = page.locator('[data-surface-id="modal-assign-mentor"]')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // 不选导师直接提交 → 数量校验提示。按钮文案是「确认匹配」（非「分配」）
      await modal.locator('button:has-text("确认匹配")').click()
      await expect(page.locator('text=/分配导师数量|请至少选择|请选择/').first()).toBeVisible({ timeout: 5000 })
      await ss(page, 'CHAIN-02-count-validation')
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-03 mentor 端登录后页面渲染 + RULE-A 9 列结构 ──
  test('CHAIN-03 mentor 学员求职总览：9 列结构 + 4 项筛选', async ({ browser, request }) => {
    const mt = await loginAsStaff(request, mentor)
    const ctx = await browser.newContext({ baseURL: MENTOR_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), mt.token)
      await page.goto('/job-overview', { waitUntil: 'networkidle' })
      await expect(page.locator('#page-job-overview')).toBeVisible({ timeout: 10000 })

      // RULE-A 9 列表头存在（即使列表为空）
      const headers = page.locator('.ant-table-thead th')
      for (const text of ['学生ID', '学生姓名', '岗位', '公司', '城市', '面试阶段', '面试时间', '已上报课消数', '操作']) {
        await expect(headers.filter({ hasText: text }).first()).toBeVisible()
      }

      // 4 项筛选齐全（antd a-select placeholder 渲染在 span 上）
      await expect(page.locator('.filter-row .ant-select').nth(0)).toBeVisible()
      await expect(page.locator('.filter-row .ant-select').nth(1)).toBeVisible()
      await expect(page.locator('.filter-row .ant-select').nth(2)).toBeVisible()
      await expect(page.locator('.filter-row .ant-picker-range')).toBeVisible()
      await expect(page.locator('.filter-row .ant-select-selection-placeholder', { hasText: '全部公司' }).first()).toBeVisible()
      await expect(page.locator('.filter-row .ant-select-selection-placeholder', { hasText: '全部面试阶段' }).first()).toBeVisible()
      await expect(page.locator('.filter-row .ant-select-selection-placeholder', { hasText: '是否上报课消' }).first()).toBeVisible()
      await ss(page, 'CHAIN-03-mentor-structure')
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-04 assistant 在「我管理的学员」看到 student ──
  test('CHAIN-04 assistant 我管理的学员列表能看到 e2e student', async ({ browser, request }) => {
    const as = await loginAsStaff(request, assistant)
    const ctx = await browser.newContext({ baseURL: ASSISTANT_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), as.token)
      await page.goto('/career/job-overview', { waitUntil: 'networkidle' })

      // student 应在表中（已绑 assistant）
      const studentRow = page.locator('.ant-table-row', { hasText: student.studentName })
      await expect(studentRow.first()).toBeVisible({ timeout: 8000 })

      // 城市列用 dict label，不允许英文 fallback (RULE-E)
      // 这里只检查 row 包含 student name + 不含 'new_york' 英文 raw
      const rowText = await studentRow.first().innerText()
      expect(rowText.toLowerCase()).not.toContain('new_york')
      await ss(page, 'CHAIN-04-assistant-managed')
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-05 验证 RULE-A 后端字段透传：student 列表含 industryLabel / categoryLabel / regionLabel / applicationStatusLabel ──
  test('CHAIN-05 student application API 透出 RULE-A 8 字段 dict label', async ({ request }) => {
    const stu = await loginAsStudent(request, student)
    const apps = await getStudentApplicationList(request, stu.token)
    const row = apps.find((r) => r.positionId === position.positionId) as any
    expect(row, 'seeded application should exist').toBeTruthy()
    // 后端 PositionServiceImpl.selectApplicationList 附 industryLabel/categoryLabel/regionLabel/applicationStatusLabel
    expect(row.industryLabel, 'industryLabel should be attached').toBeTruthy()
    expect(row.categoryLabel, 'categoryLabel should be attached').toBeTruthy()
    expect(row.regionLabel, 'regionLabel should be attached').toBeTruthy()
    expect(row.applicationStatusLabel, 'applicationStatusLabel should be attached').toBeTruthy()
    expect(row.applicationStatus, 'applicationStatus from current_stage').toBeTruthy()
    // 投递 → applicationStatus 应是 applied
    expect(row.applicationStatus).toBe('applied')
  })

  // ── CHAIN-06 lead-mentor 真实分配 mentor 成功 ──
  test('CHAIN-06 lead-mentor 真实分配 mentor，coaching 从 待分配 → 已分配', async ({ request }) => {
    const lm = await loginAsStaff(request, leadMentor)
    // API：把 mentor 分配给 seed coaching
    await leadMentorAssignCoachingMentor(request, lm.token, coachingId, [
      { staffId: mentor.staffId, staffName: mentor.staffName },
    ])

    // 验证：分配后 coaching 不再在 pending scope
    const pendingResp = await request.get('/api/lead-mentor/job-overview/list?scope=pending', {
      headers: { Authorization: `Bearer ${lm.token}` },
    })
    const pendingBody = await pendingResp.json()
    const stillPending = (pendingBody?.rows ?? []).find((r: any) => r.coachingId === coachingId)
    expect(stillPending, 'seed coaching should leave pending scope after assign').toBeFalsy()

    // 验证：分配后 coaching 进入 managed scope，mentor 字段已绑
    const managedResp = await request.get('/api/lead-mentor/job-overview/list?scope=managed', {
      headers: { Authorization: `Bearer ${lm.token}` },
    })
    const managedBody = await managedResp.json()
    const managed = (managedBody?.rows ?? []).find((r: any) => r.coachingId === coachingId)
    expect(managed, 'seed coaching should appear in managed scope').toBeTruthy()
    expect(managed?.assignedStatus).toBe('assigned')
    expect(managed?.coachingStatus).toBe('assigned')
    // 后端修复后 mentorName/mentorNames 应该有值（不为 null）
    const mentorNames = String(managed?.mentorNames ?? managed?.mentorName ?? '')
    expect(mentorNames, `mentorNames should not be null/empty after assign, got '${mentorNames}'`).toContain(mentor.staffName)
  })

  // ── CHAIN-07 mentor 真实上报课消 (job_coaching reference) ──
  test('CHAIN-07 mentor 上报课消（job_coaching），class_record 落库', async ({ request, browser }) => {
    const mt = await loginAsStaff(request, mentor)

    // mentor 端：先确认「学员求职总览」里能看到这条 coaching（已被分配）
    const ctx = await browser.newContext({ baseURL: MENTOR_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), mt.token)
      await page.goto('/job-overview', { waitUntil: 'networkidle' })
      const seededRow = page.locator('.ant-table-row:visible', { hasText: position.positionName })
      await expect(seededRow.first()).toBeVisible({ timeout: 10000 })
      // 操作列「上报课消」按钮存在
      await expect(seededRow.first().locator('button:has-text("上报课消")')).toBeVisible()
      await ss(page, 'CHAIN-07-mentor-row')
    } finally {
      await ctx.close()
    }

    // 走 API 实际上报（避免 ClassReportFlowModal 5 步表单的 UI 复杂度）
    // 后端不返回 recordId，但 200 即代表写入成功
    await mentorSubmitJobCoachingReport(request, mt.token, {
      studentId: student.studentId,
      coachingId,
      durationHours: 1.5,
      rate: '4',
    })

    // mentor 上报默认 pending，admin 批准后才计入 reportedLessonCount
    // Playwright 不允许重用 beforeAll 的 request 上下文，需要在 test 内拿新的 auth
    const testAuth = await adminAuth(request)
    await adminApproveLatestClassRecordForCoaching(testAuth, coachingId, student.studentId)

    // 验证：student/application/list 的 reportedLessonCount 增加
    const stu = await loginAsStudent(request, student)
    const apps = await getStudentApplicationList(request, stu.token)
    const seededApp = apps.find((r) => r.positionId === position.positionId) as any
    const seededCoaching = seededApp?.coachings?.find((c: any) => c.coachingId === coachingId)
    expect(seededCoaching, 'student coaching row should exist').toBeTruthy()
    expect(seededCoaching.reportedLessonCount, 'reportedLessonCount should be >= 1 after mentor report').toBeGreaterThanOrEqual(1)
  })

  // ── CHAIN-08 assistant 看到 mentor 上报的课消 ──
  test('CHAIN-08 assistant 查看详情，能看到 mentor 上报的课消记录', async ({ browser, request }) => {
    const as = await loginAsStaff(request, assistant)
    const ctx = await browser.newContext({ baseURL: ASSISTANT_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), as.token)
      await page.goto('/career/job-overview', { waitUntil: 'networkidle' })

      // 用 position name 找 row（学生名 CSS 截断风险）
      const seededRow = page.locator('.ant-table-row:visible', { hasText: position.positionName })
      await expect(seededRow.first()).toBeVisible({ timeout: 10000 })

      // 点击「查看详情」打开跟进详情
      await seededRow.first().locator('button:has-text("查看详情")').click()
      await expect(page.locator('text=跟进详情').first()).toBeVisible({ timeout: 5000 })

      // assistant 详情页应展示 mentor 上报的 highlights 文案
      // (mentorSubmitJobCoachingReport 写入 'e2e: 学生表现稳定')
      await expect(page.locator('text=/e2e: 学生表现稳定/').first()).toBeVisible({ timeout: 5000 })
      await ss(page, 'CHAIN-08-assistant-detail-class-record')
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-09 student 展开行点击「查看详情」按钮 ──
  test('CHAIN-09 student 展开行「查看详情」按钮可点开 + 显示课消', async ({ browser, request }) => {
    const stu = await loginAsStudent(request, student)
    const ctx = await browser.newContext({ baseURL: STUDENT_BASE })
    const page = await ctx.newPage()
    try {
      await page.addInitScript((t) => window.localStorage.setItem('osg_token', t), stu.token)
      await page.goto('/applications', { waitUntil: 'networkidle' })

      const seededRow = page.locator('.ant-table-row').filter({ hasText: position.positionName })
      await seededRow.first().locator('.ant-table-row-expand-icon').click()
      // 展开行的「查看详情」按钮
      const panel = page.locator('.application-coachings-panel').filter({ hasText: /First Round|first/i }).first()
      await expect(panel).toBeVisible({ timeout: 5000 })
      await panel.locator('button:has-text("查看详情")').click()

      // 辅导详情弹窗打开
      await expect(page.locator('text=辅导详情').first()).toBeVisible({ timeout: 5000 })
      // 课消记录列表里应该有 mentor 上报的那条
      await expect(page.locator('.application-coaching-record__title').first()).toBeVisible({ timeout: 5000 })
      await ss(page, 'CHAIN-09-student-detail')
    } finally {
      await ctx.close()
    }
  })

  // ── CHAIN-10 student 自添岗位 + admin 合并审核（RULE-D RD-001~004） ──
  test('CHAIN-10 自添岗位 → admin 合并到已有岗位（merge 分支）', async ({ request }) => {
    const stu = await loginAsStudent(request, student)
    // student 提交自添岗位
    await studentSubmitManualPosition(request, stu.token, {
      title: `Manual Pos ${stamp}`,
      company: `Manual Co ${stamp}`,
      link: 'https://example.com/manual-pos',
    })

    // admin approve 合并到已有 seed 岗位
    const testAuth = await adminAuth(request)
    const result = await adminApproveStudentPositionMerge(testAuth, student.studentId, position.positionId)
    expect(result.studentPositionId).toBeTruthy()

    // 验证 student 自添岗位 status=approved 且 publicPositionId = seed position
    const listResp = await testAuth.request.get(`/api/admin/student-position/list?status=approved&pageSize=200`, {
      headers: { Authorization: `Bearer ${testAuth.token}` },
    })
    const listBody = await listResp.json()
    const rows = (listBody?.rows ?? listBody?.data?.rows ?? []) as any[]
    const updated = rows.find((r: any) => Number(r.studentPositionId) === result.studentPositionId)
    expect(updated, `approved student-position ${result.studentPositionId} should be in list (${rows.length} rows)`).toBeTruthy()
    expect(updated?.status).toBe('approved')
    expect(Number(updated?.publicPositionId ?? updated?.positionId)).toBe(position.positionId)
  })

  // ── CHAIN-11 mentor 提交资料变更 + admin 审核通过（A-AU-001） ──
  test('CHAIN-11 mentor 提交资料变更 → admin approve → sys_user 写回', async ({ request }) => {
    const mt = await loginAsStaff(request, mentor)
    const newNickName = `mt_nick_${stamp.slice(0, 6)}`

    const submitted = await mentorSubmitProfileChange(request, mt.token, {
      nickName: newNickName,
      remark: 'e2e test profile change',
    })
    expect(submitted.requestId).toBeTruthy()

    // admin 审核通过
    const testAuth = await adminAuth(request)
    await adminApproveMentorChangeRequest(testAuth, submitted.requestId)

    // 验证变更状态 = approved
    const listResp = await testAuth.request.get('/api/admin/mentor-profile-change/list?status=approved', {
      headers: { Authorization: `Bearer ${testAuth.token}` },
    })
    const listBody = await listResp.json()
    const rows = Array.isArray(listBody?.data) ? listBody.data : (listBody?.rows ?? [])
    const found = rows.find((r: any) => r.requestId === submitted.requestId)
    expect(found, `request ${submitted.requestId} should appear in approved list`).toBeTruthy()
    expect(found?.status).toBe('approved')
  })
})
