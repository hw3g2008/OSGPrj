import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const reportsViewPath = path.resolve(__dirname, '../views/teaching/reports/index.vue')
const reviewDetailModalPath = path.resolve(__dirname, '../views/teaching/reports/components/ReviewDetailModal.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('课时审核页面与审核弹窗', () => {
  it('renders the reports page shell with overtime banner, tab strip, and overdue highlight rules', () => {
    expect(fs.existsSync(reportsViewPath)).toBe(true)
    const reportsViewSource = readSource(reportsViewPath)

    expect(reportsViewSource).toContain('课时审核')
    expect(reportsViewSource).toContain('超时提醒')
    expect(reportsViewSource).toContain('reportTabs')
    expect(reportsViewSource).toContain('activeTab')
    expect(reportsViewSource).toContain('超过30天')
    expect(reportsViewSource).toContain('report-row--overdue')
  })

  it('wires list, batch actions, and detail review modal to the real report API instead of placeholders', () => {
    const reportsViewSource = readSource(reportsViewPath)

    expect(reportsViewSource).toContain("import ReviewDetailModal from './components/ReviewDetailModal.vue'")
    expect(reportsViewSource).toContain('getReportList(')
    expect(reportsViewSource).toContain('approveReport(')
    expect(reportsViewSource).toContain('rejectReport(')
    expect(reportsViewSource).toContain('batchApproveReport(')
    expect(reportsViewSource).toContain('batchRejectReport(')
    expect(reportsViewSource).toContain('<ReviewDetailModal')
    expect(reportsViewSource).toContain('selectedRowKeys')
    expect(reportsViewSource).toContain('reviewDetailVisible')
    expect(reportsViewSource).not.toContain('课时审核页面开发中')
  })

  it('defines a dedicated review detail modal with remark input and approve/reject actions', () => {
    expect(fs.existsSync(reviewDetailModalPath)).toBe(true)

    const reviewDetailModalSource = readSource(reviewDetailModalPath)
    expect(reviewDetailModalSource).toContain('课程反馈详情')
    expect(reviewDetailModalSource).toContain('审核备注')
    expect(reviewDetailModalSource).toContain('驳回')
    expect(reviewDetailModalSource).toContain('通过')
    expect(reviewDetailModalSource).toContain('feedbackContent')
  })
})
