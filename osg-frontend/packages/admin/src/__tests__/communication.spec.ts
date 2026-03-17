import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const communicationViewPath = path.resolve(__dirname, '../views/teaching/communication/index.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('沟通记录页面', () => {
  it('renders the communication page shell with record and networking tabs', () => {
    expect(fs.existsSync(communicationViewPath)).toBe(true)

    const source = readSource(communicationViewPath)
    expect(source).toContain('人际关系沟通记录')
    expect(source).toContain('沟通记录')
    expect(source).toContain('Networking')
    expect(source).toContain('待跟进')
    expect(source).toContain('已完成')
    expect(source).toContain('联系人公司')
    expect(source).toContain('联系人职位')
  })

  it('wires the communication page to the real communication API instead of placeholders', () => {
    const source = readSource(communicationViewPath)

    expect(source).toContain('getCommunicationList(')
    expect(source).toContain('activeTab')
    expect(source).not.toContain('沟通记录页面开发中')
  })
})
