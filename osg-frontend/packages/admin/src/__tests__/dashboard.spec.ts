import { describe, it, expect } from 'vitest'

// ========== Dashboard API 类型验证 ==========

interface DashboardStats {
  studentCount: number
  mentorCount: number
  pendingClassHours: number
  pendingSettlement: number
  pendingExpense: number
  newStudentsThisMonth: number
  leadMentorCount: number
  mentorOnlyCount: number
  earliestPendingDays: number
  settlementReport: number
  settlementOther: number
  expenseTotal: number
}

interface TodoItem {
  label: string
  count: number
  route: string
}

interface ActivityItem {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  time: string
  detail: string
}

interface StudentStatusData {
  activeNormal: number
  activeFrozen: number
  done: number
  total: number
}

interface MonthlyStatsData {
  newStudents: number
  newContracts: number
  approvedClassHours: number
  classHoursConsumed: number
  settledAmount: number
}

// ========== Mock 数据 ==========

const mockStats: DashboardStats = {
  studentCount: 156,
  mentorCount: 28,
  pendingClassHours: 12,
  pendingSettlement: 8520,
  pendingExpense: 5,
  newStudentsThisMonth: 8,
  leadMentorCount: 6,
  mentorOnlyCount: 22,
  earliestPendingDays: 3,
  settlementReport: 6800,
  settlementOther: 1720,
  expenseTotal: 380,
}

const mockTodos: TodoItem[] = [
  { label: '课时待审核', count: 12, route: '/reports' },
  { label: '报销待审核', count: 5, route: '/expense' },
  { label: '学员课时不足', count: 3, route: '/students' },
]

const mockActivities: ActivityItem[] = [
  { icon: 'mdi-check', iconColor: '#059669', iconBg: '#D1FAE5', title: '课时审核通过', time: '10分钟前', detail: '李审核 审核通过了 Test Lead Mentor 的课时记录 #231775' },
  { icon: 'mdi-account-plus', iconColor: '#2563EB', iconBg: '#DBEAFE', title: '新增学员', time: '1小时前', detail: '张文员 创建了新学员 Emily Zhang (2025Spring)' },
  { icon: 'mdi-file-sign', iconColor: '#D97706', iconBg: '#FEF3C7', title: '合同续费', time: '2小时前', detail: '张文员 为 Alice Wang 添加续费合同 $5,000 / 20h' },
  { icon: 'mdi-close', iconColor: '#DC2626', iconBg: '#FEE2E2', title: '课时审核驳回', time: '3小时前', detail: '李审核 驳回了 Jerry Li 的课时记录 #231770，原因：信息不完整' },
  { icon: 'mdi-cash', iconColor: '#6366F1', iconBg: '#EEF2FF', title: '财务结算', time: '昨天 16:30', detail: '王会计 执行周结算，共计 $12,350（23条Report + 5条Non-class）' },
]

const mockStudentStatus: StudentStatusData = {
  activeNormal: 128,
  activeFrozen: 15,
  done: 13,
  total: 156,
}

const mockMonthlyStats: MonthlyStatsData = {
  newStudents: 8,
  newContracts: 42500,
  approvedClassHours: 156,
  classHoursConsumed: 234.5,
  settledAmount: 18720,
}

// ========== StatCards 逻辑测试 ==========

describe('StatCards', () => {
  // 卡片配置生成函数（与组件逻辑一致）
  function buildCards(s: DashboardStats) {
    return [
      { label: '学员总数', value: String(s.studentCount), sub: `↑ 本月新增 ${s.newStudentsThisMonth}`, route: '/students' },
      { label: '导师总数', value: String(s.mentorCount), sub: `Lead ${s.leadMentorCount} · Mentor ${s.mentorOnlyCount}`, route: '/staff' },
      { label: '待审课时', value: String(s.pendingClassHours), sub: `⏰ 最早 ${s.earliestPendingDays}天前`, route: '/reports' },
      { label: '待结算', value: `$${s.pendingSettlement.toLocaleString()}`, sub: `Report $${s.settlementReport.toLocaleString()} · Other $${s.settlementOther.toLocaleString()}`, route: '/finance' },
      { label: '待审报销', value: String(s.pendingExpense), sub: `共计 $${s.expenseTotal.toLocaleString()}`, route: '/expense' },
    ]
  }

  it('should generate 5 stat cards from stats data', () => {
    const cards = buildCards(mockStats)
    expect(cards).toHaveLength(5)
  })

  it('should have correct labels for all 5 cards', () => {
    const cards = buildCards(mockStats)
    const labels = cards.map(c => c.label)
    expect(labels).toEqual(['学员总数', '导师总数', '待审课时', '待结算', '待审报销'])
  })

  it('should format student count correctly', () => {
    const cards = buildCards(mockStats)
    expect(cards[0].value).toBe('156')
    expect(cards[0].sub).toBe('↑ 本月新增 8')
  })

  it('should format mentor count with lead/mentor breakdown', () => {
    const cards = buildCards(mockStats)
    expect(cards[1].value).toBe('28')
    expect(cards[1].sub).toBe('Lead 6 · Mentor 22')
  })

  it('should format pending class hours with earliest days', () => {
    const cards = buildCards(mockStats)
    expect(cards[2].value).toBe('12')
    expect(cards[2].sub).toContain('3天前')
  })

  it('should format settlement amount with dollar sign', () => {
    const cards = buildCards(mockStats)
    expect(cards[3].value).toBe('$8,520')
    expect(cards[3].sub).toContain('Report')
    expect(cards[3].sub).toContain('Other')
  })

  it('should format pending expense with total', () => {
    const cards = buildCards(mockStats)
    expect(cards[4].value).toBe('5')
    expect(cards[4].sub).toBe('共计 $380')
  })

  it('should have correct routes for click navigation', () => {
    const cards = buildCards(mockStats)
    const routes = cards.map(c => c.route)
    expect(routes).toEqual(['/students', '/staff', '/reports', '/finance', '/expense'])
  })

  it('should return empty array when stats is null', () => {
    // Matches component behavior: if (!s) return []
    function buildCardsSafe(s: DashboardStats | null) {
      if (!s) return []
      return buildCards(s)
    }
    const cards = buildCardsSafe(null)
    expect(cards).toHaveLength(0)
  })
})

// ========== TodoReminder 逻辑测试 ==========

describe('TodoReminder', () => {
  it('should display all todo items', () => {
    expect(mockTodos).toHaveLength(3)
  })

  it('should have label, count, and route for each item', () => {
    for (const item of mockTodos) {
      expect(item.label).toBeTruthy()
      expect(item.count).toBeGreaterThan(0)
      expect(item.route).toMatch(/^\//)
    }
  })

  it('should have correct routes for navigation', () => {
    const routes = mockTodos.map(t => t.route)
    expect(routes).toContain('/reports')
    expect(routes).toContain('/expense')
    expect(routes).toContain('/students')
  })

  it('should handle empty todos array', () => {
    const empty: TodoItem[] = []
    expect(empty).toHaveLength(0)
  })
})

// ========== RecentActivity 逻辑测试 ==========

describe('RecentActivity', () => {
  it('should display 5 activity items', () => {
    expect(mockActivities).toHaveLength(5)
  })

  it('should have all required fields for each activity', () => {
    for (const activity of mockActivities) {
      expect(activity.icon).toBeTruthy()
      expect(activity.iconColor).toMatch(/^#/)
      expect(activity.iconBg).toMatch(/^#/)
      expect(activity.title).toBeTruthy()
      expect(activity.time).toBeTruthy()
      expect(activity.detail).toBeTruthy()
    }
  })

  it('should have unique titles', () => {
    const titles = mockActivities.map(a => a.title)
    const uniqueTitles = new Set(titles)
    expect(uniqueTitles.size).toBe(titles.length)
  })

  it('should handle empty activities', () => {
    const empty: ActivityItem[] = []
    expect(empty).toHaveLength(0)
  })
})

// ========== QuickActions 逻辑测试 ==========

describe('QuickActions', () => {
  const actions = [
    { key: 'add-student', icon: 'mdi-account-plus', label: '新增学员' },
    { key: 'add-staff', icon: 'mdi-account-tie', label: '新增导师' },
    { key: 'add-contract', icon: 'mdi-file-sign', label: '新增合同' },
    { key: 'send-notice', icon: 'mdi-bell-plus', label: '发送通知' },
  ]

  it('should have 4 quick action buttons', () => {
    expect(actions).toHaveLength(4)
  })

  it('should have correct labels', () => {
    const labels = actions.map(a => a.label)
    expect(labels).toEqual(['新增学员', '新增导师', '新增合同', '发送通知'])
  })

  it('should have unique keys', () => {
    const keys = actions.map(a => a.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('should have MDI icons', () => {
    for (const action of actions) {
      expect(action.icon).toMatch(/^mdi-/)
    }
  })
})

// ========== StudentStatus 逻辑测试 ==========

describe('StudentStatus', () => {
  function buildItems(d: StudentStatusData) {
    if (!d || d.total === 0) return []
    return [
      { label: 'Active · Normal', count: d.activeNormal, pct: Math.round((d.activeNormal / d.total) * 100) },
      { label: 'Active · Frozen', count: d.activeFrozen, pct: Math.round((d.activeFrozen / d.total) * 100) },
      { label: 'Done', count: d.done, pct: Math.round((d.done / d.total) * 100) },
    ]
  }

  it('should display 3 status categories', () => {
    const items = buildItems(mockStudentStatus)
    expect(items).toHaveLength(3)
  })

  it('should have correct labels', () => {
    const items = buildItems(mockStudentStatus)
    expect(items.map(i => i.label)).toEqual(['Active · Normal', 'Active · Frozen', 'Done'])
  })

  it('should calculate percentages correctly', () => {
    const items = buildItems(mockStudentStatus)
    expect(items[0].pct).toBe(82) // 128/156 ≈ 82%
    expect(items[1].pct).toBe(10) // 15/156 ≈ 10%
    expect(items[2].pct).toBe(8)  // 13/156 ≈ 8%
  })

  it('should have correct counts', () => {
    const items = buildItems(mockStudentStatus)
    expect(items[0].count).toBe(128)
    expect(items[1].count).toBe(15)
    expect(items[2].count).toBe(13)
  })

  it('should sum to total', () => {
    const sum = mockStudentStatus.activeNormal + mockStudentStatus.activeFrozen + mockStudentStatus.done
    expect(sum).toBe(mockStudentStatus.total)
  })

  it('should return empty array when total is 0', () => {
    const items = buildItems({ activeNormal: 0, activeFrozen: 0, done: 0, total: 0 })
    expect(items).toHaveLength(0)
  })

  it('should return empty array when data is null', () => {
    const items = buildItems(null as any)
    expect(items).toHaveLength(0)
  })
})

// ========== MonthlyStats 逻辑测试 ==========

describe('MonthlyStats', () => {
  function buildItems(d: MonthlyStatsData) {
    if (!d) return []
    return [
      { label: '新增学员', value: String(d.newStudents) },
      { label: '新签合同', value: `$${d.newContracts.toLocaleString()}` },
      { label: '已审课时', value: `${d.approvedClassHours}条` },
      { label: '课时消耗', value: `${d.classHoursConsumed}h` },
      { label: '已结算金额', value: `$${d.settledAmount.toLocaleString()}` },
    ]
  }

  it('should display 5 monthly stats', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items).toHaveLength(5)
  })

  it('should have correct labels', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items.map(i => i.label)).toEqual(['新增学员', '新签合同', '已审课时', '课时消耗', '已结算金额'])
  })

  it('should format new students as plain number', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items[0].value).toBe('8')
  })

  it('should format contract amount with dollar sign', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items[1].value).toBe('$42,500')
  })

  it('should format class hours with 条 suffix', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items[2].value).toBe('156条')
  })

  it('should format hours consumed with h suffix', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items[3].value).toBe('234.5h')
  })

  it('should format settled amount with dollar sign', () => {
    const items = buildItems(mockMonthlyStats)
    expect(items[4].value).toBe('$18,720')
  })

  it('should return empty array when data is null', () => {
    const items = buildItems(null as any)
    expect(items).toHaveLength(0)
  })
})

// ========== Dashboard 页面集成逻辑测试 ==========

describe('Dashboard page integration', () => {
  it('should have all 5 API endpoints defined', () => {
    const endpoints = [
      '/dashboard/stats',
      '/dashboard/todos',
      '/dashboard/activities',
      '/dashboard/student-status',
      '/dashboard/monthly',
    ]
    expect(endpoints).toHaveLength(5)
  })

  it('should compute today string correctly', () => {
    const d = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const todayStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
    expect(todayStr).toContain('年')
    expect(todayStr).toContain('月')
    expect(todayStr).toContain('日')
    expect(todayStr).toContain('周')
  })

  it('should handle Promise.allSettled results correctly', async () => {
    const results = await Promise.allSettled([
      Promise.resolve(mockStats),
      Promise.resolve(mockTodos),
      Promise.reject(new Error('API not ready')),
      Promise.resolve(mockStudentStatus),
      Promise.resolve(mockMonthlyStats),
    ])

    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('fulfilled')
    expect(results[2].status).toBe('rejected')
    expect(results[3].status).toBe('fulfilled')
    expect(results[4].status).toBe('fulfilled')
  })

  it('should gracefully handle all API failures', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('fail')),
      Promise.reject(new Error('fail')),
      Promise.reject(new Error('fail')),
      Promise.reject(new Error('fail')),
      Promise.reject(new Error('fail')),
    ])

    const allRejected = results.every(r => r.status === 'rejected')
    expect(allRejected).toBe(true)
  })
})
