<template>
  <div id="page-home" class="page active dashboard-page">
    <div class="card student-profile-card">
      <div class="card-header">
        <span class="card-title">学员信息 Student Profile</span>
      </div>
      <div class="card-body">
        <div class="profile-grid">
          <div class="profile-avatar">{{ avatarInitials }}</div>
          <div>
            <h2 class="student-name">
              {{ profile.fullName || '-' }}
              <span class="student-id">ID: {{ profile.studentCode || '-' }}</span>
            </h2>
            <div class="student-meta-grid">
              <div><i class="mdi mdi-school" aria-hidden="true"></i>{{ profile.school }} · {{ profile.major }}</div>
              <div><i class="mdi mdi-calendar" aria-hidden="true"></i>{{ profile.graduationYear }}届毕业</div>
              <div><i class="mdi mdi-target" aria-hidden="true"></i><strong>主攻方向：</strong>{{ profile.primaryDirection }}</div>
              <div><i class="mdi mdi-email" aria-hidden="true"></i>{{ profile.email }}</div>
            </div>
          </div>
          <div class="mentor-section">
            <div class="mentor-label">
              <i class="mdi mdi-account-tie" aria-hidden="true"></i>
              我的导师团队 My Mentors
            </div>
            <div class="mentor-stack">
              <div>
                <div class="mentor-role">班主任 Lead Mentor</div>
                <div class="mentor-primary-card">
                  <div class="mentor-avatar">{{ leadMentorInitials }}</div>
                  <div>
                    <div class="mentor-name">{{ profile.leadMentor || '待分配' }}</div>
                    <div class="mentor-area">{{ profile.primaryDirection || '方向待更新' }}</div>
                  </div>
                </div>
              </div>
              <div>
                <div class="mentor-role">Support Team</div>
                <div class="mentor-tags">
                  <span class="tag purple">{{ profile.assistantName || 'Assistant Pending' }}</span>
                  <span class="tag info">{{ profile.targetRegion || 'Region Pending' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="analysis-hero">
      <div class="analysis-bar"></div>
      <div class="analysis-orb analysis-orb-lg"></div>
      <div class="analysis-orb analysis-orb-sm"></div>
      <div class="analysis-orb analysis-orb-bottom"></div>

      <div class="analysis-shell">
        <div class="analysis-header">
          <div>
            <div class="analysis-eyebrow">Learning Analysis Report</div>
            <h2>学情分析报告</h2>
          </div>
          <div class="analysis-updated">
            <i class="mdi mdi-clock-outline" aria-hidden="true"></i>
            {{ analysisUpdatedText }}
          </div>
        </div>

        <div class="analysis-grid">
          <div class="grade-card">
            <div class="grade-circle">
              <span>{{ performanceGrade }}</span>
            </div>
            <div class="grade-label">Overall Grade</div>
            <div class="grade-trend">
              <i class="mdi mdi-trending-up" aria-hidden="true"></i>
              {{ trendLabel }}
            </div>
          </div>

          <div class="analysis-copy">
            <p>
              当前共有 <strong>{{ applicationsMeta.tabCounts.ongoing }}</strong> 条进行中的求职记录，
              已完成 <strong>{{ summaryCards[0].value }}</strong> 条模拟应聘记录，
              待评价课程 <strong>{{ pendingClassCount }}</strong> 条，
              岗位池可见 <strong>{{ summaryCards[4].value }}</strong> 个岗位。
            </p>
            <div class="analysis-tags">
              <div class="focus-tag warning-tag">
                <div>Needs Work</div>
                <span>{{ analysisNeedsWork }}</span>
              </div>
              <div class="focus-tag success-tag">
                <div>Strengths</div>
                <span>{{ analysisStrengths }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="analysis-focus">
          <span class="focus-label">
            <i class="mdi mdi-target" aria-hidden="true"></i>
            Focus Areas
          </span>
          <div class="focus-pills">
            <span class="focus-pill focus-pill-success">
              {{ applicationsPreview[0]?.company || profile.primaryDirection || 'Primary Focus' }}
            </span>
            <span class="focus-pill focus-pill-warning">
              {{ profile.targetRegion || 'Target Region Pending' }}
            </span>
          </div>
        </div>

        <div class="rating-criteria">
          <div class="criteria-trigger">
            <i class="mdi mdi-information-outline" aria-hidden="true"></i>
            <span>View grading criteria</span>
            <i class="mdi mdi-chevron-down" aria-hidden="true"></i>
          </div>
          <div class="criteria-grid">
            <div class="criteria-card criteria-a">
              <div>A</div>
              <span>3+ active tracks</span>
            </div>
            <div class="criteria-card criteria-b">
              <div>B</div>
              <span>1-2 active tracks</span>
            </div>
            <div class="criteria-card criteria-c">
              <div>C</div>
              <span>Needs more input</span>
            </div>
            <div class="criteria-card criteria-d">
              <div>D</div>
              <span>No active records</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="stats-grid">
      <div v-for="stat in summaryCards" :key="stat.label" class="summary-card" :class="stat.tone">
        <div class="summary-glow"></div>
        <div class="summary-glow summary-glow-bottom"></div>
        <div class="summary-icon">
          <i class="mdi" :class="stat.iconClass" aria-hidden="true"></i>
        </div>
        <div class="summary-value">{{ stat.value }}</div>
        <div class="summary-label">{{ stat.label }}</div>
        <div class="summary-progress">
          <div class="summary-progress-fill" :style="{ width: stat.progress }"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">模拟面试得分 Mock Interview Scores</span>
        <span class="card-inline-hint">
          记录 <strong>{{ practiceRecords.length }}</strong>
        </span>
        <button type="button" class="header-link" @click="$router.push('/feedback')">查看全部 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>Mentor</th>
              <th>类型</th>
              <th>状态</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in mockScores" :key="`${row.date}-${row.mentor}-${row.type}`">
              <td>{{ row.date }}</td>
              <td>{{ row.mentor }}</td>
              <td>{{ row.type }}</td>
              <td class="score-cell" :class="row.scoreTone">{{ row.score }}</td>
              <td><span class="tag" :class="row.tagTone">{{ row.tag }}</span></td>
            </tr>
            <tr v-if="mockScores.length === 0">
              <td colspan="5" class="empty-cell">暂无模拟应聘记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">基础课进度 Foundation Progress</span>
      </div>
      <div class="card-body">
        <div class="progress-grid">
          <div v-for="item in foundationProgress" :key="item.label" class="progress-card">
            <div class="progress-row">
              <span class="progress-label">
                <i class="mdi" :class="item.iconClass" aria-hidden="true"></i>
                {{ item.label }}
              </span>
              <span class="progress-value">{{ item.progressText }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: item.width }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">简历详情 Resume Details</span>
        <span class="card-inline-hint">
          实时摘要 <strong>{{ resumeRows.length }}</strong>
        </span>
        <button type="button" class="header-link" @click="$router.push('/resume')">管理简历 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>版本</th>
              <th>文件名</th>
              <th>指导导师</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="resume in resumeRows" :key="resume.fileName">
              <td>
                <span v-if="resume.versionTone" class="tag" :class="resume.versionTone">
                  {{ resume.version }}
                </span>
                <span v-else>{{ resume.version }}</span>
              </td>
              <td>{{ resume.fileName }}</td>
              <td>{{ resume.mentor }}</td>
              <td>{{ resume.updatedAt }}</td>
              <td><button type="button" class="btn btn-text btn-sm" @click="$router.push('/resume')">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">真实面试记录 Real Interviews</span>
        <span class="card-inline-hint">
          累计 <strong>{{ applicationsPreview.length }}</strong> 次
        </span>
        <button type="button" class="header-link" @click="$router.push('/questions')">查看全部 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>公司</th>
              <th>办公室</th>
              <th>岗位</th>
              <th>项目</th>
              <th>轮次</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="interview in applicationsPreview" :key="`${interview.company}-${interview.position}`">
              <td>{{ interview.date }}</td>
              <td class="company-cell">{{ interview.company }}</td>
              <td>{{ interview.office }}</td>
              <td>{{ interview.role }}</td>
              <td>{{ interview.program }}</td>
              <td>{{ interview.round }}</td>
              <td><button type="button" class="btn btn-text btn-sm" @click="$router.push('/job-tracking')">详情</button></td>
            </tr>
            <tr v-if="applicationsPreview.length === 0">
              <td colspan="7" class="empty-cell">暂无真实面试记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mentor-notes-grid">
      <div v-for="note in mentorNotes" :key="note.title" class="card">
        <div class="card-header">
          <span class="card-title">{{ note.title }}</span>
          <span class="tag" :class="note.tagTone">Latest</span>
        </div>
        <div class="card-body">
          <div class="quote-box">
            <p>{{ note.copy }}</p>
          </div>
          <div class="note-meta">
            <span><i class="mdi mdi-account" aria-hidden="true"></i>{{ note.author }}</span>
            <span><i class="mdi mdi-calendar" aria-hidden="true"></i>{{ note.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">快捷操作 Quick Actions</span>
      </div>
      <div class="card-body">
        <div class="quick-actions">
          <button type="button" class="btn btn-primary" @click="$router.push('/courses')">
            <i class="mdi mdi-book-open-variant" aria-hidden="true"></i>
            我的课程
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/questions')">
            <i class="mdi mdi-file-document-edit" aria-hidden="true"></i>
            填写面试真题
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/netlog')">
            <i class="mdi mdi-account-group" aria-hidden="true"></i>
            填写沟通记录
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/positions')">
            <i class="mdi mdi-briefcase-search" aria-hidden="true"></i>
            岗位信息
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getStudentApplicationsMeta,
  getStudentClassRecordsMeta,
  getStudentMockPracticeOverview,
  getStudentPositionMeta,
  getStudentProfile,
  listStudentApplications,
  listStudentClassRecords,
  listStudentPositions,
  type StudentApplicationRecord,
  type StudentApplicationsMeta,
  type StudentClassRecord,
  type StudentClassRecordsMeta,
  type StudentMockPracticeOverview,
  type StudentPositionMeta,
  type StudentPositionRecord,
  type StudentProfileRecord,
} from '@osg/shared/api'

const profile = reactive<StudentProfileRecord>({
  studentCode: '-',
  fullName: '-',
  englishName: '-',
  email: '-',
  sexLabel: '-',
  statusLabel: '正常',
  leadMentor: '-',
  assistantName: '-',
  school: '-',
  major: '-',
  graduationYear: '-',
  highSchool: '-',
  postgraduatePlan: '否',
  visaStatus: '-',
  targetRegion: '-',
  recruitmentCycle: '-',
  primaryDirection: '-',
  secondaryDirection: '-',
  phone: '-',
  wechatId: '-',
})

const applicationsMeta = reactive<StudentApplicationsMeta>({
  pageSummary: {
    titleZh: '我的求职',
    titleEn: 'My Applications',
    subtitle: '查看您的岗位申请和面试安排',
  },
  tabCounts: {
    all: 0,
    applied: 0,
    ongoing: 0,
    completed: 0,
  },
  filterOptions: {
    progressStages: [],
    coachingStatuses: [],
    companyTypes: [],
    applyMethods: [],
  },
  schedule: [],
})

const classRecordsMeta = reactive<StudentClassRecordsMeta>({
  pageSummary: {
    titleZh: '课程记录',
    titleEn: 'Class Records',
    subtitle: '查看我的上课记录和导师反馈',
  },
  reminderBanner: {
    iconLabel: 'CR',
    title: '新增课程记录',
    leadText: '导师',
    mentorName: '-',
    middleText: '为您填报了',
    newRecordCount: 0,
    suffixText: '条新的上课记录，请及时评价',
    ctaLabel: '去评价',
  },
  tabDefinitions: [],
  filters: {
    keywordPlaceholder: '',
    coachingTypePlaceholder: '',
    courseContentPlaceholder: '',
    timeRangePlaceholder: '',
    resetLabel: '',
    coachingTypeOptions: [],
    courseContentOptions: [],
    timeRangeOptions: [],
  },
  tableHeaders: {
    recordId: '记录ID',
    coachingDetail: '辅导内容',
    courseContent: '课程内容',
    mentor: '导师',
    classDate: '上课日期',
    duration: '时长',
    rating: '我的评价',
    action: '操作',
  },
  detailDialog: {
    closeLabel: '关闭',
    confirmLabel: '修改评价',
    fields: {
      recordId: '记录ID',
      coachingDetail: '辅导内容',
      courseContent: '课程内容',
      mentor: '导师',
      classDate: '上课日期',
      duration: '时长',
    },
  },
  ratingDialog: {
    title: '课程评价',
    scoreLabel: '整体评分',
    tagLabel: '评价标签',
    feedbackLabel: '详细反馈',
    tagPlaceholder: '',
    feedbackPlaceholder: '',
    cancelLabel: '取消',
    submitLabel: '提交评价',
    successMessage: '评价提交成功',
    tagOptions: [],
  },
})

const positionMeta = reactive<StudentPositionMeta>({
  intentSummary: {
    recruitmentCycle: '-',
    targetRegion: '-',
    primaryDirection: '-',
  },
  filterOptions: {
    categories: [],
    industries: [],
    companies: [],
    locations: [],
    applyMethods: [],
    progressStages: [],
    coachingStages: [],
    mentorCounts: [],
  },
})

const applications = ref<StudentApplicationRecord[]>([])
const classRecords = ref<StudentClassRecord[]>([])
const positions = ref<StudentPositionRecord[]>([])
const practiceOverview = ref<StudentMockPracticeOverview>({
  practiceRecords: [],
  requestRecords: [],
})

const avatarInitials = computed(() => {
  const name = profile.fullName.trim()
  if (!name) {
    return 'ST'
  }
  const parts = name.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'ST'
})

const leadMentorInitials = computed(() => {
  const name = profile.leadMentor.trim()
  if (!name || name === '-') {
    return 'LM'
  }
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'LM'
})

const practiceRecords = computed(() => practiceOverview.value.practiceRecords || [])
const pendingClassCount = computed(() => {
  const pendingTab = classRecordsMeta.tabDefinitions.find((item) => item.key === 'pending')
  return pendingTab?.count || 0
})

const performanceGrade = computed(() => {
  if (applicationsMeta.tabCounts.ongoing >= 3) return 'A'
  if (applicationsMeta.tabCounts.ongoing >= 1) return 'B'
  if (practiceRecords.value.length > 0) return 'C'
  return 'D'
})

const trendLabel = computed(() => {
  if (applicationsMeta.tabCounts.ongoing > 0 || practiceRecords.value.length > 0) {
    return 'Active'
  }
  return 'Starting'
})

const analysisUpdatedText = computed(() => {
  const latest =
    practiceRecords.value[0]?.submittedAtValue ||
    applications.value[0]?.appliedDate ||
    classRecords.value[0]?.classDateRaw ||
    ''
  return latest ? `Updated ${latest}` : 'Updated just now'
})

const analysisNeedsWork = computed(() => {
  if (pendingClassCount.value > 0) {
    return `待评价课程 ${pendingClassCount.value} 条`
  }
  if (applicationsMeta.tabCounts.applied > 0) {
    return `已投递待推进 ${applicationsMeta.tabCounts.applied} 条`
  }
  return '继续补充更多真实反馈'
})

const analysisStrengths = computed(() => {
  if (applicationsMeta.tabCounts.ongoing > 0) {
    return `${applicationsMeta.tabCounts.ongoing} 条求职流程持续推进`
  }
  if (practiceRecords.value.length > 0) {
    return `${practiceRecords.value.length} 条模拟应聘已进入记录`
  }
  return '基础资料与求职意向已同步'
})

const applicationsPreview = computed(() =>
  applications.value.slice(0, 3).map((item) => ({
    date: item.appliedDate || '-',
    company: item.company || '-',
    office: item.location || '-',
    role: item.position || '-',
    program: item.coachingStatusLabel || '-',
    round: item.stageLabel || '-',
  })),
)

const mockScores = computed(() =>
  practiceRecords.value.slice(0, 3).map((item) => ({
    date: item.submittedAtValue || item.appliedAt || '-',
    mentor: item.mentor || '-',
    type: item.type || '-',
    score: item.statusValue || item.status || '-',
    scoreTone: item.status === 'scheduled' ? 'score-primary' : 'score-warning',
    tag: item.feedback && item.feedback !== '-' ? item.feedback : 'In Progress',
    tagTone: item.feedback && item.feedback !== '-' ? 'success' : 'warning',
  })),
)

const foundationProgress = computed(() => {
  const totalPositions = Math.max(positions.value.length, 1)
  const appliedCount = positions.value.filter((item) => item.applied).length
  const favoritesCount = positions.value.filter((item) => item.favorited).length

  return [
    {
      label: '岗位追踪 Position Tracking',
      iconClass: 'mdi-briefcase-search',
      progressText: `${appliedCount}/${totalPositions}`,
      width: `${Math.min(100, Math.round((appliedCount / totalPositions) * 100))}%`,
    },
    {
      label: '求职准备 Career Readiness',
      iconClass: 'mdi-account-voice',
      progressText: `${practiceRecords.value.length + pendingClassCount.value} 条`,
      width: `${Math.min(100, (practiceRecords.value.length + pendingClassCount.value) * 20)}%`,
    },
    {
      label: '岗位收藏 Saved Targets',
      iconClass: 'mdi-star-outline',
      progressText: `${favoritesCount} 个`,
      width: `${Math.min(100, favoritesCount * 15)}%`,
    },
  ]
})

const resumeRows = computed(() => {
  const resumeLikeRecords = classRecords.value
    .filter((item) => /简历|resume/i.test(item.courseContent || item.coachingDetail || ''))
    .slice(0, 3)

  if (resumeLikeRecords.length > 0) {
    return resumeLikeRecords.map((item, index) => ({
      version: index === 0 ? 'Latest' : `v${resumeLikeRecords.length - index}`,
      versionTone: index === 0 ? 'purple' : '',
      fileName: `${profile.englishName || profile.fullName || 'resume'}-${item.recordId}.pdf`,
      mentor: item.mentor || profile.leadMentor || '-',
      updatedAt: item.classDate || '-',
    }))
  }

  return [
    {
      version: 'Live Summary',
      versionTone: 'info',
      fileName: `${profile.englishName || profile.fullName || 'resume'}-profile-sync.pdf`,
      mentor: profile.leadMentor || '-',
      updatedAt: analysisUpdatedText.value,
    },
  ]
})

const mentorNotes = computed(() => [
  {
    title: 'Lead Mentor Call',
    tagTone: 'purple',
    author: profile.leadMentor || 'Lead Mentor Pending',
    date: analysisUpdatedText.value.replace('Updated ', '') || '-',
    copy:
      applicationsMeta.tabCounts.ongoing > 0
        ? `当前共有 ${applicationsMeta.tabCounts.ongoing} 条进行中的求职记录，建议优先推进 ${applications.value[0]?.company || '重点岗位'} 的下一轮准备。`
        : '当前暂无进行中的求职记录，建议先完善岗位收藏与申请动作。',
  },
  {
    title: 'RA Session',
    tagTone: 'info',
    author: profile.assistantName || 'Assistant Pending',
    date: analysisUpdatedText.value.replace('Updated ', '') || '-',
    copy:
      pendingClassCount.value > 0
        ? `有 ${pendingClassCount.value} 条课程记录待评价，完成评价后可以帮助团队更快跟进后续辅导安排。`
        : `当前模拟应聘记录 ${practiceRecords.value.length} 条，岗位池可见 ${positions.value.length} 个岗位，建议继续保持节奏。`,
  },
])

const summaryCards = computed(() => {
  const totalPositions = positions.value.length
  const favoritedCount = positions.value.filter((item) => item.favorited).length
  const appliedCount = positions.value.filter((item) => item.applied).length

  return [
    {
      label: 'Mock Interviews',
      value: String(practiceRecords.value.length),
      iconClass: 'mdi-microphone',
      progress: `${Math.min(100, practiceRecords.value.length * 20)}%`,
      tone: 'tone-blue',
    },
    {
      label: 'Active Applications',
      value: String(applicationsMeta.tabCounts.ongoing),
      iconClass: 'mdi-briefcase-clock',
      progress: `${Math.min(100, applicationsMeta.tabCounts.ongoing * 25)}%`,
      tone: 'tone-green',
    },
    {
      label: 'Pending Reviews',
      value: String(pendingClassCount.value),
      iconClass: 'mdi-book-open-page-variant',
      progress: `${Math.min(100, pendingClassCount.value * 25)}%`,
      tone: 'tone-sky',
    },
    {
      label: 'Saved Targets',
      value: String(favoritedCount),
      iconClass: 'mdi-star-outline',
      progress: `${totalPositions > 0 ? Math.min(100, Math.round((favoritedCount / totalPositions) * 100)) : 0}%`,
      tone: 'tone-amber',
    },
    {
      label: 'Open Positions',
      value: String(totalPositions),
      iconClass: 'mdi-briefcase-search',
      progress: `${totalPositions > 0 ? Math.min(100, Math.round((appliedCount / totalPositions) * 100)) : 0}%`,
      tone: 'tone-purple',
    },
  ]
})

async function loadDashboard() {
  const tasks = [
    getStudentProfile()
      .then((profileView) => {
        Object.assign(profile, profileView.profile)
      }),
    getStudentApplicationsMeta()
      .then((applicationsMetaView) => {
        Object.assign(applicationsMeta, applicationsMetaView)
      }),
    listStudentApplications()
      .then((applicationsListView) => {
        applications.value = applicationsListView.applications || []
      }),
    getStudentMockPracticeOverview()
      .then((mockPracticeView) => {
        practiceOverview.value = mockPracticeView
      }),
    getStudentClassRecordsMeta()
      .then((classRecordsMetaView) => {
        Object.assign(classRecordsMeta, classRecordsMetaView)
      }),
    listStudentClassRecords()
      .then((classRecordsListView) => {
        classRecords.value = classRecordsListView.records || []
      }),
    getStudentPositionMeta()
      .then((positionMetaView) => {
        Object.assign(positionMeta, positionMetaView)
      }),
    listStudentPositions()
      .then((positionsListView) => {
        positions.value = positionsListView || []
      }),
  ]

  await Promise.allSettled(tasks)
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped lang="scss">
.dashboard-page {
  .student-profile-card {
    margin-bottom: 20px;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    background: var(--primary-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28px;
    font-weight: 700;
  }

  .student-name {
    font-size: 20px;
    margin-bottom: 8px;
  }

  .student-id {
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
  }

  .student-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 14px;
    color: var(--text2);

    .mdi {
      color: var(--primary);
      margin-right: 6px;
    }
  }

  .mentor-section {
    background: var(--bg);
    border-radius: 12px;
    padding: 16px;
  }

  .mentor-label {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 8px;

    .mdi {
      margin-right: 4px;
    }
  }

  .mentor-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mentor-role {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .mentor-primary-card {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .mentor-avatar {
    width: 32px;
    height: 32px;
    background: var(--primary-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }

  .mentor-name {
    font-size: 13px;
    font-weight: 600;
  }

  .mentor-area {
    font-size: 11px;
    color: var(--muted);
  }

  .mentor-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .analysis-hero {
    margin-bottom: 24px;
    background: #fff;
    border-radius: 24px;
    padding: 32px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);
    border: 1px solid rgba(115, 153, 198, 0.15);
  }

  .analysis-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #7399c6, #9bb8d9, #b8d4ed, #7399c6);
    background-size: 200% 100%;
    animation: gradient-move 3s ease infinite;
  }

  .analysis-orb {
    position: absolute;
    border-radius: 50%;
  }

  .analysis-orb-lg {
    top: -40px;
    right: -40px;
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.08), rgba(155, 184, 217, 0.05));
  }

  .analysis-orb-sm {
    top: 20px;
    right: 60px;
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.06), transparent);
  }

  .analysis-orb-bottom {
    bottom: -30px;
    left: -30px;
    width: 120px;
    height: 120px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.06), transparent);
  }

  .analysis-shell {
    position: relative;
    z-index: 1;
  }

  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;

    h2 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
  }

  .analysis-eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .analysis-updated {
    background: var(--primary-gradient);
    padding: 8px 16px;
    border-radius: 30px;
    font-size: 12px;
    color: #fff;

    .mdi {
      margin-right: 6px;
    }
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 32px;
  }

  .grade-card {
    background: linear-gradient(135deg, #e8f0f8, #f0f6fb);
    border-radius: 20px;
    padding: 28px;
    text-align: center;
    border: 1px solid rgba(115, 153, 198, 0.2);
  }

  .grade-circle {
    width: 100px;
    height: 100px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);

    span {
      font-size: 36px;
      font-weight: 800;
      color: #fff;
    }
  }

  .grade-label {
    font-size: 14px;
    color: var(--text2);
    margin-bottom: 8px;
  }

  .grade-trend {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #dcfce7;
    color: #16a34a;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .analysis-copy {
    p {
      font-size: 15px;
      line-height: 1.9;
      color: #475569;
      margin: 0 0 20px;
    }

    strong {
      color: var(--primary);
    }
  }

  .analysis-tags {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .focus-tag {
    flex: 1;
    min-width: 180px;
    border-radius: 12px;
    padding: 12px 16px;
    border: 1px solid;

    div {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    span {
      font-size: 13px;
    }
  }

  .warning-tag {
    background: #fef3c7;
    border-color: #fcd34d;

    div {
      color: #d97706;
    }

    span {
      color: #78350f;
    }
  }

  .success-tag {
    background: #dcfce7;
    border-color: #86efac;

    div {
      color: #16a34a;
    }

    span {
      color: #14532d;
    }
  }

  .analysis-focus {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .focus-label {
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;

    .mdi {
      margin-right: 6px;
    }
  }

  .focus-pills {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .focus-pill {
    padding: 8px 16px;
    border-radius: 25px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid;
  }

  .focus-pill-success {
    background: #dcfce7;
    color: #16a34a;
    border-color: #86efac;
  }

  .focus-pill-warning {
    background: #fef3c7;
    color: #d97706;
    border-color: #fcd34d;
  }

  .rating-criteria {
    margin-top: 16px;
  }

  .criteria-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }

  .criteria-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .criteria-card {
    border-radius: 12px;
    padding: 14px;
    text-align: center;

    div {
      font-size: 20px;
      font-weight: 700;
    }

    span {
      display: block;
      font-size: 11px;
      margin-top: 4px;
    }
  }

  .criteria-a {
    background: #dcfce7;
    color: #16a34a;
  }

  .criteria-b {
    background: #dbeafe;
    color: #2563eb;
  }

  .criteria-c {
    background: #fef3c7;
    color: #d97706;
  }

  .criteria-d {
    background: #fee2e2;
    color: #dc2626;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .summary-card {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(115, 153, 198, 0.1);
  }

  .summary-glow {
    position: absolute;
    top: -30px;
    right: -30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    opacity: 0.08;
  }

  .summary-glow-bottom {
    top: auto;
    right: 10px;
    bottom: 10px;
    width: 40px;
    height: 40px;
    opacity: 0.05;
  }

  .summary-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);

    .mdi {
      font-size: 26px;
      color: #fff;
    }
  }

  .summary-value {
    font-size: 36px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: -1px;
  }

  .summary-label {
    font-size: 12px;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-progress {
    margin-top: 12px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .summary-progress-fill {
    height: 100%;
    border-radius: 2px;
  }

  .tone-blue .summary-glow,
  .tone-blue .summary-glow-bottom,
  .tone-blue .summary-icon,
  .tone-blue .summary-progress-fill {
    background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  }

  .tone-green .summary-glow,
  .tone-green .summary-glow-bottom,
  .tone-green .summary-icon,
  .tone-green .summary-progress-fill {
    background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
  }

  .tone-sky .summary-glow,
  .tone-sky .summary-glow-bottom,
  .tone-sky .summary-icon,
  .tone-sky .summary-progress-fill {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  }

  .tone-amber .summary-glow,
  .tone-amber .summary-glow-bottom,
  .tone-amber .summary-icon,
  .tone-amber .summary-progress-fill {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  }

  .tone-purple .summary-glow,
  .tone-purple .summary-glow-bottom,
  .tone-purple .summary-icon,
  .tone-purple .summary-progress-fill {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  }

  .card-inline-hint {
    margin-left: auto;
    margin-right: 16px;
    font-size: 13px;
    color: var(--muted);

    strong {
      color: var(--primary);
      font-size: 16px;
    }
  }

  .header-link {
    border: none;
    background: transparent;
    color: var(--primary);
    font-size: 13px;
    cursor: pointer;
  }

  .card-body-no-padding {
    padding: 0;
  }

  .score-cell {
    font-weight: 600;
  }

  .score-primary {
    color: var(--primary);
  }

  .score-warning {
    color: #d97706;
  }

  .progress-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .progress-label {
    font-weight: 500;

    .mdi {
      color: var(--primary);
      margin-right: 6px;
    }
  }

  .progress-value {
    color: var(--primary);
    font-weight: 600;
  }

  .progress-track {
    background: var(--bg);
    border-radius: 8px;
    height: 12px;
  }

  .progress-fill {
    background: var(--primary-gradient);
    height: 100%;
    border-radius: 8px;
  }

  .company-cell {
    color: var(--primary);
    font-weight: 500;
  }

  .mentor-notes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .quote-box {
    background: var(--bg);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;

    p {
      color: var(--text);
      line-height: 1.7;
    }
  }

  .note-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--muted);

    .mdi {
      margin-right: 4px;
    }
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .empty-cell {
    text-align: center;
    color: var(--muted);
    padding: 24px;
  }
}

@keyframes gradient-move {
  0% {
    background-position: 0 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}
</style>
