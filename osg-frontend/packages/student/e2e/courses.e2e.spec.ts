import { expect, test } from '@playwright/test'

const mockClassRecordsMeta = {
  pageSummary: {
    titleZh: '课程记录',
    titleEn: 'Class Records',
    subtitle: '查看我的上课记录和导师反馈'
  },
  reminderBanner: {
    iconLabel: 'CR',
    title: '新增课程记录',
    leadText: '导师',
    mentorName: 'Jerry Li',
    middleText: '为您填报了',
    newRecordCount: 2,
    suffixText: '条新的上课记录，请及时评价',
    ctaLabel: '去评价'
  },
  tabDefinitions: [
    { key: 'all', label: '全部', displayLabel: '全部', count: 4 },
    { key: 'pending', label: '待评价', displayLabel: '待评价 2', count: 2 },
    { key: 'evaluated', label: '已评价', displayLabel: '已评价', count: 2 }
  ],
  filters: {
    keywordPlaceholder: '搜索导师...',
    coachingTypePlaceholder: '辅导类型',
    courseContentPlaceholder: '课程内容',
    timeRangePlaceholder: '时间范围',
    resetLabel: '重置',
    coachingTypeOptions: [
      { value: '岗位辅导', label: '岗位辅导' },
      { value: '模拟应聘', label: '模拟应聘' }
    ],
    courseContentOptions: [
      { value: 'Case准备', label: 'Case准备' },
      { value: '模拟面试', label: '模拟面试' },
      { value: '人际关系期中考试', label: '人际关系期中考试' }
    ],
    timeRangeOptions: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'all', label: '全部' }
    ]
  },
  tableHeaders: {
    recordId: '记录ID',
    coachingDetail: '辅导内容',
    courseContent: '课程内容',
    mentor: '导师',
    classDate: '上课日期',
    duration: '时长',
    rating: '我的评价',
    action: '操作'
  },
  detailDialog: {
    closeLabel: '关闭',
    confirmLabel: '修改评价',
    fields: {
      recordId: '记录ID',
      coachingDetail: '辅导内容',
      courseContent: '课程内容',
      mentor: '导师',
      classDate: '上课日期',
      duration: '时长'
    }
  },
  ratingDialog: {
    title: '课程评价',
    scoreLabel: '整体评分',
    tagLabel: '评价标签',
    feedbackLabel: '详细反馈',
    tagPlaceholder: '请选择评价标签',
    feedbackPlaceholder: '请详细描述您的上课体验、导师表现以及改进建议...',
    cancelLabel: '取消',
    submitLabel: '提交评价',
    successMessage: '评价提交成功',
    tagOptions: [
      { value: '专业能力强', label: '专业能力强' },
      { value: '耐心细致', label: '耐心细致' },
      { value: '反馈及时', label: '反馈及时' },
      { value: '收获很大', label: '收获很大' },
      { value: '准时守约', label: '准时守约' }
    ]
  }
}

const mockCourseRecords = [
  {
    recordId: '#R231785',
    coachingType: '岗位辅导',
    coachingDetail: 'Goldman Sachs · IB Analyst',
    coachingTagColor: 'blue',
    courseContent: 'Case准备',
    contentTagColor: 'processing',
    mentor: 'Jerry Li',
    mentorRole: '导师',
    classDate: '01/26',
    classDateRaw: '2026-01-26',
    isNew: true,
    duration: '2h',
    ratingScoreValue: '',
    ratingLabel: '待评价',
    ratingColor: 'orange',
    actionLabel: '评价',
    actionKind: 'rate',
    detailTitle: '课程评价',
    tab: 'pending',
    ratingTags: '',
    ratingFeedback: '',
    newBadgeLabel: 'NEW'
  },
  {
    recordId: '#R231784',
    coachingType: '模拟应聘',
    coachingDetail: '模拟面试 · First Round',
    coachingTagColor: 'green',
    courseContent: '模拟面试',
    contentTagColor: 'success',
    mentor: 'Test Lead Mentor',
    mentorRole: '班主任',
    classDate: '01/25',
    classDateRaw: '2026-01-25',
    isNew: true,
    duration: '1.5h',
    ratingScoreValue: '',
    ratingLabel: '待评价',
    ratingColor: 'orange',
    actionLabel: '评价',
    actionKind: 'rate',
    detailTitle: '课程评价',
    tab: 'pending',
    ratingTags: '',
    ratingFeedback: '',
    newBadgeLabel: 'NEW'
  },
  {
    recordId: '#R231780',
    coachingType: '岗位辅导',
    coachingDetail: 'Goldman Sachs · IB Analyst',
    coachingTagColor: 'blue',
    courseContent: '新简历',
    contentTagColor: 'cyan',
    mentor: 'Jerry Li',
    mentorRole: '导师',
    classDate: '01/20',
    classDateRaw: '2026-01-20',
    isNew: false,
    duration: '2h',
    ratingScoreValue: '5.0',
    ratingLabel: '⭐ 5.0',
    ratingColor: 'green',
    actionLabel: '查看详情',
    actionKind: 'detail',
    detailTitle: '课程详情',
    tab: 'evaluated',
    ratingTags: '专业能力强,收获很大',
    ratingFeedback: '简历反馈很有帮助',
    newBadgeLabel: 'NEW'
  },
  {
    recordId: '#R231778',
    coachingType: '模拟应聘',
    coachingDetail: '人际关系期中考试',
    coachingTagColor: 'green',
    courseContent: '人际关系期中考试',
    contentTagColor: 'purple',
    mentor: 'Mike Chen',
    mentorRole: '导师',
    classDate: '01/18',
    classDateRaw: '2026-01-18',
    isNew: false,
    duration: '1h',
    ratingScoreValue: '4.5',
    ratingLabel: '⭐ 4.5',
    ratingColor: 'green',
    actionLabel: '查看详情',
    actionKind: 'detail',
    detailTitle: '人际关系期中考试详情',
    tab: 'evaluated',
    ratingTags: '反馈及时,准时守约',
    ratingFeedback: '软技能点评到位',
    newBadgeLabel: 'NEW'
  }
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
  await page.route('**/student/class-records/meta', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: mockClassRecordsMeta
      })
    })
  })
  await page.route('**/student/class-records/list', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: {
          records: mockCourseRecords
        }
      })
    })
  })
})

test.describe('student class records story S-007', () => {
  test('renders class records tabs and opens the rate/detail workflows from the prototype @student-s007-courses', async ({ page }) => {
    await page.goto('/courses')

    await expect(page.getByRole('heading', { name: /课程记录\s*Class Records/ })).toBeVisible()
    await expect(page.getByText('查看我的上课记录和导师反馈')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '记录ID' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '我的评价' })).toBeVisible()

    await page.getByRole('button', { name: '去评价' }).click()
    await expect(page.getByText('#R231785')).toBeVisible()
    await expect(page.getByText('#R231780')).not.toBeVisible()

    await page.locator('tbody .action-button--primary').first().click()
    const rateDialog = page.getByRole('dialog', { name: /课程评价/ })
    await expect(rateDialog).toBeVisible()
    await expect(rateDialog.getByText('整体评分')).toBeVisible()
    await rateDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByRole('tab', { name: '全部' }).click()
    await page.locator('tr', { hasText: '#R231778' }).getByRole('button', { name: '查看详情', exact: true }).click()

    const detailDialog = page.getByRole('dialog', { name: /人际关系期中考试详情/ })
    await expect(detailDialog).toBeVisible()
    await detailDialog.getByRole('button', { name: /关\s*闭/ }).click()
  })
})
