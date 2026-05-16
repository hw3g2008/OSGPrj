import { readFileSync, writeFileSync } from 'fs'

const ZH_PATH = 'packages/shared/src/i18n/locales/zh/admin.json'
const EN_PATH = 'packages/shared/src/i18n/locales/en/admin.json'

const zh = JSON.parse(readFileSync(ZH_PATH, 'utf8'))
const en = JSON.parse(readFileSync(EN_PATH, 'utf8'))

// ── index: add missing export error keys ──
zh.students.index.messages.exportHttpError = '导出请求失败 (HTTP {status})'
zh.students.index.messages.exportAuthFailed = '导出请求未通过认证，请重新登录'
en.students.index.messages.exportHttpError = 'Export request failed (HTTP {status})'
en.students.index.messages.exportAuthFailed = 'Export request not authenticated, please log in again'

// ── columns ──
zh.students.columns = {
  studentId: 'ID',
  studentName: '英文姓名',
  email: '邮箱',
  leadMentorName: '班主任',
  school: '学校',
  majorDirection: '主攻方向',
  positions: '投递岗位',
  totalHours: '总课时',
  jobCoachingCount: '岗位辅导',
  basicCourseCount: '基础课',
  mockInterviewCount: '模拟应聘',
  remainingHours: '剩余课时',
  reminder: '提醒',
  accountStatus: '账号状态',
  action: '操作',
  blacklistReason: '黑名单原因',
  blacklistTime: '加入时间',
  operator: '操作人'
}
en.students.columns = {
  studentId: 'ID',
  studentName: 'Name',
  email: 'Email',
  leadMentorName: 'Lead Mentor',
  school: 'School',
  majorDirection: 'Major Direction',
  positions: 'Applications',
  totalHours: 'Total Hours',
  jobCoachingCount: 'Job Coaching',
  basicCourseCount: 'Basic Course',
  mockInterviewCount: 'Mock Interview',
  remainingHours: 'Remaining Hours',
  reminder: 'Reminder',
  accountStatus: 'Status',
  action: 'Action',
  blacklistReason: 'Reason',
  blacklistTime: 'Blacklisted At',
  operator: 'Operator'
}

// ── actionDropdown ──
zh.students.actionDropdown = {
  more: '更多',
  freeze: '冻结',
  restore: '恢复',
  addToBlacklist: '加入黑名单',
  refund: '退费'
}
en.students.actionDropdown = {
  more: 'More',
  freeze: 'Freeze',
  restore: 'Restore',
  addToBlacklist: 'Blacklist',
  refund: 'Refund'
}

// ── filterBar ──
zh.students.filterBar = {
  placeholders: {
    name: '搜索姓名',
    leadMentor: '班主任',
    school: '学校',
    graduationYear: '毕业年份',
    recruitmentCycle: '项目时间',
    majorDirection: '主攻方向',
    accountStatus: '账号状态'
  },
  status: {
    normal: '正常',
    frozen: '冻结',
    ended: '已结束',
    refunded: '退费'
  },
  buttons: {
    search: '搜索',
    reset: '重置',
    export: '导出'
  }
}
en.students.filterBar = {
  placeholders: {
    name: 'Search by name',
    leadMentor: 'Lead Mentor',
    school: 'School',
    graduationYear: 'Grad Year',
    recruitmentCycle: 'Recruitment Cycle',
    majorDirection: 'Direction',
    accountStatus: 'Status'
  },
  status: {
    normal: 'Normal',
    frozen: 'Frozen',
    ended: 'Ended',
    refunded: 'Refunded'
  },
  buttons: {
    search: 'Search',
    reset: 'Reset',
    export: 'Export'
  }
}

// ── blacklistModal ──
zh.students.blacklistModal = {
  title: '加入黑名单',
  headingPre: '确定将',
  headingPost: '加入黑名单？',
  studentFallback: '当前学员',
  descPre: '加入黑名单后，该学员将',
  descBold: '无法查看"求职中心"模块',
  descPost: '（包括岗位信息、面试准备等功能）。',
  reasonLabel: '黑名单原因',
  reasonPlaceholder: '请选择原因',
  reasonOptions: {
    violation: '违反服务协议',
    complaint: '恶意投诉',
    uncooperative: '不配合辅导',
    attitude: '态度恶劣',
    other: '其他原因'
  },
  otherReasonLabel: '其他原因说明',
  otherReasonPlaceholder: '请输入具体原因',
  remarkLabel: '备注说明',
  remarkPlaceholder: '选填，可填写详细说明',
  footer: { cancel: '取消', confirm: '确认加入黑名单' },
  validation: { reason: '请选择原因', otherReason: '请输入具体原因' }
}
en.students.blacklistModal = {
  title: 'Add to Blacklist',
  headingPre: 'Confirm adding',
  headingPost: 'to blacklist?',
  studentFallback: 'this student',
  descPre: 'After blacklisting, the student will ',
  descBold: 'lose access to the Career Center module',
  descPost: ' (including job postings, interview prep, etc.).',
  reasonLabel: 'Reason',
  reasonPlaceholder: 'Select a reason',
  reasonOptions: {
    violation: 'Violation of service agreement',
    complaint: 'Malicious complaints',
    uncooperative: 'Non-cooperation',
    attitude: 'Poor attitude',
    other: 'Other'
  },
  otherReasonLabel: 'Other reason details',
  otherReasonPlaceholder: 'Please specify the reason',
  remarkLabel: 'Remarks',
  remarkPlaceholder: 'Optional, add detailed notes',
  footer: { cancel: 'Cancel', confirm: 'Confirm Blacklist' },
  validation: { reason: 'Please select a reason', otherReason: 'Please enter the reason' }
}

// ── statusModal ──
zh.students.statusModal = {
  title: '修改学员状态',
  studentFallback: '学员姓名',
  targetStatus: {
    freeze: '冻结',
    unfreeze: '解冻',
    refund: '退费',
    end_contract: '已结束',
    default: '正常'
  },
  description: {
    freeze: '冻结后，学员账号将被暂停，无法登录系统。可随时解冻恢复。',
    unfreeze: '解冻后，学员可恢复登录与课消操作；lifecycle 状态保持不变。',
    refund: '退费后，学员账号将被停用，可通过「重新加入」走续签合同流程恢复。',
    end_contract: '结束合同后，学员仍可登录，但无法查看求职信息。导师可继续课消，需续签合同后恢复完整权限。',
    default: '恢复后，学员可正常登录和使用系统。'
  },
  reasonLabel: '修改原因',
  reasonPlaceholder: '请选择原因',
  remarkLabel: '备注说明',
  remarkPlaceholder: '选填，可填写详细说明',
  footer: { cancel: '取消', confirm: '确认修改' },
  validation: { reason: '请选择原因' },
  reasonOptions: {
    pause: '学员申请暂停',
    expiredHours: '课时用完待续费',
    violation: '违反服务协议',
    refundRequest: '学员申请退费',
    other: '其他原因'
  }
}
en.students.statusModal = {
  title: 'Change Student Status',
  studentFallback: 'Student',
  targetStatus: {
    freeze: 'Frozen',
    unfreeze: 'Unfrozen',
    refund: 'Refunded',
    end_contract: 'Ended',
    default: 'Normal'
  },
  description: {
    freeze: 'After freezing, the student account will be suspended and unable to log in. Can be unfrozen anytime.',
    unfreeze: 'After unfreezing, the student can resume login and course deduction; lifecycle status remains unchanged.',
    refund: 'After refund, the student account will be deactivated. Can be restored through the "Rejoin" flow.',
    end_contract: 'After ending the contract, the student can still log in but cannot view career information. Mentor can continue course deduction; full permissions restored after contract renewal.',
    default: 'After restoration, the student can log in and use the system normally.'
  },
  reasonLabel: 'Reason',
  reasonPlaceholder: 'Select a reason',
  remarkLabel: 'Remarks',
  remarkPlaceholder: 'Optional, add details',
  footer: { cancel: 'Cancel', confirm: 'Confirm' },
  validation: { reason: 'Please select a reason' },
  reasonOptions: {
    pause: 'Student requested pause',
    expiredHours: 'Hours depleted, pending renewal',
    violation: 'Violation of service agreement',
    refundRequest: 'Student requested refund',
    other: 'Other'
  }
}

// ── changeReviewTab ──
zh.students.changeReviewTab = {
  banner: '审核说明：核心信息、学业信息和求职方向的修改需要后台审核，联系方式修改后直接生效。',
  pending: { title: '待审核的变更', empty: '当前没有待审核的信息变更。' },
  history: { title: '历史变更记录', empty: '还没有历史变更记录。' },
  comparison: { before: '变更前', after: '变更后' },
  table: {
    headers: {
      type: '变更类型',
      field: '变更字段',
      before: '变更前',
      after: '变更后',
      time: '变更时间',
      status: '状态'
    }
  },
  action: { approve: '✓ 通过', reject: '✗ 驳回', processing: '处理中...' },
  status: {
    autoApplied: '自动生效',
    approved: '已通过',
    rejected: '已驳回',
    default: '已记录'
  },
  category: {
    academic: '学业信息',
    jobDirection: '求职方向',
    contact: '联系方式',
    default: '核心信息'
  },
  messages: {
    approveSuccess: '变更已通过',
    rejectSuccess: '变更已驳回',
    approveFailed: '变更通过失败',
    rejectFailed: '变更驳回失败'
  }
}
en.students.changeReviewTab = {
  banner: 'Review note: Changes to core info, academic info, and career direction require admin review. Contact info changes take effect immediately.',
  pending: { title: 'Pending Changes', empty: 'No pending changes.' },
  history: { title: 'Change History', empty: 'No change history yet.' },
  comparison: { before: 'Before', after: 'After' },
  table: {
    headers: {
      type: 'Type',
      field: 'Field',
      before: 'Before',
      after: 'After',
      time: 'Time',
      status: 'Status'
    }
  },
  action: { approve: '✓ Approve', reject: '✗ Reject', processing: 'Processing...' },
  status: {
    autoApplied: 'Auto Applied',
    approved: 'Approved',
    rejected: 'Rejected',
    default: 'Recorded'
  },
  category: {
    academic: 'Academic Info',
    jobDirection: 'Career Direction',
    contact: 'Contact Info',
    default: 'Core Info'
  },
  messages: {
    approveSuccess: 'Change approved',
    rejectSuccess: 'Change rejected',
    approveFailed: 'Failed to approve change',
    rejectFailed: 'Failed to reject change'
  }
}

// ── contractTab ──
zh.students.contractTab = {
  summary: {
    totalAmount: '合同总金额',
    totalHours: '总课时',
    usedHours: '已用课时',
    remainingHours: '剩余课时'
  },
  table: {
    headers: {
      contractNo: '合同编号',
      type: '类型',
      amount: '金额',
      hours: '课时',
      period: '有效期',
      status: '状态',
      attachment: '附件'
    }
  },
  usdEquivalent: '{amount} 等值',
  hoursRemaining: '剩余 {hours}h',
  dateSeparator: ' 至 ',
  download: '下载',
  status: { ended: '已结束', draft: '草稿', normal: '正常' },
  empty: '暂无合同记录。'
}
en.students.contractTab = {
  summary: {
    totalAmount: 'Total Amount',
    totalHours: 'Total Hours',
    usedHours: 'Used Hours',
    remainingHours: 'Remaining Hours'
  },
  table: {
    headers: {
      contractNo: 'Contract No.',
      type: 'Type',
      amount: 'Amount',
      hours: 'Hours',
      period: 'Period',
      status: 'Status',
      attachment: 'Attachment'
    }
  },
  usdEquivalent: '{amount} equiv.',
  hoursRemaining: '{hours}h left',
  dateSeparator: ' to ',
  download: 'Download',
  status: { ended: 'Ended', draft: 'Draft', normal: 'Normal' },
  empty: 'No contracts found.'
}

// ── editModal ──
zh.students.editModal = {
  title: '编辑学员',
  studentFallback: '学员资料',
  sections: {
    coreInfo: '核心信息',
    mentorConfig: '导师配置',
    mentorConfigDesc: '可多选',
    academicInfo: '学业信息',
    careerDirection: '求职方向',
    careerDirectionDesc: '可多选，子方向根据主攻方向联动显示',
    contactAndRemark: '联系方式与备注',
    contract: '合同',
    contractDesc: '编辑当前生效合同'
  },
  fields: {
    englishName: '英文姓名',
    gender: '性别',
    email: '邮箱',
    leadMentor: '班主任',
    assistant: '助教',
    school: '学校',
    major: '专业',
    graduationMonth: '毕业年月',
    highSchool: '高中',
    studyPlan: '学业状态',
    visa: '签证',
    targetRegion: '求职地区',
    recruitmentCycle: '招聘周期',
    majorDirections: '主攻方向',
    subDirections: '子方向',
    phone: '电话',
    wechat: '微信',
    remark: '备注',
    currency: '币种',
    amountGbp: '英镑金额',
    amountUsd: '美元金额',
    usdEquivalent: '美元等值金额',
    totalHours: '课时（小时）',
    startDate: '合同开始日期',
    endDate: '合同结束日期',
    contractAttachment: '合同附件',
    contractRemark: '备注'
  },
  placeholders: {
    englishName: '例如 Emily Zhang',
    gender: '请选择',
    email: '学员邮箱',
    school: '可多选学校（读研/双学位等）',
    major: '例如 Finance',
    graduationMonth: '请选择毕业年月',
    highSchool: '选填',
    optional: '选填',
    visa: '请选择签证状态',
    searchMentor: '输入姓名搜索班主任',
    searchAssistant: '输入姓名搜索助教',
    targetRegion: '可多选求职地区',
    majorDirections: '可多选主攻方向',
    subDirections: '可多选子方向',
    phone: '选填',
    wechat: '选填',
    remark: '选填，可填写学员补充说明',
    amountGbp: '£ 请输入英镑金额',
    amountUsd: '$ 请输入美元金额',
    usdEquivalent: '$ 请输入美元等值金额',
    totalHours: '如 40',
    startDate: '请选择合同开始日期',
    endDate: '请选择合同结束日期',
    contractRemark: '选填，可填写特殊约定等'
  },
  currency: { usd: '美元 (USD)', gbp: '英镑 (GBP)' },
  studyPlan: { normal: '正常毕业', postgraduate: '读研', deferred: '延毕' },
  gender: { male: '男', female: '女' },
  status: { normal: '正常', frozen: '冻结', ended: '已结束', refunded: '退费' },
  noActiveContract: '该学员暂无生效合同，请在合同模块续签或新建后再编辑。',
  currentAttachment: '当前附件：',
  upload: {
    clickOrDrag: '点击或拖拽文件上传',
    replace: '点击或拖拽文件替换附件',
    hint: '仅支持 PDF / PNG / JPG / JPEG，单文件不超过 150MB',
    unsupportedFormat: '仅支持 PDF / PNG / JPG / JPEG',
    fileTooLarge: '文件超过 {max}MB（实际 {actual}MB）',
    success: '上传成功',
    failed: '上传失败：{reason}',
    backendError: '后端返回错误',
    networkError: '网络或服务器错误'
  },
  footer: { cancel: '取消', save: '保存修改' },
  validation: {
    studentId: '未找到学员信息',
    email: '请填写邮箱',
    school: '请填写学校',
    contractDates: '合同结束日期不能早于开始日期'
  },
  staffFallback: { leadMentor: '班主任', assistant: '助教' },
  messages: { loadStaffFailed: '加载导师列表失败' }
}
en.students.editModal = {
  title: 'Edit Student',
  studentFallback: 'Student Profile',
  sections: {
    coreInfo: 'Core Info',
    mentorConfig: 'Mentor Configuration',
    mentorConfigDesc: 'Multiple selection allowed',
    academicInfo: 'Academic Info',
    careerDirection: 'Career Direction',
    careerDirectionDesc: 'Multiple selection; sub-direction follows major direction',
    contactAndRemark: 'Contact & Remarks',
    contract: 'Contract',
    contractDesc: 'Edit active contract'
  },
  fields: {
    englishName: 'English Name',
    gender: 'Gender',
    email: 'Email',
    leadMentor: 'Lead Mentor',
    assistant: 'Assistant',
    school: 'School',
    major: 'Major',
    graduationMonth: 'Graduation Month',
    highSchool: 'High School',
    studyPlan: 'Study Plan',
    visa: 'Visa',
    targetRegion: 'Target Region',
    recruitmentCycle: 'Recruitment Cycle',
    majorDirections: 'Major Direction',
    subDirections: 'Sub Direction',
    phone: 'Phone',
    wechat: 'WeChat',
    remark: 'Remarks',
    currency: 'Currency',
    amountGbp: 'GBP Amount',
    amountUsd: 'USD Amount',
    usdEquivalent: 'USD Equivalent',
    totalHours: 'Total Hours',
    startDate: 'Contract Start Date',
    endDate: 'Contract End Date',
    contractAttachment: 'Contract Attachment',
    contractRemark: 'Remarks'
  },
  placeholders: {
    englishName: 'e.g. Emily Zhang',
    gender: 'Please select',
    email: 'Student email',
    school: 'Multiple schools allowed (postgrad, dual degree, etc.)',
    major: 'e.g. Finance',
    graduationMonth: 'Select graduation month',
    highSchool: 'Optional',
    optional: 'Optional',
    visa: 'Select visa status',
    searchMentor: 'Search lead mentor by name',
    searchAssistant: 'Search assistant by name',
    targetRegion: 'Select target region(s)',
    majorDirections: 'Select major direction(s)',
    subDirections: 'Select sub direction(s)',
    phone: 'Optional',
    wechat: 'Optional',
    remark: 'Optional, additional notes',
    amountGbp: '£ Enter GBP amount',
    amountUsd: '$ Enter USD amount',
    usdEquivalent: '$ Enter USD equivalent',
    totalHours: 'e.g. 40',
    startDate: 'Select contract start date',
    endDate: 'Select contract end date',
    contractRemark: 'Optional, e.g. special terms'
  },
  currency: { usd: 'USD', gbp: 'GBP' },
  studyPlan: { normal: 'Normal Graduation', postgraduate: 'Postgraduate', deferred: 'Deferred' },
  gender: { male: 'Male', female: 'Female' },
  status: { normal: 'Normal', frozen: 'Frozen', ended: 'Ended', refunded: 'Refunded' },
  noActiveContract: 'No active contract found. Please renew or create a contract in the contract module first.',
  currentAttachment: 'Current attachment: ',
  upload: {
    clickOrDrag: 'Click or drag file to upload',
    replace: 'Click or drag to replace attachment',
    hint: 'PDF / PNG / JPG / JPEG only, max 150MB per file',
    unsupportedFormat: 'PDF / PNG / JPG / JPEG only',
    fileTooLarge: 'File exceeds {max}MB (actual {actual}MB)',
    success: 'Upload successful',
    failed: 'Upload failed: {reason}',
    backendError: 'Backend returned an error',
    networkError: 'Network or server error'
  },
  footer: { cancel: 'Cancel', save: 'Save Changes' },
  validation: {
    studentId: 'Student not found',
    email: 'Please enter email',
    school: 'Please enter school',
    contractDates: 'Contract end date cannot be earlier than start date'
  },
  staffFallback: { leadMentor: 'Lead Mentor', assistant: 'Assistant' },
  messages: { loadStaffFailed: 'Failed to load mentor list' }
}

// ── detailModal ──
zh.students.detailModal = {
  guardTitle: '当前角色无权查看学员详情',
  guardDesc: '仅文员与超管允许打开学员详情弹窗。该限制会在组件接入列表页后直接生效。',
  overview: {
    accountStatus: '账号状态',
    targetRegion: '求职地区',
    recruitmentCycle: '招聘周期',
    remainingHours: '剩余课时'
  },
  tabs: { profile: '基本信息', changes: '信息变更', contracts: '合同信息' },
  quickActions: { renew: '合同续签', changes: '信息变更', contracts: '查看合同' },
  loading: '正在加载学员详情...',
  loadError: { title: '详情加载失败', retry: '请稍后重试，或检查学员详情接口是否可用。' },
  sections: {
    coreInfo: '核心信息',
    mentorConfig: '导师配置',
    academicInfo: '学业信息',
    careerDirection: '求职方向',
    contact: '联系方式'
  },
  fields: {
    englishName: '英文姓名',
    gender: '性别',
    email: '邮箱',
    leadMentor: '班主任',
    assistant: '助教',
    school: '学校',
    major: '专业',
    graduationMonth: '毕业年月',
    highSchool: '高中',
    studyPlan: '学业状态',
    visa: '签证',
    targetRegion: '求职地区',
    recruitmentCycle: '招聘周期',
    majorDirections: '主攻方向',
    subDirections: '子方向',
    phone: '电话',
    wechat: '微信',
    accountStatus: '账号状态',
    remark: '备注'
  },
  gender: { male: '男', female: '女' },
  accountStatus: { normal: '正常', frozen: '冻结', ended: '已结束', refunded: '退费' },
  studyPlan: { normal: '正常毕业', postgraduate: '读研', deferred: '延毕' },
  frozen: '冻结',
  directionFallback: '方向待补充',
  fallbackName: '学员详情',
  fieldFallback: '未命名字段',
  requestedBySystem: '系统',
  footer: { cancel: '取消', edit: '编辑学员' }
}
en.students.detailModal = {
  guardTitle: 'No permission to view student details',
  guardDesc: 'Only staff and super admins can open student detail modals. This restriction takes effect once integrated with the list page.',
  overview: {
    accountStatus: 'Account Status',
    targetRegion: 'Target Region',
    recruitmentCycle: 'Recruitment Cycle',
    remainingHours: 'Remaining Hours'
  },
  tabs: { profile: 'Basic Info', changes: 'Change Review', contracts: 'Contracts' },
  quickActions: { renew: 'Renew Contract', changes: 'Change Review', contracts: 'View Contracts' },
  loading: 'Loading student details...',
  loadError: { title: 'Failed to load details', retry: 'Please try again later or check the student detail API.' },
  sections: {
    coreInfo: 'Core Info',
    mentorConfig: 'Mentor Configuration',
    academicInfo: 'Academic Info',
    careerDirection: 'Career Direction',
    contact: 'Contact Info'
  },
  fields: {
    englishName: 'English Name',
    gender: 'Gender',
    email: 'Email',
    leadMentor: 'Lead Mentor',
    assistant: 'Assistant',
    school: 'School',
    major: 'Major',
    graduationMonth: 'Graduation Month',
    highSchool: 'High School',
    studyPlan: 'Study Plan',
    visa: 'Visa',
    targetRegion: 'Target Region',
    recruitmentCycle: 'Recruitment Cycle',
    majorDirections: 'Major Direction',
    subDirections: 'Sub Direction',
    phone: 'Phone',
    wechat: 'WeChat',
    accountStatus: 'Account Status',
    remark: 'Remarks'
  },
  gender: { male: 'Male', female: 'Female' },
  accountStatus: { normal: 'Normal', frozen: 'Frozen', ended: 'Ended', refunded: 'Refunded' },
  studyPlan: { normal: 'Normal Graduation', postgraduate: 'Postgraduate', deferred: 'Deferred' },
  frozen: 'Frozen',
  directionFallback: 'Direction TBD',
  fallbackName: 'Student Detail',
  fieldFallback: 'Unnamed field',
  requestedBySystem: 'System',
  footer: { cancel: 'Cancel', edit: 'Edit Student' }
}

writeFileSync(ZH_PATH, JSON.stringify(zh, null, 2), 'utf8')
writeFileSync(EN_PATH, JSON.stringify(en, null, 2), 'utf8')
console.log('done')
