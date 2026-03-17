import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const logsViewPath = path.resolve(__dirname, '../views/profile/logs/index.vue')
const logApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/log.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('操作日志页面', () => {
  it('renders the logs page shell with audit columns and export action', () => {
    expect(fs.existsSync(logsViewPath)).toBe(true)
    expect(fs.existsSync(logApiPath)).toBe(true)

    const pageSource = readSource(logsViewPath)

    expect(pageSource).toContain('操作日志')
    expect(pageSource).toContain('查看系统操作记录')
    expect(pageSource).toContain('导出日志')
    expect(pageSource).toContain('时间')
    expect(pageSource).toContain('操作人')
    expect(pageSource).toContain('角色')
    expect(pageSource).toContain('操作类型')
    expect(pageSource).toContain('内容')
    expect(pageSource).toContain('IP')
  })

  it('wires the logs page to the real log APIs instead of placeholders', () => {
    const pageSource = readSource(logsViewPath)
    const apiSource = readSource(logApiPath)

    expect(apiSource).toContain('getLogList(')
    expect(apiSource).toContain('exportLogs(')
    expect(pageSource).toContain('getLogList(')
    expect(pageSource).toContain('exportLogs(')
    expect(pageSource).not.toContain('操作日志开发中')
  })
})
