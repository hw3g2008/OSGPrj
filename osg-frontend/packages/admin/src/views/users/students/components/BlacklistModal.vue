<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-blacklist-modal"
    width="500px"
    :body-class="'student-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-blacklist-modal__title">
        <span class="mdi mdi-account-cancel student-blacklist-modal__title-icon" aria-hidden="true"></span>
        <span>加入黑名单</span>
      </span>
    </template>

    <div class="student-blacklist-modal__intro">
      <span class="mdi mdi-alert-circle-outline student-blacklist-modal__intro-icon" aria-hidden="true"></span>
      <div class="student-blacklist-modal__intro-copy">
        <h3 class="student-blacklist-modal__heading">
          确定将 <strong>{{ studentName || '当前学员' }}</strong> 加入黑名单？
        </h3>
        <p class="student-blacklist-modal__desc">
          加入黑名单后，该学员将<strong>无法查看“求职中心”模块</strong>（包括岗位信息、面试准备等功能）。
        </p>
      </div>
    </div>

    <div class="student-blacklist-modal__form-area">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        :required-mark="false"
      >
        <a-form-item name="reason" data-field-name="黑名单原因">
          <template #label>
            <span class="student-blacklist-modal__label">
              黑名单原因
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            placeholder="请选择原因"
            :options="reasonOptions"
            @change="handleReasonChange"
          />
        </a-form-item>

        <a-form-item v-if="showOtherInput" name="otherReason" data-field-name="其他原因说明">
          <template #label>
            <span class="student-blacklist-modal__label">
              其他原因说明
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.otherReason"
            placeholder="请输入具体原因"
          />
        </a-form-item>

        <a-form-item name="remark" data-field-name="备注说明">
          <template #label>
            <span class="student-blacklist-modal__label">备注说明</span>
          </template>
          <a-textarea
            v-model:value="formState.remark"
            :rows="2"
            :maxlength="200"
            placeholder="选填，可填写详细说明"
          />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <button type="button" class="student-blacklist-modal__footer-button student-blacklist-modal__footer-button--ghost" @click="handleClose">
        取消
      </button>
      <button type="button" class="student-blacklist-modal__footer-button student-blacklist-modal__footer-button--primary" @click="handleSubmit">
        确认加入黑名单
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  visible: boolean
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { reason: string; remark?: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  otherReason: '',
  remark: ''
})

const reasonOptions = [
  { label: '违反服务协议', value: '违反服务协议' },
  { label: '恶意投诉', value: '恶意投诉' },
  { label: '不配合辅导', value: '不配合辅导' },
  { label: '态度恶劣', value: '态度恶劣' },
  { label: '其他原因', value: 'other' }
]

const showOtherInput = computed(() => formState.reason === 'other')

const rules = computed(() => ({
  reason: [{ required: true, message: '请选择原因', trigger: 'change' }],
  otherReason: showOtherInput.value
    ? [{ required: true, message: '请输入具体原因', trigger: 'blur' }]
    : []
}))

const handleReasonChange = () => {
  if (!showOtherInput.value) {
    formState.otherReason = ''
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formState.reason = undefined
      formState.otherReason = ''
      formState.remark = ''
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  const finalReason = formState.reason === 'other'
    ? formState.otherReason.trim()
    : (formState.reason || '')
  emit('submit', {
    reason: finalReason,
    remark: formState.remark.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
:global([data-surface-id="student-blacklist-modal"] [data-surface-part="header"] .overlay-surface-modal__close) {
  color: #69758b;
}

.student-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.student-blacklist-modal__title-icon {
  color: #f18d43;
  font-size: 18px;
}

.student-blacklist-modal__intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff5eb;
}

.student-blacklist-modal__intro-icon {
  font-size: 18px;
  line-height: 1;
  color: #f18d43;
}

.student-blacklist-modal__intro-copy {
  flex: 1;
}

.student-blacklist-modal__heading {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a2234;
}

.student-blacklist-modal__desc {
  margin: 4px 0 0;
  color: #546179;
  font-size: 13px;
  line-height: 1.6;
}

.student-blacklist-modal__form-area {
  background: #f9fbff;
  padding: 16px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 14px;
}

.student-blacklist-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-blacklist-modal__required {
  color: #dc2626;
}

.student-blacklist-modal__footer-button {
  min-width: 112px;
  height: 42px;
  border-radius: 14px;
  padding: 0 20px;
  font-weight: 600;
  cursor: pointer;
}

.student-blacklist-modal__footer-button--ghost {
  border: 1px solid rgba(26, 34, 52, 0.12);
  background: #fff;
  color: #69758b;
}

.student-blacklist-modal__footer-button--primary {
  border: 0;
  background: linear-gradient(135deg, #f18d43, #f5ad6c);
  color: #fff;
  box-shadow: 0 16px 34px rgba(241, 141, 67, 0.2);
}
</style>
