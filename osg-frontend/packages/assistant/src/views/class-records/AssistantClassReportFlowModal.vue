<template>
  <OverlaySurfaceModal
    surface-id="modal-assistant-class-report"
    :open="open"
    :width="800"
    max-height="90vh"
    @cancel="handleClose"
  >
    <template #title>
      <span class="report-modal__title">
        <FileTextOutlined aria-hidden="true" />
        <span>上报课程记录</span>
      </span>
    </template>

    <a-alert type="info" show-icon class="report-modal__banner">
      <template #message>请在上课后填写课程记录和反馈，提交后需等待后台审核</template>
    </a-alert>

    <a-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      layout="vertical"
      :required-mark="false"
      class="report-modal__form"
    >
      <!-- Step 1: 选择学员 -->
      <a-form-item name="studentId">
        <template #label>
          <span class="report-modal__label">
            <span class="report-modal__step-badge">1</span>
            选择学员<span class="report-modal__required">*</span>
          </span>
        </template>
        <a-select
          v-model:value="form.studentId"
          placeholder="请选择学员"
          show-search
          :filter-option="filterStudentOption"
          :loading="studentsLoading"
          :disabled="submitting"
          :options="studentOptions"
        />
      </a-form-item>

      <!-- Step 2: 上课日期和时长 -->
      <div class="report-modal__section">
        <div class="report-modal__section-title">
          <span class="report-modal__step-badge">2</span>上课日期和时长
        </div>
        <a-row :gutter="16">
          <a-col :span="form.attendanceStatus === 'absent' ? 24 : 12">
            <a-form-item name="classDate">
              <template #label>
                <span class="report-modal__label">上课日期<span class="report-modal__required">*</span></span>
              </template>
              <a-date-picker
                v-model:value="form.classDate"
                placeholder="请选择上课日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                :disabled="submitting"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="form.attendanceStatus !== 'absent'" :span="12">
            <a-form-item name="durationHours">
              <template #label>
                <span class="report-modal__label">学习时长<span class="report-modal__required">*</span></span>
              </template>
              <a-input-number
                v-model:value="form.durationHours"
                :min="0.5"
                :max="8"
                :step="0.5"
                :precision="1"
                placeholder="请输入学习时长"
                style="width: 100%"
                :disabled="submitting"
              >
                <template #addonAfter>小时</template>
              </a-input-number>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <!-- Step 3: 学员状态 -->
      <div class="report-modal__section">
        <div class="report-modal__section-title">
          <span class="report-modal__step-badge">3</span>学员状态<span class="report-modal__required">*</span>
        </div>
        <a-radio-group
          v-model:value="form.attendanceStatus"
          class="status-cards"
          :disabled="submitting"
        >
          <label
            class="status-card status-card--success"
            :class="{ 'status-card--selected': form.attendanceStatus === 'attended' }"
          >
            <a-radio value="attended" />
            <div class="status-card__copy">
              <div class="status-card__title">
                <CheckCircleOutlined /> 正常上课
              </div>
              <div class="status-card__sub">学员按时参加课程</div>
            </div>
          </label>
          <label
            class="status-card status-card--danger"
            :class="{ 'status-card--selected': form.attendanceStatus === 'absent' }"
          >
            <a-radio value="absent" />
            <div class="status-card__copy">
              <div class="status-card__title">
                <UserDeleteOutlined /> 旷课未到场
              </div>
              <div class="status-card__sub">学员未参加课程</div>
            </div>
          </label>
        </a-radio-group>

        <div v-if="form.attendanceStatus === 'absent'" class="warning-panel">
          <a-form-item class="report-modal__compact">
            <template #label>
              <span class="report-modal__label report-modal__label--danger">旷课备注</span>
            </template>
            <a-textarea
              v-model:value="form.absenceRemark"
              :rows="2"
              placeholder="请简要说明旷课情况（可选）..."
              :maxlength="200"
              show-count
              :disabled="submitting"
            />
          </a-form-item>
        </div>
      </div>

      <!-- Step 4: 课程类型 -->
      <div v-if="form.attendanceStatus !== 'absent'" class="report-modal__section">
        <div class="report-modal__section-title">
          <span class="report-modal__step-badge">4</span>课程类型<span class="report-modal__required">*</span>
        </div>
        <a-radio-group
          v-model:value="form.courseTypeUi"
          class="course-type-list"
          :disabled="submitting"
        >
          <label
            v-for="ct in courseTypes"
            :key="ct.value"
            class="course-type-option"
            :class="{ 'course-type-option--selected': form.courseTypeUi === ct.value }"
          >
            <a-radio :value="ct.value" />
            <a-tag :color="ct.color">{{ ct.label }}</a-tag>
            <span class="course-type-copy">{{ ct.description }}</span>
          </label>
        </a-radio-group>
      </div>

      <!-- 岗位辅导：岗位选择 -->
      <div v-if="showJobCoachingFields" class="selection-panel selection-panel--blue">
        <a-form-item name="positionLabel" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label report-modal__label--primary">
              <BankOutlined /> 选择申请辅导的岗位<span class="report-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="form.positionLabel"
            placeholder="请选择岗位"
            :disabled="submitting"
            :options="positionOptions"
          />
        </a-form-item>
      </div>

      <!-- 岗位辅导：课程内容类型 -->
      <a-form-item v-if="showJobCoachingFields" name="jobContentType">
        <template #label>
          <span class="report-modal__label">课程内容类型<span class="report-modal__required">*</span></span>
        </template>
        <a-select
          v-model:value="form.jobContentType"
          placeholder="请选择课程内容类型"
          :disabled="submitting"
          :options="jobContentOptions"
        />
      </a-form-item>

      <!-- 基础课程：内容类型 -->
      <a-form-item v-if="form.courseTypeUi === 'basic'" name="basicContentType">
        <template #label>
          <span class="report-modal__label">基础课内容类型<span class="report-modal__required">*</span></span>
        </template>
        <a-select
          v-model:value="form.basicContentType"
          placeholder="请选择基础课内容类型"
          :disabled="submitting"
          :options="basicContentOptions"
        />
      </a-form-item>

      <!-- 反馈卡：通用 -->
      <div v-if="showGeneralFeedback" class="feedback-card">
        <div class="feedback-card__badge feedback-card__badge--primary">
          <CommentOutlined /> 课程反馈
        </div>
        <a-form-item name="feedbackContent" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">课程反馈<span class="report-modal__required">*</span></span>
          </template>
          <a-textarea
            v-model:value="form.feedbackContent"
            :rows="4"
            placeholder="请详细描述本次课程内容和学员表现..."
            :maxlength="1000"
            show-count
            :disabled="submitting"
          />
        </a-form-item>
      </div>

      <!-- 反馈卡：简历更新 -->
      <div v-if="showResumeFeedback" class="feedback-card">
        <div class="feedback-card__badge feedback-card__badge--blue">
          <FileTextOutlined /> 简历更新反馈
        </div>
        <a-form-item name="feedbackContent" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">课程反馈<span class="report-modal__required">*</span></span>
          </template>
          <a-textarea
            v-model:value="form.feedbackContent"
            :rows="3"
            placeholder="请描述简历修改的主要内容和建议..."
            :maxlength="1000"
            show-count
            :disabled="submitting"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item class="report-modal__compact">
              <template #label>
                <span class="report-modal__label">上传原简历</span>
              </template>
              <a-upload-dragger
                v-model:file-list="form.resumeBeforeFiles"
                :action="resumeUploadAction"
                :headers="resumeUploadHeaders"
                name="file"
                :max-count="1"
                accept=".pdf,.doc,.docx"
                class="resume-dragger"
                @change="handleResumeBeforeUpload"
              >
                <p class="resume-dragger__icon">
                  <InboxOutlined />
                </p>
                <p class="resume-dragger__text">点击或拖拽上传原简历</p>
                <p class="resume-dragger__hint">支持 PDF、Word 文档</p>
              </a-upload-dragger>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item class="report-modal__compact">
              <template #label>
                <span class="report-modal__label">上传修改后简历</span>
              </template>
              <a-upload-dragger
                v-model:file-list="form.resumeAfterFiles"
                :action="resumeUploadAction"
                :headers="resumeUploadHeaders"
                name="file"
                :max-count="1"
                accept=".pdf,.doc,.docx"
                class="resume-dragger"
                @change="handleResumeAfterUpload"
              >
                <p class="resume-dragger__icon">
                  <InboxOutlined />
                </p>
                <p class="resume-dragger__text">点击或拖拽上传修改后简历</p>
                <p class="resume-dragger__hint">支持 PDF、Word 文档</p>
              </a-upload-dragger>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <!-- 反馈卡：模拟面试 -->
      <div v-if="showMockInterviewFeedback" class="feedback-card">
        <div class="feedback-card__badge feedback-card__badge--green">
          <AudioOutlined /> 模拟面试反馈
        </div>
        <a-form-item name="feedbackContent" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">课程反馈<span class="report-modal__required">*</span></span>
          </template>
          <a-textarea
            v-model:value="form.feedbackContent"
            :rows="3"
            placeholder="请详细描述学员在模拟面试中的表现..."
            :maxlength="1000"
            show-count
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">模拟面试的目的</span>
          </template>
          <a-textarea
            v-model:value="form.mockPurpose"
            :rows="2"
            placeholder="请描述本次模拟面试的目的..."
            :maxlength="300"
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">涉及的概念和主题</span>
          </template>
          <a-textarea
            v-model:value="form.mockConcepts"
            :rows="2"
            placeholder="请列出本次课程涉及的概念和主题..."
            :maxlength="300"
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">学员需要改进的方面</span>
          </template>
          <a-textarea
            v-model:value="form.mockWeakTopics"
            :rows="2"
            placeholder="请描述学员需要改进的方面..."
            :maxlength="300"
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">学员表现评价</span>
          </template>
          <a-radio-group
            v-model:value="form.performanceRating"
            class="performance-grid"
            :disabled="submitting"
          >
            <label
              v-for="opt in performanceOptions"
              :key="opt.value"
              class="performance-option"
              :class="{ 'performance-option--selected': form.performanceRating === opt.value }"
            >
              <a-radio :value="opt.value" style="display:none" />
              <span class="performance-option__emoji">{{ opt.emoji }}</span>
              <span class="performance-option__label">{{ opt.label }}</span>
            </label>
          </a-radio-group>
        </a-form-item>
      </div>

      <!-- 反馈卡：人际关系 -->
      <div v-if="showNetworkingFeedback" class="feedback-card">
        <div class="feedback-card__badge feedback-card__badge--purple">
          <TeamOutlined /> 人际关系期中考试反馈
        </div>
        <a-form-item name="feedbackContent" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">课程反馈<span class="report-modal__required">*</span></span>
          </template>
          <a-textarea
            v-model:value="form.feedbackContent"
            :rows="3"
            placeholder="请详细描述学员在人际关系测试中的表现..."
            :maxlength="1000"
            show-count
            :disabled="submitting"
          />
        </a-form-item>
        <div class="score-card">
          <div class="score-card__title">
            <StarOutlined /> 评分项目
          </div>
          <a-row :gutter="16">
            <a-col v-for="field in networkingScores" :key="field.label" :span="12">
              <a-form-item class="report-modal__compact">
                <template #label>
                  <span class="report-modal__label">{{ field.label }}</span>
                </template>
                <a-select
                  v-model:value="form.networkingScoreMap[field.label]"
                  placeholder="请选择"
                  :options="field.options.map((o) => ({ value: o, label: o }))"
                  :disabled="submitting"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">是否推荐这位学生？</span>
          </template>
          <a-select
            v-model:value="form.networkingRecommendation"
            placeholder="请选择"
            :options="recommendationOptions.map((o) => ({ value: o, label: o }))"
            :disabled="submitting"
          />
        </a-form-item>
      </div>

      <!-- 反馈卡：模拟期中 -->
      <div v-if="showMidtermFeedback" class="feedback-card">
        <div class="feedback-card__badge feedback-card__badge--amber">
          <ReadOutlined /> 模拟期中考试反馈
        </div>
        <a-form-item name="feedbackContent" class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">课程反馈<span class="report-modal__required">*</span></span>
          </template>
          <a-textarea
            v-model:value="form.feedbackContent"
            :rows="3"
            placeholder="请详细描述学员在模拟期中考试中的表现..."
            :maxlength="1000"
            show-count
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">该学生得了多少分？</span>
          </template>
          <a-input-number
            v-model:value="form.midtermScore"
            :min="0"
            :max="100"
            placeholder="0"
            style="width: 140px"
            :disabled="submitting"
          >
            <template #addonAfter>分</template>
          </a-input-number>
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">逐题分析</span>
          </template>
          <a-textarea
            v-model:value="form.midtermAnalysis"
            :rows="4"
            placeholder="请详细分析学员在每道题目上的表现..."
            :maxlength="1000"
            :disabled="submitting"
          />
        </a-form-item>
        <a-form-item class="report-modal__compact">
          <template #label>
            <span class="report-modal__label">学生进度评估</span>
          </template>
          <a-select
            v-model:value="form.midtermProgress"
            placeholder="请选择"
            :options="progressOptions.map((o) => ({ value: o, label: o }))"
            :disabled="submitting"
          />
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <a-button :disabled="submitting" @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        <CheckOutlined /> 提交记录
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UploadFile } from 'ant-design-vue'
import {
  AudioOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CommentOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReadOutlined,
  StarOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import {
  createAssistantClassRecord,
  getAssistantStudentList,
  type AssistantClassRecordCreatePayload,
} from '@osg/shared/api'
import { getToken } from '@osg/shared/utils'
import {
  isMidtermContext,
  isMockInterviewContext,
  isNetworkingContext,
  isResumeContext,
  resolveComments as resolveCommentsFn,
  resolvePayloadClassStatus,
  resolvePayloadCourseType,
  resolveTopics as resolveTopicsFn,
  type AttendanceStatus,
  type CourseTypeUi,
} from './assistantClassReportPayload'

interface Props {
  open: boolean
}

interface FormState {
  studentId: number | undefined
  classDate: string
  durationHours: number | undefined
  attendanceStatus: AttendanceStatus
  absenceRemark: string
  courseTypeUi: CourseTypeUi
  positionLabel: string
  jobContentType: string
  basicContentType: string
  feedbackContent: string
  resumeBeforeFiles: UploadFile[]
  resumeAfterFiles: UploadFile[]
  resumeBeforeUrl: string
  resumeAfterUrl: string
  mockPurpose: string
  mockConcepts: string
  mockWeakTopics: string
  performanceRating: string
  networkingScoreMap: Record<string, string>
  networkingRecommendation: string
  midtermScore: number | undefined
  midtermAnalysis: string
  midtermProgress: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

// ── Options ──
const courseTypes: Array<{ value: CourseTypeUi; label: string; description: string; color: string }> = [
  { value: 'job-coaching', label: '岗位辅导', description: '岗位辅导的课程', color: 'blue' },
  { value: 'mock-interview', label: '模拟面试', description: '模拟面试的课程', color: 'green' },
  { value: 'networking', label: '人际关系', description: '人际关系的课程', color: 'purple' },
  { value: 'mock-midterm', label: '模拟期中', description: '模拟期中考试', color: 'orange' },
  { value: 'basic', label: '基础课程', description: '基础课程', color: 'geekblue' },
]

const positionOptions = [
  { value: 'Goldman Sachs · IB Analyst · Hong Kong', label: 'Goldman Sachs · IB Analyst · Hong Kong' },
  { value: 'Morgan Stanley · IBD Analyst · New York', label: 'Morgan Stanley · IBD Analyst · New York' },
  { value: 'McKinsey · Business Analyst · Shanghai', label: 'McKinsey · Business Analyst · Shanghai' },
]

const jobContentOptions = [
  { value: 'technical', label: '技术的' },
  { value: 'behavioral', label: '行为训练' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'mock_interview', label: '模拟面试的课程' },
  { value: 'networking_midterm', label: '人际关系的课程' },
  { value: 'mock_midterm', label: '模拟期中考试' },
  { value: 'case_prep', label: '咨询案例准备' },
  { value: 'other', label: '其他' },
]

const basicContentOptions = [
  { value: 'technical', label: '技术的' },
  { value: 'behavioral', label: '行为训练' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'case_prep', label: '咨询案例准备' },
  { value: 'other', label: '其他' },
]

const performanceOptions = [
  { value: 'disappointing', emoji: '😞', label: '失望' },
  { value: 'good', emoji: '🙂', label: '好的' },
  { value: 'great', emoji: '😊', label: '很好' },
  { value: 'amazing', emoji: '🌟', label: '真棒' },
]

const networkingScores = [
  { label: '电子邮件质量 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '电子邮件礼仪 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '闲聊/自我介绍质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '通话质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '感谢邮件 (1-3分)', options: ['1', '2', '3'] },
]

const recommendationOptions = [
  '是的 - 我相信这位学生很适合我的团队',
  '或许 - 如果他们能改进一下就好了',
  '不 - 他们需要认真加强准备工作',
]

const progressOptions = [
  '非常棒 - 进展顺利，会取得好成绩',
  '太好了 - 进展顺利',
  '好的 - 需要在一些方面下功夫',
  '令人失望 - 严重落后',
  '不适用 - 入学时间太短',
]

// ── State ──
const formRef = ref<FormInstance>()
const submitting = ref(false)
const studentsLoading = ref(false)
const studentOptions = ref<{ value: number; label: string }[]>([])

function createDefaultForm(): FormState {
  return {
    studentId: undefined,
    classDate: '',
    durationHours: 1,
    attendanceStatus: 'attended',
    absenceRemark: '',
    courseTypeUi: 'job-coaching',
    positionLabel: '',
    jobContentType: '',
    basicContentType: '',
    feedbackContent: '',
    resumeBeforeFiles: [],
    resumeAfterFiles: [],
    resumeBeforeUrl: '',
    resumeAfterUrl: '',
    mockPurpose: '',
    mockConcepts: '',
    mockWeakTopics: '',
    performanceRating: 'good',
    networkingScoreMap: Object.fromEntries(networkingScores.map((f) => [f.label, ''])),
    networkingRecommendation: '',
    midtermScore: undefined,
    midtermAnalysis: '',
    midtermProgress: '',
  }
}

const form = reactive<FormState>(createDefaultForm())

// 简历附件真实上传配置（与岗位页同款 ruoyi /common/upload 实现）
const resumeUploadAction = '/api/common/upload'
const resumeUploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))

function extractUploadedUrl(file: any): string {
  return file?.response?.url || file?.response?.fileName || ''
}

function handleResumeBeforeUpload(info: { file: any }) {
  if (info.file?.status === 'done') {
    const url = extractUploadedUrl(info.file)
    if (url) {
      form.resumeBeforeUrl = url
      message.success('原简历上传成功')
    } else {
      message.error('原简历上传响应缺少 url，请重试')
    }
  } else if (info.file?.status === 'error') {
    message.error('原简历上传失败，请重试')
  } else if (info.file?.status === 'removed') {
    form.resumeBeforeUrl = ''
  }
}

function handleResumeAfterUpload(info: { file: any }) {
  if (info.file?.status === 'done') {
    const url = extractUploadedUrl(info.file)
    if (url) {
      form.resumeAfterUrl = url
      message.success('修改后简历上传成功')
    } else {
      message.error('修改后简历上传响应缺少 url，请重试')
    }
  } else if (info.file?.status === 'error') {
    message.error('修改后简历上传失败，请重试')
  } else if (info.file?.status === 'removed') {
    form.resumeAfterUrl = ''
  }
}

// ── Rules ──
const formRules: Record<string, Rule[]> = {
  studentId: [{ required: true, message: '请选择学员', trigger: 'change' }],
  classDate: [{ required: true, message: '请选择上课日期', trigger: 'change' }],
  durationHours: [{ required: true, message: '请输入学习时长', trigger: 'change', type: 'number' }],
  positionLabel: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  jobContentType: [{ required: true, message: '请选择课程内容类型', trigger: 'change' }],
  basicContentType: [{ required: true, message: '请选择基础课内容类型', trigger: 'change' }],
  feedbackContent: [{ required: true, message: '请填写课程反馈', trigger: 'blur' }],
}

// ── Computed: 反馈区切换逻辑 ──
const showJobCoachingFields = computed(
  () => form.attendanceStatus === 'attended' && form.courseTypeUi === 'job-coaching',
)

const showResumeFeedback = computed(
  () => form.attendanceStatus === 'attended' && isResumeContext(form),
)

const showMockInterviewFeedback = computed(
  () => form.attendanceStatus === 'attended' && isMockInterviewContext(form),
)

const showNetworkingFeedback = computed(
  () => form.attendanceStatus === 'attended' && isNetworkingContext(form),
)

const showMidtermFeedback = computed(
  () => form.attendanceStatus === 'attended' && isMidtermContext(form),
)

const showGeneralFeedback = computed(() => {
  if (form.attendanceStatus !== 'attended') return false
  if (showResumeFeedback.value) return false
  if (showMockInterviewFeedback.value) return false
  if (showNetworkingFeedback.value) return false
  if (showMidtermFeedback.value) return false
  if (form.courseTypeUi === 'job-coaching' && !form.jobContentType) return false
  if (form.courseTypeUi === 'basic' && !form.basicContentType) return false
  return true
})

// ── Helpers ──
function filterStudentOption(input: string, option: { label: string }) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

async function loadStudents() {
  studentsLoading.value = true
  try {
    const response = await getAssistantStudentList({ pageNum: 1, pageSize: 999 })
    studentOptions.value = (response.rows || []).map((s) => ({
      value: s.studentId,
      label: s.studentName || `学员${s.studentId}`,
    }))
  } catch {
    studentOptions.value = []
  } finally {
    studentsLoading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      Object.assign(form, createDefaultForm())
      formRef.value?.clearValidate()
      loadStudents()
    }
  },
)

function handleClose() {
  if (submitting.value) return
  emit('update:open', false)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const classStatus = resolvePayloadClassStatus(form)
  if (!classStatus) {
    message.error('请选择课程内容类型')
    return
  }

  submitting.value = true
  try {
    const isAbsent = form.attendanceStatus === 'absent'
    // absent 场景：没有课发生，按"有就是有、没有就是没有"契约，
    // courseType / durationHours / feedbackContent / topics 都不传
    const payload: AssistantClassRecordCreatePayload = isAbsent
      ? {
          studentId: form.studentId!,
          classStatus,
          classDate: form.classDate,
        }
      : {
          studentId: form.studentId!,
          courseType: resolvePayloadCourseType(form),
          classStatus,
          classDate: form.classDate,
          durationHours: form.durationHours!,
          feedbackContent: form.feedbackContent.trim(),
        }
    if (!isAbsent) {
      const topics = resolveTopicsFn(form)
      if (topics) payload.topics = topics
    }
    const comments = resolveCommentsFn(form, performanceOptions)
    if (comments) payload.comments = comments

    await createAssistantClassRecord(payload)

    message.success('课程记录已提交，等待后台审核')
    emit('submitted')
    emit('update:open', false)
  } catch (error: any) {
    const msg = error?.response?.data?.msg || error?.message || '提交失败，请重试'
    message.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
$asst-primary: #7399c6;
$asst-primary-light: #e8f0f8;
$asst-text: #1e293b;
$asst-text-secondary: #64748b;
$asst-border: #e2e8f0;

.report-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.report-modal__banner {
  margin-bottom: 20px;
  border-radius: 10px;
}

.report-modal__form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }
}

.report-modal__section {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid $asst-border;
  border-radius: 12px;
  background: #fff;
}

.report-modal__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: $asst-text;
  font-size: 14px;
  font-weight: 600;
}

.report-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: $asst-text;
  font-size: 14px;
  font-weight: 600;
}

.report-modal__label--danger {
  color: #991b1b;
}

.report-modal__label--primary {
  color: $asst-primary;
}

.report-modal__required {
  color: #ef4444;
  margin-left: 2px;
}

.report-modal__step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $asst-primary;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-right: 4px;
}

.report-modal__compact {
  :deep(&.ant-form-item) {
    margin-bottom: 12px;
  }
}

.status-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid $asst-border;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  :deep(.ant-radio-wrapper) {
    margin-right: 0;
  }
}

.status-card--success.status-card--selected {
  border-color: #22c55e;
  background: #f0fdf4;
}

.status-card--danger.status-card--selected {
  border-color: #ef4444;
  background: #fef2f2;
}

.status-card__title {
  font-weight: 600;
  color: $asst-text;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-card--success .status-card__title {
  color: #166534;
}

.status-card--danger .status-card__title {
  color: #991b1b;
}

.status-card__sub {
  font-size: 12px;
  color: $asst-text-secondary;
  margin-top: 2px;
}

.warning-panel {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  border-radius: 10px;
}

.selection-panel {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 10px;
}

.selection-panel--blue {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.course-type-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  width: 100%;
}

.course-type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid $asst-border;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  :deep(.ant-radio-wrapper) {
    margin-right: 0;
  }
}

.course-type-option--selected {
  border-color: $asst-primary;
  background: $asst-primary-light;
}

.course-type-copy {
  font-size: 13px;
  color: $asst-text-secondary;
}

.feedback-card {
  margin-top: 20px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid $asst-border;
  border-radius: 12px;
}

.feedback-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.feedback-card__badge--primary {
  background: $asst-primary;
}

.feedback-card__badge--blue {
  background: #3b82f6;
}

.feedback-card__badge--green {
  background: #22c55e;
}

.feedback-card__badge--purple {
  background: #8b5cf6;
}

.feedback-card__badge--amber {
  background: #f59e0b;
}

.score-card {
  margin: 16px 0;
  padding: 16px;
  background: #f3e8ff;
  border-radius: 8px;
}

.score-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #7c3aed;
  margin-bottom: 12px;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}

.performance-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 2px solid $asst-border;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.performance-option--selected {
  border-color: $asst-primary;
  background: $asst-primary-light;
}

.performance-option__emoji {
  font-size: 24px;
}

.performance-option__label {
  font-size: 11px;
  color: $asst-text-secondary;
  margin-top: 4px;
}

.resume-dragger {
  :deep(.ant-upload.ant-upload-drag) {
    padding: 20px 12px;
    background: #fff;
    border: 2px dashed $asst-border;
    border-radius: 10px;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  :deep(.ant-upload.ant-upload-drag:hover) {
    border-color: $asst-primary;
    background: $asst-primary-light;
  }

  :deep(.ant-upload-drag-container) {
    padding: 6px 0;
  }
}

.resume-dragger__icon {
  margin-bottom: 10px;
  color: $asst-primary;
  font-size: 34px;
  line-height: 1;
}

.resume-dragger__text {
  margin: 0;
  color: $asst-text;
  font-size: 14px;
  font-weight: 600;
}

.resume-dragger__hint {
  margin: 6px 0 0;
  color: $asst-text-secondary;
  font-size: 12px;
}
</style>
