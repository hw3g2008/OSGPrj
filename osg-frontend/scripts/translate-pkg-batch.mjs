// Generalized i18n batch translator.
//
// Usage: node scripts/translate-pkg-batch.mjs --pkg <mentor|lead-mentor|assistant|student>
//
// Walks packages/shared/src/i18n/locales/en/<pkg>.json, replacing any string
// value containing CJK characters with the English mapping below. Maps are
// merged: BASE (common terms shared across all packages) overrides nothing,
// then per-package map overrides BASE for context-specific phrasing.
//
// Substring substitution is greedy by longest-key-first to avoid eating
// shorter phrases prematurely. Strings that still contain CJK after
// substitution are left untouched and reported.

import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const pkgIdx = args.indexOf('--pkg')
if (pkgIdx === -1 || !args[pkgIdx + 1]) {
  console.error('Usage: node scripts/translate-pkg-batch.mjs --pkg <mentor|lead-mentor|assistant|student>')
  process.exit(2)
}
const PKG = args[pkgIdx + 1]
const enPath = path.join('packages/shared/src/i18n/locales/en', `${PKG}.json`)

// -------------------------------------------------------------------------
// BASE: terms shared across all packages (weekdays, time-of-day, common UI
// chrome, common business nouns). Keep this list curated; per-package maps
// can override any entry here.
// -------------------------------------------------------------------------
const BASE = {
  // weekdays / time of day
  '周一': 'Monday', '周二': 'Tuesday', '周三': 'Wednesday', '周四': 'Thursday',
  '周五': 'Friday', '周六': 'Saturday', '周日': 'Sunday',
  '上午': 'Morning', '下午': 'Afternoon', '晚上': 'Evening', '全天': 'All Day',
  '上午 9-12': 'Morning 9-12', '下午 14-18': 'Afternoon 14-18', '晚上 19-22': 'Evening 19-22',

  // common UI
  '编辑信息': 'Edit Info', '核心信息': 'Core Info', '基本信息': 'Basic Info',
  '联系方式': 'Contact Info', '课程信息': 'Course Info',
  '英文名': 'English Name', '英文姓名': 'English Name', '中文名': 'Chinese Name',
  '姓名': 'Name', '昵称': 'Nickname', '用户名': 'Username',
  '性别': 'Gender', '邮箱': 'Email', '手机号': 'Phone', '微信号': 'WeChat',
  '微信': 'WeChat', '电话': 'Phone',
  '所在地': 'Location', '所属地区': 'Region', '学校': 'School', '专业': 'Major',
  '入学时间': 'Enrollment Date', '毕业时间': 'Graduation Date',
  '专业方向': 'Specialty', '二级方向': 'Sub Direction', '主攻方向': 'Major Direction',
  '可授课程类型': 'Teachable Course Types', '课单价': 'Per-class Price',
  '(不可修改)': '(Read-only)', '(只读)': '(Read-only)',
  '只读视图': 'Read-only View', '锁定字段，由后台维护': 'Locked field, maintained by admin',
  '以后台配置为准': 'Subject to backend configuration',
  '如需修改请联系后台文员': 'Contact admin clerk to modify',

  // status
  '正常': 'Normal', '正常服务': 'Active Service',
  '冻结': 'Frozen', '已结束': 'Ended', '退款': 'Refunded',
  '黑名单': 'Blacklist', '即将到期': 'Expiring Soon', '已到期': 'Expired',
  '已终止': 'Terminated', '到期': 'Expired',
  '待审核': 'Under Review', '已通过': 'Approved', '已驳回': 'Rejected',
  '通过': 'Approve', '驳回': 'Reject',
  '待填写': 'To Fill', '待同步': 'To Sync', '未填写': 'Not Filled',
  '待处理': 'Pending', '待上报': 'To Report', '已上报': 'Reported', '未上报': 'Not Reported',
  '待评价': 'To Review', '已评价': 'Reviewed', '待定': 'TBD',
  '待完善': 'Incomplete',
  '高': 'High', '中': 'Medium', '低': 'Low',

  // class/course terms
  '辅导类型': 'Coaching Type', '辅导内容': 'Coaching Content',
  '课程内容': 'Class Content', '上课日期': 'Class Date',
  '上课时间': 'Class Time', '时长': 'Duration', '时长(h)': 'Duration (h)',
  '提交时长': 'Submitted Duration', '审核状态': 'Review Status',
  '学员评价': 'Student Rating', '驳回原因': 'Reject Reason',
  '暂无驳回原因': 'No reject reason', '课程审核驳回': 'Course Rejected',
  '记录编号': 'Record ID', '重新提交': 'Resubmit',
  '上报课消': 'Report Sessions', '上报课程': 'Report Class',
  '上报课程记录': 'Report Class Record', '课程上报': 'Class Report',
  '学员申请': 'Student Request', '面试阶段': 'Interview Stage',
  '面试时间': 'Interview Time', '已上报课消数': 'Reported Session Count',
  '剩余课时': 'Remaining Sessions', '已完成课时': 'Completed Sessions',
  '已用课时': 'Used Sessions', '总课时': 'Total Sessions',
  '本周课时': 'This Week Sessions', '本周总时长': 'Weekly Total Duration',

  // mock practice categories
  '模拟面试': 'Mock Interview', '人际关系测试': 'Networking Test',
  '期中考试': 'Midterm Exam', '模拟期中': 'Mock Midterm',
  '模拟期中考试': 'Mock Midterm Exam', '人际关系期中考试': 'Networking Midterm',
  '基础课程': 'Basic Course', '岗位辅导': 'Position Coaching',
  '案例分析': 'Case Analysis', 'Case准备': 'Case Prep',
  '咨询案例准备': 'Consulting Case Prep', '笔试辅导': 'Written Test Coaching',
  '简历更新': 'Resume Update', '新简历': 'New Resume', '其他': 'Other',
  '模拟面试的课程': 'Mock Interview Class',
  '人际关系的课程': 'Networking Class',
  '行为训练': 'Behavioral Training', '技术的': 'Technical',
  '沟通测试': 'Communication Test', '旷课': 'Absent', '旷课备注': 'Absence Note',

  // schedule
  '可用天数': 'Available Days', '可用时长': 'Available Hours',
  '已设置的可用时间': 'Configured Available Time',
  '本周可上课时长': 'Available Hours This Week',
  '下周可上课时长': 'Available Hours Next Week',
  '本周每天可上课时间': 'Daily Available Time This Week',
  '每天可上课时间': 'Daily Available Time',
  '（可多选）': '(Multi-select)', '(可多选)': '(Multi-select)',
  '备注（可选）': 'Note (Optional)', '备注 (可选)': 'Note (Optional)',
  '本周排期': 'This Week Schedule', '下周排期': 'Next Week Schedule',
  '可保存': 'Ready to Save',

  // misc
  '保存进度': 'Save Progress', '提交申请': 'Submit Request',
  '保存成功': 'Saved', '保存失败，请稍后重试': 'Save failed, please retry',
  '提交失败': 'Submit Failed', '提交失败，请稍后重试': 'Submit failed, please retry',
  '提示': 'Notice', '知道了': 'OK', '确认': 'Confirm', '返回修改': 'Back to Edit',
  '上一页': 'Previous', '下一页': 'Next',
  '搜索': 'Search', '筛选': 'Filter', '导出': 'Export', '重新加载': 'Reload',
  '查看求职': 'View Job', '查看原因': 'View Reason',
  '岗位列表加载失败': 'Failed to load position list',
  '岗位筛选项加载失败': 'Failed to load position filters',
  '我的学员申请加载失败': 'Failed to load my student requests',
  '学员列表加载失败': 'Failed to load student list',
  '正在加载岗位数据...': 'Loading position data...',
  '未归类': 'Uncategorized', '未申请': 'Not Applied',

  // form/header phrases (assistant/lead-mentor)
  '搜索姓名': 'Search by name',
  '搜索学员姓名/ID': 'Search student name/ID',
  '搜索学员姓名/ID...': 'Search student name/ID...',
  '账号状态': 'Account Status', '关系': 'Relation', '投递': 'Submit', '面试': 'Interview',
  '班级': 'Class', '学习状态': 'Learning Status', '评分': 'Rating',
  '专长': 'Expertise', '带教学员数': 'Student Count', '本月课时': 'Sessions This Month',
  '学员列表': 'Student List', '学员求职总览': 'Student Job Overview',
  '学员求职总览.xlsx': 'student_job_overview.xlsx',
  '班主任为我': 'Lead Mentor = Me', '科技': 'Tech',
  '全部面试阶段': 'All Interview Stages',
  '是否上报课消': 'Reported?',
  '反馈摘要': 'Feedback Summary',
  '反馈收集': 'Collect Feedback',
  '反馈': 'Feedback',
  '内容': 'Content', '申请时间': 'Request Time', '学生姓名': 'Student Name',
  '个人信息': 'Profile', '编辑个人信息': 'Edit Profile',
  '按真实状态更新': 'Updated by real status',
  '张同学': 'Student Zhang', '李同学': 'Student Li',
}

// -------------------------------------------------------------------------
// Per-package overrides + extras
// -------------------------------------------------------------------------
const MENTOR = {
  '时间范围': 'Time Range', '上周': 'Last Week', '本月': 'This Month',
  '直接进入当前最常用的工作页面': 'Jump straight to your most-used pages',
  '快捷操作': 'Quick Actions', '个人设置': 'Profile Settings',
  '本周工作概览': 'This Week Overview',
  '来自真实业务接口的摘要统计': 'Summary stats from live business APIs',
  '求职辅导待确认': 'Job Coaching Pending', '模拟应聘待处理': 'Mock Practice Pending',
  '课程记录待跟进': 'Class Records To Follow Up',
  '今日 / 本周安排': "Today's / This Week's Schedule",
  '排期与业务状态汇总': 'Schedule and business status summary',
  '最近求职辅导': 'Recent Job Coaching',
  '来自 `/mentor/job-overview/list`': 'From `/mentor/job-overview/list`',
  '阶段': 'Stage',
  '当前暂无求职辅导记录': 'No job coaching records yet',
  '最近上报记录': 'Recent Reported Records',
  '来自 `/mentor/class-records/list`': 'From `/mentor/class-records/list`',
  '当前暂无课程上报记录': 'No class report records yet',
  '求职与模拟应聘工作': 'Job & Mock Practice Work',
  '本周课时': 'Sessions This Week',
  '工作总览': 'Work Overview', '真实接口聚合': 'Live API aggregation',
  '当前周总课时': 'Total Sessions This Week', '上周排期': 'Last Week Schedule',
  '无历史数据': 'No history', '本周可用天数': 'Available Days This Week',
  '学生姓名': 'Student Name', '分配时间': 'Assigned At',
  "['面试开始', '面试结束']": "['Interview Start', 'Interview End']",
  "{ emptyText: '暂无匹配记录' }": "{ emptyText: 'No matching records' }",
  "{ emptyText: '暂无匹配的模拟应聘记录' }": "{ emptyText: 'No matching mock practice records' }",
  '修改信息后，后台文员将收到提醒通知。': 'After editing, the admin clerk will be notified.',
  '注意：主攻方向、二级方向和课单价不可自行修改。': 'Note: Major Direction, Sub Direction and Per-class Price cannot be self-edited.',
  '可修改信息': 'Editable Info',
  '选择大区': 'Select Region',
  '🌎 北美': '🌎 North America', '🌍 欧洲': '🌍 Europe',
  '🌏 亚太': '🌏 APAC', '🇨🇳 中国大陆': '🇨🇳 Mainland China',
  '选择城市': 'Select City',
  '确认提交变更': 'Confirm Submit Change',
  '本次提交将进入后台文员审核链路': 'This submission enters the admin review pipeline',
  '确认后，系统会真实创建一条变更请求，等待后台文员处理。':
    'After confirmation, a real change request will be created for the admin clerk to process.',
  '保存成功！后台文员已收到您的信息变更通知。':
    'Saved. The admin clerk has been notified of your changes.',
  'New York 纽约': 'New York', 'San Francisco 旧金山': 'San Francisco',
  'Chicago 芝加哥': 'Chicago', 'London 伦敦': 'London',
  'Frankfurt 法兰克福': 'Frankfurt', 'Hong Kong 香港': 'Hong Kong',
  'Singapore 新加坡': 'Singapore', 'Tokyo 东京': 'Tokyo',
  'Shanghai 上海': 'Shanghai', 'Beijing 北京': 'Beijing',
  '您本周未填写排期，无法被安排课程！':
    'You have no schedule this week — courses cannot be assigned!',
  '请立即填写本周排期，否则将影响您的课时收入':
    'Please fill in this week’s schedule now, otherwise your session income will be affected.',
  '立即填写': 'Fill Now',
  '您本周还未填写排期': 'You have not filled in this week’s schedule yet',
  '未填写排期将无法被安排课程，请立即填写':
    'Without a schedule, courses cannot be assigned. Please fill it in now.',
  '如有特殊情况请在此说明，例如：元旦假期安排':
    'Note any special situations here (e.g. New Year holiday plans)',
  '请至少填写本周排期': 'Please fill in at least this week’s schedule',
  '请至少填写下周可上课时长': 'Please fill in at least next week’s available hours',
}

const LEAD_MENTOR = {
  '王老师': 'Mentor Wang', '张老师': 'Mentor Zhang',
  'Java/微服务': 'Java / Microservices',
  '张同学': 'Student Zhang', '李同学': 'Student Li',
  'Java 就业班 01 期': 'Java Job-Ready Class 01',
  '班主任资料加载失败': 'Failed to load lead mentor profile',
  '正在同步班主任资料...': 'Syncing lead mentor profile...',
  '请在周日前更新下周排期': 'Update next week’s schedule before Sunday',
  '按真实状态更新': 'Updated by real status',
  '绿色背景表示周末，红色背景表示节假日。每天可选择多个时间段。':
    'Green = weekend, red = holiday. Multiple slots per day allowed.',
  '请在周日前完成填写': 'Please complete before Sunday',
  '如有特殊情况请在此说明，例如：节假日安排':
    'Note any special situations here (e.g. holiday plans)',
  '当前登录班主任': 'Current Logged-in Lead Mentor',
  '未填写排期将无法被安排课程，系统将发送邮件提醒':
    'Without a schedule, courses cannot be assigned; the system will send email reminders.',
  '下周排期已按真实状态保存': 'Next week schedule saved with live status',
  '排课总览': 'Schedule Overview',
  '学情报告': 'Learning Report', '学情报告功能开发中': 'Learning report feature in development',
  '暂无可查看学员': 'No viewable students',
}

const ASSISTANT = {
  '排课协助': 'Schedule Assistance', '学员服务': 'Student Service',
  '待处理排课': 'Pending Schedules', '今日咨询': 'Today’s Consultations',
  '待整理资料': 'Pending Materials', '待收集反馈': 'Pending Feedback',
  '个': '', '次': '', '份': '', '条': '',
  '协助张同学约课': 'Help Student Zhang book class',
  '整理本周学习资料': "Organize this week's study materials",
  '收集 01 期学员反馈': 'Collect Class 01 student feedback',
  '更新面试题库': 'Update interview question bank',
  '希望增加实战项目': 'Hope to add hands-on projects',
  '王老师讲解很清晰': 'Mentor Wang explains clearly',
  '资料名称': 'Material Name', '分类': 'Category', '下载量': 'Downloads',
  'Java 核心笔记': 'Java Core Notes',
  '学习文档': 'Study Documents',
  'Spring Boot 实战': 'Spring Boot In Practice',
  '资料变更待审核': 'Profile change under review',
  '当前学员已被纳入黑名单': 'This student is blacklisted',
  '剩余课时偏低，建议优先跟进': 'Low remaining sessions — recommend prioritized follow-up',
  '合同即将到期': 'Contract expiring soon',
  '当前暂无额外提醒': 'No additional reminders',
  '学员列表暂时无法加载，请稍后重试。':
    'Student list cannot be loaded right now. Please try again later.',
  '请及时维护本周排期': "Please maintain this week's schedule promptly",
  '正在读取本周排期与上一周可复制内容，请稍候。':
    "Loading this week's schedule and last week's copyable content, please wait.",
  '无法保存': 'Cannot Save',
  '请至少选择一天可授课时间段。': 'Please select at least one teachable time slot for one day.',
  '请填写大于 0 的本周总时长。': 'Please enter a weekly total greater than 0.',
  '本周总时长不能超过 80 小时。': 'Weekly total cannot exceed 80 hours.',
  '排期暂时无法加载，请稍后重试。':
    'Schedule cannot be loaded right now. Please try again later.',
  '暂无可复制内容': 'Nothing to copy',
  '上一周暂无排期记录，可直接手动填写本周排期。':
    "No schedule from last week — fill in this week's schedule manually.",
  '复制成功': 'Copied',
  '已载入上一周排期，可继续按本周实际情况微调。':
    'Last week’s schedule loaded; adjust according to this week.',
  '复制失败': 'Copy Failed',
  '暂时无法读取上一周排期。': 'Cannot read last week’s schedule right now.',
  '课程排期已更新，刷新页面后仍会保留最新结果。':
    'Schedule updated; the latest result is preserved after page refresh.',
  '排期暂时无法保存，请稍后重试。':
    'Schedule cannot be saved right now. Please try again later.',
  '正在读取关联学员...': 'Loading linked students...',
  "{ emptyText: '当前岗位暂无可展示的关联学员明细' }":
    "{ emptyText: 'No linked student details to display for the current position' }",
  '暑期实习': 'Summer Internship', '全职招聘': 'Full-time Recruiting',
  '春季实习': 'Spring Internship', '招聘活动': 'Recruiting Event',
  '当前状态': 'Current Status', '关联学员': 'Linked Students',
  '岗位列表暂时无法加载，请稍后重试。':
    'Position list cannot be loaded right now. Please try again later.',
  '关联学员暂时无法加载。': 'Linked students cannot be loaded right now.',
  '我管理的学员': 'Students I Manage', '跟进详情': 'Follow-up Details',
  '平均评分': 'Average Rating', '课消条数': 'Session Count',
  '课消记录': 'Session Records', '该求职申请暂无课消记录': 'No session records for this job request',
  "['开始日期', '结束日期']": "['Start Date', 'End Date']",
  "{ emptyText: '当前暂无管理学员的求职记录' }":
    "{ emptyText: 'No job records for managed students yet' }",
  '最近评分': 'Latest Rating', '未安排': 'Not Arranged',
  '尚未安排面试': 'Interview not arranged yet',
  '时间待解析': 'Time pending parse', '已过面试时间': 'Past interview time',
  '拒绝': 'Reject', '放弃': 'Give Up',
  '学员,公司,岗位,城市,面试阶段,面试时间,导师,最近评分\\n':
    'Student,Company,Position,City,Stage,Interview Time,Mentor,Latest Rating\\n',
  '求职总览暂时无法加载，请稍后重试。':
    'Job overview cannot be loaded right now. Please try again later.',
  '加载课消详情失败': 'Failed to load session details',
  '申请内容': 'Request Content', '辅导老师': 'Coaching Mentor',
  '导师上报的多条课消反馈待后端详情接口接入后展示':
    'Multiple session feedback entries will display after the backend detail API is integrated',
  "{ emptyText: '当前筛选下没有可展示的模拟应聘记录' }":
    "{ emptyText: 'No mock practice records under the current filter' }",
  '模拟应聘记录暂时无法加载，请稍后重试。':
    'Mock practice records cannot be loaded right now. Please try again later.',
  '我的申报': 'My Reports', '课程记录流程': 'Class Record Flow',
  '申报人': 'Reporter',
  "{ emptyText: '当前筛选下暂无课程记录' }":
    "{ emptyText: 'No class records under the current filter' }",
  "selectedRecord?.status === 'rejected' ? '驳回原因' : '课程记录详情'":
    "selectedRecord?.status === 'rejected' ? 'Reject Reason' : 'Class Record Details'",
  '课程执行': 'Class Execution', '审核处理': 'Review Processing',
  '反馈回看': 'Feedback Review', '待结算金额': 'Pending Settlement',
  '课程记录暂时无法加载，请稍后重试。':
    'Class records cannot be loaded right now. Please try again later.',
  '学员状态: 正常上课': 'Student Status: Normal',
  '当前岗位暂无可展示的关联学员明细': 'No linked student details to display for the current position',
  '求职辅导': 'Job Coaching', '基础课': 'Basic Course', '求职目标': 'Career Goal',
  '服务状态': 'Service Status',
  "'学员列表加载失败'": "'Failed to load student list'",
  "{ emptyText: '暂无可查看学员' }": "{ emptyText: 'No viewable students' }",
}

// -------------------------------------------------------------------------
const MAPS = {
  mentor: MENTOR,
  'lead-mentor': LEAD_MENTOR,
  assistant: ASSISTANT,
}

if (!MAPS[PKG]) {
  console.error(`Unknown package "${PKG}". Supported: ${Object.keys(MAPS).join(', ')}`)
  process.exit(2)
}

const T = { ...BASE, ...MAPS[PKG] } // per-pkg overrides BASE

if (!fs.existsSync(enPath)) {
  console.error(`File not found: ${enPath}`)
  process.exit(2)
}
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))

function tryTranslate(s) {
  if (typeof s !== 'string' || !/[\u4e00-\u9fff]/.test(s)) return null
  if (T[s]) return T[s]
  let out = s
  for (const [zh, eng] of Object.entries(T).sort((a, b) => b[0].length - a[0].length)) {
    if (out.includes(zh)) out = out.split(zh).join(eng)
  }
  if (!/[\u4e00-\u9fff]/.test(out)) return out
  return null
}

let translated = 0
const unresolved = []
const walk = (o, p = '') => {
  for (const k of Object.keys(o || {})) {
    const v = o[k]
    const path = p ? `${p}.${k}` : k
    if (typeof v === 'string' && /[\u4e00-\u9fff]/.test(v)) {
      const t = tryTranslate(v)
      if (t !== null) {
        o[k] = t
        translated++
      } else {
        unresolved.push([path, v])
      }
    } else if (typeof v === 'object' && v !== null) {
      walk(v, path)
    }
  }
}
walk(en)

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8')

// Re-scan
let zh_in_en = 0, total = 0
const walk2 = (o) => {
  for (const v of Object.values(o || {})) {
    if (typeof v === 'string') { total++; if (/[\u4e00-\u9fff]/.test(v)) zh_in_en++ }
    else if (typeof v === 'object' && v !== null) walk2(v)
  }
}
walk2(en)

console.log(`[${PKG}] translated ${translated} entries; remaining ${zh_in_en}/${total} (${((zh_in_en / total) * 100).toFixed(1)}%)`)
if (unresolved.length) {
  console.log(`\nUnresolved (${unresolved.length}):`)
  for (const [p, s] of unresolved) console.log(`  ${p} = ${JSON.stringify(s)}`)
}
