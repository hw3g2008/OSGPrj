import { describe, it, expect } from 'vitest'

// 分类卡片与Tab映射（与 index.vue 一致）
const categories = [
  {
    key: 'job',
    label: '求职相关',
    tabs: [
      { key: 'job_category', label: '岗位分类' },
      { key: 'company_name', label: '公司/银行名称', hasParent: true, parentTab: 'company_type' },
      { key: 'company_type', label: '公司/银行类别' },
      { key: 'region', label: '大区' },
      { key: 'city', label: '地区/城市', hasParent: true, parentTab: 'region' },
      { key: 'recruit_cycle', label: '招聘周期' }
    ]
  },
  {
    key: 'student',
    label: '学员相关',
    tabs: [
      { key: 'school', label: '学校' },
      { key: 'major_direction', label: '主攻方向' },
      { key: 'sub_direction', label: '子方向', hasParent: true, parentTab: 'major_direction' }
    ]
  },
  {
    key: 'course',
    label: '课程相关',
    tabs: [
      { key: 'course_type', label: '课程类型' }
    ]
  },
  {
    key: 'finance',
    label: '财务相关',
    tabs: [
      { key: 'expense_type', label: '报销类型' }
    ]
  }
]

function getTabsForCategory(categoryKey: string) {
  const cat = categories.find(c => c.key === categoryKey)
  return cat ? cat.tabs : []
}

// 操作按钮显示逻辑
function getActionButtons(record: { status: string }): string[] {
  const buttons: string[] = ['edit']
  if (record.status === '0') {
    buttons.push('disable')
  }
  if (record.status === '1') {
    buttons.push('enable')
  }
  return buttons
}

// 关联字段条件显示
function getParentTabInfo(
  tab: string,
  tabs: { key: string; label: string; hasParent?: boolean; parentTab?: string }[]
) {
  const cfg = tabs.find(t => t.key === tab)
  if (!cfg?.hasParent || !cfg.parentTab) return null
  const parentTab = tabs.find(t => t.key === cfg.parentTab)
  return parentTab ? { key: cfg.parentTab, label: parentTab.label } : null
}

// 名称校验
function validateName(value: string): { valid: boolean; error?: string } {
  if (!value || !value.trim()) return { valid: false, error: '请输入名称' }
  return { valid: true }
}

// 排序默认值
function getDefaultSort(): number {
  return 100
}

describe('基础数据管理模块测试', () => {
  describe('分类卡片切换', () => {
    it('共4个分类', () => {
      expect(categories).toHaveLength(4)
    })

    it('求职相关有6个Tab', () => {
      const tabs = getTabsForCategory('job')
      expect(tabs).toHaveLength(6)
    })

    it('学员相关有3个Tab', () => {
      const tabs = getTabsForCategory('student')
      expect(tabs).toHaveLength(3)
    })

    it('课程相关有1个Tab', () => {
      const tabs = getTabsForCategory('course')
      expect(tabs).toHaveLength(1)
    })

    it('财务相关有1个Tab', () => {
      const tabs = getTabsForCategory('finance')
      expect(tabs).toHaveLength(1)
    })

    it('不存在的分类返回空', () => {
      const tabs = getTabsForCategory('unknown')
      expect(tabs).toHaveLength(0)
    })
  })

  describe('Tab切换与数据', () => {
    it('求职相关第一个Tab是岗位分类', () => {
      const tabs = getTabsForCategory('job')
      expect(tabs[0].key).toBe('job_category')
      expect(tabs[0].label).toBe('岗位分类')
    })

    it('学员相关包含学校/主攻方向/子方向', () => {
      const tabs = getTabsForCategory('student')
      expect(tabs.map(t => t.key)).toEqual(['school', 'major_direction', 'sub_direction'])
    })

    it('所有Tab总数为11', () => {
      const total = categories.reduce((sum, cat) => sum + cat.tabs.length, 0)
      expect(total).toBe(11)
    })
  })

  describe('操作按钮显示', () => {
    it('启用状态: 编辑+禁用', () => {
      const buttons = getActionButtons({ status: '0' })
      expect(buttons).toEqual(['edit', 'disable'])
    })

    it('禁用状态: 编辑+启用', () => {
      const buttons = getActionButtons({ status: '1' })
      expect(buttons).toEqual(['edit', 'enable'])
    })
  })

  describe('关联字段条件显示', () => {
    const jobTabs = getTabsForCategory('job')
    const studentTabs = getTabsForCategory('student')

    it('公司/银行名称→类别下拉', () => {
      const info = getParentTabInfo('company_name', jobTabs)
      expect(info).not.toBeNull()
      expect(info!.key).toBe('company_type')
      expect(info!.label).toBe('公司/银行类别')
    })

    it('地区/城市→大区下拉', () => {
      const info = getParentTabInfo('city', jobTabs)
      expect(info).not.toBeNull()
      expect(info!.key).toBe('region')
      expect(info!.label).toBe('大区')
    })

    it('子方向→主攻方向下拉', () => {
      const info = getParentTabInfo('sub_direction', studentTabs)
      expect(info).not.toBeNull()
      expect(info!.key).toBe('major_direction')
      expect(info!.label).toBe('主攻方向')
    })

    it('岗位分类无关联字段', () => {
      const info = getParentTabInfo('job_category', jobTabs)
      expect(info).toBeNull()
    })

    it('招聘周期无关联字段', () => {
      const info = getParentTabInfo('recruit_cycle', jobTabs)
      expect(info).toBeNull()
    })
  })

  describe('名称校验和排序默认值', () => {
    it('空名称验证失败', () => {
      expect(validateName('')).toEqual({ valid: false, error: '请输入名称' })
    })

    it('空格名称验证失败', () => {
      expect(validateName('   ')).toEqual({ valid: false, error: '请输入名称' })
    })

    it('合法名称验证通过', () => {
      expect(validateName('暑期实习')).toEqual({ valid: true })
    })

    it('排序默认值为100', () => {
      expect(getDefaultSort()).toBe(100)
    })
  })
})
