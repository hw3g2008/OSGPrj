export interface ContractColumn {
  key: string
  label: string
}

export const contractColumns: ContractColumn[] = [
  { key: 'contractInfo', label: '合同信息' },
  { key: 'studentInfo', label: '学员信息' },
  { key: 'amountHours', label: '金额 / 课时' },
  { key: 'period', label: '有效期' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' }
]
