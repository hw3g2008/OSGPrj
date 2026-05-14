import { i18n } from '@osg/shared'

const t = (key: string) => i18n.global.t(key)

export const contractColumns = [
  { title: t('contract_number'), dataIndex: 'contractNo', key: 'contractNo', width: 140 },
  { title: t('student_id'), dataIndex: 'studentId', key: 'studentId', width: 100 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('head_teacher'), dataIndex: 'leadMentorName', key: 'leadMentorName', width: 100 },
  { title: t('contract_type'), dataIndex: 'contractType', key: 'contractType', width: 90, align: 'center' as const },
  { title: t('amount'), dataIndex: 'contractAmount', key: 'contractAmount', width: 140, align: 'right' as const },
  { title: t('class_hours'), dataIndex: 'totalHours', key: 'totalHours', width: 120 },
  { title: t('validity_period'), dataIndex: 'period', key: 'period', width: 200 },
  { title: t('renewal_reason'), dataIndex: 'renewalReason', key: 'renewalReason', width: 120 },
  { title: t('status'), dataIndex: 'contractStatus', key: 'contractStatus', width: 100, align: 'center' as const },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]
