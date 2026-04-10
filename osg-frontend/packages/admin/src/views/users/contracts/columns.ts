export const contractColumns = [
  { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 140 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '班主任', dataIndex: 'leadMentorName', key: 'leadMentorName', width: 100 },
  { title: '合同类型', dataIndex: 'contractType', key: 'contractType', width: 90, align: 'center' as const },
  { title: '金额', dataIndex: 'contractAmount', key: 'contractAmount', width: 110, align: 'right' as const },
  { title: '课时', dataIndex: 'totalHours', key: 'totalHours', width: 120 },
  { title: '有效期', dataIndex: 'period', key: 'period', width: 200 },
  { title: '续签原因', dataIndex: 'renewalReason', key: 'renewalReason', width: 120 },
  { title: '状态', dataIndex: 'contractStatus', key: 'contractStatus', width: 100, align: 'center' as const },
  { title: '操作', dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]
