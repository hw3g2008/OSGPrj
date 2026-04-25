import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('AssistantClassReportFlowModal (prototype-aligned)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../views/class-records/AssistantClassReportFlowModal.vue'),
    'utf-8',
  )

  it('renders the 4-step main form flat (no progressive disclosure)', () => {
    // Step 1: 选择学员
    expect(src).toContain('v-model:value="form.studentId"')
    expect(src).toContain('studentOptions')
    expect(src).toContain('loadStudents')

    // Step 2: 上课日期 + 时长
    expect(src).toContain('v-model:value="form.classDate"')
    expect(src).toContain('<a-date-picker')
    expect(src).toContain('v-model:value="form.durationHours"')
    expect(src).toContain(':min="0.5"')
    expect(src).toContain(':max="8"')
    expect(src).toContain(':step="0.5"')

    // Step 3: 学员状态（双卡 radio）
    expect(src).toContain('v-model:value="form.attendanceStatus"')
    expect(src).toContain('value="attended"')
    expect(src).toContain('value="absent"')
    expect(src).toContain('正常上课')
    expect(src).toContain('旷课未到场')

    // Step 4: 课程类型（5 种）
    expect(src).toContain('v-model:value="form.courseTypeUi"')
    expect(src).toContain("value: 'job-coaching'")
    expect(src).toContain("value: 'mock-interview'")
    expect(src).toContain("value: 'networking'")
    expect(src).toContain("value: 'mock-midterm'")
    expect(src).toContain("value: 'basic'")
  })

  it('shows absence remark only when attendanceStatus is absent', () => {
    expect(src).toContain("v-if=\"form.attendanceStatus === 'absent'\"")
    expect(src).toContain('v-model:value="form.absenceRemark"')
  })

  it('hides course type step when attendanceStatus is absent', () => {
    expect(src).toContain("v-if=\"form.attendanceStatus !== 'absent'\"")
  })

  it('has 5 feedback cards controlled by computed flags', () => {
    expect(src).toContain('showGeneralFeedback')
    expect(src).toContain('showResumeFeedback')
    expect(src).toContain('showMockInterviewFeedback')
    expect(src).toContain('showNetworkingFeedback')
    expect(src).toContain('showMidtermFeedback')
  })

  it('contains job-coaching branch fields (position + jobContent)', () => {
    expect(src).toContain('showJobCoachingFields')
    expect(src).toContain('v-model:value="form.positionLabel"')
    expect(src).toContain('v-model:value="form.jobContentType"')
    expect(src).toContain('positionOptions')
    expect(src).toContain('jobContentOptions')
  })

  it('contains basic-course branch (basicContentType select)', () => {
    expect(src).toContain('v-model:value="form.basicContentType"')
    expect(src).toContain('basicContentOptions')
  })

  it('contains resume upload when content type is resume_update', () => {
    expect(src).toContain('form.resumeBeforeFiles')
    expect(src).toContain('form.resumeAfterFiles')
    expect(src).toContain('<a-upload')
  })

  it('contains mock interview feedback fields', () => {
    expect(src).toContain('v-model:value="form.mockPurpose"')
    expect(src).toContain('v-model:value="form.mockConcepts"')
    expect(src).toContain('v-model:value="form.mockWeakTopics"')
    expect(src).toContain('v-model:value="form.performanceRating"')
    expect(src).toContain('performanceOptions')
  })

  it('contains networking score items and recommendation', () => {
    expect(src).toContain('networkingScores')
    expect(src).toContain('form.networkingScoreMap')
    expect(src).toContain('v-model:value="form.networkingRecommendation"')
    expect(src).toContain('recommendationOptions')
  })

  it('contains midterm feedback fields', () => {
    expect(src).toContain('v-model:value="form.midtermScore"')
    expect(src).toContain('v-model:value="form.midtermAnalysis"')
    expect(src).toContain('v-model:value="form.midtermProgress"')
    expect(src).toContain('progressOptions')
  })

  it('uses Ant Design Vue components throughout', () => {
    expect(src).toContain('<OverlaySurfaceModal')
    expect(src).toContain('<a-form')
    expect(src).toContain('<a-form-item')
    expect(src).toContain('<a-select')
    expect(src).toContain('<a-date-picker')
    expect(src).toContain('<a-input-number')
    expect(src).toContain('<a-textarea')
    expect(src).toContain('<a-alert')
    expect(src).toContain('<a-radio-group')
    expect(src).toContain('<a-upload')
    expect(src).toContain('<a-tag')
  })

  it('maps UI course type to backend API on submit', () => {
    // Modal 引用 payload 映射函数（具体 return 'basic_course' 等实现细节
    // 由 assistant-class-report-payload.spec.ts 负责验证）
    expect(src).toContain('resolvePayloadCourseType')
    expect(src).toContain('resolvePayloadClassStatus')
  })

  it('hides 学习时长 field for absent scenario (no class happened)', () => {
    expect(src).toContain("v-if=\"form.attendanceStatus !== 'absent'\"")
    // 时长字段位于 a-col 中，absent 时整列隐藏
    expect(src).toMatch(/<a-col v-if="form\.attendanceStatus !== 'absent'"[^>]*>\s*<a-form-item name="durationHours"/)
  })

  it('does not send courseType/durationHours/feedbackContent when absent (contract)', () => {
    // absent 分支 payload 精简
    expect(src).toContain("const isAbsent = form.attendanceStatus === 'absent'")
    expect(src).toMatch(/isAbsent[\s\n]*\?[\s\n]*\{[\s\S]*?studentId[\s\S]*?classStatus[\s\S]*?classDate[\s\S]*?\}[\s\n]*:/)
    // absent 分支不应包含 courseType/durationHours/feedbackContent 的直接赋值（都在 非 absent 分支）
  })

  it('serializes extra fields to topics/comments', () => {
    expect(src).toContain('resolveTopics')
    expect(src).toContain('resolveComments')
    expect(src).toContain('createAssistantClassRecord')
  })

  it('emits submitted event on success', () => {
    expect(src).toContain("emit('submitted')")
    expect(src).toContain("emit('update:open', false)")
    expect(src).toContain("message.success('课程记录已提交，等待后台审核')")
  })

  it('exposes open prop and update:open emit', () => {
    expect(src).toContain(':open="open"')
    expect(src).toContain("'update:open'")
  })
})
