<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">课程记录 <span class="page-title-en">Class Records</span></h1>
        <p class="page-sub">查看和上报课程记录</p>
      </div>
      <button class="btn btn-primary" @click="showReportModal = true"><i class="mdi mdi-plus" /> 上报课程记录</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
        <span v-if="tab.badge" class="tag warning" style="margin-left:4px">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <div class="card-body">
        <div class="filter-bar">
          <input v-model="filters.keyword" class="form-input" placeholder="搜索学员姓名/ID..." style="width:180px" />
          <select v-model="filters.coachingType" class="form-select filter-select">
            <option value="">辅导类型</option>
            <option value="job_coaching">岗位辅导</option>
            <option value="mock_interview">模拟应聘</option>
          </select>
          <select v-model="filters.contentType" class="form-select filter-select">
            <option value="">课程内容</option>
            <option v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct }}</option>
          </select>
          <select v-model="filters.timeRange" class="form-select filter-select">
            <option value="">时间范围</option>
            <option value="this_week">本周</option>
            <option value="last_week">上周</option>
            <option value="this_month">本月</option>
          </select>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><i class="mdi mdi-filter-variant" /> 重置</button>
        </div>
      </div>
      <!-- 表格 -->
      <div class="card-body" style="padding:0">
        <table class="table">
          <thead>
            <tr><th>记录ID</th><th>学员</th><th>辅导内容</th><th>课程内容</th><th>上课日期</th><th>时长</th><th>课时费</th><th>审核状态</th><th>学员评价</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRecords" :key="r.id">
              <td>{{ r.recordNo }}</td>
              <td><strong>{{ r.studentName || '学员' }}</strong><br/><span class="text-muted text-sm">ID: {{ r.studentId }}</span></td>
              <td><span class="tag" :class="coachingTagClass(r.coachingType)">{{ coachingLabel(r.coachingType) }}</span><br/><span class="text-sm">{{ r.contentDetail || '' }}</span></td>
              <td><span class="tag" :class="contentTagClass(r.contentType)">{{ r.contentType }}</span></td>
              <td>{{ formatDate(r.classDate) }}</td>
              <td>{{ r.durationHours }}h</td>
              <td>¥{{ r.totalFee }}</td>
              <td><span class="tag" :class="statusClass(r.reviewStatus)">{{ statusLabel(r.reviewStatus) }}</span></td>
              <td>
                <span v-if="r.studentEvaluation" class="tag success">⭐ {{ r.studentEvaluation }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <button v-if="r.reviewStatus === 'rejected'" class="btn btn-text btn-sm" @click="showReject(r)">查看原因</button>
                <button v-else class="btn btn-text btn-sm" @click="showDetail(r)">查看详情</button>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0"><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上报弹窗 -->
    <ReportModal v-if="showReportModal" @close="showReportModal = false" @submitted="onReportSubmitted" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '@osg/shared/utils/request'
import ReportModal from './components/ReportModal.vue'

const activeTab = ref('all')
const showReportModal = ref(false)
const records = ref<any[]>([])
const filters = ref({ keyword: '', coachingType: '', contentType: '', timeRange: '' })
const contentTypes = ['新简历', '简历更新', 'Case准备', '模拟面试', '人际关系期中考试', '模拟期中考试', 'Behavioral', 'Technical', '其他']

const tabs = computed(() => {
  const pending = records.value.filter(r => r.reviewStatus === 'pending').length
  return [
    { key: 'all', label: '全部', badge: 0 },
    { key: 'pending', label: '待审核', badge: pending || 0 },
    { key: 'approved', label: '已通过', badge: 0 },
    { key: 'rejected', label: '已驳回', badge: 0 },
  ]
})

const filteredRecords = computed(() => {
  let list = records.value
  if (activeTab.value !== 'all') list = list.filter(r => r.reviewStatus === activeTab.value)
  if (filters.value.coachingType) list = list.filter(r => r.coachingType === filters.value.coachingType)
  if (filters.value.contentType) list = list.filter(r => r.contentType === filters.value.contentType)
  return list
})

function resetFilters() { filters.value = { keyword: '', coachingType: '', contentType: '', timeRange: '' } }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '' }
function coachingLabel(t: string) { return { job_coaching: '岗位辅导', mock_interview: '模拟应聘', networking: '人际关系', mock_midterm: '模拟期中', basic: '基础课程' }[t] || t }
function coachingTagClass(t: string) { return { job_coaching: 'info', mock_interview: 'success', networking: 'purple', mock_midterm: 'warning' }[t] || 'info' }
function contentTagClass(_t: string) { return 'info' }
function statusClass(s: string) { return { pending: 'warning', approved: 'success', rejected: 'danger' }[s] || '' }
function statusLabel(s: string) { return { pending: '待审核', approved: '已通过', rejected: '已驳回' }[s] || s }
function showDetail(_r: any) { /* TODO: detail modal */ }
function showReject(_r: any) { /* TODO: reject reason modal */ }

async function fetchRecords() {
  try {
    const res = await http.get('/api/mentor/class-records/list')
    records.value = res.rows || []
  } catch { records.value = [] }
}

function onReportSubmitted() { showReportModal.value = false; fetchRecords() }

onMounted(fetchRecords)
</script>

<style scoped>
.page-header { margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; }
.page-title { font-size:26px; font-weight:700; color:#1E293B; }
.page-title-en { font-size:14px; color:#94A3B8; font-weight:400; margin-left:8px; }
.page-sub { font-size:14px; color:#64748B; margin-top:6px; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-primary { background:linear-gradient(135deg,#7399C6,#9BB8D9); color:#fff; box-shadow:0 4px 12px rgba(115,153,198,0.3); }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.btn-text { background:transparent; color:#7399C6; padding:6px 12px; }
.btn-sm { padding:6px 12px; font-size:13px; }
.tabs { display:inline-flex; background:#F8FAFC; border-radius:12px; padding:4px; margin-bottom:20px; }
.tab { padding:10px 20px; border:none; background:transparent; font-size:14px; color:#64748B; cursor:pointer; border-radius:10px; font-weight:500; }
.tab.active { background:#fff; color:#7399C6; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.card { background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); margin-bottom:20px; }
.card-body { padding:22px; }
.filter-bar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
.form-input { padding:12px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
.form-input:focus { border-color:#7399C6; box-shadow:0 0 0 4px #E8F0F8; }
.form-select { padding:10px 36px 10px 12px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; background:#fff; appearance:none; cursor:pointer; }
.filter-select { width:auto; min-width:max-content; }
.table { width:100%; border-collapse:collapse; }
.table th,.table td { padding:14px 16px; text-align:left; border-bottom:1px solid #E2E8F0; font-size:14px; }
.table th { font-weight:600; color:#64748B; font-size:12px; text-transform:uppercase; background:#F8FAFC; }
.table tbody tr:hover { background:#F8FAFC; }
.tag { display:inline-flex; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; }
.tag.success { background:#D1FAE5; color:#065F46; }
.tag.warning { background:#FEF3C7; color:#92400E; }
.tag.danger { background:#FEE2E2; color:#991B1B; }
.tag.info { background:#DBEAFE; color:#1E40AF; }
.tag.purple { background:#E8F0F8; color:#5A7BA3; }
.text-muted { color:#94A3B8; }
.text-sm { font-size:12px; }
</style>
