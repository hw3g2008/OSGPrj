import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)
const positionsPath = path.resolve(__dirname, '../views/career/positions/index.vue')
const positionsExists = fs.existsSync(positionsPath)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    info: vi.fn(),
  },
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function loadPositionsPage() {
  expect(positionsExists).toBe(true)
  const moduleUrl = pathToFileURL(positionsPath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountPositionsPage(initialPath = '/career/positions') {
  const PositionsPage = await loadPositionsPage()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'career/positions', name: 'CareerPositions', component: PositionsPage },
        ],
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await flushUi()

  return {
    container,
    router,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('lead-mentor positions shell contract', () => {
  it('registers the /career/positions route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'career/positions'")
    expect(routerSource).toContain("name: 'CareerPositions'")
    expect(positionsExists).toBe(true)
  })

  it('restores the positions shell with filters, drilldown/list views, and prototype labels', async () => {
    const page = await mountPositionsPage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/career/positions')
      expect(page.container.querySelector('#page-positions')).toBeTruthy()
      expect(page.container.textContent).toContain('岗位信息')
      expect(page.container.textContent).toContain('Job Tracker')
      expect(page.container.textContent).toContain('下钻视图')
      expect(page.container.textContent).toContain('列表视图')
      expect(page.container.textContent).toContain('全部分类')
      expect(page.container.textContent).toContain('全部行业')
      expect(page.container.textContent).toContain('全部公司')
      expect(page.container.textContent).toContain('全部地区')
      expect(page.container.textContent).toContain('Investment Bank')
      expect(page.container.textContent).toContain('Consulting')
      expect(page.container.textContent).toContain('Tech')
      expect(page.container.textContent).toContain('Goldman Sachs')
      expect(page.container.textContent).toContain('McKinsey')
      expect(page.container.textContent).toContain('Google')
      expect(page.container.textContent).toContain('官网')
      expect(page.container.textContent).toContain('共 12 个岗位')
      expect(page.container.querySelectorAll('.table').length).toBeGreaterThanOrEqual(2)
    } finally {
      page.unmount()
    }
  })

  it('switches between drilldown and list views while preserving the positions nav highlight', async () => {
    const page = await mountPositionsPage()

    try {
      const drilldownButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('下钻视图')
      )
      const listButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('列表视图')
      )
      const drilldownPanel = page.container.querySelector<HTMLElement>('#lead-position-drilldown')
      const listPanel = page.container.querySelector<HTMLElement>('#lead-position-list')
      const positionsNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('岗位信息 Positions')
      )

      expect(drilldownButton).toBeTruthy()
      expect(listButton).toBeTruthy()
      expect(drilldownPanel).toBeTruthy()
      expect(listPanel).toBeTruthy()
      expect(positionsNav?.classList.contains('active')).toBe(true)
      expect(drilldownPanel?.style.display).not.toBe('none')
      expect(listPanel?.style.display).toBe('none')

      listButton?.click()
      await flushUi()

      expect(drilldownPanel?.style.display).toBe('none')
      expect(listPanel?.style.display).toBe('block')

      drilldownButton?.click()
      await flushUi()

      expect(drilldownPanel?.style.display).toBe('block')
      expect(listPanel?.style.display).toBe('none')
      expect(positionsNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })

  it('opens the my-students modal shell with the declared surface markers and prototype copy', async () => {
    const page = await mountPositionsPage()

    try {
      const trigger = page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-position-mystudents"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-position-mystudents"]')
      const shell = modal?.querySelector('[data-surface-part="shell"]')
      const header = modal?.querySelector('[data-surface-part="header"]')
      const body = modal?.querySelector('[data-surface-part="body"]')
      const title = modal?.querySelector('.modal-title')
      const footer = modal?.querySelector('.modal-footer')

      expect(modal).toBeTruthy()
      expect(modal?.classList.contains('modal')).toBe(true)
      expect(shell).toBeTruthy()
      expect(shell?.classList.contains('modal-content')).toBe(true)
      expect(header?.classList.contains('modal-header')).toBe(true)
      expect(body?.classList.contains('modal-body')).toBe(true)
      expect(title).toBeTruthy()
      expect(footer).toBeTruthy()
      expect(header?.textContent).toContain('Goldman Sachs - IB Analyst 我的学员申请')
      expect(body?.textContent).toContain('仅显示您管理的学员')
      expect(body?.textContent).toContain('张三')
      expect(body?.textContent).toContain('面试中')
      expect(modal?.textContent).toContain('关闭')
      expect(modal?.textContent).toContain('保存修改')
      expect(modal?.querySelector('.btn-outline')).toBeTruthy()
      expect(modal?.querySelector('.btn-primary')).toBeTruthy()
      expect(modal?.querySelector('.mdi-account-group')).toBeTruthy()
      expect(modal?.querySelector('.mdi-information')).toBeTruthy()
      expect(modal?.querySelector('.mdi-check')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })
})
