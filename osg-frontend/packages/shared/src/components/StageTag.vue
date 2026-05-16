<template>
  <a-tag :color="color">{{ displayText }}</a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
    /** 空值时展示的文本；省略时取 t('common.shared.stage.fallback') */
    fallback?: string
  }>(),
  {
    stage: '',
    fallback: '',
  },
)

const { t } = useI18n()

const color = computed(() => resolveStageColor(props.stage))

const displayText = computed(() => {
  const raw = String(props.stage ?? '').trim()
  if (raw) return raw
  return props.fallback || t('common.shared.stage.fallback')
})
</script>
