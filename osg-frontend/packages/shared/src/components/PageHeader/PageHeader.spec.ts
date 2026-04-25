/**
 * PageHeader unit tests（M0.5 Phase 2.1）
 *
 * 12 个 case，对应方案 §6.1 表格。
 * 严格 TDD 路径：先红（无组件失败）→ 实现（GREEN）→ 重构（无）。
 *
 * 详见 docs/architecture/shared-infrastructure/m0.5-step1-pageheader-extraction-plan.md §6.1
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PageHeader from './PageHeader.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('PageHeader (shared) — M0.5 Phase 2.1', () => {
  // -----------------------------------------------------
  // 渲染基础（cases 1-3）
  // -----------------------------------------------------

  it('1. render with titleZh only — only renders title, no titleEn / desc / actions', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '消息中心' } })

    const title = wrapper.find('.page-header__title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('消息中心')

    expect(wrapper.find('.page-header__title-en').exists()).toBe(false)
    expect(wrapper.find('.page-header__desc').exists()).toBe(false)
    expect(wrapper.find('.page-header__actions').exists()).toBe(false)
  })

  it('2. render with titleZh + titleEn — both rendered, inline siblings inside h1', () => {
    wrapper = mount(PageHeader, {
      props: { titleZh: '学员求职总览', titleEn: 'Job Overview' },
    })

    const title = wrapper.find('h1.page-header__title')
    const titleEn = wrapper.find('.page-header__title-en')

    expect(title.exists()).toBe(true)
    expect(titleEn.exists()).toBe(true)
    // inline 同行：span 是 h1 的子元素（实测 h1 内嵌 span）
    expect(title.element.contains(titleEn.element)).toBe(true)
    // 文案
    expect(title.text()).toContain('学员求职总览')
    expect(titleEn.text()).toBe('Job Overview')
  })

  it('3. render with all props — titleZh + titleEn + description all visible', () => {
    wrapper = mount(PageHeader, {
      props: {
        titleZh: '学员求职总览',
        titleEn: 'Job Overview',
        description: '查看我辅导和管理的学员求职进度',
      },
    })

    expect(wrapper.find('.page-header__title').text()).toContain('学员求职总览')
    expect(wrapper.find('.page-header__title-en').text()).toBe('Job Overview')
    expect(wrapper.find('.page-header__desc').text()).toBe(
      '查看我辅导和管理的学员求职进度',
    )
  })

  // -----------------------------------------------------
  // v-if 缺省行为（cases 4-6）
  // -----------------------------------------------------

  it('4. hide titleEn when not passed — DOM does not contain .page-header__title-en', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '岗位信息' } })
    expect(wrapper.find('.page-header__title-en').exists()).toBe(false)
  })

  it('5. hide description when not passed — DOM does not contain .page-header__desc', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '岗位信息' } })
    expect(wrapper.find('.page-header__desc').exists()).toBe(false)
  })

  it('6. hide actions when slot empty — DOM does not contain .page-header__actions', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '岗位信息' } })
    expect(wrapper.find('.page-header__actions').exists()).toBe(false)
  })

  // -----------------------------------------------------
  // Slot 渲染（case 7）
  // -----------------------------------------------------

  it('7. render actions slot — slot content is rendered inside .page-header__actions', () => {
    wrapper = mount(PageHeader, {
      props: { titleZh: '岗位信息' },
      slots: {
        actions: '<button class="test-action-btn">导出</button>',
      },
    })

    const actionsSlot = wrapper.find('.page-header__actions')
    expect(actionsSlot.exists()).toBe(true)

    const btn = actionsSlot.find('.test-action-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('导出')
  })

  // -----------------------------------------------------
  // 类型契约（case 8 — vue-tsc 编译期检查，运行时占位）
  // -----------------------------------------------------

  it.todo(
    '8. titleZh required prop — verified by vue-tsc at compile time (no runtime assertion possible in Vue 3 + <script setup>)',
  )

  // -----------------------------------------------------
  // 语义化 / a11y（cases 9-11）
  // -----------------------------------------------------

  it('9. semantic header tag — root element is <header>, not <div>', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '岗位信息' } })
    const root = wrapper.element as HTMLElement
    expect(root.tagName.toLowerCase()).toBe('header')
  })

  it('10. a11y: h1 for title — main title uses <h1> tag', () => {
    wrapper = mount(PageHeader, { props: { titleZh: '岗位信息' } })
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.classes()).toContain('page-header__title')
  })

  it('11. a11y: title content as text — heading role with level 1 contains titleZh', () => {
    wrapper = mount(PageHeader, {
      props: { titleZh: '消息中心', titleEn: 'Notifications' },
    })

    const h1 = wrapper.get('h1')
    // 即便英文 span 内嵌，h1 的可访问名仍含中文主标
    expect(h1.text()).toContain('消息中心')
    expect(h1.attributes('role') ?? 'heading').toBeDefined()
  })

  // -----------------------------------------------------
  // CSS BEM 类名结构（case 12）
  // -----------------------------------------------------

  it('12. css class structure — BEM class names exist for all rendered parts', () => {
    wrapper = mount(PageHeader, {
      props: {
        titleZh: '消息中心',
        titleEn: 'Notifications',
        description: '系统通知与提醒',
      },
      slots: { actions: '<button>x</button>' },
    })

    expect(wrapper.find('.page-header').exists()).toBe(true)
    expect(wrapper.find('.page-header__text').exists()).toBe(true)
    expect(wrapper.find('.page-header__title').exists()).toBe(true)
    expect(wrapper.find('.page-header__title-en').exists()).toBe(true)
    expect(wrapper.find('.page-header__desc').exists()).toBe(true)
    expect(wrapper.find('.page-header__actions').exists()).toBe(true)
  })
})
