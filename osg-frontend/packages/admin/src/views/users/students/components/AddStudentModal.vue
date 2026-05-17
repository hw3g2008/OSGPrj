<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-add-student"
    width="880px"
    :body-class="'add-student-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="add-student-modal__title">
        <span class="mdi mdi-account-plus add-student-modal__title-icon" aria-hidden="true"></span>
        <span>{{ t('admin.students.addModal.title') }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <!-- ══ Part 1: 基本信息 ══ i18n-skip-line: dev comment -->
      <div class="add-student-modal__part-title add-student-modal__part-title--blue">
        <div class="add-student-modal__part-title-heading">
          <i class="mdi mdi-account-circle" aria-hidden="true"></i>
          <strong>{{ t('admin.students.addModal.sections.basicInfo') }}</strong>
        </div>
        <p>{{ t('admin.students.addModal.sections.basicInfoDesc') }}</p>
      </div>

      <!-- ① 核心信息 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section add-student-modal__section--highlight">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--primary">{{ t('admin.students.addModal.sections.coreInfo') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="studentName" data-field-name="英文姓名">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.englishName') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input
              v-model:value="formState.studentName"
              :placeholder="t('admin.students.addModal.placeholders.englishName')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="gender" data-field-name="性别">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.gender') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-select
              v-model:value="formState.gender"
              :placeholder="t('admin.students.addModal.placeholders.gender')"
              :options="genderOptions"
            />
          </a-form-item>

          <a-form-item class="add-student-modal__field--wide" name="email" data-field-name="邮箱">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.email') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input
              v-model:value="formState.email"
              :placeholder="t('admin.students.addModal.placeholders.email')"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>

      <!-- ② 导师配置 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> {{ t('admin.students.addModal.sections.mentorConfig') }}
          </span>
          <span class="add-student-modal__section-desc">{{ t('admin.students.addModal.sections.optionalMulti') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="leadMentorIds" data-field-name="班主任">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.leadMentor') }}</span>
            </template>
            <MultiSelect
              v-model:value="formState.leadMentorIds"
              :filter-option="false"
              :loading="mentorLoading"
              :options="mentorSelectOptions"
              :placeholder="t('admin.students.addModal.placeholders.searchMentor')"
              class="add-student-modal__select--mentor"
              @search="handleMentorSearch"
            />
          </a-form-item>

          <a-form-item name="assistantIds" data-field-name="助教">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.assistant') }}</span>
            </template>
            <MultiSelect
              v-model:value="formState.assistantIds"
              :filter-option="false"
              :loading="assistantLoading"
              :options="assistantSelectOptions"
              :placeholder="t('admin.students.addModal.placeholders.searchAssistant')"
              class="add-student-modal__select--assistant"
              @search="handleAssistantSearch"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ③ 学业信息 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--indigo">
            <i class="mdi mdi-school" aria-hidden="true"></i> {{ t('admin.students.addModal.sections.academicInfo') }}
          </span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="school" data-field-name="学校">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.school') }}</span>
            </template>
            <MultiSelect
              v-model:value="formState.school"
              :options="schoolOptions"
              :placeholder="t('admin.students.addModal.placeholders.school')"
            />
          </a-form-item>

          <a-form-item name="major" data-field-name="专业">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.major') }}</span>
            </template>
            <a-input
              v-model:value="formState.major"
              :placeholder="t('admin.students.addModal.placeholders.major')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="graduationYear" data-field-name="毕业年月">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.graduationMonth') }}</span>
            </template>
            <a-date-picker
              v-model:value="graduationMonthValue"
              picker="month"
              format="YYYY-MM"
              value-format="YYYY-MM"
              :disabled-date="disabledGraduationMonth"
              :placeholder="t('admin.students.addModal.placeholders.graduationMonth')"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item name="highSchool" data-field-name="高中">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.highSchool') }}</span>
            </template>
            <a-input
              v-model:value="formState.highSchool"
              :placeholder="t('admin.students.addModal.placeholders.optional')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="studyPlan" data-field-name="学业状态">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.studyPlan') }}</span>
            </template>
            <a-radio-group v-model:value="formState.studyPlan" class="add-student-modal__radio-group">
              <a-radio-button value="normal">{{ t('admin.students.addModal.studyPlan.normal') }}</a-radio-button>
              <a-radio-button value="postgraduate">{{ t('admin.students.addModal.studyPlan.postgraduate') }}</a-radio-button>
              <a-radio-button value="deferred">{{ t('admin.students.addModal.studyPlan.deferred') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item name="visaStatus" data-field-name="签证">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.visaStatus') }}</span>
            </template>
            <a-select
              v-model:value="formState.visaStatus"
              :placeholder="t('admin.students.addModal.placeholders.visaStatus')"
              :options="visaStatusOptions"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ④ 求职方向 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> {{ t('admin.students.addModal.sections.careerDirection') }}
          </span>
          <span class="add-student-modal__section-desc">{{ t('admin.students.addModal.sections.careerDirectionDesc') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="targetRegion" data-field-name="求职地区">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.targetRegion') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.targetRegion"
              :placeholder="t('admin.students.addModal.placeholders.targetRegion')"
              :options="targetRegionOptions"
            />
          </a-form-item>

          <a-form-item name="recruitmentCycle" data-field-name="招聘周期" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.recruitmentCycle') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-checkbox-group
              v-model:value="formState.recruitmentCycle"
              :options="recruitmentCycleOptions"
              class="add-student-modal__checkbox-flat"
            />
          </a-form-item>

          <a-form-item name="majorDirections" data-field-name="主攻方向">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.majorDirections') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.majorDirections"
              :placeholder="t('admin.students.addModal.placeholders.multiSelect')"
              :options="majorDirOptions"
            />
          </a-form-item>

          <a-form-item name="subDirections" data-field-name="子方向">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.subDirections') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <MultiSelect
              v-model:value="formState.subDirections"
              :placeholder="t('admin.students.addModal.placeholders.multiSelect')"
              :options="subDirOptions"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ⑤ 联系方式 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> {{ t('admin.students.addModal.sections.contact') }}
          </span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item name="phone" data-field-name="电话">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.phone') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <div class="phone-input-group">
              <a-select
                v-model:value="phoneCountryCode"
                :options="phoneCountryOptions"
                class="phone-input-group__code"
                :show-search="true"
                :filter-option="filterPhoneCountryOption"
              />
              <a-input
                v-model:value="formState.phone"
                class="phone-input-group__number"
                :placeholder="t('admin.students.addModal.placeholders.phone')"
                allow-clear
              />
            </div>
          </a-form-item>

          <a-form-item name="wechat" data-field-name="微信">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.wechat') }}</span>
            </template>
            <a-input
              v-model:value="formState.wechat"
              :placeholder="t('admin.students.addModal.placeholders.wechat')"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="remark" data-field-name="备注" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.remark') }}</span>
            </template>
            <a-textarea
              v-model:value="formState.remark"
              :placeholder="t('admin.students.addModal.placeholders.remark')"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>

      <!-- ⑥ 学生端账号 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section add-student-modal__section--accent">
        <div class="add-student-modal__section-header">
          <span class="add-student-modal__section-badge add-student-modal__section-badge--green-solid">
            <i class="mdi mdi-account-key" aria-hidden="true"></i> {{ t('admin.students.addModal.sections.studentAccount') }}
          </span>
          <span class="add-student-modal__section-desc">{{ t('admin.students.addModal.sections.studentAccountDesc') }}</span>
        </div>
        <div class="add-student-modal__grid">
          <a-form-item data-field-name="登录账号">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.loginAccount') }}</span>
            </template>
            <a-input
              :value="formState.email"
              disabled
              :placeholder="t('admin.students.addModal.placeholders.loginAccount')"
            />
          </a-form-item>

          <a-form-item data-field-name="初始密码">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.initialPassword') }}</span>
            </template>
            <a-input
              value="Osg@2026"
              disabled
            />
          </a-form-item>
        </div>
        <div class="add-student-modal__account-tip">
          <i class="mdi mdi-information" aria-hidden="true"></i>
          <span v-html="t('admin.students.addModal.accountTip')"></span>
        </div>
      </div>

      <!-- ══ Part 2: 合同信息 ══ i18n-skip-line: dev comment -->
      <div class="add-student-modal__part-title add-student-modal__part-title--amber">
        <div class="add-student-modal__part-title-heading">
          <i class="mdi mdi-file-document-edit" aria-hidden="true"></i>
          <strong>{{ t('admin.students.addModal.sections.contractInfo') }}</strong>
        </div>
        <p>{{ t('admin.students.addModal.sections.contractInfoDesc') }}</p>
      </div>

      <!-- ⑦ 合同字段 i18n-skip-line: dev comment -->
      <div class="add-student-modal__section">
        <div class="add-student-modal__grid">
          <a-form-item name="currency" data-field-name="币种" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.currency') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-radio-group v-model:value="formState.currency" class="add-student-modal__radio-group">
              <a-radio-button value="USD">{{ t('admin.students.addModal.currency.usd') }}</a-radio-button>
              <a-radio-button value="GBP">{{ t('admin.students.addModal.currency.gbp') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="formState.currency === 'GBP'" name="amountGbp" data-field-name="英镑金额">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.amountGbp') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.amountGbp"
              class="add-student-modal__number"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              :placeholder="t('admin.students.addModal.placeholders.amountGbp')"
              @change="(v: number | string | null) => clampAmount('amountGbp', v)"
            />
          </a-form-item>

          <a-form-item name="amountUsd" data-field-name="美元金额">
            <template #label>
              <span class="add-student-modal__label">
                {{ formState.currency === 'GBP' ? t('admin.students.addModal.fields.usdEquivalent') : t('admin.students.addModal.fields.amountUsd') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.amountUsd"
              class="add-student-modal__number"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              :placeholder="formState.currency === 'GBP' ? t('admin.students.addModal.placeholders.usdEquivalent') : t('admin.students.addModal.placeholders.amountUsd')"
              @change="(v: number | string | null) => clampAmount('amountUsd', v)"
            />
          </a-form-item>

          <a-form-item name="totalHours" data-field-name="课时（小时）">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.totalHours') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="formState.totalHours"
              class="add-student-modal__number"
              :min="1"
              :max="MAX_CONTRACT_HOURS"
              :precision="0"
              :controls="false"
              :placeholder="t('admin.students.addModal.placeholders.totalHours')"
            />
          </a-form-item>

          <a-form-item name="startDate" data-field-name="合同开始日期">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.startDate') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="formState.startDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :placeholder="t('admin.students.addModal.placeholders.startDate')"
            />
          </a-form-item>

          <a-form-item name="endDate" data-field-name="合同结束日期">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.endDate') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="formState.endDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :placeholder="t('admin.students.addModal.placeholders.endDate')"
            />
          </a-form-item>

          <a-form-item name="contractAttachment" data-field-name="合同附件" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">
                {{ t('admin.students.addModal.fields.contractAttachment') }}
                <span class="add-student-modal__required">*</span>
              </span>
            </template>
            <a-upload-dragger
              :action="uploadAction"
              :headers="uploadHeaders"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg"
              :max-count="1"
              :file-list="fileList"
              :before-upload="beforeContractUpload"
              @change="handleUploadChange"
            >
              <p class="ant-upload-drag-icon">
                <i class="mdi mdi-cloud-upload" style="font-size: 28px; color: #4f74ff"></i>
              </p>
              <p class="ant-upload-text">{{ t('admin.students.addModal.upload.clickOrDrag') }}</p>
              <p class="ant-upload-hint">{{ t('admin.students.addModal.upload.hint') }}</p>
            </a-upload-dragger>
          </a-form-item>

          <a-form-item name="contractRemark" data-field-name="合同备注" class="add-student-modal__field--wide">
            <template #label>
              <span class="add-student-modal__label">{{ t('admin.students.addModal.fields.remark') }}</span>
            </template>
            <a-textarea
              v-model:value="formState.contractRemark"
              :placeholder="t('admin.students.addModal.placeholders.contractRemark')"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>
    </a-form>

    <template #footer>
      <a-button :disabled="submitting" @click="handleClose">
        {{ t('admin.students.addModal.actions.cancel') }}
      </a-button>
      <a-button
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ t('admin.students.addModal.actions.createAccount') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import { i18n } from '@osg/shared'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { MultiSelect } from '@osg/shared/components'
import { getStaffOptions, type StaffOption } from '@osg/shared/api/admin/staff'
import { getAdminDictOptions } from '@/api/adminDict'
import { getToken } from '@osg/shared/utils/storage'
import { splitPhone, joinPhone, MAX_AMOUNT, MAX_AMOUNT_MESSAGE, MAX_CONTRACT_HOURS, MAX_CONTRACT_HOURS_MESSAGE } from '@osg/shared/utils'
import { useDictFacade } from '@osg/shared/composables'

const t = (key: string, named?: Record<string, unknown>) =>
  named
    ? (i18n.global.t as unknown as (k: string, n: Record<string, unknown>) => string)(key, named)
    : (i18n.global.t as unknown as (k: string) => string)(key)

interface AddStudentBasicInfo {
  studentName: string
  gender?: string
  email: string
  phone?: string
  wechat?: string
  school?: string[]
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
  remark?: string
  graduationMonth?: string
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

/** 区号默认 +1（美国/加拿大），用户可在下拉中切换 i18n-skip-line: dev comment */
const phoneCountryCode = ref<string>('+1')
const { items: countryCodeItems, load: loadCountryCode } = useDictFacade('osg_country_code')
const phoneCountryOptions = computed(() => {
  // 区号取自字典 extra.callingCode（dict_value 用作国家 ISO 代码） // i18n-skip-line: dev comment
  const items = countryCodeItems.value
    .map((item) => ({
      value: item.extra?.callingCode || '',
      label: `${item.extra?.callingCode ?? ''} ${item.label}`.trim(),
    }))
    .filter((opt) => opt.value)
  return items.length ? items : [{ value: '+1', label: `+1 ${t('admin.students.addModal.country.usCan')}` }]
})
const filterPhoneCountryOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true
  return option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword)
}
const uploadAction = '/api/admin/contract/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))

const MAX_CONTRACT_UPLOAD_MB = 150
const MAX_CONTRACT_UPLOAD_BYTES = MAX_CONTRACT_UPLOAD_MB * 1024 * 1024

const ALLOWED_CONTRACT_EXTS = /\.(pdf|png|jpe?g)$/i

const clampAmount = (field: 'amountUsd' | 'amountGbp', value: number | string | null) => {
  if (value == null || value === '') return
  const num = typeof value === 'string' ? Number(value) : value
  if (Number.isFinite(num) && num > MAX_AMOUNT) {
    formState[field] = MAX_AMOUNT
    message.warning(MAX_AMOUNT_MESSAGE)
  }
}

const beforeContractUpload = (file: File) => {
  if (!ALLOWED_CONTRACT_EXTS.test(file.name || '')) {
    message.error(t('admin.students.addModal.upload.unsupportedFormat'))
    return false
  }
  if (file.size > MAX_CONTRACT_UPLOAD_BYTES) {
    message.error(t('admin.students.addModal.upload.fileTooLarge', { max: MAX_CONTRACT_UPLOAD_MB, actual: (file.size / 1024 / 1024).toFixed(2) }))
    return false
  }
  return true
}

const extractUploadErrorMessage = (info: UploadChangeParam) => {
  const response = info.file.response as { msg?: string; message?: string; code?: number } | undefined
  if (response?.msg) return response.msg
  if (response?.message) return response.message
  const errorObj = info.file.error as { message?: string; status?: number } | undefined
  if (errorObj?.message) return errorObj.message
  if (errorObj?.status) return `HTTP ${errorObj.status}`
  return t('admin.students.addModal.upload.checkNetwork')
}

const handleUploadChange = (info: UploadChangeParam) => {
  fileList.value = info.fileList.slice(-1)
  if (info.file.status === 'done') {
    const response = info.file.response as { url?: string; fileName?: string; code?: number; msg?: string } | undefined
    if (response && response.code !== undefined && response.code !== 200) {
      formState.contractAttachment = undefined
      message.error(t('admin.students.addModal.upload.failed', { reason: response.msg || t('admin.students.addModal.upload.backendError') }))
      fileList.value = []
      return
    }
    const url = response?.url || (response as { attachmentPath?: string })?.attachmentPath || response?.fileName
    if (url) {
      formState.contractAttachment = url
      message.success(t('admin.students.addModal.upload.success'))
    }
  } else if (info.file.status === 'error') {
    formState.contractAttachment = undefined
    const detail = extractUploadErrorMessage(info)
    console.error('[AddStudentModal] contract upload failed', info.file)
    message.error(t('admin.students.addModal.upload.failed', { reason: detail }))
    fileList.value = []
  }
}

const genderOptions = computed(() => [
  { label: t('admin.students.addModal.gender.male'), value: 'male' },
  { label: t('admin.students.addModal.gender.female'), value: 'female' }
])

const graduationMonthValue = ref<string | null>(null)

watch(graduationMonthValue, (next) => {
  if (!next) {
    formState.graduationYear = undefined
    return
  }
  // value-format="YYYY-MM" 让 v-model 收字符串；兼容偶发 dayjs 对象 // i18n-skip-line: dev comment
  formState.graduationYear = typeof next === 'string'
    ? Number(next.slice(0, 4)) || undefined
    : (next as Dayjs).year()
})

const disabledGraduationMonth = (current?: Dayjs) => {
  if (!current) return false
  const today = dayjs().startOf('month')
  const max = today.add(3, 'year').endOf('month')
  return current.isBefore(today) || current.isAfter(max)
}

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
  school: [],
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
  contractRemark: undefined,
  remark: undefined
})

const rules = computed(() => ({
  studentName: [{ required: true, message: t('admin.students.addModal.validation.englishName'), trigger: 'blur' }],
  gender: [{ required: true, message: t('admin.students.addModal.validation.gender'), trigger: 'change' }],
  email: [
    { required: true, message: t('admin.students.addModal.validation.email'), trigger: 'blur' },
    { type: 'email' as const, message: t('admin.students.addModal.validation.emailFormat'), trigger: 'blur' }
  ],
  targetRegion: [{ required: true, type: 'array' as const, min: 1, message: t('admin.students.addModal.validation.targetRegion'), trigger: 'change' }],
  recruitmentCycle: [{ required: true, type: 'array' as const, min: 1, message: t('admin.students.addModal.validation.recruitmentCycle'), trigger: 'change' }],
  currency: [{ required: true, message: t('admin.students.addModal.validation.currency'), trigger: 'change' }],
  amountUsd: [
    { required: true, message: t('admin.students.addModal.validation.amountUsd'), trigger: 'change' },
    { type: 'number' as const, max: MAX_AMOUNT, message: MAX_AMOUNT_MESSAGE, trigger: 'change' }
  ],
  amountGbp: [
    { required: true, message: t('admin.students.addModal.validation.amountGbp'), trigger: 'change' },
    { type: 'number' as const, max: MAX_AMOUNT, message: MAX_AMOUNT_MESSAGE, trigger: 'change' }
  ],
  totalHours: [
    { required: true, message: t('admin.students.addModal.validation.totalHours'), trigger: 'change' },
    { type: 'number' as const, max: MAX_CONTRACT_HOURS, message: MAX_CONTRACT_HOURS_MESSAGE, trigger: 'change' }
  ],
  startDate: [{ required: true, message: t('admin.students.addModal.validation.startDate'), trigger: 'change' }],
  endDate: [{ required: true, message: t('admin.students.addModal.validation.endDate'), trigger: 'change' }],
  phone: [{ required: true, message: t('admin.students.addModal.validation.phone'), trigger: 'blur' }]
}))

const resetForm = () => {
  formState.studentName = props.initialValue?.studentName ?? ''
  formState.gender = props.initialValue?.gender
  formState.email = props.initialValue?.email ?? ''
  if (props.initialValue?.phone) {
    const parsed = splitPhone(props.initialValue.phone)
    phoneCountryCode.value = parsed.countryCode
    formState.phone = parsed.number || undefined
  } else {
    phoneCountryCode.value = '+1'
    formState.phone = undefined
  }
  formState.wechat = props.initialValue?.wechat
  formState.school = props.initialValue?.school ?? []
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
  formState.remark = props.initialValue?.remark
  graduationMonthValue.value = props.initialValue?.graduationYear
    ? `${props.initialValue.graduationYear}-06`
    : null
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
      void loadCountryCode()
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
  phone: joinPhone(phoneCountryCode.value, formState.phone),
  wechat: formState.wechat,
  school: formState.school?.length ? [...formState.school] : undefined,
  major: formState.major?.trim(),
  highSchool: formState.highSchool,
  graduationYear: formState.graduationYear,
  graduationMonth: graduationMonthValue.value || undefined,
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
  contractRemark: formState.contractRemark,
  remark: formState.remark?.trim() || undefined
})

const handleSubmit = async () => {
  const amountFields: string[] = ['currency', 'amountUsd']
  if (formState.currency === 'GBP') amountFields.push('amountGbp')

  const formFields = ['studentName', 'gender', 'email', 'phone', 'targetRegion', 'recruitmentCycle', ...amountFields, 'totalHours', 'startDate', 'endDate']

  // 收集所有校验失败项，避免 first-fail 短路导致下方字段静默 // i18n-skip-line: dev comment
  const missingItems: string[] = []

  // 1) a-form 内置校验：catch 失败字段，列入 missing // i18n-skip-line: dev comment
  try {
    await formRef.value?.validate(formFields)
  } catch (err: any) {
    const failedFields = Array.isArray(err?.errorFields) ? err.errorFields : []
    failedFields.forEach((field: any) => {
      const label = Array.isArray(field?.name) && field.name.length ? String(field.name[0]) : ''
      if (label) {
        missingItems.push(formFieldLabel(label))
      }
    })
  }

  // 2) 非 a-form 字段：手写校验，collect 模式而非 first-fail return // i18n-skip-line: dev comment
  if (!formState.majorDirections.length) missingItems.push(t('admin.students.addModal.fields.majorDirections'))
  if (!formState.subDirections.length) missingItems.push(t('admin.students.addModal.fields.subDirections'))
  if (!formState.contractAttachment) missingItems.push(t('admin.students.addModal.fields.contractAttachment'))

  if (missingItems.length === 0) {
    emit('submit', createPayload())
    return
  }

  // 单项 → 具体提示；多项 → 汇总 toast // i18n-skip-line: dev comment
  if (missingItems.length === 1) {
    message.error(t('admin.students.addModal.validation.pleaseFill', { field: missingItems[0] }))
  } else {
    message.error(t('admin.students.addModal.validation.missingFields', { count: missingItems.length, fields: missingItems.join('、') }))
  }
}

/** 把字段技术名映射成用户可读 label，用于汇总 toast 文案 i18n-skip-line: dev comment */
function formFieldLabel(name: string): string {
  const map: Record<string, string> = {
    studentName: t('admin.students.addModal.fields.englishName'),
    gender: t('admin.students.addModal.fields.gender'),
    email: t('admin.students.addModal.fields.email'),
    phone: t('admin.students.addModal.fields.phone'),
    targetRegion: t('admin.students.addModal.fields.targetRegion'),
    recruitmentCycle: t('admin.students.addModal.fields.recruitmentCycle'),
    currency: t('admin.students.addModal.fields.currency'),
    amountUsd: t('admin.students.addModal.fields.amountUsd'),
    amountGbp: t('admin.students.addModal.fields.amountGbp'),
    totalHours: t('admin.students.addModal.fields.totalHours'),
    startDate: t('admin.students.addModal.fields.startDate'),
    endDate: t('admin.students.addModal.fields.endDate'),
  }
  return map[name] || name
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

/* ── 手机号：区号 + 号码 分离布局（与 StaffFormModal 保持一致） ── i18n-skip-line: dev comment */
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

<!-- 控件高度由 shared/styles/index.scss 的 .osg-modal-form 公共规则统一管控（5 端通用 36px） i18n-skip-line: dev comment -->
