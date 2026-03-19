import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })

  await page.route('**/api/student/profile', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: {
            profile: {
              studentCode: '12766',
              fullName: 'Emily Zhang',
              englishName: 'Emily Zhang',
              email: 'emily@example.com',
              sexLabel: 'Female',
              statusLabel: '正常',
              leadMentor: 'Test Lead Mentor',
              assistantName: '-',
              school: 'NYU',
              major: 'Finance',
              graduationYear: '2025',
              highSchool: '-',
              postgraduatePlan: '否',
              visaStatus: 'F1',
              targetRegion: '亚太 - 香港',
              recruitmentCycle: '2025 Summer',
              primaryDirection: '金融 Finance',
              secondaryDirection: 'IB 投行',
              phone: '+1 123-456-7890',
              wechatId: 'emily_zhang'
            },
            pendingChanges: [
              {
                fieldKey: 'school',
                fieldLabel: '学校',
                oldValue: 'NYU',
                newValue: 'Columbia University',
                status: 'pending',
                submittedAt: '2026-01-03 10:15'
              },
              {
                fieldKey: 'recruitmentCycle',
                fieldLabel: '招聘周期',
                oldValue: '2025 Summer',
                newValue: '2025 Full-time',
                status: 'pending',
                submittedAt: '2026-01-03 10:15'
              }
            ],
            pendingCount: 2
          }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: {
          profile: {
            studentCode: '12766',
            fullName: 'Emily Zhang',
            englishName: 'Emily Zhang',
            email: 'emily@example.com',
            sexLabel: 'Female',
            statusLabel: '正常',
            leadMentor: 'Test Lead Mentor',
            assistantName: '-',
            school: 'NYU',
            major: 'Finance',
            graduationYear: '2025',
            highSchool: '-',
            postgraduatePlan: '否',
            visaStatus: 'F1',
            targetRegion: '亚太 - 香港',
            recruitmentCycle: '2025 Summer',
            primaryDirection: '金融 Finance',
            secondaryDirection: 'IB 投行',
            phone: '+1 123-456-7890',
            wechatId: 'emily_zhang'
          },
          pendingChanges: [],
          pendingCount: 0
        }
      })
    })
  })
})

test.describe('student profile story S-012', () => {
  test('renders profile dialogs and the notice/faq/complaint/restricted placeholders @student-s012-profile', async ({ page }) => {
    await page.goto('/profile')

    await expect(page.getByRole('heading', { name: /基本信息\s*My Profile/ })).toBeVisible()
    await page.getByRole('button', { name: '编辑信息' }).click()
    const editDialog = page.getByRole('dialog', { name: /编辑基本信息/ })
    await expect(editDialog).toBeVisible()
    await editDialog.getByRole('button', { name: /取\s*消/ }).click()

    await page.getByRole('button', { name: '查看详情' }).click()
    await expect(page.getByRole('dialog', { name: /待审核的信息变更/ })).toBeVisible()

    await page.goto('/notice')
    await expect(page.getByRole('heading', { name: /消息中心\s*Notifications/ })).toBeVisible()
    await page.getByRole('button', { name: /模拟面试已安排/ }).first().click()
    await expect(page.getByRole('dialog', { name: /消息详情/ })).toBeVisible()

    await page.goto('/faq')
    await expect(page.getByRole('heading', { name: /常见问题\s*FAQ/ })).toBeVisible()
    await page.getByRole('button', { name: /如何申请课程\/Staffing Request/ }).click()

    await page.goto('/complaint')
    await expect(page.getByRole('heading', { name: /投诉与建议\s*OSG Feedback Form/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '提交反馈 Submit' })).toBeVisible()

    await page.goto('/restricted')
    await expect(page.getByRole('heading', { name: '账号状态受限' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '我的课程' })).toBeVisible()
  })
})
