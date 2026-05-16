import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.resources) zh.resources = {}
if (!en.resources) en.resources = {}

zh.resources.qbank = {
  pageTitle: '题库管理',
  createFolder: '新建文件夹',
  searchPlaceholder: '搜索文件名',
  search: '搜索',
  empty: '暂无题库文件夹',
  allUsers: '全部用户',
  notSet: '未设置',
  columns: {
    name: '名称',
    size: '大小',
    authorizedTo: '授权对象',
    expiryAt: '过期时间',
    createTime: '创建时间',
    action: '操作'
  },
  action: { editAuth: '编辑 + 授权' },
  messages: {
    loadError: '题库列表加载失败',
    createSuccess: '题库文件夹创建成功',
    updateSuccess: '题库文件夹已更新'
  },
  modal: {
    titleCreate: '新建题库文件夹',
    titleEdit: '编辑题库文件夹',
    authType: '授权类型',
    authTypeAll: '全部用户',
    authTypeClass: '指定班级',
    authTypeUser: '指定用户',
    classLabel: '指定班级',
    classPlaceholder: '例如：2024Fall, 2025Spring',
    userLabel: '指定用户',
    userPlaceholder: '例如：Alice Zhang, Bob Li',
    expiryAt: '过期时间',
    cancel: '取消',
    save: '保存'
  }
}

en.resources.qbank = {
  pageTitle: 'Question Bank',
  createFolder: 'New Folder',
  searchPlaceholder: 'Search folder name',
  search: 'Search',
  empty: 'No question bank folders found',
  allUsers: 'All Users',
  notSet: 'Not Set',
  columns: {
    name: 'Name',
    size: 'Size',
    authorizedTo: 'Authorized To',
    expiryAt: 'Expiry',
    createTime: 'Created At',
    action: 'Action'
  },
  action: { editAuth: 'Edit & Authorize' },
  messages: {
    loadError: 'Failed to load question bank list',
    createSuccess: 'Folder created successfully',
    updateSuccess: 'Folder updated successfully'
  },
  modal: {
    titleCreate: 'New Folder',
    titleEdit: 'Edit Folder',
    authType: 'Authorization Type',
    authTypeAll: 'All Users',
    authTypeClass: 'Specific Classes',
    authTypeUser: 'Specific Users',
    classLabel: 'Classes',
    classPlaceholder: 'e.g. 2024Fall, 2025Spring',
    userLabel: 'Users',
    userPlaceholder: 'e.g. Alice Zhang, Bob Li',
    expiryAt: 'Expiry Time',
    cancel: 'Cancel',
    save: 'Save'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
