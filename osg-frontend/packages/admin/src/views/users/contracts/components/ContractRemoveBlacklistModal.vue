<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-remove-blacklist"
    width="560px"
    :body-class="'contract-remove-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="contract-remove-blacklist-modal__title">
        <span class="mdi mdi-account-arrow-right" aria-hidden="true"></span>
        <span>{{ $t('remove_from_blacklist') }}</span>
      </span>
    </template>

    <div class="contract-remove-blacklist-modal__intro">
      <strong>{{ targetLabel }}</strong>
      <span>{{ $t('provide_reason_and_notes_for_removing_fr') }}。</span>
    </div>

    <a-form layout="vertical">
      <a-form-item :label="$t('removal_reason')">
        <a-select v-model:value="form.reason" :placeholder="$t('please_select_a_removal_reason')">
          <a-select-option v-for="option in reasonOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="$t('remarks_2')">
        <a-textarea v-model:value="form.remark" :rows="3" :placeholder="$t('optional_additional_notes')" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">{{ $t('confirm_removal') }}</a-button>
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

const reasonOptions = [t('blacklist_period_expired'), t('mistakenly_added_to_blacklist'), t('rectification_completed'), t('other_reasons')]

const form = reactive({
  reason: '',
  remark: '',
})

const targetLabel = computed(() => {
  if (!props.contract) return t('current_contract')
  return `${props.contract.studentName || t('current_student_2')} · ${props.contract.contractNo || props.contract.contractId}`
})

const resetForm = () => {
  form.reason = ''
  form.remark = ''
}

watch(() => props.visible, (visible) => {
  if (visible) resetForm()
}, { immediate: true })

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.reason) {
    message.error(t('please_select_a_removal_reason'))
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
:global([data-surface-id="modal-remove-blacklist"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-bottom: none;
}

:global([data-surface-id="modal-remove-blacklist"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.contract-remove-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.contract-remove-blacklist-modal__intro {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
  color: #35506f;
}

.contract-remove-blacklist-modal__intro strong {
  display: block;
  margin-bottom: 4px;
}

</style>
