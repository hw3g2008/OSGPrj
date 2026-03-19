import { http } from '../utils/request'

export interface StudentClassRecord {
  recordId: string
  coachingType: string
  coachingDetail: string
  coachingTagColor: string
  courseContent: string
  contentTagColor: string
  mentor: string
  mentorRole: string
  classDate: string
  classDateRaw: string
  isNew: boolean
  duration: string
  ratingScoreValue: string
  ratingLabel: string
  ratingColor: string
  actionLabel: string
  actionKind: 'rate' | 'detail'
  detailTitle: string
  tab: 'pending' | 'evaluated'
  ratingTags: string
  ratingFeedback: string
  newBadgeLabel: string
}

export function listStudentClassRecords(): Promise<{ records: StudentClassRecord[] }> {
  return http.get('/student/class-records/list')
}

export interface StudentClassRecordsMeta {
  pageSummary: {
    titleZh: string
    titleEn: string
    subtitle: string
  }
  reminderBanner: {
    iconLabel: string
    title: string
    leadText: string
    mentorName: string
    middleText: string
    newRecordCount: number
    suffixText: string
    ctaLabel: string
  }
  tabDefinitions: Array<{
    key: 'all' | 'pending' | 'evaluated'
    label: string
    displayLabel: string
    count: number
  }>
  filters: {
    keywordPlaceholder: string
    coachingTypePlaceholder: string
    courseContentPlaceholder: string
    timeRangePlaceholder: string
    resetLabel: string
    coachingTypeOptions: Array<{ value: string; label: string; color?: string }>
    courseContentOptions: Array<{ value: string; label: string; color?: string }>
    timeRangeOptions: Array<{ value: string; label: string }>
  }
  tableHeaders: {
    recordId: string
    coachingDetail: string
    courseContent: string
    mentor: string
    classDate: string
    duration: string
    rating: string
    action: string
  }
  detailDialog: {
    closeLabel: string
    confirmLabel: string
    fields: {
      recordId: string
      coachingDetail: string
      courseContent: string
      mentor: string
      classDate: string
      duration: string
    }
  }
  ratingDialog: {
    title: string
    scoreLabel: string
    tagLabel: string
    feedbackLabel: string
    tagPlaceholder: string
    feedbackPlaceholder: string
    cancelLabel: string
    submitLabel: string
    successMessage: string
    tagOptions: Array<{ value: string; label: string }>
  }
}

export function getStudentClassRecordsMeta(): Promise<StudentClassRecordsMeta> {
  return http.get('/student/class-records/meta')
}

export function rateStudentClassRecord(data: {
  recordId: string
  rating: number
  tags: string[]
  feedback: string
}): Promise<void> {
  return http.post('/student/class-records/rate', data)
}
