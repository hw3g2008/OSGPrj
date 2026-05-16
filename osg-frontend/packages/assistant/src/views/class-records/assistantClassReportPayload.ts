export type CourseTypeUi =
  | 'job-coaching'
  | 'mock-interview'
  | 'networking'
  | 'mock-midterm'
  | 'basic'

export type AttendanceStatus = 'attended' | 'absent'

export interface PerformanceOption {
  value: string
  emoji: string
  label: string
}

export interface ReportFormSnapshot {
  courseTypeUi: CourseTypeUi
  basicContentType: string
  jobContentType: string
  attendanceStatus: AttendanceStatus
  absenceRemark: string
  positionLabel: string
  mockPurpose: string
  mockConcepts: string
  mockWeakTopics: string
  midtermAnalysis: string
  performanceRating: string
  networkingRecommendation: string
  networkingScoreMap: Record<string, string>
  midtermScore: number | undefined
  midtermProgress: string
  resumeBeforeFiles: Array<{ name?: string }>
  resumeAfterFiles: Array<{ name?: string }>
  resumeBeforeUrl?: string
  resumeAfterUrl?: string
}

// ── Payload enum mapping ──
export function resolvePayloadCourseType(
  form: Pick<ReportFormSnapshot, 'courseTypeUi'>,
): 'job_coaching' | 'mock_practice' | 'basic_course' {
  if (form.courseTypeUi === 'basic') return 'basic_course'
  if (form.courseTypeUi === 'job-coaching') return 'job_coaching'
  return 'mock_practice'
}

export function resolvePayloadClassStatus(
  form: Pick<ReportFormSnapshot, 'courseTypeUi' | 'basicContentType' | 'jobContentType' | 'attendanceStatus'>,
): string {
  if (form.attendanceStatus === 'absent') return 'absent'
  if (form.courseTypeUi === 'mock-interview') return 'mock_interview'
  if (form.courseTypeUi === 'networking') return 'networking_midterm'
  if (form.courseTypeUi === 'mock-midterm') return 'mock_midterm'
  if (form.courseTypeUi === 'basic') return form.basicContentType
  return form.jobContentType
}

// ── Feedback context detection ──
export function isResumeContext(form: Pick<ReportFormSnapshot, 'courseTypeUi' | 'jobContentType' | 'basicContentType'>): boolean {
  return (
    (form.courseTypeUi === 'job-coaching' && form.jobContentType === 'resume_update')
    || (form.courseTypeUi === 'basic' && form.basicContentType === 'resume_update')
  )
}

export function isMockInterviewContext(form: Pick<ReportFormSnapshot, 'courseTypeUi' | 'jobContentType'>): boolean {
  return (
    form.courseTypeUi === 'mock-interview'
    || (form.courseTypeUi === 'job-coaching' && form.jobContentType === 'mock_interview')
  )
}

export function isNetworkingContext(form: Pick<ReportFormSnapshot, 'courseTypeUi' | 'jobContentType'>): boolean {
  return (
    form.courseTypeUi === 'networking'
    || (form.courseTypeUi === 'job-coaching' && form.jobContentType === 'networking_midterm')
  )
}

export function isMidtermContext(form: Pick<ReportFormSnapshot, 'courseTypeUi' | 'jobContentType'>): boolean {
  return (
    form.courseTypeUi === 'mock-midterm'
    || (form.courseTypeUi === 'job-coaching' && form.jobContentType === 'mock_midterm')
  )
}

// ── Payload extra fields ──
export function resolveTopics(form: ReportFormSnapshot): string | undefined {
  const segments = [
    form.positionLabel,
    form.mockPurpose,
    form.mockConcepts,
    form.mockWeakTopics,
    form.midtermAnalysis,
  ]
    .map((v) => (v || '').trim())
    .filter(Boolean)
  return segments.length > 0 ? segments.join('\n') : undefined
}

export function resolveComments(
  form: ReportFormSnapshot,
  performanceOptions: PerformanceOption[],
): string | undefined {
  const segments: string[] = []
  segments.push(
    form.attendanceStatus === 'absent' ? '学员状态: 旷课未到场' : '学员状态: 已到课', // i18n-skip-line: backend payload format
  )
  if (form.absenceRemark.trim()) segments.push(`旷课备注: ${form.absenceRemark.trim()}`) // i18n-skip-line: backend payload format

  if (isMockInterviewContext(form) && form.performanceRating) {
    const opt = performanceOptions.find((o) => o.value === form.performanceRating)
    if (opt) segments.push(`学员表现: ${opt.label}`) // i18n-skip-line: backend payload format
  }

  if (isNetworkingContext(form)) {
    if (form.networkingRecommendation) {
      segments.push(`推荐意见: ${form.networkingRecommendation}`) // i18n-skip-line: backend payload format
    }
    Object.entries(form.networkingScoreMap)
      .filter(([, v]) => v && v.trim())
      .forEach(([label, v]) => segments.push(`${label}: ${v}`))
  }

  if (isMidtermContext(form)) {
    if (form.midtermScore !== undefined) {
      segments.push(`模拟期中分数: ${form.midtermScore}`) // i18n-skip-line: backend payload format
    }
    if (form.midtermProgress) segments.push(`进度评估: ${form.midtermProgress}`) // i18n-skip-line: backend payload format
  }

  if (form.resumeBeforeFiles.length > 0 && form.resumeBeforeFiles[0].name) {
    segments.push(`原简历: ${form.resumeBeforeFiles[0].name}`) // i18n-skip-line: backend payload format
  }
  if (form.resumeBeforeUrl) {
    segments.push(`原简历URL: ${form.resumeBeforeUrl}`) // i18n-skip-line: backend payload format
  }
  if (form.resumeAfterFiles.length > 0 && form.resumeAfterFiles[0].name) {
    segments.push(`修改后简历: ${form.resumeAfterFiles[0].name}`) // i18n-skip-line: backend payload format
  }
  if (form.resumeAfterUrl) {
    segments.push(`修改后简历URL: ${form.resumeAfterUrl}`) // i18n-skip-line: backend payload format
  }

  return segments.length > 0 ? segments.join('\n') : undefined
}
