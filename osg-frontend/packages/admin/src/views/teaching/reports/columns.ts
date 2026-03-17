export const reportTabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' }
] as const

export const courseTypeMeta: Record<string, { label: string; tone: string }> = {
  onboarding_interview: { label: '入职面试', tone: 'info' },
  mock_interview: { label: '模拟面试', tone: 'success' },
  written_test: { label: '笔试辅导', tone: 'purple' },
  midterm_exam: { label: '模拟期中考试', tone: 'purple' },
  communication_midterm: { label: '人际关系期中', tone: 'sky' },
  resume_revision: { label: '简历修改', tone: 'warning' },
  technical_coaching: { label: '技术辅导', tone: 'warning' }
}

export const courseSourceMeta: Record<string, { label: string; tone: string }> = {
  student_request: { label: '学生申请', tone: 'info' },
  mentor_report: { label: '导师申报', tone: 'amber' }
}

export const statusMeta: Record<string, { label: string; tone: string }> = {
  pending: { label: '待审核', tone: 'warning' },
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' }
}
