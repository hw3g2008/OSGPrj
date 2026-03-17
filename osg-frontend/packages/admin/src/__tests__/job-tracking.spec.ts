import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const jobTrackingViewPath = path.resolve(__dirname, '../views/career/job-tracking/index.vue')
const jobTrackingApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/jobTracking.ts')
const mainLayoutPath = path.resolve(__dirname, '../layouts/MainLayout.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('岗位追踪页面', () => {
  it('renders the job-tracking shell with five stats, filters, and update form fields', () => {
    expect(fs.existsSync(jobTrackingViewPath)).toBe(true)
    expect(fs.existsSync(jobTrackingApiPath)).toBe(true)

    const pageSource = readSource(jobTrackingViewPath)

    expect(pageSource).toContain('所有学员的岗位追踪')
    expect(pageSource).toContain('全部学员')
    expect(pageSource).toContain('追踪中')
    expect(pageSource).toContain('面试中')
    expect(pageSource).toContain('已获Offer')
    expect(pageSource).toContain('已拒绝')
    expect(pageSource).toContain('学员姓名')
    expect(pageSource).toContain('班主任')
    expect(pageSource).toContain('状态')
    expect(pageSource).toContain('公司')
    expect(pageSource).toContain('地点')
    expect(pageSource).toContain('面试阶段')
    expect(pageSource).toContain('意向导师')
    expect(pageSource).toContain('排除导师')
    expect(pageSource).toContain('备注')
  })

  it('wires the page to the real job-tracking API and menu entry instead of a placeholder', () => {
    const pageSource = readSource(jobTrackingViewPath)
    const apiSource = readSource(jobTrackingApiPath)
    const layoutSource = readSource(mainLayoutPath)

    expect(apiSource).toContain('getJobTrackingList(')
    expect(apiSource).toContain('updateJobTracking(')
    expect(pageSource).toContain('getJobTrackingList(')
    expect(pageSource).toContain('updateJobTracking(')
    expect(pageSource).toContain('await loadTrackingBoard()')
    expect(pageSource).not.toContain('岗位追踪开发中')
    expect(layoutSource).toContain("/career/job-tracking")
    expect(layoutSource).toContain('岗位追踪')
    expect(layoutSource).toContain('admin:job-tracking:list')
  })
})
