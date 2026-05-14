<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-add-blacklist"
    width="560px"
    :body-class="'contract-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="contract-blacklist-modal__title">
        <span class="mdi mdi-account-cancel" aria-hidden="true"></span>
        <span>{{ $t('add_to_blacklist') }}</span>
      </span>
    </template>

    <div class="contract-blacklist-modal__intro">
      <strong>{{ targetLabel }}</strong>
      <span>{{ $t('provide_reason_and_notes_for_adding_to_b') }}。</span>
    </div>

    <a-form layout="vertical">
      <a-form-item :label="$t('select_reason')">
        <a-select v-model:value="form.reason" :placeholder="$t('please_select_a_reason')" @change="handleReasonChange">
          <a-select-option v-for="option in reasonOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="requiresOtherReason" :label="$t('other_reason_details')">
        <a-input v-model:value="form.otherReason" :placeholder="$t('please_enter_details_for_other_reason')" />
      </a-form-item>
      <a-form-item :label="$t('remarks_2')">
        <a-textarea v-model:value="form.remark" :rows="3" :placeholder="$t('optional_additional_notes')" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" danger @click="handleSubmit">{{ $t('confirm_2') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ContractListItem } from '@osg/shared/api/admin/contract'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  visible: boolean
  contract?: ContractListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: []
}>()

const reasonOptions = [t('unauthorized_contact_with_students'), t('service_complaint_escalation'), t('partnership_terminated'), t('other_reasons')]

const form = reactive({
  reason: '',
  otherReason: '',
  remark: '',
})

const targetLabel = computed(() => {
  if (!props.contract) return t('current_contract')
  return `${props.contract.studentName || t('current_student_2')} · ${props.contract.contractNo || props.contract.contractId}`
})

const requiresOtherReason = computed(() => form.reason === t('other_reasons'))

const resetForm = () => {
  form.reason = ''
  form.otherReason = ''
  form.remark = ''
}

watch(() => props.visible, (visible) => {
  if (visible) resetForm()
}, { immediate: true })

const handleReasonChange = () => {
  if (!requiresOtherReason.value) {
    form.otherReason = ''
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.reason) {
    message.error(t('please_select_a_reason'))
    return
  }
  if (requiresOtherReason.value && !form.otherReason.trim()) {
    message.error(t('please_fill_in_details_for_other_reason'))
    return
  }
  if (!form.remark.trim()) {
    message.error(t('please_fill_in_notes'))
    return
  }
  emit('submitted')
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
:global([data-surface-id="modal-add-blacklist"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border-bottom: none;
}

:global([data-surface-id="modal-add-blacklist"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.contract-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.contract-blacklist-modal__intro {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
  color: #35506f;
}

.contract-blacklist-modal__intro strong {
  display: block;
  margin-bottom: 4px;
}

</style>
