import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const classRecordsViewPath = path.resolve(__dirname, '../views/teaching/class-records/index.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('课程记录页面', () => {
  it('renders the class-records page shell with process banner, stats cards, and rating display', () => {
    expect(fs.existsSync(classRecordsViewPath)).toBe(true)

    const source = readSource(classRecordsViewPath)
    expect(source).toContain('课程记录')
    expect(source).toContain('流程说明')
    expect(source).toContain('总记录数')
    expect(source).toContain('待审核')
    expect(source).toContain('已通过')
    expect(source).toContain('已驳回')
    expect(source).toContain('待结算金额')
    expect(source).toContain('学员评价')
  })

  it('wires the page to the real class-record list and stats APIs instead of placeholders', () => {
    const source = readSource(classRecordsViewPath)

    expect(source).toContain('getClassRecordList(')
    expect(source).toContain('getClassRecordStats(')
    expect(source).toContain('flow-banner')
    expect(source).toContain('statCards')
    expect(source).not.toContain('课程记录页面开发中')
  })
})
