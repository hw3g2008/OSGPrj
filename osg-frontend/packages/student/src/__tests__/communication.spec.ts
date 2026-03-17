import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const communicationSource = fs.readFileSync(
  path.resolve(__dirname, '../views/communication/index.vue'),
  'utf-8'
)
const netlogSource = fs.readFileSync(
  path.resolve(__dirname, '../views/netlog/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

describe('student communication story S-008 source contract', () => {
  it('keeps the communication records title, filters, and table headers from the prototype', () => {
    const expectedLabels = [
      '人际关系沟通记录',
      'Communication Records',
      '查看与导师/班主任的沟通历史记录',
      '搜索记录...',
      '沟通方式',
      '搜索',
      '记录人',
      '沟通时间',
      '沟通内容',
      '跟进事项',
      '详情'
    ]

    for (const label of expectedLabels) {
      expect(communicationSource).toContain(label)
    }

    expect(communicationSource).toContain('const communicationRecords')
  })

  it('keeps the networking log hero, table shell, and modal workflows from the prototype', () => {
    const expectedLabels = [
      '沟通记录',
      'Networking Log',
      '完成Network沟通后，请填写记录',
      '完成了一次沟通？',
      '记录你的Networking成果',
      '填写记录',
      '沟通记录 My Logs',
      '搜索公司/对方...',
      '级别',
      '公司',
      '对方',
      '时间',
      '查看',
      '沟通记录详情'
    ]

    for (const label of expectedLabels) {
      expect(netlogSource).toContain(label)
    }

    const triggerMatches = netlogSource.match(/const netlogActionTriggers = \[(.|\n)*?\]/)?.[0].match(/actionId:/g) ?? []

    expect(netlogSource).toContain('const netlogActionTriggers = [')
    expect(triggerMatches).toHaveLength(3)
  })

  it('registers dedicated routes for communication and netlog instead of shell placeholders', () => {
    expect(routerSource).toContain("path: 'communication'")
    expect(routerSource).toContain("path: 'netlog'")
    expect(routerSource).not.toContain("placeholderPage('communication'")
    expect(routerSource).not.toContain("placeholderPage('netlog'")
  })
})
