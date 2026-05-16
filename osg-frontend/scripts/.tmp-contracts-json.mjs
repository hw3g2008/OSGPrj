import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.users) zh.users = {}
if (!en.users) en.users = {}

zh.users.contracts = {
  pageTitle: '合同管理', add: '新增合同',
  filter: {
    dateLabel: '日期', dateStart: '开始日期', dateEnd: '结束日期',
    studentKeyword: '姓名或学员ID',
    contractTypePlaceholder: '合同类型',
    contractTypes: { initial: '首签', renew: '续签' },
    contractStatusPlaceholder: '合同状态',
    contractStatuses: { active: '有效', expiring: '即将到期', expired: '已结束', cancelled: '已作废' },
    leadMentorPlaceholder: '班主任', search: '搜索', reset: '重置', export: '导出'
  },
  table: {
    empty: '暂无合同数据',
    footer: { total: '总金额', hours: '总课时', used: '已用', remaining: '剩余' },
    showTotal: '共 {total} 条记录'
  },
  columns: {
    contractNo: '合同编号', studentId: '学员ID', studentName: '学员姓名',
    leadMentorName: '班主任', contractType: '合同类型', amountUsd: '美元金额',
    amountGbp: '英镑金额', totalHours: '总课时', usedHours: '已用课时',
    remainingHours: '剩余课时', startDate: '开始日期', endDate: '结束日期',
    renewalReason: '续签原因', contractStatus: '合同状态', action: '操作'
  },
  stats: { total: '总合同数', active: '有效合同', expiring: '即将到期', ended: '已结束', amount: '合同总金额' },
  types: { initial: '首签', renew: '续签', supplement: '补充' },
  statuses: { active: '有效', expiring: '即将到期', expired: '已结束', cancelled: '已作废' },
  action: { detail: '详情', renew: '续签合同' },
  messages: {
    exportSuccess: '合同列表导出成功',
    exportFail: '合同列表导出失败',
    exportAuthFail: '导出请求未通过认证，请重新登录'
  },
  detail: {
    title: '{name}的合同记录', defaultStudent: '学员', contractCount: '{count}份合同',
    loading: '正在加载合同记录...', loadError: '合同详情加载失败',
    summaryTotal: '合同总金额', summaryRemaining: '剩余课时', summaryUsed: '已用课时', summaryHours: '总课时',
    tableContractId: '合同ID', tableType: '类型', tableAmount: '金额', tableHours: '课时',
    tableValidity: '有效期', tableRenewal: '续签原因', tableAttachment: '附件',
    tableUpdated: '更新时间', tableAction: '操作',
    equivalent: '等值', viewAttachment: '查看附件', renewBtn: '续签合同',
    empty: '暂无合同记录。', close: '关闭', footerRenew: '续签合同', dateSeparator: '至'
  },
  renew: {
    titleReactivate: '重新加入 · 续签合同', titleNew: '续费/新增合同',
    studentLabel: '学员 Student', studentRemaining: '剩余 {hours}h',
    studentSearchPlaceholder: '请输入学员姓名搜索', studentSearching: '搜索中…', studentNotFound: '无匹配学员',
    sectionAmountTitle: '合同金额', sectionAmountDesc: '选择币种并填写金额信息',
    currencyLabel: '币种', amountGbpLabel: '英镑金额',
    amountUsdLabel: '金额 Amount', amountUsdEquivLabel: '美元等值金额',
    currencyUsd: '美元 (USD)', currencyGbp: '英镑 (GBP)',
    amountGbpPlaceholder: '£ 请输入英镑金额',
    amountUsdEquivPlaceholder: '$ 请输入美元等值金额', amountUsdPlaceholder: '$ 请输入美元金额',
    hoursLabel: '新增课时 / New Hours', hoursPlaceholder: '如 50（本次新增课时数）',
    sectionDateTitle: '合同期限与原因', sectionDateDesc: '设置合同有效期和续签原因',
    startDateLabel: '开始日期', endDateLabel: '结束日期',
    renewalReasonLabel: '续签原因', renewalReasonPlaceholder: '请选择续签原因',
    otherReasonLabel: '其他原因说明', otherReasonPlaceholder: '请输入补充说明',
    attachmentLabel: '合同附件', attachmentDrag: '点击或拖拽上传合同附件（PDF / JPG / PNG）',
    attachmentHint: '合同附件为必填项', remarkLabel: '备注', remarkPlaceholder: '选填，可填写特殊约定等',
    cancel: '取消', saveBtnRenew: '保存续签合同', saveBtnCreate: '创建合同',
    validationStudent: '请选择学员', validationAmountUsd: '请输入美元金额',
    validationAmountUsdEquiv: '请输入美元等值金额', validationAmountGbp: '请输入英镑金额',
    validationDates: '请选择合同起止日期', validationReason: '请选择续签原因',
    validationOtherReason: '请填写其他原因说明', validationAttachment: '请上传合同附件',
    uploadSuccess: '合同附件上传成功', uploadFail: '附件上传失败',
    uploadTypeFail: '仅支持 PDF / JPG / PNG 类型附件',
    uploadSizeFail: '单文件不超过 150MB', uploadCountFail: '合同附件只允许上传 1 个',
    successReactivate: '学员已通过续签合同重新加入', successRenew: '续签合同成功'
  }
}

en.users.contracts = {
  pageTitle: 'Contract Management', add: 'New Contract',
  filter: {
    dateLabel: 'Date', dateStart: 'Start Date', dateEnd: 'End Date',
    studentKeyword: 'Name or Student ID',
    contractTypePlaceholder: 'Contract Type',
    contractTypes: { initial: 'Initial', renew: 'Renewal' },
    contractStatusPlaceholder: 'Status',
    contractStatuses: { active: 'Active', expiring: 'Expiring', expired: 'Ended', cancelled: 'Cancelled' },
    leadMentorPlaceholder: 'Lead Mentor', search: 'Search', reset: 'Reset', export: 'Export'
  },
  table: {
    empty: 'No contracts found',
    footer: { total: 'Total', hours: 'Hours', used: 'Used', remaining: 'Remaining' },
    showTotal: '{total} records'
  },
  columns: {
    contractNo: 'Contract No.', studentId: 'Student ID', studentName: 'Student Name',
    leadMentorName: 'Lead Mentor', contractType: 'Type', amountUsd: 'USD Amount',
    amountGbp: 'GBP Amount', totalHours: 'Total Hours', usedHours: 'Used Hours',
    remainingHours: 'Remaining', startDate: 'Start Date', endDate: 'End Date',
    renewalReason: 'Renewal Reason', contractStatus: 'Status', action: 'Action'
  },
  stats: { total: 'Total Contracts', active: 'Active', expiring: 'Expiring', ended: 'Ended', amount: 'Total Amount' },
  types: { initial: 'Initial', renew: 'Renewal', supplement: 'Supplement' },
  statuses: { active: 'Active', expiring: 'Expiring', expired: 'Ended', cancelled: 'Cancelled' },
  action: { detail: 'Detail', renew: 'Renew' },
  messages: {
    exportSuccess: 'Export successful',
    exportFail: 'Export failed',
    exportAuthFail: 'Auth failed, please log in again'
  },
  detail: {
    title: "{name}'s Contracts", defaultStudent: 'Student', contractCount: '{count} contract(s)',
    loading: 'Loading contracts...', loadError: 'Failed to load contract detail',
    summaryTotal: 'Total Amount', summaryRemaining: 'Remaining Hours', summaryUsed: 'Used Hours', summaryHours: 'Total Hours',
    tableContractId: 'Contract ID', tableType: 'Type', tableAmount: 'Amount', tableHours: 'Hours',
    tableValidity: 'Validity', tableRenewal: 'Renewal Reason', tableAttachment: 'Attachment',
    tableUpdated: 'Updated At', tableAction: 'Action',
    equivalent: 'equiv.', viewAttachment: 'View', renewBtn: 'Renew',
    empty: 'No contracts found.', close: 'Close', footerRenew: 'Renew Contract', dateSeparator: 'to'
  },
  renew: {
    titleReactivate: 'Re-join · Renew Contract', titleNew: 'New / Renew Contract',
    studentLabel: 'Student', studentRemaining: 'Remaining {hours}h',
    studentSearchPlaceholder: 'Search student by name', studentSearching: 'Searching…', studentNotFound: 'No students found',
    sectionAmountTitle: 'Contract Amount', sectionAmountDesc: 'Select currency and enter amount',
    currencyLabel: 'Currency', amountGbpLabel: 'GBP Amount',
    amountUsdLabel: 'Amount (USD)', amountUsdEquivLabel: 'USD Equivalent',
    currencyUsd: 'USD', currencyGbp: 'GBP',
    amountGbpPlaceholder: '£ Enter GBP amount',
    amountUsdEquivPlaceholder: '$ Enter USD equivalent', amountUsdPlaceholder: '$ Enter USD amount',
    hoursLabel: 'New Hours', hoursPlaceholder: 'e.g. 50',
    sectionDateTitle: 'Contract Period & Reason', sectionDateDesc: 'Set validity period and renewal reason',
    startDateLabel: 'Start Date', endDateLabel: 'End Date',
    renewalReasonLabel: 'Renewal Reason', renewalReasonPlaceholder: 'Select renewal reason',
    otherReasonLabel: 'Other Reason', otherReasonPlaceholder: 'Describe the reason',
    attachmentLabel: 'Attachment', attachmentDrag: 'Click or drag contract file here (PDF / JPG / PNG)',
    attachmentHint: 'Attachment is required', remarkLabel: 'Note', remarkPlaceholder: 'Optional notes',
    cancel: 'Cancel', saveBtnRenew: 'Save Renewal', saveBtnCreate: 'Create Contract',
    validationStudent: 'Please select a student', validationAmountUsd: 'Please enter USD amount',
    validationAmountUsdEquiv: 'Please enter USD equivalent', validationAmountGbp: 'Please enter GBP amount',
    validationDates: 'Please select contract dates', validationReason: 'Please select renewal reason',
    validationOtherReason: 'Please describe the other reason', validationAttachment: 'Please upload attachment',
    uploadSuccess: 'Attachment uploaded', uploadFail: 'Upload failed',
    uploadTypeFail: 'Only PDF / JPG / PNG allowed',
    uploadSizeFail: 'File must be under 150MB', uploadCountFail: 'Only 1 attachment allowed',
    successReactivate: 'Student re-joined via contract renewal', successRenew: 'Contract renewed successfully'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
