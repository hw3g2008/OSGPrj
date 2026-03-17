import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const profileSource = fs.readFileSync(
  path.resolve(__dirname, '../views/profile/index.vue'),
  'utf-8'
)
const noticeSource = fs.readFileSync(
  path.resolve(__dirname, '../views/notice/index.vue'),
  'utf-8'
)
const faqSource = fs.readFileSync(
  path.resolve(__dirname, '../views/faq/index.vue'),
  'utf-8'
)
const complaintSource = fs.readFileSync(
  path.resolve(__dirname, '../views/complaint/index.vue'),
  'utf-8'
)
const restrictedSource = fs.readFileSync(
  path.resolve(__dirname, '../views/restricted/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

describe('student profile story S-012 source contract', () => {
  it('keeps the full profile shell and two modal workflows from the prototype', () => {
    const expectedLabels = [
      '基本信息',
      'My Profile',
      '查看和修改您的个人信息',
      '编辑信息',
      'pendingBannerTitle',
      '当前没有待审核的信息变更',
      '查看详情',
      '核心信息',
      '导师配置',
      '学业信息',
      '求职方向',
      '联系方式',
      '编辑基本信息',
      '待审核的信息变更'
    ]

    for (const label of expectedLabels) {
      expect(profileSource).toContain(label)
    }

    const triggerMatches = profileSource.match(/actionId:/g) ?? []

    expect(profileSource).toContain('const profileActionTriggers = [')
    expect(triggerMatches).toHaveLength(2)
  })

  it('keeps notice, faq, complaint, and restricted placeholder surfaces from the prototype', () => {
    const expectedNoticeLabels = [
      '消息中心',
      'Notifications',
      '查看系统通知、课程提醒和导师消息',
      '全部已读',
      '消息列表',
      '消息详情'
    ]
    const expectedFaqLabels = ['常见问题', 'FAQ', '如何申请课程/Staffing Request？', 'Networking Log有什么用？']
    const expectedComplaintLabels = [
      '投诉与建议',
      'OSG Feedback Form',
      'Email Address',
      'You are...?',
      'Submit'
    ]
    const expectedRestrictedLabels = [
      '账号状态受限',
      '我的课程',
      '课程反馈',
      '最近课程记录',
      '联系班主任'
    ]

    for (const label of expectedNoticeLabels) {
      expect(noticeSource).toContain(label)
    }

    for (const label of expectedFaqLabels) {
      expect(faqSource).toContain(label)
    }

    for (const label of expectedComplaintLabels) {
      expect(complaintSource).toContain(label)
    }

    for (const label of expectedRestrictedLabels) {
      expect(restrictedSource).toContain(label)
    }
  })

  it('registers real notice, faq, complaint, and restricted routes', () => {
    for (const routePath of ['notice', 'faq', 'complaint', 'restricted']) {
      expect(routerSource).toContain(`path: '${routePath}'`)
    }

    expect(routerSource).not.toContain("placeholderPage('notice'")
    expect(routerSource).not.toContain("placeholderPage('faq'")
    expect(routerSource).not.toContain("placeholderPage('complaint'")
  })
})
