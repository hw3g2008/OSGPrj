import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const jobOverviewViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/career/job-overview/index.vue'),
  'utf-8'
)

const assignMentorModalPath = path.resolve(
  __dirname,
  '../views/career/job-overview/components/AssignMentorModal.vue'
)

describe('学员求职总览导师分配与阶段确认', () => {
  it('wires the pending-table assign action to the real mentor-assignment modal instead of a placeholder message', () => {
    expect(jobOverviewViewSource).toContain("import AssignMentorModal from './components/AssignMentorModal.vue'")
    expect(jobOverviewViewSource).toContain('<AssignMentorModal')
    expect(jobOverviewViewSource).toContain('assignMentorVisible')
    expect(jobOverviewViewSource).toContain('selectedAssignmentRow')
    expect(jobOverviewViewSource).toContain('handleAssignMentorSubmit')
    expect(jobOverviewViewSource).toContain('assignMentors(')
    expect(jobOverviewViewSource).not.toContain('预留分配导师入口')
  })

  it('turns the stage confirmation button into a real API action and refresh flow', () => {
    expect(jobOverviewViewSource).toContain('handleStageConfirm')
    expect(jobOverviewViewSource).toContain('updateJobOverviewStage(')
    expect(jobOverviewViewSource).toContain('await loadDashboard()')
    expect(jobOverviewViewSource).not.toContain('阶段确认按钮已就位')
  })

  it('defines a dedicated mentor-assignment modal with preferred mentor marks, checkbox selection, and notes', () => {
    expect(fs.existsSync(assignMentorModalPath)).toBe(true)

    const assignMentorModalSource = fs.readFileSync(assignMentorModalPath, 'utf-8')
    expect(assignMentorModalSource).toContain('分配导师')
    expect(assignMentorModalSource).toContain('意向导师')
    expect(assignMentorModalSource).toContain('checkbox')
    expect(assignMentorModalSource).toContain('备注')
  })

  it('loads real mentor options and must not fabricate mentor ids in the admin page source', () => {
    expect(jobOverviewViewSource).toContain('getStaffList(')
    expect(jobOverviewViewSource).toContain("staffType: 'mentor'")
    expect(jobOverviewViewSource).not.toContain('buildMentorId(')
  })
})
