import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = fs.readFileSync(
  path.resolve(__dirname, '../views/users/mentor-change-review/index.vue'),
  'utf-8',
)

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)

const layoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8',
)

const apiSource = fs.readFileSync(
  path.resolve(__dirname, '../../../shared/src/api/admin/mentorChangeReview.ts'),
  'utf-8',
)

// A-AU-001 admin 端导师资料变更审核：列表 + 通过 + 驳回 + 详情。
describe('A-AU-001 admin mentor change review page contract', () => {
  describe('shared API', () => {
    it('exposes list / approve / reject 三个端点', () => {
      expect(apiSource).toContain('listMentorChangeRequests')
      expect(apiSource).toContain('approveMentorChangeRequest')
      expect(apiSource).toContain('rejectMentorChangeRequest')
    })

    it('list endpoint uses GET /admin/mentor-profile-change/list with status param', () => {
      expect(apiSource).toMatch(/http\.get<[^>]+>\('\/admin\/mentor-profile-change\/list'/)
      expect(apiSource).toContain('status?: string')
    })

    it('approve endpoint uses PUT /admin/mentor-profile-change/{id}/approve', () => {
      expect(apiSource).toMatch(/http\.put<[^>]+>\(`\/admin\/mentor-profile-change\/\$\{requestId\}\/approve`/)
    })

    it('reject endpoint uses PUT /admin/mentor-profile-change/{id}/reject + reason payload', () => {
      expect(apiSource).toMatch(/http\.put<[^>]+>\(`\/admin\/mentor-profile-change\/\$\{requestId\}\/reject`/)
      expect(apiSource).toContain('RejectMentorChangePayload')
      expect(apiSource).toContain('reason: string')
    })

    it('MentorChangeRequestItem includes 3-status union pending|approved|rejected', () => {
      expect(apiSource).toContain("status: 'pending' | 'approved' | 'rejected'")
    })
  })

  describe('router + menu', () => {
    it('register /users/mentor-change-review route', () => {
      expect(routerSource).toContain("path: 'users/mentor-change-review'")
      expect(routerSource).toContain("name: 'MentorChangeReview'")
      expect(routerSource).toContain("permission: 'admin:mentor-change-review:list'")
    })

    it('left menu includes 导师资料变更审核 entry under user-center', () => {
      expect(layoutSource).toContain("path: '/users/mentor-change-review'")
      expect(layoutSource).toContain('导师资料变更审核')
      expect(layoutSource).toContain("permission: 'admin:mentor-change-review:list'")
    })
  })

  describe('page layout & controls', () => {
    it('uses PageHeader with bilingual titles', () => {
      expect(pageSource).toContain('title-zh="导师资料变更审核"')
      expect(pageSource).toContain('title-en="Mentor Profile Change Review"')
    })

    it('exposes status filter with 3 options + search/reset buttons', () => {
      expect(pageSource).toContain('placeholder="全部状态"')
      expect(pageSource).toContain('<a-select-option value="pending">待审核</a-select-option>')
      expect(pageSource).toContain('<a-select-option value="approved">已通过</a-select-option>')
      expect(pageSource).toContain('<a-select-option value="rejected">已驳回</a-select-option>')
      expect(pageSource).toContain('@click="loadList"')
      expect(pageSource).toContain('@click="handleReset"')
    })

    it('table declares 9 columns including 请求 ID / 导师 userId / 变更字段 / 状态 / 提交人 / 提交时间 / 审核人 / 审核时间 / 操作', () => {
      // 仅匹配 columns 数组形如「{ title: 'X', dataIndex: 'Y' ...」的列定义，跳过 Modal.confirm 标题
      const matches = pageSource.match(/\{\s*title:\s*'([^']+)',\s*dataIndex:/g) || []
      const titles = matches.map((m) => m.replace(/.*title:\s*'([^']+)',.*/, '$1'))
      expect(titles).toEqual([
        '请求 ID',
        '导师 userId',
        '变更字段',
        '状态',
        '提交人',
        '提交时间',
        '审核人',
        '审核时间',
        '操作',
      ])
    })

    it('first column 请求 ID fixed left, last column 操作 fixed right', () => {
      expect(pageSource).toMatch(/title:\s*'请求 ID'[^}]*fixed:\s*'left'/s)
      expect(pageSource).toMatch(/title:\s*'操作'[^}]*fixed:\s*'right'/s)
    })

    it('pending row shows three actions: 查看 / 通过 / 驳回; non-pending shows only 查看', () => {
      expect(pageSource).toContain('@click="openDetail(record)"')
      expect(pageSource).toContain('@click="handleApprove(record)"')
      expect(pageSource).toContain('@click="openReject(record)"')
      expect(pageSource).toContain("v-if=\"record.status === 'pending'\"")
    })
  })

  describe('approve flow', () => {
    it('approve goes through Modal.confirm for safety', () => {
      expect(pageSource).toContain('Modal.confirm({')
      expect(pageSource).toContain('确认通过请求')
      expect(pageSource).toContain('通过后变更内容会写入导师账号')
    })

    it('approve calls approveMentorChangeRequest then reloads list', () => {
      expect(pageSource).toMatch(/approveMentorChangeRequest\(record\.requestId\)/)
      expect(pageSource).toContain("message.success('已通过')")
      expect(pageSource).toMatch(/onOk:[\s\S]+await loadList\(\)/)
    })
  })

  describe('reject flow', () => {
    it('reject opens a modal with required reason textarea', () => {
      expect(pageSource).toContain('v-model:open="rejectOpen"')
      expect(pageSource).toContain('placeholder="请输入驳回原因"')
      expect(pageSource).toContain('v-model:value="rejectForm.reason"')
    })

    it('reject requires non-empty reason before calling API', () => {
      expect(pageSource).toContain("message.warning('请填写驳回原因')")
      expect(pageSource).toMatch(/rejectMentorChangeRequest\(rejectTarget\.value\.requestId,\s*\{\s*reason\s*\}\)/)
      expect(pageSource).toContain("message.success('已驳回')")
    })
  })

  describe('detail modal', () => {
    it('opens detail modal showing payloadJson formatted', () => {
      expect(pageSource).toContain('v-model:open="detailOpen"')
      expect(pageSource).toContain('title="变更详情"')
      expect(pageSource).toContain('formatPayload(selectedRecord.payloadJson)')
      expect(pageSource).toContain('class="mcr-detail__pre"')
    })

    it('shows reject remark only when status === rejected', () => {
      expect(pageSource).toMatch(/v-if="selectedRecord\.status === 'rejected' && selectedRecord\.remark"/)
    })
  })

  describe('summary formatting', () => {
    it('translates field keys (nickName/sex/phonenumber/email/remark/region/city) to Chinese labels', () => {
      const expectedKeys = ['nickName', 'sex', 'phonenumber', 'email', 'remark', 'region', 'city']
      for (const key of expectedKeys) {
        expect(pageSource).toContain(key)
      }
      expect(pageSource).toContain('昵称')
      expect(pageSource).toContain('手机号')
      expect(pageSource).toContain('邮箱')
    })

    it('RULE-E: status label and color do not leak english fallback', () => {
      // statusLabel 返回 '-' if unknown，不返回 status value
      expect(pageSource).toContain("if (status === 'pending') return '待审核'")
      expect(pageSource).toContain("if (status === 'approved') return '已通过'")
      expect(pageSource).toContain("if (status === 'rejected') return '已驳回'")
      expect(pageSource).toContain("return '-'")
    })
  })
})
