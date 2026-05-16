<template>
  <div
    v-if="modelValue && draft"
    class="lead-edit-profile-modal modal"
    data-surface-id="modal-lead-edit-profile"
  >
    <button
      type="button"
      class="lead-edit-profile-backdrop"
      data-surface-part="backdrop"
      :aria-label="t('leadMentor.leadEditProfileModal.closeAriaLabel')"
      @click="closeModal"
    />

    <div
      class="lead-edit-profile-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="lead-edit-profile-header modal-header" data-surface-part="header">
        <span :id="titleId" class="lead-edit-profile-title modal-title">
          <i class="mdi mdi-account-edit" aria-hidden="true" />
          {{ t('leadMentor.leadEditProfileModal.title') }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          :aria-label="t('leadMentor.leadEditProfileModal.closeAriaLabel')"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="lead-edit-profile-body modal-body" data-surface-part="body">
        <div class="lead-edit-profile-note">
          <i class="mdi mdi-information" aria-hidden="true" />
          <div>
            {{ t('leadMentor.leadEditProfileModal.noteInfo') }}<br />
            <span class="lead-edit-profile-note__warning">{{ t('leadMentor.leadEditProfileModal.noteWarning') }}</span>
          </div>
        </div>

        <div class="editable-card">
          <div class="editable-card__head">
            <span class="editable-card__pill">
              <i class="mdi mdi-pencil" aria-hidden="true" />
              {{ t('leadMentor.leadEditProfileModal.editableFields') }}
            </span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                {{ t('leadMentor.leadEditProfileModal.englishName') }} <span class="required-mark">*</span>
              </label>
              <input v-model="formState.englishName" class="form-input" :disabled="submitting" />
            </div>

            <div class="form-group">
              <label class="form-label">
                {{ t('leadMentor.leadEditProfileModal.gender') }} <span class="required-mark">*</span>
              </label>
              <select v-model="formState.genderLabel" class="form-select" :disabled="submitting">
                <option value="">{{ t('leadMentor.leadEditProfileModal.pleaseSelect') }}</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">
                {{ t('leadMentor.leadEditProfileModal.phone') }} <span class="required-mark">*</span>
              </label>
              <input v-model="formState.phone" class="form-input" :disabled="submitting" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('leadMentor.leadEditProfileModal.wechat') }}</label>
              <input
                v-model="formState.wechatId"
                class="form-input"
                :disabled="submitting"
                :placeholder="t('leadMentor.leadEditProfileModal.wechatPlaceholder')"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                {{ t('leadMentor.leadEditProfileModal.email') }} <span class="required-mark">*</span>
              </label>
              <input v-model="formState.email" class="form-input" type="email" :disabled="submitting" />
            </div>

            <div class="form-group">
              <label class="form-label">
                {{ t('leadMentor.leadEditProfileModal.region') }} <span class="required-mark">*</span>
              </label>
              <div class="region-row">
                <select v-model="formState.regionArea" class="form-select" :disabled="submitting">
                  <option value="">{{ t('leadMentor.leadEditProfileModal.selectRegion') }}</option>
                  <option
                    v-for="area in regionAreaOptions"
                    :key="area.value"
                    :value="area.value"
                  >{{ area.label }}</option>
                </select>
                <select v-model="formState.regionCity" class="form-select" :disabled="submitting">
                  <option value="">{{ t('leadMentor.leadEditProfileModal.selectCity') }}</option>
                  <option
                    v-for="city in regionCityOptions"
                    :key="city.value"
                    :value="city.value"
                  >{{ city.label }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lead-edit-profile-footer modal-footer">
        <button type="button" class="btn btn-outline" :disabled="submitting" @click="closeModal">{{ t('leadMentor.leadEditProfileModal.cancel') }}</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="requestSave">
          <i class="mdi mdi-check" aria-hidden="true" />
          {{ submitting ? t('leadMentor.leadEditProfileModal.submitting') : t('leadMentor.leadEditProfileModal.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export interface LeadEditProfileDraft {
  englishName: string
  genderLabel: string
  phone: string
  wechatId: string
  email: string
  regionArea: string
  regionCity: string
}

const props = defineProps<{
  modelValue: boolean
  draft: LeadEditProfileDraft | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save-request': [payload: LeadEditProfileDraft]
}>()

// Backend data values — do not translate these; they are stored as-is in the backend
const REGION_AREA_VALUES = ['北美', '欧洲', '亚太', '中国大陆'] // i18n-skip-line: backend data comparison
const REGION_CITY_VALUES = ['New York 纽约', 'London 伦敦', 'Singapore 新加坡', 'Shanghai 上海', 'Beijing 北京'] // i18n-skip-line: backend data comparison

const regionAreaOptions = computed(() => [
  { value: REGION_AREA_VALUES[0], label: `🌎 ${t('leadMentor.leadEditProfileModal.regionNorthAmerica')}` },
  { value: REGION_AREA_VALUES[1], label: `🌍 ${t('leadMentor.leadEditProfileModal.regionEurope')}` },
  { value: REGION_AREA_VALUES[2], label: `🌏 ${t('leadMentor.leadEditProfileModal.regionAsiaPacific')}` },
  { value: REGION_AREA_VALUES[3], label: `🇨🇳 ${t('leadMentor.leadEditProfileModal.regionMainlandChina')}` },
])

const regionCityOptions = computed(() => [
  { value: REGION_CITY_VALUES[0], label: `New York ${t('leadMentor.leadEditProfileModal.cityNewYork')}` },
  { value: REGION_CITY_VALUES[1], label: `London ${t('leadMentor.leadEditProfileModal.cityLondon')}` },
  { value: REGION_CITY_VALUES[2], label: `Singapore ${t('leadMentor.leadEditProfileModal.citySingapore')}` },
  { value: REGION_CITY_VALUES[3], label: `Shanghai ${t('leadMentor.leadEditProfileModal.cityShanghai')}` },
  { value: REGION_CITY_VALUES[4], label: `Beijing ${t('leadMentor.leadEditProfileModal.cityBeijing')}` },
])

const formState = reactive<LeadEditProfileDraft>({
  englishName: '',
  genderLabel: '',
  phone: '',
  wechatId: '',
  email: '',
  regionArea: '',
  regionCity: '',
})

const syncForm = (draft: LeadEditProfileDraft | null) => {
  formState.englishName = draft?.englishName ?? ''
  formState.genderLabel = draft?.genderLabel ?? ''
  formState.phone = draft?.phone ?? ''
  formState.wechatId = draft?.wechatId ?? ''
  formState.email = draft?.email ?? ''
  formState.regionArea = draft?.regionArea ?? ''
  formState.regionCity = draft?.regionCity ?? ''
}

watch(
  () => props.draft,
  (draft) => {
    syncForm(draft)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (modelValue) => {
    if (modelValue) {
      syncForm(props.draft)
    }
  },
)

const titleId = 'lead-edit-profile-title'

const closeModal = () => {
  emit('update:modelValue', false)
}

const requestSave = () => {
  emit('save-request', {
    englishName: formState.englishName.trim(),
    genderLabel: formState.genderLabel.trim(),
    phone: formState.phone.trim(),
    wechatId: formState.wechatId.trim(),
    email: formState.email.trim(),
    regionArea: formState.regionArea.trim(),
    regionCity: formState.regionCity.trim(),
  })
}
</script>

<style scoped>
.lead-edit-profile-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lead-edit-profile-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.lead-edit-profile-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 600px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.lead-edit-profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
  color: #fff;
  border-radius: 16px 16px 0 0;
}

.lead-edit-profile-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.lead-edit-profile-body {
  padding: 24px;
}

.lead-edit-profile-note {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #e8f0f8;
  color: #1e40af;
  font-size: 13px;
  line-height: 1.6;
}

.lead-edit-profile-note__warning {
  color: var(--danger);
}

.editable-card {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fafafa;
}

.editable-card__head {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.editable-card__pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-group {
  margin: 0;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
}

.required-mark {
  color: var(--danger);
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 14px;
}

.region-row {
  display: flex;
  gap: 8px;
}

.lead-edit-profile-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .region-row,
  .lead-edit-profile-footer {
    flex-direction: column;
  }
}
</style>
