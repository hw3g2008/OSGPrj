<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="680px"
    :max-height="'86vh'"
    :shell-class="'position-form-modal__shell'"
    :body-class="'position-form-modal__body'"
    :footer-class="'position-form-modal__footer-shell'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span :class="['mdi', isEditing ? 'mdi-briefcase-edit' : 'mdi-briefcase-plus']" aria-hidden="true"></span>
        <span>{{ isEditing ? $t('edit_position') : $t('add_position') }}</span>
      </span>
    </template>

    <div class="position-form-modal__content">
      <section class="position-form-modal__section">
        <h4><span class="mdi mdi-briefcase" aria-hidden="true"></span>{{ $t('basic_info') }}</h4>
        <div class="position-form-modal__grid">
          <fieldset class="position-form-modal__field" :data-field-name="$t('job_classification')">
            <span>{{ $t('job_classification') }} <em>*</em></span>
            <a-select v-model:value="form.positionCategory" :placeholder="$t('please_select')">
              <a-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('job_title')">
            <span>{{ $t('job_title') }} <em>*</em></span>
            <a-input v-model:value="form.positionName" :placeholder="$t('example_summer_analyst')" />
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('department')">
            <span>{{ $t('department') }}</span>
            <a-select v-model:value="form.department" :placeholder="$t('please_select')" allow-clear show-search>
              <a-select-option v-for="option in departmentOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('program_period')">
            <span>{{ $t('program_period') }} <em>*</em></span>
            <a-select v-model:value="form.projectYear" :placeholder="$t('please_select')">
              <a-select-option v-for="option in projectYearOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>
        </div>

        <fieldset class="position-form-modal__cycle-wrap" :data-field-name="$t('recruitment_cycle')">
          <span>{{ $t('recruitment_cycle') }} <em>*</em> <small>({{ $t('multiple_selections_possible') }})</small></span>
          <div class="position-form-modal__cycle-list">
            <a-checkbox
              v-for="option in recruitmentCycleOptions"
              :key="option.value"
              :checked="form.recruitmentCycles.includes(option.value)"
              :data-cycle-value="option.value"
              class="position-form-modal__cycle-option"
              @change="toggleCycle(option.value)"
            >
              {{ option.label }}
            </a-checkbox>
          </div>
        </fieldset>

        <fieldset class="position-form-modal__cycle-wrap" :data-field-name="$t('students_major_focus')">
          <span>{{ $t('students_major_focus') }} <em>*</em> <small>({{ $t('multiple_selections_possible') }})</small></span>
          <div class="position-form-modal__cycle-list">
            <a-checkbox
              v-for="option in majorDirectionOptions"
              :key="option.value"
              :checked="form.targetMajors.includes(option.value)"
              :data-major-value="option.value"
              class="position-form-modal__cycle-option"
              @change="toggleMajor(option.value)"
            >
              {{ option.label }}
            </a-checkbox>
          </div>
        </fieldset>
      </section>

      <section class="position-form-modal__section">
        <h4><span class="mdi mdi-domain" aria-hidden="true"></span>{{ $t('company_info') }}</h4>
        <div class="position-form-modal__grid">
          <fieldset class="position-form-modal__field" :data-field-name="$t('company_name')">
            <span>{{ $t('company_name') }} <em>*</em></span>
            <a-auto-complete
              v-model:value="form.companyName"
              :options="companyAutoCompleteOptions"
              :filter-option="true"
              :placeholder="$t('search_or_enter_company_name')"
            />
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('company_type')">
            <span>{{ $t('company_type') }}</span>
            <a-select v-model:value="form.companyType" :placeholder="$t('please_select')" allow-clear>
              <a-select-option v-for="option in companyTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="position-form-modal__location-group" :data-field-name="$t('position_region_city')">
            <div class="position-form-modal__location-grid">
              <fieldset class="position-form-modal__field" :data-field-name="$t('position_region')">
                <span>{{ $t('position_region') }} <em>*</em></span>
                <a-select v-model:value="form.region" :placeholder="$t('please_select')">
                  <a-select-option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
                </a-select>
              </fieldset>

              <fieldset class="position-form-modal__field" :data-field-name="$t('city')">
                <span>{{ $t('city') }}</span>
                <a-select v-model:value="form.city" :placeholder="form.region ? $t('please_select') : $t('please_select_a_region_first')">
                  <a-select-option v-for="option in currentCityOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
                </a-select>
              </fieldset>
            </div>
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('company_website')">
            <span>{{ $t('company_website') }}</span>
            <a-input v-model:value="form.companyWebsite" placeholder="https://company.com" />
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('position_link')">
            <span>{{ $t('position_link') }}</span>
            <a-input v-model:value="form.positionUrl" placeholder="https://company.com/jobs/..." />
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('deadline_2')">
            <span>{{ $t('deadline_2') }} <small>({{ $t('optional') }})</small></span>
            <a-date-picker
              v-model:value="form.deadline"
              :placeholder="$t('select_deadline')"
              value-format="YYYY-MM-DD"
              :aria-label="$t('deadline_2')"
              style="width: 100%"
            />
          </fieldset>

          <fieldset class="position-form-modal__field" :data-field-name="$t('deadline_note')">
            <span>{{ $t('deadline_note') }} <small>({{ $t('optional_e_g') }}"Rolling")</small></span>
            <a-input v-model:value="form.deadlineText" :placeholder="$t('example_deadline_text')" :aria-label="$t('deadline_note')" />
          </fieldset>
        </div>
      </section>

      <div class="position-form-modal__display-grid">
        <section class="position-form-modal__section" :data-field-name="$t('display_period')">
          <h4><span class="mdi mdi-clock-outline" aria-hidden="true"></span>{{ $t('display_period') }}</h4>
          <fieldset class="position-form-modal__display-group" :data-field-name="$t('start_date_end_date')">
            <div class="position-form-modal__display-stack">
              <fieldset class="position-form-modal__field" :data-field-name="$t('start_date')">
                <span>{{ $t('start_date') }} <em>*</em></span>
                <a-date-picker
                  v-model:value="form.displayStartTime"
                  show-time
                  :placeholder="$t('select_start_date')"
                  value-format="YYYY-MM-DDTHH:mm"
                  format="YYYY-MM-DD HH:mm"
                  :aria-label="$t('start_date')"
                  style="width: 100%"
                />
              </fieldset>
              <fieldset class="position-form-modal__field" :data-field-name="$t('end_date')">
                <span>{{ $t('end_date') }} <em>*</em></span>
                <a-date-picker
                  v-model:value="form.displayEndTime"
                  show-time
                  :placeholder="$t('select_end_date')"
                  value-format="YYYY-MM-DDTHH:mm"
                  format="YYYY-MM-DD HH:mm"
                  :aria-label="$t('end_date')"
                  style="width: 100%"
                />
              </fieldset>
            </div>
          </fieldset>
        </section>

        <section class="position-form-modal__section" :data-field-name="$t('added_by')">
          <h4><span class="mdi mdi-account-edit" aria-hidden="true"></span>{{ $t('added_by') }}</h4>
          <fieldset class="position-form-modal__field">
            <span class="position-form-modal__sr-only">{{ $t('added_by') }}</span>
            <a-input v-model:value="form.createBy" :placeholder="$t('defaults_to_current_logged_in_user_admin')" />
          </fieldset>
        </section>

        <section class="position-form-modal__section" :data-field-name="$t('application_notes')">
          <h4><span class="mdi mdi-note-text" aria-hidden="true"></span>{{ $t('application_notes') }}</h4>
        <fieldset class="position-form-modal__field">
          <span class="position-form-modal__sr-only">{{ $t('application_notes') }}</span>
          <a-textarea
            v-model:value="form.applicationNote"
            :rows="4"
            :placeholder="`${$t('notes_to_remind_students_when_applying')}...`"
          />
        </fieldset>
        </section>
      </div>

      <p class="position-form-modal__hint">
        <span class="mdi mdi-information-outline" aria-hidden="true"></span>
        {{ $t('auto_archived_when_end_date_is_reached') }}
      </p>

      <section v-if="isEditing" class="position-form-modal__status-bar">
        <div class="position-form-modal__status-copy">
          <span class="mdi mdi-toggle-switch" aria-hidden="true"></span>
          <div>
            <div class="position-form-modal__status-label">
              {{ $t('position_status') }}：
              <span :class="['position-form-modal__status-tag', `position-form-modal__status-tag--${form.displayStatus}`]">
                {{ formatDisplayStatus(form.displayStatus) }}
              </span>
            </div>
            <div class="position-form-modal__status-note">{{ $t('students_cannot_see_this_position_once_h') }}</div>
          </div>
        </div>

        <fieldset class="position-form-modal__field position-form-modal__status-field">
          <span>{{ $t('position_status') }}</span>
          <a-select v-model:value="form.displayStatus" :placeholder="$t('please_select')">
            <a-select-option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </fieldset>

        <div class="position-form-modal__status-actions">
          <a-button size="small" @click="form.displayStatus = 'hidden'">
            <span class="mdi mdi-eye-off" aria-hidden="true" style="margin-right:4px"></span>{{ $t('hide') }}
          </a-button>
          <a-button size="small" type="primary" ghost @click="form.displayStatus = 'visible'">
            <span class="mdi mdi-refresh" aria-hidden="true" style="margin-right:4px"></span>{{ $t('activate') }}
          </a-button>
        </div>
      </section>
    </div>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">
        <span class="mdi mdi-check" aria-hidden="true" style="margin-right:4px"></span>
        {{ isEditing ? $t('save_position') : $t('add_position') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useUserStore } from '@/stores/user'
import type { PositionListItem, PositionMeta, PositionMetaOption, PositionPayload } from '@osg/shared/api/admin/position'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  visible: boolean
  position?: PositionListItem | null
  defaults?: Partial<PositionPayload> | null
  meta: PositionMeta
  companyOptions: string[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: PositionPayload]
}>()

const userStore = useUserStore()

const form = reactive({
  positionCategory: undefined as string | undefined,
  positionName: '',
  department: undefined as string | undefined,
  companyName: '',
  companyType: undefined as string | undefined,
  companyWebsite: '',
  region: undefined as string | undefined,
  city: undefined as string | undefined,
  projectYear: undefined as string | undefined,
  displayStatus: 'visible',
  displayStartTime: '',
  displayEndTime: '',
  deadline: undefined as string | undefined,
  deadlineText: '',
  positionUrl: '',
  applicationNote: '',
  createBy: '',
  recruitmentCycles: [] as string[],
  targetMajors: [] as string[]
})

const isEditing = computed(() => Boolean(props.position?.positionId))
const isCompanyScopedCreate = computed(() => !isEditing.value && Boolean(props.defaults?.companyName))
const surfaceId = computed(() => {
  if (isEditing.value) return 'modal-edit-position'
  if (isCompanyScopedCreate.value) return 'modal-new-position-company'
  return 'modal-new-position'
})
const categoryOptions = computed(() => props.meta.categories || [])
const companyTypeOptions = computed(() => props.meta.industries || [])
const departmentOptions = computed(() => props.meta.departments || [])
const recruitmentCycleOptions = computed(() => props.meta.recruitmentCycles || [])
const majorDirectionOptions = computed(() => props.meta.majorDirections || [])
const projectYearOptions = computed(() => props.meta.projectYears || [])
const regionOptions = computed(() => props.meta.regions || [])
const statusOptions = computed(() => props.meta.displayStatuses || [])
const currentCityOptions = computed<PositionMetaOption[]>(() => (form.region ? props.meta.citiesByRegion?.[form.region] || [] : []))
const companyAutoCompleteOptions = computed(() => props.companyOptions.map((item) => ({ value: item })))
const displayStatusMap = computed(() => new Map(statusOptions.value.map((option) => [option.value, option.label])))

const toDateTimeLocal = (value?: string) => {
  if (!value) {
    return ''
  }
  return value.slice(0, 16)
}

const toDateValue = (value?: string) => {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

const normalizeCycles = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const resetForm = () => {
  const seed = props.position || props.defaults || {}
  const now = new Date()
  const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  form.positionCategory = seed.positionCategory || undefined
  form.positionName = seed.positionName || ''
  form.department = seed.department || undefined
  form.companyName = seed.companyName || ''
  form.companyType = seed.companyType || seed.industry || undefined
  form.companyWebsite = seed.companyWebsite || ''
  form.region = seed.region || undefined
  form.city = seed.city || undefined
  form.projectYear = seed.projectYear || undefined
  form.displayStatus = seed.displayStatus || 'visible'
  form.displayStartTime = toDateTimeLocal(seed.displayStartTime) || now.toISOString().slice(0, 16)
  form.displayEndTime = toDateTimeLocal(seed.displayEndTime) || end.toISOString().slice(0, 16)
  form.deadline = toDateValue(seed.deadline) || undefined
  form.deadlineText = seed.deadlineText || (isEditing.value ? '' : 'Rolling ASAP')
  form.positionUrl = seed.positionUrl || ''
  form.applicationNote = seed.applicationNote || ''
  form.createBy = seed.createBy || (isEditing.value ? '' : userStore.userInfo?.userName || '')
  form.recruitmentCycles = normalizeCycles(seed.recruitmentCycle)
  form.targetMajors = normalizeCycles(seed.targetMajors)
}

const toggleCycle = (value: string) => {
  if (form.recruitmentCycles.includes(value)) {
    form.recruitmentCycles = form.recruitmentCycles.filter((item) => item !== value)
    return
  }
  form.recruitmentCycles = [...form.recruitmentCycles, value]
}

const toggleMajor = (value: string) => {
  if (form.targetMajors.includes(value)) {
    form.targetMajors = form.targetMajors.filter((item) => item !== value)
    return
  }
  form.targetMajors = [...form.targetMajors, value]
}

const formatDisplayStatus = (value: string) => {
  return displayStatusMap.value.get(value) || t('active')
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.positionCategory || !form.positionName || !form.companyName || !form.region || !form.projectYear) {
    message.error(t('please_complete_position_category_name_c'))
    return
  }
  if (!form.recruitmentCycles.length) {
    message.error(t('please_select_at_least_one_recruitment_c'))
    return
  }
  if (!form.targetMajors.length) {
    message.error(t('please_select_at_least_one_major_focus'))
    return
  }
  if (!form.displayStartTime || !form.displayEndTime) {
    message.error(t('please_complete_the_display_period'))
    return
  }

  emit('submit', {
    positionId: props.position?.positionId,
    positionCategory: form.positionCategory!,
    companyName: form.companyName,
    companyType: form.companyType || undefined,
    companyWebsite: form.companyWebsite || undefined,
    positionName: form.positionName,
    department: form.department || undefined,
    region: form.region!,
    city: form.city || undefined,
    recruitmentCycle: form.recruitmentCycles.join(','),
    targetMajors: form.targetMajors.join(','),
    projectYear: form.projectYear!,
    displayStatus: form.displayStatus,
    displayStartTime: form.displayStartTime,
    displayEndTime: form.displayEndTime,
    deadline: form.deadline || undefined,
    deadlineText: form.deadlineText || undefined,
    positionUrl: form.positionUrl || undefined,
    applicationNote: form.applicationNote || undefined,
    createBy: form.createBy || undefined
  })
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => form.region,
  () => {
    if (form.city && !currentCityOptions.value.some((option) => option.value === form.city)) {
      form.city = ''
    }
  }
)
</script>

<style scoped lang="scss">
:deep(.position-form-modal__shell) {
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

:deep(.position-form-modal__shell .overlay-surface-modal__header) {
  gap: 14px;
  padding: 22px 30px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}

:deep(.position-form-modal__shell .overlay-surface-modal__title) {
  width: 100%;
}

:deep(.position-form-modal__shell .overlay-surface-modal__close) {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #f5f7fb;
  color: #64748b;
}

:deep(.position-form-modal__shell .overlay-surface-modal__close:hover) {
  background: #edf2ff;
  color: #5b6ef5;
}

:deep(.overlay-surface-modal__body.position-form-modal__body) {
  padding: 20px 20px 0;
  background: #fff;
}

:deep(.overlay-surface-modal__footer.position-form-modal__footer-shell) {
  padding: 0 20px 20px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.position-form-modal__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.position-form-modal__section {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #fbfcff 100%);
}

.position-form-modal__section h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  color: #5b6ef5;
}

.position-form-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.position-form-modal__location-group {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.position-form-modal__location-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.position-form-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
  font-size: 13px;
  color: #334155;
}

:deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector) {
  padding: 0 14px;
}

:deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector .ant-select-selection-search) {
  inset-inline-start: 14px;
  inset-inline-end: 14px;
}

:deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector .ant-select-selection-search-input) {
  height: 100%;
}

:deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector .ant-select-selection-placeholder) {
  inset-inline-start: 14px;
  inset-inline-end: 14px;
}

.position-form-modal__field > span {
  color: #475569;
  font-weight: 600;
}

.position-form-modal__field em {
  color: #ef4444;
  font-style: normal;
}

.position-form-modal__field small {
  color: #94a3b8;
  font-weight: 400;
}

.position-form-modal__cycle-wrap {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: 0;
  min-inline-size: 0;
  color: #334155;
  font-size: 13px;
}

.position-form-modal__cycle-wrap em {
  color: #ef4444;
  font-style: normal;
}

.position-form-modal__cycle-wrap small {
  color: #94a3b8;
}

.position-form-modal__cycle-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #fff;
}

.position-form-modal__display-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.position-form-modal__display-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.position-form-modal__display-group {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.position-form-modal__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
}

.position-form-modal__status-bar {
  display: grid;
  grid-template-columns: 1.2fr minmax(140px, 180px) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7ff 100%);
}

.position-form-modal__status-copy {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #4f5f78;
}

.position-form-modal__status-copy > .mdi {
  font-size: 18px;
  color: #5b6ef5;
}

.position-form-modal__status-label {
  font-size: 13px;
  font-weight: 600;
}

.position-form-modal__status-note {
  margin-top: 2px;
  font-size: 11px;
}

.position-form-modal__status-tag {
  display: inline-flex;
  margin-left: 4px;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.position-form-modal__status-tag--visible {
  background: #dcfce7;
  color: #166534;
}

.position-form-modal__status-tag--hidden {
  background: #f3f4f6;
  color: #6b7280;
}

.position-form-modal__status-tag--expired {
  background: #fee2e2;
  color: #991b1b;
}

.position-form-modal__status-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #4f5f78;
}

.position-form-modal__status-actions {
  display: flex;
  gap: 8px;
}

.position-form-modal__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .position-form-modal__grid,
  .position-form-modal__display-grid,
  .position-form-modal__status-bar {
    grid-template-columns: 1fr;
  }

  :deep(.position-form-modal__shell .overlay-surface-modal__header) {
    padding: 18px 18px 16px;
  }

  :deep(.overlay-surface-modal__body.position-form-modal__body) {
    padding: 16px 16px 0;
  }

  :deep(.overlay-surface-modal__footer.position-form-modal__footer-shell) {
    padding: 0 16px 16px;
  }
}
</style>
