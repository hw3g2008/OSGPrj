<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-status-change-modal"
    width="480px"
    :body-class="'student-status-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-status-modal__title">
        <span class="mdi mdi-account-cog student-status-modal__title-icon" aria-hidden="true"></span>
        <span>{{ $t('update_student_status') }}</span>
      </span>
    </template>

    <div class="student-status-modal__intro">
      <span class="mdi student-status-modal__intro-icon" :class="actionIcon" aria-hidden="true"></span>
      <div class="student-status-modal__intro-copy">
        <h3 class="student-status-modal__heading">
          {{ $t('confirm_student_status_change', { name: studentName || $t('student_name'), status: targetStatusLabel }) }}
        </h3>
        <p class="student-status-modal__desc">{{ modalDescription }}</p>
      </div>
    </div>

    <div v-if="requiresReason" class="student-status-modal__form-area">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        :required-mark="false"
      >
        <a-form-item name="reason" :data-field-name="$t('reason_for_change')">
          <template #label>
            <span class="student-status-modal__label">
              {{ $t('reason_for_change') }}
              <span class="student-status-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            :placeholder="$t('please_select_a_reason')"
            :options="reasonOptions"
          />
        </a-form-item>

        <a-form-item name="remark" :data-field-name="$t('remarks_2')">
          <template #label>
            <span class="student-status-modal__label">{{ $t('remarks_2') }}</span>
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
      <a-button type="primary" @click="handleSubmit">{{ $t('confirm_change') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
type StatusAction = 'freeze' | 'refund' | 'restore'

const props = defineProps<{
  visible: boolean
  action: StatusAction
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { action: StatusAction; reason?: string; remark?: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  remark: ''
})

const reasonOptionMap: Record<'freeze' | 'refund', { label: string; value: string }[]> = {
  freeze: [
    { label: t('student_requested_suspension'), value: t('student_requested_suspension') },
    { label: t('hours_used_up_pending_renewal'), value: t('hours_used_up_pending_renewal') },
    { label: t('violation_of_service_agreement'), value: t('violation_of_service_agreement') },
    { label: t('student_requested_refund'), value: t('student_requested_refund') },
    { label: t('other_reasons'), value: t('other_reasons') }
  ],
  refund: [
    { label: t('student_requested_suspension'), value: t('student_requested_suspension') },
    { label: t('hours_used_up_pending_renewal'), value: t('hours_used_up_pending_renewal') },
    { label: t('violation_of_service_agreement'), value: t('violation_of_service_agreement') },
    { label: t('student_requested_refund'), value: t('student_requested_refund') },
    { label: t('other_reasons'), value: t('other_reasons') }
  ]
}

const requiresReason = computed(() => props.action === 'freeze' || props.action === 'refund')

const targetStatusLabel = computed(() => {
  if (props.action === 'freeze') return t('frozen')
  if (props.action === 'refund') return t('refund')
  return t('active_3')
})

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return t('student_freeze_status_description')
  }
  if (props.action === 'refund') {
    return t('student_refund_status_description')
  }
  return t('student_restore_status_description')
})

const actionIcon = computed(() => {
  if (props.action === 'freeze') return 'mdi-snowflake'
  if (props.action === 'refund') return 'mdi-cash-refund'
  return 'mdi-check-circle'
})

const reasonOptions = computed(() => {
  if (props.action === 'restore') return []
  return reasonOptionMap[props.action]
})

const rules = computed(() => ({
  reason: requiresReason.value ? [{ required: true, message: t('please_select_a_reason'), trigger: 'change' }] : []
}))

const resetForm = () => {
  formState.reason = undefined
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
    remark: formState.remark.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.student-status-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.student-status-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.student-status-modal__intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
}

.student-status-modal__intro-icon {
  font-size: 18px;
  line-height: 1;
  color: #4f74ff;
}

.student-status-modal__intro-copy {
  flex: 1;
}

.student-status-modal__heading {
  margin: 0;
  color: #1a2234;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
}

.student-status-modal__name {
  color: #3f68ff;
}

.student-status-modal__target-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  margin: 0 4px;
  border-radius: 999px;
  background: rgba(79, 116, 255, 0.12);
  color: #3f68ff;
  font-size: 13px;
  font-weight: 700;
}

.student-status-modal__desc {
  margin: 4px 0 0;
  color: #546179;
  font-size: 13px;
  line-height: 1.6;
}

.student-status-modal__form-area {
  background: #f9fbff;
  padding: 16px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 14px;
  text-align: left;
}

.student-status-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-status-modal__required {
  color: #dc2626;
}

</style>
