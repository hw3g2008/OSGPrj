import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.teaching) zh.teaching = {}
if (!en.teaching) en.teaching = {}

zh.teaching.allClasses = {
  pageTitle: '全部课程',
  export: '导出',
  alert: {
    message: '课程审核与支付流程',
    step1: '① 导师/班主任/助教提交',
    step2: '② 待审核',
    step3: '③ 未支付',
    step4: '④ 已支付'
  },
  tabs: { all: '全部', pending: '待审核', unpaid: '未支付', paid: '已支付', rejected: '已驳回' },
  filter: {
    searchPlaceholder: '搜索学员/导师姓名...',
    courseTypePlaceholder: '全部课程类型',
    courseTypes: {
      onboarding_interview: '入职面试',
      mock_interview: '模拟面试',
      written_test: '笔试辅导',
      midterm_exam: '模拟期中考试',
      communication_midterm: '人际关系期中考试',
      qbank_request: '题库申请'
    },
    sourcePlaceholder: '全部来源',
    sources: { mentor: '导师端', headteacher: '班主任端', assistant: '助教端' },
    dateStart: '开始日期',
    dateEnd: '结束日期',
    search: '搜索',
    reset: '重置'
  },
  columns: {
    classId: '课程ID', student: '学员', mentor: '导师', courseType: '课程类型',
    duration: '时长', date: '日期', source: '来源', status: '状态', rate: '评价', action: '操作'
  },
  empty: '当前筛选下暂无课程记录',
  pagination: { total: '共 {total} 条记录' },
  action: { review: '审核', view: '查看' },
  messages: {
    loadError: '全部课程加载失败',
    detailError: '课程详情加载失败',
    approveSuccess: '已通过审核',
    rejectSuccess: '已驳回',
    exportInfo: '导出功能将在后续版本中接入'
  },
  modal: {
    classId: '课程ID',
    source: '提交来源',
    status: '状态',
    mentor: '导师',
    student: '学员',
    courseType: '课程类型',
    date: '上课日期',
    duration: '课时',
    durationValue: '{hours} 小时',
    fee: '课时费',
    topics: '课程主题',
    mockFeedback: '面试辅导反馈',
    performance: '学员表现',
    rate: '评分',
    purpose: '本次课程目的',
    knowledge: '本次课程涉及的知识点',
    improvement: '学员需要改进的地方',
    suggestion: '后续建议',
    entryFeedback: '入职培训反馈',
    midtermFeedback: '模拟期中考试反馈',
    examScore: '考试分数',
    assessmentTopic: '考核题目',
    detailFeedback: '详细反馈',
    networkingFeedback: '人际关系考核反馈',
    emailQuality: '邮件质量',
    emailEtiquette: '邮件礼仪',
    callQuality: '通话质量',
    selfIntro: '自我介绍',
    thankYou: '感谢邮件',
    recommend: '是否推荐',
    recommendYes: '是',
    recommendNo: '否',
    additionalNotes: '补充说明',
    paid: '已支付',
    paidDate: '支付日期：{date}',
    writtenFeedback: '笔试辅导反馈',
    rejectedReason: '驳回原因',
    noRejectedReason: '暂无驳回原因',
    rejectedMeta: '驳回时间：{time} | 审核人：{name}',
    reviewNote: '审核备注',
    reviewNotePlaceholder: '输入审核备注（可选）',
    close: '关闭',
    reject: '驳回',
    approve: '通过',
    headerTitle: {
      mock: '课程详情 - 模拟面试',
      entry: '课程审核 - 入职面试',
      midterm: '课程详情 - 模拟期中考试',
      networking: '课程详情 - 人际关系期中考试',
      written: '课程审核 - 笔试辅导',
      rejected: '课程详情 - 已驳回',
      default: '课程详情',
      reviewEntry: '课程审核 - 入职面试',
      reviewWritten: '课程审核 - 笔试辅导'
    }
  }
}

en.teaching.allClasses = {
  pageTitle: 'All Classes',
  export: 'Export',
  alert: {
    message: 'Class Review & Payment Flow',
    step1: '① Mentor/Head Teacher/Assistant Submit',
    step2: '② Pending Review',
    step3: '③ Unpaid',
    step4: '④ Paid'
  },
  tabs: { all: 'All', pending: 'Pending', unpaid: 'Unpaid', paid: 'Paid', rejected: 'Rejected' },
  filter: {
    searchPlaceholder: 'Search student/mentor...',
    courseTypePlaceholder: 'All Types',
    courseTypes: {
      onboarding_interview: 'Onboarding Interview',
      mock_interview: 'Mock Interview',
      written_test: 'Written Test',
      midterm_exam: 'Mock Midterm',
      communication_midterm: 'Networking Midterm',
      qbank_request: 'Q-Bank Request'
    },
    sourcePlaceholder: 'All Sources',
    sources: { mentor: 'Mentor', headteacher: 'Head Teacher', assistant: 'Assistant' },
    dateStart: 'Start Date',
    dateEnd: 'End Date',
    search: 'Search',
    reset: 'Reset'
  },
  columns: {
    classId: 'Class ID', student: 'Student', mentor: 'Mentor', courseType: 'Type',
    duration: 'Duration', date: 'Date', source: 'Source', status: 'Status', rate: 'Rating', action: 'Action'
  },
  empty: 'No class records found',
  pagination: { total: 'Total {total} records' },
  action: { review: 'Review', view: 'View' },
  messages: {
    loadError: 'Failed to load classes',
    detailError: 'Failed to load class detail',
    approveSuccess: 'Approved',
    rejectSuccess: 'Rejected',
    exportInfo: 'Export will be available in a future version'
  },
  modal: {
    classId: 'Class ID',
    source: 'Source',
    status: 'Status',
    mentor: 'Mentor',
    student: 'Student',
    courseType: 'Course Type',
    date: 'Class Date',
    duration: 'Hours',
    durationValue: '{hours} hrs',
    fee: 'Course Fee',
    topics: 'Topics',
    mockFeedback: 'Mock Interview Feedback',
    performance: 'Performance',
    rate: 'Rating',
    purpose: 'Session Purpose',
    knowledge: 'Topics Covered',
    improvement: 'Areas to Improve',
    suggestion: 'Follow-up Suggestions',
    entryFeedback: 'Onboarding Feedback',
    midtermFeedback: 'Mock Midterm Feedback',
    examScore: 'Exam Score',
    assessmentTopic: 'Assessment Topic',
    detailFeedback: 'Detailed Feedback',
    networkingFeedback: 'Networking Assessment Feedback',
    emailQuality: 'Email Quality',
    emailEtiquette: 'Email Etiquette',
    callQuality: 'Call Quality',
    selfIntro: 'Self Introduction',
    thankYou: 'Thank-you Email',
    recommend: 'Recommend',
    recommendYes: 'Yes',
    recommendNo: 'No',
    additionalNotes: 'Additional Notes',
    paid: 'Paid',
    paidDate: 'Paid on: {date}',
    writtenFeedback: 'Written Test Feedback',
    rejectedReason: 'Rejection Reason',
    noRejectedReason: 'No rejection reason provided',
    rejectedMeta: 'Rejected at: {time} | Reviewer: {name}',
    reviewNote: 'Review Note',
    reviewNotePlaceholder: 'Enter review note (optional)',
    close: 'Close',
    reject: 'Reject',
    approve: 'Approve',
    headerTitle: {
      mock: 'Class Detail - Mock Interview',
      entry: 'Class Review - Onboarding Interview',
      midterm: 'Class Detail - Mock Midterm',
      networking: 'Class Detail - Networking Midterm',
      written: 'Class Review - Written Test',
      rejected: 'Class Detail - Rejected',
      default: 'Class Detail',
      reviewEntry: 'Class Review - Onboarding Interview',
      reviewWritten: 'Class Review - Written Test'
    }
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
