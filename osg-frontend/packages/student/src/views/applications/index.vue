<template>
  <div id="page-job-tracking" class="applications-page" :data-action-trigger-count="applicationsActionTriggers.length">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ applicationsMeta.pageSummary.titleZh }} <span>{{ applicationsMeta.pageSummary.titleEn }}</span></h1>
            <p class="page-sub">{{ applicationsMeta.pageSummary.subtitle }}</p>
          </div>
        </div>
      </template>

      <a-card :bordered="false" class="schedule-card">
        <div class="schedule-summary">
          <div class="schedule-title">
            <CalendarOutlined />
            <span>面试安排</span>
          </div>
          <div class="schedule-week">
            <button
              v-for="event in scheduleItems"
              :key="event.id"
              class="day-chip interview-chip"
              :class="event.accentClass"
              @click="openInterviewModal(event.id)"
            >
              <div>{{ event.weekdayLabel }}</div>
              <strong>{{ event.dayLabel }}</strong>
            </button>
            <div v-if="!scheduleItems.length" class="day-chip today-chip">
              <div>本周</div>
              <strong>-</strong>
            </div>
          </div>
          <div class="schedule-events">
            <button
              v-for="event in scheduleItems"
              :key="`pill-${event.id}`"
              class="event-pill"
              :class="event.accentClass"
              @click="openInterviewModal(event.id)"
            >
              {{ event.shortLabel }}
            </button>
            <span v-if="!scheduleItems.length">暂无面试安排</span>
          </div>
          <a-button size="small" :disabled="!scheduleItems.length" @click="calendarExpanded = !calendarExpanded">
            <template #icon><CalendarOutlined /></template>
            {{ calendarExpanded ? '收起' : '展开' }}
          </a-button>
        </div>

        <div v-if="calendarExpanded" class="schedule-expanded">
          <div class="expanded-title">本月面试安排</div>
          <div class="expanded-list">
            <div
              v-for="event in scheduleItems"
              :key="`expanded-${event.id}`"
              class="expanded-item"
              :class="event.borderClass"
            >
              <div class="expanded-date">
                <strong>{{ event.dayLabel }}</strong>
                <span>{{ event.weekdayLabel }}</span>
              </div>
              <div class="expanded-detail">
                <div>{{ event.title }}</div>
                <span>{{ event.position }} · {{ event.location }} · {{ event.timeLabel }}</span>
              </div>
            </div>
          </div>
        </div>
      </a-card>

      <a-card :bordered="false" class="filter-card">
        <a-space :size="12" wrap>
          <a-input-search
            v-model:value="filters.keyword"
            placeholder="搜索公司/岗位..."
            style="width: 220px"
            search-button
          />
          <a-select v-model:value="filters.stage" placeholder="全部阶段" style="width: 140px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.progressStages"
              :key="`stage-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select v-model:value="filters.coachingStatus" placeholder="全部辅导状态" style="width: 150px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.coachingStatuses"
              :key="`coaching-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select v-model:value="filters.companyType" placeholder="全部公司类型" style="width: 160px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.companyTypes"
              :key="`company-type-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-space>
      </a-card>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="all" :tab="`全部 ${applicationsMeta.tabCounts.all}`" />
        <a-tab-pane key="applied" :tab="`已投递 ${applicationsMeta.tabCounts.applied}`" />
        <a-tab-pane key="ongoing" :tab="`面试中 ${applicationsMeta.tabCounts.ongoing}`" />
        <a-tab-pane key="completed" :tab="`已结束 ${applicationsMeta.tabCounts.completed}`" />
      </a-tabs>

      <a-card :bordered="false">
        <a-table :columns="columns" :data-source="visibleApplications" :pagination="false" row-key="id" :scroll="{ x: 1120 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'job'">
              <div class="job-cell">
                <div class="job-company">{{ record.company }}</div>
                <div class="job-position">{{ record.position }} · {{ record.location }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'stage'">
              <a-tag :color="record.stageColor">{{ record.stageLabel }}</a-tag>
            </template>

            <template v-else-if="column.key === 'interviewTime'">
              <div class="interview-cell">
                <div>{{ record.interviewTime }}</div>
                <span>{{ record.interviewHint }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'coachingStatus'">
              <a-tag :color="record.coachingColor">{{ record.coachingStatusLabel }}</a-tag>
            </template>

            <template v-else-if="column.key === 'mentor'">
              <div class="mentor-cell">
                <div>{{ record.mentor }}</div>
                <span>{{ record.mentorMeta }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'hoursFeedback'">
              <div class="feedback-cell">
                <div>{{ record.hoursFeedback }}</div>
                <span>{{ record.feedback }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-space :size="6">
                <a-button
                  v-if="record.bucket === 'applied'"
                  size="small"
                  @click="openAppliedModal(record)"
                >
                  标记已投递
                </a-button>
                <a-button
                  v-else-if="record.bucket === 'completed'"
                  size="small"
                  disabled
                >
                  已结束
                </a-button>
                <a-button
                  v-else
                  size="small"
                  type="primary"
                  @click="openProgressModal(record)"
                >
                  更新阶段
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </OsgPageContainer>

    <a-modal
      v-model:open="interviewModalOpen"
      title="面试安排"
      ok-text="确定"
      cancel-button-props="{ style: { display: 'none' } }"
      @ok="interviewModalOpen = false"
    >
      <div class="modal-copy">
        <div class="modal-heading">{{ selectedInterview?.title }}</div>
        <div class="modal-sub">{{ selectedInterview?.modalTime }}</div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="progressModalOpen"
      title="更新申请进度"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveProgress"
    >
      <div class="modal-copy">
        <div class="modal-heading">{{ selectedApplication?.company }}</div>
        <div class="modal-sub">{{ selectedApplication?.position }} · {{ selectedApplication?.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="当前阶段">
          <a-select v-model:value="progressForm.stage">
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.progressStages"
              :key="`progress-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="appliedModalOpen"
      title="标记已投递"
      ok-text="确认"
      cancel-text="取消"
      @ok="confirmApplied"
    >
      <div class="modal-copy">
        <div class="modal-heading">{{ selectedApplication?.company }}</div>
        <div class="modal-sub">{{ selectedApplication?.position }} · {{ selectedApplication?.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="投递时间">
          <a-input v-model:value="appliedForm.date" type="date" />
        </a-form-item>
        <a-form-item label="投递方式">
          <a-select v-model:value="appliedForm.method">
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.applyMethods"
              :key="`apply-method-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CalendarOutlined } from '@ant-design/icons-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentApplicationsMeta,
  listStudentApplications,
  type StudentApplicationsMeta,
  type StudentApplicationScheduleItem,
  updateStudentPositionApply,
  updateStudentPositionProgress,
  type StudentApplicationRecord
} from '@osg/shared/api'

type TabKey = 'all' | 'applied' | 'ongoing' | 'completed'

const applicationsActionTriggers = [
  { actionId: 'calendar-gs', label: 'GS Final interview detail' },
  { actionId: 'calendar-mck', label: 'MCK Case interview detail' },
  { actionId: 'summary-gs', label: 'GS Final summary pill' },
  { actionId: 'summary-mck', label: 'MCK Case summary pill' },
  { actionId: 'all-progress', label: 'all tab progress update' },
  { actionId: 'applied-mark', label: 'applied tab mark applied dialog' }
] as const

const activeTab = ref<TabKey>('all')
const calendarExpanded = ref(false)
const selectedApplicationId = ref<number | null>(null)
const selectedInterviewId = ref<number | null>(null)

const interviewModalOpen = ref(false)
const progressModalOpen = ref(false)
const appliedModalOpen = ref(false)

const filters = ref({
  keyword: '',
  stage: undefined as string | undefined,
  coachingStatus: undefined as string | undefined,
  companyType: undefined as string | undefined
})

const applications = ref<StudentApplicationRecord[]>([])
const applicationsMeta = ref<StudentApplicationsMeta>({
  pageSummary: {
    titleZh: '',
    titleEn: '',
    subtitle: ''
  },
  tabCounts: {
    all: 0,
    applied: 0,
    ongoing: 0,
    completed: 0
  },
  filterOptions: {
    progressStages: [],
    coachingStatuses: [],
    companyTypes: [],
    applyMethods: []
  },
  schedule: []
})

const progressForm = ref({
  stage: ''
})

const appliedForm = ref({
  date: '',
  method: ''
})

const columns = [
  { title: '公司/岗位', key: 'job', width: 220 },
  { title: '阶段', key: 'stage', width: 120 },
  { title: '面试时间', key: 'interviewTime', width: 150 },
  { title: '辅导状态', key: 'coachingStatus', width: 120 },
  { title: '导师', key: 'mentor', width: 140 },
  { title: '课时/反馈', key: 'hoursFeedback', width: 130 },
  { title: '操作', key: 'actions', width: 140 }
]

const selectedApplication = computed(() =>
  applications.value.find((record) => record.id === selectedApplicationId.value) ?? null
)

const scheduleItems = computed<StudentApplicationScheduleItem[]>(() => applicationsMeta.value.schedule)

const selectedInterview = computed(() =>
  scheduleItems.value.find((record) => record.id === selectedInterviewId.value) ?? null
)

const visibleApplications = computed(() => {
  const scoped = activeTab.value === 'all'
    ? applications.value
    : applications.value.filter((record) => record.bucket === activeTab.value)

  return scoped.filter((record) => {
    const keyword = filters.value.keyword.trim().toLowerCase()

    if (filters.value.stage && record.stage !== filters.value.stage) {
      return false
    }

    if (filters.value.coachingStatus && record.coachingStatus !== filters.value.coachingStatus) {
      return false
    }

    if (filters.value.companyType && record.companyType !== filters.value.companyType) {
      return false
    }

    if (!keyword) {
      return true
    }

    return [record.company, record.position, record.location, record.mentor, record.feedback]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})

async function loadApplications() {
  const [applicationsResponse, metaResponse] = await Promise.all([
    listStudentApplications(),
    getStudentApplicationsMeta()
  ])
  applications.value = applicationsResponse.applications
  applicationsMeta.value = metaResponse
}

function openInterviewModal(id: number) {
  selectedInterviewId.value = id
  interviewModalOpen.value = true
}

function openProgressModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  progressForm.value.stage = record.stage
  progressModalOpen.value = true
}

function openAppliedModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  appliedForm.value = {
    date: record.appliedDate || new Date().toISOString().slice(0, 10),
    method: record.applyMethod || applicationsMeta.value.filterOptions.applyMethods[0]?.value || ''
  }
  appliedModalOpen.value = true
}

async function saveProgress() {
  if (!selectedApplication.value) {
    return
  }

  await updateStudentPositionProgress({
    positionId: selectedApplication.value.id,
    stage: progressForm.value.stage,
    notes: selectedApplication.value.progressNote || ''
  })
  await loadApplications()
  progressModalOpen.value = false
  message.success('申请进度已更新')
}

async function confirmApplied() {
  if (!selectedApplication.value) {
    return
  }

  if (!appliedForm.value.date) {
    message.error('请选择投递时间')
    return
  }

  await updateStudentPositionApply({
    positionId: selectedApplication.value.id,
    applied: true,
    date: appliedForm.value.date,
    method: appliedForm.value.method
  })
  await loadApplications()
  appliedModalOpen.value = false
  message.success('已标记为已投递')
}

onMounted(() => {
  void loadApplications()
})
</script>

<style scoped lang="scss">
.applications-page {
  .schedule-card,
  .filter-card {
    margin-bottom: 16px;
  }

  .schedule-summary {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .schedule-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #4f46e5;
    font-size: 13px;
    font-weight: 600;
  }

  .schedule-week {
    display: flex;
    gap: 6px;
    flex: 1;
  }

  .day-chip,
  .event-pill {
    border: 0;
    border-radius: 8px;
    background: #f8fafc;
    color: #334155;
  }

  .day-chip {
    min-width: 40px;
    padding: 6px 8px;
    text-align: center;
  }

  .event-pill {
    padding: 6px 12px;
    cursor: pointer;
  }

  .interview-chip {
    cursor: pointer;
  }

  .danger-chip {
    background: #fee2e2;
    color: #991b1b;
  }

  .warning-chip {
    background: #fef3c7;
    color: #92400e;
  }

  .info-chip {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .today-chip {
    background: #4f46e5;
    color: #fff;
  }

  .schedule-events {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .schedule-expanded {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }

  .expanded-title {
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
  }

  .expanded-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .expanded-item {
    display: flex;
    gap: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    background: #fff;
  }

  .danger-border {
    border-left: 4px solid #ef4444;
  }

  .warning-border {
    border-left: 4px solid #f59e0b;
  }

  .info-border {
    border-left: 4px solid #3b82f6;
  }

  .expanded-date {
    min-width: 50px;
    text-align: center;
  }

  .expanded-date strong {
    display: block;
    font-size: 20px;
  }

  .expanded-date span,
  .expanded-detail span,
  .job-position,
  .interview-cell span,
  .mentor-cell span,
  .feedback-cell span,
  .modal-sub {
    color: #64748b;
    font-size: 12px;
  }

  .job-company,
  .modal-heading {
    font-weight: 600;
  }

  .modal-copy {
    margin-bottom: 16px;
    border-radius: 10px;
    padding: 14px 16px;
    background: #f8fafc;
  }
}

@media (max-width: 900px) {
  .applications-page {
    .schedule-summary {
      align-items: stretch;
    }

    .schedule-week {
      flex-wrap: wrap;
    }

    .schedule-events {
      width: 100%;
      flex-wrap: wrap;
    }
  }
}
</style>
