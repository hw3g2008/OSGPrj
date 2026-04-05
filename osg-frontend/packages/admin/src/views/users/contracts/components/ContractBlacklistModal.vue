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

    <div class="contract-blacklist-modal__field-list">
      <label class="contract-blacklist-modal__field" data-field-name="原因选择">
        <span>原因选择</span>
        <select v-model="form.reason" class="contract-blacklist-modal__control" @change="handleReasonChange">
          <option value="">请选择原因</option>
          <option v-for="option in reasonOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label v-if="requiresOtherReason" class="contract-blacklist-modal__field" data-field-name="其他原因说明">
        <span>其他原因说明</span>
        <input v-model="form.otherReason" type="text" class="contract-blacklist-modal__control" placeholder="请输入其他原因说明" />
      </label>

      <label class="contract-blacklist-modal__field contract-blacklist-modal__field--wide" data-field-name="备注说明">
        <span>备注说明</span>
        <textarea
          v-model="form.remark"
          rows="3"
          class="contract-blacklist-modal__control contract-blacklist-modal__control--textarea"
          placeholder="可填写补充说明"
        />
      </label>
    </div>

    <template #footer>
      <div class="contract-blacklist-modal__footer">
        <button type="button" class="contract-blacklist-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="contract-blacklist-modal__primary" @click="handleSubmit">确认加入</button>
      </div>
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

.contract-blacklist-modal__field-list {
  display: grid;
  gap: 14px;
}

.contract-blacklist-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #40536d;
  font-size: 13px;
  font-weight: 600;
}

.contract-blacklist-modal__field--wide {
  grid-column: 1 / -1;
}

.contract-blacklist-modal__control {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #d5dfeb;
  background: #fff;
  padding: 0 14px;
  color: #1f3552;
}

.contract-blacklist-modal__control--textarea {
  padding: 12px 14px;
}

.contract-blacklist-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.contract-blacklist-modal__secondary,
.contract-blacklist-modal__primary {
  border: none;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}

.contract-blacklist-modal__secondary {
  background: #f7f9fc;
  color: #1d3552;
  border: 1px solid #d8e1ed;
}

.contract-blacklist-modal__primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #fff;
}
</style>
