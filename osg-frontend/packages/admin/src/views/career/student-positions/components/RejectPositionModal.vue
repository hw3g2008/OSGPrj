<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-reject-position"
    width="560px"
    :body-class="'student-reject-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-close-octagon-outline" aria-hidden="true"></span>
        <span>{{ $t('reject_position') }}</span>
      </span>
    </template>

    <section class="student-reject-modal__hero">
      <strong>{{ position?.studentName || $t('current_student') }}</strong>
      <span>{{ $t('after_rejection_this_position_will_not_b') }}。</span>
    </section>

    <section class="student-reject-modal__section" :data-field-name="$t('rejection_reason')">
      <label class="student-reject-modal__label">
        <span>{{ $t('rejection_reason') }} *</span>
      </label>
      <div class="student-reject-modal__reason-grid" :data-field-name="$t('rejection_reason')">
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

    <section class="student-reject-modal__section" :data-field-name="$t('additional_notes')">
      <label class="student-reject-modal__label">
        <span>{{ $t('additional_notes') }}</span>
      </label>
      <a-textarea
        v-model:value="formState.note"
        :data-field-name="$t('additional_notes')"
        :rows="4"
        :maxlength="120"
        :placeholder="$t('optional_add_notes_for_this_rejection')"
      />
      <div class="student-reject-modal__meta">{{ formState.note.length }}/120</div>
    </section>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button danger data-surface-part="confirm-control" @click="handleSubmit">{{ $t('confirm_rejection') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { RejectStudentPositionPayload, StudentPositionListItem } from '@osg/shared/api/admin/studentPosition'
import { useI18n } from 'vue-i18n'

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

const reasonOptions = [
  { label: t('position_link_is_inaccessible'), value: t('position_link_is_inaccessible') },
  { label: t('position_not_found_on_company_website'), value: t('position_not_found_on_company_website') },
  { label: t('information_does_not_match_official_sour'), value: t('information_does_not_match_official_sour') },
  { label: t('duplicate_of_an_existing_position'), value: t('duplicate_of_an_existing_position') },
  { label: t('other'), value: t('other') }
]

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
    message.warning(t('please_select_a_rejection_reason'))
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
