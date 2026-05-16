import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

if (!zh.users) zh.users = {}
if (!en.users) en.users = {}

zh.users.mentorSchedule = {
  pageTitle: '导师排期管理',
  export: { idle: '导出排期表', loading: '导出中...' },
  unfilled: {
    title: '{count} 位导师排期未填写',
    descNext: '请尽快补齐下周排期',
    descCurrent: '距离截止还有 2 天',
    remindBtn: '一键催促全部',
    reminding: '催促中...'
  },
  header: { allMentors: '全部导师 ({count}人)' },
  filter: {
    keyword: '搜索导师姓名/ID...',
    allTypes: '全部类型',
    allDays: '全部日期',
    allSlots: '全部时段'
  },
  staffTypes: { lead_mentor: '班主任', mentor: '导师', assistant: '助教' },
  weekOptions: { current: '本周', next: '下周' },
  weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  timeSlots: { morning: '上午', afternoon: '下午', evening: '晚上' },
  table: {
    empty: '当前筛选条件下暂无排期数据',
    showTotal: '共 {total} 条记录',
    unfilledTag: '未填写排期',
    unfilledAria: '未填写排期',
    adjust: '调整排期',
    fill: '代填排期'
  },
  messages: {
    remindSuccess: '已提醒 {count} 位导师补齐排期',
    noRemind: '当前无可提醒导师',
    remindFail: '催促导师失败',
    exportSuccess: '导师排期导出成功',
    exportFail: '导师排期导出失败',
    exportFailReason: '导师排期导出失败：{reason}',
    exportAuthFail: '导出请求未通过认证，请重新登录',
    saveSuccess: '导师排期已保存',
    saveFail: '导师排期保存失败'
  },
  filename: '导师排期表.xlsx',
  columns: {
    staffId: 'ID',
    staffName: '导师',
    staffType: '类型',
    availableHours: '可用时长',
    availableSlotLabels: '可用时间',
    action: '操作'
  },
  editModal: {
    titleAdjust: '调整导师排期',
    titleFill: '代填导师排期',
    weekLabel: { current: '本周排期', next: '下周排期' },
    weekCurrent: '本周',
    weekNext: '下周',
    staffPlaceholder: '待选择导师',
    hoursLabel: '{week}可用时长',
    hoursTitle: '可上课时长',
    hoursUnit: '小时 / 周',
    quickSelectAriaLabel: '快捷选择',
    slotsTitle: '每天可上课时间',
    slotsHint: '可多选',
    slotSuffix: '可用时段',
    monthLabel: '{month}月',
    weekend: '周末',
    weekendHint: '周末',
    reasonTitle: '调整原因',
    reasonPlaceholder: '请填写调整原因，将同步通知给导师',
    notifyTitle: '同步通知导师',
    notifyDesc: '调整后将发送邮件和站内消息通知该导师',
    cancel: '取消',
    submit: '保存并通知',
    warnNoStaff: '未找到导师信息，暂时无法保存',
    warnNoReason: '请填写调整原因'
  }
}

en.users.mentorSchedule = {
  pageTitle: 'Mentor Schedule',
  export: { idle: 'Export Schedule', loading: 'Exporting...' },
  unfilled: {
    title: '{count} mentors have not filled schedule',
    descNext: 'Please complete next week\'s schedule',
    descCurrent: '2 days until deadline',
    remindBtn: 'Remind All',
    reminding: 'Reminding...'
  },
  header: { allMentors: 'All Mentors ({count})' },
  filter: {
    keyword: 'Search mentor name/ID...',
    allTypes: 'All Types',
    allDays: 'All Days',
    allSlots: 'All Slots'
  },
  staffTypes: { lead_mentor: 'Lead Mentor', mentor: 'Mentor', assistant: 'Assistant' },
  weekOptions: { current: 'This Week', next: 'Next Week' },
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  timeSlots: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
  table: {
    empty: 'No schedule data for current filters',
    showTotal: '{total} records',
    unfilledTag: 'No Schedule',
    unfilledAria: 'No schedule filled',
    adjust: 'Adjust',
    fill: 'Fill Schedule'
  },
  messages: {
    remindSuccess: 'Reminded {count} mentors to fill schedule',
    noRemind: 'No mentors to remind',
    remindFail: 'Failed to remind mentors',
    exportSuccess: 'Schedule exported successfully',
    exportFail: 'Schedule export failed',
    exportFailReason: 'Schedule export failed: {reason}',
    exportAuthFail: 'Export unauthorized, please log in again',
    saveSuccess: 'Schedule saved',
    saveFail: 'Failed to save schedule'
  },
  filename: 'mentor-schedule.xlsx',
  columns: {
    staffId: 'ID',
    staffName: 'Mentor',
    staffType: 'Type',
    availableHours: 'Avail. Hours',
    availableSlotLabels: 'Avail. Time',
    action: 'Action'
  },
  editModal: {
    titleAdjust: 'Adjust Mentor Schedule',
    titleFill: 'Fill Mentor Schedule',
    weekLabel: { current: 'This Week', next: 'Next Week' },
    weekCurrent: 'This Week',
    weekNext: 'Next Week',
    staffPlaceholder: 'Select Mentor',
    hoursLabel: '{week} Available Hours',
    hoursTitle: 'Available Hours',
    hoursUnit: 'hrs / week',
    quickSelectAriaLabel: 'Quick select',
    slotsTitle: 'Available Time per Day',
    slotsHint: 'Multiple allowed',
    slotSuffix: ' available slots',
    monthLabel: '{month}',
    weekend: 'Weekend',
    weekendHint: 'Weekend',
    reasonTitle: 'Reason',
    reasonPlaceholder: 'Enter reason — will be notified to the mentor',
    notifyTitle: 'Notify Mentor',
    notifyDesc: 'Email and in-app message will be sent to the mentor after saving',
    cancel: 'Cancel',
    submit: 'Save & Notify',
    warnNoStaff: 'Mentor not found, cannot save',
    warnNoReason: 'Please enter a reason'
  }
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
