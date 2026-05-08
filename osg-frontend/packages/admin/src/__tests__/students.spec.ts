import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const studentsViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/students/index.vue'),
  'utf-8'
)

const studentDetailModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/students/components/StudentDetailModal.vue'),
  'utf-8'
)

const addStudentModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/students/components/AddStudentModal.vue'),
  'utf-8'
)

const filterBarSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/students/components/FilterBar.vue'),
  'utf-8'
)

const actionDropdownSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/students/components/ActionDropdown.vue'),
  'utf-8'
)

const editStudentModalPath = path.resolve(
  __dirname,
  '../views/users/students/components/EditStudentModal.vue'
)

describe('学员详情入口与编辑联动', () => {
  it('keeps the students list shell aligned with the prototype reminder banner and inline row actions', () => {
    expect(studentsViewSource).toContain('students-banner__icon')
    expect(studentsViewSource).toContain('students-banner__cta')
    expect(studentsViewSource).toContain('action-cell')
    expect(studentsViewSource).toContain('btn-text-sm')
    expect(studentsViewSource).toContain('详情')
    expect(studentsViewSource).toContain('编辑')
    expect(studentsViewSource).toContain('<ActionDropdown')
  })

  it('keeps the entire students filter bar in one prototype-like row with reset and export inline', () => {
    expect(filterBarSource).toContain('filter-bar')
    expect(filterBarSource).not.toContain('students-filter-bar__action-link')
    expect(filterBarSource).toContain('placeholder="账号状态"')
    expect(filterBarSource).toContain('导出')
    expect(filterBarSource).toContain('重置')
    expect(filterBarSource).toContain("defineEmits<")
    expect(filterBarSource).toContain('export: []')
    expect(studentsViewSource).toContain('@export="handleExport"')
  })

  it('uses a viewport-friendly fixed table rhythm instead of forcing a horizontal wide table', () => {
    expect(studentsViewSource).toContain('permission-table')
    expect(studentsViewSource).not.toContain('min-width: 1540px')
    expect(filterBarSource).toContain('filter-bar')
    expect(actionDropdownSource).toContain('更多')
  })

  it('keeps the student table in a dense single-screen layout instead of clipping the right-side columns', () => {
    expect(studentsViewSource).toContain("{ key: 'blacklist', label: '黑名单' }")
    expect(studentsViewSource).toContain('font-size: 12px')
    expect(actionDropdownSource).not.toContain("{ key: 'detail', label: '详情' }")
    expect(actionDropdownSource).not.toContain("{ key: 'edit', label: '编辑' }")
  })

  it('renders the coaching count columns as inline number-plus-unit text instead of stacked metric pills', () => {
    expect(studentsViewSource).not.toContain('students-count__value')
    expect(studentsViewSource).not.toContain('students-count__unit')
    expect(studentsViewSource).not.toContain('.students-count__value')
    expect(studentsViewSource).not.toContain('.students-count__unit')
    expect(studentsViewSource).toContain('record.jobCoachingCount')
    expect(studentsViewSource).toContain('record.basicCourseCount')
    expect(studentsViewSource).toContain('record.mockInterviewCount')
  })

  it('avoids duplicate reminder chrome by keeping the normal tab clean and rendering pending review only once', () => {
    expect(studentsViewSource).toContain("v-if=\"tab.key === 'blacklist'\"")
    expect(studentsViewSource).not.toContain('students-review-badge')
  })

  it('wires the list detail action to the real student detail modal instead of placeholder modal info', () => {
    expect(studentsViewSource).toContain("import StudentDetailModal from './components/StudentDetailModal.vue'")
    expect(studentsViewSource).toContain('<StudentDetailModal')
    expect(studentsViewSource).toContain('detailStudentVisible')
    expect(studentsViewSource).toContain('openStudentDetail')
    expect(studentsViewSource).not.toContain("title: '查看学员详情'")
  })

  it('supports moving from the detail modal into the edit student modal shell defined by the PRD', () => {
    expect(studentsViewSource).toContain("import EditStudentModal from './components/EditStudentModal.vue'")
    expect(studentsViewSource).toContain('<EditStudentModal')
    expect(studentsViewSource).toContain('handleDetailEditRequest')
    expect(studentsViewSource).toContain("@request-edit=\"handleDetailEditRequest\"")

    expect(fs.existsSync(editStudentModalPath)).toBe(true)
    const editStudentModalSource = fs.readFileSync(editStudentModalPath, 'utf-8')
    expect(editStudentModalSource).toContain('编辑学员')
    expect(editStudentModalSource).toContain('核心信息')
    expect(editStudentModalSource).toContain('导师配置')
    expect(editStudentModalSource).toContain('学业信息')
    expect(editStudentModalSource).toContain('求职方向')
  })

  it('loads real change-review data and refreshes the list banner after approve or reject', () => {
    expect(studentDetailModalSource).toContain('getStudentChangeRequestList')
    expect(studentDetailModalSource).not.toContain('今天 09:30')
    expect(studentDetailModalSource).not.toContain('Hedge Fund')

    expect(studentsViewSource).toContain('@review-updated="handleDetailReviewUpdated"')
    expect(studentsViewSource).toContain('handleDetailReviewUpdated')
  })

  it('keeps the add-student modal step flow and contract step fields wired in the component source', () => {
    expect(addStudentModalSource).toContain('Step 1 · 基本信息')
    expect(addStudentModalSource).toContain('Step 2 · 合同信息')
    expect(addStudentModalSource).toContain('下一步')
    expect(addStudentModalSource).toContain('返回上一步')
    expect(addStudentModalSource).toContain('合同金额')
    expect(addStudentModalSource).toContain('学习时长（小时）')
    expect(addStudentModalSource).toContain('开始日期')
    expect(addStudentModalSource).toContain('结束日期')
  })

  it('wires the direction multiselect via osg_major_direction dict and keeps searchable mentor selectors in add-student modal', () => {
    expect(addStudentModalSource).toContain("getAdminDictOptions('osg_major_direction')")
    expect(addStudentModalSource).toContain('mode="multiple"')
    expect(addStudentModalSource).toContain('输入姓名搜索班主任')
    expect(addStudentModalSource).toContain('输入姓名搜索助教')
  })

  it('exposes the end_contract status action wired through the dropdown, type chain and modal copy', () => {
    // 操作下拉新菜单项
    expect(studentsViewSource).toContain('<a-menu-item key="end_contract">结束合同</a-menu-item>')
    // 类型链路
    expect(studentsViewSource).toContain("'refund' | 'end_contract'")
    expect(studentsViewSource).toContain("'freeze' | 'restore' | 'refund' | 'end_contract'")
    // handleStudentAction 走 status modal 分支
    expect(studentsViewSource).toContain("action === 'end_contract'")

    // StatusChangeModal 接受 end_contract 并渲染对应文案
    const statusModalSource = fs.readFileSync(
      path.resolve(__dirname, '../views/users/students/components/StatusChangeModal.vue'),
      'utf-8'
    )
    expect(statusModalSource).toContain("'freeze' | 'refund' | 'restore' | 'end_contract'")
    expect(statusModalSource).toContain("props.action === 'end_contract'") // targetStatusLabel + description + icon + reasonOptions
    expect(statusModalSource).toContain("已结束")
    expect(statusModalSource).toContain("结束合同后，学员仍可登录")
  })
})
