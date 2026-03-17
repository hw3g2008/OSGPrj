<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-status-change-modal"
    width="520px"
    :body-class="'student-status-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-status-modal__title">
        <span class="mdi" :class="actionIcon" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <div class="student-status-modal__intro">
      <strong>{{ studentName || '当前学员' }}</strong>
      <span>{{ modalDescription }}</span>
    </div>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item v-if="requiresReason" name="reason">
        <template #label>
          <span class="student-status-modal__label">
            原因
            <span class="student-status-modal__required">*</span>
          </span>
        </template>
        <a-select
          v-model:value="formState.reason"
          :placeholder="reasonPlaceholder"
          :options="reasonOptions"
        />
      </a-form-item>

      <a-form-item v-if="requiresReason" name="remark">
        <template #label>
          <span class="student-status-modal__label">补充说明</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          :rows="3"
          :maxlength="120"
          placeholder="可选，补充本次状态变更的背景说明"
        />
      </a-form-item>

      <div v-else class="student-status-modal__restore-note">
        恢复操作无需填写原因，确认后将直接恢复学员账号状态。
      </div>
    </a-form>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="permission-button permission-button--primary" @click="handleSubmit">
        确认
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

type StatusAction = 'freeze' | 'refund' | 'restore'

const props = defineProps<{
  visible: boolean
  action: StatusAction
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { action: StatusAction; reason?: string; remark?: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  remark: ''
})

const reasonOptionMap: Record<'freeze' | 'refund', { label: string; value: string }[]> = {
  freeze: [
    { label: '课时欠费', value: 'payment_overdue' },
    { label: '违反学习规范', value: 'policy_violation' },
    { label: '资料待补齐', value: 'document_pending' }
  ],
  refund: [
    { label: '服务终止', value: 'service_terminated' },
    { label: '重复缴费', value: 'duplicate_payment' },
    { label: '转班退费', value: 'transfer_refund' }
  ]
}

const requiresReason = computed(() => props.action === 'freeze' || props.action === 'refund')

const modalTitle = computed(() => {
  if (props.action === 'freeze') {
    return '冻结学员账号'
  }
  if (props.action === 'refund') {
    return '学员退费处理'
  }
  return '恢复学员账号'
})

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return '请先选择冻结原因，提交后系统会记录本次冻结依据。'
  }
  if (props.action === 'refund') {
    return '请先选择退费原因，便于后续追溯财务与服务状态。'
  }
  return '确认后学员账号将恢复为正常状态。'
})

const actionIcon = computed(() => {
  if (props.action === 'freeze') {
    return 'mdi-snowflake-alert'
  }
  if (props.action === 'refund') {
    return 'mdi-cash-refund'
  }
  return 'mdi-lock-open-check'
})

const reasonOptions = computed(() => {
  if (props.action === 'restore') {
    return []
  }
  return reasonOptionMap[props.action]
})

const reasonPlaceholder = computed(() => {
  return props.action === 'freeze' ? '请选择冻结原因' : '请选择退费原因'
})

const rules = computed(() => ({
  reason: requiresReason.value ? [{ required: true, message: '请选择原因', trigger: 'change' }] : []
}))

const resetForm = () => {
  formState.reason = undefined
  formState.remark = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  if (requiresReason.value) {
    await formRef.value?.validate()
  }
  emit('submit', {
    action: props.action,
    reason: formState.reason,
    remark: formState.remark.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.student-status-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.student-status-modal__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.68), rgba(254, 249, 195, 0.52));
  color: #1f2937;
}

.student-status-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-status-modal__required {
  color: #dc2626;
}

.student-status-modal__restore-note {
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 14px;
  line-height: 1.6;
}
</style>
