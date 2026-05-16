import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.finance) zh.finance = {}
if (!en.finance) en.finance = {}

zh.finance.expense = {
  pageTitle: '报销管理',
  createExpense: '新建报销',
  searchPlaceholder: '搜索导师 / 说明',
  refresh: '刷新',
  empty: '暂无报销记录',
  attachment: '附件',
  columns: {
    mentor: '导师',
    type: '报销类型',
    amount: '金额',
    date: '日期',
    description: '说明',
    attachment: '附件',
    status: '状态',
    reviewComment: '审核备注',
    action: '操作'
  },
  action: { approve: '通过', deny: '拒绝', processed: '已处理' },
  messages: {
    loadError: '报销列表加载失败',
    createSuccess: '报销创建成功',
    approveSuccess: '报销已通过',
    denySuccess: '报销已拒绝'
  },
  modal: {
    title: '新建报销',
    mentorId: '导师 ID',
    mentorIdPlaceholder: '导师',
    mentorName: '导师',
    mentorNamePlaceholder: '导师姓名',
    type: '报销类型',
    amount: '金额',
    amountPlaceholder: '金额',
    date: '日期',
    datePlaceholder: '日期',
    attachment: '附件',
    attachmentPlaceholder: '附件',
    description: '说明',
    descriptionPlaceholder: '说明',
    cancel: '取消',
    create: '创建报销'
  }
}

en.finance.expense = {
  pageTitle: 'Expense Management',
  createExpense: 'New Expense',
  searchPlaceholder: 'Search mentor / description',
  refresh: 'Refresh',
  empty: 'No expense records found',
  attachment: 'Attachment',
  columns: {
    mentor: 'Mentor',
    type: 'Type',
    amount: 'Amount',
    date: 'Date',
    description: 'Description',
    attachment: 'Attachment',
    status: 'Status',
    reviewComment: 'Review Note',
    action: 'Action'
  },
  action: { approve: 'Approve', deny: 'Deny', processed: 'Processed' },
  messages: {
    loadError: 'Failed to load expense list',
    createSuccess: 'Expense created successfully',
    approveSuccess: 'Expense approved',
    denySuccess: 'Expense denied'
  },
  modal: {
    title: 'New Expense',
    mentorId: 'Mentor ID',
    mentorIdPlaceholder: 'Mentor ID',
    mentorName: 'Mentor Name',
    mentorNamePlaceholder: 'Mentor name',
    type: 'Expense Type',
    amount: 'Amount',
    amountPlaceholder: 'Amount',
    date: 'Date',
    datePlaceholder: 'Date',
    attachment: 'Attachment',
    attachmentPlaceholder: 'Attachment URL',
    description: 'Description',
    descriptionPlaceholder: 'Description',
    cancel: 'Cancel',
    create: 'Create Expense'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
