import { expect, test } from '@playwright/test'

const mockOverview = {
  practiceRecords: [
    {
      id: 'MP001',
      type: '模拟面试',
      typeValue: 'mock',
      typeColor: 'blue',
      content: 'Case Study Round',
      appliedAt: '12/05 15:30',
      submittedAtValue: '2025-12-05 15:30:00',
      mentor: 'Sarah Chen',
      mentorMeta: 'MBB 顾问',
      hours: '3h',
      feedback: '优秀',
      feedbackHint: 'Case分析到位',
      status: '已完成',
      statusValue: '已完成',
      statusColor: 'green'
    }
  ],
  requestRecords: [
    {
      id: '#R2025001',
      type: 'Staffing',
      typeValue: 'Staffing',
      typeColor: 'purple',
      company: 'Goldman Sachs',
      status: 'Processing',
      statusValue: 'Processing',
      statusColor: 'orange',
      submittedAt: '12/10/2025',
      submittedAtValue: '2025-12-10 09:00:00',
      courseType: 'interview',
      jobStatus: '已申请',
      remark: '需要一轮 staffing 辅导'
    },
    {
      id: '#R2025002',
      type: 'Hirevue',
      typeValue: 'Hirevue',
      typeColor: 'blue',
      company: 'JP Morgan',
      status: 'Completed',
      statusValue: 'Completed',
      statusColor: 'green',
      submittedAt: '12/08/2025',
      submittedAtValue: '2025-12-08 16:00:00',
      courseType: 'mock',
      jobStatus: '面试中',
      remark: '已完成 hirevue 辅导'
    }
  ]
}

const mockMeta = {
  pageSummary: {
    titleZh: '应聘演练',
    titleEn: 'Mock Practice',
    subtitle: '申请模拟面试、人际关系测试或期中考试'
  },
  practiceSection: {
    recordsTitle: '我的模拟应聘记录',
    keywordPlaceholder: '搜索...',
    typePlaceholder: '全部类型',
    statusPlaceholder: '全部状态',
    rangePlaceholder: '时间范围'
  },
  practiceCards: [
    {
      id: 'mock',
      badge: 'MI',
      title: '模拟面试',
      description: '与导师进行1对1模拟面试练习，获取专业反馈',
      cta: '申请模拟面试',
      buttonType: 'primary',
      gradient: 'linear-gradient(135deg, #7399C6, #9BB8D9)',
      modalTitle: '申请模拟面试'
    },
    {
      id: 'networking',
      badge: 'RT',
      title: '人际关系测试',
      description: '测试您的职场沟通和人际交往能力',
      cta: '申请测试',
      buttonType: 'default',
      buttonColor: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      modalTitle: '申请人际关系测试'
    },
    {
      id: 'midterm',
      badge: 'EX',
      title: '期中考试',
      description: '阶段性知识检测，评估学习进度',
      cta: '申请考试',
      buttonType: 'default',
      buttonColor: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
      modalTitle: '申请期中考试'
    }
  ],
  practiceFilters: {
    typeOptions: [
      { value: 'mock', label: '模拟面试' },
      { value: 'networking', label: '人际关系测试' },
      { value: 'midterm', label: '期中考试' }
    ],
    statusOptions: [
      { value: '待分配', label: '待分配' },
      { value: '已完成', label: '已完成' }
    ],
    rangeOptions: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'all', label: '全部' }
    ]
  },
  practiceForm: {
    mentorCountOptions: [
      { value: '1位导师', label: '1位导师' },
      { value: '2位导师', label: '2位导师' },
      { value: '3位导师', label: '3位导师' }
    ]
  },
  requestSection: {
    titleZh: '课程申请',
    titleEn: 'Class Request',
    subtitle: '申请Staffing或Hirevue/OT课程辅导',
    heroTitle: '需要预约课程？',
    heroSubtitle: '点击右侧按钮快速提交申请',
    actionButtonText: '新建申请',
    tableTitle: '申请记录 My Requests',
    keywordPlaceholder: '搜索公司...',
    typePlaceholder: '类型',
    statusPlaceholder: '状态',
    modalTitle: '新建课程申请'
  },
  requestTabs: [
    { key: 'all', label: '全部', count: 2 },
    { key: 'processing', label: '处理中', count: 1 },
    { key: 'completed', label: '已完成', count: 1 }
  ],
  requestFilters: {
    typeOptions: [
      { value: 'Staffing', label: 'Staffing' },
      { value: 'Hirevue', label: 'Hirevue' },
      { value: 'OT', label: 'OT' }
    ],
    statusOptions: [
      { value: 'Processing', label: 'Processing' },
      { value: 'Completed', label: 'Completed' }
    ]
  },
  requestCourseOptions: [
    { value: 'interview', label: '我有一个入职面试', badge: 'IN', gradient: 'linear-gradient(135deg, #7399C6, #5A7BA3)', requestType: 'Staffing', requestContent: '我有一个入职面试' },
    { value: 'mock', label: '我需要模拟面试', badge: 'MK', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', requestType: 'Staffing', requestContent: '我需要模拟面试' },
    { value: 'test', label: '我有一个笔试，需要帮我做题', badge: 'OT', gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)', requestType: 'OT', requestContent: '我有一个笔试，需要帮我做题' },
    { value: 'midterm', label: '模拟期中考试', badge: 'ME', gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', requestType: 'Hirevue', requestContent: '模拟期中考试' },
    { value: 'network', label: '人际关系期中考试', badge: 'NW', gradient: 'linear-gradient(135deg, #EC4899, #F472B6)', requestType: 'Hirevue', requestContent: '人际关系期中考试' },
    { value: 'qbank', label: '我申请题库', badge: 'QB', gradient: 'linear-gradient(135deg, #06B6D4, #67E8F9)', requestType: 'OT', requestContent: '我申请题库' }
  ],
  requestForm: {
    companyOptions: [
      { value: 'Goldman Sachs', label: 'Goldman Sachs' },
      { value: 'JP Morgan', label: 'JP Morgan' },
      { value: 'McKinsey', label: 'McKinsey' }
    ],
    jobStatusOptions: [
      { value: '已申请', label: '已申请' },
      { value: '面试中', label: '面试中' },
      { value: '已获Offer', label: '已获Offer' }
    ]
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })

  await page.route('**/student/mock-practice/overview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: mockOverview
      })
    })
  })

  await page.route('**/student/mock-practice/meta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: mockMeta
      })
    })
  })
})

test.describe('student mock practice story S-006', () => {
  test('renders mock practice and class request workflows from backend-owned meta @student-s006-mock-practice', async ({ page }) => {
    await page.goto('/mock-practice')

    await expect(page.getByRole('heading', { name: /应聘演练\s*Mock Practice/ })).toBeVisible()
    await expect(page.getByText('申请模拟面试、人际关系测试或期中考试')).toBeVisible()
    await expect(page.getByText('全部 2')).toBeVisible()
    await expect(page.getByText('处理中 1')).toBeVisible()
    await expect(page.getByText('已完成 1')).toBeVisible()

    await expect(page.getByRole('columnheader', { name: '申请内容' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '导师' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '课程反馈' })).toBeVisible()

    await page.getByRole('button', { name: '申请模拟面试' }).click()
    const mockDialog = page.getByRole('dialog', { name: /申请模拟面试/ })
    await expect(mockDialog).toBeVisible()
    await expect(mockDialog.getByText('你为什么要做模拟面试？')).toBeVisible()
    await mockDialog.getByRole('button', { name: /取\s*消/ }).click()

    await expect(page.getByText('课程申请 / Class Request')).toBeVisible()
    await expect(page.getByText('需要预约课程？')).toBeVisible()
    await page.getByRole('button', { name: '新建申请' }).click()

    const requestDialog = page.getByRole('dialog', { name: /新建课程申请/ })
    await expect(requestDialog).toBeVisible()
    await expect(requestDialog.getByText('我有一个入职面试')).toBeVisible()
    await expect(requestDialog.getByText('我需要模拟面试')).toBeVisible()
    await expect(requestDialog.getByText('我有一个笔试，需要帮我做题')).toBeVisible()
    await expect(requestDialog.getByText('模拟期中考试')).toBeVisible()
    await expect(requestDialog.getByText('人际关系期中考试')).toBeVisible()
    await expect(requestDialog.getByText('我申请题库')).toBeVisible()
    await requestDialog.getByRole('button', { name: /取\s*消/ }).click()
  })
})
