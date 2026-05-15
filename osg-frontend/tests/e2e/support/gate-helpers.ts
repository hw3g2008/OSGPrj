/**
 * 5 端 13 Stage 门禁专用 helper —— 扩展 accountFactory 缺失的 API.
 */
import type { APIRequestContext, Page } from '@playwright/test'

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
): Promise<any> {
  const resp = await auth.request.put(`${auth.baseURL}/api/admin/report/${recordId}/approve`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: { remark },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`adminApproveClassRecordById ${recordId} failed: ${resp.status()} ${body}`)
  }
  return await resp.json().catch(() => ({}))
}

export async function adminRejectClassRecordById(
  auth: AdminAuth,
  recordId: number,
  rejectReason: string,
  rejectRemark = '',
): Promise<any> {
  const resp = await auth.request.put(`${auth.baseURL}/api/admin/report/${recordId}/reject`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: { remark: `${rejectReason}${rejectRemark ? '；' + rejectRemark : ''}` },
  })
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`adminRejectClassRecordById ${recordId} failed: ${resp.status()} ${body}`)
  }
  return await resp.json().catch(() => ({}))
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
  // 返完整 body 给 spec 用（含 code/msg），让 negative-path 校验能拿到 backend AjaxResult 包装的 code 字段
  return { ...json, recordId }
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

/**
 * 从 element textContent 中提取最后一个整数（支持中文、空格、换行）.
 * 例如:
 *   "待分配导师 11"          → 11
 *   "学员求职总览 Job Overview 5" → 5
 *   "待分配导师\n1"          → 1
 * 找不到返回 NaN，调用方决定如何处理.
 */
export function extractLastNumber(text: string): number {
  if (!text) return NaN
  const matches = text.match(/-?\d+/g)
  if (!matches || matches.length === 0) return NaN
  return parseInt(matches[matches.length - 1], 10)
}

/**
 * source 描述：从 5 端 UI / DB 取一个字段值.
 *
 * UI source 形如:
 *   { end: 'mentor', url: '/job-overview',
 *     selector: 'aside text=学员求职总览',
 *     extract: 'badgeNumberAfterLabel' | 'numberAfterLabel' }
 *
 * DB source 形如:
 *   { db: true, sql: 'SELECT COUNT(*) AS c FROM ...' }
 *
 * 返回 number；找不到 / 异常时返回 NaN，由调用方记录到 evidence.
 */
export interface UiSource {
  end: string
  url: string
  selector: string
  extract: 'badgeNumberAfterLabel' | 'numberAfterLabel'
}

export interface DbSource {
  db: true
  sql: string
}

export type SnapshotSource = UiSource | DbSource

export async function snapshotFieldFromUi(
  page: Page,
  source: UiSource,
): Promise<number> {
  // navigate first（每次 snapshot 都重新加载，确保数字反映 action 后真实状态）
  await page.goto(source.url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(800)

  // Playwright selector 支持 'aside text=学员求职总览' 这种 chained engine 语法
  const locator = page.locator(source.selector).first()
  // 优先取 element 自身 innerText；如取不到（badge 文字在外部节点），fall back 到 parent / ancestor
  let text = ''
  try {
    text = (await locator.innerText({ timeout: 5_000 })) ?? ''
  } catch {
    text = ''
  }

  if (source.extract === 'badgeNumberAfterLabel') {
    // sidebar 场景：number 可能在 label 元素外部（badge 兄弟节点）。
    // 取 enclosing <li> 或 <a> 整块文本 fallback.
    if (extractLastNumber(text) >= 0 === false || Number.isNaN(extractLastNumber(text))) {
      try {
        // 尝试上溯到最近的 li / a / aside 容器
        const containerText = await locator
          .locator('xpath=ancestor-or-self::*[self::li or self::a or self::aside][1]')
          .first()
          .innerText({ timeout: 3_000 })
          .catch(() => '')
        if (containerText) text = containerText
      } catch {
        // ignore
      }
    }
  }
  return extractLastNumber(text)
}
