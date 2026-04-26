<template>
  <span class="osg-student-status-tag" :class="toneClass">{{ displayText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveStudentStatusToneClass,
  resolveStudentStatusLabel,
} from '../utils/studentTone'

/**
 * 学员账号状态标签（Assistant / Lead-Mentor 共用）
 *
 * SSOT：原型 prototype/assistant.html + lead-mentor.html 学员列表「账号状态」列
 *
 * 用法：
 *   <StudentStatusTag :account-status="record.accountStatus" />
 *   <StudentStatusTag account-status="1" label="冻结中" />
 *
 * accountStatus enum：'0'/空=正常 / '1'=冻结 / '2'=已结束 / '3'=退款
 */
const props = withDefaults(
  defineProps<{
    /** 账号状态（'0'/'1'/'2'/'3'/空 / null） */
    accountStatus?: string | null
    /** 自定义文案（不传走默认中文 label） */
    label?: string
  }>(),
  {
    accountStatus: '',
    label: '',
  },
)

const toneClass = computed(() => resolveStudentStatusToneClass(props.accountStatus))

const displayText = computed(() => {
  const custom = String(props.label ?? '').trim()
  return custom || resolveStudentStatusLabel(props.accountStatus)
})
</script>

<style scoped>
.osg-student-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.osg-student-status-tag--active {
  background: #d1fae5;
  color: #16a34a;
}

.osg-student-status-tag--frozen {
  background: #dbeafe;
  color: #1e40af;
}

.osg-student-status-tag--ended {
  background: #f3f4f6;
  color: #6b7280;
}

.osg-student-status-tag--refunded {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
