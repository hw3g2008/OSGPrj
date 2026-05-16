<template>
  <OverlaySurfaceModal
    :open="visible"
    width="960px"
    :surface-id="surfaceId"
    body-class="staff-form-modal__body osg-modal-form"
    @cancel="handleClose"
  >
    <template #title>
      <div class="staff-form-modal__header">
        <div v-if="isEditing" class="staff-form-modal__avatar">{{ avatarText }}</div>
        <span class="staff-form-modal__title-text">
          <span v-if="!isEditing" class="mdi mdi-account-plus" aria-hidden="true" style="margin-right:8px"></span>
          {{ isEditing ? t('admin.users.staff.form.titleEdit', { name: staff?.staffName || '', id: staff?.staffId ?? '-' }) : t('admin.users.staff.form.titleAdd') }}
        </span>
      </div>
    </template>

    <div class="staff-form-modal__grid">
    <!-- Section 1 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--primary">{{ t('admin.users.staff.form.sections.core') }}</div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.staffName')">
              <a-input
                ref="staffNameInputRef"
                v-model:value="form.staffName"
                :placeholder="t('admin.users.staff.form.placeholders.staffName')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.email')">
              <a-input v-model:value="form.email" :placeholder="t('admin.users.staff.form.placeholders.email')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.staffType')">
              <a-select v-model:value="form.staffType" :placeholder="t('admin.users.staff.form.placeholders.typeSelect')">
                <a-select-option value="mentor">{{ t('admin.users.staff.staffTypes.mentor') }}</a-select-option>
                <a-select-option value="lead_mentor">{{ t('admin.users.staff.staffTypes.lead_mentor') }}</a-select-option>
                <a-select-option value="assistant">{{ t('admin.users.staff.staffTypes.assistant') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.gender')">
              <a-select v-model:value="form.gender" :placeholder="t('admin.users.staff.form.placeholders.typeSelect')">
                <a-select-option value="0">{{ t('admin.users.staff.form.genders.male') }}</a-select-option>
                <a-select-option value="1">{{ t('admin.users.staff.form.genders.female') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 2 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--green">
        <span class="mdi mdi-phone" aria-hidden="true" /> {{ t('admin.users.staff.form.sections.contact') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.phone')">
              <div class="phone-input-group">
                <a-select
                  v-model:value="form.phoneCountryCode"
                  :options="phoneCountryOptions"
                  class="phone-input-group__code"
                  :show-search="true"
                  :filter-option="filterPhoneCountryOption"
                />
                <a-input
                  v-model:value="form.phone"
                  class="phone-input-group__number"
                  :placeholder="t('admin.users.staff.form.placeholders.phone')"
                />
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.wechat')">
              <a-input v-model:value="form.wechatId" :placeholder="t('admin.users.staff.form.placeholders.wechat')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.region')">
              <MultiSelect
                v-model:value="form.regions"
                :options="regionItems"
                :placeholder="t('admin.users.staff.form.placeholders.multiSelect')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.city')">
              <a-select
                v-model:value="form.city"
                :options="filteredCityOptions"
                :field-names="{ label: 'label', value: 'value' }"
                :placeholder="form.regions.length ? t('admin.users.staff.form.placeholders.cityReady') : t('admin.users.staff.form.placeholders.cityWait')"
                :disabled="!form.regions.length"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 3 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--amber">
        <span class="mdi mdi-target" aria-hidden="true" /> {{ t('admin.users.staff.form.sections.specialty') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.majorDirection')">
              <MultiSelect
                v-model:value="form.majorDirections"
                :options="majorItems"
                :placeholder="t('admin.users.staff.form.placeholders.multiSelect')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.subDirection')">
              <MultiSelect
                v-model:value="form.subDirections"
                :options="filteredSubOptions"
                :placeholder="form.majorDirections.length ? t('admin.users.staff.form.placeholders.multiSelect') : t('admin.users.staff.form.placeholders.subDirectionWait')"
                :disabled="!form.majorDirections.length"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.courseType')">
              <MultiSelect
                v-model:value="form.courseTypes"
                :options="courseItems"
                :placeholder="t('admin.users.staff.form.placeholders.multiSelect')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.specialty')">
              <MultiSelect
                v-model:value="form.specialties"
                :options="specialtyItems"
                :placeholder="t('admin.users.staff.form.placeholders.multiSelect')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.hourlyRate')">
              <a-input-number v-model:value="form.hourlyRate" :min="0" :max="MAX_AMOUNT" :placeholder="t('admin.users.staff.form.placeholders.hourlyRate')" style="width:100%">
                <template #prefix>$</template>
              </a-input-number>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 4 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--purple">
        <span class="mdi mdi-briefcase" aria-hidden="true" /> {{ t('admin.users.staff.form.sections.career') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="24">
            <a-form-item :label="t('admin.users.staff.form.fields.companies')">
              <MultiSelect
                v-model:value="form.companies"
                :options="allCompanyOptions"
                :placeholder="t('admin.users.staff.form.placeholders.companies')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section v-if="isSuperAdmin" class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--orange">
        <span class="mdi mdi-star" aria-hidden="true" /> {{ t('admin.users.staff.form.sections.internal') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.rating')">
              <a-select
                v-model:value="form.rating"
                :options="ratingItems"
                :field-names="{ label: 'label', value: 'value' }"
                :placeholder="t('admin.users.staff.form.placeholders.rating')"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item :label="t('admin.users.staff.form.fields.ratingRemark')">
              <a-textarea
                v-model:value="form.ratingRemark"
                :rows="3"
                :maxlength="500"
                show-count
                :placeholder="t('admin.users.staff.form.placeholders.ratingRemark')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--blue">
        <span class="mdi mdi-shield-account" aria-hidden="true" /> {{ t('admin.users.staff.form.sections.account') }}
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.loginAccount')">
              <a-input
                v-model:value="form.loginAccount"
                :disabled="isEditing"
                :placeholder="t('admin.users.staff.form.placeholders.loginAccount')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('admin.users.staff.form.fields.initialPassword')">
              <a-input
                v-model:value="form.initialPassword"
                :disabled="isEditing"
                :placeholder="t('admin.users.staff.form.placeholders.initialPassword')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.users.staff.form.footer.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditing ? t('admin.users.staff.form.footer.save') : t('admin.users.staff.form.footer.add') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { MultiSelect } from '@osg/shared/components'
import type { StaffListItem, StaffPayload } from '@osg/shared/api/admin/staff'
import {
  splitPhone,
  joinPhone,
  MAX_AMOUNT,
  MAX_AMOUNT_MESSAGE,
} from '@osg/shared/utils'
import { useDictFacade } from '@osg/shared/composables'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.permissions.includes('*:*:*'))

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: courseItems, load: loadCourse } = useDictFacade('osg_course_type')
const { items: countryCodeItems, load: loadCountryCode } = useDictFacade('osg_country_code')
const { items: specialtyItems, load: loadSpecialty } = useDictFacade('osg_specialty')
const { items: ratingItems, load: loadRating } = useDictFacade('osg_rating')
const { items: companyItems, load: loadCompany } = useDictFacade('osg_company_name')

const loadAllDicts = () => {
  void loadRegion()
  void loadCity()
  void loadMajor()
  void loadSub()
  void loadCourse()
  void loadCountryCode()
  void loadSpecialty()
  void loadRating()
  void loadCompany()
}

const splitCsv = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (typeof val === 'string' && val.trim()) return val.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

const props = defineProps<{
  visible: boolean
  staff?: StaffListItem | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: StaffPayload]
}>()

const DEFAULT_INITIAL_PASSWORD = 'Osg@2026'

const phoneCountryOptions = computed(() => {
  const items = countryCodeItems.value
    .map((item) => ({
      value: item.extra?.callingCode || '',
      label: `${item.extra?.callingCode ?? ''} ${item.label}`.trim(),
    }))
    .filter((opt) => opt.value)
  return items.length ? items : [{ value: '+1', label: t('admin.users.staff.form.defaultCountryCode') }]
})

const filterPhoneCountryOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true
  return option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword)
}

const staffNameInputRef = ref<{ focus?: () => void } | null>(null)

const form = reactive({
  staffName: '',
  email: '',
  phone: '',
  phoneCountryCode: '+1',
  staffType: undefined as string | undefined,
  gender: undefined as string | undefined,
  wechatId: '',
  majorDirections: [] as string[],
  subDirections: [] as string[],
  regions: [] as string[],
  city: undefined as string | undefined,
  courseTypes: [] as string[],
  specialties: [] as string[],
  companies: [] as string[],
  rating: undefined as string | undefined,
  ratingRemark: '',
  loginAccount: '',
  initialPassword: '',
  hourlyRate: '' as string | number
})

const isEditing = computed(() => Boolean(props.staff?.staffId))
const surfaceId = computed(() => (isEditing.value ? 'modal-edit-staff' : 'modal-add-staff'))

const filteredCityOptions = computed(() => {
  if (!form.regions.length) return []
  return cityItems.value.filter((c) => c.parentValue && form.regions.includes(c.parentValue))
})

const filteredSubOptions = computed(() => {
  if (!form.majorDirections.length) return []
  return subItems.value.filter((s) => s.parentValue && form.majorDirections.includes(s.parentValue))
})

const allCompanyOptions = computed(() => companyItems.value)

const avatarText = computed(() => {
  const name = props.staff?.staffName?.trim()
  if (!name) return 'ST'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
})

const syncAccountDefaults = () => {
  if (isEditing.value) return
  form.loginAccount = form.email.trim()
  form.initialPassword = DEFAULT_INITIAL_PASSWORD
}

const resetForm = () => {
  form.staffName = props.staff?.staffName || ''
  form.email = props.staff?.email || ''
  const parsedPhone = splitPhone(props.staff?.phone)
  form.phoneCountryCode = isEditing.value ? parsedPhone.countryCode : '+1'
  form.phone = parsedPhone.number
  form.staffType = props.staff?.staffType || undefined
  form.gender = props.staff?.gender || undefined
  form.wechatId = props.staff?.wechatId || ''
  form.majorDirections = splitCsv(props.staff?.majorDirection)
  form.subDirections = splitCsv(props.staff?.subDirection)
  form.regions = splitCsv(props.staff?.region)
  form.city = props.staff?.city || undefined
  form.courseTypes = splitCsv(props.staff?.courseTypes)
  form.specialties = splitCsv(props.staff?.specialty)
  form.companies = splitCsv(props.staff?.companies)
  form.rating = props.staff?.rating || undefined
  form.ratingRemark = props.staff?.ratingRemark || ''
  if (isEditing.value) {
    form.loginAccount = props.staff?.email || ''
    form.initialPassword = '********'
  } else {
    form.loginAccount = ''
    form.initialPassword = ''
  }
  form.hourlyRate = props.staff?.hourlyRate == null ? '' : String(props.staff.hourlyRate)
  syncAccountDefaults()
}

watch(
  () => [props.visible, props.staff] as const,
  ([visible]) => {
    if (visible) {
      resetForm()
      loadAllDicts()
      nextTick(() => {
        staffNameInputRef.value?.focus?.()
      })
    }
  },
  { immediate: true }
)

watch(
  () => form.majorDirections,
  (newDirs) => {
    const validParents = new Set(newDirs)
    form.subDirections = form.subDirections.filter((sub) => {
      const item = subItems.value.find((i) => i.value === sub)
      if (!item) return true
      return item.parentValue ? validParents.has(item.parentValue) : true
    })
  }
)

watch(
  () => form.regions,
  (next, prev) => {
    if (!prev || !prev.length) return
    if (!form.city) return
    const cityItem = cityItems.value.find((c) => c.value === form.city)
    if (cityItem?.parentValue && !next.includes(cityItem.parentValue)) {
      form.city = undefined
    }
  },
  { deep: true }
)

watch(
  () => form.email,
  () => {
    syncAccountDefaults()
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  const hourlyRateText = String(form.hourlyRate ?? '').trim()
  if (!form.staffName.trim()) {
    message.error(t('admin.users.staff.form.validation.staffName'))
    return
  }
  if (!form.email.trim()) {
    message.error(t('admin.users.staff.form.validation.email'))
    return
  }
  if (!form.staffType) {
    message.error(t('admin.users.staff.form.validation.staffType'))
    return
  }
  if (!form.majorDirections.length) {
    message.error(t('admin.users.staff.form.validation.majorDirection'))
    return
  }
  if (!form.regions.length) {
    message.error(t('admin.users.staff.form.validation.region'))
    return
  }
  if (!hourlyRateText) {
    message.error(t('admin.users.staff.form.validation.hourlyRate'))
    return
  }
  if (Number(hourlyRateText) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if (form.specialties.length > 20) {
    message.error(t('admin.users.staff.form.validation.specialtyMax'))
    return
  }
  if (form.companies.length > 10) {
    message.error(t('admin.users.staff.form.validation.companiesMax'))
    return
  }

  emit('submit', {
    staffId: props.staff?.staffId,
    staffName: form.staffName.trim(),
    email: form.email.trim(),
    phone: joinPhone(form.phoneCountryCode, form.phone),
    gender: form.gender || undefined,
    staffType: form.staffType as string,
    wechatId: form.wechatId.trim() || undefined,
    majorDirection: form.majorDirections.join(','),
    subDirection: form.subDirections.length ? form.subDirections.join(',') : undefined,
    region: form.regions.join(','),
    city: form.city || undefined,
    courseTypes: form.courseTypes.length ? form.courseTypes.join(',') : undefined,
    specialty: form.specialties.length ? form.specialties.join(',') : undefined,
    companies: form.companies.length ? form.companies.join(',') : undefined,
    rating: form.rating,
    ratingRemark: form.ratingRemark.trim() || undefined,
    loginAccount: isEditing.value ? undefined : form.loginAccount.trim() || undefined,
    initialPassword: isEditing.value ? undefined : form.initialPassword.trim() || undefined,
    hourlyRate: Number(hourlyRateText)
  })
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="modal-add-staff"] [data-surface-part="header"]),
:global([data-surface-id="modal-edit-staff"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="modal-add-staff"] .overlay-surface-modal__close),
:global([data-surface-id="modal-edit-staff"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.staff-form-modal__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.staff-form-modal__avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.staff-form-modal__title-text {
  display: inline-flex;
  align-items: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.staff-form-modal__grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.staff-form-modal__section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 22px 24px 4px;
}

.staff-form-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 18px;
}

.staff-form-modal__badge--primary {
  background: var(--primary, #6366F1);
  color: #fff;
}

.staff-form-modal__badge--green {
  background: #DCFCE7;
  color: #166534;
}

.staff-form-modal__badge--amber {
  background: #FEF3C7;
  color: #92400E;
}

.staff-form-modal__badge--blue {
  background: #DBEAFE;
  color: #1E40AF;
}

.staff-form-modal__badge--purple {
  background: #F3E8FF;
  color: #6B21A8;
}

.staff-form-modal__badge--orange {
  background: #FFEDD5;
  color: #9A3412;
}

:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-form-item),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-form-item) {
  margin-bottom: 20px !important;
}

:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-form-item-label),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-form-item-label) {
  padding-bottom: 8px !important;
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
