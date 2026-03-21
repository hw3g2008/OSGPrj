<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">学员求职总览 <span class="page-title-en">Job Overview</span></h1>
        <p class="page-sub">查看我辅导学员的求职进度</p>
      </div>
      <button class="btn btn-outline"><i class="mdi mdi-export" /> 导出</button>
    </div>

    <!-- 面试日历 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div class="calendar-bar">
          <div class="calendar-title"><i class="mdi mdi-calendar-month" /> 学员面试安排</div>
          <div class="calendar-days">
            <div v-for="d in weekDays" :key="d.day" class="calendar-day" :class="d.class" @click="d.hasEvent && (expandCalendar = !expandCalendar)">
              <div class="calendar-day-label">{{ d.label }}</div>
              <div class="calendar-day-num">{{ d.day }}</div>
            </div>
          </div>
          <button class="btn btn-text btn-sm" @click="expandCalendar = !expandCalendar">
            <i :class="expandCalendar ? 'mdi mdi-calendar-collapse-horizontal' : 'mdi mdi-calendar-expand-horizontal'" /> {{ expandCalendar ? '收起' : '展开' }}
          </button>
        </div>
      </div>
      <div v-if="expandCalendar" class="card-body" style="border-top:1px solid #E2E8F0;padding-top:16px">
        <div style="font-weight:600;font-size:13px;margin-bottom:12px"><i class="mdi mdi-calendar-clock" style="color:#7399C6;margin-right:6px" />本周学员面试安排</div>
        <div v-for="event in calendarEvents" :key="event.id" class="calendar-event" :style="{ borderLeftColor: event.color }">
          <div class="event-date"><div class="event-day">{{ event.day }}</div><div class="event-weekday">{{ event.weekday }}</div></div>
          <div class="event-info"><div class="event-title">{{ event.studentName }} - {{ event.company }} {{ event.stage }}</div><div class="event-time">{{ event.time }} · {{ event.position }} · {{ event.location }}</div></div>
        </div>
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:#EF4444">{{ stats.newCount }}</div><div class="stat-label">新分配</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#3B82F6">{{ stats.pendingCount }}</div><div class="stat-label">待进行</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#22C55E">{{ stats.completedCount }}</div><div class="stat-label">已完成</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#94A3B8">{{ stats.cancelledCount }}</div><div class="stat-label">已取消</div></div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <input v-model="filters.keyword" class="form-input" style="width:180px" placeholder="搜索学员姓名..." />
      <select v-model="filters.company" class="form-select"><option value="">全部公司</option><option v-for="c in companies" :key="c">{{ c }}</option></select>
      <select v-model="filters.status" class="form-select"><option value="">全部状态</option><option value="new">新分配</option><option value="coaching">辅导中</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select>
      <button class="btn btn-outline"><i class="mdi mdi-magnify" /> 搜索</button>
    </div>

    <!-- 列表 -->
    <div class="card">
      <div class="card-body" style="padding:0">
        <table class="table">
          <thead><tr><th>学员</th><th>公司/岗位</th><th>阶段</th><th>面试时间</th><th>辅导状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="r in filteredList" :key="r.id" :class="rowClass(r)">
              <td><div class="student-cell"><div class="avatar" :style="{ background: avatarColor(r) }">{{ r.studentName?.[0] || '?' }}</div><div><div class="student-name">{{ r.studentName }}</div><div class="text-muted text-sm">ID: {{ r.studentId }}</div></div></div></td>
              <td><div class="company-name" :style="{ color: r.coachingStatus === 'new' ? '#EF4444' : '' }">{{ r.company }}</div><div class="text-muted text-sm">{{ r.position }} · {{ r.location }}</div></td>
              <td><span class="tag" :class="stageClass(r)">{{ r.interviewStage || '-' }}</span></td>
              <td><div v-if="r.interviewTime" :class="{ 'text-danger': r.coachingStatus !== 'completed' }">{{ formatDate(r.interviewTime) }}</div><div v-else class="text-muted">-</div></td>
              <td>
                <span v-if="r.coachingStatus === 'new'" class="tag pulse-tag"><i class="mdi mdi-bell-ring" /> 新申请</span>
                <span v-else-if="r.coachingStatus === 'coaching'" class="tag coaching-tag"><i class="mdi mdi-school" /> 辅导中</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <button v-if="r.coachingStatus === 'new'" class="btn btn-confirm" @click="confirmJob(r)"><i class="mdi mdi-check" /> 确认</button>
                <span v-else class="text-muted">--</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '@osg/shared/utils/request'

const expandCalendar = ref(false)
const list = ref<any[]>([])
const calendarEvents = ref<any[]>([])
const filters = ref({ keyword: '', company: '', status: '' })
const companies = ['Goldman Sachs', 'JP Morgan', 'McKinsey', 'Google', 'Morgan Stanley']
const weekDays = ref([
  { label: '日', day: 26, class: 'today', hasEvent: false },
  { label: '一', day: 27, class: 'has-event warning-bg', hasEvent: true },
  { label: '二', day: 28, class: 'has-event danger-bg', hasEvent: true },
  { label: '三', day: 29, class: '', hasEvent: false },
  { label: '四', day: 30, class: 'has-event info-bg', hasEvent: true },
  { label: '五', day: 31, class: '', hasEvent: false },
  { label: '六', day: 1, class: '', hasEvent: false },
])

const stats = computed(() => {
  const s = { newCount: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0 }
  list.value.forEach(r => { if (r.coachingStatus === 'new') s.newCount++; else if (r.coachingStatus === 'coaching') s.pendingCount++; else if (r.coachingStatus === 'completed') s.completedCount++; else if (r.coachingStatus === 'cancelled') s.cancelledCount++ })
  return s
})

const filteredList = computed(() => {
  let l = list.value
  if (filters.value.status) l = l.filter(r => r.coachingStatus === filters.value.status)
  if (filters.value.company) l = l.filter(r => r.company === filters.value.company)
  return l
})

function fallbackStudentName(record: Record<string, any>) {
  if (record.studentName) {
    return record.studentName
  }
  if (record.studentId != null) {
    return `学员${record.studentId}`
  }
  return '待分配学员'
}

function normalizeJobOverview(record: Record<string, any>) {
  return {
    ...record,
    studentName: fallbackStudentName(record),
  }
}

function rowClass(r: any) { return { 'row-new': r.coachingStatus === 'new', 'row-coaching': r.coachingStatus === 'coaching', 'row-ended': r.result === 'offer' || r.result === 'rejected' } }
function avatarColor(r: any) { const colors = ['#7399C6','#EF4444','#22C55E','#3B82F6','#F59E0B']; return colors[r.id % colors.length] }
function stageClass(r: any) { return r.result === 'offer' ? 'success' : r.result === 'rejected' ? 'danger' : 'warning' }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

async function confirmJob(r: any) {
  try { await http.put(`/api/mentor/job-overview/${r.id}/confirm`); r.coachingStatus = 'coaching' } catch {}
}

onMounted(async () => {
  try {
    const res = await http.get('/api/mentor/job-overview/list')
    list.value = (res.rows || []).map((record: Record<string, any>) => normalizeJobOverview(record))
  } catch {}
  try {
    const res = await http.get('/api/mentor/job-overview/calendar')
    calendarEvents.value = (res || []).map((record: Record<string, any>) => ({
      ...record,
      studentName: fallbackStudentName(record),
    }))
  } catch {}
})
</script>

<style scoped>
.page-header { margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; }
.page-title { font-size:26px; font-weight:700; color:#1E293B; }
.page-title-en { font-size:14px; color:#94A3B8; font-weight:400; margin-left:8px; }
.page-sub { font-size:14px; color:#64748B; margin-top:6px; }
.card { background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); margin-bottom:20px; }
.card-body { padding:22px; }
.calendar-bar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.calendar-title { display:flex; align-items:center; gap:6px; font-weight:600; font-size:13px; color:#7399C6; }
.calendar-days { display:flex; gap:6px; flex:1; }
.calendar-day { text-align:center; padding:4px 8px; border-radius:6px; background:#F8FAFC; min-width:36px; cursor:default; }
.calendar-day.today { background:#7399C6; color:#fff; }
.calendar-day.warning-bg { background:#FEF3C7; cursor:pointer; }
.calendar-day.danger-bg { background:#FEE2E2; cursor:pointer; }
.calendar-day.info-bg { background:#DBEAFE; cursor:pointer; }
.calendar-day-label { font-size:9px; }
.calendar-day-num { font-size:14px; font-weight:700; }
.calendar-event { display:flex; align-items:center; gap:12px; padding:12px; background:#fff; border-radius:8px; border:1px solid #E2E8F0; border-left:4px solid; margin-bottom:10px; }
.event-date { min-width:50px; text-align:center; }
.event-day { font-size:20px; font-weight:700; }
.event-weekday { font-size:10px; color:#94A3B8; }
.event-title { font-weight:600; font-size:13px; }
.event-time { font-size:11px; color:#94A3B8; }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
.stat-card { background:#fff; border-radius:12px; padding:16px; text-align:center; box-shadow:0 4px 24px rgba(115,153,198,0.12); }
.stat-value { font-size:28px; font-weight:700; }
.stat-label { font-size:12px; color:#94A3B8; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.form-input { padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
.form-select { padding:10px 12px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; width:140px; }
.table { width:100%; border-collapse:collapse; font-size:13px; }
.table th,.table td { padding:14px 16px; text-align:left; border-bottom:1px solid #E2E8F0; }
.table th { font-weight:600; color:#64748B; font-size:12px; text-transform:uppercase; background:#F8FAFC; }
.student-cell { display:flex; align-items:center; gap:10px; }
.avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:600; font-size:12px; }
.student-name { font-weight:600; }
.company-name { font-weight:600; }
.tag { display:inline-flex; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:600; align-items:center; gap:2px; }
.tag.success { background:#D1FAE5; color:#065F46; }
.tag.warning { background:#FEF3C7; color:#92400E; }
.tag.danger { background:#FEE2E2; color:#991B1B; }
.pulse-tag { background:#EF4444; color:#fff; animation:pulse 1.5s ease-in-out infinite; }
.coaching-tag { background:#8B5CF6; color:#fff; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
.row-new { background:linear-gradient(90deg,#FEE2E2,#FEF2F2); border-left:4px solid #EF4444; }
.row-coaching { background:#F3E8FF; }
.row-ended { opacity:0.7; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.btn-text { background:transparent; color:#7399C6; padding:6px 12px; }
.btn-sm { padding:6px 12px; font-size:13px; }
.btn-confirm { background:#22C55E; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; }
.text-muted { color:#94A3B8; }
.text-sm { font-size:11px; }
.text-danger { color:#EF4444; font-weight:600; font-size:12px; }
</style>
