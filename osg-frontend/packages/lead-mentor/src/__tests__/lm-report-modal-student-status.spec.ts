import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indexSource = fs.readFileSync(
  path.resolve(__dirname, '../views/teaching/class-records/index.vue'),
  'utf-8',
)

// shared 申报弹窗接口（StepBasicInfo）实际承载 disabled 透传：
// LeadMentorClassReportFlowModal 重构为 shared ClassReportFlowModal 的薄封装后，
// 类型扩展和 :disabled 绑定都下沉到 shared 包，本端只保留"父组件打 disabled 标记"测试。
const stepBasicInfoSource = fs.readFileSync(
  path.resolve(__dirname, '../../../shared/src/components/ClassReportFlowModal/StepBasicInfo.vue'),
  'utf-8',
)

describe('lead-mentor 申报弹窗：学员账号状态防呆', () => {
  it('ReportStudentOption 类型扩展 accountStatus / disabled 字段（lead-mentor 父组件层）', () => {
    expect(indexSource).toContain('accountStatus?: string')
    expect(indexSource).toContain('disabled?: boolean')
  })

  it('loadReportStudents map 时按 accountStatus 标记 disabled + 状态后缀', () => {
    expect(indexSource).toContain("student.accountStatus === '1'")
    expect(indexSource).toContain("student.accountStatus === '3'")
    expect(indexSource).toContain('（冻结，不可申报）')
    expect(indexSource).toContain('（已退费，不可申报）')
    expect(indexSource).toContain('disabled: blocked')
  })

  it('shared StepBasicInfo 学员下拉透传 disabled 属性', () => {
    // shared StepBasicInfo 把 props.students[].disabled 写入 a-select-option 选项
    expect(stepBasicInfoSource).toContain('disabled: s.disabled')
  })
})
