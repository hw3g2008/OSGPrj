<template>
  <div class="step-member-status osg-modal-form" data-step="member-status">
    <div class="form-group">
      <label class="form-label">学员状态 <span class="required">*</span></label>
      <a-radio-group :value="form.memberStatus" @update:value="onStatusChange">
        <a-radio :value="MEMBER_STATUS.NORMAL">正常上课</a-radio>
        <a-radio :value="MEMBER_STATUS.ABSENT">旷课未到场</a-radio>
      </a-radio-group>
    </div>

    <div v-if="form.memberStatus === MEMBER_STATUS.ABSENT" class="form-group">
      <label class="form-label">旷课说明 <span class="required">*</span></label>
      <a-textarea
        :value="form.absentRemark || ''"
        :rows="4"
        placeholder="请说明本次旷课原因 / 是否提前请假..."
        :auto-size="{ minRows: 4, maxRows: 8 }"
        @update:value="(v: string) => update('absentRemark', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §4A.1 / §3.4 Step 4：学员状态 normal/absent + 旷课分支
 *
 * - normal → absent：emit absentToggle(true)；父组件设 durationHours=0.5（如未自定义）
 * - absent → normal：emit absentToggle(false)
 * - absent 时显示 absentRemark textarea；其它字段（feedback/rating）由父组件按 memberStatus 跳过
 */
import { computed } from 'vue'
import { MEMBER_STATUS, ABSENT_DEFAULT_HOURS } from '../../constants/classReport'
import type { ClassReportPayload, MemberStatus } from '../../types/classReport'

interface Props {
  modelValue: ClassReportPayload
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ClassReportPayload]
  absentToggle: [value: boolean]
}>()

const form = computed(() => props.modelValue)

function update<K extends keyof ClassReportPayload>(
  key: K,
  value: ClassReportPayload[K],
): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function onStatusChange(value: MemberStatus): void {
  emit('update:modelValue', { ...props.modelValue, memberStatus: value })
  emit('absentToggle', value === MEMBER_STATUS.ABSENT)
}

// 暴露常量给父组件做断言（不强制使用）
defineExpose({ ABSENT_DEFAULT_HOURS })
</script>

<style scoped lang="scss">
.step-member-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

:deep(.ant-radio-wrapper) {
  margin-right: 16px;
}

:deep(.ant-input) {
  min-height: 80px;
}
</style>
