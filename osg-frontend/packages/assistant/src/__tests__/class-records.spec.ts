import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assistant class records page', () => {
  it('source aligns with Admin Ant Design shell and prototype design', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../views/class-records/index.vue'),
      'utf-8',
    )

    // ── CR-1~3: PageHeader + 根容器（已迁移到 @osg/shared，D-Bilingual P1） ──
    expect(src).toContain('<PageHeader')
    expect(src).toContain('title-zh="课程记录"')
    expect(src).toContain('title-en="Class Records"')
    expect(src).toContain(':description="scopeDescription"')

    // ── CR-2: 使用 osg-page 全局布局 class（对齐助教端公共样式）──
    expect(src).toContain('class="osg-page"')

    // ── CR-2: import PageHeader + 图标 + AntDv types ──
    expect(src).toContain("import { PageHeader } from '@osg/shared/components/PageHeader'")
    expect(src).toContain('SearchOutlined')
    expect(src).toContain('ReloadOutlined')
    expect(src).toContain('TableColumnsType')
    expect(src).toContain('TablePaginationConfig')

    // ── CR-3: 使用 Ant Design Vue 组件 ──
    expect(src).toContain('<a-card')
    expect(src).toContain('<a-table')
    expect(src).toContain('<a-tag')
    expect(src).toContain('<a-input')
    expect(src).toContain('<a-select')
    expect(src).toContain('<a-button')
    expect(src).toContain('<a-alert')
    expect(src).toContain('<a-tabs')
    expect(src).toContain('<a-tab-pane')
    expect(src).toContain('<a-badge')
    expect(src).toContain('<a-range-picker')
    expect(src).toContain('<a-modal')
    expect(src).toContain('<a-descriptions')
    expect(src).toContain('<a-statistic')
    expect(src).toContain('<a-space')

    // ── CR-37~38: Flow banner（a-alert type=info + 动态 flowSteps） ──
    expect(src).toContain('class="flow-alert"')
    expect(src).toContain('flowSteps')
    expect(src).toContain('defaultFlowSteps')
    expect(src).toContain("'课程执行'")
    expect(src).toContain("'记录提交'")
    expect(src).toContain("'审核处理'")
    expect(src).toContain("'反馈回看'")

    // ── CR-4~5: 4 张统计卡 + valueStyleMap ──
    expect(src).toContain('summaryCards')
    expect(src).toContain('valueStyleMap')
    expect(src).toContain("key: 'all', label: '全部课程'")
    expect(src).toContain("key: 'pending', label: '待审核'")
    expect(src).toContain("key: 'approved', label: '已通过'")
    expect(src).toContain("label: '待结算金额'")
    // 4 个卡片对应 4 种色值
    expect(src).toContain("color: '#1E293B'") // all
    expect(src).toContain("color: '#F59E0B'") // pending
    expect(src).toContain("color: '#22C55E'") // approved
    expect(src).toContain("color: '#1D4ED8'") // settlement

    // ── CR-6: 筛选卡（对齐助教端公共约定） ──
    expect(src).toContain('class="filter-card"')
    expect(src).toContain('class="filters"')

    // ── CR-7: 搜索框（placeholder 保留原型文案，偏离 #9 提示 ID 搜索不生效） ──
    expect(src).toContain('id="assistant-class-records-keyword"')
    expect(src).toContain('placeholder="搜索学员姓名/ID"')

    // ── CR-8: 辅导类型 select（3 项对齐 DB osg_class_record.course_type） ──
    expect(src).toContain("{ value: 'job_coaching', label: '岗位辅导' }")
    expect(src).toContain("{ value: 'mock_practice', label: '模拟应聘' }")
    expect(src).toContain("{ value: 'basic_course', label: '基础课程' }")

    // ── CR-9: 课程内容 select（9 项对齐 DB osg_class_record.class_status + 弹窗 jobContentOptions/basicContentOptions） ──
    expect(src).toContain("{ value: 'technical', label: '技术的' }")
    expect(src).toContain("{ value: 'behavioral', label: '行为训练' }")
    expect(src).toContain("{ value: 'resume_update', label: '简历更新' }")
    expect(src).toContain("{ value: 'mock_interview', label: '模拟面试的课程' }")
    expect(src).toContain("{ value: 'networking_midterm', label: '人际关系的课程' }")
    expect(src).toContain("{ value: 'mock_midterm', label: '模拟期中考试' }")
    expect(src).toContain("{ value: 'case_prep', label: '咨询案例准备' }")
    expect(src).toContain("{ value: 'other', label: '其他' }")
    expect(src).toContain("{ value: 'absent', label: '旷课' }")
    // 新简历已从弹窗 + 列表删除
    expect(src).not.toContain("'new_resume'")
    expect(src).not.toContain("'新简历'")

    // ── CR-10: 申报人 select（3 项角色类型 raw key，偏离 #5 改角色类型） ──
    expect(src).toContain("{ value: 'mentor', label: '导师' }")
    expect(src).toContain("{ value: 'headteacher', label: '班主任' }")
    expect(src).toContain("{ value: 'assistant', label: '助教' }")

    // ── CR-11: 日期范围 picker（偏离 #4 改日期范围选择器） ──
    expect(src).toContain('<a-range-picker')
    expect(src).toContain('value-format="YYYY-MM-DD"')
    expect(src).toContain('classDateRange')

    // ── CR-12: 筛选按钮 ──
    expect(src).toContain('id="assistant-class-records-search"')
    expect(src).toContain('id="assistant-class-records-reset"')

    // ── CR-13~16: Status Tabs + tabCount Badge ──
    expect(src).toContain('tabList')
    expect(src).toContain("key: 'all', label: '全部'")
    expect(src).toContain("key: 'pending', label: '待审核'")
    expect(src).toContain("key: 'approved', label: '已通过'")
    expect(src).toContain("key: 'rejected', label: '已驳回'")
    expect(src).toContain('tabCount')
    expect(src).toContain('handleTabChange')
    expect(src).toContain('activeTab')

    // ── CR-16: tabCount 基于全局 stats（切 tab 时 badge 保持稳定），不基于 records ──
    expect(src).toContain('s.totalCount')
    expect(src).toContain('s.pendingCount')
    expect(src).toContain('s.approvedCount')
    expect(src).toContain('s.rejectedCount')

    // ── CR-40: loadStats 必须剥离 tab 字段（stats 是全局统计，不被 tab 过滤） ──
    expect(src).toContain('const { tab: _ignoredTab, ...statsParams } = params')
    expect(src).toContain('loadStats(statsParams')

    // ── CR-17~27: Table 11 列定义 ──
    expect(src).toContain("key: 'recordId'")
    expect(src).toContain("key: 'student'")
    expect(src).toContain("key: 'reporter'")
    expect(src).toContain("key: 'coachingType'")
    expect(src).toContain("key: 'courseContent'")
    expect(src).toContain("key: 'classDate'")
    expect(src).toContain("key: 'durationHours'")
    expect(src).toContain("key: 'courseFee'")
    expect(src).toContain("key: 'studentRating'")
    expect(src).toContain("key: 'status'")
    expect(src).toContain("key: 'action'")

    // ── CR-17~27: 列标题 ──
    expect(src).toContain("title: '记录ID'")
    expect(src).toContain("title: '学员'")
    expect(src).toContain("title: '申报人'")
    expect(src).toContain("title: '辅导内容'")
    expect(src).toContain("title: '课程内容'")
    expect(src).toContain("title: '上课日期'")
    expect(src).toContain("title: '时长'")
    expect(src).toContain("title: '课时费'")
    expect(src).toContain("title: '学员评价'")
    expect(src).toContain("title: '审核状态'")
    expect(src).toContain("title: '操作'")

    // ── CR-17: 记录ID 列用 a-tag 包裹（对齐 student-list 风格） ──
    expect(src).toContain('<a-tag color="blue">#{{ record.recordCode || `R${record.recordId}` }}</a-tag>')

    // ── CR-20: 辅导内容列 tag 色（中文 label 主键，包含 3 种颜色 blue/green/purple） ──
    expect(src).toContain('coachingTypeColor')
    expect(src).toContain("normalized === '岗位辅导'")
    expect(src).toContain("normalized === '模拟应聘'")
    expect(src).toContain("normalized === '基础课程'")

    // ── CR-21: 课程内容 tag style（中文 label 主键，对齐弹窗 + 后端 toCourseContentLabel） ──
    expect(src).toContain('contentTagStyle')
    expect(src).toContain('contentTagStyleMap')
    expect(src).toContain("'技术的'")
    expect(src).toContain("'行为训练'")
    expect(src).toContain("'简历更新'")
    expect(src).toContain("'模拟面试的课程'")
    expect(src).toContain("'人际关系的课程'")
    expect(src).toContain("'模拟期中考试'")
    expect(src).toContain("'咨询案例准备'")
    expect(src).toContain("'其他'")
    expect(src).toContain("'旷课'")
    expect(src).toContain('#DBEAFE') // 技术的/行为训练/模拟面试的课程/咨询案例准备 bg
    expect(src).toContain('#FEF3C7') // 简历更新 bg
    expect(src).toContain('#EDE9FE') // 人际关系的课程 bg
    expect(src).toContain('#FEE2E2') // 旷课 bg

    // ── CR-22: 上课日期 MM/DD/YYYY 格式 ──
    expect(src).toContain('formatClassDate')

    // ── CR-24: 审核状态由 shared ClassRecordStatusTag 接管（M4 P3+P4）──
    // 替代原 statusTagColor + statusLabel 本地函数
    expect(src).toContain("import { ClassRecordStatusTag } from '@osg/shared/components'")
    expect(src).toContain('<ClassRecordStatusTag :status="record.status" />')
    expect(src).toContain('<ClassRecordStatusTag :status="selectedRecord.status" />')

    // ── CR-32: Modal Descriptions column=2 span 平衡（审核状态独占行避免 AntDv warning） ──
    expect(src).toContain('<a-descriptions-item label="审核状态" :span="2">')

    // ── CR-28: 操作列按钮（按 status 切换文案，偏离 #7 单 modal） ──
    expect(src).toContain("record.status === 'rejected' ? '查看原因' : '查看详情'")

    // ── CR-28: rejected 行高亮 ──
    expect(src).toContain('rowClassName')
    expect(src).toContain("'rejected-row'")

    // ── CR-29~33: 详情 Modal ──
    expect(src).toContain('v-model:open="detailVisible"')
    expect(src).toContain('openDetail')
    expect(src).toContain('closeDetail')
    expect(src).toContain('selectedRecord')

    // ── Absent 契约: 辅导内容为空时不显示 a-tag（避免空 tag） ──
    expect(src).toContain('<a-tag v-if="record.coachingType"')
    expect(src).toContain('<a-tag v-if="selectedRecord.coachingType"')

    // ── Absent 契约: 详情 Modal 新增"旷课备注"行，仅 absent 记录显示 ──
    expect(src).toContain('v-if="selectedRecord.classStatus === \'absent\'"')
    expect(src).toContain('label="旷课备注"')
    expect(src).toContain('extractAbsenceRemark(selectedRecord.comments)')

    // ── Absent 契约: extractAbsenceRemark 从 comments 解析旷课备注段 ──
    expect(src).toContain('function extractAbsenceRemark')
    expect(src).toContain('/旷课备注:')

    // ── CR-34~36: 分页 + 翻页持久化 ──
    expect(src).toContain('tablePagination')
    expect(src).toContain('handleTableChange')
    expect(src).toContain('pageSize')
    expect(src).toContain('showTotal')
    expect(src).toContain('pageSizeOptions')

    // ── CR-35~36: 持久化 + 状态管理 ──
    expect(src).toContain('STORAGE_KEY')
    expect(src).toContain('osg-assistant-class-records-state-v1')
    expect(src).toContain('persistState')
    expect(src).toContain('restoreState')

    // ── CR-39: 前后端参数名映射（buildQueryParams） ──
    expect(src).toContain('buildQueryParams')
    expect(src).toContain('courseType: filters.coachingType')
    expect(src).toContain('classStatus: filters.courseContent')
    expect(src).toContain('courseSource: filters.reporterRole')

    // ── CR-40: tab='all' 时不传给后端 ──
    expect(src).toContain("activeTab.value !== 'all'")

    // ── CR-41: 错误提示（精确文案对齐公共 error-alert class） ──
    expect(src).toContain('class="error-alert"')
    expect(src).toContain("'课程记录加载失败'")

    // ── CR-14: 空表格文案 ──
    expect(src).toContain('当前筛选下暂无课程记录')

    // ── 保留 API 调用 ──
    expect(src).toContain('getAssistantClassRecordList')
    expect(src).toContain('getAssistantClassRecordStats')

    // ── 对齐助教端公共样式约定 ──
    expect(src).toContain('class="filter-card"')
    expect(src).toContain('class="filters"')
    expect(src).toContain('class="error-alert"')
    expect(src).toContain('class="table-card"')

    // ── 不再包含旧自制 class / 组件 ──
    expect(src).not.toContain('class="class-records-page"')
    expect(src).not.toContain('id="page-myclass"')
    expect(src).not.toContain('class="page-header"')
    expect(src).not.toContain('class="flow-banner"')
    expect(src).not.toContain('class="toolbar-card"')
    expect(src).not.toContain('class="summary-card"')
    expect(src).not.toContain('class="state-card"')
    expect(src).not.toContain('class="panel-card"')
    expect(src).not.toContain('class="data-table"')
    expect(src).not.toContain('class="primary-button"')
    expect(src).not.toContain('class="toolbar-field"')
    expect(src).not.toContain('<table class="data-table')
    expect(src).not.toContain('<select v-model="filters.status"')

    // ── 助教端只读原则：不包含 admin 的审批操作 ──
    expect(src).not.toContain('敬请期待')

    // ── DR-1: 双主 Tab（scope tabs） ──
    expect(src).toContain('activeScope')
    expect(src).toContain('class="scope-tabs"')
    expect(src).toContain('我的申报')
    expect(src).toContain('我管理的学员')
    expect(src).toContain('handleScopeChange')

    // ── DR-2: scope 默认值 mine ──
    expect(src).toContain("const activeScope = ref<string>('mine')")

    // ── DR-3: scope 注入 buildQueryParams ──
    expect(src).toContain("scope: activeScope.value as 'mine' | 'managed'")

    // ── DR-4: scopeCount 读取 mineCount / managedCount ──
    expect(src).toContain('scopeCount')
    expect(src).toContain('s.mineCount')
    expect(src).toContain('s.managedCount')

    // ── DR-5: 上报课程记录按钮（PageHeader actions slot） ──
    expect(src).toContain('PlusOutlined')
    expect(src).toContain('上报课程记录')
    expect(src).toContain('openReportModal')

    // ── DR-6: Modal 集成 ──
    expect(src).toContain('AssistantClassReportFlowModal')
    expect(src).toContain('reportModalOpen')
    expect(src).toContain('v-model:open="reportModalOpen"')

    // ── DR-7: 提交成功回调（智能切子 Tab） ──
    expect(src).toContain('handleReportSubmitted')
    expect(src).toContain("activeTab.value === 'approved' || activeTab.value === 'rejected'")

    // ── DR-8: localStorage 持久化 activeScope ──
    expect(src).toContain('activeScope: activeScope.value')
    expect(src).toContain('if (payload.activeScope) activeScope.value = payload.activeScope')

    // ── DR-9: scopeDescription 动态文案 ──
    expect(src).toContain('scopeDescription')
    expect(src).toContain('查看我申报的课程记录')
    expect(src).toContain('查看我管理学员的课程记录')
  })
})
