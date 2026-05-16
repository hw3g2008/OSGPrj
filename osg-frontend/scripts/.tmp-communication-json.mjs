import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.teaching) zh.teaching = {}
if (!en.teaching) en.teaching = {}

zh.teaching.communication = {
  pageTitle: '人际关系沟通记录',
  export: '导出',
  search: '搜索',
  searchPlaceholder: '搜索学员/记录人...',
  methodPlaceholder: '沟通方式',
  headTeacherPlaceholder: '全部班主任',
  dateStart: '开始日期',
  dateEnd: '结束日期',
  empty: '暂无沟通记录',
  method: { phone: '电话', wechat: '微信', email: '邮件', meeting: '面谈' },
  columns: {
    student: '学员',
    recorder: '记录人',
    method: '沟通方式',
    time: '沟通时间',
    content: '沟通内容',
    followUp: '跟进事项',
    action: '操作'
  },
  action: { detail: '详情' },
  messages: {
    loadError: '沟通记录加载失败',
    exportTodo: '导出功能将在后续版本中接入',
    detailTodo: '详情功能将在后续版本中接入'
  }
}

en.teaching.communication = {
  pageTitle: 'Communication Records',
  export: 'Export',
  search: 'Search',
  searchPlaceholder: 'Search student / recorder...',
  methodPlaceholder: 'Method',
  headTeacherPlaceholder: 'All Head Teachers',
  dateStart: 'Start Date',
  dateEnd: 'End Date',
  empty: 'No communication records found',
  method: { phone: 'Phone', wechat: 'WeChat', email: 'Email', meeting: 'In-person' },
  columns: {
    student: 'Student',
    recorder: 'Recorder',
    method: 'Method',
    time: 'Time',
    content: 'Content',
    followUp: 'Follow-up',
    action: 'Action'
  },
  action: { detail: 'Detail' },
  messages: {
    loadError: 'Failed to load communication records',
    exportTodo: 'Export will be available in a future version',
    detailTodo: 'Detail view will be available in a future version'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
