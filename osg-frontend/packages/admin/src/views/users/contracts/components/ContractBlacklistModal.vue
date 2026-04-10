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
        <span>加入黑名单</span>
      </span>
    </template>

    <div class="contract-blacklist-modal__intro">
      <strong>{{ targetLabel }}</strong>
      <span>填写加入黑名单的原因与备注说明。</span>
    </div>

    <a-form layout="vertical">
      <a-form-item label="原因选择">
        <a-select v-model:value="form.reason" placeholder="请选择原因" @change="handleReasonChange">
          <a-select-option v-for="option in reasonOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="requiresOtherReason" label="其他原因说明">
        <a-input v-model:value="form.otherReason" placeholder="请输入其他原因说明" />
      </a-form-item>
      <a-form-item label="备注说明">
        <a-textarea v-model:value="form.remark" :rows="3" placeholder="可填写补充说明" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" danger @click="handleSubmit">确认加入</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ContractListItem } from '@osg/shared/api/admin/contract'

const props = defineProps<{
  visible: boolean
  contract?: ContractListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: []
}>()

const reasonOptions = ['违规联系学员', '服务投诉升级', '合作终止', '其他原因']

const form = reactive({
  reason: '',
  otherReason: '',
  remark: '',
})

const targetLabel = computed(() => {
  if (!props.contract) return '当前合同'
  return `${props.contract.studentName || '当前学员'} · ${props.contract.contractNo || props.contract.contractId}`
})

const requiresOtherReason = computed(() => form.reason === '其他原因')

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
    message.error('请选择原因')
    return
  }
  if (requiresOtherReason.value && !form.otherReason.trim()) {
    message.error('请填写其他原因说明')
    return
  }
  if (!form.remark.trim()) {
    message.error('请填写备注说明')
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
