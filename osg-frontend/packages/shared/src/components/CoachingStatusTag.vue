<template>
  <span v-if="isEmpty" class="coaching-status-tag-empty">{{ fallback }}</span>
  <a-tag v-else :color="color">
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    {{ displayText }}
  </a-tag>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { resolveCoachingStatusColor } from '../utils/jobOverviewTone'

/**
 * 辅导状态标签（三端共用）
 *
 * 用法：
 *   - Assistant: <CoachingStatusTag :status="record.coachingStatus" fallback="未申请" />
 *   - Mentor: <CoachingStatusTag :status="record.coachingStatus" text-mode="normalized">
 *               <template #icon><BellOutlined v-if="..." /></template>
 *             </CoachingStatusTag>
 *   - LM: 不接入（LM 用 <strong> 简单文本，本组件不适用）
 *
 * SSOT 规则（颜色映射）：见 @osg/shared/utils/jobOverviewTone.ts → resolveCoachingStatusColor()
 *
 * textMode：
 *   - 'raw'（默认）：直接展示原始 status 字符串
 *   - 'normalized'：将英文 enum 'new' / 'coaching' 映射为中文展示文本（mentor 端用）
 */
const props = withDefaults(
  defineProps<{
    /** 辅导状态字符串（如 "辅导中" / "coaching" / "new" 等） */
    status?: string | null
    /** 空值或未匹配时展示的文本，默认 "-" */
    fallback?: string
    /** 文本展示模式：raw=原值，normalized=映射 enum 到中文 */
    textMode?: 'raw' | 'normalized'
  }>(),
  {
    status: '',
    fallback: '-',
    textMode: 'raw',
  },
)

useSlots()

const isEmpty = computed(() => {
  const raw = String(props.status ?? '').trim()
  return !raw
})

const color = computed(() => resolveCoachingStatusColor(props.status))

const displayText = computed(() => {
  const raw = String(props.status ?? '').trim()
  if (props.textMode === 'normalized') {
    if (raw === 'new') return '新申请'
    if (raw === 'coaching') return '辅导中'
  }
  return raw
})
</script>

<style scoped>
.coaching-status-tag-empty {
  color: rgba(0, 0, 0, 0.45);
}
</style>
