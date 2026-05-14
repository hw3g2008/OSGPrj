import { i18n } from '@osg/shared'

const t = (key: string) => i18n.global.t(key)

export const studentColumns = [
  { title: 'ID', dataIndex: 'studentId', key: 'studentId', width: 80 },
  { title: t('english_name_2'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('email'), dataIndex: 'email', key: 'email', width: 160 },
  { title: t('head_teacher'), dataIndex: 'leadMentorName', key: 'leadMentorName', width: 100 },
  { title: t('school'), dataIndex: 'school', key: 'school', width: 120, ellipsis: true },
  { title: t('major_focus'), dataIndex: 'majorDirection', key: 'majorDirection', width: 140, ellipsis: true },
  { title: t('applied_positions'), dataIndex: 'positions', key: 'positions', width: 160 },
  { title: t('total_hours'), dataIndex: 'totalHours', key: 'totalHours', width: 80, align: 'center' as const },
  { title: t('position_coaching'), dataIndex: 'jobCoachingCount', key: 'jobCoachingCount', width: 90, align: 'center' as const },
  { title: t('foundation_course'), dataIndex: 'basicCourseCount', key: 'basicCourseCount', width: 80, align: 'center' as const },
  { title: t('mock_application'), dataIndex: 'mockInterviewCount', key: 'mockInterviewCount', width: 90, align: 'center' as const },
  { title: t('remaining_hours'), dataIndex: 'remainingHours', key: 'remainingHours', width: 90, align: 'center' as const },
  { title: t('reminder'), dataIndex: 'reminder', key: 'reminder', width: 100 },
  { title: t('account_status_2'), dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
]

export const blacklistColumns = [
  { title: 'ID', dataIndex: 'studentId', key: 'studentId', width: 80 },
  { title: t('english_name_2'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('email'), dataIndex: 'email', key: 'email', width: 160 },
  { title: t('head_teacher'), dataIndex: 'leadMentorName', key: 'leadMentorName', width: 100 },
  { title: t('school'), dataIndex: 'school', key: 'school', width: 120 },
  { title: t('major_focus'), dataIndex: 'majorDirection', key: 'majorDirection', width: 90 },
  { title: t('blacklist_reason'), dataIndex: 'blacklistReason', key: 'blacklistReason', width: 160 },
  { title: t('added_at'), dataIndex: 'blacklistTime', key: 'blacklistTime', width: 120 },
  { title: t('operator'), dataIndex: 'operator', key: 'operator', width: 90 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
]
