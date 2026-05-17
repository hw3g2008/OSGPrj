<template>
  <div id="page-profile" class="profile-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.profile.k1') }} <span>My Profile</span></h1>
          </div>
          <a-button type="primary" size="large" @click="openEdit">{{ t('student.profile.k2') }}</a-button>
        </div>
      </template>

      <a-card class="profile-card" :bordered="false">
        <div class="profile-head">
          <a-avatar :size="84" :style="{ backgroundColor: 'var(--primary)', fontSize: '28px', fontWeight: 800 }">{{ avatarInitials }}</a-avatar>
          <div class="profile-head__text">
            <h3>{{ profile.fullName }}</h3>
            <a-space :size="8" wrap>
              <span>Student ID: {{ profile.studentCode }}</span>
              <a-tag color="success">{{ displayStatus(profile.statusLabel) }}</a-tag>
            </a-space>
          </div>
        </div>

        <a-card :title="t('student.profile.k5')" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :colon="false">
            <a-descriptions-item :label="t('student.profile.k6')">{{ profile.englishName }}</a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k7')">{{ displaySex(profile.sexLabel) }}</a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k8')">{{ profile.email }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card :title="t('student.profile.k9')" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item :label="t('student.profile.k10')">
              <template v-if="profile.leadMentorNames?.length">
                <a-tag v-for="name in profile.leadMentorNames" :key="name" color="blue">{{ name }}</a-tag>
              </template>
              <template v-else>{{ profile.leadMentor }}</template>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k11')">
              <template v-if="profile.assistantNames?.length">
                <a-tag v-for="name in profile.assistantNames" :key="name" color="cyan">{{ name }}</a-tag>
              </template>
              <template v-else>{{ profile.assistantName }}</template>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card :title="t('student.profile.k12')" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :colon="false">
            <a-descriptions-item :label="t('student.profile.k13')">
              <span class="field-value">{{ profile.school }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k14')">
              <span class="field-value">{{ profile.major }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k15')">
              <span class="field-value">{{ profile.graduationYear }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k16')">
              <span class="field-value">{{ profile.highSchool }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k17')">
              <span class="field-value">{{ displayPostgrad(profile.postgraduatePlan) }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k18')">
              <span class="field-value">{{ profile.visaStatus }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card :title="t('student.profile.k19')" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item :label="t('student.profile.k20')">
              <span class="field-value">{{ displayDictCsv(profile.targetRegion, regionOptions) }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k21')">
              <span class="field-value">{{ displayDictCsv(profile.recruitmentCycle, recruitCycleOptions) }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k22')">
              <span class="field-value">{{ displayDictCsv(profile.primaryDirection, majorDirectionOptions) }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k23')">
              <span class="field-value">{{ displayDictCsv(profile.secondaryDirection, subDirectionOptions) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card :title="t('student.profile.k24')" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item :label="t('student.profile.k25')">{{ profile.phone }}</a-descriptions-item>
            <a-descriptions-item :label="t('student.profile.k26')">{{ profile.wechatId }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-card>
    </OsgPageContainer>

    <OverlaySurfaceModal
      :open="editOpen"
      surface-id="profile-edit"
      :title="t('student.profile.k27')"
      :width="720"
      :body-class="'profile-edit-modal__body osg-modal-form'"
      @cancel="editOpen = false"
    >
      <a-form layout="vertical" :colon="false" class="profile-edit-form">
        <section class="profile-edit-section">
          <header class="profile-edit-section__header">
            <span class="profile-edit-section__title">{{ t('student.profile.k12') }}</span>
          </header>
          <div class="form-grid">
            <a-form-item :label="t('student.profile.k13')" class="form-item">
              <a-select
                v-model:value="editForm.school"
                show-search
                mode="combobox"
                :options="translatedSchoolOptions"
                :placeholder="t('student.profile.k28')"
              />
            </a-form-item>
            <a-form-item :label="t('student.profile.k14')" class="form-item"><a-input v-model:value="editForm.major" /></a-form-item>
            <a-form-item :label="t('student.profile.k15')" class="form-item"><a-input v-model:value="editForm.graduationYear" /></a-form-item>
            <a-form-item :label="t('student.profile.k16')" class="form-item"><a-input v-model:value="editForm.highSchool" :placeholder="t('student.profile.k29')" /></a-form-item>
            <a-form-item :label="t('student.profile.k17')" class="form-item"><a-select v-model:value="editForm.postgraduatePlan" :options="yesNoOptions" /></a-form-item>
            <a-form-item :label="t('student.profile.k18')" class="form-item"><a-input v-model:value="editForm.visaStatus" /></a-form-item>
          </div>
        </section>

        <section class="profile-edit-section">
          <header class="profile-edit-section__header">
            <span class="profile-edit-section__title">{{ t('student.profile.k19') }}</span>
          </header>
          <div class="form-grid">
            <a-form-item :label="t('student.profile.k21')" class="form-item">
              <MultiSelect
                v-model:value="recruitmentCycles"
                :options="translatedRecruitCycleOptions"
                :placeholder="t('student.profile.k30')"
              />
            </a-form-item>
            <a-form-item :label="t('student.profile.k20')" class="form-item">
              <MultiSelect
                v-model:value="targetRegions"
                :options="translatedRegionOptions"
                :placeholder="t('student.profile.k31')"
              />
            </a-form-item>
            <a-form-item :label="t('student.profile.k22')" class="form-item">
              <MultiSelect
                v-model:value="primaryDirections"
                :options="translatedMajorDirectionOptions"
                :placeholder="t('student.profile.k32')"
              />
            </a-form-item>
            <a-form-item :label="t('student.profile.k23')" class="form-item">
              <a-select
                v-model:value="editForm.secondaryDirection"
                show-search
                mode="combobox"
                :options="translatedSubDirectionOptions"
                :placeholder="t('student.profile.k33')"
              />
            </a-form-item>
          </div>
        </section>

        <section class="profile-edit-section">
          <header class="profile-edit-section__header">
            <span class="profile-edit-section__title">{{ t('student.profile.k24') }}</span>
          </header>
          <div class="form-grid">
            <a-form-item :label="t('student.profile.k25')" class="form-item"><a-input v-model:value="editForm.phone" /></a-form-item>
            <a-form-item :label="t('student.profile.k26')" class="form-item"><a-input v-model:value="editForm.wechatId" /></a-form-item>
          </div>
        </section>
      </a-form>

      <template #footer>
        <a-button @click="editOpen = false">{{ t('student.profile.k3') }}</a-button>
        <a-button type="primary" @click="saveProfile">{{ t('student.profile.k4') }}</a-button>
      </template>
    </OverlaySurfaceModal>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message, Modal } from 'ant-design-vue'
import { OsgPageContainer, MultiSelect, OverlaySurfaceModal } from '@osg/shared/components'
import { useDictFacade, useI18nDict } from '@osg/shared'
import {
  getStudentProfile,
  updateStudentProfile,
  type StudentProfileRecord,
  type StudentProfileUpdatePayload,
  type StudentPendingProfileChange
} from '@osg/shared/api'

const { t, te } = useI18n()

// 字典单源：本表单中与 Admin osg_* 字典语义对齐的字段统一走 useDictFacade，免重复维护
const { items: schoolOptions, load: loadSchools } = useDictFacade('osg_school')
const { items: recruitCycleOptions, load: loadRecruitCycles } = useDictFacade('osg_recruit_cycle')
const { items: regionOptions, load: loadRegions } = useDictFacade('osg_region')
const { items: majorDirectionOptions, load: loadMajorDirections } = useDictFacade('osg_major_direction')
const { items: subDirectionOptions, load: loadSubDirections } = useDictFacade('osg_sub_direction')

const { tByI18nKey } = useI18nDict('admin.dict')

function translateDictOptions(options: Ref<{ value: string; label: string; i18nKey?: string }[]>) {
  return computed(() => options.value.map(o => ({
    ...o,
    label: o.i18nKey ? tByI18nKey(o.i18nKey, o.label) : o.label
  })))
}

const translatedSchoolOptions = translateDictOptions(schoolOptions)
const translatedRecruitCycleOptions = translateDictOptions(recruitCycleOptions)
const translatedRegionOptions = translateDictOptions(regionOptions)
const translatedMajorDirectionOptions = translateDictOptions(majorDirectionOptions)
const translatedSubDirectionOptions = translateDictOptions(subDirectionOptions)

const yesNoOptions = computed(() => ([
  { value: t('student.profile.k34'), label: t('student.profile.k34') },
  { value: t('student.profile.k35'), label: t('student.profile.k35') }
]))

// 性别/状态/读研计划等历史中文值 → 显示态映射
const SEX_MAP: Record<string, string> = { '男': 'Male', '女': 'Female', '未知': 'Unknown' }
const POSTGRAD_MAP: Record<string, string> = { '是': 'k34', '否': 'k35', 'Yes': 'k34', 'No': 'k35' }

function displaySex(raw: string | undefined | null): string {
  if (!raw || raw === '-') return raw || '-'
  return SEX_MAP[raw] ?? raw
}

function displayPostgrad(raw: string | undefined | null): string {
  if (!raw || raw === '-') return raw || '-'
  const key = POSTGRAD_MAP[raw]
  return key ? t(`student.profile.${key}`) : raw
}

function displayStatus(raw: string | undefined | null): string {
  if (!raw || raw === '-') return t('student.profile.k36')
  // 后端硬编码 "正常"，无论 raw 都展示本地化 Normal/正常
  if (raw === '正常' || raw === t('student.profile.k36')) return t('student.profile.k36')
  return raw
}

// 单值字典 code → 翻译显示（先匹配 dict.value，找不到回退）
function translateDictValue(value: string, dict: { value: string; label: string; i18nKey?: string }[]): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const opt = dict.find(o => o.value === trimmed || o.label === trimmed)
  if (!opt) return trimmed
  if (opt.i18nKey) {
    const key = `admin.dict.${opt.i18nKey}`
    if (te(key)) return t(key) as string
  }
  return opt.label || trimmed
}

// CSV 字典字段 → 多 value 翻译后 join
function displayDictCsv(csv: string | undefined | null, dict: { value: string; label: string; i18nKey?: string }[]): string {
  if (!csv || csv === '-') return '-'
  const parts = csv.split(',').map(p => translateDictValue(p, dict)).filter(Boolean)
  return parts.length ? parts.join(', ') : '-'
}

const editOpen = ref(false)
const profile = reactive<StudentProfileRecord>({
  studentCode: '-',
  fullName: '-',
  englishName: '-',
  email: '-',
  sexLabel: '-',
  statusLabel: t('student.profile.k36'),
  leadMentor: '-',
  leadMentorNames: [],
  assistantName: '-',
  assistantNames: [],
  school: '-',
  major: '-',
  graduationYear: '-',
  highSchool: '-',
  postgraduatePlan: t('student.profile.k35'),
  visaStatus: '-',
  targetRegion: '-',
  recruitmentCycle: '-',
  primaryDirection: '-',
  secondaryDirection: '-',
  phone: '-',
  wechatId: '-'
})
const pendingChanges = ref<StudentPendingProfileChange[]>([])

const splitCsv = (value: string | undefined | null): string[] => {
  if (!value || value === '-') return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

const recruitmentCycles = ref<string[]>([])
const targetRegions = ref<string[]>([])
const primaryDirections = ref<string[]>([])

const editForm = reactive<StudentProfileUpdatePayload>({
  school: '-',
  major: '-',
  graduationYear: '-',
  highSchool: '-',
  postgraduatePlan: t('student.profile.k35'),
  visaStatus: '-',
  recruitmentCycle: '-',
  targetRegion: '-',
  primaryDirection: '-',
  secondaryDirection: '-',
  phone: '-',
  wechatId: '-'
})

const avatarInitials = computed(() => {
  const initials = profile.fullName
    .split(/\s+/)
    .map(segment => segment.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials || 'ST'
})

function syncEditForm() {
  editForm.school = profile.school
  editForm.major = profile.major
  editForm.graduationYear = profile.graduationYear
  editForm.highSchool = profile.highSchool
  // 把历史中文/英文值标准化到当前 locale 显示态，避免 select 找不到匹配项
  editForm.postgraduatePlan = displayPostgrad(profile.postgraduatePlan)
  editForm.visaStatus = profile.visaStatus
  editForm.recruitmentCycle = profile.recruitmentCycle
  editForm.targetRegion = profile.targetRegion
  editForm.primaryDirection = profile.primaryDirection
  editForm.secondaryDirection = profile.secondaryDirection
  editForm.phone = profile.phone
  editForm.wechatId = profile.wechatId
  recruitmentCycles.value = splitCsv(profile.recruitmentCycle)
  targetRegions.value = splitCsv(profile.targetRegion)
  primaryDirections.value = splitCsv(profile.primaryDirection)
}

function applyProfileView(payload: { profile: StudentProfileRecord; pendingChanges: StudentPendingProfileChange[] }) {
  Object.assign(profile, payload.profile)
  pendingChanges.value = payload.pendingChanges
}

function openEdit() {
  syncEditForm()
  editOpen.value = true
  // 按需拉取字典（useDictFacade 内部已去重）；任一字典加载失败都不会阻断弹窗打开
  void Promise.all([
    loadSchools().catch(() => undefined),
    loadRecruitCycles().catch(() => undefined),
    loadRegions().catch(() => undefined),
    loadMajorDirections().catch(() => undefined),
    loadSubDirections().catch(() => undefined)
  ])
}

async function loadProfile() {
  const payload = await getStudentProfile()
  applyProfileView(payload)
  syncEditForm()
}

async function saveProfile() {
  Modal.confirm({
    title: t('student.profile.k37'),
    okText: t('student.profile.k38'),
    cancelText: t('student.profile.k3'),
    okType: 'primary',
    async onOk() {
      try {
        const payload = await updateStudentProfile({
          ...editForm,
          recruitmentCycle: recruitmentCycles.value.join(','),
          targetRegion: targetRegions.value.join(','),
          primaryDirection: primaryDirections.value.join(',')
        })
        applyProfileView(payload)
        editOpen.value = false
        message.success(t('student.profile.k39'))
      } catch {
        // error handled
      }
    }
  })
}

onMounted(() => {
  void loadProfile().catch(() => undefined)
  // 显示需要 region/cycle/majorDirection/subDirection 字典，预加载用于 displayDictCsv
  void Promise.all([
    loadRecruitCycles().catch(() => undefined),
    loadRegions().catch(() => undefined),
    loadMajorDirections().catch(() => undefined),
    loadSubDirections().catch(() => undefined)
  ])
})
</script>

<style scoped lang="scss">
.profile-page :deep(.osg-page-container__content) {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.field-value {
  display: inline-block;
  vertical-align: middle;
}

.field-pending-tag {
  margin-left: 8px;
  vertical-align: middle;
  font-size: 11px;
  line-height: 1.6;
}

.pending-banner {
  margin-bottom: 20px;
}

.profile-card {
  border-radius: 20px;
  background: #fff;
}

.profile-head {
  display: flex;
  gap: 18px;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
}

.profile-head__text {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 22px;
  }
}

.info-block {
  margin-bottom: 16px;
}

.modal-tip {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #e8f0f8;
  color: #5a7ba3;
  padding: 14px 16px;
}

.modal-tip--warning {
  background: #e8f0f8;
  color: #5a7ba3;
}

.profile-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-edit-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-edit-section__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
}

.profile-edit-section__header::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--primary, #4096ff);
}

.profile-edit-section__title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.form-item {
  margin-bottom: 0;
}

.profile-edit-form :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.profile-edit-form :deep(.ant-form-item-label > label) {
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  height: auto;
}

.pending-list {
  display: grid;
  gap: 14px;
}

.pending-item {
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pending-item--empty {
  text-align: center;
}

.pending-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  strong {
    color: #0f172a;
    font-size: 15px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.pending-head__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pending-diff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.pending-diff__card {
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 14px;
  display: grid;
  gap: 8px;

  span {
    color: #64748b;
    font-size: 12px;
  }

  strong {
    color: #334155;
    line-height: 1.6;
  }
}

.pending-diff__card--next {
  border-color: #bfd1e3;
  background: #e8f0f8;
}

.pending-diff__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7399c6;
  font-size: 20px;
}

.pending-body {
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .page-header,
  .profile-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid,
  .pending-diff {
    grid-template-columns: 1fr;
  }
}
</style>
