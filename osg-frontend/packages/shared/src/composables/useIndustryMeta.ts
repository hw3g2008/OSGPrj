import { ref, type Ref } from 'vue'
import http from '../utils/request'
import type { PositionMetaOption } from '../api/admin/position'

/**
 * 后端 DictFacadeController 裁剪后的返回结构
 *
 * 契约见：docs/plans/2026-04-19-shared-prerequisites-plan.md §5.4
 * 实现见：ruoyi-admin/.../controller/common/DictFacadeController.java
 */
export interface SharedDictItem {
  dictValue: string
  dictLabel: string
  /** 兜底为 ""（后端 DTO 裁剪），前端转成 undefined */
  cssClass: string
  /** 兜底为 ""（后端 DTO 裁剪），前端转成 undefined */
  listClass: string
  remark: string
  /** 字典标签国际化 key（前端按 locale 翻译，空串视为无 i18n） */
  i18nKey?: string
}

let cached: PositionMetaOption[] | null = null
let fetching: Promise<PositionMetaOption[]> | null = null

/**
 * 拉取 osg_company_type 字典 industries 列表，进程内缓存。
 * 所有端共享同一份 meta，避免每端各自实现字典映射。
 *
 * 数据来源：GET /dict/osg_company_type（DictFacadeController）
 *   - 任何登录用户可访问（无 @PreAuthorize，靠 SecurityConfig authenticated() 校验登录）
 *   - 后端白名单控制仅 osg_company_type 等业务字典可被查询
 *   - 后端 DTO 裁剪，不返回 createBy/updateBy 等 admin 元数据
 *
 * @example
 * const { meta, loading, load } = useIndustryMeta()
 * onMounted(load)
 * // 模板里：:class="`industry-${match.tone}`"
 */
export function useIndustryMeta() {
  const meta: Ref<PositionMetaOption[]> = ref(cached ?? [])
  const loading = ref(false)

  const load = async (): Promise<void> => {
    if (cached) {
      meta.value = cached
      return
    }
    if (fetching) {
      meta.value = await fetching
      return
    }
    loading.value = true
    // ⚠️ shared 的 http.get<T>() 返回 Promise<T>（interceptor 已拆 data 层），不是 AxiosResponse<T>
    //    见 osg-frontend/packages/shared/src/utils/request.ts:46
    fetching = (http.get<SharedDictItem[]>('/dict/osg_company_type') as unknown as Promise<SharedDictItem[]>)
      .then((data) => {
        cached = (data ?? []).map(dictItemToMetaOption)
        return cached
      })
      .finally(() => {
        loading.value = false
        fetching = null
      })
    meta.value = await fetching
  }

  return { meta, loading, load }
}

/**
 * 后端字段名 → 前端 PositionMetaOption 字段名的映射
 * （后端 DTO 裁剪后返回空字符串，这里转成 undefined 以匹配可选字段语义）
 */
function dictItemToMetaOption(d: SharedDictItem): PositionMetaOption {
  return {
    value: d.dictValue,
    label: d.dictLabel,
    tone: d.cssClass || undefined,
    icon: d.listClass || undefined,
    remark: d.remark || undefined,
  }
}

/**
 * 测试/特殊场景用：清空进程内缓存。
 * 生产代码不应调用（会导致重复网络请求）。
 */
export function __resetIndustryMetaCache(): void {
  cached = null
  fetching = null
}
