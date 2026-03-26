import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mockPracticeViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/career/mock-practice/index.vue'),
  'utf-8',
)

describe('模拟应聘管理导师分配数据源', () => {
  it('should not keep a static mentor catalog in the page source', () => {
    expect(mockPracticeViewSource).not.toContain('const mentorCatalog = [')
    expect(mockPracticeViewSource).not.toContain("mentorId: 9101")
    expect(mockPracticeViewSource).not.toContain("mentorId: 9102")
  })

  it('should load assignable mentor options from the real staff API instead of inline fixtures', () => {
    expect(mockPracticeViewSource).toContain('getStaffList(')
    expect(mockPracticeViewSource).toContain("staffType: 'mentor'")
  })
})
