export interface ContractColumn {
  key: string
  label: string
}

export const contractColumns: ContractColumn[] = [
  { key: 'contractNo', label: '合同编号' },
  { key: 'student', label: '学员' },
  { key: 'leadMentor', label: '班主任' },
  { key: 'contractType', label: '合同类型' },
  { key: 'amount', label: '金额' },
  { key: 'hours', label: '课时' },
  { key: 'period', label: '有效期' },
  { key: 'renewalReason', label: '续签原因' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' }
]
