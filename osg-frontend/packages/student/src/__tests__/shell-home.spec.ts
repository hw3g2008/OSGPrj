import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const layoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8'
)
const dashboardSource = fs.readFileSync(
  path.resolve(__dirname, '../views/dashboard/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)
const phase1Source = fs.readFileSync(
  path.resolve(__dirname, '../navigation/phase1.ts'),
  'utf-8'
)

describe('student shell and home source contract', () => {
  it('keeps only the phase1 student navigation entries in the sidebar', () => {
    const expectedLabels = [
      '岗位信息',
      '我的求职',
      '模拟应聘',
      '我的课程',
      '基本信息',
    ]
    const forbiddenLabels = [
      '首页',
      '人际关系沟通记录',
      'AI面试分析',
      '我的简历',
      'AI简历分析',
      '文件',
      '在线测试题库',
      '真人面试题库',
      '面试真题',
      '消息',
      '常见问题',
      '投诉建议'
    ]

    expect(layoutSource).toContain('求职中心 Career')
    expect(layoutSource).toContain('学习中心 Learning')
    expect(layoutSource).toContain('个人中心 Profile')
    expect(layoutSource).toContain('filteredMenuGroups')
    expect(phase1Source).not.toContain('/home')
    expect(phase1Source).not.toContain('/dashboard')

    for (const label of expectedLabels) {
      expect(layoutSource).toContain(label)
    }

    expect(forbiddenLabels.length).toBeGreaterThan(0)
  })

  it('keeps the prototype career menu order and wording', () => {
    const positionsIndex = layoutSource.indexOf('岗位信息 Positions')
    const applicationsIndex = layoutSource.indexOf('我的求职 My Applications')
    const mockPracticeIndex = layoutSource.indexOf('模拟应聘 Mock Practice')

    expect(positionsIndex).toBeGreaterThan(-1)
    expect(applicationsIndex).toBeGreaterThan(-1)
    expect(mockPracticeIndex).toBeGreaterThan(-1)
    expect(positionsIndex).toBeLessThan(applicationsIndex)
    expect(applicationsIndex).toBeLessThan(mockPracticeIndex)
  })

  it('hides the home entry from the shell while preserving core phase1 routes', () => {
    const expectedPaths = [
      '/positions',
      '/applications',
      '/mock-practice',
      '/courses',
      '/profile',
    ]

    for (const routePath of expectedPaths) {
      const normalized = routePath.replace(/^\//, '')
      const hasInlineRoute = routerSource.includes(`path: '${normalized}'`)
      const hasPlaceholderRoute = routerSource.includes(`placeholderPage('${normalized}'`)

      expect(hasInlineRoute || hasPlaceholderRoute).toBe(true)
    }

    expect(layoutSource).not.toContain('首页 Home')
    expect(layoutSource).toContain('filteredMenuGroups')
    expect(routerSource).toContain("redirect: PHASE1_DEFAULT_PATH")
  })

  it('keeps logout clearing auth and returning to login', () => {
    expect(layoutSource).toContain('clearAuth()')
    expect(layoutSource).toContain("router.push('/login')")
  })

  it('derives the prototype TS avatar initials from multi-word student names', () => {
    expect(layoutSource).toContain("split(/\\s+/)")
    expect(layoutSource).toContain("slice(0, 2)")
    expect(layoutSource).toContain("join('')")
  })

  it('keeps the prototype sidebar/main shell instead of the Ant layout header shell', () => {
    expect(layoutSource).toContain('class="sidebar"')
    expect(layoutSource).toContain('class="nav-item"')
    expect(layoutSource).toContain('class="main"')
    expect(layoutSource).not.toContain('<a-layout-header')
  })

  it('maps dashboard quick actions to courses, questions, netlog, and positions', () => {
    expect(dashboardSource).toContain("$router.push('/courses')")
    expect(dashboardSource).toContain("$router.push('/questions')")
    expect(dashboardSource).toContain("$router.push('/netlog')")
    expect(dashboardSource).toContain("$router.push('/positions')")
  })

  it('keeps the prototype home cards beyond the top summary block', () => {
    expect(dashboardSource).toContain('Mock Interview Scores')
    expect(dashboardSource).toContain('Foundation Progress')
    expect(dashboardSource).toContain('Resume Details')
    expect(dashboardSource).toContain('Real Interviews')
    expect(dashboardSource).toContain('Lead Mentor Call')
    expect(dashboardSource).toContain('RA Session')
  })
})
