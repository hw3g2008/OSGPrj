import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const prototypeSource = fs.readFileSync(
  path.resolve(__dirname, '../../../../../osg-spec-docs/source/prototype/admin.html'),
  'utf-8'
)

describe('prototype students page structure', () => {
  it('has the students page section with correct id and header', () => {
    expect(prototypeSource).toContain('id="page-students"')
    expect(prototypeSource).toContain('学员列表')
    expect(prototypeSource).toContain('Student List')
    expect(prototypeSource).toContain('新增学员')
  })

  it('includes the pending review reminder banner', () => {
    expect(prototypeSource).toContain('信息变更待审核')
    expect(prototypeSource).toContain('立即查看')
    expect(prototypeSource).toContain('mdi-bell-ring')
  })

  it('has tab switching between normal list and blacklist', () => {
    expect(prototypeSource).toContain('正常列表')
    expect(prototypeSource).toContain('黑名单')
    expect(prototypeSource).toContain('switchStudentListTab')
  })

  it('includes filter controls for searching and filtering students', () => {
    expect(prototypeSource).toContain('搜索姓名')
    expect(prototypeSource).toContain('班主任')
    expect(prototypeSource).toContain('毕业年份')
    expect(prototypeSource).toContain('主攻方向')
    expect(prototypeSource).toContain('账号状态')
  })

  it('has the main direction options in filter select', () => {
    expect(prototypeSource).toContain('金融 Finance')
    expect(prototypeSource).toContain('咨询 Consulting')
    expect(prototypeSource).toContain('科技 Tech')
    expect(prototypeSource).toContain('量化 Quant')
  })

  it('includes the student table with key columns', () => {
    expect(prototypeSource).toContain('学员')
    expect(prototypeSource).toContain('岗位辅导')
    expect(prototypeSource).toContain('基础课')
    expect(prototypeSource).toContain('模拟应聘')
    expect(prototypeSource).toContain('剩余课时')
  })

  it('has action buttons for student rows', () => {
    expect(prototypeSource).toContain('详情')
    expect(prototypeSource).toContain('编辑')
  })

  it('includes the add student modal', () => {
    expect(prototypeSource).toContain('modal-add-student')
    expect(prototypeSource).toContain('openModal')
  })

  it('has student detail modal references', () => {
    expect(prototypeSource).toContain('modal-student-detail')
  })

  it('includes pagination or list summary elements', () => {
    expect(prototypeSource).toContain('page-sub')
    expect(prototypeSource).toContain('管理学员信息')
  })

  it('has proper page structure with header and content areas', () => {
    expect(prototypeSource).toContain('page-header')
    expect(prototypeSource).toContain('page-title')
    expect(prototypeSource).toContain('page-title-en')
  })

  it('includes project time filter options', () => {
    expect(prototypeSource).toContain('项目时间')
  })

  it('has the student management subtitle describing the page purpose', () => {
    expect(prototypeSource).toContain('管理学员信息、合同信息，支持各端查看和维护学员数据')
  })
})
