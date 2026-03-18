<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="staff-detail-modal"
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
    </template>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">关闭</button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { getStaffDetail, type StaffDetailItem } from '@osg/shared/api/admin/staff'

const props = withDefaults(defineProps<{
  visible: boolean
  staffId?: number | null
  staffName?: string
}>(), {
  staffId: null,
  staffName: ''
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const detail = ref<StaffDetailItem | null>(null)
const loading = ref(false)
const loadError = ref('')

const avatarText = computed(() => {
  const name = detail.value?.staffName || props.staffName || ''
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase() || 'ST'
})

const loadDetail = async () => {
  if (!props.visible || !props.staffId) {
    detail.value = null
    loadError.value = ''
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    detail.value = await getStaffDetail(props.staffId)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.staffId] as const,
  () => {
    void loadDetail()
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
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
:global([data-surface-id="staff-detail-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="staff-detail-modal"] .overlay-surface-modal__close) {
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
}
</style>
