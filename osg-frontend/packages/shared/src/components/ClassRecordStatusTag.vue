<template>
  <span class="osg-class-record-status-tag" :class="toneClass">{{ displayText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveClassRecordStatusToneClass,
  resolveClassRecordStatusLabel,
} from '../utils/classRecordTone'

/**
 * 课程记录审核状态标签（Assistant / Mentor / Lead-Mentor 三端共用）
 *
 * SSOT：原型 prototype/assistant.html + lead-mentor.html 课程记录列表「审核状态」列
 *
 * 用法：
 *   <ClassRecordStatusTag :status="record.status" />          <!-- asst -->
 *   <ClassRecordStatusTag :status="record.reviewStatus" />    <!-- mentor -->
 *   <ClassRecordStatusTag :status="row.status" :label="row.statusLabel" />  <!-- LM -->
 *
 * status enum：'pending'=待审核 / 'approved'=已通过 / 'rejected'=已驳回 / 其他=待审核(fallback)
 */
const props = withDefaults(
  defineProps<{
    /** 审核状态（pending/approved/rejected/其他） */
    status?: string | null
    /** 自定义文案（不传走默认中文 label） */
    label?: string
  }>(),
  {
    status: '',
    label: '',
  },
)

const toneClass = computed(() => resolveClassRecordStatusToneClass(props.status))

const displayText = computed(() => {
  const custom = String(props.label ?? '').trim()
  return custom || resolveClassRecordStatusLabel(props.status)
})
</script>

<style scoped>
.osg-class-record-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.osg-class-record-status-tag--pending {
  background: #fef3c7;
  color: #92400e;
}

.osg-class-record-status-tag--approved {
  background: #d1fae5;
  color: #065f46;
}

.osg-class-record-status-tag--rejected {
  background: #fee2e2;
  color: #991b1b;
}
</style>
