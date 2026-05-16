// 金额输入统一上下限（所有币种/场景共用）
// 2026-05-08 全局约束：前端任何金额输入 ≤ MAX_AMOUNT
//
// i18n: `MAX_AMOUNT_MESSAGE` 是格式化好的 zh 文本，仅做兼容保留；
// 新代码请用 i18n key `common.shared.limits.amountMax` + 插值 { max }。
import { i18n } from '../i18n'

export const MAX_AMOUNT = 1_000_000
export const MIN_AMOUNT = 0
export const AMOUNT_PRECISION = 2

/** @deprecated 使用 t('common.shared.limits.amountMax', { max: 1_000_000 }) */
export const MAX_AMOUNT_MESSAGE = ((): string =>
  (i18n.global.t as unknown as (k: string, n?: Record<string, unknown>) => string)(
    'common.shared.limits.amountMax',
    { max: '1,000,000' },
  ))()
