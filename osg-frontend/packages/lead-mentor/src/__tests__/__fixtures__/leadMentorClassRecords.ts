// Test fixture: LM class records list/stats payloads.
// Replaces the previously hard-coded `initialMineRows` / `initialManagedRows`
// constants so spec files that exercise row-dependent UI (action triggers,
// detail modals, reject modal) keep working after the view migrated to real
// `getLeadMentorClassRecordList` / `getLeadMentorClassRecordStats` API calls.

import type {
  LeadMentorClassRecordRow,
  LeadMentorClassRecordStats,
} from '@osg/shared/api'

const baseRow = (
  recordId: number,
  overrides: Partial<LeadMentorClassRecordRow>,
): LeadMentorClassRecordRow => ({
  recordId,
  studentId: 12888,
  studentName: '张三',
  mentorId: 7777,
  mentorName: 'Jess (Lead Mentor)',
  courseType: 'job_coaching',
  courseContent: 'resume_revision',
  classStatus: 'resume_revision',
  reporterRole: 'clerk',
  classDate: '2026-01-20',
  durationHours: 1,
  courseFee: '300',
  status: 'pending',
  feedbackContent: '完成简历首版迭代...',
  ...overrides,
})

export const mineRowFixtures: LeadMentorClassRecordRow[] = [
  baseRow(231780, {
    studentName: '张三',
    studentId: 12888,
    classStatus: 'resume_revision',
    courseType: 'job_coaching',
    classDate: '2026-01-20',
    status: 'pending',
  }),
  baseRow(231779, {
    studentName: '李四',
    studentId: 12890,
    classStatus: 'mock_interview',
    courseType: 'mock_practice',
    classDate: '2026-01-18',
    status: 'approved',
    studentRating: '5.0',
  }),
  baseRow(231778, {
    studentName: '钱七',
    studentId: 12903,
    classStatus: 'case_prep',
    courseType: 'job_coaching',
    classDate: '2026-01-15',
    status: 'rejected',
  }),
  baseRow(231777, {
    studentName: '赵六',
    studentId: 12902,
    classStatus: 'networking_midterm',
    courseType: 'mock_practice',
    classDate: '2026-01-12',
    status: 'approved',
  }),
  baseRow(231776, {
    studentName: '孙七',
    studentId: 12903,
    classStatus: 'behavioral',
    courseType: 'job_coaching',
    classDate: '2026-01-10',
    status: 'approved',
  }),
]

export const managedRowFixtures: LeadMentorClassRecordRow[] = [
  baseRow(231785, {
    studentName: '张三',
    studentId: 12888,
    mentorId: 8001,
    mentorName: 'Jerry Li',
    classStatus: 'resume_revision',
    courseType: 'job_coaching',
    classDate: '2026-01-15',
    status: 'approved',
    studentRating: '5.0',
  }),
  baseRow(231775, {
    studentName: '李四',
    studentId: 12890,
    mentorId: 8002,
    mentorName: 'Sarah Wang',
    classStatus: 'networking_midterm',
    courseType: 'mock_practice',
    classDate: '2026-01-12',
    status: 'approved',
    studentRating: '4.5',
  }),
  baseRow(231771, {
    studentName: '王五',
    studentId: 12901,
    mentorId: 8003,
    mentorName: 'Mike Chen',
    classStatus: 'behavioral',
    courseType: 'job_coaching',
    classDate: '2026-01-08',
    status: 'rejected',
  }),
]

export const statsFixture: LeadMentorClassRecordStats = {
  totalCount: mineRowFixtures.length,
  pendingCount: 1,
  approvedCount: 1,
  rejectedCount: 1,
  pendingSettlementAmount: '300.0',
  flowSteps: [
    '学员申请岗位/模拟应聘',
    '班主任分配导师',
    '导师上课并申报记录',
    '后台审核',
    '结算中心转账',
  ],
  mineCount: mineRowFixtures.length,
  managedCount: managedRowFixtures.length,
}

/**
 * Vitest-compatible mock implementations for the LM class-records API.
 * Usage in a spec:
 *
 *   vi.mock('@osg/shared/api', async (importOriginal) => {
 *     const original = await importOriginal()
 *     const { mockLeadMentorClassRecordsApi } = await import(
 *       '../__tests__/__fixtures__/leadMentorClassRecords'
 *     )
 *     return { ...original, ...mockLeadMentorClassRecordsApi() }
 *   })
 */
export function mockLeadMentorClassRecordsApi() {
  return {
    getLeadMentorClassRecordList: vi.fn(async (filters: { scope?: string } = {}) => ({
      rows: filters.scope === 'managed' ? managedRowFixtures : mineRowFixtures,
      total: filters.scope === 'managed' ? managedRowFixtures.length : mineRowFixtures.length,
    })),
    getLeadMentorClassRecordStats: vi.fn(async () => statsFixture),
  }
}
