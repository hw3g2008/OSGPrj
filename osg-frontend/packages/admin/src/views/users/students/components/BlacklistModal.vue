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
        <span>{{ $t('add_to_blacklist') }}</span>
      </span>
    </template>

    <div class="student-blacklist-modal__intro">
      <span class="mdi mdi-alert-circle-outline student-blacklist-modal__intro-icon" aria-hidden="true"></span>
      <div class="student-blacklist-modal__intro-copy">
        <h3 class="student-blacklist-modal__heading">
          {{ $t('confirm_student_blacklist', { name: studentName || $t('current_student_2') }) }}
        </h3>
        <p class="student-blacklist-modal__desc">
          {{ $t('student_blacklist_description') }}
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
        <a-form-item name="reason" :data-field-name="$t('blacklist_reason')">
          <template #label>
            <span class="student-blacklist-modal__label">
              {{ $t('blacklist_reason') }}
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            :placeholder="$t('please_select_a_reason')"
            :options="reasonOptions"
            @change="handleReasonChange"
          />
        </a-form-item>

        <a-form-item v-if="showOtherInput" name="otherReason" :data-field-name="$t('other_reason_details')">
          <template #label>
            <span class="student-blacklist-modal__label">
              {{ $t('other_reason_details') }}
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.otherReason"
            :placeholder="$t('please_enter_a_specific_reason')"
          />
        </a-form-item>

        <a-form-item name="remark" :data-field-name="$t('remarks_2')">
          <template #label>
            <span class="student-blacklist-modal__label">{{ $t('remarks_2') }}</span>
          </template>
          <a-textarea
            v-model:value="formState.remark"
            :rows="2"
            :maxlength="200"
            :placeholder="$t('optional_additional_details_can_be_added')"
          />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" danger @click="handleSubmit">{{ $t('confirm_blacklist') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useI18n } from 'vue-i18n'

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

const reasonOptions = [
  { label: t('violation_of_service_agreement'), value: t('violation_of_service_agreement') },
  { label: t('malicious_complaint'), value: t('malicious_complaint') },
  { label: t('uncooperative_with_coaching'), value: t('uncooperative_with_coaching') },
  { label: t('poor_attitude'), value: t('poor_attitude') },
  { label: t('other_reasons'), value: 'other' }
]

const showOtherInput = computed(() => formState.reason === 'other')

const rules = computed(() => ({
  reason: [{ required: true, message: t('please_select_a_reason'), trigger: 'change' }],
  otherReason: showOtherInput.value
    ? [{ required: true, message: t('please_enter_a_specific_reason'), trigger: 'blur' }]
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
