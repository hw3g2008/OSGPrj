import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indexSource = fs.readFileSync(
  path.resolve(__dirname, '../views/teaching/class-records/index.vue'),
  'utf-8',
)

const flowModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/teaching/class-records/LeadMentorClassReportFlowModal.vue'),
  'utf-8',
)

describe('lead-mentor 申报弹窗：学员账号状态防呆', () => {
  it('ReportStudentOption 类型扩展 accountStatus / disabled 字段', () => {
    expect(indexSource).toContain('accountStatus?: string')
    expect(indexSource).toContain('disabled?: boolean')
    expect(flowModalSource).toContain('accountStatus?: string')
    expect(flowModalSource).toContain('disabled?: boolean')
  })

  it('loadReportStudents map 时按 accountStatus 标记 disabled + 状态后缀', () => {
    expect(indexSource).toContain("student.accountStatus === '1'")
    expect(indexSource).toContain("student.accountStatus === '3'")
    expect(indexSource).toContain('（冻结，不可申报）')
    expect(indexSource).toContain('（已退费，不可申报）')
    expect(indexSource).toContain('disabled: blocked')
  })

  it('原生 select option 透传 disabled 属性', () => {
    expect(flowModalSource).toContain(':disabled="student.disabled"')
  })
})
