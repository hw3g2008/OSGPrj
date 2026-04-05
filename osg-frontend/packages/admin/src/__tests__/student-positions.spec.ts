import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const studentPositionsViewPath = path.resolve(__dirname, '../views/career/student-positions/index.vue')
const reviewPositionModalPath = path.resolve(__dirname, '../views/career/student-positions/components/ReviewPositionModal.vue')
const rejectPositionModalPath = path.resolve(__dirname, '../views/career/student-positions/components/RejectPositionModal.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('学生自添岗位页面', () => {
  it('exposes a stable edit entry and matching review/reject modal surfaces', () => {
    const viewSource = readSource(studentPositionsViewPath)
    const reviewSource = readSource(reviewPositionModalPath)
    const rejectSource = readSource(rejectPositionModalPath)

    expect(viewSource).toContain('学生自添岗位编辑')
    expect(viewSource).toContain('拒绝岗位')
    expect(viewSource).toContain('data-surface-trigger="modal-edit-student-position"')
    expect(viewSource).toContain('data-field-name="状态"')
    expect(viewSource).toContain('data-field-name="类别"')
    expect(viewSource).toContain('data-field-name="辅导申请"')
    expect(viewSource).toContain('data-field-name="搜索框"')
    expect(reviewSource).toContain('<fieldset class="student-review-modal__field" data-field-name="岗位分类">')
    expect(reviewSource).toContain('<fieldset class="student-review-modal__chip-group" data-field-name="招聘周期">')
    expect(reviewSource).toContain('<fieldset class="student-review-modal__field" data-field-name="截止日期">')
    expect(reviewSource).toContain('data-field-name="大区"')
    expect(rejectSource).toContain('data-field-name="拒绝原因"')
    expect(rejectSource).toContain('data-field-name="补充说明"')
    expect(reviewSource).toContain('surface-id="modal-edit-student-position"')
    expect(reviewSource).toContain('data-surface-part="cancel-control"')
    expect(reviewSource).toContain('data-surface-part="confirm-control"')
    expect(reviewSource).toContain('data-surface-part="reject-control"')
    expect(reviewSource).toContain('拒绝岗位')
    expect(reviewSource).toContain('data-surface-trigger="modal-reject-position"')
    expect(rejectSource).toContain('surface-id="modal-reject-position"')
    expect(rejectSource).toContain('data-surface-part="cancel-control"')
    expect(rejectSource).toContain('data-surface-part="confirm-control"')
  })
})
