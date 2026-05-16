import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.resources) zh.resources = {}
if (!en.resources) en.resources = {}

zh.resources.files = {
  pageTitle: '文件管理',
  createFolder: '新建文件夹',
  searchPlaceholder: '搜索文件名',
  search: '搜索',
  empty: '暂无文件记录',
  action: { authorize: '授权' },
  columns: {
    fileName: '文件名',
    className: '分类',
    fileSize: '大小',
    authorizedTo: '授权对象',
    createTime: '创建时间',
    action: '操作'
  },
  messages: {
    loadError: '文件列表加载失败',
    folderCreated: '文件夹创建成功',
    authUpdated: '文件授权已更新'
  },
  authModal: {
    title: '文件授权',
    desc: '{name} 的可访问范围设置。',
    descCurrentFile: '当前文件',
    authType: '授权类型',
    authTypeAll: '全部用户',
    authTypeClass: '指定班级',
    authTypeUser: '指定用户',
    classRange: '班级范围',
    addUser: '添加用户',
    addUserPlaceholder: '添加用户',
    add: '添加',
    cancel: '取消',
    save: '保存授权'
  },
  newFolderModal: {
    title: '新建文件夹',
    cancel: '取消',
    create: '创建文件夹'
  }
}

en.resources.files = {
  pageTitle: 'File Management',
  createFolder: 'New Folder',
  searchPlaceholder: 'Search file name',
  search: 'Search',
  empty: 'No files found',
  action: { authorize: 'Authorize' },
  columns: {
    fileName: 'File Name',
    className: 'Category',
    fileSize: 'Size',
    authorizedTo: 'Authorized To',
    createTime: 'Created At',
    action: 'Action'
  },
  messages: {
    loadError: 'Failed to load file list',
    folderCreated: 'Folder created successfully',
    authUpdated: 'File authorization updated'
  },
  authModal: {
    title: 'File Authorization',
    desc: 'Access scope settings for {name}.',
    descCurrentFile: 'current file',
    authType: 'Authorization Type',
    authTypeAll: 'All Users',
    authTypeClass: 'Specific Classes',
    authTypeUser: 'Specific Users',
    classRange: 'Classes',
    addUser: 'Add User',
    addUserPlaceholder: 'Add user',
    add: 'Add',
    cancel: 'Cancel',
    save: 'Save Authorization'
  },
  newFolderModal: {
    title: 'New Folder',
    cancel: 'Cancel',
    create: 'Create Folder'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
