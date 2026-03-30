<template>
  <div class="student-positions-page student-positions-shell">
    <div class="page-header student-positions-header">
      <div class="student-positions-header__copy">
        <h2 class="page-title">
          学生自添岗位
          <span class="page-title-en">Student Added Positions</span>
        </h2>
        <p class="page-subtitle">审核学生手动添加的岗位，通过后加入公共岗位库</p>
      </div>

      <div class="student-positions-header__meta">
        <span class="student-positions-header__pill student-positions-header__pill--pending">{{ pendingCount }} 条待审核</span>
        <span class="student-positions-header__pill student-positions-header__pill--accent">{{ coachingCount }} 条有辅导申请</span>
      </div>
    </div>

    <section class="student-positions-frame">
      <div class="student-positions-filterbar">
        <select v-model="filters.status" class="student-positions-filterbar__control" aria-label="状态" data-field-name="状态">
          <option value="pending">待审核</option>
          <option value="">全部状态</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>

        <select v-model="filters.positionCategory" class="student-positions-filterbar__control" aria-label="岗位分类" data-field-name="类别">
          <option value="">全部类别</option>
          <option v-for="option in companyCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.hasCoachingRequest" class="student-positions-filterbar__control" aria-label="辅导申请" data-field-name="辅导申请">
          <option value="">有无辅导申请</option>
          <option value="yes">有辅导申请</option>
          <option value="no">无辅导申请</option>
        </select>

        <label class="student-positions-filterbar__search" data-field-name="搜索框">
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <input
            v-model="filters.keyword"
            type="text"
            placeholder="搜索公司或岗位名称"
            @keydown.enter.prevent="handleSearch"
          />
        </label>

        <div class="student-positions-filterbar__actions">
          <button type="button" class="student-positions-filterbar__button" @click="handleSearch">搜索</button>
          <button type="button" class="student-positions-filterbar__button student-positions-filterbar__button--ghost" @click="handleReset">
            重置
          </button>
        </div>
      </div>

      <div v-if="loading" class="student-positions-empty">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载学生自添岗位...</span>
      </div>

      <div v-else class="student-positions-datatable-wrap">
        <table class="student-positions-datatable student-positions-table">
          <thead>
            <tr>
              <th>公司/岗位</th>
              <th>岗位分类</th>
              <th>提交学生</th>
              <th>提交时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in rows"
              :key="record.studentPositionId"
              :class="[
                'student-positions-datatable__row',
                { 'student-positions-datatable__row--pending': record.status === 'pending' }
              ]"
            >
              <td>
                <div class="student-positions-company">
                  <div :class="['student-positions-company__logo', `student-positions-company__logo--${getCompanyTone(record.companyName)}`]">
                    {{ getCompanyInitials(record.companyName) }}
                  </div>
                  <div class="student-positions-company__copy">
                    <strong>{{ record.companyName }}</strong>
                    <span>{{ record.positionName }}<template v-if="record.city"> · {{ record.city }}</template></span>
                    <a
                      v-if="record.positionUrl"
                      :href="record.positionUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="student-positions-company__link"
                    >
                      <i class="mdi mdi-link-variant" aria-hidden="true"></i>
                      <span>{{ simplifyLink(record.positionUrl) }}</span>
                    </a>
                  </div>
                </div>
              </td>
              <td>
                <div class="student-positions-tags">
                  <span :class="['student-positions-tag', `student-positions-tag--${getCategoryTone(record.positionCategory)}`]">
                    {{ formatCategory(record.positionCategory) }}
                  </span>
                  <span v-if="record.hasCoachingRequest === 'yes'" class="student-positions-tag student-positions-tag--coaching">
                    有辅导申请
                  </span>
                </div>
              </td>
              <td>
                <div class="student-positions-student">
                  <strong>{{ record.studentName || '未命名学生' }}</strong>
                  <span>ID: {{ record.studentId }}</span>
                </div>
              </td>
              <td>
                <div class="student-positions-time">
                  <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
                  <span>{{ formatDateTime(record.submittedAt) }}</span>
                </div>
              </td>
              <td>
                <span :class="['student-positions-tag', `student-positions-tag--status-${getStatusTone(record.status)}`]">
                  {{ formatStatus(record.status) }}
                </span>
              </td>
              <td>
                <div class="student-positions-datatable__actions">
                  <button
                    type="button"
                    class="student-positions-datatable__action"
                    data-surface-trigger="modal-edit-student-position"
                    :data-surface-sample-key="`student-position-${record.studentPositionId}`"
                    @click="openReviewModal(record)"
                  >
                    <i class="mdi mdi-pencil-outline" aria-hidden="true"></i>
                    <span>学生自添岗位编辑</span>
                  </button>
                  <button
                    v-if="record.status === 'pending'"
                    type="button"
                    class="student-positions-datatable__action student-positions-datatable__action--danger"
                    data-surface-trigger="modal-reject-position"
                    :data-surface-sample-key="`student-position-${record.studentPositionId}`"
                    @click="openRejectModal(record)"
                  >
                    <i class="mdi mdi-close-octagon-outline" aria-hidden="true"></i>
                    <span>拒绝岗位</span>
                  </button>
                  <button
                    v-if="record.status !== 'pending'"
                    type="button"
                    class="student-positions-datatable__action student-positions-datatable__action--ghost"
                    @click="openReviewModal(record)"
                  >
                    <i class="mdi mdi-eye-outline" aria-hidden="true"></i>
                    <span>查看结果</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="student-positions-empty student-positions-empty--inline">当前筛选条件下暂无学生自添岗位</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="student-positions-footnote student-positions-note">
      <i class="mdi mdi-information-outline" aria-hidden="true"></i>
      <div>
        <strong>审核说明</strong>
        <p>岗位通过后将加入公共岗位库，其他学生可见。有辅导申请的岗位通过后，辅导申请将自动流转到班主任端进行导师分配。</p>
      </div>
    </section>

    <ReviewPositionModal
      v-model:visible="reviewVisible"
      :position="selectedRecord"
      @submit="handleApprove"
      @request-reject="openRejectModal"
    />

    <RejectPositionModal
      v-model:visible="rejectVisible"
      :position="selectedRecord"
      @submit="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  approveStudentPosition,
  getStudentPositionList,
  rejectStudentPosition,
  type RejectStudentPositionPayload,
  type ReviewStudentPositionPayload,
  type StudentPositionListItem,
  type StudentPositionListParams
} from '@osg/shared/api/admin/studentPosition'
import RejectPositionModal from './components/RejectPositionModal.vue'
import ReviewPositionModal from './components/ReviewPositionModal.vue'

const companyCategoryOptions = [
  { value: 'Investment Bank', label: 'Investment Bank' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Tech', label: 'Tech' },
  { value: 'PE/VC', label: 'PE/VC' }
]

const rows = ref<StudentPositionListItem[]>([])
const loading = ref(false)
const reviewVisible = ref(false)
const rejectVisible = ref(false)
const selectedRecord = ref<StudentPositionListItem | null>(null)

const filters = reactive<StudentPositionListParams>({
  status: 'pending',
  positionCategory: '',
  hasCoachingRequest: '',
  keyword: ''
})

const pendingCount = computed(() => rows.value.filter((item) => item.status === 'pending').length)
const coachingCount = computed(() => rows.value.filter((item) => item.hasCoachingRequest === 'yes').length)

const companyTones = ['amber', 'blue', 'slate', 'violet'] as const

const loadRows = async () => {
  loading.value = true
  try {
    const response = await getStudentPositionList(filters)
    rows.value = response.rows || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRows()
})

const handleSearch = () => {
  void loadRows()
}

const handleReset = () => {
  filters.status = 'pending'
  filters.positionCategory = ''
  filters.hasCoachingRequest = ''
  filters.keyword = ''
  void loadRows()
}

const openReviewModal = (record: StudentPositionListItem) => {
  selectedRecord.value = record
  reviewVisible.value = true
}

const openRejectModal = (record?: StudentPositionListItem) => {
  if (record) {
    selectedRecord.value = record
  }
  reviewVisible.value = false
  rejectVisible.value = true
}

const handleApprove = async (payload: ReviewStudentPositionPayload) => {
  if (!selectedRecord.value) {
    return
  }
  await approveStudentPosition(selectedRecord.value.studentPositionId, payload)
  reviewVisible.value = false
  message.success('学生自添岗位已通过审核')
  await loadRows()
}

const handleReject = async (payload: RejectStudentPositionPayload) => {
  if (!selectedRecord.value) {
    return
  }
  await rejectStudentPosition(selectedRecord.value.studentPositionId, payload)
  rejectVisible.value = false
  message.success('学生自添岗位已拒绝')
  await loadRows()
}

const getCompanyInitials = (companyName?: string) => {
  const normalized = (companyName || 'OS').trim()
  return normalized.slice(0, 3).toUpperCase()
}

const getCompanyTone = (companyName?: string) => {
  const normalized = (companyName || '').trim()
  const seed = Array.from(normalized).reduce((sum, current, index) => sum + current.charCodeAt(0) * (index + 1), 0)
  return companyTones[seed % companyTones.length]
}

const formatCategory = (value?: string) => {
  const mapping: Record<string, string> = {
    summer: '暑期实习',
    fulltime: '全职招聘',
    offcycle: '非常规周期',
    spring: '春季实习',
    events: '招聘活动'
  }
  return mapping[value || ''] || value || '-'
}

const getCategoryTone = (value?: string) => {
  if (value === 'fulltime') return 'violet'
  if (value === 'offcycle') return 'amber'
  if (value === 'spring') return 'mint'
  return 'blue'
}

const formatStatus = (value?: string) => {
  if (value === 'approved') return '已通过'
  if (value === 'rejected') return '已拒绝'
  return '待审核'
}

const getStatusTone = (value?: string) => {
  if (value === 'approved') return 'approved'
  if (value === 'rejected') return 'rejected'
  return 'pending'
}

const formatRelativeTime = (value?: string) => {
  if (!value) return '刚刚提交'

  const submitted = new Date(value).getTime()
  if (Number.isNaN(submitted)) return '刚刚提交'

  const diffHours = Math.max(0, Math.floor((Date.now() - submitted) / (1000 * 60 * 60)))
  if (diffHours < 1) return '1 小时内'
  if (diffHours < 24) return `${diffHours} 小时前`
  return `${Math.floor(diffHours / 24)} 天前`
}

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 16)
}

const simplifyLink = (value: string) => {
  try {
    const url = new URL(value)
    const summary = `${url.host}${url.pathname}`.replace(/\/$/, '')
    return summary.length > 30 ? `${summary.slice(0, 30)}...` : summary
  } catch {
    return value.length > 30 ? `${value.slice(0, 30)}...` : value
  }
}
</script>

<style scoped lang="scss">
.student-positions-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.student-positions-header {
  align-items: flex-start;
}

.student-positions-header__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.student-positions-header__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.student-positions-header__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.student-positions-header__pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.student-positions-header__pill--accent {
  background: #eff6ff;
  color: #1d4ed8;
}

.student-positions-frame {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  overflow: hidden;
}

.student-positions-filterbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
}

.student-positions-filterbar__control,
.student-positions-filterbar__search {
  min-height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
}

.student-positions-filterbar__control {
  min-width: 118px;
  padding: 0 10px;
}

.student-positions-filterbar__search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 168px;
  padding: 0 10px;
}

.student-positions-filterbar__search .mdi {
  color: #94a3b8;
  font-size: 14px;
}

.student-positions-filterbar__search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.student-positions-filterbar__actions {
  display: inline-flex;
  gap: 8px;
  margin-left: auto;
}

.student-positions-filterbar__button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-positions-filterbar__button--ghost {
  color: #64748b;
}

.student-positions-datatable-wrap {
  overflow-x: auto;
}

.student-positions-datatable {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 860px;
  font-size: 13px;
}

.student-positions-datatable thead th {
  padding: 13px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.student-positions-datatable td {
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.student-positions-datatable__row--pending {
  background: #fef3c7;
}

.student-positions-company {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.student-positions-company__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.student-positions-company__logo--amber {
  background: #f59e0b;
}

.student-positions-company__logo--blue {
  background: #3b82f6;
}

.student-positions-company__logo--slate {
  background: #64748b;
}

.student-positions-company__logo--violet {
  background: #8b5cf6;
}

.student-positions-company__copy,
.student-positions-student,
.student-positions-time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-positions-company__copy strong,
.student-positions-student strong,
.student-positions-time strong {
  color: #0f172a;
  font-size: 13px;
}

.student-positions-company__copy span,
.student-positions-student span,
.student-positions-time span {
  color: #64748b;
  font-size: 11px;
}

.student-positions-company__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #3b82f6;
  font-size: 10px;
  text-decoration: none;
}

.student-positions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.student-positions-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.student-positions-tag--blue {
  background: #dbeafe;
  color: #1e40af;
}

.student-positions-tag--violet {
  background: #f3e8ff;
  color: #7c3aed;
}

.student-positions-tag--amber {
  background: #fef3c7;
  color: #92400e;
}

.student-positions-tag--mint {
  background: #dcfce7;
  color: #166534;
}

.student-positions-tag--coaching {
  background: #eef2ff;
  color: #4f46e5;
}

.student-positions-tag--status-pending {
  background: #fef3c7;
  color: #92400e;
}

.student-positions-tag--status-approved {
  background: #dcfce7;
  color: #166534;
}

.student-positions-tag--status-rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.student-positions-datatable__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
}

.student-positions-datatable__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.student-positions-datatable__action--danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.student-positions-datatable__action--ghost {
  border-style: dashed;
  color: #64748b;
}

.student-positions-footnote {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
}

.student-positions-footnote .mdi {
  font-size: 16px;
  margin-top: 1px;
}

.student-positions-footnote strong {
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
}

.student-positions-footnote p {
  margin: 0;
  color: #334155;
  font-size: 12px;
  line-height: 1.6;
}

.student-positions-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  color: #64748b;
  font-size: 13px;
}

.student-positions-empty--inline {
  min-height: 0;
  padding: 24px 0;
}

@media (max-width: 960px) {
  .student-positions-filterbar__actions {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .student-positions-shell {
    gap: 14px;
  }

  .student-positions-header__meta {
    width: 100%;
  }

  .student-positions-filterbar {
    flex-direction: column;
    align-items: stretch;
  }

  .student-positions-filterbar__actions {
    width: 100%;
  }

  .student-positions-filterbar__button {
    flex: 1;
  }

  .student-positions-footnote {
    grid-template-columns: 1fr;
  }
}
</style>
