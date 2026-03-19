<template>
  <div class="student-positions-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          学生自添岗位
          <span class="page-title-en">Student Added Positions</span>
        </h2>
        <p class="page-subtitle">审核学生手动添加的岗位，通过后加入公共岗位库</p>
      </div>
      <div class="page-header__actions">
        <span class="student-positions-page__badge">{{ pendingCount }} 条待审核</span>
        <span class="student-positions-page__badge student-positions-page__badge--ghost">{{ coachingCount }} 条带辅导申请</span>
      </div>
    </div>

    <section class="permission-card student-positions-panel">
      <div class="student-positions-toolbar">
        <label class="student-positions-field">
          <span>状态</span>
          <select v-model="filters.status" class="student-positions-select">
            <option value="pending">待审核</option>
            <option value="">全部</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
        </label>
        <label class="student-positions-field">
          <span>公司类别</span>
          <select v-model="filters.positionCategory" class="student-positions-select">
            <option value="">全部</option>
            <option v-for="option in companyCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="student-positions-field">
          <span>辅导申请</span>
          <select v-model="filters.hasCoachingRequest" class="student-positions-select">
            <option value="">全部</option>
            <option value="yes">有辅导申请</option>
            <option value="no">无辅导申请</option>
          </select>
        </label>
        <label class="student-positions-field student-positions-field--search">
          <span>搜索</span>
          <input
            v-model="filters.keyword"
            type="text"
            class="student-positions-input"
            placeholder="搜索公司/岗位..."
          />
        </label>
        <div class="student-positions-toolbar__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">
            搜索
          </button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">
            重置
          </button>
        </div>
      </div>

      <div v-if="loading" class="student-positions-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载学生自添岗位...</span>
      </div>

      <div v-else class="permission-card__body permission-card__body--flush">
        <table class="permission-table student-positions-table">
          <thead>
            <tr>
              <th>公司 / 岗位</th>
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
              :class="{ 'student-positions-row--pending': record.status === 'pending' }"
            >
              <td>
                <div class="student-positions-company">
                  <div class="student-positions-company__logo">{{ getCompanyInitials(record.companyName) }}</div>
                  <div class="student-positions-company__copy">
                    <strong>{{ record.companyName }}</strong>
                    <span>
                      {{ record.positionName }}
                      <template v-if="record.city">· {{ record.city }}</template>
                    </span>
                    <a
                      v-if="record.positionUrl"
                      :href="record.positionUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="student-positions-company__link"
                    >
                      查看岗位链接
                    </a>
                  </div>
                </div>
              </td>
              <td>
                <div class="student-positions-tags">
                  <span class="student-positions-tag student-positions-tag--category">
                    {{ formatCategory(record.positionCategory) }}
                  </span>
                  <span
                    v-if="record.hasCoachingRequest === 'yes'"
                    class="student-positions-tag student-positions-tag--coaching"
                  >
                    有辅导申请
                  </span>
                </div>
              </td>
              <td>
                <div class="student-positions-student">
                  <strong>{{ record.studentName || '未命名学生' }}</strong>
                  <span>ID {{ record.studentId }}</span>
                </div>
              </td>
              <td>
                <div class="student-positions-time">
                  <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
                  <span>{{ formatDateTime(record.submittedAt) }}</span>
                </div>
              </td>
              <td>
                <span :class="['student-positions-tag', `student-positions-tag--${getStatusTone(record.status)}`]">
                  {{ formatStatus(record.status) }}
                </span>
              </td>
              <td>
                <button type="button" class="student-positions-action" @click="openReviewModal(record)">
                  {{ record.status === 'pending' ? '审核 / 编辑' : '查看结果' }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="student-positions-empty">当前筛选条件下暂无学生自添岗位</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="student-positions-note">
      <span class="mdi mdi-information-outline" aria-hidden="true"></span>
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
  type ReviewStudentPositionPayload,
  type StudentPositionListItem,
  type StudentPositionListParams,
  type RejectStudentPositionPayload
} from '@osg/shared/api/admin/studentPosition'
import ReviewPositionModal from './components/ReviewPositionModal.vue'
import RejectPositionModal from './components/RejectPositionModal.vue'

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

const pendingCount = computed(() => rows.value.filter(item => item.status === 'pending').length)
const coachingCount = computed(() => rows.value.filter(item => item.hasCoachingRequest === 'yes').length)

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

const openRejectModal = () => {
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
  const value = (companyName || 'OS').trim()
  return value.slice(0, 2).toUpperCase()
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

const formatStatus = (value?: string) => {
  if (value === 'approved') {
    return '已通过'
  }
  if (value === 'rejected') {
    return '已拒绝'
  }
  return '待审核'
}

const getStatusTone = (value?: string) => {
  if (value === 'approved') {
    return 'approved'
  }
  if (value === 'rejected') {
    return 'rejected'
  }
  return 'pending'
}

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return '刚刚提交'
  }

  const submitted = new Date(value).getTime()
  if (Number.isNaN(submitted)) {
    return '刚刚提交'
  }

  const diffHours = Math.max(0, Math.floor((Date.now() - submitted) / (1000 * 60 * 60)))
  if (diffHours < 1) {
    return '1 小时内'
  }
  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }
  return `${Math.floor(diffHours / 24)} 天前`
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return '--'
  }
  return value.replace('T', ' ').slice(0, 16)
}
</script>

<style scoped lang="scss">
.permission-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border, #e2e8f0);
  padding: 20px;
}

.permission-card__body--flush {
  overflow-x: auto;
  margin: 0 -20px;
}

.student-positions-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.student-positions-page__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(254, 243, 199, 0.9);
  color: #9a3412;
  font-size: 13px;
  font-weight: 600;
}

.student-positions-page__badge--ghost {
  background: rgba(219, 234, 254, 0.9);
  color: #1d4ed8;
}

.student-positions-panel {
  overflow: hidden;
}

.student-positions-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 14px;
  padding: 22px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.student-positions-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-positions-field--search {
  min-width: 0;
}

.student-positions-field span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-positions-select,
.student-positions-input {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  font-size: 14px;
}

.student-positions-toolbar__actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.student-positions-loading,
.student-positions-empty {
  padding: 32px;
  text-align: center;
  color: #64748b;
}

.student-positions-table tr.student-positions-row--pending {
  background: rgba(254, 243, 199, 0.34);
}

.student-positions-company {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.student-positions-company__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, #1d4ed8, #2563eb);
  color: #eff6ff;
  font-size: 14px;
  font-weight: 700;
}

.student-positions-company__copy,
.student-positions-student,
.student-positions-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-positions-company__copy span,
.student-positions-student span,
.student-positions-time span {
  color: #64748b;
  font-size: 12px;
}

.student-positions-company__link {
  color: #2563eb;
  font-size: 11px;
  text-decoration: none;
}

.student-positions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.student-positions-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.student-positions-tag--category {
  background: rgba(219, 234, 254, 0.92);
  color: #1d4ed8;
}

.student-positions-tag--coaching {
  background: rgba(224, 231, 255, 0.92);
  color: #4338ca;
}

.student-positions-tag--pending {
  background: rgba(254, 243, 199, 0.92);
  color: #9a3412;
}

.student-positions-tag--approved {
  background: rgba(220, 252, 231, 0.96);
  color: #166534;
}

.student-positions-tag--rejected {
  background: rgba(254, 226, 226, 0.96);
  color: #b91c1c;
}

.student-positions-action {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #93c5fd;
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.96);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.student-positions-note {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  background: #eff6ff;
  color: #1d4ed8;
}

.student-positions-note .mdi {
  margin-top: 2px;
  font-size: 20px;
}

.student-positions-note strong {
  display: block;
  margin-bottom: 4px;
}

.student-positions-note p {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

@media (max-width: 1080px) {
  .student-positions-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .student-positions-toolbar {
    grid-template-columns: 1fr;
  }

  .student-positions-toolbar__actions {
    align-items: stretch;
  }

  .student-positions-note {
    grid-template-columns: 1fr;
  }
}
</style>
