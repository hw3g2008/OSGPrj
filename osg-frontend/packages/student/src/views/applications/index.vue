<template>
  <div id="page-job-tracking" class="applications-page" :data-action-trigger-count="applicationsActionTriggers.length">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ applicationsMeta.pageSummary.titleZh }} <span>{{ applicationsMeta.pageSummary.titleEn }}</span></h1>
      </div>
    </div>

      <InterviewCalendar
        title="面试安排"
        :events="calendarEvents"
        @event-click="handleCalendarEventClick"
      />

      <a-card :bordered="false" class="filter-card">
        <a-space :size="12" wrap>
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索公司/岗位..."
            style="width: 220px"
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
              v-for="option in mergedCompanyTypeOptions"
              :key="`company-type-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-button type="primary" @click="applyFilters">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
          <a-button @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </a-space>
      </a-card>

      <a-card :bordered="false" class="applications-table-card" :body-style="{ padding: 0 }">
        <div class="applications-tab-header">
          <div class="applications-tab-pills">
            <button
              v-for="tab in tabDefs"
              :key="tab.key"
              type="button"
              class="app-tab"
              :class="{ 'app-tab--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="app-tab__icon" />
              <span>{{ tab.label }}</span>
              <span class="app-tab__count" :class="`app-tab__count--${tab.tone}`">{{ tab.count }}</span>
            </button>
          </div>
        </div>
        <a-table
          :columns="columns"
          :data-source="visibleApplications"
          :pagination="tablePagination"
          row-key="id"
          :scroll="{ x: 'max-content' }"
          :row-class-name="rowClassName"
          :expanded-row-render="renderApplicationCoachings"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'positionName'">
              <span class="position-cell">{{ record.position || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'companyName'">
              <span class="company-cell-text">{{ record.company || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'industry'">
              <span>{{ record.industryLabel || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'category'">
              <span>{{ record.categoryLabel || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'region'">
              <span>{{ record.regionLabel || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'recruitmentCycle'">
              <span>{{ record.recruitmentCycle || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'submittedAt'">
              <span>{{ record.submittedAt || '-' }}</span>
            </template>

            <template v-else-if="column.key === 'applicationStatus'">
              <a-tag :color="record.applicationStatusColor || 'default'" class="application-status-tag">
                {{ record.applicationStatusLabel || '-' }}
              </a-tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-button
                type="primary"
                size="small"
                class="apply-coaching-btn"
                @click="openApplyCoachingModal(record)"
              >
                申请辅导
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>

    <a-modal
      v-model:open="interviewModalOpen"
      ok-text="确定"
      centered
      :width="400"
      :closable="false"
      :wrap-class-name="interviewModalWrapClass"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      :cancel-button-props="{ style: { display: 'none' } }"
      destroy-on-close
      @ok="interviewModalOpen = false"
    >
      <template #title>
        <div class="interview-modal-titlebar">
          <span class="modal-title-inline">
            <CalendarOutlined class="modal-title-icon" aria-hidden="true" />
            <span class="modal-title-text">面试安排</span>
          </span>
          <a-button type="text" shape="circle" class="interview-modal-closebtn" @click="interviewModalOpen = false">
            <template #icon><CloseOutlined /></template>
          </a-button>
        </div>
      </template>
      <div class="rich-modal-shell rich-modal-shell--compact">
        <div class="interview-detail-card">
          <div class="modal-heading">{{ selectedInterviewTitle }}</div>
          <div class="modal-sub">{{ selectedInterviewModalTime }}</div>
        </div>
      </div>
    </a-modal>

    <OverlaySurfaceModal
      :open="progressModalOpen"
      surface-id="student-apply-coaching"
      variant="accent"
      :width="580"
      shell-class="applications-modal applications-modal--progress"
      body-class="osg-modal-form applications-modal applications-modal--progress"
      @cancel="progressModalOpen = false"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <EditOutlined aria-hidden="true" />
          <span>{{ '申请辅导' }}</span>
        </span>
      </template>
      <a-form id="modal-update-result" layout="vertical" :model="progressForm" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card progress-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.regionLabel || selectedApplication.location }}</div>
          </div>
        </div>
        <a-form-item
          label="当前面试阶段"
          required
          class="rich-form-field rich-form-field--full"
          extra="选择阶段后，页面会切换到对应的 HireVue 或面试辅导分段内容。"
        >
          <a-select
            id="update-stage-select"
            v-model:value="progressForm.stage"
            placeholder="请选择当前阶段"
            :style="selectStageTone(progressForm.stage)"
          >
            <a-select-option
              v-for="option in stageDropdownOptions(progressForm.stage)"
              :key="`progress-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <div v-if="progressForm.stage === 'hirevue'" id="update-hirevue-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">HireVue / Online Test 信息</h4>
            <p class="rich-form-help">复用岗位页的紫色模态样式、说明文案和上传入口。</p>
          </div>
          <div class="rich-form-stack">
            <a-form-item label="请选择类型" required class="rich-form-field rich-form-field--full">
              <a-radio-group v-model:value="progressForm.hirevueType">
                <a-radio value="vi">VI (Video Interview)</a-radio>
                <a-radio value="ot">OT (Online Test)</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item v-if="progressForm.hirevueType === 'vi'" id="update-vi-fields" label="VI 链接" required class="rich-form-field rich-form-field--full">
              <a-input v-model:value="progressForm.viLink" placeholder="请输入 Video Interview 链接" />
            </a-form-item>

            <template v-if="progressForm.hirevueType === 'ot'">
              <a-form-item id="update-ot-fields" label="OT 链接" required class="rich-form-field">
                <a-input v-model:value="progressForm.otLink" placeholder="请输入 Online Test 链接" />
              </a-form-item>
              <a-form-item label="登录账号" required class="rich-form-field">
                <a-input v-model:value="progressForm.otAccount" placeholder="账号" />
              </a-form-item>
              <a-form-item label="登录密码" required class="rich-form-field">
                <a-input-password v-model:value="progressForm.otPassword" placeholder="密码" />
              </a-form-item>
            </template>

            <a-form-item
              label="截止时间"
              required
              class="rich-form-field"
              extra="请填写 VI/OT 的截止时间，系统会一并写入进度说明。"
            >
              <DatePicker
                id="update-hirevue-deadline"
                v-model:value="progressForm.hirevueDeadline"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="上传邀请邮件截图" required class="rich-form-field">
              <Upload
                id="update-hirevue-upload"
                v-model:file-list="progressHirevueFileList"
                :action="uploadAction"
                :headers="uploadHeaders"
                name="file"
                accept="image/*"
                :max-count="1"
                @change="handleUpdateHirevueUpload"
              >
                <label class="upload-dropzone upload-dropzone--compact">
                  <CloudUploadOutlined class="upload-dropzone__icon" />
                  <span class="upload-dropzone__title">点击上传截图</span>
                  <span class="upload-dropzone__helper">支持 JPG、PNG 格式</span>
                  <span v-if="progressForm.inviteScreenshotName" class="upload-dropzone__file">{{ progressForm.inviteScreenshotName }}</span>
                </label>
              </Upload>
            </a-form-item>
          </div>
        </div>

        <div v-else-if="showUpdateInterviewFields" id="update-interview-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">面试 & 辅导信息</h4>
            <p class="rich-form-help">保持岗位页同款分段节奏，先确认导师数量与时间，再补充偏好。</p>
          </div>
          <div class="rich-form-stack">
            <a-form-item
              label="需要几个导师？"
              required
              class="rich-form-field"
              extra="根据面试难度，您可申请 1-3 位导师进行面试测试。"
            >
              <a-select
                id="mentor-count-select"
                v-model:value="progressForm.mentorCount"
                placeholder="请选择导师数量"
                style="width: 100%"
              >
                <a-select-option
                  v-for="option in applicationsMeta.filterOptions.mentorCounts"
                  :key="`application-mentor-count-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item
              label="面试时间"
              :required="!progressForm.interviewTimeUndetermined"
              class="rich-form-field"
              extra="请填写该轮面试的具体时间，如尚未确定可勾选&quot;未确定&quot;。"
            >
              <a-checkbox
                id="update-interview-time-undetermined"
                v-model:checked="progressForm.interviewTimeUndetermined"
                style="margin-bottom: 6px"
              >
                未确定
              </a-checkbox>
              <DatePicker
                id="update-interview-time"
                v-model:value="progressForm.interviewTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                :disabled="progressForm.interviewTimeUndetermined"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="意向导师（选填）" class="rich-form-field">
              <a-input id="update-prefer-mentor" v-model:value="progressForm.preferMentor" placeholder="如有特别想要的导师，请填写导师姓名" />
            </a-form-item>
            <a-form-item label="排除导师（选填）" class="rich-form-field">
              <a-input id="update-exclude-mentor" v-model:value="progressForm.excludeMentor" placeholder="如有不想选择的导师，请填写导师姓名" />
            </a-form-item>
          </div>
        </div>

        <a-form-item label="备注（选填）" class="rich-form-field rich-form-field--full">
          <a-textarea v-model:value="progressForm.note" :rows="2" placeholder="其他需要说明的内容..." />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="progressModalOpen = false">取消</a-button>
        <a-button type="primary" @click="saveProgress">提交</a-button>
      </template>
    </OverlaySurfaceModal>

    <OverlaySurfaceModal
      :open="coachingDetailModalOpen"
      surface-id="student-coaching-detail"
      variant="accent"
      :width="640"
      body-class="osg-modal-form student-coaching-modal__body"
      @cancel="coachingDetailModalOpen = false"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <ReadOutlined aria-hidden="true" />
          <span>{{ '辅导详情' }}</span>
        </span>
      </template>

      <section v-if="selectedCoaching" class="student-coaching-hero">
        <span class="student-coaching-hero__accent" aria-hidden="true" />
        <div class="student-coaching-hero__title-group">
          <span class="stage-tag" :style="stageTagStyle(selectedCoaching.interviewStage)">{{ selectedCoaching.interviewStageLabel || '-' }}</span>
          <span class="student-coaching-hero__id">#{{ selectedCoaching.coachingId }}</span>
        </div>
        <div class="student-coaching-hero__inline">
          <span class="student-coaching-hero__inline-item">
            <i class="mdi mdi-calendar-clock-outline" aria-hidden="true" />
            <span :class="{ 'student-coaching-hero__muted': !selectedCoaching.interviewTime }">{{ selectedCoaching.interviewTime || '面试时间待安排' }}</span>
          </span>
          <span class="student-coaching-hero__inline-item">
            <i class="mdi mdi-account-tie-voice-outline" aria-hidden="true" />
            <span :class="{ 'student-coaching-hero__muted': !selectedCoaching.companyInterviewer }">{{ selectedCoaching.companyInterviewer || '公司面试官待补充' }}</span>
          </span>
        </div>
        <dl class="student-coaching-hero__stats">
          <div class="student-coaching-hero__stat">
            <dt>辅导导师</dt>
            <dd :class="{ 'student-coaching-hero__muted': !(selectedCoaching.mentorNames || selectedCoaching.mentorName) }">
              {{ selectedCoaching.mentorNames || selectedCoaching.mentorName || '待匹配' }}
            </dd>
          </div>
          <div class="student-coaching-hero__stat">
            <dt>最新评分</dt>
            <dd :class="selectedCoaching.latestRating ? 'student-coaching-hero__accent-value' : 'student-coaching-hero__muted'">
              {{ selectedCoaching.latestRating || '未评分' }}
            </dd>
          </div>
          <div class="student-coaching-hero__stat">
            <dt>已上报课消</dt>
            <dd>
              <strong>{{ selectedCoaching.reportedLessonCount || 0 }}</strong>
              <span class="student-coaching-hero__stat-unit"> 次</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="student-coaching-records">
        <header class="student-coaching-records__head">
          <span class="student-coaching-records__title">
            <i class="mdi mdi-timeline-clock-outline" aria-hidden="true" />
            课消时间线
          </span>
          <span class="student-coaching-records__count">{{ coachingClassRecords.length }} 条</span>
        </header>
        <div v-if="coachingClassRecords.length === 0" class="student-coaching-records__empty">
          <i class="mdi mdi-history" aria-hidden="true" />
          <span>暂无课消记录</span>
        </div>
        <ol v-else class="student-coaching-timeline">
          <li
            v-for="cls in coachingClassRecords"
            :key="cls.recordId"
            class="student-coaching-timeline__item"
          >
            <span class="student-coaching-timeline__dot" aria-hidden="true" />
            <div class="student-coaching-timeline__card">
              <div class="student-coaching-timeline__head">
                <span class="student-coaching-timeline__class">{{ cls.classId || `#${cls.recordId}` }}</span>
                <span class="student-coaching-timeline__mentor">{{ cls.mentorName || '-' }}</span>
                <span :class="cls.rate ? 'student-coaching-timeline__rate' : 'student-coaching-timeline__rate student-coaching-timeline__rate--empty'">
                  <i v-if="cls.rate" class="mdi mdi-star" aria-hidden="true" />
                  {{ cls.rate || '未评分' }}
                </span>
              </div>
              <div class="student-coaching-timeline__meta">
                <span class="student-coaching-timeline__meta-item">
                  <i class="mdi mdi-calendar-blank-outline" aria-hidden="true" />
                  {{ (cls.classDate || '-').slice(0, 10) }}
                </span>
                <span
                  class="student-coaching-timeline__meta-item"
                  :class="cls.memberStatus !== 'normal' ? 'student-coaching-timeline__absent' : ''"
                >
                  <i class="mdi" :class="cls.memberStatus !== 'normal' ? 'mdi-account-alert-outline' : 'mdi-account-check-outline'" aria-hidden="true" />
                  {{ memberStatusLabel(cls.memberStatus) }}
                </span>
                <span class="student-coaching-timeline__meta-item">
                  <i class="mdi mdi-timer-sand" aria-hidden="true" />
                  <strong>{{ cls.durationHours || 0 }}</strong>h
                </span>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <template #footer>
        <a-button type="primary" @click="coachingDetailModalOpen = false">关闭</a-button>
      </template>
    </OverlaySurfaceModal>

    <OverlaySurfaceModal
      :open="coachingEditModalOpen"
      surface-id="student-coaching-edit"
      variant="accent"
      :width="520"
      body-class="osg-modal-form student-coaching-modal__body"
      @cancel="coachingEditModalOpen = false"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <EditOutlined aria-hidden="true" />
          <span>{{ '修改辅导信息' }}</span>
        </span>
      </template>

      <a-form id="modal-edit-coaching" layout="vertical" :model="coachingEditForm">
        <section v-if="selectedCoaching" class="student-coaching-context">
          <span class="student-coaching-context__accent" aria-hidden="true" />
          <div class="student-coaching-context__body">
            <div class="student-coaching-context__title">
              <span class="stage-tag" :style="stageTagStyle(selectedCoaching.interviewStage)">{{ selectedCoaching.interviewStageLabel || '-' }}</span>
              <span class="student-coaching-context__id">#{{ selectedCoaching.coachingId }}</span>
            </div>
            <div class="student-coaching-context__sub">
              <i class="mdi mdi-domain" aria-hidden="true" />
              <strong>{{ selectedCoachingApplication?.company || '-' }}</strong>
              <span class="student-coaching-context__dot">·</span>
              <span>{{ selectedCoachingApplication?.position || '-' }}</span>
            </div>
          </div>
        </section>
        <a-form-item label="面试时间">
          <DatePicker
            id="coaching-edit-interview-time"
            v-model:value="coachingEditForm.interviewTime"
            show-time
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm"
            style="width: 100%"
            placeholder="选择面试时间"
          />
        </a-form-item>
        <a-form-item label="公司面试官">
          <a-input
            id="coaching-edit-company-interviewer"
            v-model:value="coachingEditForm.companyInterviewer"
            placeholder="请输入公司面试官姓名"
          />
        </a-form-item>
      </a-form>

      <template #footer>
        <a-button @click="coachingEditModalOpen = false">取消</a-button>
        <a-button type="primary" @click="saveCoachingEdit">保存</a-button>
      </template>
    </OverlaySurfaceModal>

    <a-modal
      v-model:open="appliedModalOpen"
      :title="renderModalTitle(CheckCircleOutlined, '标记已投递')"
      ok-text="确认投递"
      cancel-text="取消"
      centered
      :width="450"
      wrap-class-name="applications-modal applications-modal--applied"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      destroy-on-close
      @ok="confirmApplied"
    >
      <a-form id="modal-mark-applied" layout="vertical" :model="appliedForm" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card applied-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.regionLabel || selectedApplication.location }}</div>
          </div>
        </div>
        <a-form-item required class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><CalendarOutlined />投递时间</span>
          </template>
          <DatePicker
            id="applied-date"
            v-model:value="appliedForm.date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><SendOutlined />投递方式</span>
          </template>
          <a-select
            id="applied-method"
            v-model:value="appliedForm.method"
            placeholder="请选择投递方式"
            style="width: 100%"
          >
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.applyMethods"
              :key="`apply-method-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><FileTextOutlined />备注（选填）</span>
          </template>
          <a-textarea v-model:value="appliedForm.note" :rows="2" placeholder="如：投递了哪个部门、使用了谁的内推等" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { message, DatePicker, Upload } from 'ant-design-vue'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  EditOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  ReadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import { InterviewCalendar, OverlaySurfaceModal } from '@osg/shared/components'
import type { InterviewEvent } from '@osg/shared/types'
import { getToken } from '@osg/shared/utils'
import { useDictFacade, mergeDictWithExistingValues } from '@osg/shared'
import {
  getStudentApplicationsMeta,
  getStudentApplicationCoachingClassRecords,
  listStudentApplications,
  requestStudentApplicationCoaching,
  type StudentApplicationsMeta,
  type StudentApplicationCoachingClassRecord,
  type StudentApplicationCoachingRecord,
  updateStudentPositionApply,
  updateStudentApplicationCoaching,
  type StudentApplicationRecord
} from '@osg/shared/api'

const { items: companyTypeDictOptions, load: loadCompanyTypeDict } = useDictFacade('osg_company_type')
const mergedCompanyTypeOptions = computed(() =>
  mergeDictWithExistingValues(
    companyTypeDictOptions.value,
    applicationsMeta.value.filterOptions.companyTypes
  )
)

type TabKey = 'all' | 'applied' | 'ongoing' | 'completed'
type StageTone = { background: string; borderColor: string; color: string }

interface StageOption {
  value: string
  label: string
}

interface ApplyStageForm {
  stage: string
  hirevueType: string
  viLink: string
  otLink: string
  otAccount: string
  otPassword: string
  hirevueDeadline: string
  inviteScreenshotName: string
  inviteScreenshotUrl: string
  interviewTime: string
  interviewTimeUndetermined: boolean
  mentorCount: string
  preferMentor: string
  excludeMentor: string
  note: string
}

const applicationsActionTriggers = [
  { actionId: 'calendar-gs', label: 'GS Final interview detail' },
  { actionId: 'calendar-mck', label: 'MCK Case interview detail' },
  { actionId: 'summary-gs', label: 'GS Final summary pill' },
  { actionId: 'summary-mck', label: 'MCK Case summary pill' },
  { actionId: 'all-progress', label: 'all tab progress update' },
  { actionId: 'applied-mark', label: 'applied tab mark applied dialog' }
] as const

const activeTab = ref<TabKey>('all')
const selectedApplicationId = ref<number | null>(null)
const selectedInterviewId = ref<number | null>(null)
const interviewStages = ['hirevue', 'screening', 'first', 'second', 'third', 'case', 'superday']

const interviewModalOpen = ref(false)
const progressModalOpen = ref(false)
const appliedModalOpen = ref(false)
const coachingDetailModalOpen = ref(false)
const coachingEditModalOpen = ref(false)
const selectedCoachingApplicationId = ref<number | null>(null)
const selectedCoaching = ref<StudentApplicationCoachingRecord | null>(null)
const coachingClassRecords = ref<StudentApplicationCoachingClassRecord[]>([])
const coachingEditForm = ref({
  interviewTime: '',
  companyInterviewer: ''
})

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
    coachingStages: [],
    mentorCounts: [],
    coachingStatuses: [],
    companyTypes: [],
    applyMethods: []
  },
  schedule: []
})

const progressForm = ref<ApplyStageForm>(defaultApplyStageForm())

const stageToneMap: Record<string, StageTone> = {
  applied: { background: '#E0E7FF', borderColor: '#6366F1', color: '#4338CA' },
  hirevue: { background: '#DBEAFE', borderColor: '#3B82F6', color: '#1E40AF' },
  screening: { background: '#F3E8FF', borderColor: '#8B5CF6', color: '#6D28D9' },
  first: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  second: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  third: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  case: { background: '#F59E0B', borderColor: '#F59E0B', color: '#fff' },
  superday: { background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B' },
  offer: { background: '#DCFCE7', borderColor: '#22C55E', color: '#166534' },
  rejected: { background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B' },
  withdraw: { background: '#F3F4F6', borderColor: '#9CA3AF', color: '#6B7280' }
}

const appliedForm = ref({
  date: '',
  method: '',
  note: ''
})

type TabTone = 'primary' | 'success' | 'warning' | 'muted'
const tabDefs = computed<{ key: TabKey; label: string; icon: typeof OrderedListOutlined; count: number; tone: TabTone }[]>(() => [
  { key: 'all', label: '全部', icon: OrderedListOutlined, count: applicationsMeta.value.tabCounts.all, tone: 'primary' },
  { key: 'applied', label: '已投递', icon: SendOutlined, count: applicationsMeta.value.tabCounts.applied, tone: 'success' },
  { key: 'ongoing', label: '面试中', icon: ClockCircleOutlined, count: applicationsMeta.value.tabCounts.ongoing, tone: 'warning' },
  { key: 'completed', label: '已结束', icon: CheckCircleOutlined, count: applicationsMeta.value.tabCounts.completed, tone: 'muted' },
])

const columns = computed(() => {
  // RULE-A 学生端 8 字段 + 操作
  return [
    { title: '岗位名称', key: 'positionName', width: 180 },
    { title: '公司', key: 'companyName', width: 140 },
    { title: '行业', key: 'industry', width: 100 },
    { title: '岗位分类', key: 'category', width: 110 },
    { title: '地区', key: 'region', width: 100 },
    { title: '招聘周期', key: 'recruitmentCycle', width: 110 },
    { title: '投递时间', key: 'submittedAt', width: 110 },
    { title: '求职状态', key: 'applicationStatus', width: 110 },
    { title: '操作', key: 'actions', width: 120, fixed: 'right' as const }
  ]
})

const selectedApplication = computed(() =>
  applications.value.find((record) => record.id === selectedApplicationId.value) ?? null
)
const selectedCoachingApplication = computed(() =>
  applications.value.find((record) => record.id === selectedCoachingApplicationId.value) ?? null
)
const selectedApplicationBadge = computed(() => {
  const fallback = selectedApplication.value?.company?.trim()
  return fallback ? fallback.slice(0, 2).toUpperCase() : 'JP'
})

const calendarEvents = computed<InterviewEvent[]>(() =>
  applications.value
    .filter((record) => !!record.interviewAt)
    .map((record) => ({
      id: record.id,
      interviewTime: record.interviewAt,
      studentName: '',
      company: record.company,
      position: record.position,
      location: record.location,
      interviewStage: record.stageLabel,
      coachingStatus: record.coachingStatus
    }))
)

function handleCalendarEventClick(event: InterviewEvent) {
  openInterviewModal(event.id)
}

const progressStageOptions = computed<StageOption[]>(() => {
  const merged = new Map<string, StageOption>()

  applicationsMeta.value.filterOptions.progressStages.forEach((option) => {
    merged.set(option.value, { value: option.value, label: option.label })
  })

  applicationsMeta.value.filterOptions.coachingStages.forEach((option) => {
    if (!merged.has(option.value)) {
      merged.set(option.value, { value: option.value, label: option.label })
    }
  })

  const order = ['applied', 'hirevue', 'screening', 'first', 'second', 'third', 'case', 'superday', 'offer', 'rejected', 'withdraw']
  return Array.from(merged.values()).sort((left, right) => order.indexOf(left.value) - order.indexOf(right.value))
})
const stageLabelByValue = computed(() => new Map(progressStageOptions.value.map((option) => [option.value, option.label])))
const showUpdateInterviewFields = computed(() => interviewStages.includes(progressForm.value.stage))

const selectedInterviewApplication = computed(() =>
  applications.value.find((record) => record.id === selectedInterviewId.value) ?? null
)

const selectedInterviewTitle = computed(() => {
  const app = selectedInterviewApplication.value
  if (!app) return ''
  return `${app.company} - ${app.stageLabel}`
})

const selectedInterviewModalTime = computed(() => {
  const app = selectedInterviewApplication.value
  if (!app?.interviewAt) return ''
  const iso = String(app.interviewAt).replace(' ', 'T')
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return app.interviewAt
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const interviewModalWrapClass = computed(() => {
  const tone = selectedInterviewApplication.value?.coachingStatus === 'coaching' ? 'info' : 'danger'
  return `applications-modal applications-modal--interview applications-modal--${tone}`
})

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

// 客户端分页（与 assistant/lead-mentor『position』页一致的规范）
const tablePagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`
})

watch(
  visibleApplications,
  (rows) => {
    tablePagination.total = rows.length
    const maxPage = Math.max(1, Math.ceil(rows.length / Number(tablePagination.pageSize ?? 10)))
    if (Number(tablePagination.current ?? 1) > maxPage) {
      tablePagination.current = maxPage
    }
  },
  { immediate: true }
)

function handleTableChange(pag: TablePaginationConfig) {
  tablePagination.current = pag.current ?? 1
  tablePagination.pageSize = pag.pageSize ?? Number(tablePagination.pageSize ?? 10)
}

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

function stageDropdownOptions(currentStage?: string) {
  const sevenStages = progressStageOptions.value.filter((option) => interviewStages.includes(option.value))
  if (!currentStage || sevenStages.some((option) => option.value === currentStage)) {
    return sevenStages
  }

  return [{ value: currentStage, label: currentStage }, ...sevenStages]
}

function openApplyCoachingModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  progressForm.value = defaultApplyStageForm()
  progressModalOpen.value = true
}

function selectStageTone(stage?: string): StageTone {
  return stageToneMap[stage || 'applied'] ?? stageToneMap.applied
}

function stageTagStyle(stage?: string): Record<string, string> {
  const tone = stageToneMap[stage || 'applied'] ?? stageToneMap.applied
  return { background: tone.background, color: tone.color, border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', display: 'inline-block' }
}

function rowClassName(record: StudentApplicationRecord) {
  if (record.bucket === 'completed') return 'row-completed'
  if (activeTab.value === 'applied') return 'row-applied'
  if (record.coachingStatus === 'coaching') return 'row-coaching'
  if (record.coachingStatus === 'pending') return 'row-pending'
  return ''
}

// RULE-E：学员状态字典中文 label（normal/absent 字面值不允许 UI 露出）
function memberStatusLabel(value?: string): string {
  if (value === 'absent') return '旷课'
  if (value === 'normal') return '出席'
  return value || '-'
}

// antd-vue 4 expandedRowRender 是把 { record, index, indent, expanded } 作为单参数传入，
// 不是 record 本身。早期实现误把 wrapper 当 record，导致展开行永远显示「暂无阶段辅导申请」。
function renderApplicationCoachings(params: { record: StudentApplicationRecord } | StudentApplicationRecord) {
  const record = (params as { record: StudentApplicationRecord }).record ?? (params as StudentApplicationRecord)
  const coachings = record.coachings || []
  if (coachings.length === 0) {
    return h('div', { class: 'application-coachings-panel application-coachings-panel--empty' }, [
      h('i', { class: 'mdi mdi-calendar-blank-outline', 'aria-hidden': true }),
      h('span', null, '暂无阶段辅导申请')
    ])
  }

  return h('div', { class: 'application-coachings-panel' }, coachings.map((coaching) => {
    const mentor = coaching.mentorNames || coaching.mentorName || ''
    const rating = coaching.latestRating || ''
    const lessons = coaching.reportedLessonCount || 0
    const interviewer = coaching.companyInterviewer || ''
    const time = coaching.interviewTime || ''

    return h('article', { key: coaching.coachingId, class: 'application-coaching-card' }, [
      h('span', { class: 'application-coaching-card__accent', 'aria-hidden': 'true' }),
      h('header', { class: 'application-coaching-card__head' }, [
        h('div', { class: 'application-coaching-card__title-group' }, [
          h('span', { class: 'stage-tag', style: stageTagStyle(coaching.interviewStage) }, coaching.interviewStageLabel || '-'),
          h('span', { class: 'application-coaching-card__id' }, `#${coaching.coachingId}`)
        ]),
        h('nav', { class: 'application-coaching-card__actions' }, [
          h('button', {
            class: 'application-coaching-card__action',
            type: 'button',
            onClick: () => openCoachingDetail(record, coaching),
          }, [
            h('i', { class: 'mdi mdi-eye-outline', 'aria-hidden': 'true' }),
            h('span', null, '查看详情'),
          ]),
          h('button', {
            class: 'application-coaching-card__action application-coaching-card__action--edit',
            type: 'button',
            onClick: () => openCoachingEdit(record, coaching),
          }, [
            h('i', { class: 'mdi mdi-pencil-outline', 'aria-hidden': 'true' }),
            h('span', null, '修改'),
          ]),
        ]),
      ]),
      h('div', { class: 'application-coaching-card__inline' }, [
        h('span', { class: 'application-coaching-card__inline-item' }, [
          h('i', { class: 'mdi mdi-calendar-clock-outline', 'aria-hidden': 'true' }),
          h('span', { class: time ? '' : 'application-coaching-card__muted' }, time || '面试时间待安排'),
        ]),
        h('span', { class: 'application-coaching-card__inline-item' }, [
          h('i', { class: 'mdi mdi-account-tie-voice-outline', 'aria-hidden': 'true' }),
          h('span', { class: interviewer ? '' : 'application-coaching-card__muted' }, interviewer || '公司面试官待补充'),
        ]),
      ]),
      h('dl', { class: 'application-coaching-card__stats' }, [
        h('div', { class: 'application-coaching-card__stat' }, [
          h('dt', null, '辅导导师'),
          h('dd', { class: mentor ? 'application-coaching-card__stat-value' : 'application-coaching-card__stat-value application-coaching-card__muted' }, mentor || '待匹配'),
        ]),
        h('div', { class: 'application-coaching-card__stat' }, [
          h('dt', null, '最新评分'),
          h('dd', { class: rating ? 'application-coaching-card__stat-value application-coaching-card__stat-value--accent' : 'application-coaching-card__stat-value application-coaching-card__muted' }, rating || '未评分'),
        ]),
        h('div', { class: 'application-coaching-card__stat' }, [
          h('dt', null, '已上报课消'),
          h('dd', { class: 'application-coaching-card__stat-value' }, [
            h('strong', null, String(lessons)),
            h('span', { class: 'application-coaching-card__stat-unit' }, ' 次'),
          ]),
        ]),
      ]),
    ])
  }))
}

function applyFilters() {
  filters.value.keyword = filters.value.keyword.trim()
}

function resetFilters() {
  filters.value = {
    keyword: '',
    stage: undefined,
    coachingStatus: undefined,
    companyType: undefined
  }
}

async function openCoachingDetail(record: StudentApplicationRecord, coaching: StudentApplicationCoachingRecord) {
  selectedCoachingApplicationId.value = record.id
  selectedCoaching.value = coaching
  coachingClassRecords.value = []
  coachingDetailModalOpen.value = true
  try {
    const detail = await getStudentApplicationCoachingClassRecords(record.id, coaching.coachingId)
    coachingClassRecords.value = detail.records || []
  } catch {
    return
  }
}

function openCoachingEdit(record: StudentApplicationRecord, coaching: StudentApplicationCoachingRecord) {
  selectedCoachingApplicationId.value = record.id
  selectedCoaching.value = coaching
  coachingEditForm.value = {
    interviewTime: toDatePickerMinute(coaching.interviewTime),
    companyInterviewer: coaching.companyInterviewer || ''
  }
  coachingEditModalOpen.value = true
}

async function saveCoachingEdit() {
  if (!selectedCoachingApplication.value || !selectedCoaching.value) {
    return
  }

  try {
    await updateStudentApplicationCoaching(
      selectedCoachingApplication.value.id,
      selectedCoaching.value.coachingId,
      {
        interviewTime: coachingEditForm.value.interviewTime,
        companyInterviewer: coachingEditForm.value.companyInterviewer
      }
    )
    await loadApplications()
    coachingEditModalOpen.value = false
    message.success('辅导信息已更新')
  } catch {
    return
  }
}

function toDatePickerMinute(value?: string) {
  if (!value || value === '-') {
    return ''
  }
  return value.replace(' ', 'T').slice(0, 16)
}

async function saveProgress() {
  if (!selectedApplication.value) {
    return
  }
  if (!progressForm.value.stage) {
    message.error('请选择面试阶段')
    return
  }
  if (progressForm.value.stage === 'hirevue') {
    if (!validateHirevueFields(progressForm.value)) {
      return
    }
  } else if (showUpdateInterviewFields.value && !validateInterviewFields(progressForm.value, true)) {
    return
  }

  try {
    const note = buildStageNote(progressForm.value)

    if (progressForm.value.stage === 'hirevue') {
      await requestStudentApplicationCoaching(selectedApplication.value.id, {
        interviewStage: progressForm.value.stage,
        requestedMentorCount: '1',
        requestNote: note
      })
    } else {
      await requestStudentApplicationCoaching(selectedApplication.value.id, {
        interviewStage: progressForm.value.stage,
        interviewTime: progressForm.value.interviewTimeUndetermined ? null : progressForm.value.interviewTime,
        city: selectedApplication.value.location,
        requestedMentorCount: progressForm.value.mentorCount,
        requestNote: note
      })
    }
    await loadApplications()
    progressModalOpen.value = false
    message.success('状态已更新！已通知班主任、助教和后台管理员。')
  } catch {
    return
  }
}

async function confirmApplied() {
  if (!selectedApplication.value) {
    return
  }

  if (!appliedForm.value.date) {
    message.error('请选择投递时间')
    return
  }

  try {
    await updateStudentPositionApply({
      positionId: selectedApplication.value.positionId,
      applied: true,
      date: appliedForm.value.date,
      method: appliedForm.value.method,
      note: appliedForm.value.note
    })
    await loadApplications()
    appliedModalOpen.value = false
    message.success('已标记为已投递')
  } catch {
    return
  }
}

async function bootstrapPage() {
  // 字典加载失败不阻断主流程：合并策略会降级为只用后端返回的历史值
  void loadCompanyTypeDict().catch(() => undefined)
  try {
    await loadApplications()
  } catch {
    return
  }
}

onMounted(() => {
  void bootstrapPage()
})

function defaultApplyStageForm(): ApplyStageForm {
  return {
    stage: '',
    hirevueType: '',
    viLink: '',
    otLink: '',
    otAccount: '',
    otPassword: '',
    hirevueDeadline: '',
    inviteScreenshotName: '',
    inviteScreenshotUrl: '',
    interviewTime: '',
    interviewTimeUndetermined: false,
    mentorCount: '',
    preferMentor: '',
    excludeMentor: '',
    note: ''
  }
}

// 邀请邮件截图真实上传配置（与岗位页同款 ruoyi /common/upload 实现）
const uploadAction = '/api/common/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))
const progressHirevueFileList = ref<any[]>([])

function handleUpdateHirevueUpload(info: { file: any; fileList?: any[] }) {
  progressHirevueFileList.value = info.fileList || []
  if (info.file?.status === 'done') {
    const url = info.file.response?.url || info.file.response?.fileName
    if (url) {
      progressForm.value.inviteScreenshotName = info.file.name ?? ''
      progressForm.value.inviteScreenshotUrl = url
      message.success('邀请邮件截图上传成功')
    } else {
      message.error('上传响应缺少 url，请重试')
    }
  } else if (info.file?.status === 'error') {
    message.error('邀请邮件截图上传失败，请重试')
  } else if (info.file?.status === 'removed') {
    progressForm.value.inviteScreenshotName = ''
    progressForm.value.inviteScreenshotUrl = ''
  }
}

function renderModalTitle(Icon: any, text: string) {
  return h('span', { class: 'modal-title-inline' }, [
    h(Icon, { class: 'modal-title-icon', 'aria-hidden': 'true' }),
    h('span', { class: 'modal-title-text' }, text)
  ])
}

function resolveStageLabel(stage: string) {
  return stageLabelByValue.value.get(stage) || stage
}

function buildStageNote(form: ApplyStageForm) {
  const lines: string[] = [`阶段：${resolveStageLabel(form.stage)}`]

  if (form.stage === 'hirevue') {
    if (form.hirevueType) {
      lines.push(`类型：${form.hirevueType === 'vi' ? 'VI' : 'OT'}`)
    }
    if (form.hirevueType === 'vi' && form.viLink.trim()) {
      lines.push(`VI链接：${form.viLink.trim()}`)
    }
    if (form.hirevueType === 'ot') {
      if (form.otLink.trim()) {
        lines.push(`OT链接：${form.otLink.trim()}`)
      }
      if (form.otAccount.trim()) {
        lines.push(`OT账号：${form.otAccount.trim()}`)
      }
      if (form.otPassword.trim()) {
        lines.push(`OT密码：${form.otPassword.trim()}`)
      }
    }
    if (form.hirevueDeadline) {
      lines.push(`截止时间：${form.hirevueDeadline}`)
    }
    if (form.inviteScreenshotName) {
      lines.push(`inviteScreenshot=${form.inviteScreenshotName}`)
    }
    if (form.inviteScreenshotUrl) {
      lines.push(`inviteScreenshotUrl=${form.inviteScreenshotUrl}`)
    }
  } else if (interviewStages.includes(form.stage)) {
    if (form.interviewTimeUndetermined) {
      lines.push(`面试时间：未确定`)
    } else if (form.interviewTime) {
      lines.push(`面试时间：${form.interviewTime}`)
    }
    if (form.mentorCount) {
      lines.push(`导师数量：${form.mentorCount}`)
    }
    if (form.preferMentor.trim()) {
      lines.push(`意向导师：${form.preferMentor.trim()}`)
    }
    if (form.excludeMentor.trim()) {
      lines.push(`排除导师：${form.excludeMentor.trim()}`)
    }
  }

  if (form.note.trim()) {
    lines.push(`备注：${form.note.trim()}`)
  }

  return lines.join('\n')
}

function validateHirevueFields(form: ApplyStageForm) {
  if (!form.hirevueType) {
    message.error('请选择 HireVue / OT 类型')
    return false
  }
  if (form.hirevueType === 'vi' && !form.viLink.trim()) {
    message.error('请填写 VI 链接')
    return false
  }
  if (form.hirevueType === 'ot') {
    if (!form.otLink.trim()) {
      message.error('请填写 OT 链接')
      return false
    }
    if (!form.otAccount.trim()) {
      message.error('请填写 OT 登录账号')
      return false
    }
    if (!form.otPassword.trim()) {
      message.error('请填写 OT 登录密码')
      return false
    }
  }
  if (!form.hirevueDeadline) {
    message.error('请填写 HireVue / OT 截止时间')
    return false
  }
  if (!form.inviteScreenshotUrl) {
    message.error('请上传邀请邮件截图')
    return false
  }
  return true
}

function validateInterviewFields(form: ApplyStageForm, requireMentorCount: boolean) {
  if (requireMentorCount && !form.mentorCount) {
    message.error('请选择导师数量')
    return false
  }
  if (!form.interviewTimeUndetermined && !form.interviewTime) {
    message.error('请填写该阶段的面试时间，或勾选"未确定"')
    return false
  }
  return true
}
</script>

<style scoped lang="scss">
.applications-page {
  > .page-header {
    margin-bottom: 20px;
  }

  > :deep(.ant-card) {
    margin-bottom: 16px;
  }

  .filter-card {
    :deep(.ant-card-body) {
      padding: 12px 16px 20px;
    }
  }

  .applications-table-card {
    overflow: hidden;
  }

  .applications-tab-header {
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
  }

  // 原型双层 tab：外层灰底容器 + 内层小 tab
  .applications-tab-pills {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 3px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .app-tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.3;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .app-tab:hover {
    color: #1e293b;
  }

  .app-tab__icon {
    font-size: 14px;
    line-height: 1;
  }

  .app-tab--active {
    background: var(--primary, #7399c6);
    color: #fff;
  }

  .app-tab--active:hover {
    color: #fff;
  }

  .app-tab__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    margin-left: 2px;
  }

  // 未高亮状态：count 彩色标识保留语义（全部/已投递/面试中/已结束）
  .app-tab:not(.app-tab--active) .app-tab__count--primary {
    background: var(--primary, #7399c6);
  }
  .app-tab:not(.app-tab--active) .app-tab__count--success {
    background: #22c55e;
  }
  .app-tab:not(.app-tab--active) .app-tab__count--warning {
    background: #f59e0b;
  }
  .app-tab:not(.app-tab--active) .app-tab__count--muted {
    background: #6b7280;
  }

  // 高亮状态 count 半透明白
  .app-tab--active .app-tab__count {
    background: rgba(255, 255, 255, 0.3);
  }

  // 表头：对齐原型的浅灰底小字样式
  .applications-table-card :deep(.ant-table-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }

  .applications-table-card :deep(.ant-table-thead > tr > th::before) {
    display: none;
  }

  .stage-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  // 已投递 tab 内 stage tag 是绿底白字 + ✓（原型对齐）
  .stage-tag--applied-bucket {
    background: #22c55e;
    color: #fff;
  }

  // 辅导状态颜色（不同于 a-tag default）
  .coaching-tag-school {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .action-stage-select {
    min-width: 130px;
    width: 100%;
  }

  .action-stage-select :deep(.ant-select-selector) {
    height: 28px !important;
    padding: 0 24px 0 8px !important;
    border-radius: 6px !important;
    font-size: 11px;
    font-weight: 600;
  }

  .action-stage-select :deep(.ant-select-selection-item) {
    line-height: 26px !important;
  }

  // ╭──────────────────────────────────────────────────────────────────╮
  // │ 表格展开行：辅导记录卡片（Editorial timeline card）              │
  // │ Vue 3 a-table :expanded-row-render 用 h() 渲染的 vnode 丢失      │
  // │ scopeId，必须用 :global 让选择器穿透。                            │
  // │ 视觉语言：白卡 + 左侧品牌渐变垂带 + 信息三层级（标题 → 行内 → 数据）│
  // ╰──────────────────────────────────────────────────────────────────╯

  :global(.application-coachings-panel) {
    display: grid;
    gap: 12px;
    padding: 14px 18px 18px;
    background: linear-gradient(180deg, #f5f9fd 0%, #fbfcfd 100%);
    border-top: 1px dashed rgba(115, 153, 198, 0.28);
  }

  :global(.application-coachings-panel--empty) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    color: #94a3b8;
    font-size: 13px;
    font-style: italic;
    background: linear-gradient(180deg, #f5f9fd 0%, #fbfcfd 100%);
    border-top: 1px dashed rgba(115, 153, 198, 0.28);
  }
  :global(.application-coachings-panel--empty .mdi) {
    font-size: 18px;
    color: rgba(115, 153, 198, 0.8);
  }

  :global(.application-coaching-card) {
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 12px;
    padding: 14px 20px 14px 24px;
    background: #fff;
    border: 1px solid #e3edf7;
    border-radius: 12px;
    box-shadow:
      0 1px 0 rgba(115, 153, 198, 0.04),
      0 6px 18px -8px rgba(115, 153, 198, 0.18);
    overflow: hidden;
    transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  }
  :global(.application-coaching-card:hover) {
    border-color: rgba(115, 153, 198, 0.55);
    box-shadow:
      0 1px 0 rgba(115, 153, 198, 0.05),
      0 14px 28px -10px rgba(115, 153, 198, 0.28);
  }

  :global(.application-coaching-card__accent) {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #7399c6 0%, #9bb8d9 60%, #b8cee2 100%);
  }

  :global(.application-coaching-card__head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  :global(.application-coaching-card__title-group) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  :global(.application-coaching-card__id) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.02em;
  }

  :global(.application-coaching-card__actions) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  :global(.application-coaching-card__action) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 14px;
    border: 1px solid #c7d6ea;
    border-radius: 999px;
    background: #fff;
    color: #5a7ba3;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  :global(.application-coaching-card__action .mdi) {
    font-size: 14px;
    line-height: 1;
  }
  :global(.application-coaching-card__action:hover) {
    background: linear-gradient(180deg, #f5f9fd 0%, #eaf2fa 100%);
    border-color: #7399c6;
    color: #3a5a85;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px -4px rgba(115, 153, 198, 0.4);
  }
  :global(.application-coaching-card__action:active) {
    transform: translateY(0);
    box-shadow: none;
  }
  :global(.application-coaching-card__action--edit) {
    background: linear-gradient(180deg, #faf7ff 0%, #f3edff 100%);
    border-color: #d6c7eb;
    color: #6d4ca3;
  }
  :global(.application-coaching-card__action--edit:hover) {
    background: linear-gradient(180deg, #f3edff 0%, #e9deff 100%);
    border-color: #a888d4;
    color: #4d2f80;
    box-shadow: 0 4px 10px -4px rgba(124, 92, 168, 0.4);
  }

  :global(.application-coaching-card__inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 20px;
    color: #475569;
    font-size: 13px;
    line-height: 1.5;
  }
  :global(.application-coaching-card__inline-item) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  :global(.application-coaching-card__inline-item .mdi) {
    font-size: 15px;
    color: #7399c6;
    line-height: 1;
  }

  :global(.application-coaching-card__stats) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin: 0;
    padding: 12px 0 0;
    border-top: 1px dashed #e3edf7;
  }
  :global(.application-coaching-card__stat) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 16px;
    border-right: 1px solid #f0f5fa;
  }
  :global(.application-coaching-card__stat:last-child) {
    border-right: none;
    padding-right: 0;
  }
  :global(.application-coaching-card__stat dt) {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
    margin: 0;
  }
  :global(.application-coaching-card__stat dd) {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
  }
  :global(.application-coaching-card__stat-value--accent) {
    color: #5a7ba3;
  }
  :global(.application-coaching-card__stat-value strong) {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
  }
  :global(.application-coaching-card__stat-unit) {
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    margin-left: 2px;
  }
  :global(.application-coaching-card__muted) {
    color: #cbd5e1 !important;
    font-style: italic;
    font-weight: 500;
  }

  @media (max-width: 720px) {
    :global(.application-coaching-card__stats) {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    :global(.application-coaching-card__stat) {
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
      padding-right: 0;
      border-right: none;
      border-bottom: 1px dashed #f0f5fa;
      padding-bottom: 8px;
    }
    :global(.application-coaching-card__stat:last-child) {
      border-bottom: none;
      padding-bottom: 0;
    }
  }

  // ╭──────────────────────────────────────────────────────────────────╮
  // │ 辅导详情 / 修改辅导信息 弹窗内容（OverlaySurfaceModal 内）        │
  // │ 通过 Teleport 到 body，scoped 不可达 → 全部 :global()             │
  // │ 设计语言：与展开行 coaching-card 一致（accent / stage / stats）   │
  // ╰──────────────────────────────────────────────────────────────────╯

  :global(.student-coaching-modal__body) {
    display: grid;
    gap: 18px;
    padding: 22px 24px !important;
  }

  :global(.student-coaching-hero) {
    position: relative;
    display: grid;
    gap: 12px;
    padding: 18px 20px 18px 26px;
    background: linear-gradient(180deg, #f5f9fd 0%, #fbfcfd 100%);
    border: 1px solid #e3edf7;
    border-radius: 14px;
    overflow: hidden;
  }
  :global(.student-coaching-hero__accent) {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #7399c6 0%, #9bb8d9 60%, #b8cee2 100%);
  }
  :global(.student-coaching-hero__title-group) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  :global(.student-coaching-hero__id) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.02em;
  }
  :global(.student-coaching-hero__inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 20px;
    color: #475569;
    font-size: 13px;
    line-height: 1.5;
  }
  :global(.student-coaching-hero__inline-item) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  :global(.student-coaching-hero__inline-item .mdi) {
    font-size: 15px;
    color: #7399c6;
  }
  :global(.student-coaching-hero__stats) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin: 0;
    padding: 12px 0 0;
    border-top: 1px dashed rgba(115, 153, 198, 0.32);
  }
  :global(.student-coaching-hero__stat) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 16px;
    border-right: 1px solid #e8f0f8;
  }
  :global(.student-coaching-hero__stat:last-child) {
    border-right: none;
    padding-right: 0;
  }
  :global(.student-coaching-hero__stat dt) {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
    margin: 0;
  }
  :global(.student-coaching-hero__stat dd) {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
  }
  :global(.student-coaching-hero__accent-value) {
    color: #5a7ba3 !important;
  }
  :global(.student-coaching-hero__stat dd strong) {
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
  }
  :global(.student-coaching-hero__stat-unit) {
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    margin-left: 2px;
  }
  :global(.student-coaching-hero__muted) {
    color: #cbd5e1 !important;
    font-style: italic;
    font-weight: 500;
  }

  :global(.student-coaching-records) {
    display: grid;
    gap: 12px;
  }
  :global(.student-coaching-records__head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 4px;
  }
  :global(.student-coaching-records__title) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
    letter-spacing: 0.02em;
  }
  :global(.student-coaching-records__title .mdi) {
    font-size: 16px;
    color: #7399c6;
  }
  :global(.student-coaching-records__count) {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 10px;
    background: linear-gradient(180deg, #eaf2fa 0%, #d8e6f3 100%);
    color: #5a7ba3;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  :global(.student-coaching-records__empty) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px 18px;
    background: #fafbfc;
    border: 1px dashed #d8e3ee;
    border-radius: 12px;
    color: #94a3b8;
    font-size: 13px;
    font-style: italic;
  }
  :global(.student-coaching-records__empty .mdi) {
    font-size: 18px;
    color: rgba(115, 153, 198, 0.7);
  }

  :global(.student-coaching-timeline) {
    list-style: none;
    margin: 0;
    padding: 4px 0 0 0;
    display: grid;
    gap: 10px;
    position: relative;
  }
  :global(.student-coaching-timeline)::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 12px;
    bottom: 12px;
    width: 1px;
    background: linear-gradient(180deg, rgba(115, 153, 198, 0.5) 0%, rgba(115, 153, 198, 0.15) 100%);
  }
  :global(.student-coaching-timeline__item) {
    position: relative;
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 12px;
    align-items: stretch;
  }
  :global(.student-coaching-timeline__dot) {
    position: relative;
    width: 14px;
    height: 14px;
    margin-top: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #7399c6;
    box-shadow: 0 0 0 3px rgba(115, 153, 198, 0.12);
    flex-shrink: 0;
  }
  :global(.student-coaching-timeline__card) {
    background: #fff;
    border: 1px solid #e3edf7;
    border-radius: 10px;
    padding: 12px 14px;
    display: grid;
    gap: 6px;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }
  :global(.student-coaching-timeline__card:hover) {
    border-color: rgba(115, 153, 198, 0.55);
    box-shadow: 0 4px 12px -4px rgba(115, 153, 198, 0.22);
  }
  :global(.student-coaching-timeline__head) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  :global(.student-coaching-timeline__class) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: 600;
    color: #5a7ba3;
    background: #eaf2fa;
    padding: 2px 8px;
    border-radius: 6px;
  }
  :global(.student-coaching-timeline__mentor) {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
  }
  :global(.student-coaching-timeline__rate) {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
    padding: 2px 10px;
    border-radius: 999px;
    background: linear-gradient(180deg, #fff7e0 0%, #ffe9b0 100%);
    color: #b45309;
    font-size: 12px;
    font-weight: 700;
  }
  :global(.student-coaching-timeline__rate .mdi) {
    font-size: 13px;
    color: #f59e0b;
  }
  :global(.student-coaching-timeline__rate--empty) {
    background: #f4f6f9;
    color: #94a3b8;
    font-weight: 500;
    font-style: italic;
  }
  :global(.student-coaching-timeline__meta) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }
  :global(.student-coaching-timeline__meta-item) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  :global(.student-coaching-timeline__meta-item .mdi) {
    font-size: 13px;
    color: #94a3b8;
  }
  :global(.student-coaching-timeline__meta-item strong) {
    color: #1e293b;
    font-weight: 700;
  }
  :global(.student-coaching-timeline__absent) {
    color: #c2410c;
  }
  :global(.student-coaching-timeline__absent .mdi) {
    color: #f97316 !important;
  }

  :global(.student-coaching-context) {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 14px;
    padding: 14px 16px 14px 22px;
    margin-bottom: 18px;
    background: linear-gradient(180deg, #f5f9fd 0%, #fbfcfd 100%);
    border: 1px solid #e3edf7;
    border-radius: 12px;
    overflow: hidden;
  }
  :global(.student-coaching-context__accent) {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #7399c6 0%, #9bb8d9 60%, #b8cee2 100%);
  }
  :global(.student-coaching-context__body) {
    display: grid;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  :global(.student-coaching-context__title) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  :global(.student-coaching-context__id) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
  }
  :global(.student-coaching-context__sub) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
  }
  :global(.student-coaching-context__sub .mdi) {
    font-size: 15px;
    color: #7399c6;
  }
  :global(.student-coaching-context__sub strong) {
    color: #1e293b;
    font-weight: 600;
  }
  :global(.student-coaching-context__dot) {
    color: #cbd5e1;
  }

  @media (max-width: 720px) {
    :global(.student-coaching-hero__stats) {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    :global(.student-coaching-hero__stat) {
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
      padding-right: 0;
      border-right: none;
      border-bottom: 1px dashed #e8f0f8;
      padding-bottom: 6px;
    }
    :global(.student-coaching-hero__stat:last-child) {
      border-bottom: none;
      padding-bottom: 0;
    }
    :global(.student-coaching-timeline__rate) {
      margin-left: 0;
    }
  }

  .modal-stage-select {
    min-width: 116px;
    height: 32px;
    padding: 4px 28px 4px 10px;
    border-width: 1px;
    border-style: solid;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .native-form-input,
  .native-form-select {
    width: 100%;
    min-height: 40px;
    border: 1px solid #d0d7e2;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }

  .native-form-input:focus,
  .native-form-select:focus {
    border-color: var(--applications-modal-accent, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
    outline: none;
  }

  .native-form-input--file {
    padding: 8px 10px;
  }

  .native-form-textarea {
    min-height: 88px;
    resize: vertical;
  }

  .rich-modal-shell {
    display: grid;
    gap: 16px;
  }

  .rich-modal-shell--compact {
    gap: 12px;
  }

  .rich-form-card {
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    background: #f8fafc;
    padding: 16px;
  }

  .rich-form-card--subtle {
    background: #fff;
    border-color: #dbe5f0;
  }

  .rich-form-header {
    margin-bottom: 12px;
  }

  .rich-form-header--subtle {
    margin-bottom: 14px;
  }

  .rich-form-title {
    margin: 0;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 13px;
    font-weight: 700;
  }

  .rich-form-help {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  .rich-form-stack {
    display: grid;
    gap: 14px;
  }

  .rich-form-field {
    color: #334155;
    font-size: 13px;
  }

  .rich-form-field--full {
    grid-column: 1 / -1;
  }

  .rich-modal-shell :deep(.ant-form-item),
  .rich-form-stack :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  .rich-modal-shell :deep(.ant-form-item-label),
  .rich-form-stack :deep(.ant-form-item-label) {
    padding-bottom: 6px;

    > label {
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      height: auto;
    }
  }

  .rich-modal-shell :deep(.ant-form-item-explain),
  .rich-modal-shell :deep(.ant-form-item-extra),
  .rich-form-stack :deep(.ant-form-item-explain),
  .rich-form-stack :deep(.ant-form-item-extra) {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .inline-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    min-height: 40px;
    align-items: center;
    padding: 0 2px;
  }

  .inline-radio-group label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 13px;
  }

  .field-required {
    color: #dc2626;
  }

  .field-optional {
    color: #94a3b8;
    font-size: 12px;
  }

  .field-helper {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
  }

  .field-label-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .upload-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 2px dashed #dbe5f0;
    border-radius: 10px;
    padding: 20px 16px;
    background: #fff;
    color: #475569;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .upload-dropzone:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  .upload-dropzone--compact {
    padding-block: 16px;
  }

  .upload-dropzone__icon {
    font-size: 26px;
    color: var(--applications-modal-accent, #1d4ed8);
  }

  .upload-dropzone__title {
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 12px;
    font-weight: 600;
  }

  .upload-dropzone__helper {
    color: #64748b;
    font-size: 11px;
  }

  .upload-dropzone__file {
    color: #0f172a;
    font-size: 12px;
    font-weight: 600;
  }

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

  .interview-detail-card,
  .modal-job-card {
    border-radius: 12px;
    padding: 16px;
  }

  .interview-detail-card {
    border: 1px solid var(--applications-modal-card-border, #dbeafe);
    background: var(--applications-modal-card-bg, #eff6ff);
  }

  .modal-job-card {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #dbe5f0;
  }

  .modal-job-title {
    font-size: 15px;
    font-weight: 600;
  }

  .modal-job-sub {
    margin-top: 4px;
    color: #475569;
    font-size: 13px;
  }

  .progress-card {
    border-color: var(--applications-modal-card-border, #ddd6fe);
    background: var(--applications-modal-card-bg, #f3e8ff);
  }

  .applied-card {
    border-color: var(--applications-modal-card-border, #bbf7d0);
    background: var(--applications-modal-card-bg, #dcfce7);
  }

  .modal-job-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  :global(.row-coaching td) {
    background: #f3e8ff !important;
  }

  :global(.row-coaching .job-company) {
    color: #6d28d9;
  }

  :global(.row-pending td) {
    background: #fef3c7 !important;
  }

  :global(.row-pending .job-company) {
    color: #92400e;
  }

  :global(.row-applied td) {
    background: #dcfce7 !important;
  }

  :global(.row-applied .job-company) {
    color: #166534;
  }

  :global(.row-completed td) {
    opacity: 0.7;
  }

  :global(.applications-modal) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f8fafc;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal.ant-modal-wrap) {
    overflow: auto !important;
  }

  :global(.applications-modal .ant-modal) {
    top: auto;
    padding-bottom: 0;
    margin: 0 auto;
    max-width: calc(100vw - 32px);
  }

  :global(.applications-modal .native-form-input),
  :global(.applications-modal .native-form-select) {
    width: 100%;
    min-height: 40px;
    border: 1px solid #d0d7e2;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }

  :global(.applications-modal .native-form-input:focus),
  :global(.applications-modal .native-form-select:focus) {
    border-color: var(--applications-modal-accent, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
    outline: none;
  }

  :global(.applications-modal .native-form-input--hidden) {
    display: none;
  }

  :global(.applications-modal .native-form-textarea) {
    min-height: 88px;
    resize: vertical;
  }

  :global(.applications-modal .rich-modal-shell) {
    display: grid;
    gap: 16px;
  }

  :global(.applications-modal .rich-modal-shell--compact) {
    gap: 12px;
  }

  :global(.applications-modal .rich-form-card) {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    padding: 16px;
  }

  :global(.applications-modal .rich-form-card--subtle) {
    background: #fff;
    border-color: #e2e8f0;
  }

  :global(.applications-modal .rich-form-header) {
    margin-bottom: 12px;
  }

  :global(.applications-modal .rich-form-header--subtle) {
    margin-bottom: 14px;
  }

  :global(.applications-modal .rich-form-title) {
    margin: 0;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 13px;
    font-weight: 700;
  }

  :global(.applications-modal .rich-form-help) {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  :global(.applications-modal .rich-form-stack) {
    display: grid;
    gap: 14px;
  }

  :global(.applications-modal .rich-form-field) {
    display: grid;
    gap: 7px;
    color: #334155;
    font-size: 13px;
    align-content: start;
  }

  :global(.applications-modal .rich-form-field--full) {
    grid-column: 1 / -1;
  }

  :global(.applications-modal .field-required) {
    color: #dc2626;
  }

  :global(.applications-modal .field-optional) {
    color: #94a3b8;
    font-size: 12px;
  }

  :global(.applications-modal .field-helper) {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
  }

  :global(.applications-modal .field-label-inline) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  :global(.applications-modal .inline-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    min-height: 40px;
    align-items: center;
    padding: 0 2px;
  }

  :global(.applications-modal .inline-radio-group label) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 13px;
  }

  :global(.applications-modal .upload-dropzone) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 2px dashed #d7e2ee;
    border-radius: 10px;
    padding: 20px 16px;
    background: #fff;
    text-align: center;
    cursor: pointer;
  }

  :global(.applications-modal .upload-dropzone:hover) {
    border-color: #7399c6;
    background: #f8fbff;
  }

  :global(.applications-modal .upload-dropzone--compact) {
    padding-block: 16px;
  }

  :global(.applications-modal .upload-dropzone__icon) {
    font-size: 26px;
    color: var(--applications-modal-accent, #1d4ed8);
  }

  :global(.applications-modal .upload-dropzone__title) {
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 12px;
    font-weight: 600;
  }

  :global(.applications-modal .upload-dropzone__helper) {
    color: #64748b;
    font-size: 11px;
  }

  :global(.applications-modal .upload-dropzone__file) {
    color: #0f172a;
    font-size: 12px;
    font-weight: 600;
  }

  :global(.applications-modal .interview-detail-card) {
    border: 1px solid var(--applications-modal-card-border, #e2e8f0);
    border-radius: 12px;
    background: var(--applications-modal-card-bg, #e8f0f8);
    padding: 16px;
  }

  :global(.applications-modal .interview-detail-card .modal-heading) {
    color: var(--applications-modal-accent, #1d4ed8);
  }

  :global(.applications-modal .modal-job-card) {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
  }

  :global(.applications-modal .modal-job-title) {
    font-size: 15px;
    font-weight: 600;
  }

  :global(.applications-modal .modal-job-sub) {
    margin-top: 4px;
    color: #475569;
    font-size: 13px;
  }

  :global(.applications-modal .modal-job-mark) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  :global(.applications-modal .ant-modal-content) {
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 20px 56px rgba(115, 153, 198, 0.22);
    overflow: hidden;
  }

  :global(.applications-modal .ant-modal-header) {
    padding: 22px 26px;
    border-bottom: 0;
    background: linear-gradient(135deg, var(--applications-modal-header-from), var(--applications-modal-header-to));
  }

  :global(.applications-modal .ant-modal-title) {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
  }

  :global(.applications-modal .modal-title-inline) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  :global(.applications-modal .modal-title-icon) {
    flex: none;
    font-size: 18px;
  }

  :global(.applications-modal .modal-title-text) {
    line-height: 1.2;
  }


  :global(.applications-modal .ant-modal-body) {
    max-height: 70vh;
    overflow-y: auto;
    padding: 26px;
    background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  }

  :global(.applications-modal .ant-modal-footer) {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 26px 20px;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
    background: transparent;
  }

  :global(.applications-modal .interview-modal-titlebar) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  :global(.applications-modal .interview-modal-closebtn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    flex-shrink: 0;
  }

  :global(.applications-modal .interview-modal-closebtn:hover) {
    background: rgba(255, 255, 255, 0.36);
  }

  :global(.applications-modal .ant-modal-footer .ant-btn) {
    min-width: 88px;
    height: 36px;
    border-radius: 10px;
    font-weight: 600;
    box-shadow: none;
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-default) {
    border-color: #dbe5f0;
    background: #fff;
    color: #475569;
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-primary) {
    border: 0;
    background: linear-gradient(135deg, var(--applications-modal-header-from), var(--applications-modal-header-to));
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-primary:not(:disabled):hover) {
    opacity: 0.95;
  }

  :global(.applications-modal--progress) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f8fafc;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal--applied) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f0fdf4;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal--interview) {
    --applications-modal-footer-bg: #eff6ff;
  }

  :global(.applications-modal--danger) {
    --applications-modal-header-from: #ef4444;
    --applications-modal-header-to: #f87171;
    --applications-modal-footer-bg: #fff5f5;
    --applications-modal-card-bg: #fef2f2;
    --applications-modal-card-border: #fecaca;
    --applications-modal-accent: #dc2626;
  }

  :global(.applications-modal--warning) {
    --applications-modal-header-from: #f59e0b;
    --applications-modal-header-to: #fbbf24;
    --applications-modal-footer-bg: #fffdf0;
    --applications-modal-card-bg: #fffbeb;
    --applications-modal-card-border: #fde68a;
    --applications-modal-accent: #d97706;
  }

  :global(.applications-modal--info) {
    --applications-modal-header-from: #3b82f6;
    --applications-modal-header-to: #60a5fa;
    --applications-modal-footer-bg: #f0f7ff;
    --applications-modal-card-bg: #eff6ff;
    --applications-modal-card-border: #bfdbfe;
    --applications-modal-accent: #2563eb;
  }

  @media (max-width: 760px) {
    :global(.applications-modal.ant-modal-wrap) {
      padding: 10px !important;
    }

    :global(.applications-modal .ant-modal) {
      max-width: calc(100vw - 20px);
    }

    :global(.applications-modal .ant-modal-header),
    :global(.applications-modal .ant-modal-body),
    :global(.applications-modal .ant-modal-footer) {
      padding-left: 16px;
      padding-right: 16px;
    }

    :global(.applications-modal .ant-modal-body) {
      max-height: 72vh;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    :global(.applications-modal .ant-modal-footer) {
      flex-wrap: wrap;
    }

    :global(.applications-modal .ant-modal-footer .ant-btn) {
      flex: 1 1 140px;
    }
  }
}

</style>
