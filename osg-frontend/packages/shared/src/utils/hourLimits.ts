// 课时（小时）输入统一上限（合同总课时 / 续签新增课时）
// 2026-05-08 全局约束：合同课时 ≤ MAX_CONTRACT_HOURS
//
// i18n: `MAX_CONTRACT_HOURS_MESSAGE` 是格式化好的 zh 文本，仅做兼容保留；
// 新代码请用 i18n key `common.shared.limits.hoursMax` + 插值 { max }。
import { i18n } from '../i18n'

export const MAX_CONTRACT_HOURS = 100_000

/** @deprecated 使用 t('common.shared.limits.hoursMax', { max: 100_000 }) */
export const MAX_CONTRACT_HOURS_MESSAGE = ((): string =>
  (i18n.global.t as unknown as (k: string, n?: Record<string, unknown>) => string)(
    'common.shared.limits.hoursMax',
    { max: '100,000' },
  ))()
