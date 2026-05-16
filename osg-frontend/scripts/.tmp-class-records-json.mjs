import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.teaching) zh.teaching = {}
if (!en.teaching) en.teaching = {}

zh.teaching.classRecords = {
  pageTitle: '课程记录',
  export: '导出',
  exporting: '导出中...',
  alert: {
    message: '课程记录流程',
    step1: '① 学员申请岗位/模拟应聘',
    step2: '② 班主任分配导师',
    step3: '③ 导师上课并申报记录',
    step4: '④ 后台审核',
    step5: '⑤ 结算中心转账'
  },
  tabs: { all: '全部', pending: '待审核', approved: '已通过', rejected: '已驳回' },
  statCards: { total: '总记录数', pending: '待审核', approved: '已通过', rejected: '已驳回', pendingSettlement: '待结算金额' },
  filter: {
    searchPlaceholder: '搜索学员/申报人...',
    coachingTypePlaceholder: '辅导类型',
    courseContentPlaceholder: '课程内容',
    reporterRolePlaceholder: '申报人角色',
    dateLabel: '上课日期',
    dateStart: '开始日期',
    dateEnd: '结束日期',
    search: '搜索',
    coachingTypes: { position: '岗位辅导', mock: '模拟应聘' },
    courseContents: {
      new_resume: '新简历', resume_update: '简历更新', case_prep: 'Case准备',
      mock_interview: '模拟面试', communication_midterm: '人际关系期中考试',
      midterm_exam: '模拟期中考试', other: '其他'
    },
    sources: { mentor: '导师', headteacher: '班主任', assistant: '助教' }
  },
  columns: {
    recordId: '记录ID', student: '学员', reporter: '申报人', coachingType: '辅导内容',
    courseContent: '课程内容', classDate: '上课日期', duration: '时长', fee: '课时费',
    studentRating: '学员评价', status: '审核状态', action: '操作'
  },
  empty: '暂无课程记录',
  action: { review: '课程审核', detail: '详情' },
  messages: {
    loadError: '课程记录加载失败',
    detailError: '课程记录详情加载失败',
    approveSuccess: '课时审核已通过',
    approveFail: '课时审核通过失败',
    rejectSuccess: '课时审核已驳回',
    rejectFail: '课时审核驳回失败',
    exportSuccess: '课程记录导出成功',
    exportFail: '课程记录导出失败'
  },
  status: { approved: '已通过', rejected: '已驳回', pending: '待审核' },
  courseTypes: { mock: '模拟应聘', position: '岗位辅导' },
  sources: { mentor: '导师', headteacher: '班主任', assistant: '助教' },
  fields: {
    student: '学员', reporter: '申报人', coachingContent: '辅导内容',
    courseContent: '课程内容', classDate: '上课日期', duration: '时长',
    durationValue: '{hours}小时', fee: '课时费', submitTime: '提交时间',
    feedback: '课程反馈', attachments: '附件', unnamedFile: '未命名文件',
    noAttachments: '暂无附件', reviewResult: '审核结果', noReviewRemark: '暂无审核备注',
    studentRating: '学员评价'
  },
  detailModal: {
    title: '课程记录详情',
    loading: '正在加载课程记录详情...',
    close: '关闭'
  },
  reviewModal: {
    title: '课程记录审核',
    loading: '正在加载课程记录...',
    rejectReasonLabel: '驳回原因 *',
    rejectReasonPlaceholder: '请选择驳回原因',
    missingRejectReason: '请选择驳回原因',
    rejectRemarkLabel: '驳回说明',
    rejectRemarkPlaceholder: '补充本次驳回说明',
    reviewRemarkLabel: '审核备注',
    reviewRemarkPlaceholder: '输入审核备注（可选）',
    approveBtn: '通过',
    rejectBtn: '驳回',
    cancelBtn: '取消',
    submitApprove: '确认通过',
    submitReject: '确认驳回',
    submitting: '提交中...',
    rejectReasons: {
      r1: '课时时长有误', r2: '课程内容描述不清', r3: '课程类型选择错误',
      r4: '缺少必要附件', r5: '重复提交', r6: '其他原因'
    }
  }
}

en.teaching.classRecords = {
  pageTitle: 'Class Records',
  export: 'Export',
  exporting: 'Exporting...',
  alert: {
    message: 'Class Record Flow',
    step1: '① Student applies / Mock Interview',
    step2: '② Head Teacher assigns mentor',
    step3: '③ Mentor teaches & submits record',
    step4: '④ Admin review',
    step5: '⑤ Settlement center transfers'
  },
  tabs: { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  statCards: { total: 'Total', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', pendingSettlement: 'Pending Settlement' },
  filter: {
    searchPlaceholder: 'Search student/reporter...',
    coachingTypePlaceholder: 'Coaching Type',
    courseContentPlaceholder: 'Course Content',
    reporterRolePlaceholder: 'Reporter Role',
    dateLabel: 'Class Date',
    dateStart: 'Start Date',
    dateEnd: 'End Date',
    search: 'Search',
    coachingTypes: { position: 'Position Coaching', mock: 'Mock Application' },
    courseContents: {
      new_resume: 'New Resume', resume_update: 'Resume Update', case_prep: 'Case Prep',
      mock_interview: 'Mock Interview', communication_midterm: 'Networking Midterm',
      midterm_exam: 'Mock Midterm', other: 'Other'
    },
    sources: { mentor: 'Mentor', headteacher: 'Head Teacher', assistant: 'Assistant' }
  },
  columns: {
    recordId: 'Record ID', student: 'Student', reporter: 'Reporter', coachingType: 'Coaching Type',
    courseContent: 'Content', classDate: 'Class Date', duration: 'Duration', fee: 'Fee',
    studentRating: 'Rating', status: 'Status', action: 'Action'
  },
  empty: 'No class records found',
  action: { review: 'Review', detail: 'Detail' },
  messages: {
    loadError: 'Failed to load class records',
    detailError: 'Failed to load record detail',
    approveSuccess: 'Class record approved',
    approveFail: 'Failed to approve class record',
    rejectSuccess: 'Class record rejected',
    rejectFail: 'Failed to reject class record',
    exportSuccess: 'Export successful',
    exportFail: 'Export failed'
  },
  status: { approved: 'Approved', rejected: 'Rejected', pending: 'Pending' },
  courseTypes: { mock: 'Mock Application', position: 'Position Coaching' },
  sources: { mentor: 'Mentor', headteacher: 'Head Teacher', assistant: 'Assistant' },
  fields: {
    student: 'Student', reporter: 'Reporter', coachingContent: 'Coaching Content',
    courseContent: 'Course Content', classDate: 'Class Date', duration: 'Duration',
    durationValue: '{hours}h', fee: 'Course Fee', submitTime: 'Submitted At',
    feedback: 'Feedback', attachments: 'Attachments', unnamedFile: 'Unnamed file',
    noAttachments: 'No attachments', reviewResult: 'Review Result', noReviewRemark: 'No review note',
    studentRating: 'Student Rating'
  },
  detailModal: {
    title: 'Class Record Detail',
    loading: 'Loading class record detail...',
    close: 'Close'
  },
  reviewModal: {
    title: 'Class Record Review',
    loading: 'Loading class record...',
    rejectReasonLabel: 'Rejection Reason *',
    rejectReasonPlaceholder: 'Select rejection reason',
    missingRejectReason: 'Please select a rejection reason',
    rejectRemarkLabel: 'Rejection Notes',
    rejectRemarkPlaceholder: 'Add notes for this rejection',
    reviewRemarkLabel: 'Review Note',
    reviewRemarkPlaceholder: 'Enter review note (optional)',
    approveBtn: 'Approve',
    rejectBtn: 'Reject',
    cancelBtn: 'Cancel',
    submitApprove: 'Confirm Approve',
    submitReject: 'Confirm Reject',
    submitting: 'Submitting...',
    rejectReasons: {
      r1: 'Incorrect hours', r2: 'Content description unclear', r3: 'Wrong course type',
      r4: 'Missing required attachment', r5: 'Duplicate submission', r6: 'Other reason'
    }
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
