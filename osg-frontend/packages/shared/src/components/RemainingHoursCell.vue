<template>
  <strong class="osg-remaining-hours-cell" :class="toneClass">{{ displayText }}</strong>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveRemainingHoursToneClass,
  formatRemainingHours,
} from '../utils/studentTone'

/**
 * 剩余课时单元格（Assistant / Lead-Mentor 共用）
 *
 * SSOT：原型 prototype/assistant.html students 列表「剩余课时」列
 *
 * 用法：
 *   <RemainingHoursCell :hours="record.remainingHours" />
 *
 * 三态规则：
 * - >= 8h → success（绿 #22C55E）
 * - > 0 < 8h → warning（红 #EF4444，原型 --danger）
 * - = 0h / null → muted（灰 #94A3B8）
 *
 * 格式化：
 * - 整数显 'Nh'，小数显 'N.Nh'
 */
const props = withDefaults(
  defineProps<{
    /** 剩余课时数值（小时，可为整数或小数） */
    hours?: number | string | null
    /** 自定义文案（覆盖默认格式化） */
    label?: string
  }>(),
  {
    hours: 0,
    label: '',
  },
)

const toneClass = computed(() => resolveRemainingHoursToneClass(props.hours))

const displayText = computed(() => {
  const custom = String(props.label ?? '').trim()
  return custom || formatRemainingHours(props.hours)
})
</script>

<style scoped>
.osg-remaining-hours-cell {
  font-weight: 700;
}

.osg-remaining-hours-cell--success {
  color: #22c55e;
}

.osg-remaining-hours-cell--warning {
  color: #ef4444;
}

.osg-remaining-hours-cell--muted {
  color: #94a3b8;
}
</style>
