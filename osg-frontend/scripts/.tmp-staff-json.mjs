import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.users) zh.users = {}
if (!en.users) en.users = {}

zh.users.staff = {
  pageTitle: '导师列表',
  addBtn: '新增导师',
  pendingAlert: {
    message: '有 {count} 位导师的个人信息变更待审核',
    description: '导师提交的银行信息、联系方式等变更需要您审核确认',
    action: '立即处理'
  },
  tabs: { normal: '正常列表', blacklist: '黑名单' },
  blacklistAlert: {
    message: '黑名单导师限制说明',
    descPre: '黑名单中的导师',
    descStrong: '无法登录系统',
    descPost: '，且无法访问任何业务模块'
  },
  filter: {
    searchPlaceholder: '搜索姓名/ID',
    allTypes: '全部类型',
    allDirections: '全部方向',
    allStatus: '全部状态',
    statusNormal: '正常',
    statusFrozen: '冻结',
    search: '搜索'
  },
  staffTypes: { lead_mentor: '班主任', mentor: '导师', assistant: '助教' },
  export: { idle: '导出', loading: '导出中...' },
  table: {
    empty: '暂无导师数据',
    emptyBlacklist: '暂无黑名单导师',
    showTotal: '共 {total} 条记录'
  },
  action: {
    detail: '详情', edit: '编辑', more: '更多',
    resetPassword: '重置密码', freeze: '冻结', restore: '解冻',
    blacklist: '加入黑名单', removeBlacklist: '移出黑名单'
  },
  studentCount: '{count} 学员',
  companiesMore: '{label} 等{count}家',
  statusText: { normal: '正常', frozen: '冻结' },
  statusNote: { frozen: '账号已冻结', blacklisted: '已加入黑名单', normal: '账号正常' },
  messages: {
    loadError: '导师列表加载失败',
    exportSuccess: '导师列表导出成功',
    exportFail: '导师列表导出失败',
    updateSuccess: '导师信息已更新',
    updateFail: '导师更新失败',
    createSuccess: '导师已新增',
    createFail: '导师新增失败',
    freezeSuccess: '导师账号已冻结',
    restoreSuccess: '导师账号已解冻',
    blacklistSuccess: '导师已加入黑名单',
    removeSuccess: '导师已移出黑名单',
    pendingEmpty: '当前没有可处理的导师记录',
    pendingError: '待审核导师信息加载失败'
  },
  resetPassword: {
    title: '重置密码成功',
    account: '登录账号：{account}',
    password: '默认密码：{password}',
    ok: '知道了'
  },
  columns: {
    staffId: 'ID', staffName: '英文名', contact: '联系方式',
    staffType: '类型', majorDirection: '主攻方向', subDirection: '子方向',
    region: '所属地区', companies: '任职公司', rating: '评级',
    hourlyRate: '课单价', studentCount: '学员数',
    accountStatus: '账号状态', action: '操作'
  },
  students: {
    title: '{name}的学员',
    titleDefault: '导师学员列表',
    loading: '加载中...',
    empty: '暂无关联学员',
    close: '关闭'
  },
  detail: {
    defaultTitle: '导师详情',
    loading: '正在加载导师详情...',
    loadError: '导师详情加载失败',
    retryHint: '请稍后重试',
    tabs: { profile: '基本信息', changes: '信息变更' },
    cards: {
      email: '邮箱', phone: '手机号',
      majorDirection: '主攻方向', studentCount: '当前学员数'
    },
    sections: {
      basic: '基本资料',
      basicDesc: '交付阶段使用真实后端数据展示导师账户和所在城市。',
      specialty: '专业能力',
      career: '职业背景',
      internal: '内部评估',
      changes: '待审核变更',
      changesDesc: '导师提交的资料变更会在这里完成审核，审核完成后会刷新列表待处理数量。'
    },
    fields: {
      staffId: '导师 ID', staffName: '姓名', region: '地区', city: '城市',
      subDirection: '子方向', hourlyRate: '课时单价',
      specialty: '擅长', companies: '任职公司', rating: '评级', ratingRemark: '评语'
    },
    noData: '暂无',
    unrated: '未评级',
    industryOther: '其他',
    changesEmpty: '当前没有待审核的资料变更。',
    changesPending: '待审核',
    rejectReasonLabel: '驳回说明',
    rejectReasonPlaceholder: '选填：输入驳回原因后再执行驳回',
    rejectBtn: '驳回',
    approveBtn: '通过',
    close: '关闭',
    messages: {
      approveSuccess: '导师变更申请已通过',
      approveFail: '审核通过失败',
      rejectSuccess: '导师变更申请已驳回',
      rejectFail: '驳回失败'
    }
  },
  form: {
    titleEdit: '编辑导师 - {name}（ID: {id}）',
    titleAdd: '新增导师',
    sections: {
      core: '核心信息', contact: '联系方式', specialty: '专业方向',
      career: '职业背景', internal: '内部评估', account: '账号信息'
    },
    fields: {
      staffName: '姓名', email: '邮箱', staffType: '类型', gender: '性别',
      phone: '手机号', wechat: '微信', region: '地区', city: '城市',
      majorDirection: '主攻方向', subDirection: '子方向',
      courseType: '可授课程类型', specialty: '擅长',
      hourlyRate: '课时单价（USD/h）', companies: '任职公司',
      rating: '评级', ratingRemark: '评语',
      loginAccount: '登录账号', initialPassword: '初始密码'
    },
    placeholders: {
      staffName: '请输入英文名', email: '请输入邮箱',
      typeSelect: '请选择', phone: '请输入手机号', wechat: '请输入微信号',
      multiSelect: '请选择，可多选', cityReady: '请选择（选填）',
      cityWait: '请先选择地区', subDirectionWait: '请先选择主攻方向',
      hourlyRate: '如 200',
      companies: '请选择或搜索公司，可多选',
      rating: '请选择评级',
      ratingRemark: '请输入评语（选填，仅超管可见可写）',
      loginAccount: '请输入登录账号', initialPassword: '请输入初始密码'
    },
    genders: { male: '男', female: '女' },
    defaultCountryCode: '+1 美国/加拿大',
    footer: { save: '保存修改', add: '确定添加', cancel: '取消' },
    validation: {
      staffName: '请填写导师姓名', email: '请填写邮箱',
      staffType: '请选择导师类型', majorDirection: '请选择主攻方向',
      region: '请选择地区', hourlyRate: '请填写课时单价',
      specialtyMax: '擅长最多选择 20 项', companiesMax: '任职公司最多选择 10 家'
    }
  },
  statusModal: {
    staffFallback: '当前导师',
    titles: {
      freeze: '冻结导师账号', restore: '解冻导师账号',
      blacklist: '加入黑名单', remove: '移出黑名单'
    },
    descriptions: {
      freeze: '冻结后该导师账号将无法正常登录系统。',
      restore: '确认后该导师账号将恢复为正常可用状态。',
      blacklist: '加入黑名单后，该导师将被限制使用后续相关模块能力。',
      remove: '确认后将解除该导师的黑名单状态。'
    },
    reasonLabels: {
      remove: '移出原因', blacklist: '原因选择', other: '状态修改原因'
    },
    reasonPlaceholders: {
      remove: '请选择移出原因', blacklist: '请选择黑名单原因',
      restore: '请选择恢复原因', freeze: '请选择冻结原因'
    },
    reasonOptions: {
      freeze: {
        staff_pause: '导师申请暂停', service_quality: '服务质量问题',
        policy_violation: '违反服务协议', other: '其他原因'
      },
      blacklist: {
        contact_violation: '违规联系学员', service_complaint: '严重服务投诉',
        cooperation_end: '合作终止', other: '其他原因'
      }
    },
    otherReasonLabel: '其他原因说明',
    otherReasonPlaceholder: '请补充其他原因',
    remarkLabel: '备注说明',
    remarkPlaceholder: '可选，补充本次操作的背景说明',
    validation: { required: '请选择原因' },
    footer: { cancel: '取消', confirm: '确认' }
  }
}

en.users.staff = {
  pageTitle: 'Mentor List',
  addBtn: 'Add Mentor',
  pendingAlert: {
    message: '{count} mentor(s) have pending profile change requests',
    description: 'Mentor-submitted changes to bank info, contact details etc. need your review',
    action: 'Review Now'
  },
  tabs: { normal: 'Active', blacklist: 'Blacklist' },
  blacklistAlert: {
    message: 'Blacklist Restrictions',
    descPre: 'Blacklisted mentors ',
    descStrong: 'cannot log in',
    descPost: ' and cannot access any module'
  },
  filter: {
    searchPlaceholder: 'Search name/ID',
    allTypes: 'All Types',
    allDirections: 'All Directions',
    allStatus: 'All Statuses',
    statusNormal: 'Active',
    statusFrozen: 'Frozen',
    search: 'Search'
  },
  staffTypes: { lead_mentor: 'Lead Mentor', mentor: 'Mentor', assistant: 'Assistant' },
  export: { idle: 'Export', loading: 'Exporting...' },
  table: {
    empty: 'No mentors found',
    emptyBlacklist: 'No blacklisted mentors',
    showTotal: '{total} records'
  },
  action: {
    detail: 'Detail', edit: 'Edit', more: 'More',
    resetPassword: 'Reset Password', freeze: 'Freeze', restore: 'Restore',
    blacklist: 'Blacklist', removeBlacklist: 'Remove from Blacklist'
  },
  studentCount: '{count} student(s)',
  companiesMore: '{label} and {count} more',
  statusText: { normal: 'Active', frozen: 'Frozen' },
  statusNote: { frozen: 'Account frozen', blacklisted: 'Blacklisted', normal: 'Account active' },
  messages: {
    loadError: 'Failed to load mentor list',
    exportSuccess: 'Mentor list exported',
    exportFail: 'Export failed',
    updateSuccess: 'Mentor updated',
    updateFail: 'Update failed',
    createSuccess: 'Mentor added',
    createFail: 'Failed to add mentor',
    freezeSuccess: 'Mentor account frozen',
    restoreSuccess: 'Mentor account restored',
    blacklistSuccess: 'Mentor blacklisted',
    removeSuccess: 'Mentor removed from blacklist',
    pendingEmpty: 'No pending mentor records',
    pendingError: 'Failed to load pending mentor info'
  },
  resetPassword: {
    title: 'Password Reset Successful',
    account: 'Login account: {account}',
    password: 'Default password: {password}',
    ok: 'Got it'
  },
  columns: {
    staffId: 'ID', staffName: 'Name', contact: 'Contact',
    staffType: 'Type', majorDirection: 'Major Direction', subDirection: 'Sub Direction',
    region: 'Region', companies: 'Companies', rating: 'Rating',
    hourlyRate: 'Rate/h', studentCount: 'Students',
    accountStatus: 'Status', action: 'Action'
  },
  students: {
    title: "{name}'s Students",
    titleDefault: 'Mentor Students',
    loading: 'Loading...',
    empty: 'No students assigned',
    close: 'Close'
  },
  detail: {
    defaultTitle: 'Mentor Detail',
    loading: 'Loading mentor detail...',
    loadError: 'Failed to load mentor detail',
    retryHint: 'Please try again later',
    tabs: { profile: 'Profile', changes: 'Changes' },
    cards: {
      email: 'Email', phone: 'Phone',
      majorDirection: 'Major Direction', studentCount: 'Current Students'
    },
    sections: {
      basic: 'Basic Info',
      basicDesc: 'Production uses real backend data for mentor account and city.',
      specialty: 'Expertise',
      career: 'Career Background',
      internal: 'Internal Assessment',
      changes: 'Pending Changes',
      changesDesc: 'Mentor profile change requests are reviewed here. The pending count refreshes after review.'
    },
    fields: {
      staffId: 'Mentor ID', staffName: 'Name', region: 'Region', city: 'City',
      subDirection: 'Sub Direction', hourlyRate: 'Rate/h',
      specialty: 'Specialty', companies: 'Companies', rating: 'Rating', ratingRemark: 'Comment'
    },
    noData: 'None',
    unrated: 'Unrated',
    industryOther: 'Other',
    changesEmpty: 'No pending profile changes.',
    changesPending: 'Pending',
    rejectReasonLabel: 'Rejection Reason',
    rejectReasonPlaceholder: 'Optional: enter rejection reason before rejecting',
    rejectBtn: 'Reject',
    approveBtn: 'Approve',
    close: 'Close',
    messages: {
      approveSuccess: 'Change approved',
      approveFail: 'Approval failed',
      rejectSuccess: 'Change rejected',
      rejectFail: 'Rejection failed'
    }
  },
  form: {
    titleEdit: 'Edit Mentor - {name} (ID: {id})',
    titleAdd: 'Add Mentor',
    sections: {
      core: 'Core Info', contact: 'Contact', specialty: 'Specialty',
      career: 'Career', internal: 'Internal', account: 'Account'
    },
    fields: {
      staffName: 'Name', email: 'Email', staffType: 'Type', gender: 'Gender',
      phone: 'Phone', wechat: 'WeChat', region: 'Region', city: 'City',
      majorDirection: 'Major Direction', subDirection: 'Sub Direction',
      courseType: 'Course Types', specialty: 'Specialty',
      hourlyRate: 'Rate (USD/h)', companies: 'Companies',
      rating: 'Rating', ratingRemark: 'Comment',
      loginAccount: 'Login Account', initialPassword: 'Initial Password'
    },
    placeholders: {
      staffName: 'Enter English name', email: 'Enter email',
      typeSelect: 'Select', phone: 'Enter phone', wechat: 'Enter WeChat ID',
      multiSelect: 'Select (multiple)', cityReady: 'Select (optional)',
      cityWait: 'Select region first', subDirectionWait: 'Select major direction first',
      hourlyRate: 'e.g. 200',
      companies: 'Search and select companies',
      rating: 'Select rating',
      ratingRemark: 'Enter comment (optional, super-admin only)',
      loginAccount: 'Enter login account', initialPassword: 'Enter initial password'
    },
    genders: { male: 'Male', female: 'Female' },
    defaultCountryCode: '+1 US/Canada',
    footer: { save: 'Save', add: 'Add', cancel: 'Cancel' },
    validation: {
      staffName: 'Please enter mentor name', email: 'Please enter email',
      staffType: 'Please select type', majorDirection: 'Please select major direction',
      region: 'Please select region', hourlyRate: 'Please enter hourly rate',
      specialtyMax: 'Max 20 specialties', companiesMax: 'Max 10 companies'
    }
  },
  statusModal: {
    staffFallback: 'This Mentor',
    titles: {
      freeze: 'Freeze Mentor Account', restore: 'Restore Mentor Account',
      blacklist: 'Add to Blacklist', remove: 'Remove from Blacklist'
    },
    descriptions: {
      freeze: 'The mentor account will not be able to log in after freezing.',
      restore: 'The mentor account will be restored to active status.',
      blacklist: 'The mentor will be restricted from related modules after blacklisting.',
      remove: 'The mentor\'s blacklist status will be lifted.'
    },
    reasonLabels: {
      remove: 'Removal Reason', blacklist: 'Select Reason', other: 'Reason'
    },
    reasonPlaceholders: {
      remove: 'Select removal reason', blacklist: 'Select blacklist reason',
      restore: 'Select restore reason', freeze: 'Select freeze reason'
    },
    reasonOptions: {
      freeze: {
        staff_pause: 'Mentor requested pause', service_quality: 'Service quality issue',
        policy_violation: 'Policy violation', other: 'Other'
      },
      blacklist: {
        contact_violation: 'Unauthorized student contact', service_complaint: 'Serious service complaint',
        cooperation_end: 'Cooperation ended', other: 'Other'
      }
    },
    otherReasonLabel: 'Other Reason',
    otherReasonPlaceholder: 'Enter other reason',
    remarkLabel: 'Notes',
    remarkPlaceholder: 'Optional: background notes for this action',
    validation: { required: 'Please select a reason' },
    footer: { cancel: 'Cancel', confirm: 'Confirm' }
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
