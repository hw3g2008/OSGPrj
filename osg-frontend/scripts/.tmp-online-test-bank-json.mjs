import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.resources) zh.resources = {}
if (!en.resources) en.resources = {}

zh.resources.onlineTestBank = {
  pageTitle: '在线测试题库',
  createBank: '新增题库',
  pendingAlert: '有 {count} 个学员题库申请待分配',
  pendingAlertDesc: '请优先处理班主任流转过来的在线测试申请。',
  viewApplications: '查看申请',
  tabs: { banks: '题库列表', applications: '学员申请' },
  filter: {
    bankSearchPlaceholder: '搜索题库 / 公司',
    appSearchPlaceholder: '搜索学员 / 岗位',
    companyPlaceholder: '全部公司',
    typePlaceholder: '全部类型',
    search: '搜索',
    reset: '重置'
  },
  bankColumns: {
    name: '题库名称', company: '公司', type: '类型',
    questionCount: '题目数', status: '状态', updatedAt: '更新时间', action: '操作'
  },
  appColumns: {
    appCode: '申请ID', student: '学员', position: '申请岗位', testType: '测试类型',
    time: '申请时间', source: '来源', action: '操作'
  },
  status: { enabled: '启用', disabled: '禁用' },
  sourceFallback: '班主任流转',
  empty: '暂无题库记录',
  appEmpty: '暂无学员申请',
  action: { edit: '编辑', assign: '分配题库' },
  messages: {
    bankLoadError: '题库列表加载失败',
    appLoadError: '学员申请加载失败',
    updateSuccess: '题库更新成功',
    createSuccess: '题库创建成功'
  },
  modal: {
    titleEdit: '编辑题库',
    titleCreate: '新增题库',
    nameLabel: '题库名称',
    namePlaceholder: '题库名称',
    companyLabel: '公司',
    companyPlaceholder: '公司',
    typeLabel: '类型',
    countLabel: '题目数',
    countPlaceholder: '题目数',
    statusLabel: '状态',
    statusEnabled: '启用',
    statusDisabled: '禁用',
    cancel: '取消',
    save: '保存修改',
    create: '创建题库'
  }
}

en.resources.onlineTestBank = {
  pageTitle: 'Online Test Bank',
  createBank: 'New Bank',
  pendingAlert: '{count} student application(s) pending assignment',
  pendingAlertDesc: 'Please handle online test applications transferred from head teachers first.',
  viewApplications: 'View Applications',
  tabs: { banks: 'Banks', applications: 'Student Applications' },
  filter: {
    bankSearchPlaceholder: 'Search bank / company',
    appSearchPlaceholder: 'Search student / position',
    companyPlaceholder: 'All Companies',
    typePlaceholder: 'All Types',
    search: 'Search',
    reset: 'Reset'
  },
  bankColumns: {
    name: 'Bank Name', company: 'Company', type: 'Type',
    questionCount: 'Questions', status: 'Status', updatedAt: 'Updated At', action: 'Action'
  },
  appColumns: {
    appCode: 'App ID', student: 'Student', position: 'Applied Position', testType: 'Test Type',
    time: 'Applied At', source: 'Source', action: 'Action'
  },
  status: { enabled: 'Enabled', disabled: 'Disabled' },
  sourceFallback: 'Head Teacher Transfer',
  empty: 'No test banks found',
  appEmpty: 'No student applications found',
  action: { edit: 'Edit', assign: 'Assign Bank' },
  messages: {
    bankLoadError: 'Failed to load test banks',
    appLoadError: 'Failed to load student applications',
    updateSuccess: 'Test bank updated',
    createSuccess: 'Test bank created'
  },
  modal: {
    titleEdit: 'Edit Bank',
    titleCreate: 'New Bank',
    nameLabel: 'Bank Name',
    namePlaceholder: 'Bank name',
    companyLabel: 'Company',
    companyPlaceholder: 'Company name',
    typeLabel: 'Type',
    countLabel: 'Question Count',
    countPlaceholder: 'Count',
    statusLabel: 'Status',
    statusEnabled: 'Enabled',
    statusDisabled: 'Disabled',
    cancel: 'Cancel',
    save: 'Save Changes',
    create: 'Create Bank'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
