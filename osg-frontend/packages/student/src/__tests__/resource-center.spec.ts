import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const filesSource = fs.readFileSync(
  path.resolve(__dirname, '../views/files/index.vue'),
  'utf-8'
)
const onlineTestBankSource = fs.readFileSync(
  path.resolve(__dirname, '../views/online-test-bank/index.vue'),
  'utf-8'
)
const interviewBankSource = fs.readFileSync(
  path.resolve(__dirname, '../views/interview-bank/index.vue'),
  'utf-8'
)
const questionsSource = fs.readFileSync(
  path.resolve(__dirname, '../views/questions/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

describe('student resource center story S-011 source contract', () => {
  it('keeps the files page title, filters, and table headers from the prototype', () => {
    const expectedLabels = [
      '文件',
      'Files',
      '搜索文件名...',
      '类型',
      'NAME',
      'TYPE',
      'SIZE',
      'UPLOAD TIME'
    ]

    for (const label of expectedLabels) {
      expect(filesSource).toContain(label)
    }
  })

  it('keeps the online and interview bank filters and table headers from the prototype', () => {
    const expectedOnlineLabels = [
      '在线测试题库',
      'Online Test Bank',
      'HireVue、在线测评等在线测试资源',
      '搜索题库...',
      '公司',
      '题目数',
      '查看'
    ]
    const expectedInterviewLabels = [
      '真人面试题库',
      'Interview Question Bank',
      '面试阶段',
      '类型',
      '行业',
      '题库名称',
      '更新时间'
    ]

    for (const label of expectedOnlineLabels) {
      expect(onlineTestBankSource).toContain(label)
    }

    for (const label of expectedInterviewLabels) {
      expect(interviewBankSource).toContain(label)
    }
  })

  it('keeps the questions tabs, tables, and modal workflows from the prototype', () => {
    const expectedLabels = [
      '面试真题',
      'Interview Questions',
      '查看投递公司的真题，分享你的面试经历',
      '填写真题',
      '已开放题库 3',
      '我的提交',
      '部门',
      '轮次',
      '状态',
      '填写',
      '编辑',
      '填写面试真题',
      '我的提交详情'
    ]

    for (const label of expectedLabels) {
      expect(questionsSource).toContain(label)
    }

    const triggerMatches =
      questionsSource.match(/const questionActionTriggers = \[(.|\n)*?\]/)?.[0].match(/actionId:/g) ?? []

    expect(questionsSource).toContain('const questionActionTriggers = [')
    expect(triggerMatches).toHaveLength(10)
  })

  it('registers real files, online-test-bank, interview-bank, and questions routes', () => {
    for (const routePath of ['files', 'online-test-bank', 'interview-bank', 'questions']) {
      expect(routerSource).toContain(`path: '${routePath}'`)
      expect(routerSource).not.toContain(`placeholderPage('${routePath}'`)
    }
  })
})
