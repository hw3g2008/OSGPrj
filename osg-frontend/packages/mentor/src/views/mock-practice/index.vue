<template>
  <div id="page-mock-practice">
    <div class="page-header">
      <div>
        <h1 class="page-title">模拟应聘管理 <span class="page-title-en">Mock Practice</span></h1>
        <p class="page-sub">查看分配给我的模拟面试、人际关系测试、期中考试</p>
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:#EF4444">{{ stats.newCount }}</div><div class="stat-label">新分配</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#3B82F6">{{ stats.pendingCount }}</div><div class="stat-label">待进行</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#22C55E">{{ stats.completedCount }}</div><div class="stat-label">已完成</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#94A3B8">{{ stats.cancelledCount }}</div><div class="stat-label">已取消</div></div>
    </div>

    <!-- 列表 -->
    <div class="card">
      <div class="card-header">
        <div class="filter-bar">
          <span class="filter-label">类型:</span>
          <select v-model="filters.type" class="filter-select" @change="applyFilters"><option value="">全部类型</option><option value="mock_interview">模拟面试</option><option value="relation_test">人际关系测试</option><option value="midterm">期中考试</option></select>
          <span class="filter-label">状态:</span>
          <select v-model="filters.status" class="filter-select" @change="applyFilters"><option value="">全部状态</option><option value="new">新分配</option><option value="pending">待进行</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select>
          <span class="filter-label">学员:</span>
          <input v-model="filters.keyword" type="text" placeholder="搜索学员姓名/ID" class="filter-input" @input="applyFilters" />
          <button class="btn btn-sm btn-primary" @click="applyFilters"><i class="mdi mdi-magnify" /> 筛选</button>
          <button class="btn btn-text btn-sm" @click="resetFilters"><i class="mdi mdi-refresh" /> 重置</button>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <table class="table">
          <thead><tr><th>学员</th><th>类型</th><th>分配时间</th><th>状态</th><th>已上课时</th><th>课程反馈</th></tr></thead>
          <tbody>
            <tr v-if="!filteredList.length">
              <td colspan="6">
                <div class="empty-state">暂无匹配的模拟应聘记录</div>
              </td>
            </tr>
            <tr v-for="r in filteredList" :id="rowDomId(r)" :key="r.id" :class="rowClass(r)">
              <td><div class="student-cell"><div class="avatar" :style="{ background: avatarColor(r) }">{{ r.studentName?.[0] || '?' }}</div><div><strong>{{ r.studentName }}</strong><br/><span class="text-muted text-sm">ID: {{ r.studentId }}</span></div></div></td>
              <td><span class="tag" :class="typeClass(r.practiceType)"><i :class="typeIcon(r.practiceType)" /> {{ typeLabel(r.practiceType) }}</span></td>
              <td><span class="text-sm">{{ formatDate(r.assignedTime) }}</span></td>
              <td>
                <span v-if="r.status === 'new'" class="tag pulse-tag"><i class="mdi mdi-bell-ring" /> 新分配</span>
                <span v-else-if="r.status === 'pending'" class="tag info">待进行</span>
                <span v-else-if="r.status === 'completed'" class="tag success">已完成</span>
                <span v-else-if="r.status === 'cancelled'" class="tag">已取消</span>
                <span v-else class="text-muted">{{ r.status }}</span>
              </td>
              <td><span v-if="r.totalHours" style="font-weight:600;color:#7399C6">{{ r.totalHours }}h</span><span v-else class="text-muted">-</span></td>
              <td>
                <template v-if="r.status === 'new'">
                  <button class="btn-confirm" @click="confirmMock(r)"><i class="mdi mdi-check" /> 确认</button>
                </template>
                <template v-else-if="r.status === 'completed' && r.feedbackLevel">
                  <div :class="feedbackColor(r.feedbackLevel)" style="font-size:12px;font-weight:500">{{ feedbackLabel(r.feedbackLevel) }}</div>
                  <div class="text-muted text-sm">{{ r.feedbackNote }}</div>
                </template>
                <template v-else>
                  <button class="btn btn-text btn-sm" @click="showDetail(r)">查看详情</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="detailModal.visible" id="modal-job-detail" class="modal active" @click.self="closeDetailModal">
      <div class="modal-content modal-detail">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-briefcase-search" /> 学员求职详情</span>
          <button class="modal-close" @click="closeDetailModal">×</button>
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
              <button class="btn btn-text btn-sm section-action" type="button">查看全部</button>
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
          <button class="btn btn-primary" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
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

function resetFilters() {
  filters.value = { type: '', status: '', keyword: '' }
  applyFilters()
}
function rowDomId(record: any) { return rowAnchors.value.get(record.practiceId ?? record.id) || '' }
function rowClass(r: any) { return { 'row-new': r.status === 'new', 'row-midterm': r.practiceType === 'midterm' } }
function avatarColor(r: any) { const c = ['#7399C6','#F59E0B','#3B82F6','#22C55E','#8B5CF6']; return c[(r.id ?? r.practiceId ?? 0) % c.length] }
function typeClass(t: string) { return { mock_interview: 'info', relation_test: 'warning', midterm: 'purple' }[t] || 'info' }
function typeIcon(t: string) { return { mock_interview: 'mdi mdi-account-voice', relation_test: 'mdi mdi-account-group', midterm: 'mdi mdi-file-document-edit' }[t] || '' }
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
.page-header{margin-bottom:24px}.page-title{font-size:26px;font-weight:700;color:#1E293B}.page-title-en{font-size:14px;color:#94A3B8;font-weight:400;margin-left:8px}.page-sub{font-size:14px;color:#64748B;margin-top:6px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}.stat-card{background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 4px 24px rgba(115,153,198,0.12)}.stat-value{font-size:28px;font-weight:700}.stat-label{font-size:12px;color:#94A3B8}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(115,153,198,0.12);margin-bottom:20px}.card-header{padding:12px 16px;border-bottom:1px solid #E2E8F0}.card-body{padding:22px}
.filter-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.filter-label{font-size:12px;color:#94A3B8}.filter-select{padding:4px 8px;border:1px solid #E2E8F0;border-radius:4px;font-size:12px}.filter-input{padding:4px 8px;border:1px solid #E2E8F0;border-radius:4px;font-size:12px;width:140px}
.table{width:100%;border-collapse:collapse;font-size:13px}.table th,.table td{padding:14px 16px;text-align:left;border-bottom:1px solid #E2E8F0}.table th{font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase;background:#F8FAFC}
.empty-state{padding:28px 16px;text-align:center;color:#94A3B8;font-size:14px}
.student-cell{display:flex;align-items:center;gap:10px}.avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:12px}
.tag{display:inline-flex;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;align-items:center;gap:4px}.tag.info{background:#DBEAFE;color:#1E40AF}.tag.warning{background:#FEF3C7;color:#92400E}.tag.success{background:#D1FAE5;color:#065F46}.tag.purple{background:#F3E8FF;color:#7C3AED}
.pulse-tag{background:#EF4444;color:#fff;animation:pulse 1.5s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.row-new{background:linear-gradient(90deg,#FEE2E2,#FEF2F2);border-left:4px solid #EF4444}.row-midterm{background:#F3E8FF}
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#7399C6;color:#fff}.btn-text{background:transparent;color:#7399C6;padding:6px 12px}.btn-sm{padding:4px 12px;font-size:12px}
.btn-confirm{background:#22C55E;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px}
.text-muted{color:#94A3B8}.text-sm{font-size:11px}.text-success{color:#059669}.text-warning{color:#F59E0B}
.modal{position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.modal-content{width:min(640px,100%);background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,0.2)}
.modal-detail{width:min(760px,100%)}
.modal-header{padding:20px 24px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;display:flex;align-items:center;justify-content:space-between}
.modal-title{display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700}
.modal-close{width:36px;height:36px;border:none;border-radius:10px;background:rgba(255,255,255,0.16);color:#fff;font-size:20px;cursor:pointer}
.modal-body{padding:24px}
.modal-detail-body{padding:0 24px 24px}
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
.detail-panel{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;color:#334155;line-height:1.7;white-space:pre-wrap}
</style>
