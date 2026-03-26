import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })

  await page.route('**/api/student/profile', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          profile: {
            studentCode: '12766',
            fullName: 'Emily Zhang',
            englishName: 'Emily Zhang',
            email: 'emily@example.com',
            sexLabel: 'Female',
            statusLabel: '正常',
            leadMentor: 'Test Lead Mentor',
            assistantName: 'Student Assistant',
            school: 'NYU',
            major: 'Finance',
            graduationYear: '2025',
            highSchool: '-',
            postgraduatePlan: '否',
            visaStatus: 'F1',
            targetRegion: 'Hong Kong',
            recruitmentCycle: '2025 Summer',
            primaryDirection: '金融 Finance',
            secondaryDirection: 'Investment Banking',
            phone: '+1 123-456-7890',
            wechatId: 'emily_zhang'
          },
          pendingChanges: [],
          pendingCount: 0
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
        msg: '操作成功',
        data: {
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
            progressStages: [],
            coachingStatuses: [],
            companyTypes: [],
            applyMethods: []
          },
          schedule: []
        }
      })
    })
  })

  await page.route('**/api/student/application/list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          applications: [
            {
              id: 1,
              company: 'Goldman Sachs',
              position: 'IB Analyst',
              location: 'Hong Kong',
              bucket: 'ongoing',
              companyType: 'ib',
              stage: 'first',
              stageLabel: 'First Round',
              stageColor: 'blue',
              interviewTime: '2026-03-20 09:00',
              interviewHint: '线上',
              coachingStatus: 'coaching',
              coachingStatusLabel: '辅导中',
              coachingColor: 'gold',
              mentor: 'Test Lead Mentor',
              mentorMeta: 'Lead Mentor',
              hoursFeedback: '2h',
              feedback: 'Need more case drills',
              interviewAt: '2026-03-20 09:00',
              appliedDate: '2026-03-12',
              applyMethod: '官网投递',
              progressNote: '准备 First Round'
            }
          ]
        }
      })
    })
  })

  await page.route('**/api/student/mock-practice/overview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          practiceRecords: [
            {
              id: 'practice-1',
              type: 'mock',
              typeValue: 'Mock Interview',
              typeColor: 'blue',
              content: 'GS First Round',
              appliedAt: '2026-03-15',
              submittedAtValue: '2026-03-16',
              mentor: 'Test Lead Mentor',
              mentorMeta: 'Lead Mentor',
              hours: '1.5h',
              feedback: 'Strong structure',
              feedbackHint: '',
              status: 'completed',
              statusValue: '已完成',
              statusColor: 'green'
            }
          ],
          requestRecords: []
        }
      })
    })
  })

  await page.route('**/api/student/class-records/meta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          pageSummary: {
            titleZh: '课程记录',
            titleEn: 'Class Records',
            subtitle: '查看我的上课记录和导师反馈'
          },
          reminderBanner: {
            iconLabel: 'CR',
            title: '新增课程记录',
            leadText: '导师',
            mentorName: 'Test Lead Mentor',
            middleText: '为您填报了',
            newRecordCount: 1,
            suffixText: '条新的上课记录，请及时评价',
            ctaLabel: '去评价'
          },
          tabDefinitions: [
            { key: 'all', label: '全部', displayLabel: '全部', count: 2 },
            { key: 'pending', label: '待评价', displayLabel: '待评价', count: 1 },
            { key: 'evaluated', label: '已评价', displayLabel: '已评价', count: 1 }
          ],
          filters: {
            keywordPlaceholder: '搜索导师/课程...',
            coachingTypePlaceholder: '辅导类型',
            courseContentPlaceholder: '课程内容',
            timeRangePlaceholder: '时间范围',
            resetLabel: '重置',
            coachingTypeOptions: [],
            courseContentOptions: [],
            timeRangeOptions: []
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
            tagPlaceholder: '请选择标签',
            feedbackPlaceholder: '请输入评价',
            cancelLabel: '取消',
            submitLabel: '提交评价',
            successMessage: '评价提交成功',
            tagOptions: []
          }
        }
      })
    })
  })

  await page.route('**/api/student/class-records/list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          records: [
            {
              recordId: '231776',
              coachingType: '简历修改',
              coachingDetail: 'Resume Coaching',
              coachingTagColor: 'blue',
              courseContent: 'Resume',
              contentTagColor: 'gold',
              mentor: 'Test Lead Mentor',
              mentorRole: 'Lead Mentor',
              classDate: '2026-03-18',
              classDateRaw: '2026-03-18',
              isNew: true,
              duration: '1h',
              ratingScoreValue: '待评价',
              ratingLabel: '待评价',
              ratingColor: 'orange',
              actionLabel: '去评价',
              actionKind: 'rate',
              detailTitle: '课程详情',
              tab: 'pending',
              ratingTags: '',
              ratingFeedback: '',
              newBadgeLabel: 'NEW'
            }
          ]
        }
      })
    })
  })

  await page.route('**/api/student/position/meta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          intentSummary: {
            recruitmentCycle: '2025 Summer',
            targetRegion: 'Hong Kong',
            primaryDirection: '金融 Finance'
          },
          filterOptions: {
            categories: [],
            industries: [],
            companies: [],
            locations: [],
            applyMethods: [],
            progressStages: [],
            coachingStages: [],
            mentorCounts: []
          }
        }
      })
    })
  })

  await page.route('**/api/student/position/list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: [
          {
            id: 1,
            title: 'IB Analyst',
            url: 'https://example.com/jobs/1',
            category: 'summer',
            categoryText: '暑期实习',
            department: 'Investment Banking',
            location: 'Hong Kong',
            recruitCycle: '2025 Summer',
            publishDate: '2026-03-10',
            deadline: '2026-04-15',
            company: 'Goldman Sachs',
            companyKey: 'gs',
            companyCode: 'gs',
            careerUrl: 'https://example.com/career/gs',
            industry: 'ib',
            sourceType: 'global',
            favorited: true,
            applied: true,
            progressStage: 'first',
            progressNote: '准备一面'
          }
        ]
      })
    })
  })

  await page.route('**/api/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '退出成功',
        data: null
      })
    })
  })
})

test.describe('student shell and home story S-003', () => {
  test('renders the full grouped sidebar and home overview @student-s003-shell', async ({ page }) => {
    await page.goto('/dashboard')

    const sidebar = page.locator('.sidebar-nav')

    await expect(sidebar.getByText('求职中心 Career').first()).toBeVisible()
    await expect(sidebar.getByText('学习中心 Learning').first()).toBeVisible()
    await expect(sidebar.getByText('简历中心 Resume').first()).toBeVisible()
    await expect(sidebar.getByText('资源中心 Resources').first()).toBeVisible()
    await expect(sidebar.getByText('个人中心 Profile').first()).toBeVisible()

    await expect(sidebar.getByText('人际关系沟通记录').first()).toBeVisible()
    await expect(sidebar.getByText('AI面试分析').first()).toBeVisible()
    await expect(sidebar.getByText('AI简历分析').first()).toBeVisible()
    await expect(sidebar.getByText('在线测试题库').first()).toBeVisible()
    await expect(sidebar.getByText('投诉建议').first()).toBeVisible()

    await expect(page.getByText('学员信息 Student Profile')).toBeVisible()
    await expect(page.getByText('快捷操作 Quick Actions')).toBeVisible()
  })

  test('routes home quick actions to delivered or coming-soon targets @student-s003-actions', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: '我的课程' }).click()
    await expect(page).toHaveURL(/\/courses$/)

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '填写面试真题' }).click()
    await expect(page).toHaveURL(/\/coming-soon/)
    await expect(page.getByRole('heading', { name: '面试真题' })).toBeVisible()

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '填写沟通记录' }).click()
    await expect(page).toHaveURL(/\/coming-soon/)
    await expect(page.getByRole('heading', { name: '沟通记录' })).toBeVisible()

    await page.goto('/dashboard')
    await page.getByRole('button', { name: '岗位信息' }).click()
    await expect(page).toHaveURL(/\/positions$/)
  })

  test('logs out from the sidebar user card and clears auth @student-s003-logout', async ({ page }) => {
    await page.goto('/dashboard')

    await page.locator('.user-card').click()
    await expect(page).toHaveURL(/\/login$/)

    const authState = await page.evaluate(() => ({
      token: localStorage.getItem('osg_token'),
      user: localStorage.getItem('osg_user')
    }))

    expect(authState).toEqual({
      token: null,
      user: null
    })
  })
})
