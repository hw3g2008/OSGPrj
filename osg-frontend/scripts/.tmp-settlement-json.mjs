import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.finance) zh.finance = {}
if (!en.finance) en.finance = {}

zh.finance.settlement = {
  pageTitle: '财务结算',
  export: '导出',
  flowStepsTitle: '支付流程说明',
  searchPlaceholder: '搜索导师 / 学员',
  source: { all: '全部来源', mentor: '导师端', clerk: '班主任端', assistant: '助教端' },
  dateStart: '开始日期',
  dateEnd: '结束日期',
  query: '查询',
  selectedInfo: '已选择 {count} 条，合计 {total}',
  batchMark: '批量标记已支付',
  empty: '暂无结算记录',
  stats: { unpaid: '未支付', monthPaid: '本月已支付', weekCount: '本周课程数' },
  tabs: { unpaid: '未支付', paid: '已支付' },
  columns: {
    recordCode: '课程ID',
    mentor: '导师',
    student: '学员',
    courseType: '课程类型',
    duration: '时长',
    courseFee: '课时费',
    date: '日期',
    source: '来源',
    status: '状态',
    paymentDate: '支付日期',
    action: '操作'
  },
  action: { markPaid: '标记支付', view: '查看' },
  modal: { batchLabel: '批量结算 {count} 条记录', singleLabel: '单条结算' },
  messages: {
    loadError: '课时结算加载失败',
    warnSelect: '请先选择至少一条未支付记录',
    warnDate: '请填写支付日期'
  },
  markPaidModal: {
    title: '确认已支付',
    amountLabel: '结算金额',
    paymentDate: '支付日期',
    bankRef: '银行流水号',
    bankRefPlaceholder: '选填',
    remark: '备注',
    remarkPlaceholder: '选填',
    cancel: '取消',
    confirm: '确认已支付'
  }
}

en.finance.settlement = {
  pageTitle: 'Settlement',
  export: 'Export',
  flowStepsTitle: 'Payment Flow',
  searchPlaceholder: 'Search mentor / student',
  source: { all: 'All Sources', mentor: 'Mentor App', clerk: 'Head Teacher App', assistant: 'Assistant App' },
  dateStart: 'Start Date',
  dateEnd: 'End Date',
  query: 'Query',
  selectedInfo: '{count} selected, total {total}',
  batchMark: 'Batch Mark Paid',
  empty: 'No settlement records found',
  stats: { unpaid: 'Unpaid', monthPaid: 'Paid This Month', weekCount: 'Classes This Week' },
  tabs: { unpaid: 'Unpaid', paid: 'Paid' },
  columns: {
    recordCode: 'Course ID',
    mentor: 'Mentor',
    student: 'Student',
    courseType: 'Course Type',
    duration: 'Duration',
    courseFee: 'Fee',
    date: 'Date',
    source: 'Source',
    status: 'Status',
    paymentDate: 'Payment Date',
    action: 'Action'
  },
  action: { markPaid: 'Mark Paid', view: 'View' },
  modal: { batchLabel: 'Batch settle {count} record(s)', singleLabel: 'Single settle' },
  messages: {
    loadError: 'Failed to load settlement records',
    warnSelect: 'Please select at least one unpaid record',
    warnDate: 'Please fill in the payment date'
  },
  markPaidModal: {
    title: 'Confirm Payment',
    amountLabel: 'Settlement Amount',
    paymentDate: 'Payment Date',
    bankRef: 'Bank Reference No.',
    bankRefPlaceholder: 'Optional',
    remark: 'Remark',
    remarkPlaceholder: 'Optional',
    cancel: 'Cancel',
    confirm: 'Confirm Payment'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
