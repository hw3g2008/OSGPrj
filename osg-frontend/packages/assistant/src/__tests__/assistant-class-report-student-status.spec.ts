import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const modalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/class-records/AssistantClassReportFlowModal.vue'),
  'utf-8',
)

describe('assistant 申报弹窗：学员账号状态防呆', () => {
  it('studentOptions 类型扩展 accountStatus / disabled 字段', () => {
    expect(modalSource).toContain('accountStatus?: string')
    expect(modalSource).toContain('disabled?: boolean')
  })

  it('loadStudents 按 accountStatus=1/3 标记 disabled + 状态后缀', () => {
    expect(modalSource).toContain("s.accountStatus === '1'")
    expect(modalSource).toContain("s.accountStatus === '3'")
    expect(modalSource).toContain('（冻结，不可申报）')
    expect(modalSource).toContain('（已退费，不可申报）')
    expect(modalSource).toContain('disabled: blocked')
  })
})
