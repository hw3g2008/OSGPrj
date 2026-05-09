import { ref, type Ref } from 'vue'
import http from '../utils/request'
import type { SharedDictItem } from './useIndustryMeta'

/**
 * 通用字典外观（DictFacadeController）。
 * 通过 GET /dict/{typeCode} 拉取后端共享字典，多端复用。
 *
 * 后端白名单见 ruoyi-admin/.../DictFacadeController.java:SHARED_DICT_WHITELIST
 *
 * @example
 * const { items, load } = useDictFacade('osg_recruit_cycle')
 * onMounted(load)
 * // items.value: [{ value, label, cssClass, listClass, remark, parentValue }]
 */
export interface DictFacadeOption {
  value: string
  label: string
  /** 后端 cssClass / listClass / remark 字段（语义保持后端原样，按需消费） */
  cssClass?: string
  listClass?: string
  remark?: string
  /** 从 remark JSON {"parentValue":"xxx"} 解析出的父字典 value（osg_city.parentValue=osg_region.value）*/
  parentValue?: string
  /** 从 remark JSON {"extra":{...}} 解析出的扩展属性（如 osg_country_code.extra.callingCode = "+86"） */
  extra?: Record<string, string>
}

const cacheByType: Record<string, DictFacadeOption[] | undefined> = {}
const fetchingByType: Record<string, Promise<DictFacadeOption[]> | undefined> = {}

export function useDictFacade(typeCode: string) {
  const items: Ref<DictFacadeOption[]> = ref(cacheByType[typeCode] ?? [])
  const loading = ref(false)

  const load = async (): Promise<void> => {
    const cached = cacheByType[typeCode]
    if (cached) {
      items.value = cached
      return
    }
    const inflight = fetchingByType[typeCode]
    if (inflight) {
      items.value = await inflight
      return
    }
    loading.value = true
    const promise = (
      http.get<SharedDictItem[]>(`/dict/${typeCode}`) as unknown as Promise<SharedDictItem[]>
    )
      .then((data) => {
        const mapped = (data ?? []).map(dictItemToOption)
        cacheByType[typeCode] = mapped
        return mapped
      })
      .finally(() => {
        loading.value = false
        delete fetchingByType[typeCode]
      })
    fetchingByType[typeCode] = promise
    items.value = await promise
  }

  return { items, loading, load }
}

function dictItemToOption(d: SharedDictItem): DictFacadeOption {
  const remarkJson = parseRemarkJson(d.remark)
  return {
    value: d.dictValue,
    label: d.dictLabel,
    cssClass: d.cssClass || undefined,
    listClass: d.listClass || undefined,
    remark: d.remark || undefined,
    parentValue: typeof remarkJson?.parentValue === 'string' ? remarkJson.parentValue : undefined,
    extra: remarkJson?.extra && typeof remarkJson.extra === 'object' ? remarkJson.extra : undefined,
  }
}

/**
 * 后端 remark 字段约定为 JSON 字符串（admin 字典种子写入）。
 * 例：{"parentValue":"na","extra":{"callingCode":"+86"}}
 */
function parseRemarkJson(remark: string | null | undefined): any {
  if (!remark) return undefined
  try {
    return JSON.parse(remark)
  } catch {
    return undefined
  }
}

/** 测试用：清缓存 */
export function __resetDictFacadeCache(typeCode?: string): void {
  if (typeCode) {
    delete cacheByType[typeCode]
    delete fetchingByType[typeCode]
  } else {
    Object.keys(cacheByType).forEach((k) => delete cacheByType[k])
    Object.keys(fetchingByType).forEach((k) => delete fetchingByType[k])
  }
}
