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
      <strong>{{ staffName || $t('current_mentor') }}</strong>
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
        :data-field-name="$t('removal_reason')"
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

      <label v-if="formState.reason === 'other'" class="staff-status-modal__field" :data-field-name="$t('other_reason_details')">
        <a-form-item name="otherReason" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">{{ $t('other_reason_details') }}</span>
          <a-textarea
            v-model:value="formState.otherReason"
            :rows="3"
            :maxlength="120"
            :placeholder="$t('please_provide_additional_reason')"
          />
        </a-form-item>
      </label>

      <label class="staff-status-modal__field" :data-field-name="$t('remarks_2')">
        <a-form-item name="remark" class="staff-status-modal__form-item">
          <span class="staff-status-modal__label">{{ $t('remarks_2') }}</span>
          <a-textarea
            v-model:value="formState.remark"
            :rows="3"
            :maxlength="120"
            :placeholder="$t('optional_add_background_context_for_this')"
          />
        </a-form-item>
      </label>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">{{ $t('confirm') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
    { label: t('mentor_requested_suspension'), value: 'staff_pause' },
    { label: t('service_quality_issue'), value: 'service_quality' },
    { label: t('violation_of_service_agreement'), value: 'policy_violation' },
    { label: t('other_reasons'), value: 'other' }
  ],
  blacklist: [
    { label: t('unauthorized_contact_with_students'), value: 'contact_violation' },
    { label: t('serious_service_complaint'), value: 'service_complaint' },
    { label: t('partnership_terminated'), value: 'cooperation_end' },
    { label: t('other_reasons'), value: 'other' }
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
    return t('disable_mentor_account')
  }
  if (props.action === 'restore') {
    return t('unfreeze_mentor_account')
  }
  if (props.action === 'blacklist') {
    return t('add_to_blacklist')
  }
  return t('remove_from_blacklist')
})

const reasonLabel = computed(() => {
  if (props.action === 'remove') {
    return t('removal_reason')
  }
  if (props.action === 'blacklist') {
    return t('select_reason')
  }
  return t('reason_for_status_change')
})

const reasonFieldName = computed(() => reasonLabel.value)

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return t('after_disabling_this_mentor_account_will')
  }
  if (props.action === 'restore') {
    return t('upon_confirmation_this_mentor_account_wi')
  }
  if (props.action === 'blacklist') {
    return t('after_blacklisting_this_mentor_will_be_r')
  }
  return t('upon_confirmation_this_mentors_blacklist')
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
    return t('please_select_a_removal_reason')
  }
  if (props.action === 'blacklist') {
    return t('please_select_blacklist_reason')
  }
  if (props.action === 'restore') {
    return t('please_select_restoration_reason')
  }
  return t('please_select_disable_reason')
})

const rules = computed(() => ({
  reason: requiresReason.value ? [{ required: true, message: t('please_select_a_reason'), trigger: 'change' }] : []
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
