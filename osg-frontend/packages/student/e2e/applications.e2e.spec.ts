import { expect, test } from '@playwright/test'

const mockApplications = [
  {
    id: 1,
    bucket: 'ongoing',
    company: 'Goldman Sachs',
    position: 'IB Analyst',
    location: 'Hong Kong',
    companyType: 'ib',
    stage: 'first',
    stageLabel: 'First Round',
    stageColor: 'orange',
    interviewTime: '03/18 14:00',
    interviewHint: '2026-03-18 14:00:00',
    coachingStatus: 'coaching',
    coachingStatusLabel: '辅导中',
    coachingColor: 'purple',
    mentor: 'Jerry Li',
    mentorMeta: 'GS Ex-VP',
    hoursFeedback: '8h',
    feedback: '表现优秀',
    interviewAt: '2026-03-18 14:00:00',
    appliedDate: '2026-03-12',
    applyMethod: '官网投递',
    progressNote: ''
  },
  {
    id: 2,
    bucket: 'applied',
    company: 'JP Morgan',
    position: 'S&T Analyst',
    location: 'London',
    companyType: 'ib',
    stage: 'applied',
    stageLabel: '已投递',
    stageColor: 'blue',
    interviewTime: '-',
    interviewHint: '官网投递',
    coachingStatus: 'coaching',
    coachingStatusLabel: '辅导中',
    coachingColor: 'purple',
    mentor: 'Sarah K.',
    mentorMeta: 'JPM S&T',
    hoursFeedback: '2h',
    feedback: '-',
    interviewAt: '',
    appliedDate: '2026-03-14',
    applyMethod: '官网投递',
    progressNote: ''
  },
  {
    id: 3,
    bucket: 'ongoing',
    company: 'McKinsey',
    position: 'Business Analyst',
    location: 'Shanghai',
    companyType: 'consulting',
    stage: 'case',
    stageLabel: 'Case Study',
    stageColor: 'gold',
    interviewTime: '03/22 10:00',
    interviewHint: '2026-03-22 10:00:00',
    coachingStatus: 'pending',
    coachingStatusLabel: '待审批',
    coachingColor: 'warning',
    mentor: '分配中...',
    mentorMeta: '班主任处理中',
    hoursFeedback: '12h',
    feedback: '-',
    interviewAt: '2026-03-22 10:00:00',
    appliedDate: '2026-03-10',
    applyMethod: '内推',
    progressNote: ''
  }
]

const mockApplicationsMeta = {
  pageSummary: {
    titleZh: '我的求职',
    titleEn: 'My Applications',
    subtitle: '查看您的岗位申请和面试安排'
  },
  tabCounts: {
    all: 3,
    applied: 1,
    ongoing: 2,
    completed: 0
  },
  filterOptions: {
    progressStages: [
      { value: 'applied', label: '已投递' },
      { value: 'hirevue', label: 'HireVue / OT' },
      { value: 'first', label: 'First Round' },
      { value: 'second', label: 'Second Round' },
      { value: 'case', label: 'Case Study' },
      { value: 'offer', label: 'Offer' },
      { value: 'rejected', label: '已拒绝' }
    ],
    coachingStatuses: [
      { value: 'coaching', label: '辅导中' },
      { value: 'pending', label: '待审批' },
      { value: 'none', label: '无辅导' }
    ],
    companyTypes: [
      { value: 'ib', label: 'Investment Bank' },
      { value: 'consulting', label: 'Consulting' }
    ],
    applyMethods: [
      { value: '官网投递', label: '官网投递' },
      { value: '内推', label: '内推' },
      { value: '邮件投递', label: '邮件投递' }
    ]
  },
  schedule: [
    {
      id: 1,
      shortLabel: 'GS First Round',
      title: 'Goldman Sachs - First Round',
      position: 'IB Analyst',
      location: 'Hong Kong',
      weekdayLabel: '周三',
      dayLabel: '18',
      timeLabel: '14:00',
      modalTime: '2026年3月18日 14:00',
      accentClass: 'danger-chip',
      borderClass: 'danger-border'
    },
    {
      id: 3,
      shortLabel: 'MCK Case Study',
      title: 'McKinsey - Case Study',
      position: 'Business Analyst',
      location: 'Shanghai',
      weekdayLabel: '周日',
      dayLabel: '22',
      timeLabel: '10:00',
      modalTime: '2026年3月22日 10:00',
      accentClass: 'warning-chip',
      borderClass: 'warning-border'
    }
  ]
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })

  await page.route('**/api/student/application/list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: {
          applications: mockApplications
        }
      })
    })
  })

  await page.route('**/api/student/application/meta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: mockApplicationsMeta
      })
    })
  })
})

test.describe('student applications story S-005', () => {
  test('opens schedule and application workflows from the applications page @student-s005-applications', async ({ page }) => {
    await page.goto('/applications')

    await expect(page.getByRole('heading', { name: /我的求职\s*My Applications/ })).toBeVisible()
    await expect(page.getByText('全部 3')).toBeVisible()
    await expect(page.getByText('已投递 1')).toBeVisible()
    await expect(page.getByText('面试中 2')).toBeVisible()
    await expect(page.getByText('已结束 0')).toBeVisible()

    await page.getByText('GS First Round').click()
    const interviewDialog = page.getByRole('dialog', { name: /面试安排/ })
    await expect(interviewDialog).toBeVisible()
    await interviewDialog.getByRole('button', { name: /确\s*定/ }).click()

    await page.getByRole('button', { name: /展开/ }).click()
    await expect(page.getByText('本月面试安排')).toBeVisible()

    await page.getByText('面试中 2').click()
    await page.getByRole('button', { name: /更新阶段/ }).first().click()
    const progressDialog = page.getByRole('dialog', { name: /更新申请进度/ })
    await expect(progressDialog).toBeVisible()
    await progressDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByText('已投递 1').click()
    await page.getByRole('button', { name: /标记已投递/ }).first().click()
    await expect(page.getByRole('dialog', { name: /标记已投递/ })).toBeVisible()
  })
})
