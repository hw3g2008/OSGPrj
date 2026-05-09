import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import { useDictFacade, type DictFacadeOption } from './useDictFacade'

/**
 * S-055 §4A.1 共享：osg_base_course_topic 字典加载 + 必修/选修/行为分组
 *
 * 字典 sys_dict_data.remark 约定为 JSON：
 *   { "category": "tech" | "behavior", "required": true | false }
 *
 * 输出三组 options：
 * - techRequired   (T01-T19) — category=tech & required=true
 * - techOptional   (T20-T24) — category=tech & required=false
 * - behavior       (B0-B7)   — category=behavior
 *
 * remark JSON 非法时不抛异常，归入 uncategorized 并 message.warning 一次。
 */
export interface BaseCourseTopicOption {
  value: string
  label: string
  required?: boolean
  category: 'tech' | 'behavior' | 'uncategorized'
}

export interface UseBaseCourseTopicReturn {
  options: Ref<BaseCourseTopicOption[]>
  techRequired: ComputedRef<BaseCourseTopicOption[]>
  techOptional: ComputedRef<BaseCourseTopicOption[]>
  behavior: ComputedRef<BaseCourseTopicOption[]>
  uncategorized: ComputedRef<BaseCourseTopicOption[]>
  loading: Ref<boolean>
  load: () => Promise<void>
}

interface RemarkShape {
  category?: unknown
  required?: unknown
}

function parseRemark(raw: string | undefined | null): RemarkShape | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      return parsed as RemarkShape
    }
    return null
  } catch {
    return null
  }
}

function dictItemToTopic(
  item: DictFacadeOption,
  warnOnce: () => void,
): BaseCourseTopicOption {
  // useDictFacade 已把 remark 中的 extra 提取出来，但 base_course_topic 字典
  // remark 直接是 {category, required}，因此这里再读取一次原始 remark。
  const rawRemark = item.remark
  const parsed = parseRemark(rawRemark)

  const value = item.value
  const label = item.label && item.label.trim().length > 0 ? item.label : value

  if (!parsed) {
    if (rawRemark) {
      // 非空 remark 但解析失败：提示一次，但不阻塞渲染
      warnOnce()
    }
    return { value, label, category: 'uncategorized' }
  }

  const category =
    parsed.category === 'tech'
      ? 'tech'
      : parsed.category === 'behavior'
        ? 'behavior'
        : 'uncategorized'

  if (category === 'uncategorized') {
    warnOnce()
  }

  const required =
    typeof parsed.required === 'boolean' ? parsed.required : undefined

  return { value, label, required, category }
}

export function useBaseCourseTopic(): UseBaseCourseTopicReturn {
  const facade = useDictFacade('osg_base_course_topic')
  const options = ref<BaseCourseTopicOption[]>([])
  const loading = facade.loading

  let warned = false
  const warnOnce = (): void => {
    if (warned) return
    warned = true
    message.warning('部分基础课程主题字典数据格式异常，已归入未分类')
  }

  const load = async (): Promise<void> => {
    warned = false
    await facade.load()
    options.value = facade.items.value.map((item) => dictItemToTopic(item, warnOnce))
  }

  const techRequired = computed(() =>
    options.value.filter((o) => o.category === 'tech' && o.required === true),
  )
  const techOptional = computed(() =>
    options.value.filter((o) => o.category === 'tech' && o.required !== true),
  )
  const behavior = computed(() =>
    options.value.filter((o) => o.category === 'behavior'),
  )
  const uncategorized = computed(() =>
    options.value.filter((o) => o.category === 'uncategorized'),
  )

  return {
    options,
    techRequired,
    techOptional,
    behavior,
    uncategorized,
    loading,
    load,
  }
}
