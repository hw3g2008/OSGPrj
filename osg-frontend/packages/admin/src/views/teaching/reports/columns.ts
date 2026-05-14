import { i18n } from '@osg/shared'

const t = (key: string) => i18n.global.t(key)

export const reportTabs = [
  { key: 'all', label: t('all') },
  { key: 'pending', label: t('pending_review') },
  { key: 'approved', label: t('approved') },
  { key: 'rejected', label: t('rejected_3') }
] as const

export const courseTypeMeta: Record<string, { label: string; tone: string }> = {
  onboarding_interview: { label: t('interview_2'), tone: 'info' },
  mock_interview: { label: t('mock_interview'), tone: 'success' },
  written_test: { label: t('written_test_coaching'), tone: 'purple' },
  midterm_exam: { label: t('mock_midterm_exam'), tone: 'purple' },
  communication_midterm: { label: t('networking_midterm'), tone: 'sky' },
  resume_revision: { label: t('resume_revision'), tone: 'warning' },
  technical_coaching: { label: t('technical_coaching'), tone: 'warning' }
}

export const courseSourceMeta: Record<string, { label: string; tone: string }> = {
  student_request: { label: t('student_request'), tone: 'info' },
  mentor_report: { label: t('mentor_submission'), tone: 'amber' }
}

export const statusMeta: Record<string, { label: string; tone: string }> = {
  pending: { label: t('pending_review'), tone: 'warning' },
  approved: { label: t('approved'), tone: 'success' },
  rejected: { label: t('rejected_3'), tone: 'danger' }
}
