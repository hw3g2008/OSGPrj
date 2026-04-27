/**
 * 合并字典 options 与"实际存在值"集合，得到筛选下拉的最终 options。
 *
 * 用途：本轮非 Admin 四端字典单源整改后，部分筛选下拉的值域既要包含 Admin 字典值，
 * 也要保留历史脏值（数据库里学生历史填的字典外文本），避免脏值对应的数据被筛丢。
 *
 * 适用位置（dict-ssot-remediation 文档 §4）：
 * - lead-mentor/teaching/students 的 school / majorDirection 筛选
 * - lead-mentor/career/positions 的 companyName / region 筛选
 * - assistant/career/positions 的 companyName / region 筛选
 *
 * @param dictOptions 字典 options（来自 useDictFacade('osg_xxx').items）
 * @param existingValues 实际存在的值集合（来自接口 meta 或行数据动态聚合，可以是 string[] 或 {value,label}[]）
 * @returns 去重后的 options（按 value 去重，字典 options 优先保留 label/cssClass 等元信息）
 */
export interface SelectOption {
  value: string
  label: string
}

export type ExistingValueLike = string | SelectOption | { value: string; label?: string }

export function mergeDictWithExistingValues<T extends SelectOption>(
  dictOptions: readonly T[] | undefined | null,
  existingValues: readonly ExistingValueLike[] | undefined | null,
): Array<T | SelectOption> {
  const result: Array<T | SelectOption> = []
  const seen = new Set<string>()

  // 1. 先放字典 options（保留完整字段如 cssClass）
  if (dictOptions) {
    for (const opt of dictOptions) {
      const value = opt?.value
      if (value == null || value === '') continue
      if (seen.has(value)) continue
      seen.add(value)
      result.push(opt)
    }
  }

  // 2. 追加字典中没有的"实际存在值"
  if (existingValues) {
    for (const raw of existingValues) {
      const opt = normalizeExisting(raw)
      if (!opt) continue
      if (seen.has(opt.value)) continue
      seen.add(opt.value)
      result.push(opt)
    }
  }

  return result
}

function normalizeExisting(raw: ExistingValueLike): SelectOption | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    return { value: trimmed, label: trimmed }
  }
  if (typeof raw === 'object' && typeof raw.value === 'string') {
    const value = raw.value.trim()
    if (!value) return null
    const label =
      typeof (raw as SelectOption).label === 'string' && (raw as SelectOption).label
        ? (raw as SelectOption).label
        : value
    return { value, label }
  }
  return null
}
