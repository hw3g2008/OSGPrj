import { i18n } from '@osg/shared'

const t = (key: string) => i18n.global.t(key)

export const staffColumns = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 },
  { title: t('english_name'), dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { title: t('contact_info'), dataIndex: 'contact', key: 'contact', width: 160 },
  { title: t('type'), dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: t('major_focus'), dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { title: t('sub_focus'), dataIndex: 'subDirection', key: 'subDirection', width: 110, ellipsis: true },
  { title: t('region_3'), dataIndex: 'region', key: 'region', width: 130, ellipsis: true },
  { title: t('company_2'), dataIndex: 'companies', key: 'companies', width: 160 },
  { title: t('hourly_rate'), dataIndex: 'hourlyRate', key: 'hourlyRate', width: 80, align: 'center' as const },
  { title: t('student_count'), dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'center' as const },
  { title: t('account_status_2'), dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]

/** 超管可见的列（含评级列，按评级降序排序） */
export const staffColumnsWithRating = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 },
  { title: t('english_name'), dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { title: t('contact_info'), dataIndex: 'contact', key: 'contact', width: 160 },
  { title: t('type'), dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: t('major_focus'), dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { title: t('sub_focus'), dataIndex: 'subDirection', key: 'subDirection', width: 110, ellipsis: true },
  { title: t('region_3'), dataIndex: 'region', key: 'region', width: 130, ellipsis: true },
  { title: t('company_2'), dataIndex: 'companies', key: 'companies', width: 160 },
  { title: t('rating'), dataIndex: 'rating', key: 'rating', width: 80, align: 'center' as const },
  { title: t('hourly_rate'), dataIndex: 'hourlyRate', key: 'hourlyRate', width: 80, align: 'center' as const },
  { title: t('student_count'), dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'center' as const },
  { title: t('account_status_2'), dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]

export const staffBlacklistColumns = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 },
  { title: t('english_name'), dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { title: t('email'), dataIndex: 'email', key: 'email', width: 180 },
  { title: t('type'), dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: t('major_focus'), dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { title: t('blacklist_reason'), dataIndex: 'blacklistReason', key: 'blacklistReason', width: 160, ellipsis: true },
  { title: t('added_at'), dataIndex: 'blacklistTime', key: 'blacklistTime', width: 120 },
  { title: t('operator'), dataIndex: 'operator', key: 'operator', width: 90 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]
