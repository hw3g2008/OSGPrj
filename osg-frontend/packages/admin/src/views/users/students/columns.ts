export interface StudentColumn {
  key: string
  label: string
}

export const studentColumns: StudentColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'englishName', label: '英文姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'leadMentor', label: '班主任' },
  { key: 'school', label: '学校' },
  { key: 'major', label: '主攻方向' },
  { key: 'positions', label: '投递岗位' },
  { key: 'totalHours', label: '总课时' },
  { key: 'positionCoaching', label: '岗位辅导' },
  { key: 'basicCourse', label: '基础课' },
  { key: 'mockInterview', label: '模拟应聘' },
  { key: 'remainingHours', label: '剩余课时' },
  { key: 'reminder', label: '提醒' },
  { key: 'accountStatus', label: '账号状态' },
  { key: 'actions', label: '操作' }
]
