<template>
  <section class="crt">
    <!-- Blue Info Banner -->
    <div class="crt-banner">
      <i class="mdi mdi-information crt-banner__icon"></i>
      <strong>{{ $t('review_notes') }}：</strong>{{ $t('changes_to_core_info_academic_info_and_j') }}。
    </div>

    <!-- Pending Changes Section -->
    <article class="crt-section">
      <header class="crt-section__header">
        <div class="crt-section__title">
          <i class="mdi mdi-clock-alert crt-section__title-icon crt-section__title-icon--warning"></i>
          <span>{{ $t('pending_changes_2') }}</span>
          <span class="crt-badge crt-badge--danger">{{ pendingChanges.length }}</span>
        </div>
      </header>

      <div v-if="pendingChanges.length" class="crt-pending-list">
        <div v-for="item in pendingItems" :key="item.id" class="crt-pending-card">
          <!-- Header: tags + timestamp -->
          <div class="crt-pending-card__header">
            <div class="crt-pending-card__tags">
              <span :class="['crt-tag', `crt-tag--${getCategoryStyle(item.changeType)}`]">
                {{ getCategoryLabel(item.changeType) }}
              </span>
              <span class="crt-tag crt-tag--warning">{{ item.field }}</span>
            </div>
            <span class="crt-pending-card__time">{{ formatTime(item.requestedAt) }}</span>
          </div>

          <!-- Value Comparison -->
          <div class="crt-comparison">
            <div class="crt-comparison__col">
              <label class="crt-comparison__label">{{ $t('before_change') }}</label>
              <span class="crt-comparison__value crt-comparison__value--before">{{ item.before }}</span>
            </div>
            <div class="crt-comparison__arrow">
              <i class="mdi mdi-arrow-right"></i>
            </div>
            <div class="crt-comparison__col">
              <label class="crt-comparison__label">{{ $t('after_change') }}</label>
              <span class="crt-comparison__value crt-comparison__value--after">{{ item.after }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="crt-pending-card__actions">
            <button
              type="button"
              class="crt-btn crt-btn--success"
              :disabled="activeRequestId === item.id"
              @click="handleDecision('approve', item)"
            >
              {{ activeRequestId === item.id ? $t('processing') + '...' : '✓ ' + $t('approve') }}
            </button>
            <button
              type="button"
              class="crt-btn crt-btn--danger"
              :disabled="activeRequestId === item.id"
              @click="handleDecision('reject', item)"
            >
              {{ activeRequestId === item.id ? $t('processing') + '...' : '✗ ' + $t('reject_2') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="crt-empty">
        {{ $t('no_pending_information_changes') }}。
      </div>
    </article>

    <!-- History Changes Section -->
    <article class="crt-section">
      <header class="crt-section__header">
        <div class="crt-section__title">
          <i class="mdi mdi-history crt-section__title-icon crt-section__title-icon--muted"></i>
          <span>{{ $t('change_history') }}</span>
        </div>
      </header>

      <div v-if="historyItems.length" class="crt-history-table-wrap">
        <table class="crt-history-table">
          <thead>
            <tr>
              <th>{{ $t('change_type') }}</th>
              <th>{{ $t('changed_field') }}</th>
              <th>{{ $t('before_change') }}</th>
              <th>{{ $t('after_change') }}</th>
              <th>{{ $t('change_time') }}</th>
              <th>{{ $t('status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in historyItems" :key="item.id">
              <td>
                <span :class="['crt-tag', `crt-tag--${getCategoryStyle(item.changeType)}`]">
                  {{ getCategoryLabel(item.changeType) }}
                </span>
              </td>
              <td>{{ item.field }}</td>
              <td class="crt-history-table__before">{{ item.before }}</td>
              <td class="crt-history-table__after">{{ item.after }}</td>
              <td class="crt-history-table__time">{{ formatTime(item.requestedAt) }}</td>
              <td>
                <span :class="['crt-status-tag', `crt-status-tag--${item.status || 'default'}`]">
                  <i v-if="item.status === 'approved'" class="mdi mdi-check" style="margin-right:2px"></i>
                  {{ formatStatus(item.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="crt-empty">
        {{ $t('no_change_history_yet') }}。
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  approveStudentChangeRequest,
  rejectStudentChangeRequest
} from '@osg/shared/api/admin/studentChangeRequest'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface ChangeItem {
  id: string | number
  field: string
  before: string
  after: string
  requestedAt: string
  requestedBy: string
  note?: string
  status?: string
  changeType?: string
  requestId?: number | string
}

const props = defineProps<{
  pendingChanges: ChangeItem[]
  historyChanges: ChangeItem[]
}>()

const emit = defineEmits<{
  approve: [item: ChangeItem]
  reject: [item: ChangeItem]
}>()

const pendingItems = ref<ChangeItem[]>([])
const historyItems = ref<ChangeItem[]>([])
const activeRequestId = ref<string | number | null>(null)

watch(
  () => props.pendingChanges,
  (value) => {
    pendingItems.value = value.map((item) => ({ ...item }))
  },
  { immediate: true, deep: true }
)

watch(
  () => props.historyChanges,
  (value) => {
    historyItems.value = value.map((item) => ({ ...item }))
  },
  { immediate: true, deep: true }
)

const formatStatus = (status?: string) => {
  switch (status) {
    case 'auto_applied':
      return t('auto_applied')
    case 'approved':
      return t('approved')
    case 'rejected':
      return t('rejected_3')
    default:
      return t('recorded')
  }
}

const handleDecision = async (action: 'approve' | 'reject', item: ChangeItem) => {
  activeRequestId.value = item.id
  try {
    const requestId = resolveRequestId(item)
    if (requestId != null) {
      if (action === 'approve') {
        await approveStudentChangeRequest(requestId)
      } else {
        await rejectStudentChangeRequest(requestId)
      }
    }

    moveToHistory(action, item)
    if (action === 'approve') emit('approve', item)
    else emit('reject', item)
    message.success(action === 'approve' ? t('change_approved') : t('change_rejected'))
  } catch (_error) {
    message.error(action === 'approve' ? t('failed_to_approve_change') : t('failed_to_reject_change'))
  } finally {
    activeRequestId.value = null
  }
}

const resolveRequestId = (item: ChangeItem) => {
  const candidate = item.requestId ?? item.id
  if (typeof candidate === 'number') {
    return candidate
  }
  if (typeof candidate === 'string' && /^\d+$/.test(candidate)) {
    return Number(candidate)
  }
  return null
}

const moveToHistory = (action: 'approve' | 'reject', item: ChangeItem) => {
  pendingItems.value = pendingItems.value.filter((entry) => entry.id !== item.id)
  historyItems.value = [
    {
      ...item,
      status: action === 'approve' ? 'approved' : 'rejected'
    },
    ...historyItems.value
  ]
}

const getCategoryLabel = (changeType?: string): string => {
  switch (changeType) {
    case 'academic':
      return t('academic_information')
    case 'job_direction':
      return t('job_search_direction')
    case 'contact':
      return t('contact_info')
    default:
      return t('core_information')
  }
}

const getCategoryStyle = (changeType?: string): string => {
  switch (changeType) {
    case 'academic':
      return 'blue'
    case 'job_direction':
      return 'amber'
    case 'contact':
      return 'green'
    default:
      return 'primary'
  }
}

const formatTime = (raw: string): string => {
  if (!raw) return ''
  // Try to parse and format as YYYY-MM-DD HH:mm
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  } catch {
    return raw
  }
}
</script>

<style scoped lang="scss">
/* ── Change Review Tab (crt-) ── */
.crt {
  display: grid;
  gap: 20px;
}

/* Blue Info Banner */
.crt-banner {
  padding: 12px 16px;
  background: #e8f0f8;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
}

.crt-banner__icon {
  margin-right: 6px;
}

/* Section */
.crt-section {
  /* no extra wrapper styling needed */
}

.crt-section__header {
  margin-bottom: 16px;
}

.crt-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.crt-section__title-icon {
  font-size: 18px;
}

.crt-section__title-icon--warning {
  color: #f59e0b;
}

.crt-section__title-icon--muted {
  color: #94a3b8;
}

/* Badge (count) */
.crt-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
}

.crt-badge--danger {
  background: #ef4444;
  color: #fff;
}

/* Tags */
.crt-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
}

.crt-tag--primary {
  background: #dbeafe;
  color: #1d4ed8;
}

.crt-tag--blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.crt-tag--amber {
  background: #fef3c7;
  color: #92400e;
}

.crt-tag--green {
  background: #dcfce7;
  color: #166534;
}

.crt-tag--warning {
  background: #fef3c7;
  color: #92400e;
}

/* Pending list */
.crt-pending-list {
  display: grid;
  gap: 12px;
}

/* Pending card */
.crt-pending-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 16px;
}

.crt-pending-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.crt-pending-card__tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crt-pending-card__time {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

/* Value comparison */
.crt-comparison {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.crt-comparison__col {
  flex: 1;
  text-align: center;
}

.crt-comparison__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.crt-comparison__value {
  display: block;
  font-size: 14px;
  line-height: 1.5;
}

.crt-comparison__value--before {
  text-decoration: line-through;
  color: #94a3b8;
}

.crt-comparison__value--after {
  font-weight: 600;
  color: var(--primary, #3b82f6);
}

.crt-comparison__arrow {
  padding: 0 12px;
  font-size: 20px;
  color: var(--primary, #3b82f6);
  display: flex;
  align-items: center;
}

/* Action buttons */
.crt-pending-card__actions {
  display: flex;
  gap: 8px;
}

.crt-btn {
  flex: 1;
  border: none;
  border-radius: 6px;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.crt-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.crt-btn--success {
  background: var(--success, #22c55e);
  color: #fff;
}

.crt-btn--danger {
  background: var(--danger, #ef4444);
  color: #fff;
}

/* History table */
.crt-history-table-wrap {
  overflow-x: auto;
}

.crt-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.crt-history-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid #e5e7eb;
  color: #6b7280;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
}

.crt-history-table td {
  padding: 10px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.crt-history-table__before {
  text-decoration: line-through;
  color: #94a3b8;
}

.crt-history-table__after {
  color: var(--text, #1e293b);
}

.crt-history-table__time {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}

/* Status tags in history */
.crt-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.crt-status-tag--auto_applied {
  background: #e5e7eb;
  color: #6b7280;
}

.crt-status-tag--approved {
  background: #dcfce7;
  color: #166534;
}

.crt-status-tag--rejected {
  background: #fee2e2;
  color: #991b1b;
}

.crt-status-tag--default {
  background: #e5e7eb;
  color: #6b7280;
}

/* Empty state */
.crt-empty {
  border-radius: 8px;
  padding: 18px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
  font-size: 13px;
}
</style>
