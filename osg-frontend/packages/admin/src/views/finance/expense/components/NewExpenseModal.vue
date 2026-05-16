<template>
  <OverlaySurfaceModal
    surface-id="modal-new-expense"
    :open="modelValue"
    width="600px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-cash-plus" aria-hidden="true" />
        <span>{{ t('admin.finance.expense.modal.title') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.mentorId')">
            <a-input-number v-model:value="form.mentorId" :min="1" :placeholder="t('admin.finance.expense.modal.mentorIdPlaceholder')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.mentorName')">
            <a-input v-model:value="form.mentorName" :placeholder="t('admin.finance.expense.modal.mentorNamePlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.type')">
            <a-select v-model:value="form.expenseType">
              <a-select-option v-for="type in expenseTypes" :key="type" :value="type">{{ type }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.amount')">
            <a-input-number
              v-model:value="amountInput"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :placeholder="t('admin.finance.expense.modal.amountPlaceholder')"
              style="width:100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.date')">
            <a-input v-model:value="form.expenseDate" type="date" :placeholder="t('admin.finance.expense.modal.datePlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.finance.expense.modal.attachment')">
            <a-input v-model:value="form.attachmentUrl" :placeholder="t('admin.finance.expense.modal.attachmentPlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item :label="t('admin.finance.expense.modal.description')">
            <a-textarea v-model:value="form.description" :rows="4" :placeholder="t('admin.finance.expense.modal.descriptionPlaceholder')" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ t('admin.finance.expense.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">{{ t('admin.finance.expense.modal.create') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import type { CreateExpensePayload, ExpenseType } from '@osg/shared/api/admin/expense'
import { MAX_AMOUNT, MAX_AMOUNT_MESSAGE } from '@osg/shared/utils'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

const expenseTypes: ExpenseType[] = [
  'Mentor Referral',
  'Student Referral',
  'Transportation',
  'Materials',
  'Other'
]

const props = withDefaults(defineProps<{
  modelValue: boolean
  submitting?: boolean
}>(), {
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: CreateExpensePayload): void
}>()

const initialForm = (): CreateExpensePayload => ({
  mentorId: 0,
  mentorName: '',
  expenseType: 'Mentor Referral',
  expenseAmount: '',
  expenseDate: '',
  description: '',
  attachmentUrl: ''
})

const form = reactive<CreateExpensePayload>(initialForm())
const amountInput = ref<number | undefined>(undefined)

watch(() => props.modelValue, (open) => {
  if (!open) {
    Object.assign(form, initialForm())
    amountInput.value = undefined
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  // i18n-skip-line: dev comment — a-input-number :max 已会拦截超限输入，此处提交前再做一道兼险
  if ((amountInput.value ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  emit('confirm', {
    mentorId: Number(form.mentorId),
    mentorName: form.mentorName,
    expenseType: form.expenseType,
    expenseAmount: amountInput.value != null ? String(amountInput.value) : '',
    expenseDate: form.expenseDate,
    description: form.description,
    attachmentUrl: form.attachmentUrl || undefined
  })
}
</script>
