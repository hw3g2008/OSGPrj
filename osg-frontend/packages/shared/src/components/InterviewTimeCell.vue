<template>
  <div v-if="!isEmpty" class="interview-time-cell">
    <strong
      :class="[
        'interview-time-cell__time',
        { 'interview-time-cell__time--danger': emphasizeOverdue },
      ]"
    >
      {{ time }}
    </strong>
    <div v-if="hint" class="interview-time-cell__hint">{{ hint }}</div>
  </div>
  <span v-else class="interview-time-cell__empty">{{ fallback }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 面试时间 cell（三端共用）
 *
 * 用法：
 *   - Assistant: <InterviewTimeCell :time="formatDateTime(record.interviewTime)" :hint="formatScheduleHint(record.interviewTime)" />
 *   - LM (pending): <InterviewTimeCell :time="record.interviewAt" />
 *   - LM (coaching): <InterviewTimeCell :time="record.interviewAt" :hint="record.deadlineHint" :emphasize-overdue="record.deadlineTone === 'danger'" />
 *   - Mentor: <InterviewTimeCell :time="record.interviewTime ? formatInterviewTime(record.interviewTime) : ''" :emphasize-overdue="record.coachingStatus !== 'completed'" />
 *
 * 设计：组件只负责展示，时间格式化由外部传入预格式化字符串
 * （三端时间格式各有偏好，强行统一会引入不必要的 prop 复杂度）
 */
const props = withDefaults(
  defineProps<{
    /** 已格式化的时间字符串（如 "10/15 14:30" / "2026-04-15 14:30"） */
    time?: string | null
    /** 副文字提示（如 "还剩 5 天" / "已过期" / "今天"） */
    hint?: string | null
    /** 是否红色高亮（过期 / 未完成等场景） */
    emphasizeOverdue?: boolean
    /** 空值 fallback，默认 "-" */
    fallback?: string
  }>(),
  {
    time: '',
    hint: '',
    emphasizeOverdue: false,
    fallback: '-',
  },
)

const isEmpty = computed(() => {
  const raw = String(props.time ?? '').trim()
  return !raw
})
</script>

<style scoped>
.interview-time-cell__time {
  font-weight: 600;
}

.interview-time-cell__time--danger {
  color: #ef4444;
}

.interview-time-cell__hint {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.interview-time-cell__empty {
  color: rgba(0, 0, 0, 0.45);
}
</style>
