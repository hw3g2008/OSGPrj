import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assistant student list page', () => {
  it('source aligns with Admin Ant Design shell and prototype design', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../views/students/index.vue'),
      'utf-8',
    )

    // SL-1: PageHeader 复用 admin 风格组件（description 严格采用原型文案）
    expect(src).toContain('<PageHeader')
    expect(src).toContain('title="学员列表"')
    expect(src).toContain('subtitle="Student List"')
    expect(src).toContain('description="查看我教的学员和助教为我的全部学员信息及求职数据"')

    // SL-1: 使用 osg-page 全局布局 class
    expect(src).toContain('class="osg-page"')

    // SL-2: import PageHeader + 图标
    expect(src).toContain("import PageHeader from '@/components/PageHeader.vue'")
    expect(src).toContain('SearchOutlined')
    expect(src).toContain('ReloadOutlined')

    // SL-3: 使用 Ant Design Vue 组件（对齐 admin 框架）
    expect(src).toContain('<a-card')
    expect(src).toContain('<a-table')
    expect(src).toContain('<a-tag')
    expect(src).toContain('<a-input')
    expect(src).toContain('<a-select')
    expect(src).toContain('<a-button')
    expect(src).toContain('<a-alert')
    expect(src).toContain('<a-tooltip')

    // SL-3: 筛选输入框（姓名 + 学校）
    expect(src).toContain('id="assistant-students-keyword"')
    expect(src).toContain('placeholder="搜索姓名"')
    expect(src).toContain('placeholder="学校"')
    expect(src).toContain('placeholder="主攻方向"')
    expect(src).toContain('placeholder="账号状态"')

    // SL-3: 账号状态选项（原型增强保留）
    expect(src).toContain("{ value: '0', label: '正常' }")
    expect(src).toContain("{ value: '1', label: '冻结' }")
    expect(src).toContain("{ value: '2', label: '已结束' }")
    expect(src).toContain("{ value: '3', label: '退款' }")

    // SL-4: 筛选按钮（「搜索」+「重置」按原型文案）
    expect(src).toContain('id="assistant-students-search"')
    expect(src).toContain('id="assistant-students-reset"')
    expect(src).toContain('搜索\n        </a-button>')
    expect(src).toContain('重置\n        </a-button>')

    // SL-5: 「学员类型」筛选 TODO 注释（偏离 #1）
    expect(src).toContain('TODO')
    expect(src).toContain('学员类型')

    // SL-7: columns 列顺序（最终 14 列）
    expect(src).toContain("key: 'studentId'")
    expect(src).toContain("key: 'studentName'")
    expect(src).toContain("key: 'email'")
    expect(src).toContain("key: 'leadMentorName'")
    expect(src).toContain("key: 'school'")
    expect(src).toContain("key: 'majorDirection'")
    expect(src).toContain("key: 'jobCoachingCount'")
    expect(src).toContain("key: 'basicCourseCount'")
    expect(src).toContain("key: 'mockInterviewCount'")
    expect(src).toContain("key: 'remainingHours'")
    expect(src).toContain("key: 'targetPosition'")
    expect(src).toContain("key: 'contractStatus'")
    expect(src).toContain("key: 'accountStatus'")
    expect(src).toContain("key: 'action'")

    // SL-7: 列标题按原型/当前命名
    expect(src).toContain("title: 'ID'")
    expect(src).toContain("title: '英文姓名'")
    expect(src).toContain("title: '邮箱'")
    expect(src).toContain("title: '班主任'")
    expect(src).toContain("title: '学校'")
    expect(src).toContain("title: '主攻方向'")
    expect(src).toContain("title: '求职辅导'")
    expect(src).toContain("title: '基础课'")
    expect(src).toContain("title: '模拟应聘'")
    expect(src).toContain("title: '剩余课时'")
    expect(src).toContain("title: '求职目标'")
    expect(src).toContain("title: '服务状态'")
    expect(src).toContain("title: '账号状态'")
    expect(src).toContain("title: '操作'")

    // SL-8: ID 列用 a-tag 包裹（原型增强对齐 Admin 风格）
    expect(src).toContain('<a-tag color="blue">#{{ record.studentId }}</a-tag>')

    // SL-8: 主攻方向色 tag
    expect(src).toContain('direction-tag--consulting')
    expect(src).toContain('direction-tag--tech')
    expect(src).toContain('direction-tag--quant')

    // SL-8: 求职辅导/基础课/模拟应聘彩色数字
    expect(src).toContain('metric--delivery')
    expect(src).toContain('metric--interview')
    expect(src).toContain('metric--offer')

    // SL-8: 剩余课时条件色（≥8h 绿 / <8h 红 / 0h 灰）
    expect(src).toContain('remaining-hours--success')
    expect(src).toContain('remaining-hours--warning')
    expect(src).toContain('remaining-hours--muted')

    // SL-8: 服务状态 stack 布局（合同Tag + 待审核Tag + 提醒）
    expect(src).toContain('status-stack')
    expect(src).toContain('待审核')
    expect(src).toContain('status-hint')

    // SL-8: 操作列「查看求职」link
    expect(src).toContain('查看求职')

    // SL-9: a-table 内置分页（showTotal 格式「共 N 条记录」）
    expect(src).toContain('showTotal')
    expect(src).toContain('共 ${t} 条记录')
    expect(src).toContain('handleTableChange')

    // SL-10: 横向滚动（列较多）
    expect(src).toContain(":scroll=\"{ x: 'max-content' }\"")

    // SL-11: 空状态文案
    expect(src).toContain('暂无可查看学员')

    // SL-12: 错误状态使用 a-alert
    expect(src).toContain('type="error"')
    expect(src).toContain('学员列表加载失败')

    // SL-14: 保留现有业务逻辑函数
    expect(src).toContain('formatCount')
    expect(src).toContain('formatHours')
    expect(src).toContain('formatMentor')
    expect(src).toContain('formatAccountStatus')
    expect(src).toContain('formatContractStatus')
    expect(src).toContain('formatReminder')
    expect(src).toContain('directionToneClass')
    expect(src).toContain('remainingHoursToneClass')

    // SL-16: localStorage 持久化保留
    expect(src).toContain('assistant-student-list-state')
    expect(src).toContain('applyPersistedState')
    expect(src).toContain('persistState')

    // 保留 API 调用与跳转
    expect(src).toContain('getAssistantStudentList')
    expect(src).toContain('handleViewJob')
    expect(src).toContain('/career/job-overview')

    // 账号状态 tone（正常/冻结/已结束/退款）
    expect(src).toContain('status-tag--active')
    expect(src).toContain('status-tag--frozen')
    expect(src).toContain('status-tag--muted')

    // 不再包含原生 HTML 表格元素
    expect(src).not.toContain('<table class="table">')
    expect(src).not.toContain('<thead>')
    expect(src).not.toContain('class="pager-btn"')
    expect(src).not.toContain('class="page-footer"')

    // 助教端只读原则：不包含 Admin 的管理操作
    expect(src).not.toContain('新增学员')
    expect(src).not.toContain('编辑学员')
    expect(src).not.toContain('重置密码')
  })
})
