<template>
  <OverlaySurfaceModal
    surface-id="modal-mark-paid"
    :open="modelValue"
    width="500px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-check-decagram" aria-hidden="true" />
        <span>确认已支付</span>
      </span>
    </template>

    <p style="margin:0 0 16px;color:#64748b">{{ summaryLabel }}</p>

    <div style="margin-bottom:16px">
      <span style="display:block;margin-bottom:4px;font-size:13px;color:#64748b">结算金额</span>
      <strong style="font-size:24px;color:#1d4ed8">{{ amount }}</strong>
    </div>

    <a-form layout="vertical">
      <a-form-item label="支付日期">
        <a-input v-model:value="paymentDate" type="date" />
      </a-form-item>
      <a-form-item label="银行流水号">
        <a-input v-model:value="bankReferenceNo" placeholder="选填" />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="remark" :rows="3" placeholder="选填" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">确认已支付</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  summaryLabel: string
  amount: string
  submitting?: boolean
}>(), {
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: { paymentDate: string; bankReferenceNo?: string; remark?: string }): void
}>()

const paymentDate = ref('')
const bankReferenceNo = ref('')
const remark = ref('')

watch(() => props.modelValue, (open) => {
  if (!open) {
    paymentDate.value = ''
    bankReferenceNo.value = ''
    remark.value = ''
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('confirm', {
    paymentDate: paymentDate.value,
    bankReferenceNo: bankReferenceNo.value || undefined,
    remark: remark.value || undefined
  })
}
</script>
