import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminRoot = path.resolve(__dirname, '../views/career')

const read = (relativePath: string) => fs.readFileSync(path.resolve(adminRoot, relativePath), 'utf-8')
const exists = (relativePath: string) => fs.existsSync(path.resolve(adminRoot, relativePath))

describe('career pages keep the prototype-first rewrite structure', () => {
  it('rewrites student positions into the compact prototype shell and audit table', () => {
    const source = read('student-positions/index.vue')

    expect(source).toContain('student-positions-shell')
    expect(source).toContain('student-positions-filterbar')
    expect(source).toContain('student-positions-datatable')
    expect(source).toContain('student-positions-footnote')
    expect(source).toContain("import ReviewPositionModal from './components/ReviewPositionModal.vue'")
    expect(source).toContain("import RejectPositionModal from './components/RejectPositionModal.vue'")
  })

  it('rewrites the student review and reject modals with the prototype section cards', () => {
    const reviewSource = read('student-positions/components/ReviewPositionModal.vue')
    const rejectSource = read('student-positions/components/RejectPositionModal.vue')

    expect(reviewSource).toContain('student-review-modal__hero')
    expect(reviewSource).toContain('student-review-modal__section-card')
    expect(reviewSource).toContain('student-review-modal__cycle-chip')
    expect(rejectSource).toContain('student-reject-modal__hero')
    expect(rejectSource).toContain('student-reject-modal__reason-grid')
  })

  it('rewrites job overview into the prototype analytics shell and keeps mentor assignment wiring', () => {
    const source = read('job-overview/index.vue')

    expect(source).toContain('job-overview-shell')
    expect(source).toContain('job-overview-summary-grid')
    expect(source).toContain('job-overview-funnel-card')
    expect(source).toContain('job-overview-hot-card')
    expect(source).toContain('job-overview-dataset-tabs')
    expect(source).toContain("import AssignMentorModal from './components/AssignMentorModal.vue'")
  })

  it('rewrites the job overview assign-mentor modal into the prototype mentor picker layout', () => {
    const source = read('job-overview/components/AssignMentorModal.vue')

    expect(source).toContain('job-overview-assign-modal__hero')
    expect(source).toContain('job-overview-assign-modal__filters')
    expect(source).toContain('job-overview-assign-modal__mentor-list')
    expect(source).toContain('job-overview-assign-modal__note-field')
  })

  it('rewrites mock practice into the prototype dispatch shell and mounts both assign and feedback modals', () => {
    const source = read('mock-practice/index.vue')

    expect(source).toContain('mock-practice-shell')
    expect(source).toContain('mock-practice-summary-grid')
    expect(source).toContain('mock-practice-dataset-tabs')
    expect(source).toContain("import AssignMockModal from './components/AssignMockModal.vue'")
    expect(source).toContain("import MockFeedbackModal from './components/MockFeedbackModal.vue'")
    expect(source).toContain('<MockFeedbackModal')
  })

  it('rewrites mock-practice modals to the prototype feedback and scheduling structure', () => {
    expect(exists('mock-practice/components/MockFeedbackModal.vue')).toBe(true)

    const assignSource = read('mock-practice/components/AssignMockModal.vue')
    const feedbackSource = read('mock-practice/components/MockFeedbackModal.vue')

    expect(assignSource).toContain('mock-practice-assign-modal__hero')
    expect(assignSource).toContain('mock-practice-assign-modal__schedule-grid')
    expect(assignSource).toContain('mock-practice-assign-modal__mentor-list')
    expect(feedbackSource).toContain('mock-practice-feedback-modal__hero')
    expect(feedbackSource).toContain('mock-practice-feedback-modal__summary-grid')
    expect(feedbackSource).toContain('feedbackRating')
  })
})
