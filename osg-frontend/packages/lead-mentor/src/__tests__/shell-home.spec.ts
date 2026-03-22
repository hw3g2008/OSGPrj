import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const layoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)
const homePath = path.resolve(__dirname, '../views/home/index.vue')
const homeExists = fs.existsSync(homePath)
const homeSource = homeExists ? fs.readFileSync(homePath, 'utf-8') : ''

describe('lead-mentor shell and home source contract', () => {
  it('keeps the prototype sidebar shell instead of the ant header shell', () => {
    expect(layoutSource).toContain('class="sidebar"')
    expect(layoutSource).toContain('class="sidebar-nav"')
    expect(layoutSource).toContain('class="main"')
    expect(layoutSource).not.toContain('<a-layout-header')
    expect(layoutSource).not.toContain('<a-layout-sider')
  })

  it('keeps the prototype navigation groups and wording for S-040', () => {
    const expectedLabels = [
      '首页 Home',
      '求职中心 Career',
      '岗位信息 Positions',
      '学员求职总览 Job Overview',
      '模拟应聘管理 Mock Practice',
      '教学中心 Teaching',
      '学员列表 Student List',
      '课程记录 Class Records',
      '财务中心 Finance',
      '报销管理 Expense',
      '资源中心 Resources',
      '在线测试题库 Online Tests',
      '个人中心 Profile',
      '课程排期 Schedule',
      '退出登录'
    ]

    for (const label of expectedLabels) {
      expect(layoutSource).toContain(label)
    }
  })

  it('keeps /home available while preserving /dashboard compatibility', () => {
    expect(routerSource).toContain("path: 'home'")
    expect(routerSource).toContain("path: 'dashboard'")
  })

  it('restores the prototype home file with greeting, summary cards, and quick entry icons', () => {
    expect(homeExists).toBe(true)
    expect(homeSource).toContain('下午好，Jess')
    expect(homeSource).toContain('待排课程')
    expect(homeSource).toContain('待确认课程')
    expect(homeSource).toContain('本周收入（已结算）')
    expect(homeSource).toContain('本周课时')
    expect(homeSource).toContain('快捷入口')
    expect(homeSource).toContain('岗位申请')
    expect(homeSource).toContain('排课管理')
    expect(homeSource).toContain('我的课程')
    expect(homeSource).toContain('我的学员')
    expect(homeSource).toContain('我的排期')
    expect(homeSource).toContain('报销管理')

    const expectedIcons = [
      'mdi-arrow-right',
      'mdi-account-multiple',
      'mdi-calendar-check',
      'mdi-clock-outline',
      'mdi-calendar',
      'mdi-account-group',
      'mdi-briefcase-plus',
      'mdi-clipboard-list',
      'mdi-book-open-variant',
      'mdi-calendar-clock',
      'mdi-receipt'
    ]

    for (const iconClass of expectedIcons) {
      expect(homeSource).toContain(iconClass)
    }
  })

  it('keeps the sidebar footer user affordance for logout', () => {
    expect(layoutSource).toContain('Jess (Lead Mentor)')
    expect(layoutSource).toContain('点击展开')
    expect(layoutSource).toContain('退出登录')
  })
})
