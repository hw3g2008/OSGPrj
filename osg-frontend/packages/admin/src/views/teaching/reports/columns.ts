export const reportTabs = [
  { key: 'all' },
  { key: 'pending' },
  { key: 'approved' },
  { key: 'rejected' }
] as const

export const courseTypeMeta: Record<string, { tone: string }> = {
  onboarding_interview: { tone: 'info' },
  mock_interview: { tone: 'success' },
  written_test: { tone: 'purple' },
  midterm_exam: { tone: 'purple' },
  communication_midterm: { tone: 'sky' },
  resume_revision: { tone: 'warning' },
  technical_coaching: { tone: 'warning' }
}

export const courseSourceMeta: Record<string, { tone: string }> = {
  student_request: { tone: 'info' },
  mentor_report: { tone: 'amber' }
}

export const statusMeta: Record<string, { tone: string }> = {
  pending: { tone: 'warning' },
  approved: { tone: 'success' },
  rejected: { tone: 'danger' }
}
