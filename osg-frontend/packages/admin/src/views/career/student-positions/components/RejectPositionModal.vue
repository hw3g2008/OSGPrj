<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-reject-position"
    width="560px"
    :body-class="'student-reject-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-close-octagon-outline" aria-hidden="true"></span>
        <span>{{ t('admin.career.studentPositions.rejectModal.title') }}</span>
      </span>
    </template>

    <section class="student-reject-modal__hero">
      <strong>{{ position?.studentName || t('admin.career.studentPositions.rejectModal.student') }}</strong>
      <span>{{ t('admin.career.studentPositions.rejectModal.description') }}</span>
    </section>

    <section class="student-reject-modal__section">
      <label class="student-reject-modal__label">
        <span>{{ t('admin.career.studentPositions.rejectModal.reasonLabel') }}</span>
      </label>
      <div class="student-reject-modal__reason-grid">
        <button
          v-for="option in reasonOptions"
          :key="option.value"
          type="button"
          :class="[
            'student-reject-modal__reason-option',
            { 'student-reject-modal__reason-option--active': formState.reason === option.value }
          ]"
          @click="formState.reason = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section class="student-reject-modal__section">
      <label class="student-reject-modal__label">
        <span>{{ t('admin.career.studentPositions.rejectModal.noteLabel') }}</span>
      </label>
      <a-textarea
        v-model:value="formState.note"
        :rows="4"
        :maxlength="120"
        :placeholder="t('admin.career.studentPositions.rejectModal.notePlaceholder')"
      />
      <div class="student-reject-modal__meta">{{ formState.note.length }}/120</div>
    </section>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ t('admin.career.studentPositions.rejectModal.cancel') }}</a-button>
      <a-button danger data-surface-part="confirm-control" @click="handleSubmit">{{ t('admin.career.studentPositions.rejectModal.confirm') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { RejectStudentPositionPayload, StudentPositionListItem } from '@osg/shared/api/admin/studentPosition'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  position?: StudentPositionListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: RejectStudentPositionPayload]
}>()

const formState = reactive({
  reason: '',
  note: ''
})

const reasonOptions = computed(() => [
  { label: t('admin.career.studentPositions.rejectModal.reasons.inaccessible'), value: '岗位链接无法访问' }, // i18n-skip-line: backend contract value
  { label: t('admin.career.studentPositions.rejectModal.reasons.notOnSite'), value: '公司官网无此岗位' }, // i18n-skip-line: backend contract value
  { label: t('admin.career.studentPositions.rejectModal.reasons.mismatch'), value: '信息与官方不符' }, // i18n-skip-line: backend contract value
  { label: t('admin.career.studentPositions.rejectModal.reasons.duplicate'), value: '与现有岗位重复' }, // i18n-skip-line: backend contract value
  { label: t('admin.career.studentPositions.rejectModal.reasons.other'), value: '其他' }, // i18n-skip-line: backend contract value
])

watch(
  () => props.visible,
  (open) => {
    if (!open) {
      return
    }
    formState.reason = ''
    formState.note = ''
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!formState.reason) {
    message.warning(t('admin.career.studentPositions.rejectModal.warnReason'))
    return
  }

  emit('submit', {
    reason: formState.reason,
    note: formState.note.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.student-reject-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-reject-modal__hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(252, 165, 165, 0.45);
  background: linear-gradient(145deg, rgba(254, 226, 226, 0.92), rgba(255, 247, 237, 0.96));
  color: #7f1d1d;
}

.student-reject-modal__hero strong {
  font-size: 15px;
}

.student-reject-modal__hero span {
  font-size: 13px;
  line-height: 1.6;
}

.student-reject-modal__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.student-reject-modal__label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-reject-modal__reason-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.student-reject-modal__reason-option {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.student-reject-modal__reason-option--active {
  border-color: #ef4444;
  background: #fef2f2;
  color: #b91c1c;
}

.student-reject-modal__meta {
  color: #94a3b8;
  font-size: 12px;
  text-align: right;
}

@media (max-width: 640px) {
  .student-reject-modal__reason-grid {
    grid-template-columns: 1fr;
  }
}
</style>
