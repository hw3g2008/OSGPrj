import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import HomePage from '@/views/home/index.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'Home', component: HomePage },
      { path: '/career/positions', name: 'CareerPositions', component: { template: '<div>positions</div>' } },
      { path: '/students', name: 'Students', component: { template: '<div>students</div>' } },
      { path: '/class-records', name: 'ClassRecords', component: { template: '<div>class records</div>' } },
      { path: '/schedule', name: 'Schedule', component: { template: '<div>schedule</div>' } },
    ],
  })
}

async function mountHome() {
  const router = createTestRouter()
  await router.push('/home')
  await router.isReady()

  const wrapper = mount(HomePage, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

async function flushUi() {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('assistant home page', () => {
  it('renders the hero, dashboard metrics, and four quick entries', async () => {
    window.localStorage.removeItem('osg_user')
    const { wrapper } = await mountHome()

    expect(wrapper.find('.assistant-home').exists()).toBe(true)
    expect(wrapper.find('.assistant-home__hero-title').text()).toContain('助教老师')
    expect(wrapper.findAll('[data-home-card]')).toHaveLength(3)
    expect(wrapper.findAll('[data-home-stat]')).toHaveLength(4)
    expect(wrapper.findAll('[data-quick-link]')).toHaveLength(4)
    expect(wrapper.text()).toContain('岗位信息')
    expect(wrapper.text()).toContain('学员列表')
    expect(wrapper.text()).toContain('课程记录')
    expect(wrapper.text()).toContain('课程排期')
    expect(wrapper.text()).not.toContain('占位')
    expect(wrapper.text()).not.toContain('骨架')
  })

  it('navigates to the selected quick entry route', async () => {
    const { wrapper, router } = await mountHome()

    await wrapper.get('[data-quick-link="/schedule"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.fullPath).toBe('/schedule')
  })

  it('does not render out-of-scope lead-mentor modules or fallback waiting copy', async () => {
    const { wrapper } = await mountHome()
    const text = wrapper.text()

    expect(text).not.toContain('敬请期待')
    expect(text).not.toContain('可用导师')
    expect(text).not.toContain('待排课')
    expect(text).not.toContain('报销')
  })

  it('prefers the persisted assistant nickname in the greeting', async () => {
    window.localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userId: 1,
        userName: 'amy_asst',
        nickName: 'Amy',
        roles: ['assistant'],
      }),
    )

    const { wrapper } = await mountHome()

    expect(wrapper.find('.assistant-home__hero-title').text()).toContain('Amy')

    window.localStorage.removeItem('osg_user')
  })
})
