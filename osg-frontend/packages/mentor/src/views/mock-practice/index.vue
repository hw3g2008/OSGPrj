<template>
  <div id="page-mock-practice">
    <PageHeader
      title-zh="模拟应聘管理"
      title-en="Mock Practice"
      description="查看分配给我的模拟面试、人际关系测试、期中考试"
    />

    <!-- 统计 -->
    <a-row :gutter="16" class="stats-grid">
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-value" style="color:#EF4444">{{ stats.newCount }}</div>
          <div class="stat-label">新分配</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-value" style="color:#3B82F6">{{ stats.pendingCount }}</div>
          <div class="stat-label">待进行</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-value" style="color:#22C55E">{{ stats.completedCount }}</div>
          <div class="stat-label">已完成</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-value" style="color:#94A3B8">{{ stats.cancelledCount }}</div>
          <div class="stat-label">已取消</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 列表 -->
    <a-card :bordered="false">
      <a-form layout="inline" class="filter-bar" style="margin-bottom: 16px">
        <a-form-item label="类型">
          <a-select v-model:value="filters.type" style="width:140px" @change="applyFilters">
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option value="mock_interview">模拟面试</a-select-option>
            <a-select-option value="relation_test">人际关系测试</a-select-option>
            <a-select-option value="midterm">期中考试</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" style="width:140px" @change="applyFilters">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="new">新分配</a-select-option>
            <a-select-option value="pending">待进行</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="学员">
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索学员姓名/ID"
            style="width:200px"
            allow-clear
            @input="applyFilters"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilters">
            <i class="mdi mdi-magnify" style="margin-right:4px" />筛选
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button type="link" @click="resetFilters">
            <i class="mdi mdi-refresh" style="margin-right:4px" />重置
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="filteredList"
        :pagination="false"
        :row-key="(r: any) => r.id"
        :custom-row="customRow"
        :locale="{ emptyText: '暂无匹配的模拟应聘记录' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'student'">
            <div class="student-cell">
              <div class="avatar" :style="{ background: avatarColor(record) }">{{ record.studentName?.[0] || '?' }}</div>
              <div>
                <strong>{{ record.studentName }}</strong>
                <br />
                <span class="text-muted text-sm">ID: {{ record.studentId }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'practiceType'">
            <PracticeTypeTag :practice-type="record.practiceType" show-icon />
          </template>
          <template v-else-if="column.key === 'assignedTime'">
            <span class="text-sm">{{ formatDate(record.assignedTime) }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record.status === 'new'" color="red" class="pulse-tag">
              <i class="mdi mdi-bell-ring" /> 新分配
            </a-tag>
            <a-tag v-else-if="record.status === 'pending'" color="blue">待进行</a-tag>
            <a-tag v-else-if="record.status === 'completed'" color="green">已完成</a-tag>
            <a-tag v-else-if="record.status === 'cancelled'">已取消</a-tag>
            <span v-else class="text-muted">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'totalHours'">
            <span v-if="record.totalHours" style="font-weight:600;color:#7399C6">{{ record.totalHours }}h</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.key === 'feedback'">
            <template v-if="record.status === 'new'">
              <a-button type="primary" size="small" class="btn-confirm" @click="confirmMock(record)">
                <i class="mdi mdi-check" style="margin-right:4px" />确认
              </a-button>
            </template>
            <template v-else-if="record.status === 'completed' && record.feedbackLevel">
              <div :class="feedbackColor(record.feedbackLevel)" style="font-size:12px;font-weight:500">{{ feedbackLabel(record.feedbackLevel) }}</div>
              <div class="text-muted text-sm">{{ record.feedbackNote }}</div>
            </template>
            <template v-else>
              <a-button type="link" size="small" @click="showDetail(record)">查看详情</a-button>
            </template>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="detailModal.visible"
      :width="760"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      wrap-class-name="mock-detail-modal"
      @cancel="closeDetailModal"
    >
      <div id="modal-job-detail" class="modal-detail">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-briefcase-search" /> 学员求职详情</span>
          <button class="modal-close" type="button" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body modal-detail-body">
          <div class="detail-hero">
            <div class="detail-hero-card detail-hero-student">
              <div class="section-caption">学员信息</div>
              <div class="detail-hero-main">
                <div class="detail-hero-avatar">{{ detailModal.record?.studentName?.[0] || '?' }}</div>
                <div>
                  <div class="detail-hero-name">{{ detailModal.record?.studentName || '-' }}</div>
                  <div class="detail-hero-meta">ID: {{ detailModal.record?.studentId || '-' }}</div>
                </div>
              </div>
            </div>
            <div class="detail-hero-card">
              <div class="section-caption">申请岗位</div>
              <div class="detail-hero-title">{{ typeLabel(detailModal.record?.practiceType || '') }}</div>
              <div class="detail-hero-meta">{{ detailModal.record?.requestContent || '暂无申请内容' }}</div>
              <div class="detail-hero-meta">申请导师数: {{ detailModal.record?.requestedMentorCount ?? '-' }}</div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-caption"><i class="mdi mdi-timeline-clock" /> 求职进度</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">当前状态</span>
                <div class="detail-value">{{ mockStatusLabel(detailModal.record?.status || '') }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">分配时间</span>
                <div class="detail-value">{{ formatDate(detailModal.record?.assignedTime || '') || '-' }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">预约时间</span>
                <div class="detail-value">{{ formatDate(detailModal.record?.scheduledAt || '') || '-' }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">提交时间</span>
                <div class="detail-value">{{ formatDate(detailModal.record?.submittedAt || '') || '-' }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-caption"><i class="mdi mdi-school" /> 辅导信息</div>
            <div class="detail-grid detail-grid-compact">
              <div class="detail-item">
                <span class="detail-label">分配导师</span>
                <div class="detail-value">{{ detailModal.record?.mentorNames || '-' }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">导师背景</span>
                <div class="detail-value">{{ detailModal.record?.mentorBackgrounds || '-' }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">已上课时</span>
                <div class="detail-value">{{ detailModal.record?.totalHours ? `${detailModal.record.totalHours}h` : '-' }}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">课程反馈</span>
                <div class="detail-value">{{ detailModal.record?.feedbackNote || '暂无反馈' }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-head">
              <div class="section-caption"><i class="mdi mdi-book-open-variant" /> 课程记录 (最近3条)</div>
              <a-button type="link" size="small" class="section-action">查看全部</a-button>
            </div>
            <div class="record-list">
              <div class="record-item">
                <div class="record-date">提交申请</div>
                <div class="record-body">{{ detailModal.record?.requestContent || '暂无申请内容' }}</div>
              </div>
              <div class="record-item">
                <div class="record-date">导师反馈</div>
                <div class="record-body">{{ detailModal.record?.feedbackNote || '暂无反馈' }}</div>
              </div>
              <div class="record-item">
                <div class="record-date">学员备注</div>
                <div class="record-body">{{ detailModal.record?.note || '暂无备注' }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-caption"><i class="mdi mdi-note-text" /> 学员备注</div>
            <div class="detail-note">{{ detailModal.record?.note || '暂无备注' }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <a-button type="primary" @click="closeDetailModal">关闭</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag } from '@osg/shared/components'
import { http } from '@osg/shared/utils/request'

const MENTOR_NAV_BADGE_KEY = Symbol.for('mentor-nav-badges')

type MentorNavBadgeState = {
  mockBadge: Ref<number>
  refreshMockBadge: () => Promise<void>
}

const list = ref<any[]>([])
const detailModal = ref<{ visible: boolean; record: any | null }>({ visible: false, record: null })
const filters = ref({ type: '', status: '', keyword: '' })
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)
const rowAnchors = ref<Map<number, string>>(new Map())

const stats = computed(() => {
  const s = { newCount: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0 }
  list.value.forEach(r => { if (r.status === 'new') s.newCount++; else if (r.status === 'pending') s.pendingCount++; else if (r.status === 'completed') s.completedCount++; else s.cancelledCount++ })
  return s
})

const filteredList = computed(() => list.value)

const columns = [
  { title: '学员', key: 'student' },
  { title: '类型', key: 'practiceType', dataIndex: 'practiceType' },
  { title: '分配时间', key: 'assignedTime', dataIndex: 'assignedTime' },
  { title: '状态', key: 'status', dataIndex: 'status' },
  { title: '已上课时', key: 'totalHours', dataIndex: 'totalHours' },
  { title: '课程反馈', key: 'feedback' },
]

function customRow(record: any) {
  const id = rowDomId(record)
  return id ? { id, class: rowClass(record) } : { class: rowClass(record) }
}

function resetFilters() {
  filters.value = { type: '', status: '', keyword: '' }
  applyFilters()
}
function rowDomId(record: any) { return rowAnchors.value.get(record.practiceId ?? record.id) || '' }
function rowClass(r: any) { return { 'row-new': r.status === 'new', 'row-midterm': r.practiceType === 'midterm' } }
function avatarColor(r: any) { const c = ['#7399C6','#F59E0B','#3B82F6','#22C55E','#8B5CF6']; return c[(r.id ?? r.practiceId ?? 0) % c.length] }
function typeClass(t: string) { return { mock_interview: 'info', relation_test: 'warning', midterm: 'purple' }[t] || 'info' }
function typeLabel(t: string) { return { mock_interview: '模拟面试', relation_test: '人际关系测试', midterm: '期中考试' }[t] || t }
function feedbackColor(l: string) { return { excellent: 'text-success', good: 'text-warning' }[l] || '' }
function feedbackLabel(l: string) { return { excellent: '优秀', good: '良好', average: '一般', poor: '较差' }[l] || l }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '' }
function mockStatusLabel(status: string) { return { new: '新分配', pending: '待进行', scheduled: '待进行', confirmed: '待进行', completed: '已完成', cancelled: '已取消' }[status] || status }

function normalizeFeedbackLevel(rating: number | undefined) {
  if (rating == null) return ''
  if (rating >= 5) return 'excellent'
  if (rating >= 4) return 'good'
  if (rating >= 3) return 'average'
  return 'poor'
}

function normalizeStatus(status: string | undefined) {
  if (status === 'scheduled') {
    return 'pending'
  }
  if (status === 'confirmed') {
    return 'pending'
  }
  return status || ''
}

function normalizeMockPractice(record: Record<string, any>) {
  const practiceId = record.practiceId ?? record.id
  return {
    ...record,
    id: practiceId,
    practiceId,
    assignedTime: record.assignedTime ?? record.submittedAt ?? record.scheduledAt ?? '',
    totalHours: record.totalHours ?? record.completedHours ?? 0,
    feedbackLevel: record.feedbackLevel ?? normalizeFeedbackLevel(record.feedbackRating),
    feedbackNote: record.feedbackNote ?? record.feedbackSummary ?? '',
    status: normalizeStatus(record.status),
  }
}

function closeDetailModal() {
  detailModal.value = { visible: false, record: null }
}

function showDetail(record: any) {
  detailModal.value = { visible: true, record }
}

function syncRowAnchors(records: any[]) {
  const nextAnchors = new Map<number, string>()
  const usedAnchors = new Set<string>()
  let nextSequence = 1

  records.forEach((record) => {
    const rowId = Number(record.practiceId ?? record.id)
    if (!Number.isFinite(rowId)) {
      return
    }
    const existingAnchor = rowAnchors.value.get(rowId)
    if (existingAnchor) {
      nextAnchors.set(rowId, existingAnchor)
      usedAnchors.add(existingAnchor)
      return
    }
    if (record.status === 'new') {
      while (usedAnchors.has(`mock-new-${nextSequence}`)) {
        nextSequence += 1
      }
      nextAnchors.set(rowId, `mock-new-${nextSequence}`)
      usedAnchors.add(`mock-new-${nextSequence}`)
      nextSequence += 1
    }
  })

  rowAnchors.value = nextAnchors
}

async function confirmMock(r: any) {
  const practiceId = r.practiceId ?? r.id
  const rowId = Number(practiceId)
  if (Number.isFinite(rowId) && !rowAnchors.value.get(rowId)) {
    const newCount = Array.from(rowAnchors.value.values()).filter((value) => value.startsWith('mock-new-')).length
    rowAnchors.value.set(rowId, `mock-new-${newCount + 1}`)
  }
  try { await http.put(`/api/mentor/mock-practice/${practiceId}/confirm`); r.status = 'pending' } catch {}
  syncRowAnchors(list.value)
  try { await mentorNavBadges?.refreshMockBadge?.() } catch {}
}

async function fetchListWithParams(params: Record<string, string>) {
  try {
    const res = await http.get('/api/mentor/mock-practice/list', { params })
    list.value = (res.rows || []).map((record: Record<string, any>) => normalizeMockPractice(record))
    syncRowAnchors(list.value)
  } catch {}
}

function buildQueryParams() {
  return {
    type: filters.value.type,
    practiceType: filters.value.type,
    status: filters.value.status,
    keyword: filters.value.keyword,
  }
}

function applyFilters() {
  fetchListWithParams(buildQueryParams())
}

onMounted(() => {
  fetchListWithParams({})
  void mentorNavBadges?.refreshMockBadge?.()
})
</script>

<style scoped>
.stats-grid{margin-bottom:20px}
.stat-card{text-align:center;box-shadow:0 4px 24px rgba(115,153,198,0.12);border-radius:12px}
.stat-card :deep(.ant-card-body){padding:16px}
.stat-value{font-size:28px;font-weight:700}
.stat-label{font-size:12px;color:#94A3B8}
.filter-bar :deep(.ant-form-item){margin-bottom:0;margin-right:12px}
.student-cell{display:flex;align-items:center;gap:10px}
.avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:12px}
.pulse-tag{animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
:deep(.row-new) > td{background:linear-gradient(90deg,#FEE2E2,#FEF2F2) !important}
:deep(.row-new) > td:first-child{border-left:4px solid #EF4444}
:deep(.row-midterm) > td{background:#F3E8FF !important}
.btn-confirm{background:#22C55E !important;border-color:#22C55E !important}
.btn-confirm:hover{background:#16A34A !important;border-color:#16A34A !important}
.text-muted{color:#94A3B8}
.text-sm{font-size:11px}
.text-success{color:#059669}
.text-warning{color:#F59E0B}
.modal-detail{background:#fff;border-radius:20px;overflow:hidden}
.modal-header{padding:20px 24px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;display:flex;align-items:center;justify-content:space-between}
.modal-title{display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700}
.modal-close{width:36px;height:36px;border:none;border-radius:10px;background:rgba(255,255,255,0.16);color:#fff;font-size:20px;cursor:pointer}
.modal-body{padding:24px}
.modal-detail-body{padding:0 24px 24px}
.modal-footer{padding:16px 24px;display:flex;justify-content:flex-end;border-top:1px solid #E2E8F0}
.detail-hero{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;padding:20px 0 12px}
.detail-hero-card{background:linear-gradient(180deg,#F8FAFC,#EEF4FF);border:1px solid #E2E8F0;border-radius:16px;padding:16px}
.detail-hero-student{background:linear-gradient(180deg,#EFF6FF,#DBEAFE)}
.detail-hero-main{display:flex;align-items:center;gap:12px}
.detail-hero-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#3B82F6;color:#fff;font-weight:700;font-size:16px}
.detail-hero-name{font-size:16px;font-weight:700;color:#1E293B}
.detail-hero-title{font-size:16px;font-weight:700;color:#1E40AF;margin-bottom:4px}
.detail-hero-meta{font-size:12px;color:#64748B;line-height:1.6}
.section-caption{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#1E293B;margin-bottom:12px}
.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.detail-grid-compact{grid-template-columns:repeat(4,minmax(0,1fr))}
.detail-item{background:#F8FAFC;border-radius:12px;padding:16px}
.detail-label{display:block;font-size:12px;font-weight:600;color:#64748B;margin-bottom:6px}
.detail-value{font-size:14px;color:#1E293B;line-height:1.6}
.detail-section{margin-top:20px}
.detail-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.section-action{padding:0;color:#7399C6}
.record-list{display:flex;flex-direction:column;gap:10px}
.record-item{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px}
.record-date{font-size:12px;font-weight:700;color:#64748B;margin-bottom:4px}
.record-body{font-size:13px;color:#334155;line-height:1.6}
.detail-note{background:#FFFBEB;border-radius:12px;padding:14px 16px;font-size:13px;color:#92400E;line-height:1.7}
</style>
