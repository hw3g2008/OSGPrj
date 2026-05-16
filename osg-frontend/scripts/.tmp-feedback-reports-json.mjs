import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.teaching) zh.teaching = {}
if (!en.teaching) en.teaching = {}

zh.teaching.feedback = {
  pageTitle: '课程反馈',
  export: '导出',
  statCards: { total: '全部反馈' },
  alert: {
    prep: 'Prep Feedback 包含：入职面试、模拟面试、笔试辅导 等课程类型的反馈',
    networking: 'Networking 包含：人际关系期中考试 等课程类型的反馈',
    mockMidterm: 'Mock Midterm 包含：模拟期中考试 等课程类型的反馈'
  },
  filter: {
    searchPlaceholder: '搜索学员...',
    mentorPlaceholder: '全部导师',
    performancePlaceholder: '学员表现',
    sourcePlaceholder: '提交来源',
    sources: { mentor: '导师端', headteacher: '班主任端', assistant: '助教端' },
    dateStart: '开始日期',
    dateEnd: '结束日期',
    search: '搜索'
  },
  prepColumns: {
    mentor: '导师', student: '学员', courseType: '课程类型', companyPosition: '公司/岗位',
    performance: '学员表现', date: '日期', source: '来源', updatedAt: '更新时间', action: '操作'
  },
  networkingColumns: {
    mentor: '导师', student: '学员', headTeacher: '班主任', emailQuality: '邮件质量',
    emailEtiquette: '邮件礼仪', callQuality: '通话质量', recommended: '是否推荐',
    date: '日期', source: '来源', action: '操作'
  },
  mockColumns: {
    mentor: '导师', student: '学员', performance: '学员表现', score: '评分',
    assessmentTopic: '考核题目', date: '日期', source: '来源', updatedAt: '更新时间', action: '操作'
  },
  empty: '暂无课程反馈',
  action: { view: '查看' },
  messages: {
    loadError: '课程反馈加载失败',
    exportInfo: '导出功能将在后续版本中接入',
    viewInfo: '查看详情功能将在后续版本中接入'
  }
}

en.teaching.feedback = {
  pageTitle: 'Course Feedback',
  export: 'Export',
  statCards: { total: 'All Feedback' },
  alert: {
    prep: 'Prep Feedback includes: Onboarding Interview, Mock Interview, Written Test, etc.',
    networking: 'Networking includes: Networking Midterm, etc.',
    mockMidterm: 'Mock Midterm includes: Mock Midterm Exam, etc.'
  },
  filter: {
    searchPlaceholder: 'Search student...',
    mentorPlaceholder: 'All Mentors',
    performancePlaceholder: 'Performance',
    sourcePlaceholder: 'Source',
    sources: { mentor: 'Mentor', headteacher: 'Head Teacher', assistant: 'Assistant' },
    dateStart: 'Start Date',
    dateEnd: 'End Date',
    search: 'Search'
  },
  prepColumns: {
    mentor: 'Mentor', student: 'Student', courseType: 'Course Type', companyPosition: 'Company/Position',
    performance: 'Performance', date: 'Date', source: 'Source', updatedAt: 'Updated At', action: 'Action'
  },
  networkingColumns: {
    mentor: 'Mentor', student: 'Student', headTeacher: 'Head Teacher', emailQuality: 'Email Quality',
    emailEtiquette: 'Email Etiquette', callQuality: 'Call Quality', recommended: 'Recommend',
    date: 'Date', source: 'Source', action: 'Action'
  },
  mockColumns: {
    mentor: 'Mentor', student: 'Student', performance: 'Performance', score: 'Score',
    assessmentTopic: 'Assessment Topic', date: 'Date', source: 'Source', updatedAt: 'Updated At', action: 'Action'
  },
  empty: 'No feedback found',
  action: { view: 'View' },
  messages: {
    loadError: 'Failed to load feedback',
    exportInfo: 'Export will be available in a future version',
    viewInfo: 'Detail view will be available in a future version'
  }
}

zh.teaching.reports = {
  pageTitle: '课时审核',
  export: '导出',
  alert: {
    overtime: '超时提醒：以下导师本周上课时间超过6小时',
    viewDetail: '查看详情'
  },
  filter: {
    searchPlaceholder: '搜索导师/学员...',
    courseTypePlaceholder: '课程类型',
    courseSourcePlaceholder: '课程来源',
    dateStart: '开始日期',
    dateEnd: '结束日期',
    search: '搜索'
  },
  tabs: { all: '全部', pending: '待审核', approved: '已通过', rejected: '已驳回' },
  courseTypes: {
    onboarding_interview: '入职面试', mock_interview: '模拟面试', written_test: '笔试辅导',
    midterm_exam: '模拟期中考试', communication_midterm: '人际关系期中',
    resume_revision: '简历修改', technical_coaching: '技术辅导'
  },
  courseSource: { student_request: '学生申请', mentor_report: '导师申报' },
  status: { pending: '待审核', approved: '已通过', rejected: '已驳回' },
  columns: {
    mentor: '导师', student: '学员', courseType: '课程类型', source: '来源',
    date: '日期', duration: '时长', weeklyTotal: '本周累计', status: '状态', action: '操作'
  },
  batchOp: { approve: '批量通过', reject: '批量驳回', selected: '已选择 {count} 条' },
  empty: '当前筛选条件下暂无课时审核记录',
  overtime: { thisWeek: '本周{hours}h', over30days: '超过30天' },
  action: { approve: '通过', reject: '驳回', detail: '详情' },
  messages: {
    approveSuccess: '课时审核已通过',
    rejectSuccess: '课时审核已驳回',
    batchApproveSuccess: '批量通过完成',
    batchRejectSuccess: '批量驳回完成',
    exportInfo: '导出功能将在后续版本中接入'
  },
  modal: {
    title: '课程反馈详情',
    mentor: '导师', student: '学员', status: '状态', courseType: '课程类型',
    date: '日期', duration: '学习时长',
    feedbackLabel: '课程反馈内容', noFeedback: '暂无课程反馈内容',
    reviewNote: '审核备注', reviewNotePlaceholder: '输入审核备注（可选）',
    close: '关闭', reject: '驳回', approve: '通过'
  }
}

en.teaching.reports = {
  pageTitle: 'Report Review',
  export: 'Export',
  alert: {
    overtime: 'Overtime Alert: The following mentors have exceeded 6 hours this week',
    viewDetail: 'View Detail'
  },
  filter: {
    searchPlaceholder: 'Search mentor/student...',
    courseTypePlaceholder: 'Course Type',
    courseSourcePlaceholder: 'Source',
    dateStart: 'Start Date',
    dateEnd: 'End Date',
    search: 'Search'
  },
  tabs: { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  courseTypes: {
    onboarding_interview: 'Onboarding Interview', mock_interview: 'Mock Interview', written_test: 'Written Test',
    midterm_exam: 'Mock Midterm', communication_midterm: 'Networking Midterm',
    resume_revision: 'Resume Revision', technical_coaching: 'Technical Coaching'
  },
  courseSource: { student_request: 'Student Request', mentor_report: 'Mentor Report' },
  status: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  columns: {
    mentor: 'Mentor', student: 'Student', courseType: 'Course Type', source: 'Source',
    date: 'Date', duration: 'Duration', weeklyTotal: 'Weekly Total', status: 'Status', action: 'Action'
  },
  batchOp: { approve: 'Batch Approve', reject: 'Batch Reject', selected: '{count} selected' },
  empty: 'No review records found',
  overtime: { thisWeek: 'This week {hours}h', over30days: '>30 days' },
  action: { approve: 'Approve', reject: 'Reject', detail: 'Detail' },
  messages: {
    approveSuccess: 'Report approved',
    rejectSuccess: 'Report rejected',
    batchApproveSuccess: 'Batch approve done',
    batchRejectSuccess: 'Batch reject done',
    exportInfo: 'Export will be available in a future version'
  },
  modal: {
    title: 'Course Feedback Detail',
    mentor: 'Mentor', student: 'Student', status: 'Status', courseType: 'Course Type',
    date: 'Date', duration: 'Duration',
    feedbackLabel: 'Feedback Content', noFeedback: 'No feedback content',
    reviewNote: 'Review Note', reviewNotePlaceholder: 'Enter review note (optional)',
    close: 'Close', reject: 'Reject', approve: 'Approve'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
