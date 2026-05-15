/**
 * 5 端 13 Stage 门禁专用 helper —— 扩展 accountFactory 缺失的 API.
 */
import type { APIRequestContext } from '@playwright/test'

export interface AdminAuth {
  token: string
  request: APIRequestContext
  baseURL: string
}

export interface MentorAuth {
  token: string
  request: APIRequestContext
  baseURL: string
  userId: number
}

export async function adminApproveClassRecordById(
  auth: AdminAuth,
  recordId: number,
  remark = 'gate auto approve',
): Promise<void> {
  const resp = await auth.request.put(`${auth.baseURL}/api/admin/report/${recordId}/approve`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: { remark },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`adminApproveClassRecordById ${recordId} failed: ${resp.status()} ${body}`)
  }
}

export async function adminRejectClassRecordById(
  auth: AdminAuth,
  recordId: number,
  rejectReason: string,
  rejectRemark = '',
): Promise<void> {
  const resp = await auth.request.put(`${auth.baseURL}/api/admin/report/${recordId}/reject`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: { remark: `${rejectReason}${rejectRemark ? '；' + rejectRemark : ''}` },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`adminRejectClassRecordById ${recordId} failed: ${resp.status()} ${body}`)
  }
}

/**
 * 直接走 mentor POST /api/mentor/class-records，绕过任何 frontend modal logic.
 * 这是核心防糊弄手段：spec 中不通过 UI 点击 modal，而是直接打 API，断言 backend 真的写入。
 *
 * 注意：feedbackContent 在此 helper 内自动 stringify，对齐 Bug X fix 后的 wire 格式。
 */
export async function mentorPostClassRecord(
  mentor: MentorAuth,
  payload: {
    studentId: number
    classDate: string  // YYYY-MM-DD
    durationHours: number
    courseType: string
    referenceType: string
    referenceId: number
    memberStatus?: string
    rate?: string
    feedbackContent: Record<string, unknown>
  },
): Promise<{ recordId: number }> {
  const body = {
    ...payload,
    memberStatus: payload.memberStatus ?? 'normal',
    feedbackContent: JSON.stringify(payload.feedbackContent),
  }
  const resp = await mentor.request.post(`${mentor.baseURL}/api/mentor/class-records`, {
    headers: { Authorization: `Bearer ${mentor.token}` },
    data: body,
  })
  const text = await resp.text()
  // FIX-X 断言：不允许 JSON parse error
  if (text.includes('JSON parse error')) {
    throw new Error(`mentorPostClassRecord regression: feedbackContent JSON parse error returned. Body=${text}`)
  }
  // FIX referenceType 一致性断言
  if (text.includes('课程类型与关联类型不一致')) {
    throw new Error(`mentorPostClassRecord regression: courseType/referenceType inconsistency. Body=${text}`)
  }
  if (!resp.ok()) {
    throw new Error(`mentorPostClassRecord failed: ${resp.status()} ${text}`)
  }
  const json = JSON.parse(text)
  const recordId = json?.recordId ?? json?.data?.recordId ?? null
  return { recordId }
}

/**
 * Login helper — 直接走 /login 拿 token，跳过 captcha (要求 captchaEnabled=false)。
 */
export async function loginViaApi(
  request: APIRequestContext,
  baseURL: string,
  username: string,
  password: string,
): Promise<string> {
  const resp = await request.post(`${baseURL}/api/login`, {
    data: { username, password },
  })
  const json = await resp.json()
  if (!json?.token) {
    throw new Error(`loginViaApi(${username}) failed: ${JSON.stringify(json)}`)
  }
  return json.token
}

/**
 * Evaluate JS invariant string against pre/post snapshot context.
 * 安全：用 Function constructor 而非 eval，只暴露 pre/post 两个对象。
 */
export function evalInvariant(expr: string, ctx: { pre: any; post: any }): boolean {
  try {
    const fn = new Function('pre', 'post', `return (${expr})`)
    return fn(ctx.pre, ctx.post) === true
  } catch (e) {
    throw new Error(`Invariant eval failed for "${expr}": ${(e as Error).message}`)
  }
}
