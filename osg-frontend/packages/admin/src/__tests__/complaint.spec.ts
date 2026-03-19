import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const complaintViewPath = path.resolve(__dirname, '../views/profile/complaints/index.vue')
const complaintApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/complaint.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('投诉建议页面', () => {
  it('renders the complaints page shell with complaint or suggestion types and status actions', () => {
    expect(fs.existsSync(complaintViewPath)).toBe(true)
    expect(fs.existsSync(complaintApiPath)).toBe(true)

    const pageSource = readSource(complaintViewPath)

    expect(pageSource).toContain('投诉建议')
    expect(pageSource).toContain('处理学员提交的投诉和建议')
    expect(pageSource).toContain('投诉')
    expect(pageSource).toContain('建议')
    expect(pageSource).toContain('待处理')
    expect(pageSource).toContain('处理中')
    expect(pageSource).toContain('已完成')
    expect(pageSource).toContain('学员')
    expect(pageSource).toContain('标题')
  })

  it('wires the complaints page to the real complaint APIs instead of placeholders', () => {
    const pageSource = readSource(complaintViewPath)
    const apiSource = readSource(complaintApiPath)

    expect(apiSource).toContain('getComplaintList(')
    expect(apiSource).toContain('updateComplaintStatus(')
    expect(pageSource).toContain('getComplaintList(')
    expect(pageSource).toContain('updateComplaintStatus(')
    expect(pageSource).not.toContain('投诉建议开发中')
  })
})
