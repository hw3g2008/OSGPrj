<template>
  <OverlaySurfaceModal
    :open="visible"
    width="520px"
    :surface-id="surfaceId"
    @cancel="handleClose"
  >
    <template #title>
      <span class="staff-status-modal__title">
        <span class="mdi" :class="actionIcon" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <div class="staff-status-modal__intro">
      <div class="staff-status-modal__icon-circle" :class="`staff-status-modal__icon-circle--${action}`">
        <span class="mdi" :class="actionIcon" aria-hidden="true"></span>
      </div>
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
      <label
        v-if="props.action === 'remove'"
        class="staff-status-modal__field"
        data-field-name="移出原因"
      >
        <a-form-item name="reason" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">
            {{ reasonLabel }}
            <span class="staff-status-modal__required">*</span>
          </span>
          <a-select
            v-model:value="formState.reason"
            :placeholder="reasonPlaceholder"
            :options="reasonOptions"
          />
        </a-form-item>
      </label>

      <label
        v-else-if="requiresReason"
        class="staff-status-modal__field"
        :data-field-name="reasonFieldName"
      >
        <a-form-item name="reason" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">
            {{ reasonLabel }}
            <span class="staff-status-modal__required">*</span>
          </span>
          <a-select
            v-model:value="formState.reason"
            :placeholder="reasonPlaceholder"
            :options="reasonOptions"
          />
        </a-form-item>
      </label>

      <label v-if="formState.reason === 'other'" class="staff-status-modal__field" data-field-name="其他原因说明">
        <a-form-item name="otherReason" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">其他原因说明</span>
          <a-textarea
            v-model:value="formState.otherReason"
            :rows="3"
            :maxlength="120"
            placeholder="请补充其他原因"
          />
        </a-form-item>
      </label>

      <label class="staff-status-modal__field" data-field-name="备注说明">
        <a-form-item name="remark" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">备注说明</span>
          <a-textarea
            v-model:value="formState.remark"
            :rows="3"
            :maxlength="120"
            placeholder="可选，补充本次操作的背景说明"
          />
        </a-form-item>
      </label>
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
  otherReason: '',
  remark: ''
})

const reasonOptionMap: Record<'freeze' | 'blacklist', { label: string; value: string }[]> = {
  freeze: [
    { label: '导师申请暂停', value: 'staff_pause' },
    { label: '服务质量问题', value: 'service_quality' },
    { label: '违反服务协议', value: 'policy_violation' },
    { label: '其他原因', value: 'other' }
  ],
  blacklist: [
    { label: '违规联系学员', value: 'contact_violation' },
    { label: '严重服务投诉', value: 'service_complaint' },
    { label: '合作终止', value: 'cooperation_end' },
    { label: '其他原因', value: 'other' }
  ]
}

const requiresReason = computed(() => true)

const surfaceId = computed(() => {
  if (props.action === 'blacklist') {
    return 'modal-mentor-blacklist'
  }
  if (props.action === 'remove') {
    return 'modal-remove-mentor-blacklist'
  }
  return 'modal-staff-status-change'
})

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

const reasonLabel = computed(() => {
  if (props.action === 'remove') {
    return '移出原因'
  }
  if (props.action === 'blacklist') {
    return '原因选择'
  }
  return '状态修改原因'
})

const reasonFieldName = computed(() => reasonLabel.value)

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
  if (props.action === 'blacklist') {
    return reasonOptionMap.blacklist
  }
  return reasonOptionMap.freeze
})

const reasonPlaceholder = computed(() => {
  if (props.action === 'remove') {
    return '请选择移出原因'
  }
  if (props.action === 'blacklist') {
    return '请选择黑名单原因'
  }
  if (props.action === 'restore') {
    return '请选择恢复原因'
  }
  return '请选择禁用原因'
})

const rules = computed(() => ({
  reason: requiresReason.value ? [{ required: true, message: '请选择原因', trigger: 'change' }] : []
}))

const resetForm = () => {
  formState.reason = undefined
  formState.otherReason = ''
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
    remark: [formState.otherReason.trim(), formState.remark.trim()].filter(Boolean).join(' ') || undefined
  })
}
</script>

<style scoped lang="scss">
:global([data-surface-id="modal-staff-status-change"] [data-surface-part="header"]),
:global([data-surface-id="modal-mentor-blacklist"] [data-surface-part="header"]),
:global([data-surface-id="modal-remove-mentor-blacklist"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3);
  border-bottom: none;
}

:global([data-surface-id="modal-staff-status-change"] [data-surface-part="header"] .overlay-surface-modal__close),
:global([data-surface-id="modal-mentor-blacklist"] [data-surface-part="header"] .overlay-surface-modal__close),
:global([data-surface-id="modal-remove-mentor-blacklist"] [data-surface-part="header"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.staff-status-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.staff-status-modal__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.68), rgba(254, 249, 195, 0.52));
  color: #1f2937;
  text-align: center;
}

.staff-status-modal__icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  font-size: 36px;

  &--freeze {
    background: #E2E8F0;
    color: #334155;
  }

  &--restore {
    background: #DCFCE7;
    color: #166534;
  }

  &--blacklist {
    background: #FEE2E2;
    color: #991B1B;
  }

  &--remove {
    background: #DBEAFE;
    color: #1E40AF;
  }
}

.staff-status-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.staff-status-modal__required {
  color: #dc2626;
}

.staff-status-modal__field {
  display: block;
  margin: 0 0 16px;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.staff-status-modal__form-item {
  margin-bottom: 0;
}
</style>
