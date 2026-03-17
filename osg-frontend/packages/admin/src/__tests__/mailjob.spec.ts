import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mailjobViewPath = path.resolve(__dirname, '../views/profile/mailjob/index.vue')
const newMailJobModalPath = path.resolve(__dirname, '../views/profile/mailjob/components/NewMailJobModal.vue')
const mailjobApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/mailjob.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('邮件作业页面', () => {
  it('renders the mailjob page shell with two tabs, job stats, smtp server, and new-mailjob modal fields', () => {
    expect(fs.existsSync(mailjobViewPath)).toBe(true)
    expect(fs.existsSync(newMailJobModalPath)).toBe(true)
    expect(fs.existsSync(mailjobApiPath)).toBe(true)

    const pageSource = readSource(mailjobViewPath)
    const modalSource = readSource(newMailJobModalPath)

    expect(pageSource).toContain('邮件作业')
    expect(pageSource).toContain('批量邮件发送管理')
    expect(pageSource).toContain('Job List')
    expect(pageSource).toContain('SMTP Server')
    expect(pageSource).toContain('Total')
    expect(pageSource).toContain('Pending')
    expect(pageSource).toContain('Success')
    expect(pageSource).toContain('Fail')
    expect(pageSource).toContain('Server Name')
    expect(pageSource).toContain('Host')
    expect(pageSource).toContain('Username')
    expect(modalSource).toContain('任务标题')
    expect(modalSource).toContain('收件人')
    expect(modalSource).toContain('邮件主题')
    expect(modalSource).toContain('邮件内容')
    expect(modalSource).toContain('SMTP服务器')
  })

  it('wires the mailjob page to the real mailjob APIs instead of placeholders', () => {
    const pageSource = readSource(mailjobViewPath)
    const apiSource = readSource(mailjobApiPath)

    expect(apiSource).toContain('getMailJobList(')
    expect(apiSource).toContain('createMailJob(')
    expect(pageSource).toContain('getMailJobList(')
    expect(pageSource).toContain('createMailJob(')
    expect(pageSource).toContain('<NewMailJobModal')
    expect(pageSource).not.toContain('邮件作业开发中')
  })
})
