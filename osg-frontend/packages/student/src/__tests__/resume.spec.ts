import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const resumeSource = fs.readFileSync(
  path.resolve(__dirname, '../views/resume/index.vue'),
  'utf-8'
)
const aiResumeSource = fs.readFileSync(
  path.resolve(__dirname, '../views/ai-resume/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

describe('student resume story S-010 source contract', () => {
  it('keeps the resume title, upload actions, and version table from the prototype', () => {
    const expectedLabels = [
      '我的简历',
      'My Resume',
      '管理您的简历版本，支持 PDF、Word 格式',
      '上传新简历',
      '我上传的简历',
      '导师修改版本',
      '点击上传新版本',
      '简历版本',
      'Resume Versions',
      '版本',
      '文件名',
      '来源',
      '更新时间',
      '大小',
      '预览',
      '下载'
    ]

    for (const label of expectedLabels) {
      expect(resumeSource).toContain(label)
    }
  })

  it('keeps the ai resume upload shell, score cards, history, and report dialog from the prototype', () => {
    const expectedLabels = [
      'AI简历分析',
      'AI Resume Analysis',
      '上传分析',
      '最新分析结果',
      '综合评分',
      '格式规范',
      '内容完整度',
      '关键词匹配',
      '量化成就',
      'AI改进建议',
      '分析历史',
      '查看报告',
      'AI简历分析报告'
    ]

    for (const label of expectedLabels) {
      expect(aiResumeSource).toContain(label)
    }
  })

  it('registers real resume and ai resume routes instead of placeholders', () => {
    expect(routerSource).toContain("path: 'resume'")
    expect(routerSource).toContain("path: 'ai-resume'")
    expect(routerSource).not.toContain("placeholderPage('ai-resume'")
  })
})
