<template>
  <section class="change-review-tab">
    <article class="change-review-tab__panel">
      <header class="change-review-tab__header">
        <div>
          <strong>待审核变更</strong>
          <span>展示当前待复核的信息更新，并支持快速通过或驳回。</span>
        </div>
        <span class="change-review-tab__badge">{{ pendingChanges.length }} 条待处理</span>
      </header>

      <div v-if="pendingChanges.length" class="change-review-tab__list">
        <div v-for="item in pendingItems" :key="item.id" class="change-review-tab__card">
          <div class="change-review-tab__meta">
            <div class="change-review-tab__meta-copy">
              <span>{{ item.field }}</span>
              <small v-if="item.changeType">{{ item.changeType }}</small>
            </div>
            <strong>{{ item.requestedAt }}</strong>
          </div>
          <div class="change-review-tab__diff">
            <div>
              <label>变更前</label>
              <p>{{ item.before }}</p>
            </div>
            <div>
              <label>变更后</label>
              <p>{{ item.after }}</p>
            </div>
          </div>
          <p class="change-review-tab__note">{{ item.note || '无附加说明' }}</p>
          <div class="change-review-tab__actions">
            <button
              type="button"
              class="change-review-tab__button change-review-tab__button--ghost"
              :disabled="activeRequestId === item.id"
              @click="handleDecision('reject', item)"
            >
              {{ activeRequestId === item.id ? '处理中...' : '驳回' }}
            </button>
            <button
              type="button"
              class="change-review-tab__button"
              :disabled="activeRequestId === item.id"
              @click="handleDecision('approve', item)"
            >
              {{ activeRequestId === item.id ? '处理中...' : '通过' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="change-review-tab__empty">
        当前没有待审核的信息变更。
      </div>
    </article>

    <article class="change-review-tab__panel">
      <header class="change-review-tab__header">
        <div>
          <strong>历史变更记录</strong>
          <span>用于快速回看学员信息如何变化，以及审核结论。</span>
        </div>
      </header>

      <div v-if="historyItems.length" class="change-review-tab__timeline">
        <div v-for="item in historyItems" :key="item.id" class="change-review-tab__timeline-item">
          <span class="change-review-tab__timeline-dot"></span>
          <div>
            <div class="change-review-tab__timeline-head">
              <strong>{{ item.field }}</strong>
              <span>{{ formatStatus(item.status) }}</span>
            </div>
            <p>{{ item.before }} → {{ item.after }}</p>
            <small>{{ item.requestedAt }} · {{ item.requestedBy }}</small>
          </div>
        </div>
      </div>

      <div v-else class="change-review-tab__empty">
        还没有历史变更记录。
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
      return '自动生效'
    case 'approved':
      return '已通过'
    case 'rejected':
      return '已驳回'
    default:
      return '已记录'
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
    emit(action, item)
    message.success(action === 'approve' ? '变更已通过' : '变更已驳回')
  } catch (_error) {
    message.error(action === 'approve' ? '变更通过失败' : '变更驳回失败')
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
</script>

<style scoped lang="scss">
.change-review-tab {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.change-review-tab__panel {
  border-radius: 24px;
  padding: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.change-review-tab__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.change-review-tab__header strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  font-size: 16px;
}

.change-review-tab__header span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.change-review-tab__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 12px;
  font-weight: 700;
}

.change-review-tab__list {
  display: grid;
  gap: 12px;
}

.change-review-tab__card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  padding: 16px 18px;
  background: linear-gradient(180deg, #ffffff 0%, #fffaf5 100%);
}

.change-review-tab__meta,
.change-review-tab__actions,
.change-review-tab__timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.change-review-tab__meta span,
.change-review-tab__timeline-head strong {
  color: #0f172a;
  font-weight: 700;
}

.change-review-tab__meta-copy {
  display: grid;
  gap: 4px;
}

.change-review-tab__meta-copy small {
  color: #b45309;
  font-size: 11px;
  font-weight: 700;
}

.change-review-tab__meta strong,
.change-review-tab__timeline-head span {
  color: #64748b;
  font-size: 12px;
}

.change-review-tab__diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.change-review-tab__diff div {
  border-radius: 18px;
  padding: 14px;
  background: #f8fafc;
}

.change-review-tab__diff label {
  display: block;
  margin-bottom: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.change-review-tab__diff p,
.change-review-tab__note,
.change-review-tab__timeline-item p,
.change-review-tab__timeline-item small {
  margin: 0;
  line-height: 1.6;
}

.change-review-tab__button {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.change-review-tab__button--ghost {
  background: #eef2ff;
  color: #3730a3;
}

.change-review-tab__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.change-review-tab__timeline {
  display: grid;
  gap: 16px;
}

.change-review-tab__timeline-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
}

.change-review-tab__timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
  box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.12);
}

.change-review-tab__empty {
  border-radius: 20px;
  padding: 18px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

@media (max-width: 900px) {
  .change-review-tab__header,
  .change-review-tab__diff,
  .change-review-tab__actions {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
