<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-new"
    width="880px"
    :body-class="'student-form-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-form-modal__title">
        <span class="mdi mdi-account-edit student-form-modal__title-icon" aria-hidden="true"></span>
        <span>{{ t('admin.students.editModal.title') }}</span>
      </span>
    </template>

    <a-form
      :model="form"
      layout="vertical"
      :required-mark="false"
    >
      <div class="student-form-modal__part-title student-form-modal__part-title--blue">
        <div class="student-form-modal__part-title-heading">
          <i class="mdi mdi-account-circle" aria-hidden="true"></i>
          <strong>{{ student?.studentName || t('admin.students.editModal.studentFallback') }}</strong>
        </div>
        <p>ID {{ student?.studentId ?? '-' }} · {{ formatStatus(student?.accountStatus) }}</p>
      </div>
      <section class="student-form-modal__section student-form-modal__section--highlight">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--primary">{{ t('admin.students.editModal.sections.coreInfo') }}</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="英文姓名">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.englishName') }}</span>
            </template>
            <a-input v-model:value="form.studentName" :disabled="submitting" :placeholder="t('admin.students.editModal.placeholders.englishName')" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="性别">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.gender') }}</span>
            </template>
            <a-select v-model:value="form.gender" :disabled="submitting" :options="genderOptions" :placeholder="t('admin.students.editModal.placeholders.gender')" />
          </a-form-item>

          <a-form-item class="student-form-modal__field--wide" data-field-name="邮箱">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.email') }}</span>
            </template>
            <a-input v-model:value="form.email" :disabled="submitting" :placeholder="t('admin.students.editModal.placeholders.email')" allow-clear />
          </a-form-item>
        </div>
      </section>
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> {{ t('admin.students.editModal.sections.mentorConfig') }}
          </span>
          <span class="student-form-modal__section-desc">{{ t('admin.students.editModal.sections.mentorConfigDesc') }}</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="班主任">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.leadMentor') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.leadMentorIds"
              :filter-option="false"
              :loading="staffLoading"
              :disabled="submitting"
              :options="mentorSelectOptions"
              :placeholder="t('admin.students.editModal.placeholders.searchMentor')"
              @search="handleStaffSearch"
            />
          </a-form-item>

          <a-form-item data-field-name="助教">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.assistant') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.assistantIds"
              :filter-option="false"
              :loading="staffLoading"
              :disabled="submitting"
              :options="assistantSelectOptions"
              :placeholder="t('admin.students.editModal.placeholders.searchAssistant')"
              @search="handleStaffSearch"
            />
          </a-form-item>
        </div>
      </section>
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--blue">
            <i class="mdi mdi-school" aria-hidden="true"></i> {{ t('admin.students.editModal.sections.academicInfo') }}
          </span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="学校">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.school') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.school"
              :options="schoolOptions"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.school')"
            />
          </a-form-item>

          <a-form-item data-field-name="专业">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.major') }}</span>
            </template>
            <a-input v-model:value="form.major" :disabled="submitting" :placeholder="t('admin.students.editModal.placeholders.major')" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="毕业年月">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.graduationMonth') }}</span>
            </template>
            <a-date-picker
              v-model:value="graduationMonthValue"
              picker="month"
              format="YYYY-MM"
              value-format="YYYY-MM"
              :disabled="submitting"
              :disabled-date="disabledGraduationMonth"
              :placeholder="t('admin.students.editModal.placeholders.graduationMonth')"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item data-field-name="高中">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.highSchool') }}</span>
            </template>
            <a-input v-model:value="form.highSchool" :disabled="submitting" :placeholder="t('admin.students.editModal.placeholders.highSchool')" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="学业状态">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.studyPlan') }}</span>
            </template>
            <a-radio-group v-model:value="form.studyPlan" class="student-form-modal__radio-group" :disabled="submitting">
              <a-radio-button value="normal">{{ t('admin.students.editModal.studyPlan.normal') }}</a-radio-button>
              <a-radio-button value="postgraduate">{{ t('admin.students.editModal.studyPlan.postgraduate') }}</a-radio-button>
              <a-radio-button value="deferred">{{ t('admin.students.editModal.studyPlan.deferred') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item data-field-name="签证">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.visa') }}</span>
            </template>
            <a-select
              v-model:value="form.visaStatus"
              :disabled="submitting"
              :options="visaStatusOptions"
              :placeholder="t('admin.students.editModal.placeholders.visa')"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> {{ t('admin.students.editModal.sections.careerDirection') }}
          </span>
          <span class="student-form-modal__section-desc">{{ t('admin.students.editModal.sections.careerDirectionDesc') }}</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="求职地区">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.targetRegion') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.targetRegion"
              :options="regionOptions"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.targetRegion')"
            />
          </a-form-item>

          <a-form-item data-field-name="招聘周期" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.recruitmentCycle') }}</span>
            </template>
            <a-checkbox-group
              v-model:value="form.recruitmentCycle"
              :options="recruitmentCycleOptions"
              :disabled="submitting"
              class="student-form-modal__checkbox-flat"
            />
          </a-form-item>

          <a-form-item data-field-name="主攻方向">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.majorDirections') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.majorDirections"
              :options="majorDirOptions"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.majorDirections')"
            />
          </a-form-item>

          <a-form-item data-field-name="子方向">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.subDirections') }}</span>
            </template>
            <MultiSelect
              v-model:value="form.subDirections"
              :options="subDirOptions"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.subDirections')"
            />
          </a-form-item>
        </div>
      </section>
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> {{ t('admin.students.editModal.sections.contactAndRemark') }}
          </span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="电话">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.phone') }}</span>
            </template>
            <div class="phone-input-group">
              <a-select
                v-model:value="form.phoneCountryCode"
                :options="phoneCountryOptions"
                class="phone-input-group__code"
                :disabled="submitting"
                :show-search="true"
                :filter-option="filterPhoneCountryOption"
              />
              <a-input
                v-model:value="form.phone"
                class="phone-input-group__number"
                :disabled="submitting"
                :placeholder="t('admin.students.editModal.placeholders.phone')"
              />
            </div>
          </a-form-item>

          <a-form-item data-field-name="微信">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.wechat') }}</span>
            </template>
            <a-input v-model:value="form.wechat" :disabled="submitting" :placeholder="t('admin.students.editModal.placeholders.wechat')" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="备注" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.remark') }}</span>
            </template>
            <a-textarea
              v-model:value="form.remark"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.remark')"
              :rows="4"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--blue">
            <i class="mdi mdi-file-document" aria-hidden="true"></i> {{ t('admin.students.editModal.sections.contract') }}
          </span>
          <span class="student-form-modal__section-desc">{{ t('admin.students.editModal.sections.contractDesc') }}</span>
        </div>
        <div v-if="!activeContract" class="student-form-modal__attachment-empty">
          {{ t('admin.students.editModal.noActiveContract') }}
        </div>
        <div v-else class="student-form-modal__grid">
          <a-form-item data-field-name="币种" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.currency') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-radio-group v-model:value="contractForm.currency" :disabled="submitting">
              <a-radio-button value="USD">{{ t('admin.students.editModal.currency.usd') }}</a-radio-button>
              <a-radio-button value="GBP">{{ t('admin.students.editModal.currency.gbp') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="contractForm.currency === 'GBP'" data-field-name="英镑金额">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.amountGbp') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.amountGbp"
              :disabled="submitting"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              style="width: 100%"
              :placeholder="t('admin.students.editModal.placeholders.amountGbp')"
            />
          </a-form-item>

          <a-form-item data-field-name="美元金额">
            <template #label>
              <span class="student-form-modal__label">
                {{ contractForm.currency === 'GBP' ? t('admin.students.editModal.fields.usdEquivalent') : t('admin.students.editModal.fields.amountUsd') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.amountUsd"
              :disabled="submitting"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              style="width: 100%"
              :placeholder="contractForm.currency === 'GBP' ? t('admin.students.editModal.placeholders.usdEquivalent') : t('admin.students.editModal.placeholders.amountUsd')"
            />
          </a-form-item>

          <a-form-item data-field-name="课时（小时）">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.totalHours') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.totalHours"
              :disabled="submitting"
              :min="1"
              :max="MAX_CONTRACT_HOURS"
              :precision="0"
              :controls="false"
              style="width: 100%"
              :placeholder="t('admin.students.editModal.placeholders.totalHours')"
            />
          </a-form-item>

          <a-form-item data-field-name="合同开始日期">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.startDate') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="contractForm.startDate"
              :disabled="submitting"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :placeholder="t('admin.students.editModal.placeholders.startDate')"
            />
          </a-form-item>

          <a-form-item data-field-name="合同结束日期">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.endDate') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="contractForm.endDate"
              :disabled="submitting"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :placeholder="t('admin.students.editModal.placeholders.endDate')"
            />
          </a-form-item>

          <a-form-item data-field-name="合同附件" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">
                {{ t('admin.students.editModal.fields.contractAttachment') }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-upload-dragger
              :action="contractUploadAction"
              :headers="contractUploadHeaders"
              :data="contractUploadData"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg"
              :max-count="1"
              :file-list="contractFileList"
              :before-upload="beforeContractUpload"
              :show-upload-list="{ showDownloadIcon: true, showPreviewIcon: false, showRemoveIcon: true }"
              @change="handleContractUploadChange"
              @download="handleContractDownload"
            >
              <p class="ant-upload-drag-icon">
                <i class="mdi mdi-cloud-upload" style="font-size: 28px; color: #4f74ff"></i>
              </p>
              <p class="ant-upload-text">
                {{ contractForm.attachmentPath ? t('admin.students.editModal.upload.replace') : t('admin.students.editModal.upload.clickOrDrag') }}
              </p>
              <p class="ant-upload-hint">{{ t('admin.students.editModal.upload.hint') }}</p>
            </a-upload-dragger>
            <div v-if="contractForm.attachmentPath" class="student-form-modal__attachment-link">
              <i class="mdi mdi-file-download-outline" aria-hidden="true"></i>
              <span>{{ t('admin.students.editModal.currentAttachment') }}</span>
              <a :href="resolveAttachmentUrl(contractForm.attachmentPath)" target="_blank" rel="noreferrer">
                {{ extractAttachmentName(contractForm.attachmentPath) }}
              </a>
            </div>
          </a-form-item>

          <a-form-item data-field-name="合同备注" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">{{ t('admin.students.editModal.fields.contractRemark') }}</span>
            </template>
            <a-textarea
              v-model:value="contractForm.remark"
              :disabled="submitting"
              :placeholder="t('admin.students.editModal.placeholders.contractRemark')"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.students.editModal.footer.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">{{ t('admin.students.editModal.footer.save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import type { StudentListItem, UpdateStudentPayload } from '@osg/shared/api/admin/student'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import type { ContractListItem, UpdateContractPayload } from '@osg/shared/api/admin/contract'
import { getAdminDictOptions } from '@/api/adminDict'
import { http } from '@osg/shared/utils/request'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { MultiSelect } from '@osg/shared/components'
import { splitPhone, joinPhone, MAX_AMOUNT, MAX_AMOUNT_MESSAGE, MAX_CONTRACT_HOURS, MAX_CONTRACT_HOURS_MESSAGE } from '@osg/shared/utils'
import { getToken } from '@osg/shared/utils/storage'
import { useDictFacade } from '@osg/shared/composables'

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
  submit: [
    payload: UpdateStudentPayload,
    contractPatch?: { contractId: number; payload: UpdateContractPayload }
  ]
}>()

const genderOptions = computed(() => [
  { label: t('admin.students.editModal.gender.male'), value: '0' },
  { label: t('admin.students.editModal.gender.female'), value: '1' },
])

const form = reactive({
  studentName: '',
  gender: '' as string,
  email: '',
  school: [] as string[],
  majorDirections: [] as string[],
  subDirections: [] as string[],
  major: '',
  graduationYear: '' as string | number,
  highSchool: '',
  studyPlan: 'normal' as 'normal' | 'postgraduate' | 'deferred',
  visaStatus: '' as string | undefined,
  targetRegion: [] as string[],
  recruitmentCycle: [] as string[],
  phone: '',
  phoneCountryCode: '+1',
  wechat: '',
  remark: '',
  leadMentorIds: [] as number[],
  assistantIds: [] as number[],
})

const { items: countryCodeItems, load: loadCountryCode } = useDictFacade('osg_country_code')
const phoneCountryOptions = computed(() => {
  const items = countryCodeItems.value
    .map((item) => ({
      value: item.extra?.callingCode || '',
      label: `${item.extra?.callingCode ?? ''} ${item.label}`.trim(),
    }))
    .filter((opt) => opt.value)
  return items.length ? items : [{ value: '+1', label: '+1 美国/加拿大' }] // i18n-skip-line: backend values
})
const filterPhoneCountryOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true
  return option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword)
}

const staffOptions = ref<StaffListItem[]>([])
const staffLoading = ref(false)

const schoolOptions = ref<{ label: string; value: string }[]>([])
const majorDirOptions = ref<{ label: string; value: string }[]>([])
const allSubDirItems = ref<{ label: string; value: string; parentValue?: string }[]>([])
const subDirOptions = computed(() => {
  if (!form.majorDirections.length) return []
  return allSubDirItems.value.filter(
    item => item.parentValue && form.majorDirections.includes(item.parentValue)
  )
})
const regionOptions = ref<{ label: string; value: string }[]>([])
const recruitmentCycleOptions = ref<{ label: string; value: string }[]>([])
const visaStatusOptions = ref<{ label: string; value: string }[]>([])

const graduationMonthValue = ref<string | null>(null)

watch(graduationMonthValue, (next) => {
  if (!next) {
    form.graduationYear = ''
    return
  }
  form.graduationYear = typeof next === 'string'
    ? next.slice(0, 4)
    : String((next as Dayjs).year())
})

const disabledGraduationMonth = (current?: Dayjs) => {
  if (!current) return false
  const today = dayjs().startOf('month')
  const max = today.add(3, 'year').endOf('month')
  return current.isBefore(today) || current.isAfter(max)
}

watch(() => form.majorDirections, (next) => {
  const validParents = new Set(next)
  form.subDirections = form.subDirections.filter(sub => {
    const item = allSubDirItems.value.find(i => i.value === sub)
    return item?.parentValue && validParents.has(item.parentValue)
  })
})

const loadDictOptions = async () => {
  const [schools, majors, subs, regions, cycles, visas] = await Promise.all([
    getAdminDictOptions('osg_school'),
    getAdminDictOptions('osg_major_direction'),
    getAdminDictOptions('osg_sub_direction'),
    getAdminDictOptions('osg_region'),
    getAdminDictOptions('osg_recruit_cycle'),
    getAdminDictOptions('osg_visa_status'),
  ])
  schoolOptions.value = schools.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  majorDirOptions.value = majors.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  allSubDirItems.value = subs.map(d => ({ label: d.dictLabel, value: d.dictValue, parentValue: d.parentValue }))
  regionOptions.value = regions.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  recruitmentCycleOptions.value = cycles.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  visaStatusOptions.value = visas.map(d => ({ label: d.dictLabel, value: d.dictValue }))
}

const mentorSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'lead_mentor' && item.staffId != null)
  .map((item) => ({ label: item.staffName, value: item.staffId })))

const assistantSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'assistant' && item.staffId != null)
  .map((item) => ({ label: item.staffName, value: item.staffId })))

const mergeCurrentOption = (
  staffType: 'lead_mentor' | 'assistant',
  staffId?: number,
  label?: string
) => {
  if (staffId == null) return
  if (staffOptions.value.some((item) => item.staffId === staffId)) return
  const fallbackName = staffType === 'lead_mentor'
    ? t('admin.students.editModal.staffFallback.leadMentor')
    : t('admin.students.editModal.staffFallback.assistant')
  staffOptions.value = [
    ...staffOptions.value,
    {
      staffId,
      staffName: label || `${fallbackName} ${staffId}`,
      staffType,
    },
  ]
}

const seedStaffOptionsFromStudent = (student?: StudentListItem | null) => {
  if (!student) return
  const leadIds = student.leadMentorIds?.length ? student.leadMentorIds : (student.leadMentorId != null ? [student.leadMentorId] : [])
  const leadNames = student.leadMentorNames?.length ? student.leadMentorNames : (student.leadMentorName ? [student.leadMentorName] : [])
  leadIds.forEach((id, idx) => mergeCurrentOption('lead_mentor', id, leadNames[idx]))
  const asstIds = student.assistantIds?.length ? student.assistantIds : (student.assistantId != null ? [student.assistantId] : [])
  const asstNames = student.assistantNames?.length ? student.assistantNames : (student.assistantName ? [student.assistantName] : [])
  asstIds.forEach((id, idx) => mergeCurrentOption('assistant', id, asstNames[idx]))
}

const toExtraStudentFields = (student?: StudentListItem | null) => (student ?? {}) as unknown as {
  gender?: string
  phone?: string
  wechat?: string
  remark?: string
  highSchool?: string
  studyPlan?: 'normal' | 'postgraduate' | 'deferred'
  visaStatus?: string
  major?: string
  recruitmentCycle?: string
  recruitmentCycles?: string[]
  majorDirections?: string[]
  subDirections?: string[]
  subDirection?: string
  graduationYear?: number | string
}

const splitCsv = (value?: string) => (value ? value.split(',').map(v => v.trim()).filter(Boolean) : [])

const activeContract = ref<ContractListItem | null>(null)

const contractForm = reactive({
  currency: 'USD' as 'USD' | 'GBP',
  amountUsd: undefined as number | undefined,
  amountGbp: undefined as number | undefined,
  totalHours: undefined as number | undefined,
  startDate: '' as string,
  endDate: '' as string,
  attachmentPath: '' as string,
  remark: '' as string,
})

const contractUploadAction = '/api/admin/contract/upload'
const contractUploadHeaders = computed(() => ({ Authorization: `Bearer ${getToken() || ''}` }))
const contractUploadData = computed(() => {
  const cid = activeContract.value?.contractId
  return cid != null ? { contractId: String(cid) } : {}
})

type ContractFileItem = { uid: string; name: string; status: 'done'; url: string }
const contractFileList = ref<ContractFileItem[]>([])

const buildFileListFromPath = (path: string): ContractFileItem[] => {
  if (!path) return []
  return [{ uid: `contract-${Date.now()}`, name: extractAttachmentName(path), status: 'done', url: resolveAttachmentUrl(path) }]
}

function resolveAttachmentUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}

function extractAttachmentName(path: string): string {
  if (!path) return ''
  try {
    const url = new URL(path, 'http://placeholder')
    const segs = url.pathname.split('/')
    return segs[segs.length - 1] || path
  } catch {
    const segs = path.split('/')
    return segs[segs.length - 1] || path
  }
}

function handleContractDownload(file: ContractFileItem) {
  if (!file?.url) return
  window.open(file.url, '_blank', 'noopener,noreferrer')
}

const MAX_CONTRACT_UPLOAD_MB = 150
const MAX_CONTRACT_UPLOAD_BYTES = MAX_CONTRACT_UPLOAD_MB * 1024 * 1024
const ALLOWED_CONTRACT_EXTS = /\.(pdf|png|jpe?g)$/i

const resetContractForm = () => {
  contractForm.currency = 'USD'
  contractForm.amountUsd = undefined
  contractForm.amountGbp = undefined
  contractForm.totalHours = undefined
  contractForm.startDate = ''
  contractForm.endDate = ''
  contractForm.attachmentPath = ''
  contractForm.remark = ''
  contractFileList.value = []
}

const syncContractForm = (contract: ContractListItem) => {
  const currencyUpper = (contract.currency || '').toUpperCase()
  contractForm.currency = currencyUpper === 'GBP' ? 'GBP' : 'USD'
  contractForm.amountUsd = contract.amountUsd ?? (contractForm.currency === 'USD' ? contract.contractAmount : undefined)
  contractForm.amountGbp = contract.amountGbp ?? (contractForm.currency === 'GBP' ? contract.contractAmount : undefined)
  contractForm.totalHours = contract.totalHours
  contractForm.startDate = (contract.startDate || '').slice(0, 10)
  contractForm.endDate = (contract.endDate || '').slice(0, 10)
  contractForm.attachmentPath = contract.attachmentPath || ''
  contractForm.remark = (contract as unknown as { remark?: string }).remark || ''
  contractFileList.value = buildFileListFromPath(contractForm.attachmentPath)
}

const loadStudentContract = async (studentId?: number | null) => {
  activeContract.value = null
  resetContractForm()
  if (!studentId) return
  try {
    const res = await http.get<{ contracts: ContractListItem[] }>(`/admin/student/${studentId}/contracts`)
    const contracts = res?.contracts || []
    const sorted = [...contracts].sort((a, b) => (b.contractId || 0) - (a.contractId || 0))
    const latest = sorted[0]
    if (latest) {
      activeContract.value = latest
      syncContractForm(latest)
    }
  } catch (_error) {
    activeContract.value = null
  }
}

const beforeContractUpload = (file: File) => {
  if (!ALLOWED_CONTRACT_EXTS.test(file.name || '')) {
    message.error(t('admin.students.editModal.upload.unsupportedFormat'))
    return false
  }
  if (file.size > MAX_CONTRACT_UPLOAD_BYTES) {
    message.error(t('admin.students.editModal.upload.fileTooLarge', { max: MAX_CONTRACT_UPLOAD_MB, actual: (file.size / 1024 / 1024).toFixed(2) }))
    return false
  }
  return true
}

const handleContractUploadChange = (info: UploadChangeParam) => {
  if (info.file.status === 'done') {
    const response = info.file.response as { code?: number; msg?: string; attachmentPath?: string; url?: string; fileName?: string } | undefined
    if (response && response.code !== undefined && response.code !== 200) {
      contractForm.attachmentPath = ''
      contractFileList.value = []
      message.error(t('admin.students.editModal.upload.failed', { reason: response.msg || t('admin.students.editModal.upload.backendError') }))
      return
    }
    const url = response?.attachmentPath || response?.url || response?.fileName || ''
    if (url) {
      contractForm.attachmentPath = url
      contractFileList.value = buildFileListFromPath(url)
      message.success(t('admin.students.editModal.upload.success'))
    }
  } else if (info.file.status === 'error') {
    contractForm.attachmentPath = ''
    contractFileList.value = []
    message.error(t('admin.students.editModal.upload.failed', { reason: t('admin.students.editModal.upload.networkError') }))
  } else if (info.file.status === 'removed') {
    contractForm.attachmentPath = ''
    contractFileList.value = []
  }
}

const buildContractPatch = (): { contractId: number; payload: UpdateContractPayload } | undefined => {
  const orig = activeContract.value
  if (!orig) return undefined

  const patch: UpdateContractPayload = {}
  const origCurrency = (orig.currency || '').toUpperCase() === 'GBP' ? 'GBP' : 'USD'
  if (contractForm.currency !== origCurrency) patch.currency = contractForm.currency
  const formUsd = contractForm.amountUsd ?? null
  const origUsd = orig.amountUsd ?? null
  if (formUsd !== origUsd && contractForm.amountUsd !== undefined) {
    patch.amountUsd = contractForm.amountUsd
  }
  const formGbp = contractForm.amountGbp ?? null
  const origGbp = orig.amountGbp ?? null
  if (formGbp !== origGbp && contractForm.amountGbp !== undefined) {
    patch.amountGbp = contractForm.amountGbp
  }
  const newAmount = contractForm.currency === 'USD' ? contractForm.amountUsd : contractForm.amountGbp
  if (newAmount != null && newAmount !== orig.contractAmount) patch.contractAmount = newAmount
  if (contractForm.totalHours != null && contractForm.totalHours !== orig.totalHours) patch.totalHours = contractForm.totalHours
  if (contractForm.startDate && contractForm.startDate !== (orig.startDate || '').slice(0, 10)) patch.startDate = contractForm.startDate
  if (contractForm.endDate && contractForm.endDate !== (orig.endDate || '').slice(0, 10)) patch.endDate = contractForm.endDate
  if (contractForm.attachmentPath !== (orig.attachmentPath || '')) patch.attachmentPath = contractForm.attachmentPath
  const origRemark = (orig as unknown as { remark?: string }).remark || ''
  if (contractForm.remark !== origRemark) patch.remark = contractForm.remark

  return Object.keys(patch).length ? { contractId: orig.contractId, payload: patch } : undefined
}

const loadStudentDetail = async (studentId?: number | null) => {
  if (!studentId) return
  try {
    const d = await http.get<{
      schools?: string[]
      major?: string
      graduationYear?: number
      graduationMonth?: string
      highSchool?: string
      visaStatus?: string
      academic?: { studyPlan?: string; highSchool?: string; visaStatus?: string }
      jobDirection?: { targetRegion?: string; recruitmentCycles?: string[]; majorDirections?: string[]; subDirection?: string }
      mentor?: { leadMentorIds?: number[]; leadMentorNames?: string[]; assistantIds?: number[]; assistantNames?: string[] }
      remark?: string
      contact?: { phone?: string; wechat?: string }
      gender?: string
    }>(`/admin/student/${studentId}`)
    if (!d) return

    if (d.schools?.length) form.school = [...d.schools]
    if (d.major) form.major = d.major
    if (d.graduationYear) form.graduationYear = String(d.graduationYear)
    if (d.graduationMonth) graduationMonthValue.value = d.graduationMonth
    else if (d.graduationYear) graduationMonthValue.value = `${d.graduationYear}-06`
    const academic = d.academic || {}
    form.highSchool = d.highSchool || academic.highSchool || form.highSchool
    form.visaStatus = d.visaStatus || academic.visaStatus || form.visaStatus
    if (academic.studyPlan === 'normal' || academic.studyPlan === 'postgraduate' || academic.studyPlan === 'deferred') {
      form.studyPlan = academic.studyPlan
    }
    const job = d.jobDirection || {}
    if (job.majorDirections?.length) form.majorDirections = [...job.majorDirections]
    if (job.subDirection) form.subDirections = job.subDirection.split(',').map(s => s.trim()).filter(Boolean)
    if (job.targetRegion) form.targetRegion = job.targetRegion.split(',').map(s => s.trim()).filter(Boolean)
    if (job.recruitmentCycles?.length) form.recruitmentCycle = [...job.recruitmentCycles]
    if (d.mentor?.leadMentorIds?.length) form.leadMentorIds = [...d.mentor.leadMentorIds]
    if (d.mentor?.assistantIds?.length) form.assistantIds = [...d.mentor.assistantIds]
    if (d.contact?.phone) {
      const parsed = splitPhone(d.contact.phone)
      form.phoneCountryCode = parsed.countryCode
      form.phone = parsed.number
    }
    if (d.contact?.wechat) form.wechat = d.contact.wechat
    if (d.remark) form.remark = d.remark
    if (d.gender) form.gender = d.gender
    d.mentor?.leadMentorIds?.forEach((id, idx) => mergeCurrentOption('lead_mentor', id, d.mentor?.leadMentorNames?.[idx]))
    d.mentor?.assistantIds?.forEach((id, idx) => mergeCurrentOption('assistant', id, d.mentor?.assistantNames?.[idx]))
  } catch (_error) {
    // detail load failure: keep syncForm content
  }
}

const syncForm = () => {
  const extra = toExtraStudentFields(props.student)
  form.studentName = props.student?.studentName || ''
  form.gender = extra.gender || ''
  form.email = props.student?.email || ''
  const schoolDetail = (props.student as unknown as { schools?: string[] })?.schools
  form.school = schoolDetail?.length
    ? [...schoolDetail]
    : (props.student?.school ? props.student.school.split(',').map(s => s.trim()).filter(Boolean) : [])
  form.major = extra.major || ''
  form.graduationYear = extra.graduationYear ?? ''
  const studentGm = (props.student as unknown as { graduationMonth?: string })?.graduationMonth
  graduationMonthValue.value = studentGm
    || (form.graduationYear ? `${form.graduationYear}-06` : null)
  form.highSchool = extra.highSchool || ''
  form.studyPlan = (extra.studyPlan as typeof form.studyPlan) || 'normal'
  form.visaStatus = extra.visaStatus || undefined

  form.majorDirections = extra.majorDirections?.length
    ? [...extra.majorDirections]
    : splitCsv(props.student?.majorDirection)
  form.subDirections = extra.subDirections?.length
    ? [...extra.subDirections]
    : splitCsv(extra.subDirection)
  form.targetRegion = splitCsv(props.student?.targetRegion)
  form.recruitmentCycle = extra.recruitmentCycles?.length
    ? [...extra.recruitmentCycles]
    : splitCsv(extra.recruitmentCycle)

  form.leadMentorIds = props.student?.leadMentorIds?.length
    ? [...props.student.leadMentorIds]
    : (props.student?.leadMentorId != null ? [props.student.leadMentorId] : [])
  form.assistantIds = props.student?.assistantIds?.length
    ? [...props.student.assistantIds]
    : (props.student?.assistantId != null ? [props.student.assistantId] : [])

  if (extra.phone) {
    const parsed = splitPhone(extra.phone)
    form.phoneCountryCode = parsed.countryCode
    form.phone = parsed.number
  } else {
    form.phoneCountryCode = '+1'
    form.phone = ''
  }
  form.wechat = extra.wechat || ''
  form.remark = extra.remark || ''

  seedStaffOptionsFromStudent(props.student)
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
    seedStaffOptionsFromStudent(props.student)
  } catch (_error) {
    message.error(t('admin.students.editModal.messages.loadStaffFailed'))
  } finally {
    staffLoading.value = false
  }
}

const handleStaffSearch = (keyword: string) => {
  void loadStaffOptions(keyword)
}

watch(
  () => [props.visible, props.student] as const,
  ([visible, student]) => {
    if (visible) {
      syncForm()
      void loadStaffOptions()
      void loadDictOptions()
      void loadCountryCode()
      void loadStudentContract(student?.studentId)
      void loadStudentDetail(student?.studentId)
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!props.student?.studentId) {
    message.error(t('admin.students.editModal.validation.studentId'))
    return
  }
  if (!form.email.trim()) {
    message.error(t('admin.students.editModal.validation.email'))
    return
  }
  if (!form.school?.length) {
    message.error(t('admin.students.editModal.validation.school'))
    return
  }

  if (activeContract.value && contractForm.startDate && contractForm.endDate
      && contractForm.endDate < contractForm.startDate) {
    message.error(t('admin.students.editModal.validation.contractDates'))
    return
  }

  if ((contractForm.amountUsd ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if ((contractForm.amountGbp ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if ((contractForm.totalHours ?? 0) > MAX_CONTRACT_HOURS) {
    message.error(MAX_CONTRACT_HOURS_MESSAGE)
    return
  }

  const studentPayload = {
    studentId: props.student.studentId,
    studentName: form.studentName.trim() || props.student.studentName,
    email: form.email.trim(),
    school: form.school,
    major: form.major.trim() || undefined,
    graduationYear: form.graduationYear ? Number(form.graduationYear) || undefined : undefined,
    graduationMonth: graduationMonthValue.value || undefined,
    majorDirections: form.majorDirections.length ? [...form.majorDirections] : undefined,
    subDirections: form.subDirections.length ? [...form.subDirections] : undefined,
    targetRegion: form.targetRegion.length ? [...form.targetRegion] : undefined,
    recruitmentCycle: form.recruitmentCycle.length ? [...form.recruitmentCycle] : undefined,
    highSchool: form.highSchool.trim() || undefined,
    studyPlan: form.studyPlan,
    visaStatus: form.visaStatus || undefined,
    remark: form.remark.trim() || undefined,
    leadMentorIds: form.leadMentorIds.length ? [...form.leadMentorIds] : undefined,
    assistantIds: form.assistantIds.length ? [...form.assistantIds] : undefined,
    phone: joinPhone(form.phoneCountryCode, form.phone),
    wechat: form.wechat.trim() || undefined,
    gender: form.gender || undefined,
  } as UpdateStudentPayload & { phone?: string; wechat?: string; gender?: string }

  const contractPatch = buildContractPatch()
  emit('submit', studentPayload, contractPatch)
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1': return t('admin.students.editModal.status.frozen')
    case '2': return t('admin.students.editModal.status.ended')
    case '3': return t('admin.students.editModal.status.refunded')
    default: return t('admin.students.editModal.status.normal')
  }
}
</script>
<style lang="scss">
@use './student-form.scss';
</style>

<style scoped lang="scss">
.student-form-modal__attachment-link {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4f74ff;

  span {
    color: #6b7280;
  }

  a {
    color: #4f74ff;
    text-decoration: underline;

    &:hover {
      color: #3a5bdb;
    }
  }

  .mdi {
    font-size: 16px;
  }
}

.phone-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-input-group__code {
  flex: 0 0 130px;
}

.phone-input-group__number {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
