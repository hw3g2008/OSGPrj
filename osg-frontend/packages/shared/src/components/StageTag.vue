<template>
  <a-tag :color="color">{{ displayText }}</a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveStageColor } from '../utils/jobOverviewTone'

/**
 * 面试阶段标签（三端共用）
 *
 * 用法：
 *   <StageTag :stage="record.interviewStage" />
 *   <StageTag stage="First Round" fallback="未更新" />
 *
 * 颜色映射规则见 @osg/shared/utils/jobOverviewTone.ts → resolveStageColor()
 */
const props = withDefaults(
  defineProps<{
    /** 面试阶段字符串（如 "First Round" / "offer" / "投递" 等） */
    stage?: string | null
    /** 空值时展示的文本，默认 "未更新" */
    fallback?: string
  }>(),
  {
    stage: '',
    fallback: '未更新',
  },
)

const color = computed(() => resolveStageColor(props.stage))

const displayText = computed(() => {
  const raw = String(props.stage ?? '').trim()
  return raw || props.fallback
})
</script>
