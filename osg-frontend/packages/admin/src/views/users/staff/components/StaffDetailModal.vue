<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="960px"
    body-class="staff-detail-modal__body osg-modal-form"
    @cancel="handleClose"
  >
    <template #title>
      <div class="sfdm-header">
        <div class="sfdm-header__avatar">{{ avatarText }}</div>
        <div class="sfdm-header__info">
          <span class="sfdm-header__name">{{ detail?.staffName || staffName || t('admin.users.staff.detail.defaultTitle') }}</span>
          <div class="sfdm-header__meta">
            ID: {{ detail?.staffId ?? '-' }} · {{ formatType(detail?.staffType) }}
            · <span class="sfdm-header__status-pill">{{ formatStatus(detail?.accountStatus) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="staff-detail-modal__state">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>{{ t('admin.users.staff.detail.loading') }}</span>
    </div>

    <div v-else-if="loadError" class="staff-detail-modal__state staff-detail-modal__state--error">
      <strong>{{ t('admin.users.staff.detail.loadError') }}</strong>
      <p>{{ loadError }}</p>
    </div>

    <template v-else>
      <div class="staff-detail-modal__tabs">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          type="button"
          :class="['staff-detail-modal__tab', { 'staff-detail-modal__tab--active': detailTab === tab.key }]"
          :aria-label="`导师详情弹窗${tab.zhLabel}`"
          :data-tab="tab.key"
          :data-tab-text="tab.zhLabel"
          @click="detailTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="detailTab === 'profile'">
      <div class="staff-detail-modal__grid">
        <article class="staff-detail-modal__card">
          <span>{{ t('admin.users.staff.detail.cards.email') }}</span>
          <strong>{{ detail?.email || '-' }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>{{ t('admin.users.staff.detail.cards.phone') }}</span>
          <strong>{{ detail?.phone || '-' }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>{{ t('admin.users.staff.detail.cards.majorDirection') }}</span>
          <strong>{{ renderCsvLabels(detail?.majorDirection, majorItems) }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>{{ t('admin.users.staff.detail.cards.studentCount') }}</span>
          <strong>{{ detail?.studentCount ?? 0 }}</strong>
        </article>
      </div>

      <section class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--blue">
            <i class="mdi mdi-account" aria-hidden="true"></i> {{ t('admin.users.staff.detail.sections.basic') }}
          </div>
          <span>{{ t('admin.users.staff.detail.sections.basicDesc') }}</span>
        </header>
        <dl class="staff-detail-modal__detail-grid">
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.staffId') }}</dt>
            <dd>{{ detail?.staffId ?? '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.staffName') }}</dt>
            <dd>{{ detail?.staffName || '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.region') }}</dt>
            <dd>{{ renderCsvLabels(detail?.region, regionItems) }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.city') }}</dt>
            <dd>{{ dictLabel(cityItems, detail?.city) }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.subDirection') }}</dt>
            <dd>{{ renderCsvLabels(detail?.subDirection, subItems) }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.hourlyRate') }}</dt>
            <dd>{{ formatHourlyRate(detail?.hourlyRate) }}</dd>
          </div>
        </dl>
      </section>

      <section class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> {{ t('admin.users.staff.detail.sections.specialty') }}
          </div>
        </header>
        <dl class="staff-detail-modal__detail-grid">
          <div class="staff-detail-modal__detail-cell" style="grid-column: 1 / -1">
            <dt>{{ t('admin.users.staff.detail.fields.specialty') }}</dt>
            <dd>
              <template v-if="splitField(detail?.specialty).length">
                <a-tag
                  v-for="v in splitField(detail?.specialty)"
                  :key="v"
                  color="cyan"
                  style="margin-bottom: 4px"
                >
                  {{ dictLabel(specialtyItems, v) }}
                </a-tag>
              </template>
              <span v-else style="color: #94a3b8">{{ t('admin.users.staff.detail.noData') }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--purple">
            <i class="mdi mdi-briefcase" aria-hidden="true"></i> {{ t('admin.users.staff.detail.sections.career') }}
          </div>
        </header>
        <dl class="staff-detail-modal__detail-grid">
          <div class="staff-detail-modal__detail-cell" style="grid-column: 1 / -1">
            <dt>{{ t('admin.users.staff.detail.fields.companies') }}</dt>
            <dd>
              <template v-if="Object.keys(groupedCompanies).length">
                <div v-for="(companies, industry) in groupedCompanies" :key="industry" style="margin-bottom: 8px">
                  <span style="color: #64748b; font-size: 12px; margin-bottom: 4px; display: block">{{ industry }}</span>
                  <span
                    v-for="company in companies"
                    :key="company"
                    style="display: inline-block; margin-right: 4px"
                  >
                    <a-tag color="blue">{{ company }}</a-tag>
                  </span>
                </div>
              </template>
              <span v-else style="color: #94a3b8">{{ t('admin.users.staff.detail.noData') }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="isSuperAdmin" class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--orange">
            <i class="mdi mdi-star" aria-hidden="true"></i> {{ t('admin.users.staff.detail.sections.internal') }}
          </div>
        </header>
        <dl class="staff-detail-modal__detail-grid">
          <div class="staff-detail-modal__detail-cell">
            <dt>{{ t('admin.users.staff.detail.fields.rating') }}</dt>
            <dd>
              <a-tag v-if="detail?.rating" color="gold">{{ dictLabel(ratingItems, detail.rating) }}</a-tag>
              <span v-else style="color: #94a3b8">{{ t('admin.users.staff.detail.unrated') }}</span>
            </dd>
          </div>
          <div class="staff-detail-modal__detail-cell" style="grid-column: 1 / -1">
            <dt>{{ t('admin.users.staff.detail.fields.ratingRemark') }}</dt>
            <dd>
              <span v-if="detail?.ratingRemark" style="white-space: pre-wrap">{{ detail.ratingRemark }}</span>
              <span v-else style="color: #94a3b8">{{ t('admin.users.staff.detail.noData') }}</span>
            </dd>
          </div>
        </dl>
      </section>
      </div>

      <section v-else class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--amber">
            <i class="mdi mdi-clipboard-text-clock-outline" aria-hidden="true"></i> {{ t('admin.users.staff.detail.sections.changes') }}
          </div>
          <span>{{ t('admin.users.staff.detail.sections.changesDesc') }}</span>
        </header>

        <div v-if="pendingRequests.length === 0" class="staff-detail-modal__empty">
          {{ t('admin.users.staff.detail.changesEmpty') }}
        </div>

        <div v-else class="staff-detail-modal__review-list">
          <article v-for="request in pendingRequests" :key="request.requestId" class="staff-detail-modal__review-card">
            <div class="staff-detail-modal__review-head">
              <div>
                <strong>{{ request.fieldLabel }}</strong>
                <p>{{ request.beforeValue || '-' }} -> {{ request.afterValue || '-' }}</p>
              </div>
              <span class="staff-detail-modal__review-pill">{{ t('admin.users.staff.detail.changesPending') }}</span>
            </div>

            <div class="staff-detail-modal__review-field" data-field-name="驳回说明">
              <span>{{ t('admin.users.staff.detail.rejectReasonLabel') }}</span>
              <a-textarea
                v-model:value="reviewReasons[request.requestId]"
                :rows="2"
                :placeholder="t('admin.users.staff.detail.rejectReasonPlaceholder')"
              />
            </div>

            <div class="staff-detail-modal__review-actions">
              <a-button
                :disabled="reviewingRequestId === request.requestId"
                @click="handleReject(request.requestId)"
              >
                {{ t('admin.users.staff.detail.rejectBtn') }}
              </a-button>
              <a-button
                type="primary"
                :disabled="reviewingRequestId === request.requestId"
                @click="handleApprove(request.requestId)"
              >
                {{ t('admin.users.staff.detail.approveBtn') }}
              </a-button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.users.staff.detail.close') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { OverlaySurfaceModal } from '@osg/shared/components'
import {
  approveStaffChangeRequest,
  getStaffChangeRequestList,
  getStaffDetail,
  rejectStaffChangeRequest,
  type StaffChangeRequestItem,
  type StaffDetailItem,
} from '@osg/shared/api/admin/staff'
import { useDictFacade, useIndustryMeta, type DictFacadeOption } from '@osg/shared/composables'
import { resolveDictDisplayName } from '@osg/shared/utils'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.permissions.includes('*:*:*'))

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: specialtyItems, load: loadSpecialty } = useDictFacade('osg_specialty')
const { items: ratingItems, load: loadRating } = useDictFacade('osg_rating')
const { items: companyItems, load: loadCompany } = useDictFacade('osg_company_name')
const { meta: industryItems, load: loadIndustry } = useIndustryMeta()

const dictLabel = (items: DictFacadeOption[], val?: string) => {
  if (!val) return '-'
  const opt = items.find((i) => i.value === val)
  if (!opt) return val
  return resolveDictDisplayName({ label: opt.label, i18nKey: opt.i18nKey }, t) || val
}

const splitField = (val?: string): string[] =>
  val ? val.split(',').map((s) => s.trim()).filter(Boolean) : []

const renderCsvLabels = (val: string | undefined, items: DictFacadeOption[]) => {
  const arr = splitField(val)
  if (!arr.length) return '-'
  return arr.map((v) => dictLabel(items, v)).join('、')
}

const groupedCompanies = computed(() => {
  const companyValues = splitField(detail.value?.companies)
  if (!companyValues.length) return {}

  const groups: Record<string, string[]> = {}
  for (const v of companyValues) {
    const company = companyItems.value.find((c) => c.value === v)
    const industryValue = company?.parentValue
    const industryOpt = industryValue
      ? industryItems.value.find((i) => i.value === industryValue)
      : undefined
    const industryLabel = industryValue
      ? (industryOpt
          ? (resolveDictDisplayName({ label: industryOpt.label, i18nKey: (industryOpt as any).i18nKey }, t) || industryValue)
          : industryValue)
      : t('admin.users.staff.detail.industryOther')
    if (!groups[industryLabel]) groups[industryLabel] = []
    const companyLabel = dictLabel(companyItems.value, v)
    if (!groups[industryLabel].includes(companyLabel)) groups[industryLabel].push(companyLabel)
  }
  return groups
})

const props = withDefaults(defineProps<{
  visible: boolean
  staffId?: number | null
  staffName?: string
  surfaceId?: string
}>(), {
  staffId: null,
  staffName: '',
  surfaceId: 'modal-staff-detail'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'review-updated': []
}>()

const detail = ref<StaffDetailItem | null>(null)
const pendingRequests = ref<StaffChangeRequestItem[]>([])
const loading = ref(false)
const loadError = ref('')
const reviewingRequestId = ref<number | null>(null)
const reviewReasons = reactive<Record<number, string>>({})
const detailTab = ref<'profile' | 'changes'>('profile')

const DETAIL_TAB_ZH = { profile: '基本信息', changes: '信息变更' } // i18n-skip-line: playwright labels

const detailTabs = computed(() => [
  { key: 'profile' as const, label: t('admin.users.staff.detail.tabs.profile'), zhLabel: DETAIL_TAB_ZH.profile },
  { key: 'changes' as const, label: t('admin.users.staff.detail.tabs.changes'), zhLabel: DETAIL_TAB_ZH.changes }
])

const avatarText = computed(() => {
  const name = detail.value?.staffName || props.staffName || ''
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase() || 'ST'
})

const loadDetail = async () => {
  if (!props.visible || !props.staffId) {
    detail.value = null
    pendingRequests.value = []
    loadError.value = ''
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    const [detailResponse, changeRequestResponse] = await Promise.all([
      getStaffDetail(props.staffId),
      getStaffChangeRequestList(props.staffId, 'pending'),
    ])
    detail.value = detailResponse
    pendingRequests.value = changeRequestResponse.rows || []
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('admin.users.staff.detail.retryHint')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.staffId] as const,
  () => {
    if (props.visible) {
      detailTab.value = 'profile'
      void loadRegion()
      void loadCity()
      void loadMajor()
      void loadSub()
      void loadSpecialty()
      void loadRating()
      void loadCompany()
      void loadIndustry()
    }
    void loadDetail()
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleApprove = async (requestId: number) => {
  reviewingRequestId.value = requestId
  try {
    await approveStaffChangeRequest(requestId)
    pendingRequests.value = pendingRequests.value.filter((request) => request.requestId !== requestId)
    message.success(t('admin.users.staff.detail.messages.approveSuccess'))
    emit('review-updated')
  } catch (error) {
  } finally {
    reviewingRequestId.value = null
  }
}

const handleReject = async (requestId: number) => {
  reviewingRequestId.value = requestId
  try {
    await rejectStaffChangeRequest(requestId, reviewReasons[requestId] || '')
    pendingRequests.value = pendingRequests.value.filter((request) => request.requestId !== requestId)
    message.success(t('admin.users.staff.detail.messages.rejectSuccess'))
    emit('review-updated')
  } catch (error) {
  } finally {
    reviewingRequestId.value = null
  }
}

const formatType = (staffType?: string) =>
  t(`admin.users.staff.staffTypes.${staffType || 'mentor'}` as never)

const formatStatus = (accountStatus?: string) =>
  accountStatus === '1' ? t('admin.users.staff.statusText.frozen') : t('admin.users.staff.statusText.normal')

const formatHourlyRate = (hourlyRate?: number) => {
  if (hourlyRate == null) return '-'
  return `$${hourlyRate}/h`
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="modal-staff-detail"] [data-surface-part="header"]),
:global([data-surface-id="modal-mentor-info-change"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="modal-staff-detail"] .overlay-surface-modal__close),
:global([data-surface-id="modal-mentor-info-change"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

/* ── Header content ── */
.sfdm-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sfdm-header__avatar {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.sfdm-header__name {
  display: block;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.sfdm-header__meta {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

.sfdm-header__status-pill {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

/* ── Body ── */
.staff-detail-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: #f8fafc;
}

.staff-detail-modal__state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 16px;
  background: #e2e8f0;
  color: #334155;
}

.staff-detail-modal__state--error {
  display: block;
  background: #fee2e2;
  color: #991b1b;
}

.staff-detail-modal__state--error p {
  margin: 6px 0 0;
}

.staff-detail-modal__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.staff-detail-modal__card,
.staff-detail-modal__panel {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}

.staff-detail-modal__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
}

.staff-detail-modal__card span {
  color: #64748b;
  font-size: 12px;
}

.staff-detail-modal__card strong {
  color: #0f172a;
  font-size: 16px;
}

.staff-detail-modal__panel {
  padding: 20px;
}

.staff-detail-modal__panel header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.staff-detail-modal__panel header span {
  color: #64748b;
  font-size: 12px;
}

/* ── Section badge ── */
.staff-detail-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.staff-detail-modal__badge--blue {
  background: #E8F0F8;
  color: #3B6FA0;
}

.staff-detail-modal__badge--amber {
  background: #fef3c7;
  color: #92400e;
}

.staff-detail-modal__badge--purple {
  background: #F3E8FF;
  color: #6B21A8;
}

.staff-detail-modal__badge--orange {
  background: #FFEDD5;
  color: #9A3412;
}

.staff-detail-modal__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.staff-detail-modal__detail-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #F8FAFC;
  padding: 12px;
  border-radius: 8px;
}

.staff-detail-modal__detail-cell dt {
  color: #64748b;
  font-size: 12px;
}

.staff-detail-modal__detail-cell dd {
  margin: 0;
  color: #0f172a;
  font-weight: 600;
}

.staff-detail-modal__empty {
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
}

.staff-detail-modal__review-list {
  display: grid;
  gap: 14px;
}

.staff-detail-modal__review-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  background: #f8fafc;
}

.staff-detail-modal__review-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.staff-detail-modal__review-head strong {
  color: #0f172a;
}

.staff-detail-modal__review-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.staff-detail-modal__review-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
}

.staff-detail-modal__review-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.staff-detail-modal__review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.staff-detail-modal__tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.staff-detail-modal__tab {
  flex: 1;
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
}

.staff-detail-modal__tab--active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.staff-detail-modal__tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.staff-detail-modal__tag--success {
  background: #dcfce7;
  color: #166534;
}

.staff-detail-modal__tag--danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 768px) {
  .staff-detail-modal__grid,
  .staff-detail-modal__detail-grid {
    grid-template-columns: 1fr;
  }

  .staff-detail-modal__review-head,
  .staff-detail-modal__review-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
