/**
 * 岗位页共享组件 - 统一类型定义
 *
 * 多端（Lead-Mentor / Assistant / 未来 Mentor）岗位页面共用此 shape，
 * 确保 PositionsListTable / PositionsDrilldown 能跨端复用。
 *
 * 各端的 raw API 返回（LeadMentorPositionListItem / DrillDownIndustry）需在父组件中
 * 转换为本文件定义的 row/group shape，再传给共享组件。
 */

/**
 * 行业 tone 枚举（对应字典 osg_company_type 的 css_class 字段）
 * 共享组件按此 tone 选择 7 色配色 + icon 等
 */
export type IndustryTone = 'gold' | 'violet' | 'blue' | 'amber' | 'teal' | 'indigo' | 'slate'

/**
 * 截止时间 tone：
 * - normal：> now+7d 正常显示
 * - urgent：0–7d 即将过期，红色加粗
 * - closed：< now 已过期，灰色删除线
 */
export type DeadlineTone = 'normal' | 'urgent' | 'closed'

/**
 * 单条岗位 row（list / drilldown 两端共用）
 *
 * 命名约定：用 raw API 风格（positionName / companyName / publishTime ...）。
 * Lead-Mentor 内部 PositionJob shape（title / publishDate ...）需在父组件做映射。
 */
export interface PositionTableRow {
  /** 唯一 key（用于 a-table row-key） */
  positionId: number | string
  /** 岗位名称（点击可跳转 positionUrl） */
  positionName: string
  /** 岗位 URL */
  positionUrl?: string
  /** 公司名 */
  companyName: string
  /** 公司官网 URL（点击跳转） */
  companyWebsite?: string
  /** 公司 logo 文字（如 "GS" / "MS"）；未提供时父组件可由 companyName 派生 */
  logoText?: string
  /** 公司 logo 背景色 hex（覆盖 industryTone）；未提供时按 industryTone 取色 */
  logoColor?: string
  /** 行业 raw 字符串（如 "Investment Bank"） */
  industry?: string
  /** 行业 tone（决定 industry-tag 颜色 + logo 颜色 fallback） */
  industryTone?: IndustryTone
  /** 岗位分类（已解析字典 label，如 "暑期实习"） */
  positionCategory?: string
  /** 部门（如 "S&T"） */
  department?: string
  /** 地区（已 format 字符串，如 "Beijing / Haidian"） */
  location?: string
  /** 招聘周期（如 "2025 Summer"） */
  recruitmentCycle?: string
  /** 招聘周期 tone（用于 cycle-tag 着色，可选） */
  recruitmentCycleTone?: string
  /** 招聘年份（如 "2025"） */
  projectYear?: string
  /** 发布时间（已 format 字符串，如 "2025-09-15"） */
  publishTime?: string
  /** 截止时间（已 format 字符串，如 "2025-12-31"） */
  deadline?: string
  /** 截止时间 tone（决定 normal/urgent/closed 着色） */
  deadlineTone?: DeadlineTone
  /** 我的学员数（点击数字打开 students modal） */
  studentCount?: number
  /** 主攻方向（CSV，渲染为多 a-tag dict_label） */
  targetMajors?: string
  /** 命中该岗位的所带学生数（assistant 端聚合视图特有） */
  myStudentCount?: number
}

/**
 * 公司层（drilldown 第二级）
 */
export interface PositionCompanyGroup {
  /** 唯一 key（建议 industryId-companyName） */
  id: string
  /** 公司名 */
  name: string
  /** 多地区合并字符串（如 "Beijing, Hong Kong"），可选 */
  locations?: string
  /** logo 文字 */
  logoText: string
  /** logo 颜色 hex（优先级高于 industryTone） */
  logoColor?: string
  /** 公司官网 URL */
  officialUrl?: string
  /** 该公司岗位总数 */
  positionCount: number
  /** 该公司"我的学员"总数 */
  studentCount: number
  /** 公司下所有岗位 */
  positions: PositionTableRow[]
}

/**
 * 行业层（drilldown 第一级）
 */
export interface PositionIndustryGroup {
  /** 唯一 key（建议字典 value 或原始 industry 字符串） */
  id: string
  /** 行业显示 label */
  label: string
  /** 行业 tone */
  tone: IndustryTone
  /** mdi icon class（如 "mdi-bank"） */
  icon: string
  /** 该行业下公司数 */
  companyCount: number
  /** 该行业下岗位数 */
  positionCount: number
  /** 该行业下"我的学员"总数 */
  studentCount: number
  /** 行业下所有公司 */
  companies: PositionCompanyGroup[]
}

/**
 * IndustryTone → 文字色 hex map（与 _styles.scss 中的 .industry-{tone} 一致）
 * 用于行业大类标题区 icon / title / chip 着色
 */
export const INDUSTRY_TONE_TEXT_COLOR: Record<IndustryTone, string> = {
  gold: '#a85a18',
  violet: '#7c3aed',
  blue: '#2563eb',
  amber: '#d97706',
  teal: '#0f766e',
  indigo: '#4f46e5',
  slate: '#64748b',
}
