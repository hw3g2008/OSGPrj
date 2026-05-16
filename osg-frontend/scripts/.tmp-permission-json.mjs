import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.permission) zh.permission = {}
if (!en.permission) en.permission = {}

// ─── dicts ───
zh.permission.dicts = {
  pageTitle: '字典管理',
  search: '搜索',
  empty: '暂无数据',
  totalRecords: '共 {total} 条记录',
  searchPlaceholder: '搜索{label}...',
  addButton: '新增{label}',
  nameHeaderFallback: '{label}名称',
  status: { enabled: '启用', disabled: '禁用' },
  action: { edit: '编辑', disable: '禁用', enable: '启用' },
  columns: {
    companyType: '公司类别', website: '官网地址', dictValue: '键值',
    callingCode: '国际区号', country: '国家/地区', status: '状态',
    sort: '排序', updateTime: '更新时间', action: '操作', defaultName: '名称'
  },
  tabCreateLabel: {
    osg_job_category: '岗位分类', osg_company_name: '公司/银行名称',
    osg_company_type: '公司/银行类别', osg_position_department: '部门',
    osg_region: '大区', osg_city: '地区/城市', osg_recruit_cycle: '招聘周期',
    osg_school: '学校', osg_major_direction: '方向', osg_sub_direction: '子方向',
    osg_visa_status: '签证状态', osg_course_type: '课程类型', osg_expense_type: '报销类型',
    osg_specialty: '擅长', osg_rating: '评级', osg_country_code: '国家/地区'
  },
  tabNameHeader: {
    osg_job_category: '分类名称', osg_company_name: '公司名称',
    osg_company_type: '类别名称', osg_position_department: '部门名称',
    osg_region: '大区名称', osg_city: '城市名称', osg_recruit_cycle: '周期名称',
    osg_school: '学校名称', osg_major_direction: '方向名称', osg_sub_direction: '子方向名称',
    osg_visa_status: '签证状态', osg_course_type: '课程类型', osg_expense_type: '报销类型',
    osg_specialty: '擅长名称', osg_rating: '评级名称', osg_country_code: '国家/地区'
  },
  messages: {
    loadCategoryError: '加载字典分类失败', loadDataError: '加载数据失败',
    disableConfirmTitle: '确认禁用', disableConfirmContent: '确定要禁用「{label}」吗？',
    confirmOk: '确定', confirmCancel: '取消',
    disableError: '禁用基础数据失败，请重试', disabledSuccess: '已禁用',
    enableError: '启用基础数据失败，请重试', enabledSuccess: '已启用'
  },
  modal: {
    titleEdit: '编辑{label}', titleCreate: '新增{label}',
    nameInputPlaceholder: '请输入{field}',
    dictValueLabel: '字典键值',
    dictValuePlaceholder: '请输入字典键值（仅限英文/数字/下划线，以字母开头）',
    parentSelectPlaceholder: '请选择{field}',
    websiteLabel: '官网地址', websitePlaceholder: '请输入官网地址（选填）',
    countryLabel: '国家/地区', countryPlaceholder: '请选择国家/地区',
    callingCodeLabel: '国际区号', callingCodePlaceholder: '例如 +86，必须以 + 开头加 1-4 位数字',
    sortLabel: '排序', sortPlaceholder: '数字越大越靠前',
    statusLabel: '状态', statusEnabled: '启用', statusDisabled: '禁用',
    cancel: '取消', save: '保存',
    updateError: '字典项修改失败，请检查输入信息', updateSuccess: '修改成功',
    createError: '字典项新增失败，请检查输入信息', createSuccess: '新增成功',
    validNameRequired: '请输入{field}', validDictValueRequired: '请输入字典键值',
    validDictValuePattern: '字典键值只能是英文、数字或下划线，并以字母开头',
    validParentRequired: '请选择{field}',
    validCallingCodeRequired: '请输入国际区号',
    validCallingCodePattern: '区号必须以 + 开头，加 1-4 位数字（例如 +86）',
    nameFallback: '{label}名称', parentFallback: '所属{label}',
    nameLabelMap: {
      osg_job_category: '分类名称', osg_company_name: '公司/银行名称',
      osg_region: '大区名称', osg_city: '地区/城市名称', osg_recruit_cycle: '周期名称',
      osg_school: '学校名称', osg_major_direction: '方向名称', osg_sub_direction: '子方向名称',
      osg_course_type: '课程类型名称', osg_expense_type: '报销类型名称', osg_country_code: '国家/地区'
    },
    parentLabelMap: {
      osg_company_name: '所属公司/银行类别', osg_city: '所属大区', osg_sub_direction: '所属主攻方向'
    }
  }
}

en.permission.dicts = {
  pageTitle: 'Dictionary Management',
  search: 'Search',
  empty: 'No data',
  totalRecords: '{total} records',
  searchPlaceholder: 'Search {label}...',
  addButton: 'New {label}',
  nameHeaderFallback: '{label} Name',
  status: { enabled: 'Enabled', disabled: 'Disabled' },
  action: { edit: 'Edit', disable: 'Disable', enable: 'Enable' },
  columns: {
    companyType: 'Company Type', website: 'Website', dictValue: 'Key',
    callingCode: 'Calling Code', country: 'Country/Region', status: 'Status',
    sort: 'Sort', updateTime: 'Updated At', action: 'Action', defaultName: 'Name'
  },
  tabCreateLabel: {
    osg_job_category: 'Job Category', osg_company_name: 'Company/Bank Name',
    osg_company_type: 'Company/Bank Type', osg_position_department: 'Department',
    osg_region: 'Region', osg_city: 'City', osg_recruit_cycle: 'Recruitment Cycle',
    osg_school: 'School', osg_major_direction: 'Direction', osg_sub_direction: 'Sub-Direction',
    osg_visa_status: 'Visa Status', osg_course_type: 'Course Type', osg_expense_type: 'Expense Type',
    osg_specialty: 'Specialty', osg_rating: 'Rating', osg_country_code: 'Country/Region'
  },
  tabNameHeader: {
    osg_job_category: 'Category Name', osg_company_name: 'Company Name',
    osg_company_type: 'Type Name', osg_position_department: 'Department Name',
    osg_region: 'Region Name', osg_city: 'City Name', osg_recruit_cycle: 'Cycle Name',
    osg_school: 'School Name', osg_major_direction: 'Direction Name', osg_sub_direction: 'Sub-Direction Name',
    osg_visa_status: 'Visa Status', osg_course_type: 'Course Type', osg_expense_type: 'Expense Type',
    osg_specialty: 'Specialty Name', osg_rating: 'Rating Name', osg_country_code: 'Country/Region'
  },
  messages: {
    loadCategoryError: 'Failed to load dictionary categories', loadDataError: 'Failed to load data',
    disableConfirmTitle: 'Confirm Disable', disableConfirmContent: 'Disable "{label}"?',
    confirmOk: 'OK', confirmCancel: 'Cancel',
    disableError: 'Failed to disable, please retry', disabledSuccess: 'Disabled',
    enableError: 'Failed to enable, please retry', enabledSuccess: 'Enabled'
  },
  modal: {
    titleEdit: 'Edit {label}', titleCreate: 'New {label}',
    nameInputPlaceholder: 'Enter {field}',
    dictValueLabel: 'Dict Key',
    dictValuePlaceholder: 'Enter dict key (letters, digits, underscores; start with a letter)',
    parentSelectPlaceholder: 'Select {field}',
    websiteLabel: 'Website', websitePlaceholder: 'Enter website URL (optional)',
    countryLabel: 'Country/Region', countryPlaceholder: 'Select country/region',
    callingCodeLabel: 'Calling Code', callingCodePlaceholder: 'e.g. +86, must start with + followed by 1-4 digits',
    sortLabel: 'Sort', sortPlaceholder: 'Higher number = higher position',
    statusLabel: 'Status', statusEnabled: 'Enabled', statusDisabled: 'Disabled',
    cancel: 'Cancel', save: 'Save',
    updateError: 'Update failed, please check input', updateSuccess: 'Updated',
    createError: 'Create failed, please check input', createSuccess: 'Created',
    validNameRequired: 'Please enter {field}', validDictValueRequired: 'Please enter dict key',
    validDictValuePattern: 'Dict key must contain only letters, digits, underscores, and start with a letter',
    validParentRequired: 'Please select {field}',
    validCallingCodeRequired: 'Please enter calling code',
    validCallingCodePattern: 'Calling code must start with + followed by 1-4 digits (e.g. +86)',
    nameFallback: '{label} Name', parentFallback: 'Belongs to {label}',
    nameLabelMap: {
      osg_job_category: 'Category Name', osg_company_name: 'Company/Bank Name',
      osg_region: 'Region Name', osg_city: 'City/Region Name', osg_recruit_cycle: 'Cycle Name',
      osg_school: 'School Name', osg_major_direction: 'Direction Name', osg_sub_direction: 'Sub-Direction Name',
      osg_course_type: 'Course Type Name', osg_expense_type: 'Expense Type Name', osg_country_code: 'Country/Region'
    },
    parentLabelMap: {
      osg_company_name: 'Company/Bank Category', osg_city: 'Region', osg_sub_direction: 'Main Direction'
    }
  }
}

// ─── menu ───
zh.permission.menu = {
  pageTitle: '菜单管理',
  filter: {
    keywordLabel: '关键词', keywordPlaceholder: '菜单名称 / 权限标识',
    statusLabel: '状态', statusAll: '全部', statusEnabled: '启用', statusDisabled: '停用',
    typeLabel: '类型', typeAll: '全部', typeDir: '目录 M', typeMenu: '菜单 C', typeButton: '按钮 F',
    search: '搜索', reset: '重置'
  },
  cardTitle: '菜单树与按钮权限',
  cardSubtitle: '目录、菜单、按钮三层结构',
  empty: '暂无菜单数据',
  status: { enabled: '启用', disabled: '停用' },
  menuType: { dir: '目录 M', menu: '菜单 C', button: '按钮 F' },
  columns: {
    name: '菜单名称', type: '类型', sort: '排序', perms: '权限标识',
    component: '组件路径', status: '状态', action: '操作'
  },
  action: { edit: '编辑' },
  messages: { loadError: '加载菜单列表失败', saveSuccess: '菜单已保存', saveError: '保存菜单失败' },
  modal: {
    title: '菜单项配置',
    infoAlert: '菜单类型决定字段联动：目录仅维护显示结构；菜单维护路由与组件；按钮仅维护权限标识。',
    typeLabel: '菜单类型', typeDir: '目录 M', typeMenu: '菜单 C', typeButton: '按钮 F',
    parentDirLabel: '所属目录', parentDirPlaceholder: '请选择所属目录',
    parentMenuLabel: '所属菜单', parentMenuPlaceholder: '请选择所属菜单',
    nameLabel: '菜单名称', namePlaceholder: '请输入菜单名称',
    pathLabel: '路由地址', componentLabel: '组件路径', permsLabel: '权限标识',
    sortLabel: '显示排序', statusLabel: '状态',
    statusEnabled: '启用', statusDisabled: '停用',
    cancel: '取消', save: '保存'
  }
}

en.permission.menu = {
  pageTitle: 'Menu Management',
  filter: {
    keywordLabel: 'Keyword', keywordPlaceholder: 'Menu name / Permission',
    statusLabel: 'Status', statusAll: 'All', statusEnabled: 'Enabled', statusDisabled: 'Disabled',
    typeLabel: 'Type', typeAll: 'All', typeDir: 'Dir M', typeMenu: 'Menu C', typeButton: 'Button F',
    search: 'Search', reset: 'Reset'
  },
  cardTitle: 'Menu Tree & Button Permissions',
  cardSubtitle: '3-level structure: Directory → Menu → Button',
  empty: 'No menu data',
  status: { enabled: 'Enabled', disabled: 'Disabled' },
  menuType: { dir: 'Directory M', menu: 'Menu C', button: 'Button F' },
  columns: {
    name: 'Menu Name', type: 'Type', sort: 'Order', perms: 'Permission',
    component: 'Component', status: 'Status', action: 'Action'
  },
  action: { edit: 'Edit' },
  messages: { loadError: 'Failed to load menu list', saveSuccess: 'Menu saved', saveError: 'Failed to save menu' },
  modal: {
    title: 'Menu Configuration',
    infoAlert: 'Type determines field behavior: Directory maintains display structure; Menu maintains routes & components; Button maintains permissions.',
    typeLabel: 'Menu Type', typeDir: 'Directory M', typeMenu: 'Menu C', typeButton: 'Button F',
    parentDirLabel: 'Parent Directory', parentDirPlaceholder: 'Select parent directory',
    parentMenuLabel: 'Parent Menu', parentMenuPlaceholder: 'Select parent menu',
    nameLabel: 'Menu Name', namePlaceholder: 'Enter menu name',
    pathLabel: 'Route Path', componentLabel: 'Component Path', permsLabel: 'Permission Key',
    sortLabel: 'Order', statusLabel: 'Status',
    statusEnabled: 'Enabled', statusDisabled: 'Disabled',
    cancel: 'Cancel', save: 'Save'
  }
}

// ─── roles ───
zh.permission.roles = {
  pageTitle: '权限配置',
  addButton: '新增角色',
  infoTitle: '操作提示',
  infoDesc: '点击「编辑」修改角色名称、描述及可访问的功能模块。员工数为 0 的角色可删除。',
  allPerms: '全部权限',
  noPerms: '未分配权限',
  permsError: '权限加载失败',
  systemRole: '系统角色',
  userCount: '{count}人',
  totalRecords: '共 {total} 条记录',
  columns: {
    id: 'ID', name: '角色名称', desc: '角色描述', perms: '权限模块',
    userCount: '员工数', updateTime: '更新时间', action: '操作'
  },
  action: { edit: '编辑', delete: '删除' },
  messages: {
    loadError: '加载角色列表失败',
    deleteConfirmTitle: '确认删除', deleteConfirmContent: '确定要删除该角色吗？删除后不可恢复。',
    confirmOk: '确定', confirmCancel: '取消',
    deleteSuccess: '角色删除成功', deleteError: '删除失败'
  },
  modal: {
    titleEdit: '编辑角色', titleCreate: '新增角色',
    nameLabel: '角色名称', namePlaceholder: '请输入角色名称，如：运营专员',
    descLabel: '角色描述', descPlaceholder: '请输入角色描述，最多200字',
    permsLabel: '权限模块',
    permsTip: '勾选该角色可访问的功能模块，点击分组名称可全选/取消该分组',
    cancel: '取消', save: '保存',
    validNameRequired: '请输入角色名称', validPermsRequired: '请选择权限模块',
    updateSuccess: '角色修改成功', createSuccess: '角色新增成功',
    defaultRoleName: '该角色',
    errorNameExists: '角色"{name}"已存在，请换一个角色名称后重试',
    errorPermExists: '角色"{name}"的权限标识已存在，请修改角色名称后重试',
    errorWithMsg: '{action}角色"{name}"失败：{msg}',
    errorFallback: '{action}角色失败，请稍后重试',
    actionSave: '保存', actionCreate: '新增'
  }
}

en.permission.roles = {
  pageTitle: 'Roles & Permissions',
  addButton: 'New Role',
  infoTitle: 'Tips',
  infoDesc: 'Click "Edit" to modify role name, description and accessible modules. Roles with 0 users can be deleted.',
  allPerms: 'All Permissions',
  noPerms: 'No Permissions',
  permsError: 'Failed to load permissions',
  systemRole: 'System Role',
  userCount: '{count}',
  totalRecords: '{total} records',
  columns: {
    id: 'ID', name: 'Role Name', desc: 'Description', perms: 'Modules',
    userCount: 'Users', updateTime: 'Updated At', action: 'Action'
  },
  action: { edit: 'Edit', delete: 'Delete' },
  messages: {
    loadError: 'Failed to load roles',
    deleteConfirmTitle: 'Confirm Delete', deleteConfirmContent: 'Delete this role? This cannot be undone.',
    confirmOk: 'OK', confirmCancel: 'Cancel',
    deleteSuccess: 'Role deleted', deleteError: 'Delete failed'
  },
  modal: {
    titleEdit: 'Edit Role', titleCreate: 'New Role',
    nameLabel: 'Role Name', namePlaceholder: 'Enter role name, e.g. Operations Specialist',
    descLabel: 'Description', descPlaceholder: 'Enter description, max 200 chars',
    permsLabel: 'Modules',
    permsTip: 'Check accessible modules. Click a group name to select/deselect all.',
    cancel: 'Cancel', save: 'Save',
    validNameRequired: 'Please enter role name', validPermsRequired: 'Please select at least one module',
    updateSuccess: 'Role updated', createSuccess: 'Role created',
    defaultRoleName: 'this role',
    errorNameExists: 'Role "{name}" already exists, please use a different name',
    errorPermExists: 'Role "{name}" permission key already exists, please modify the role name',
    errorWithMsg: '{action} role "{name}" failed: {msg}',
    errorFallback: '{action} role failed, please retry',
    actionSave: 'Save', actionCreate: 'Create'
  }
}

// ─── users ───
zh.permission.users = {
  pageTitle: '后台用户管理',
  managedAccountTitle: '当前受管账号',
  addButton: '新增用户',
  filterKeywordLabel: '关键词', filterKeywordPlaceholder: '搜索用户名 / 姓名',
  filterRoleLabel: '角色', filterRolePlaceholder: '全部角色',
  filterStatusLabel: '状态', filterStatusPlaceholder: '全部状态',
  filterStatusEnabled: '启用', filterStatusDisabled: '禁用',
  filterSearch: '搜索',
  cardTitle: '账号治理台账',
  pageInfo: '第 {current} / {total} 页',
  totalRecords: '共 {total} 条记录',
  empty: '当前筛选条件下暂无后台用户',
  systemAccount: '系统账号', customAccount: '自定义账号',
  noPhone: '未填写手机号', noRole: '未绑定角色',
  neverLogin: '从未登录', noUpdate: '暂无变更',
  lastLogin: '最后登录：{time}', lastUpdate: '最近更新：{time}',
  status: { enabled: '启用', disabled: '禁用' },
  columns: {
    id: 'ID', identity: '账号身份', contact: '联系方式',
    roles: '角色矩阵', status: '账户状态', activity: '活跃记录', action: '操作'
  },
  action: { edit: '编辑', resetPwd: '重置密码', disable: '禁用', enable: '启用' },
  messages: {
    loadError: '加载用户列表失败',
    disableConfirmTitle: '确认禁用',
    disableConfirmContent: '确定要禁用该用户吗？禁用后该用户将无法登录系统。',
    confirmOk: '确定', confirmCancel: '取消',
    disableError: '用户禁用失败，请重试', disabledSuccess: '用户已禁用',
    enableError: '用户启用失败，请重试', enabledSuccess: '用户已启用'
  },
  modal: {
    titleEdit: '编辑用户', titleCreate: '新增用户',
    noteEdit: '编辑模式下可更新用户资料、角色与联系方式，用户名保持锁定。',
    noteCreate: '新增用户会同步生成默认密码，并将角色与资料直接写入后台台账。',
    usernameLabel: '用户名', usernamePlaceholder: '4-20字符，仅字母数字下划线',
    usernameHelpEdit: '用户名不可修改', usernameHelpCreate: '用户名创建后不可修改',
    nickNameLabel: '姓名', nickNamePlaceholder: '请输入真实姓名',
    emailLabel: '邮箱', emailPlaceholder: '用于接收通知和密码重置',
    phoneLabel: '手机号', phonePlaceholder: '选填',
    roleLabel: '角色', roleMultiHint: '（可多选）',
    defaultPwdLabel: '初始密码', defaultPwdTag: '系统默认', defaultPwdHelp: '用户首次登录后需修改密码',
    remarkLabel: '备注', remarkPlaceholder: '选填，最多200字',
    cancel: '取消', save: '保存',
    validUsernameRequired: '请输入用户名', validUsernameLength: '用户名长度4-20字符',
    validUsernameChars: '仅允许字母、数字和下划线',
    validNickNameRequired: '请输入姓名',
    validEmailRequired: '请输入邮箱', validEmailFormat: '请输入正确的邮箱格式',
    validRoleRequired: '请选择角色',
    updateSuccess: '用户修改成功', createSuccess: '用户新增成功'
  },
  resetPwdModal: {
    title: '重置密码',
    warning: '重置后该用户密码将恢复为系统默认密码 {password}，下次登录时必须修改密码后才能继续使用。',
    noUser: '未选择用户',
    cancel: '取消', confirm: '确认重置',
    resetError: '密码重置失败，请稍后重试',
    resetSuccess: '密码已重置为默认密码 {password}'
  }
}

en.permission.users = {
  pageTitle: 'Admin Users',
  managedAccountTitle: 'Managed Accounts',
  addButton: 'New User',
  filterKeywordLabel: 'Keyword', filterKeywordPlaceholder: 'Search username / name',
  filterRoleLabel: 'Role', filterRolePlaceholder: 'All Roles',
  filterStatusLabel: 'Status', filterStatusPlaceholder: 'All Statuses',
  filterStatusEnabled: 'Enabled', filterStatusDisabled: 'Disabled',
  filterSearch: 'Search',
  cardTitle: 'Account Ledger',
  pageInfo: 'Page {current} / {total}',
  totalRecords: '{total} records',
  empty: 'No users match current filters',
  systemAccount: 'System Account', customAccount: 'Custom Account',
  noPhone: 'No phone', noRole: 'No role assigned',
  neverLogin: 'Never logged in', noUpdate: 'No updates',
  lastLogin: 'Last login: {time}', lastUpdate: 'Last updated: {time}',
  status: { enabled: 'Enabled', disabled: 'Disabled' },
  columns: {
    id: 'ID', identity: 'Identity', contact: 'Contact',
    roles: 'Roles', status: 'Status', activity: 'Activity', action: 'Action'
  },
  action: { edit: 'Edit', resetPwd: 'Reset Password', disable: 'Disable', enable: 'Enable' },
  messages: {
    loadError: 'Failed to load users',
    disableConfirmTitle: 'Confirm Disable',
    disableConfirmContent: 'Disable this user? They will not be able to login.',
    confirmOk: 'OK', confirmCancel: 'Cancel',
    disableError: 'Failed to disable user, please retry', disabledSuccess: 'User disabled',
    enableError: 'Failed to enable user, please retry', enabledSuccess: 'User enabled'
  },
  modal: {
    titleEdit: 'Edit User', titleCreate: 'New User',
    noteEdit: 'In edit mode you can update user info, roles and contact. Username is locked.',
    noteCreate: 'New users get a default password. Roles and profile are written to the admin ledger.',
    usernameLabel: 'Username', usernamePlaceholder: '4-20 chars, letters/digits/underscores',
    usernameHelpEdit: 'Username cannot be changed', usernameHelpCreate: 'Username cannot be changed after creation',
    nickNameLabel: 'Full Name', nickNamePlaceholder: 'Enter real name',
    emailLabel: 'Email', emailPlaceholder: 'For notifications and password reset',
    phoneLabel: 'Phone', phonePlaceholder: 'Optional',
    roleLabel: 'Role', roleMultiHint: '(multi-select)',
    defaultPwdLabel: 'Initial Password', defaultPwdTag: 'System Default', defaultPwdHelp: 'User must change password on first login',
    remarkLabel: 'Remark', remarkPlaceholder: 'Optional, max 200 chars',
    cancel: 'Cancel', save: 'Save',
    validUsernameRequired: 'Please enter username', validUsernameLength: 'Username must be 4-20 characters',
    validUsernameChars: 'Only letters, digits, and underscores allowed',
    validNickNameRequired: 'Please enter full name',
    validEmailRequired: 'Please enter email', validEmailFormat: 'Please enter a valid email',
    validRoleRequired: 'Please select a role',
    updateSuccess: 'User updated', createSuccess: 'User created'
  },
  resetPwdModal: {
    title: 'Reset Password',
    warning: 'The user\'s password will be reset to the system default {password}. They must change it on next login.',
    noUser: 'No user selected',
    cancel: 'Cancel', confirm: 'Confirm Reset',
    resetError: 'Password reset failed, please retry',
    resetSuccess: 'Password reset to default: {password}'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
