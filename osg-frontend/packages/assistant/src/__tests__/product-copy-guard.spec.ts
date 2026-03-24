import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const realPageFiles = [
  '../views/home/index.vue',
  '../views/students/index.vue',
  '../views/class-records/index.vue',
  '../views/career/positions/index.vue',
  '../views/career/job-overview/index.vue',
  '../views/career/mock-practice/index.vue',
  '../views/profile/index.vue',
  '../views/schedule/index.vue',
]

const placeholderFiles = [
  '../router/index.ts',
  '../views/placeholder/index.vue',
  '../views/_shared/AssistantPlaceholderShell.vue',
]

const realPageForbiddenMarkers = [
  '真实接口数据',
  '保留状态提醒',
  '不提供独立详情页',
  '记录骨架',
  '真实列表',
  '真实总览',
  '真实记录',
  '只读浏览',
  '承载位',
  '跟进详情承载区',
  '首页占位配置',
  '后续可替换为真实聚合数据',
  '占位页',
  '骨架页',
  '无新建 / 无排期入口',
  '不提供新建',
  '不提供新增',
]

const placeholderForbiddenMarkers = [
  '伪造',
  'App Shell',
  '后续 story',
  '承载位',
  '真实业务数据',
  '本期先',
  '本期不',
]

describe('assistant real page copy guard', () => {
  it('keeps delivery and acceptance wording out of shipped product pages', () => {
    for (const relativePath of realPageFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')

      for (const marker of realPageForbiddenMarkers) {
        expect(source, `${relativePath} should not contain "${marker}"`).not.toContain(marker)
      }
    }
  })
})

describe('assistant placeholder page copy guard', () => {
  it('keeps engineering delivery wording out of coming-soon placeholder pages', () => {
    for (const relativePath of placeholderFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')

      for (const marker of placeholderForbiddenMarkers) {
        expect(source, `${relativePath} should not contain "${marker}"`).not.toContain(marker)
      }
    }
  })
})
