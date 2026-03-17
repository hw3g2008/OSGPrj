import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const noticeViewPath = path.resolve(__dirname, '../views/profile/notice/index.vue')
const sendNoticeModalPath = path.resolve(__dirname, '../views/profile/notice/components/SendNoticeModal.vue')
const noticeApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/notice.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('通知管理页面', () => {
  it('renders the notice page shell with send button, receiver metadata, and send-notice modal fields', () => {
    expect(fs.existsSync(noticeViewPath)).toBe(true)
    expect(fs.existsSync(sendNoticeModalPath)).toBe(true)
    expect(fs.existsSync(noticeApiPath)).toBe(true)

    const pageSource = readSource(noticeViewPath)
    const modalSource = readSource(sendNoticeModalPath)

    expect(pageSource).toContain('通知管理')
    expect(pageSource).toContain('向学员和导师发送通知')
    expect(pageSource).toContain('发送通知')
    expect(pageSource).toContain('接收人')
    expect(pageSource).toContain('类型')
    expect(pageSource).toContain('标题')
    expect(pageSource).toContain('时间')
    expect(modalSource).toContain('接收人类型')
    expect(modalSource).toContain('全部导师')
    expect(modalSource).toContain('指定导师')
    expect(modalSource).toContain('全部学员')
    expect(modalSource).toContain('指定学员')
    expect(modalSource).toContain('标题')
    expect(modalSource).toContain('内容')
  })

  it('wires the notice page to the real notice APIs instead of placeholders', () => {
    const pageSource = readSource(noticeViewPath)
    const apiSource = readSource(noticeApiPath)

    expect(apiSource).toContain('getNoticeList(')
    expect(apiSource).toContain('sendNotice(')
    expect(pageSource).toContain('getNoticeList(')
    expect(pageSource).toContain('sendNotice(')
    expect(pageSource).toContain('<SendNoticeModal')
    expect(pageSource).not.toContain('通知管理开发中')
  })
})
