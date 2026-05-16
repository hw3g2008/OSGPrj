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
    // M0.4 Step 4.4: sidebar shell now provided by @osg/shared/components AppSidebar.
    // Source contract verifies wrapper still composes AppSidebar (not antd layout shell).
    expect(layoutSource).toContain('<AppSidebar')
    expect(layoutSource).toContain("from '@osg/shared/components'")
    expect(layoutSource).toContain('class="main"')
    expect(layoutSource).not.toContain('<a-layout-header')
    expect(layoutSource).not.toContain('<a-layout-sider')
  })

  it('keeps the prototype navigation groups and wording for S-040', () => {
    // M0.4 Step 4.4: '首页 Home' removed per Step 4.1 product decision (home entry not in V1).
    // '退出登录' moved to @osg/shared AppSidebar; verified via AppSidebar reference in case 1.
    // After i18n-ization, labels are referenced via t() keys; check for key presence in source.
    const expectedKeys = [
      "leadMentor.layout.nav.career.title",
      "leadMentor.layout.nav.career.positions",
      "leadMentor.layout.nav.career.jobOverview",
      "leadMentor.layout.nav.career.mockPractice",
      "leadMentor.layout.nav.studentCenter.title",
      "leadMentor.layout.nav.studentCenter.studentList",
      "leadMentor.layout.nav.teaching.title",
      "leadMentor.layout.nav.teaching.classRecords",
      "leadMentor.layout.nav.finance.title",
      "leadMentor.layout.nav.finance.expense",
      "leadMentor.layout.nav.resources.title",
      "leadMentor.layout.nav.resources.onlineTests",
      "leadMentor.layout.nav.profile.title",
      "leadMentor.layout.nav.profile.schedule",
    ]

    for (const key of expectedKeys) {
      expect(layoutSource).toContain(key)
    }
  })

  it('keeps /home available while preserving /dashboard compatibility', () => {
    expect(routerSource).toContain("path: 'home'")
    expect(routerSource).toContain("path: 'dashboard'")
  })

  it('restores the prototype home file with greeting, summary cards, and quick entry icons', () => {
    expect(homeExists).toBe(true)
    // After i18n-ization, Chinese strings replaced by t() key references; check key presence.
    expect(homeSource).toContain("leadMentor.home.greetingAfternoon")
    expect(homeSource).toContain("leadMentor.home.summary.pendingScheduling")
    expect(homeSource).toContain("leadMentor.home.summary.pendingConfirm")
    expect(homeSource).toContain("leadMentor.home.summary.weeklyIncome")
    expect(homeSource).toContain("leadMentor.home.summary.weeklyHours")
    expect(homeSource).toContain("leadMentor.home.quickEntries.title")
    expect(homeSource).toContain("leadMentor.home.quickEntries.positionApply")
    expect(homeSource).toContain("leadMentor.home.quickEntries.scheduleManage")
    expect(homeSource).toContain("leadMentor.home.quickEntries.myClasses")
    expect(homeSource).toContain("leadMentor.home.quickEntries.myStudents")
    expect(homeSource).toContain("leadMentor.home.quickEntries.mySchedule")
    expect(homeSource).toContain("leadMentor.home.quickEntries.reimbursement")

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
    // M0.4 Step 4.4: '点击展开' / '退出登录' template moved to @osg/shared AppSidebar;
    // wrapper passes role-label via i18n key and logo-title 'OSG Lead Mentor' as props.
    expect(layoutSource).toContain('Jess (Lead Mentor)')
    expect(layoutSource).toContain('OSG Lead Mentor')
    expect(layoutSource).toContain("leadMentor.layout.roleLabel")
    expect(layoutSource).toContain('clearAuth')
  })
})
