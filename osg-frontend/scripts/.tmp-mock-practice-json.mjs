import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

zh.career.mockPractice = {
  pageTitle: '模拟应聘管理',
  filter: { searchPlaceholder: '搜索学员姓名...', typePlaceholder: '全部类型', statusPlaceholder: '全部状态', search: '搜索', reset: '重置' },
  type: { mockInterview: '模拟面试', communicationTest: '人际关系测试', midtermExam: '期中考试', default: '模拟应聘' },
  status: { pending: '待处理', scheduled: '已安排', completed: '已完成', cancelled: '已取消', unknown: '未知' },
  tab: { pending: '待分配导师', all: '全部记录' },
  statCard: { pending: '待处理', scheduled: '已安排', completed: '已完成', cancelled: '已取消' },
  columns: { student: '学员', type: '类型', requestContent: '申请内容', submittedAt: '申请时间', action: '操作', mentor: '导师', status: '状态', completedHours: '已上课时', feedbackRating: '课程反馈' },
  pendingAlert: '以下学员申请了模拟应聘，需要分配导师',
  pendingEmpty: '当前筛选条件下暂无待分配导师的申请',
  allEmpty: '当前筛选条件下暂无模拟应聘记录',
  unnamedStudent: '未命名学员',
  noPreferredMentor: '暂无意向导师',
  pendingAssign: '待分配',
  noFeedback: '暂无反馈',
  studentFallback: '学员',
  assignMentorFallback: '可分配导师',
  relativeJustNow: '刚刚',
  relativeHoursAgo: '{hours} 小时前',
  relativeDaysAgo: '{days} 天前',
  action: { assign: '分配导师', viewFeedback: '查看反馈' },
  messages: { assignSuccess: '模拟应聘导师分配已完成' },
  assignModal: {
    title: '处理模拟应聘申请',
    pendingStudent: '待分配学员',
    requestedCount: '建议导师 {count} 位',
    mentorPoolTitle: '导师候选池',
    mentorPoolDesc: '意向导师优先默认勾选，可继续补充分配导师。',
    multiMentorBadge: '支持多导师',
    noMentor: '当前没有可分配导师，请先补充导师目录。',
    scheduledAt: '预约时间',
    scheduledAtPlaceholder: '选择预约时间',
    notePlaceholder: '例如：先安排行为面模拟，下一次补 technical drill。',
    note: '备注说明',
    cancel: '取消',
    submit: '确认安排',
    submitting: '提交中...',
    preferredFlag: '意向导师',
    warnSelectMentor: '请至少选择1位导师',
    warnSelectTime: '请选择预约时间'
  },
  feedbackModal: {
    title: '查看模拟反馈',
    pendingStudent: '待查看学员',
    noRating: '暂无评分',
    pending: '待补充',
    noFeedback: '暂无反馈内容。',
    fields: { mentor: '导师', mentorBackground: '导师背景', completedHours: '已上课时', scheduledAt: '预约时间' },
    feedbackLabel: '反馈摘要',
    noteLabel: '备注',
    close: '关闭'
  }
}

en.career.mockPractice = {
  pageTitle: 'Mock Practice Management',
  filter: { searchPlaceholder: 'Search student name...', typePlaceholder: 'All Types', statusPlaceholder: 'All Status', search: 'Search', reset: 'Reset' },
  type: { mockInterview: 'Mock Interview', communicationTest: 'Communication Test', midtermExam: 'Midterm Exam', default: 'Mock Practice' },
  status: { pending: 'Pending', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', unknown: 'Unknown' },
  tab: { pending: 'Pending Assignment', all: 'All Records' },
  statCard: { pending: 'Pending', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' },
  columns: { student: 'Student', type: 'Type', requestContent: 'Request', submittedAt: 'Submitted At', action: 'Action', mentor: 'Mentor', status: 'Status', completedHours: 'Hours Done', feedbackRating: 'Feedback' },
  pendingAlert: 'The following students have applied for mock practice and need a mentor assigned',
  pendingEmpty: 'No pending mentor assignment applications match the current filters',
  allEmpty: 'No mock practice records match the current filters',
  unnamedStudent: 'Unnamed Student',
  noPreferredMentor: 'No preferred mentor',
  pendingAssign: 'Pending',
  noFeedback: 'No feedback',
  studentFallback: 'Student',
  assignMentorFallback: 'Available Mentor',
  relativeJustNow: 'Just now',
  relativeHoursAgo: '{hours} hrs ago',
  relativeDaysAgo: '{days} days ago',
  action: { assign: 'Assign Mentor', viewFeedback: 'View Feedback' },
  messages: { assignSuccess: 'Mock practice mentor assignment complete' },
  assignModal: {
    title: 'Handle Mock Practice Application',
    pendingStudent: 'Pending Student',
    requestedCount: 'Suggested {count} mentor(s)',
    mentorPoolTitle: 'Mentor Pool',
    mentorPoolDesc: 'Preferred mentors are pre-selected; you may add more.',
    multiMentorBadge: 'Multi-mentor',
    noMentor: 'No assignable mentors. Please add mentors to the directory first.',
    scheduledAt: 'Scheduled Time',
    scheduledAtPlaceholder: 'Select scheduled time',
    notePlaceholder: 'e.g. Start with behavioral mock, then technical drill next time.',
    note: 'Notes',
    cancel: 'Cancel',
    submit: 'Confirm',
    submitting: 'Submitting...',
    preferredFlag: 'Preferred',
    warnSelectMentor: 'Please select at least 1 mentor',
    warnSelectTime: 'Please select a scheduled time'
  },
  feedbackModal: {
    title: 'View Mock Feedback',
    pendingStudent: 'Pending Student',
    noRating: 'No rating',
    pending: 'Pending',
    noFeedback: 'No feedback content.',
    fields: { mentor: 'Mentor', mentorBackground: 'Mentor Background', completedHours: 'Hours Done', scheduledAt: 'Scheduled At' },
    feedbackLabel: 'Feedback Summary',
    noteLabel: 'Notes',
    close: 'Close'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
