<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-add-student"
    width="880px"
    :body-class="'add-student-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="add-student-modal__title">
        <span class="mdi mdi-account-plus add-student-modal__title-icon" aria-hidden="true"></span>
        <span>{{ $t('new_students') }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <!-- ══ Part 1: 基本信息 ══ -->
      <div class="add-student-modal__part-title add-student-modal__part-title--blue">
        <div class="add-student-modal__part-title-heading">
          <i class="mdi mdi-account-circle" aria-hidden="true"></i>
          <strong>{{ $t('basic_info') }}</strong>
        </div>
        <p>{{ $t('fill_in_the_students_basic_personal_info') }} <span class="add-student-modal__required">*</span> {{ $t('are_required') }}</p>
      </div>

      <!-- ① 核心信息 -->
      <div class="add-student-modal__section add-student-modal__section--highlight">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--primary">{{ $t('core_information') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="studentName" :data-field-name="$t('english_name_2')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('english_name_2') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input
              v-model:value="formState.studentName"
              :placeholder="`${$t('for_example')} Emily Zhang`"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="gender" :data-field-name="$t('gender')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('gender') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-select
              v-model:value="formState.gender"
              :placeholder="$t('please_select_gender')"
              :options="genderOptions"
            />
          </a-form-item>

          <a-form-item class="add-student-modal__field--wide" name="email" :data-field-name="$t('email')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('email') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input
              v-model:value="formState.email"
              :placeholder="$t('student_email_will_be_used_automatically')"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>

      <!-- ② 导师配置 -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> {{ $t('mentor_configuration') }}
          </span>
          <span class="add-student-modal__section-desc">{{ $t('multi_select_optional') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="leadMentorIds" :data-field-name="$t('head_teacher')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('head_teacher') }}</span>
            </template>
            <MultiSelect
              v-model:value="formState.leadMentorIds"
              :filter-option="false"
              :loading="mentorLoading"
              :options="mentorSelectOptions"
              :placeholder="$t('search_homeroom_teacher_by_name')"
              class="add-student-modal__select--mentor"
              @search="handleMentorSearch"
            />
          </a-form-item>

          <a-form-item name="assistantIds" :data-field-name="$t('teaching_assistant')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('teaching_assistant') }}</span>
            </template>
            <MultiSelect
              v-model:value="formState.assistantIds"
              :filter-option="false"
              :loading="assistantLoading"
              :options="assistantSelectOptions"
              :placeholder="$t('search_teaching_assistant_by_name')"
              class="add-student-modal__select--assistant"
              @search="handleAssistantSearch"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ③ 学业信息 -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--indigo">
            <i class="mdi mdi-school" aria-hidden="true"></i> {{ $t('academic_information') }}
          </span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="school" :data-field-name="$t('school')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('school') }}</span>
            </template>
            <a-select
              v-model:value="formState.school"
              :options="schoolOptions"
              :placeholder="$t('please_select_school')"
              show-search
              allow-clear
            />
          </a-form-item>

          <a-form-item name="major" :data-field-name="$t('major')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('major') }}</span>
            </template>
            <a-input
              v-model:value="formState.major"
              :placeholder="`${$t('for_example')} Finance / Economics`"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="graduationYear" :data-field-name="$t('graduation_year')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('graduation_year') }}</span>
            </template>
            <a-select
              v-model:value="formState.graduationYear"
              :placeholder="$t('please_select_graduation_year')"
              :options="graduationYearOptions"
              show-search
            />
          </a-form-item>

          <a-form-item name="highSchool" :data-field-name="$t('high_school')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('high_school') }}</span>
            </template>
            <a-input
              v-model:value="formState.highSchool"
              :placeholder="$t('optional')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="studyPlan" :data-field-name="$t('graduate_extended_study')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('graduate_extended_study') }}</span>
            </template>
            <a-radio-group v-model:value="formState.studyPlan" class="add-student-modal__radio-group">
              <a-radio-button value="normal">{{ $t('normal_graduation') }}</a-radio-button>
              <a-radio-button value="postgraduate">{{ $t('graduate_studies') }}</a-radio-button>
              <a-radio-button value="deferred">{{ $t('extended_study') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item name="visaStatus" :data-field-name="$t('visa')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('visa') }}</span>
            </template>
            <a-select
              v-model:value="formState.visaStatus"
              :placeholder="$t('please_select_visa_status')"
              :options="visaStatusOptions"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ④ 求职方向 -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> {{ $t('job_search_direction') }}
          </span>
          <span class="add-student-modal__section-desc">{{ $t('multi_select_sub_directions_are_shown_ba') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="targetRegion" :data-field-name="$t('job_search_region')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('job_search_region') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.targetRegion"
              :placeholder="$t('multiple_job_search_regions_can_be_selec')"
              :options="targetRegionOptions"
            />
          </a-form-item>

          <a-form-item name="recruitmentCycle" :data-field-name="$t('recruitment_cycle')" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('recruitment_cycle') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-checkbox-group
              v-model:value="formState.recruitmentCycle"
              :options="recruitmentCycleOptions"
              class="add-student-modal__checkbox-flat"
            />
          </a-form-item>

          <a-form-item name="majorDirections" :data-field-name="$t('major_focus')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('major_focus') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.majorDirections"
              :placeholder="$t('multiple_selections_possible')"
              :options="majorDirOptions"
            />
          </a-form-item>

          <a-form-item name="subDirections" :data-field-name="$t('sub_focus')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('sub_focus') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.subDirections"
              :placeholder="$t('multiple_selections_possible')"
              :options="subDirOptions"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ⑤ 联系方式 -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> {{ $t('contact_info') }}
          </span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="phone" :data-field-name="$t('phone')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('phone') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input
              v-model:value="formState.phone"
              :placeholder="$t('please_enter_phone_number_2')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="wechat" :data-field-name="$t('wechat')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('wechat') }}</span>
            </template>
            <a-input
              v-model:value="formState.wechat"
              :placeholder="$t('please_enter_wechat_id')"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>

      <!-- ⑥ 学生端账号 -->
      <div class="add-student-modal__section add-student-modal__section--accent">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--green-solid">
            <i class="mdi mdi-account-key" aria-hidden="true"></i> {{ $t('student_portal_account') }}
          </span>
          <span class="add-student-modal__section-desc">{{ $t('a_student_portal_login_account_will_be_a') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item :data-field-name="$t('login_account')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('login_account') }}</span>
            </template>
            <a-input
              :value="formState.email"
              disabled
              :placeholder="$t('email_will_be_used_automatically_as_logi')"
            />
          </a-form-item>

          <a-form-item :data-field-name="$t('initial_password')">
            <template #label>
              <span class="add-student-modal__label">{{ $t('initial_password') }}</span>
            </template>
            <a-input
              value="Osg@2026"
              disabled
            />
          </a-form-item>
        </div>
        <div class="add-student-modal__account-tip">
          <i class="mdi mdi-information" aria-hidden="true"></i>
          <span><strong>{{ $t('notice') }}：</strong>{{ $t('after_the_student_is_created_the_system_') }} <strong>Osg@2026</strong>，{{ $t('students_are_advised_to_change_their_pas') }}。</span>
        </div>
      </div>

      <!-- ══ Part 2: 合同信息 ══ -->
      <div class="add-student-modal__part-title add-student-modal__part-title--amber">
        <div class="add-student-modal__part-title-heading">
          <i class="mdi mdi-file-document-edit" aria-hidden="true"></i>
          <strong>{{ $t('contract_information') }}</strong>
        </div>
        <p>{{ $t('fill_in_the_students_first_contract_info') }}</p>
      </div>

      <!-- ⑦ 合同字段 -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__grid">
          <a-form-item name="currency" :data-field-name="$t('currency')" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('currency') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-radio-group v-model:value="formState.currency" class="add-student-modal__radio-group">
              <a-radio-button value="USD">{{ $t('usd') }} (USD)</a-radio-button>
              <a-radio-button value="GBP">{{ $t('gbp') }} (GBP)</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="formState.currency === 'GBP'" name="amountGbp" :data-field-name="$t('gbp_amount')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('gbp_amount') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.amountGbp"
              class="add-student-modal__number"
              :min="0"
              :precision="2"
              :controls="false"
              :placeholder="`£ ${$t('please_enter_gbp_amount')}`"
            />
          </a-form-item>

          <a-form-item name="amountUsd" :data-field-name="$t('amount_usd')">
            <template #label>
              <span class="add-student-modal__label">
                {{ formState.currency === 'GBP' ? $t('usd_equivalent_amount') : $t('amount_usd') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.amountUsd"
              class="add-student-modal__number"
              :min="0"
              :precision="2"
              :controls="false"
              :placeholder="formState.currency === 'GBP' ? `$ ${$t('please_enter_usd_equivalent_amount')}` : `$ ${$t('please_enter_usd_amount')}`"
            />
          </a-form-item>

          <a-form-item name="totalHours" :data-field-name="`${$t('hours_2')}）`">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('hours_2') }}）
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.totalHours"
              class="add-student-modal__number"
              :min="1"
              :precision="0"
              :controls="false"
              :placeholder="$t('example_hours_40')"
            />
          </a-form-item>

          <a-form-item name="startDate" :data-field-name="$t('contract_start_date')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('contract_start_date') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="formState.startDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :placeholder="$t('please_select_contract_start_date')"
            />
          </a-form-item>

          <a-form-item name="endDate" :data-field-name="$t('contract_end_date')">
            <template #label>
              <span class="add-student-modal__label">
                {{ $t('contract_end_date') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="formState.endDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :placeholder="$t('please_select_contract_end_date')"
            />
          </a-form-item>

          <a-form-item name="contractAttachment" :data-field-name="$t('contract_attachment')" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">{{ $t('contract_attachment') }}</span>
            </template>
            <a-upload-dragger
              :action="uploadAction"
              :headers="uploadHeaders"
              name="file"
              :max-count="1"
              :file-list="fileList"
              @change="handleUploadChange"
            >
              <p class="ant-upload-drag-icon">
                <i class="mdi mdi-cloud-upload" style="font-size: 28px; color: #4f74ff"></i>
              </p>
              <p class="ant-upload-text">{{ $t('click_or_drag_file_to_upload') }}</p>
              <p class="ant-upload-hint">{{ $t('supports_pdf_word_image_formats_and_more') }}</p>
            </a-upload-dragger>
          </a-form-item>

          <a-form-item name="contractRemark" :data-field-name="$t('contract_notes')" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">{{ $t('remarks') }}</span>
            </template>
            <a-textarea
              v-model:value="formState.contractRemark"
              :placeholder="$t('optional_e_g_special_terms')"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>
    </a-form>

    <template #footer>
      <a-button :disabled="submitting" @click="handleClose">
        {{ $t('cancel') }}
      </a-button>
      <a-button
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ $t('create_student_account') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { MultiSelect } from '@osg/shared/components'
import { getStaffOptions, type StaffOption } from '@osg/shared/api/admin/staff'
import { getAdminDictOptions } from '@/api/adminDict'
import { getToken } from '@osg/shared/utils/storage'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface AddStudentBasicInfo {
  studentName: string
  gender?: string
  email: string
  phone?: string
  wechat?: string
  school?: string
  major?: string
  highSchool?: string
  graduationYear?: number
  studyPlan: 'normal' | 'postgraduate' | 'deferred'
  visaStatus?: string
  targetRegion: string[]
  recruitmentCycle: string[]
  majorDirections: string[]
  subDirections: string[]
  leadMentorIds: number[]
  assistantIds: number[]
  currency: 'USD' | 'GBP'
  amountUsd?: number
  amountGbp?: number
  contractAmount?: number
  totalHours?: number
  startDate?: string
  endDate?: string
  initialPassword?: string
  contractAttachment?: string
  contractRemark?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  submitting?: boolean
  initialValue?: Partial<AddStudentBasicInfo>
}>(), {
  submitting: false,
  initialValue: undefined
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: AddStudentBasicInfo]
}>()

const formRef = ref()
const mentorOptions = ref<StaffOption[]>([])
const assistantOptions = ref<StaffOption[]>([])
const mentorLoading = ref(false)
const assistantLoading = ref(false)
const currentYear = new Date().getFullYear()
const fileList = ref<any[]>([])
const uploadAction = '/api/common/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))

const handleUploadChange = (info: UploadChangeParam) => {
  fileList.value = info.fileList.slice(-1)
  if (info.file.status === 'done') {
    const url = info.file.response?.url || info.file.response?.fileName
    if (url) {
      formState.contractAttachment = url
      message.success(t('upload_successful'))
    }
  } else if (info.file.status === 'error') {
    message.error(t('upload_failed_please_try_again'))
  }
}

const genderOptions = [
  { label: t('male'), value: 'male' },
  { label: t('female'), value: 'female' }
]

const graduationYearOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const value = currentYear - 4 + index
    return {
      label: `${value}`,
      value
    }
  }).reverse()
)

const mentorSelectOptions = computed(() =>
  mentorOptions.value.map(s => ({ label: s.label, value: s.value }))
)

const assistantSelectOptions = computed(() =>
  assistantOptions.value.map(s => ({ label: s.label, value: s.value }))
)

const schoolOptions = ref<{ label: string; value: string }[]>([])
const targetRegionOptions = ref<{ label: string; value: string }[]>([])
const recruitmentCycleOptions = ref<{ label: string; value: string }[]>([])
const visaStatusOptions = ref<{ label: string; value: string }[]>([])
const majorDirOptions = ref<{ label: string; value: string }[]>([])
const allSubDirItems = ref<{ label: string; value: string; parentValue?: string }[]>([])
const subDirOptions = computed(() => {
  if (!formState.majorDirections.length) return []
  return allSubDirItems.value.filter(
    item => item.parentValue && formState.majorDirections.includes(item.parentValue)
  )
})

const loadDictOptions = async () => {
  const [schools, regions, cycles, majors, subs, visas] = await Promise.all([
    getAdminDictOptions('osg_school'),
    getAdminDictOptions('osg_region'),
    getAdminDictOptions('osg_recruit_cycle'),
    getAdminDictOptions('osg_major_direction'),
    getAdminDictOptions('osg_sub_direction'),
    getAdminDictOptions('osg_visa_status'),
  ])
  schoolOptions.value = schools.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  targetRegionOptions.value = regions.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  recruitmentCycleOptions.value = cycles.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  visaStatusOptions.value = visas.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  majorDirOptions.value = majors.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  allSubDirItems.value = subs.map(d => ({ label: d.dictLabel, value: d.dictValue, parentValue: d.parentValue }))
}

const formState = reactive<AddStudentBasicInfo>({
  studentName: '',
  gender: undefined,
  email: '',
  phone: undefined,
  wechat: undefined,
  school: undefined,
  major: undefined,
  highSchool: undefined,
  graduationYear: undefined,
  studyPlan: 'normal',
  visaStatus: undefined,
  targetRegion: [],
  recruitmentCycle: [],
  majorDirections: [],
  subDirections: [],
  leadMentorIds: [],
  assistantIds: [],
  currency: 'USD' as const,
  amountUsd: undefined,
  amountGbp: undefined,
  contractAmount: undefined,
  totalHours: undefined,
  startDate: undefined,
  endDate: undefined,
  initialPassword: undefined,
  contractAttachment: undefined,
  contractRemark: undefined
})

const rules = {
  studentName: [{ required: true, message: t('please_enter_english_name_2'), trigger: 'blur' }],
  gender: [{ required: true, message: t('please_select_gender'), trigger: 'change' }],
  email: [
    { required: true, message: t('please_enter_your_email'), trigger: 'blur' },
    { type: 'email' as const, message: t('please_enter_the_correct_email_format'), trigger: 'blur' }
  ],
  targetRegion: [{ required: true, type: 'array' as const, min: 1, message: t('please_select_at_least_one_job_search_re'), trigger: 'change' }],
  recruitmentCycle: [{ required: true, type: 'array' as const, min: 1, message: t('please_select_at_least_one_recruitment_c'), trigger: 'change' }],
  currency: [{ required: true, message: t('please_select_currency'), trigger: 'change' }],
  amountUsd: [{ required: true, message: t('please_enter_usd_amount'), trigger: 'change' }],
  amountGbp: [{ required: true, message: t('please_enter_gbp_amount'), trigger: 'change' }],
  totalHours: [{ required: true, message: t('please_enter_hours'), trigger: 'change' }],
  startDate: [{ required: true, message: t('please_select_start_date'), trigger: 'change' }],
  endDate: [{ required: true, message: t('please_select_end_date'), trigger: 'change' }],
  phone: [{ required: true, message: t('please_enter_phone_number_2'), trigger: 'blur' }]
}

const resetForm = () => {
  formState.studentName = props.initialValue?.studentName ?? ''
  formState.gender = props.initialValue?.gender
  formState.email = props.initialValue?.email ?? ''
  formState.phone = props.initialValue?.phone
  formState.wechat = props.initialValue?.wechat
  formState.school = props.initialValue?.school
  formState.major = props.initialValue?.major
  formState.highSchool = props.initialValue?.highSchool
  formState.graduationYear = props.initialValue?.graduationYear
  formState.studyPlan = props.initialValue?.studyPlan ?? 'normal'
  formState.visaStatus = props.initialValue?.visaStatus
  formState.targetRegion = props.initialValue?.targetRegion ?? []
  formState.recruitmentCycle = props.initialValue?.recruitmentCycle ?? []
  formState.majorDirections = props.initialValue?.majorDirections ?? []
  formState.subDirections = props.initialValue?.subDirections ?? []
  formState.leadMentorIds = props.initialValue?.leadMentorIds ?? []
  formState.assistantIds = props.initialValue?.assistantIds ?? []
  formState.currency = props.initialValue?.currency ?? 'USD'
  formState.amountUsd = props.initialValue?.amountUsd
  formState.amountGbp = props.initialValue?.amountGbp
  formState.contractAmount = props.initialValue?.contractAmount
  formState.totalHours = props.initialValue?.totalHours
  formState.startDate = props.initialValue?.startDate
  formState.endDate = props.initialValue?.endDate ?? `${currentYear + 1}-05-31`
  formState.initialPassword = props.initialValue?.initialPassword
  formState.contractAttachment = props.initialValue?.contractAttachment
  formState.contractRemark = props.initialValue?.contractRemark
  fileList.value = []
}

watch(() => formState.majorDirections, (newDirs) => {
  const validParents = new Set(newDirs)
  formState.subDirections = formState.subDirections.filter(sub => {
    const item = allSubDirItems.value.find(i => i.value === sub)
    return item?.parentValue && validParents.has(item.parentValue)
  })
})

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      resetForm()
      await Promise.all([loadMentorOptions(), loadAssistantOptions(), loadDictOptions()])
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const loadMentorOptions = async (keyword = '') => {
  try {
    mentorLoading.value = true
    const all = await getStaffOptions(keyword)
    mentorOptions.value = all.filter(s => s.staffType === 'lead_mentor')
  } catch (_error) {
    message.error(t('failed_to_load_homeroom_teacher_list'))
  } finally {
    mentorLoading.value = false
  }
}

const loadAssistantOptions = async (keyword = '') => {
  try {
    assistantLoading.value = true
    const all = await getStaffOptions(keyword)
    assistantOptions.value = all.filter(s => s.staffType === 'assistant')
  } catch (_error) {
    message.error(t('failed_to_load_teaching_assistant_list'))
  } finally {
    assistantLoading.value = false
  }
}

const handleMentorSearch = async (value: string) => {
  await loadMentorOptions(value)
}

const handleAssistantSearch = async (value: string) => {
  await loadAssistantOptions(value)
}

const createPayload = (): AddStudentBasicInfo => ({
  studentName: formState.studentName.trim(),
  gender: formState.gender,
  email: formState.email.trim(),
  phone: formState.phone,
  wechat: formState.wechat,
  school: formState.school?.trim(),
  major: formState.major?.trim(),
  highSchool: formState.highSchool,
  graduationYear: formState.graduationYear,
  studyPlan: formState.studyPlan,
  visaStatus: formState.visaStatus,
  targetRegion: formState.targetRegion,
  recruitmentCycle: [...formState.recruitmentCycle],
  majorDirections: [...formState.majorDirections],
  subDirections: [...formState.subDirections],
  leadMentorIds: [...formState.leadMentorIds],
  assistantIds: [...formState.assistantIds],
  currency: formState.currency,
  amountUsd: formState.amountUsd,
  amountGbp: formState.amountGbp,
  contractAmount: formState.amountUsd || 0,
  totalHours: formState.totalHours,
  startDate: formState.startDate,
  endDate: formState.endDate,
  initialPassword: formState.initialPassword,
  contractAttachment: formState.contractAttachment,
  contractRemark: formState.contractRemark
})

const handleSubmit = async () => {
  const amountFields: string[] = ['currency', 'amountUsd']
  if (formState.currency === 'GBP') amountFields.push('amountGbp')
  await formRef.value?.validate(['studentName', 'gender', 'email', 'phone', 'targetRegion', 'recruitmentCycle', ...amountFields, 'totalHours', 'startDate', 'endDate'])
  if (!formState.majorDirections.length) {
    message.error(t('please_select_at_least_one_major_focus'))
    return
  }
  if (!formState.subDirections.length) {
    message.error(t('please_select_at_least_one_sub_direction'))
    return
  }
  emit('submit', createPayload())
}
</script>

<style scoped lang="scss">
:global([data-surface-id="modal-add-student"] [data-surface-part="header"]) {
  background: #fff !important;
  border-bottom: 1px solid rgba(79, 116, 255, 0.1) !important;
}

:global([data-surface-id="modal-add-student"] .overlay-surface-modal__close) {
  background: #f5f7ff !important;
  color: #69758b !important;

  &:hover {
    background: #eef2ff !important;
    color: #4f74ff !important;
  }
}

.add-student-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.add-student-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.add-student-modal__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
}

.add-student-modal__note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f4f7ff 0%, #eef3ff 100%);
  color: #4f46e5;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 16px;
}

.add-student-modal__note-icon {
  font-size: 14px;
  line-height: 1;
}

.add-student-modal__note-copy {
  flex: 1;

  strong {
    display: block;
    color: #3f68ff;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
  }

  p {
    margin: 2px 0 0;
    color: #546179;
    font-size: 12px;
  }
}

.add-student-modal__note-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(79, 116, 255, 0.12);
  color: #3f68ff;
  font-size: 10px;
  font-weight: 700;
}

.add-student-modal__steps {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.add-student-modal__steps > * {
  flex: 1 1 0;
  min-width: 0;
  gap: 8px;
}

.add-student-modal__step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 12px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 12px;
  background: #fbfcff;
  color: #69758b;
}

.add-student-modal__step--active {
  border-color: rgba(79, 116, 255, 0.18);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  box-shadow: inset 0 0 0 1px rgba(79, 116, 255, 0.08);
}

.add-student-modal__step-copy {
  min-width: 0;

  strong {
    display: block;
    color: #1a2234;
    font-size: 11px;
    line-height: 1.2;
  }

  p {
    margin: 2px 0 0;
    color: #69758b;
    font-size: 9px;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.add-student-modal__step--active .add-student-modal__step-copy strong {
  color: #3f68ff;
}

.add-student-modal__step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #edf2ff;
  color: #4f74ff;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.add-student-modal__step--active .add-student-modal__step-index {
  background: linear-gradient(135deg, #3f68ff, #6788ff);
  color: #fff;
}

.add-student-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

/* ── Part title banners ── */
.add-student-modal__part-title {
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 16px;

  p {
    margin: 4px 0 0;
    font-size: 13px;
  }
}

.add-student-modal__part-title-heading {
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    font-size: 18px;
  }

  strong {
    font-size: 16px;
    font-weight: 700;
  }
}

.add-student-modal__part-title--blue {
  background: linear-gradient(135deg, #eef3ff 0%, #f4f7ff 100%);
  border: 1px solid rgba(79, 116, 255, 0.15);
  color: #3f68ff;

  p {
    color: #546179;
  }
}

.add-student-modal__part-title--amber {
  background: linear-gradient(135deg, #fef9e7 0%, #fff8e1 100%);
  border: 1px solid rgba(197, 106, 38, 0.15);
  color: #92400e;

  p {
    color: #78716c;
  }
}

/* ── Section cards ── */
.add-student-modal__section {
  background: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.add-student-modal__section--highlight {
  background: #fff;
  border: 2px solid #4f74ff;
}

.add-student-modal__section--accent {
  background: #fff;
  border: 2px solid #16a34a;
}

.add-student-modal__section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.add-student-modal__field--wide {
  grid-column: 1 / -1;
}

/* ── Section badge pills ── */
.add-student-modal__section-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.add-student-modal__section-badge--amber {
  background: #fff2db;
  color: #c56a26;
}

.add-student-modal__section-badge--indigo {
  background: #edf2ff;
  color: #3f68ff;
}

.add-student-modal__section-badge--primary {
  background: #4f74ff;
  color: #fff;
}

.add-student-modal__section-badge--blue {
  background: #e8f0f8;
  color: #3b6ea5;
}

.add-student-modal__section-badge--green {
  background: #dcfce7;
  color: #166534;
}

.add-student-modal__section-badge--green-solid {
  background: #16a34a;
  color: #fff;
}

.add-student-modal__account-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  margin-top: 8px;
  background: #dcfce7;
  border-radius: 8px;
  font-size: 11px;
  color: #166534;
  line-height: 1.5;
}

.add-student-modal__section-desc {
  color: #64748b;
  font-size: 12px;
}

.add-student-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a2234;
  font-size: 13px;
  font-weight: 600;
}

.add-student-modal__required {
  color: #dc2626;
}

.add-student-modal__radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.ant-radio-button-wrapper) {
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    margin-inline-start: 0;
    height: 30px;
    padding-inline: 10px;
    line-height: 28px;
    font-size: 11px;
  }

  :deep(.ant-radio-button-wrapper:not(:first-child)::before) {
    display: none;
  }
}

/* ── Select tag colors ── */
.add-student-modal__select--mentor {
  :deep(.ant-select-selection-item) {
    background: #eef3ff;
    color: #3f68ff;
    border-color: rgba(79, 116, 255, 0.2);
  }
}

.add-student-modal__select--assistant {
  :deep(.ant-select-selection-item) {
    background: #dcfce7;
    color: #166534;
    border-color: rgba(22, 101, 52, 0.2);
  }
}

.add-student-modal__checkbox-flat {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;

  :deep(.ant-checkbox-wrapper) {
    font-size: 13px;
    margin-inline-start: 0;
  }
}

.add-student-modal__total-amount {
  padding: 6px 12px;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1d39c4;
  line-height: 32px;
}

.add-student-modal__radio-group {
  display: flex;
  gap: 0;
}

.add-student-modal__number {
  width: 100%;
  height: 32px !important;

  :deep(.ant-input-number-input-wrap),
  :deep(.ant-input-number-input) {
    height: 100% !important;
  }
}

@media (max-width: 720px) {
  .add-student-modal__note {
    flex-direction: column;
    align-items: flex-start;
  }

  .add-student-modal__grid {
    grid-template-columns: 1fr;
  }
}

</style>

