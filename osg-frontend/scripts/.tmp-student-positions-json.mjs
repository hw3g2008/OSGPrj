import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

zh.career.studentPositions = {
  pageTitle: '学生自添岗位',
  pendingCount: '{count} 条待审核',
  coachingCount: '{count} 条有辅导申请',
  hasCoaching: '有辅导申请',
  unnamedStudent: '未命名学生',
  studentFallback: '学员',
  empty: '当前筛选条件下暂无学生自添岗位',
  filter: {
    statusAll: '全部状态',
    categoryPlaceholder: '全部类别',
    coachingPlaceholder: '有无辅导申请',
    hasCoaching: '有辅导申请',
    noCoaching: '无辅导申请',
    searchPlaceholder: '搜索公司或岗位名称',
    search: '搜索',
    reset: '重置'
  },
  status: { pending: '待审核', approved: '已通过', rejected: '已拒绝' },
  category: {
    summer: '暑期实习',
    fulltime: '全职招聘',
    offcycle: '非常规周期',
    spring: '春季实习',
    events: '招聘活动'
  },
  columns: {
    companyPosition: '公司/岗位',
    category: '岗位分类',
    student: '提交学生',
    submittedAt: '提交时间',
    status: '状态',
    action: '操作'
  },
  action: { edit: '编辑', reject: '拒绝', viewResult: '查看结果' },
  reviewInfo: {
    title: '审核说明',
    description: '岗位通过后将加入公共岗位库，其他学生可见。有辅导申请的岗位通过后，辅导申请将自动流转到班主任端进行导师分配。'
  },
  relativeTime: {
    justNow: '刚刚提交',
    withinHour: '1 小时内',
    hoursAgo: '{hours} 小时前',
    daysAgo: '{days} 天前'
  },
  messages: {
    approveSuccess: '学生自添岗位已通过审核',
    rejectSuccess: '学生自添岗位已拒绝'
  },
  rejectModal: {
    title: '拒绝岗位',
    student: '当前学生',
    description: '拒绝后，该岗位不会加入公共岗位库，学生将收到审核结果通知。',
    reasonLabel: '拒绝原因',
    reasons: {
      inaccessible: '岗位链接无法访问',
      notOnSite: '公司官网无此岗位',
      mismatch: '信息与官方不符',
      duplicate: '与现有岗位重复',
      other: '其他'
    },
    noteLabel: '补充说明',
    notePlaceholder: '可选，补充本次拒绝说明',
    cancel: '取消',
    confirm: '确认拒绝',
    warnReason: '请选择拒绝原因'
  },
  reviewModal: {
    titleEdit: '学生自添岗位编辑',
    titleResult: '学生自添岗位结果',
    submittedPending: '提交时间待补充',
    submittedAt: '提交于 {time}',
    mode: { create: '新增公共岗位', merge: '合并到已有岗位' },
    dupHintTitle: '检测到已有相同公司+岗位记录',
    dupHintDesc: '已有岗位 ID #{id}。建议',
    dupHintSwitch: '切换到「合并到已有岗位」',
    mergeToLabel: '合并到已有岗位',
    mergeSearchPlaceholder: '按公司或岗位名搜索',
    sections: { basicInfo: '基本信息', companyInfo: '公司信息' },
    fields: {
      category: '岗位分类',
      positionName: '岗位名称',
      positionNamePlaceholder: '如 Summer Analyst',
      department: '部门',
      projectYear: '项目时间',
      industry: '行业',
      industryPlaceholder: '如 Bulge Bracket / Buyside / Consulting',
      deadline: '截止日期',
      deadlinePlaceholder: '选择截止时间',
      recruitmentCycle: '招聘周期',
      companyName: '公司名称',
      companyType: '公司类别',
      region: '岗位地区',
      city: '城市',
      companyWebsite: '公司官网',
      positionUrl: '岗位链接 *'
    },
    selectPlaceholder: '请选择',
    cityNoRegion: '请先选择岗位地区',
    cancel: '取消',
    reject: '拒绝岗位',
    save: '保存并通过',
    warnMerge: '请选择合并目标公共岗位',
    warnUrl: '请填写岗位链接'
  }
}

en.career.studentPositions = {
  pageTitle: 'Student Added Positions',
  pendingCount: '{count} pending review',
  coachingCount: '{count} with coaching request',
  hasCoaching: 'Coaching Requested',
  unnamedStudent: 'Unnamed Student',
  studentFallback: 'Student',
  empty: 'No student-added positions match the current filters',
  filter: {
    statusAll: 'All Status',
    categoryPlaceholder: 'All Categories',
    coachingPlaceholder: 'Coaching Request',
    hasCoaching: 'Has Coaching Request',
    noCoaching: 'No Coaching Request',
    searchPlaceholder: 'Search company or position name',
    search: 'Search',
    reset: 'Reset'
  },
  status: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  category: {
    summer: 'Summer Internship',
    fulltime: 'Full-time',
    offcycle: 'Off-cycle',
    spring: 'Spring Internship',
    events: 'Recruitment Event'
  },
  columns: {
    companyPosition: 'Company / Position',
    category: 'Category',
    student: 'Submitted By',
    submittedAt: 'Submitted At',
    status: 'Status',
    action: 'Action'
  },
  action: { edit: 'Edit', reject: 'Reject', viewResult: 'View Result' },
  reviewInfo: {
    title: 'Review Notes',
    description: 'Approved positions will be added to the public position library and visible to other students. Positions with coaching requests will automatically be forwarded to the lead mentor for mentor assignment.'
  },
  relativeTime: {
    justNow: 'Just submitted',
    withinHour: 'Within 1 hour',
    hoursAgo: '{hours} hrs ago',
    daysAgo: '{days} days ago'
  },
  messages: {
    approveSuccess: 'Student-added position approved',
    rejectSuccess: 'Student-added position rejected'
  },
  rejectModal: {
    title: 'Reject Position',
    student: 'Current Student',
    description: 'Once rejected, this position will not be added to the public library and the student will be notified.',
    reasonLabel: 'Rejection Reason',
    reasons: {
      inaccessible: 'Position link inaccessible',
      notOnSite: 'Not found on company website',
      mismatch: 'Information differs from official source',
      duplicate: 'Duplicate of existing position',
      other: 'Other'
    },
    noteLabel: 'Additional Notes',
    notePlaceholder: 'Optional: add notes for this rejection',
    cancel: 'Cancel',
    confirm: 'Confirm Rejection',
    warnReason: 'Please select a rejection reason'
  },
  reviewModal: {
    titleEdit: 'Edit Student-Added Position',
    titleResult: 'Student-Added Position Result',
    submittedPending: 'Submitted time pending',
    submittedAt: 'Submitted at {time}',
    mode: { create: 'Create New Public Position', merge: 'Merge to Existing Position' },
    dupHintTitle: 'Duplicate position detected',
    dupHintDesc: 'Existing position ID #{id}. Recommended:',
    dupHintSwitch: 'Switch to Merge',
    mergeToLabel: 'Merge to existing position',
    mergeSearchPlaceholder: 'Search by company or position name',
    sections: { basicInfo: 'Basic Info', companyInfo: 'Company Info' },
    fields: {
      category: 'Category',
      positionName: 'Position Name',
      positionNamePlaceholder: 'e.g. Summer Analyst',
      department: 'Department',
      projectYear: 'Project Year',
      industry: 'Industry',
      industryPlaceholder: 'e.g. Bulge Bracket / Buyside / Consulting',
      deadline: 'Deadline',
      deadlinePlaceholder: 'Select deadline',
      recruitmentCycle: 'Recruitment Cycle',
      companyName: 'Company Name',
      companyType: 'Company Type',
      region: 'Region',
      city: 'City',
      companyWebsite: 'Company Website',
      positionUrl: 'Position URL *'
    },
    selectPlaceholder: 'Please select',
    cityNoRegion: 'Please select a region first',
    cancel: 'Cancel',
    reject: 'Reject Position',
    save: 'Save & Approve',
    warnMerge: 'Please select a target position to merge',
    warnUrl: 'Please enter the position URL'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
