<template>
  <OverlaySurfaceModal
    :open="visible"
    width="520px"
    surface-id="staff-status-change-modal"
    @cancel="handleClose"
  >
    <template #title>
      <span class="staff-status-modal__title">
        <span class="mdi" :class="actionIcon" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <div class="staff-status-modal__intro">
      <strong>{{ staffName || '当前导师' }}</strong>
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
          <span class="staff-status-modal__label">
            原因
            <span class="staff-status-modal__required">*</span>
          </span>
        </template>
        <a-select
          v-model:value="formState.reason"
          :placeholder="reasonPlaceholder"
          :options="reasonOptions"
        />
      </a-form-item>

      <a-form-item name="remark">
        <template #label>
          <span class="staff-status-modal__label">补充说明</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          :rows="3"
          :maxlength="120"
          placeholder="可选，补充本次操作的背景说明"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">取消</button>
      <button
        type="button"
        class="permission-button permission-button--primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '提交中...' : '确认' }}
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

type StatusAction = 'freeze' | 'restore' | 'blacklist' | 'remove'

const props = defineProps<{
  visible: boolean
  action: StatusAction
  staffName?: string
  submitting?: boolean
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

const reasonOptionMap: Record<'freeze' | 'blacklist', { label: string; value: string }[]> = {
  freeze: [
    { label: '排期长期未维护', value: 'schedule_missing' },
    { label: '服务反馈异常', value: 'service_issue' },
    { label: '账号资料待补齐', value: 'document_pending' }
  ],
  blacklist: [
    { label: '违规联系学员', value: 'contact_violation' },
    { label: '严重服务投诉', value: 'service_complaint' },
    { label: '合作终止', value: 'cooperation_end' }
  ]
}

const requiresReason = computed(() => props.action === 'freeze' || props.action === 'blacklist')

const modalTitle = computed(() => {
  if (props.action === 'freeze') {
    return '禁用导师账号'
  }
  if (props.action === 'restore') {
    return '解冻导师账号'
  }
  if (props.action === 'blacklist') {
    return '加入黑名单'
  }
  return '移出黑名单'
})

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return '禁用后该导师账号将无法正常登录系统。'
  }
  if (props.action === 'restore') {
    return '确认后该导师账号将恢复为正常可用状态。'
  }
  if (props.action === 'blacklist') {
    return '加入黑名单后，该导师将被限制使用后续相关模块能力。'
  }
  return '确认后将解除该导师的黑名单状态。'
})

const actionIcon = computed(() => {
  if (props.action === 'freeze') {
    return 'mdi-account-off'
  }
  if (props.action === 'restore') {
    return 'mdi-account-check'
  }
  if (props.action === 'blacklist') {
    return 'mdi-account-cancel'
  }
  return 'mdi-account-arrow-up'
})

const reasonOptions = computed(() => {
  if (props.action === 'freeze' || props.action === 'blacklist') {
    return reasonOptionMap[props.action]
  }
  return []
})

const reasonPlaceholder = computed(() => {
  return props.action === 'freeze' ? '请选择禁用原因' : '请选择黑名单原因'
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
.staff-status-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.staff-status-modal__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.68), rgba(254, 249, 195, 0.52));
  color: #1f2937;
}

.staff-status-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.staff-status-modal__required {
  color: #dc2626;
}
</style>
