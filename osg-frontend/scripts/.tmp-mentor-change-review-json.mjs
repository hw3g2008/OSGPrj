import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.users) zh.users = {}
if (!en.users) en.users = {}

zh.users.mentorChangeReview = {
  pageTitle: '导师资料变更审核',
  filter: {
    statusLabel: '状态', statusPlaceholder: '全部状态',
    statuses: { pending: '待审核', approved: '已通过', rejected: '已驳回' },
    search: '搜索', reset: '重置'
  },
  table: {
    empty: '暂无导师资料变更申请',
    showTotal: '共 {total} 条',
    summarySeparator: '、'
  },
  columns: {
    requestId: '请求 ID', userId: '导师 userId', changeSummary: '变更字段',
    status: '状态', requestedBy: '提交人', createTime: '提交时间',
    reviewer: '审核人', reviewedAt: '审核时间', action: '操作'
  },
  fieldLabels: {
    nickName: '昵称', sex: '性别', phonenumber: '手机号',
    email: '邮箱', remark: '备注', region: '地区', city: '城市'
  },
  action: { view: '查看', approve: '通过', reject: '驳回' },
  detail: {
    title: '变更详情',
    labels: {
      requestId: '请求 ID', userId: '导师 userId', changeSummary: '变更字段',
      status: '状态', requestedBy: '提交人', createTime: '提交时间',
      reviewer: '审核人', reviewedAt: '审核时间'
    },
    payloadTitle: '变更内容（payload）',
    rejectReasonLabel: '驳回原因：'
  },
  rejectModal: {
    title: '驳回变更', okText: '确认驳回', cancelText: '取消',
    reasonLabel: '驳回原因', reasonPlaceholder: '请输入驳回原因'
  },
  approveModal: {
    title: '通过变更申请',
    content: '确认通过请求 #{id}？通过后变更内容会写入导师账号。',
    okText: '通过', cancelText: '取消'
  },
  status: { pending: '待审核', approved: '已通过', rejected: '已驳回' },
  messages: {
    loadError: '加载变更申请失败',
    approveSuccess: '已通过', approveFail: '通过失败',
    rejectReasonRequired: '请填写驳回原因',
    rejectSuccess: '已驳回', rejectFail: '驳回失败'
  }
}

en.users.mentorChangeReview = {
  pageTitle: 'Mentor Profile Change Review',
  filter: {
    statusLabel: 'Status', statusPlaceholder: 'All Statuses',
    statuses: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
    search: 'Search', reset: 'Reset'
  },
  table: {
    empty: 'No change requests found',
    showTotal: '{total} records',
    summarySeparator: ', '
  },
  columns: {
    requestId: 'Request ID', userId: 'Mentor User ID', changeSummary: 'Changed Fields',
    status: 'Status', requestedBy: 'Submitted By', createTime: 'Submitted At',
    reviewer: 'Reviewer', reviewedAt: 'Reviewed At', action: 'Action'
  },
  fieldLabels: {
    nickName: 'Nickname', sex: 'Gender', phonenumber: 'Phone',
    email: 'Email', remark: 'Remark', region: 'Region', city: 'City'
  },
  action: { view: 'View', approve: 'Approve', reject: 'Reject' },
  detail: {
    title: 'Change Detail',
    labels: {
      requestId: 'Request ID', userId: 'Mentor User ID', changeSummary: 'Changed Fields',
      status: 'Status', requestedBy: 'Submitted By', createTime: 'Submitted At',
      reviewer: 'Reviewer', reviewedAt: 'Reviewed At'
    },
    payloadTitle: 'Change Payload',
    rejectReasonLabel: 'Rejection reason: '
  },
  rejectModal: {
    title: 'Reject Change', okText: 'Confirm Reject', cancelText: 'Cancel',
    reasonLabel: 'Rejection Reason', reasonPlaceholder: 'Enter rejection reason'
  },
  approveModal: {
    title: 'Approve Change Request',
    content: 'Confirm approve request #{id}? Changes will be applied to mentor account.',
    okText: 'Approve', cancelText: 'Cancel'
  },
  status: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  messages: {
    loadError: 'Failed to load change requests',
    approveSuccess: 'Approved', approveFail: 'Approval failed',
    rejectReasonRequired: 'Please enter rejection reason',
    rejectSuccess: 'Rejected', rejectFail: 'Rejection failed'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
