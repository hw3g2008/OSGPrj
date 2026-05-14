/**
 * 国际电话区号常量与工具函数。
 *
 * 设计目标：
 * - 集中维护国际区号清单，5 端共用，避免硬编码重复。
 * - 提供 phone 字符串与 (countryCode, number) 的双向转换工具。
 * - 与系统现有约定对齐：DB 中 phone 整体存为 "+86 13001985588" 格式（区号 + 空格 + 号码）。
 */
import { i18n } from '../i18n'

export interface PhoneCountryCode {
  /** ITU E.164 区号，含 "+"，例如 "+86" */
  code: string
  /** 国家或地区中文名 */
  label: string
  /** 下拉展示文本，例如 "+86 中国大陆" */
  display: string
}

export const PHONE_COUNTRY_CODES: readonly PhoneCountryCode[] = Object.freeze([
  { code: '+86', label: i18n.global.t('mainland_china'), display: '+86 中国大陆' },
  { code: '+852', label: i18n.global.t('hong_kong_china'), display: '+852 中国香港' },
  { code: '+853', label: i18n.global.t('macao_china'), display: '+853 中国澳门' },
  { code: '+886', label: i18n.global.t('taiwan_china'), display: '+886 中国台湾' },
  { code: '+1', label: i18n.global.t('united_states_canada'), display: '+1 美国/加拿大' },
  { code: '+44', label: i18n.global.t('united_kingdom'), display: '+44 英国' },
  { code: '+65', label: i18n.global.t('singapore'), display: '+65 新加坡' },
  { code: '+61', label: i18n.global.t('australia'), display: '+61 澳大利亚' },
])

export const DEFAULT_PHONE_COUNTRY_CODE = '+86'

const KNOWN_CODES: readonly string[] = PHONE_COUNTRY_CODES.map((item) => item.code)

/**
 * 解析 phone 字符串为 { countryCode, number }。
 *
 * 规则：
 * - 输入若以已知区号开头（如 "+86 130..." 或 "+8613..."），拆出区号与剩余号码。
 * - 输入为纯数字（如 "13001985588"），返回默认区号 +86 + 原号码。
 * - 输入为空、null、undefined，返回 { countryCode: 默认, number: '' }。
 */
export function splitPhone(phone: string | null | undefined): { countryCode: string; number: string } {
  const raw = (phone ?? '').trim()
  if (!raw) {
    return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, number: '' }
  }

  // 优先匹配长前缀（如 +886 应该比 +88 优先），避免歧义
  const sortedCodes = [...KNOWN_CODES].sort((a, b) => b.length - a.length)
  for (const code of sortedCodes) {
    if (raw.startsWith(code)) {
      const rest = raw.slice(code.length).trim()
      return { countryCode: code, number: rest }
    }
  }

  // 没有可识别区号 → 默认 +86，原文作为号码（去掉前导 +，保留数字与常见分隔符）
  return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, number: raw }
}

/**
 * 将 (countryCode, number) 拼接为 phone 字符串。
 *
 * - 号码为空时返回 undefined（便于前端提交时整体省略此字段）。
 * - 号码非空时返回 `${countryCode} ${number}` 格式（与系统现有 phone 约定一致）。
 */
export function joinPhone(countryCode: string | null | undefined, number: string | null | undefined): string | undefined {
  const trimmedNumber = (number ?? '').trim()
  if (!trimmedNumber) {
    return undefined
  }
  const code = (countryCode ?? '').trim() || DEFAULT_PHONE_COUNTRY_CODE
  return `${code} ${trimmedNumber}`
}


