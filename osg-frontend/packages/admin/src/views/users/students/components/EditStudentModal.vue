<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-new"
    width="960px"
    :body-class="'edit-student-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="edit-student-modal__title">
        <span class="mdi mdi-account-edit edit-student-modal__title-icon" aria-hidden="true"></span>
        <span>{{ $t('edit_student') }}</span>
      </span>
    </template>

    <div class="edit-student-modal__note" data-content-part="supporting-text">
      <span class="mdi mdi-card-account-details-outline edit-student-modal__note-icon" aria-hidden="true"></span>
      <div class="edit-student-modal__note-copy">
        <strong>{{ student?.studentName || $t('student_to_be_selected') }}</strong>
        <p>ID {{ student?.studentId ?? '-' }} · {{ formatStatus(student?.accountStatus) }} · {{ $t('sync_update_of_profile_mentor_assignment') }}。</p>
      </div>
    </div>

    <section class="edit-student-modal__section edit-student-modal__section--primary">
      <div class="edit-student-modal__badge edit-student-modal__badge--primary">{{ $t('core_information') }}</div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item :label="$t('english_name_2')">
              <a-input v-model:value="form.studentName" :disabled="submitting" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item :label="$t('gender')">
              <a-select v-model:value="form.gender" :disabled="submitting" :placeholder="$t('please_select')">
                <a-select-option value="0">{{ $t('male') }}</a-select-option>
                <a-select-option value="1">{{ $t('female') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item :label="$t('email')">
              <a-input v-model:value="form.email" :disabled="submitting" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item :label="$t('account_status_2')">
              <a-input :value="formatStatus(student?.accountStatus)" readonly />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--indigo">
        <span class="mdi mdi-account-group" aria-hidden="true" /> {{ $t('mentor_configuration') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="$t('head_teacher')">
              <a-select
                v-model:value="form.leadMentorId"
                show-search
                :filter-option="false"
                :loading="staffLoading"
                :disabled="submitting"
                :options="mentorSelectOptions"
                :placeholder="$t('search_homeroom_teacher_by_name')"
                allow-clear
                @search="handleStaffSearch"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('teaching_assistant')">
              <a-select
                v-model:value="form.assistantId"
                show-search
                :filter-option="false"
                :loading="staffLoading"
                :disabled="submitting"
                :options="assistantSelectOptions"
                :placeholder="$t('search_teaching_assistant_by_name')"
                allow-clear
                @search="handleStaffSearch"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--blue">
        <span class="mdi mdi-school" aria-hidden="true" /> {{ $t('academic_information') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('school')">
              <a-select
                v-model:value="form.school"
                :disabled="submitting"
                :options="schoolOptions"
                show-search
                allow-clear
                :placeholder="$t('please_select_school')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('major')">
              <a-input v-model:value="form.major" :disabled="submitting" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('graduation_year')">
              <a-input v-model:value="form.graduationYear" :disabled="submitting" :placeholder="$t('example_year_2026')" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--amber">
        <span class="mdi mdi-target" aria-hidden="true" /> {{ $t('job_search_direction') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('major_focus')">
              <a-select
                v-model:value="form.majorDirection"
                :disabled="submitting"
                :options="majorDirOptions"
                show-search
                allow-clear
                :placeholder="$t('please_select_primary_direction')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('sub_focus')">
              <a-select
                v-model:value="form.targetPosition"
                :disabled="submitting"
                :options="subDirOptions"
                show-search
                allow-clear
                :placeholder="$t('please_select_sub_direction')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('job_search_region')">
              <MultiSelect
                v-model:value="form.targetRegion"
                :disabled="submitting"
                :options="regionOptions"
                :placeholder="$t('multiple_job_search_regions_can_be_selec')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--green">
        <span class="mdi mdi-phone" aria-hidden="true" /> {{ $t('contact_info_notes') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('phone')">
              <a-input v-model:value="form.phone" :disabled="submitting" :placeholder="$t('optional')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('wechat')">
              <a-input v-model:value="form.wechat" :disabled="submitting" :placeholder="$t('optional')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('remarks')">
              <a-input v-model:value="form.remark" :disabled="submitting" :placeholder="$t('optional')" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">{{ $t('save_changes') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { StudentListItem, UpdateStudentPayload } from '@osg/shared/api/admin/student'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import { getAdminDictOptions } from '@/api/adminDict'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { MultiSelect } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(defineProps<{
  visible: boolean
  student?: StudentListItem | null
  submitting?: boolean
}>(), {
  student: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: UpdateStudentPayload]
}>()

const form = reactive({
  studentName: '',
  gender: '',
  email: '',
  school: '',
  majorDirection: '',
  targetPosition: '',
  major: '',
  graduationYear: '',
  targetRegion: [] as string[],
  phone: '',
  wechat: '',
  remark: '',
  leadMentorId: undefined as number | undefined,
  assistantId: undefined as number | undefined,
})

const staffOptions = ref<StaffListItem[]>([])
const staffLoading = ref(false)

const schoolOptions = ref<{ label: string; value: string }[]>([])
const majorDirOptions = ref<{ label: string; value: string }[]>([])
const subDirOptions = ref<{ label: string; value: string }[]>([])
const regionOptions = ref<{ label: string; value: string }[]>([])

const loadDictOptions = async () => {
  const [schools, majors, subs, regions] = await Promise.all([
    getAdminDictOptions('osg_school'),
    getAdminDictOptions('osg_major_direction'),
    getAdminDictOptions('osg_sub_direction'),
    getAdminDictOptions('osg_region'),
  ])
  schoolOptions.value = schools.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  majorDirOptions.value = majors.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  subDirOptions.value = subs.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  regionOptions.value = regions.map(d => ({ label: d.dictLabel, value: d.dictValue }))
}

const mentorSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'lead_mentor' && item.staffId != null)
  .map((item) => ({
    label: item.staffName,
    value: item.staffId,
  })))

const assistantSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'assistant' && item.staffId != null)
  .map((item) => ({
    label: item.staffName,
    value: item.staffId,
  })))

const mergeCurrentOption = (staffType: 'lead_mentor' | 'assistant', staffId?: number, label?: string) => {
  if (staffId == null) {
    return
  }
  const exists = staffOptions.value.some((item) => item.staffId === staffId)
  if (exists) {
    return
  }
  staffOptions.value = [
    ...staffOptions.value,
    {
      staffId,
      staffName: label || `${staffType === 'lead_mentor' ? t('head_teacher') : t('teaching_assistant')} ${staffId}`,
      staffType,
    },
  ]
}

const toExtraStudentFields = (student?: StudentListItem | null) => (student ?? {}) as unknown as {
  gender?: string
  phone?: string
  wechat?: string
  remark?: string
}

const syncForm = () => {
  const extraFields = toExtraStudentFields(props.student)
  form.studentName = props.student?.studentName || ''
  form.gender = extraFields.gender || ''
  form.email = props.student?.email || ''
  form.school = props.student?.school || ''
  form.major = (props.student as any)?.major || ''
  form.graduationYear = (props.student as any)?.graduationYear ?? ''
  form.majorDirection = props.student?.majorDirection || ''
  form.targetPosition = props.student?.targetPosition || ''
  form.targetRegion = (props.student as any)?.targetRegion?.split(',').filter(Boolean) ?? []
  form.phone = extraFields.phone || ''
  form.wechat = extraFields.wechat || ''
  form.remark = extraFields.remark || ''
  form.leadMentorId = props.student?.leadMentorId
  form.assistantId = props.student?.assistantId

  mergeCurrentOption('lead_mentor', props.student?.leadMentorId, props.student?.leadMentorName)
  mergeCurrentOption('assistant', props.student?.assistantId, props.student?.assistantName)
}

const loadStaffOptions = async (keyword = '') => {
  try {
    staffLoading.value = true
    const response = await getStaffList({
      pageNum: 1,
      pageSize: 50,
      staffName: keyword || undefined,
    })
    staffOptions.value = response.rows || []
    mergeCurrentOption('lead_mentor', props.student?.leadMentorId, props.student?.leadMentorName)
    mergeCurrentOption('assistant', props.student?.assistantId, props.student?.assistantName)
  } catch (_error) {
    message.error(t('failed_to_load_mentor_list_2'))
  } finally {
    staffLoading.value = false
  }
}

const handleStaffSearch = (keyword: string) => {
  void loadStaffOptions(keyword)
}

watch(
  () => [props.visible, props.student] as const,
  ([visible]) => {
    if (visible) {
      syncForm()
      void loadStaffOptions()
      void loadDictOptions()
    }
  },
  { immediate: true }
)

const avatarText = computed(() => {
  const name = props.student?.studentName?.trim()
  if (!name) {
    return 'ST'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!props.student?.studentId) {
    message.error(t('student_information_not_found'))
    return
  }
  if (!form.email.trim()) {
    message.error(t('please_enter_email_address'))
    return
  }
  if (!form.school.trim()) {
    message.error(t('please_enter_school'))
    return
  }

  emit('submit', {
    studentId: props.student.studentId,
    studentName: form.studentName.trim() || props.student.studentName,
    email: form.email.trim(),
    school: form.school.trim(),
    major: form.major.trim() || undefined,
    graduationYear: form.graduationYear ? Number(form.graduationYear) || undefined : undefined,
    majorDirection: form.majorDirection.trim() || undefined,
    subDirection: form.targetPosition.trim() || undefined,
    targetRegion: form.targetRegion.length ? [...form.targetRegion] : undefined,
    leadMentorId: form.leadMentorId,
    assistantId: form.assistantId,
  })
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1':
      return t('frozen')
    case '2':
      return t('ended')
    case '3':
      return t('refund')
    default:
      return t('active_3')
  }
}
</script>

<style scoped lang="scss">
.edit-student-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.edit-student-modal__note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
}

.edit-student-modal__note-icon {
  font-size: 18px;
  line-height: 1;
}

.edit-student-modal__note-copy {
  strong {
    display: block;
    color: #3f68ff;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    margin: 4px 0 0;
    color: #546179;
    font-size: 13px;
    line-height: 1.6;
  }
}

.edit-student-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #fff;
}

.edit-student-modal__section {
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 16px;
  padding: 18px;
  background: #fff;
}

.edit-student-modal__section--primary {
  border-color: rgba(79, 116, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(79, 116, 255, 0.06);
}

.edit-student-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
}

.edit-student-modal__badge--primary {
  background: #edf2ff;
  color: #3f68ff;
}

.edit-student-modal__badge--indigo {
  background: #edf2ff;
  color: #3f68ff;
}

.edit-student-modal__badge--blue {
  background: #eef6ff;
  color: #3f68ff;
}

.edit-student-modal__badge--amber {
  background: #fff2db;
  color: #c56a26;
}

.edit-student-modal__badge--green {
  background: #ebfbf2;
  color: #2f8f62;
}

</style>
