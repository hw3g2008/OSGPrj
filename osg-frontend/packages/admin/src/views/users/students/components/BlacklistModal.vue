<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-blacklist-modal"
    width="500px"
    :body-class="'student-blacklist-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-blacklist-modal__title">
        <span class="mdi mdi-account-cancel student-blacklist-modal__title-icon" aria-hidden="true"></span>
        <span>{{ t('admin.students.blacklistModal.title') }}</span>
      </span>
    </template>

    <div class="student-blacklist-modal__intro">
      <span class="mdi mdi-alert-circle-outline student-blacklist-modal__intro-icon" aria-hidden="true"></span>
      <div class="student-blacklist-modal__intro-copy">
        <h3 class="student-blacklist-modal__heading">
          {{ t('admin.students.blacklistModal.headingPre') }}
          <strong>{{ studentName || t('admin.students.blacklistModal.studentFallback') }}</strong>
          {{ t('admin.students.blacklistModal.headingPost') }}
        </h3>
        <p class="student-blacklist-modal__desc">
          {{ t('admin.students.blacklistModal.descPre') }}<strong>{{ t('admin.students.blacklistModal.descBold') }}</strong>{{ t('admin.students.blacklistModal.descPost') }}
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
        <a-form-item name="reason" data-field-name="黑名单原因"> <!-- i18n-skip-line: playwright selector -->
          <template #label>
            <span class="student-blacklist-modal__label">
              {{ t('admin.students.blacklistModal.reasonLabel') }}
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            :placeholder="t('admin.students.blacklistModal.reasonPlaceholder')"
            :options="reasonOptions"
            @change="handleReasonChange"
          />
        </a-form-item>

        <a-form-item v-if="showOtherInput" name="otherReason" data-field-name="其他原因说明"> <!-- i18n-skip-line: playwright selector -->
          <template #label>
            <span class="student-blacklist-modal__label">
              {{ t('admin.students.blacklistModal.otherReasonLabel') }}
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.otherReason"
            :placeholder="t('admin.students.blacklistModal.otherReasonPlaceholder')"
          />
        </a-form-item>

        <a-form-item name="remark" data-field-name="备注说明"> <!-- i18n-skip-line: playwright selector -->
          <template #label>
            <span class="student-blacklist-modal__label">{{ t('admin.students.blacklistModal.remarkLabel') }}</span>
          </template>
          <a-textarea
            v-model:value="formState.remark"
            :rows="2"
            :maxlength="200"
            :placeholder="t('admin.students.blacklistModal.remarkPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.students.blacklistModal.footer.cancel') }}</a-button>
      <a-button type="primary" danger @click="handleSubmit">{{ t('admin.students.blacklistModal.footer.confirm') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

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

const reasonOptions = computed(() => [
  { label: t('admin.students.blacklistModal.reasons.serviceViolation'), value: '违反服务协议' }, // i18n-skip-line: backend values
  { label: t('admin.students.blacklistModal.reasons.maliciousComplaint'), value: '恶意投诉' }, // i18n-skip-line: backend values
  { label: t('admin.students.blacklistModal.reasons.nonCooperative'), value: '不配合辅导' }, // i18n-skip-line: backend values
  { label: t('admin.students.blacklistModal.reasons.badAttitude'), value: '态度恶劣' }, // i18n-skip-line: backend values
  { label: t('admin.students.blacklistModal.reasons.other'), value: 'other' },
])

const showOtherInput = computed(() => formState.reason === 'other')

const rules = computed(() => ({
  reason: [{ required: true, message: t('admin.students.blacklistModal.validation.reason'), trigger: 'change' }],
  otherReason: showOtherInput.value
    ? [{ required: true, message: t('admin.students.blacklistModal.validation.otherReason'), trigger: 'blur' }]
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

</style>
