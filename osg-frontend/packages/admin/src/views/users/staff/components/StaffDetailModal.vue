<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="960px"
    :body-class="'staff-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="sfdm-header">
        <div class="sfdm-header__avatar">{{ avatarText }}</div>
        <div class="sfdm-header__info">
          <span class="sfdm-header__name">{{ detail?.staffName || staffName || '导师详情' }}</span>
          <div class="sfdm-header__meta">
            ID: {{ detail?.staffId ?? '-' }} · {{ formatType(detail?.staffType) }}
            · <span class="sfdm-header__status-pill">{{ formatStatus(detail?.accountStatus) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="staff-detail-modal__state">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载导师详情...</span>
    </div>

    <div v-else-if="loadError" class="staff-detail-modal__state staff-detail-modal__state--error">
      <strong>导师详情加载失败</strong>
      <p>{{ loadError }}</p>
    </div>

    <template v-else>
      <div class="staff-detail-modal__tabs">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          type="button"
          :class="['staff-detail-modal__tab', { 'staff-detail-modal__tab--active': detailTab === tab.key }]"
          :aria-label="`导师详情弹窗${tab.label}`"
          :data-tab="tab.key"
          :data-tab-text="tab.label"
          @click="detailTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="detailTab === 'profile'">
      <div class="staff-detail-modal__grid">
        <article class="staff-detail-modal__card">
          <span>邮箱</span>
          <strong>{{ detail?.email || '-' }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>手机号</span>
          <strong>{{ detail?.phone || '-' }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>主攻方向</span>
          <strong>{{ detail?.majorDirection || '-' }}</strong>
        </article>
        <article class="staff-detail-modal__card">
          <span>当前学员数</span>
          <strong>{{ detail?.studentCount ?? 0 }}</strong>
        </article>
      </div>

      <section class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--blue">
            <i class="mdi mdi-account" aria-hidden="true"></i> 基本资料
          </div>
          <span>交付阶段使用真实后端数据展示导师账户和所在城市。</span>
        </header>
        <dl class="staff-detail-modal__detail-grid">
          <div class="staff-detail-modal__detail-cell">
            <dt>导师 ID</dt>
            <dd>{{ detail?.staffId ?? '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>姓名</dt>
            <dd>{{ detail?.staffName || '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>地区</dt>
            <dd>{{ detail?.region || '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>城市</dt>
            <dd>{{ detail?.city || '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>子方向</dt>
            <dd>{{ detail?.subDirection || '-' }}</dd>
          </div>
          <div class="staff-detail-modal__detail-cell">
            <dt>课时单价</dt>
            <dd>{{ formatHourlyRate(detail?.hourlyRate) }}</dd>
          </div>
        </dl>
      </section>
      </div>

      <section v-else class="staff-detail-modal__panel">
        <header>
          <div class="staff-detail-modal__badge staff-detail-modal__badge--amber">
            <i class="mdi mdi-clipboard-text-clock-outline" aria-hidden="true"></i> 待审核变更
          </div>
          <span>导师提交的资料变更会在这里完成审核，审核完成后会刷新列表待处理数量。</span>
        </header>

        <div v-if="pendingRequests.length === 0" class="staff-detail-modal__empty">
          当前没有待审核的资料变更。
        </div>

        <div v-else class="staff-detail-modal__review-list">
          <article v-for="request in pendingRequests" :key="request.requestId" class="staff-detail-modal__review-card">
            <div class="staff-detail-modal__review-head">
              <div>
                <strong>{{ request.fieldLabel }}</strong>
                <p>{{ request.beforeValue || '-' }} -> {{ request.afterValue || '-' }}</p>
              </div>
              <span class="staff-detail-modal__review-pill">待审核</span>
            </div>

            <label class="staff-detail-modal__review-field" data-field-name="驳回说明">
              <span>驳回说明</span>
              <textarea
                v-model.trim="reviewReasons[request.requestId]"
                class="staff-detail-modal__review-textarea"
                rows="2"
                placeholder="选填：输入驳回原因后再执行驳回"
              />
            </label>

            <div class="staff-detail-modal__review-actions">
              <button
                type="button"
                class="permission-button permission-button--outline"
                :disabled="reviewingRequestId === request.requestId"
                @click="handleReject(request.requestId)"
              >
                驳回
              </button>
              <button
                type="button"
                class="permission-button permission-button--primary"
                :disabled="reviewingRequestId === request.requestId"
                @click="handleApprove(request.requestId)"
              >
                通过
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">关闭</button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import {
  approveStaffChangeRequest,
  getStaffChangeRequestList,
  getStaffDetail,
  rejectStaffChangeRequest,
  type StaffChangeRequestItem,
  type StaffDetailItem,
} from '@osg/shared/api/admin/staff'

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
const detailTabs = [
  { key: 'profile' as const, label: '基本信息' },
  { key: 'changes' as const, label: '信息变更' }
] as const

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
    loadError.value = error instanceof Error ? error.message : '请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.staffId] as const,
  () => {
    if (props.visible) {
      detailTab.value = 'profile'
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
    message.success('导师变更申请已通过')
    emit('review-updated')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '审核通过失败')
  } finally {
    reviewingRequestId.value = null
  }
}

const handleReject = async (requestId: number) => {
  reviewingRequestId.value = requestId
  try {
    await rejectStaffChangeRequest(requestId, reviewReasons[requestId] || '')
    pendingRequests.value = pendingRequests.value.filter((request) => request.requestId !== requestId)
    message.success('导师变更申请已驳回')
    emit('review-updated')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '驳回失败')
  } finally {
    reviewingRequestId.value = null
  }
}

const formatType = (staffType?: string) => {
  return staffType === 'lead_mentor' ? '班主任' : '导师'
}

const formatStatus = (accountStatus?: string) => {
  return accountStatus === '1' ? '冻结' : '正常'
}

const formatHourlyRate = (hourlyRate?: number) => {
  if (hourlyRate == null) {
    return '-'
  }
  return `￥${hourlyRate}/h`
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

.staff-detail-modal__review-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  padding: 10px 12px;
  resize: vertical;
  font: inherit;
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

.permission-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 8px 14px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
}

.permission-button--primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: #6366f1;
  color: #ffffff;
}

.permission-button--outline {
  background: #ffffff;
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
