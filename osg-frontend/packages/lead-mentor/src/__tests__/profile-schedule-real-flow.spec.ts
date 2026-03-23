import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type {
  LeadMentorScheduleSaveResult,
  LeadMentorScheduleStatusView,
  LeadMentorScheduleView,
} from '@osg/shared/api'

import MainLayout from '../layouts/MainLayout.vue'
import SchedulePage from '../views/profile/schedule/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorSchedule: vi.fn(),
  getLeadMentorScheduleStatus: vi.fn(),
  saveLeadMentorNextSchedule: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    userId: 810,
    userName: 'leadmentor',
    nickName: 'Jess Lead Mentor',
    email: 'lead@example.com',
    roles: ['lead_mentor'],
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

const currentScheduleFixture: LeadMentorScheduleView = {
  staffId: 810,
  staffName: 'Test Lead Mentor',
  weekScope: 'current',
  readonly: true,
  filled: true,
  availableHours: 12,
  availableDayCount: 2,
  selectedSlotKeys: ['1-morning', '3-afternoon', '3-evening'],
  note: '本周固定排期',
  weekRange: '03/23 - 03/29',
  days: [
    { weekday: 1, label: '周一', date: '03/23', selectedSlots: ['morning'], selectedSlotLabels: ['上午 9-12'] },
    { weekday: 2, label: '周二', date: '03/24', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 3, label: '周三', date: '03/25', selectedSlots: ['afternoon', 'evening'], selectedSlotLabels: ['下午 14-18', '晚上 19-22'] },
    { weekday: 4, label: '周四', date: '03/26', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 5, label: '周五', date: '03/27', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 6, label: '周六', date: '03/28', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 7, label: '周日', date: '03/29', selectedSlots: [], selectedSlotLabels: [] },
  ],
}

const nextSchedulePendingFixture: LeadMentorScheduleView = {
  staffId: 810,
  staffName: 'Test Lead Mentor',
  weekScope: 'next',
  readonly: false,
  filled: false,
  availableHours: 0,
  availableDayCount: 0,
  selectedSlotKeys: [],
  note: '',
  weekRange: '03/30 - 04/05',
  days: [
    { weekday: 1, label: '周一', date: '03/30', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 2, label: '周二', date: '03/31', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 3, label: '周三', date: '04/01', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 4, label: '周四', date: '04/02', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 5, label: '周五', date: '04/03', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 6, label: '周六', date: '04/04', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 7, label: '周日', date: '04/05', selectedSlots: [], selectedSlotLabels: [] },
  ],
}

const nextScheduleSavedFixture: LeadMentorScheduleSaveResult = {
  ...nextSchedulePendingFixture,
  filled: true,
  availableHours: 18,
  availableDayCount: 2,
  selectedSlotKeys: ['1-morning', '3-evening'],
  note: '周三晚上保留面试时段',
  days: [
    { weekday: 1, label: '周一', date: '03/30', selectedSlots: ['morning'], selectedSlotLabels: ['上午 9-12'] },
    { weekday: 2, label: '周二', date: '03/31', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 3, label: '周三', date: '04/01', selectedSlots: ['evening'], selectedSlotLabels: ['晚上 19-22'] },
    { weekday: 4, label: '周四', date: '04/02', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 5, label: '周五', date: '04/03', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 6, label: '周六', date: '04/04', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 7, label: '周日', date: '04/05', selectedSlots: [], selectedSlotLabels: [] },
  ],
  selectedSlotCount: 2,
  affectedRows: 21,
}

const statusPendingFixture: LeadMentorScheduleStatusView = {
  staffId: 810,
  forceScheduleModal: true,
  nextWeekFilled: false,
  scheduleStatus: '待填写',
  bannerTitle: '请在周日前更新下周排期',
  bannerDetail: '未填写排期将无法被安排课程，系统将发送邮件提醒',
  currentWeek: currentScheduleFixture,
  nextWeek: nextSchedulePendingFixture,
}

const statusSavedFixture: LeadMentorScheduleStatusView = {
  ...statusPendingFixture,
  forceScheduleModal: false,
  nextWeekFilled: true,
  scheduleStatus: '已提交',
  bannerDetail: '排期已按真实状态同步，可继续更新',
  nextWeek: nextScheduleSavedFixture,
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountSchedulePage(initialPath = '/profile/schedule') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'profile/schedule', name: 'ProfileSchedule', component: SchedulePage },
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

describe('lead-mentor profile schedule real flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads current/next schedule and status from the real API instead of static placeholders', async () => {
    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleFixture : nextSchedulePendingFixture
    })
    apiMocks.getLeadMentorScheduleStatus.mockResolvedValue(statusPendingFixture)

    const page = await mountSchedulePage()

    try {
      expect(apiMocks.getLeadMentorSchedule).toHaveBeenCalledWith('current')
      expect(apiMocks.getLeadMentorSchedule).toHaveBeenCalledWith('next')
      expect(apiMocks.getLeadMentorScheduleStatus).toHaveBeenCalledTimes(1)
      expect(page.container.textContent).toContain('12h')
      expect(page.container.textContent).toContain('待填写')
      expect(page.container.textContent).toContain('上午 9-12')
      expect(page.container.textContent).toContain('下午 14-18 / 晚上 19-22')
      expect(page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })

  it('saves next-week schedule through the real API and refreshes the rendered state from backend responses', async () => {
    let nextScheduleView: LeadMentorScheduleView = nextSchedulePendingFixture
    let statusView: LeadMentorScheduleStatusView = statusPendingFixture

    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleFixture : nextScheduleView
    })
    apiMocks.getLeadMentorScheduleStatus.mockImplementation(async () => statusView)
    apiMocks.saveLeadMentorNextSchedule.mockImplementation(async (_payload: unknown) => {
      nextScheduleView = nextScheduleSavedFixture
      statusView = statusSavedFixture
      return nextScheduleSavedFixture
    })

    const page = await mountSchedulePage()

    try {
      const weeklyHoursInput = page.container.querySelector<HTMLInputElement>('#lead-next-weekly-hours')
      expect(weeklyHoursInput).toBeTruthy()

      weeklyHoursInput!.value = '18'
      weeklyHoursInput!.dispatchEvent(new Event('input', { bubbles: true }))
      await flushUi()

      const dayCards = Array.from(page.container.querySelectorAll<HTMLElement>('.editable-day'))
      const mondayMorning = dayCards[0]?.querySelector<HTMLInputElement>('input[type="checkbox"][value="morning"]')
      const wednesdayEvening = dayCards[2]?.querySelector<HTMLInputElement>('input[type="checkbox"][value="evening"]')
      expect(mondayMorning).toBeTruthy()
      expect(wednesdayEvening).toBeTruthy()

      mondayMorning!.click()
      wednesdayEvening!.click()
      await flushUi()

      const note = page.container.querySelector<HTMLTextAreaElement>('.form-textarea')
      expect(note).toBeTruthy()
      note!.value = '周三晚上保留面试时段'
      note!.dispatchEvent(new Event('input', { bubbles: true }))
      await flushUi()

      const saveButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.form-footer .btn'))
        .find((button) => button.textContent?.includes('保存下周排期'))
      expect(saveButton).toBeTruthy()

      saveButton?.click()
      await flushUi()

      expect(apiMocks.saveLeadMentorNextSchedule).toHaveBeenCalledWith({
        availableHours: 18,
        selectedSlotKeys: ['1-morning', '3-evening'],
        note: '周三晚上保留面试时段',
      })
      expect(messageMocks.success).toHaveBeenCalled()
      expect(page.container.querySelector<HTMLInputElement>('#lead-next-weekly-hours')?.value).toBe('18')
      expect(page.container.textContent).toContain('已提交')
      expect(page.container.textContent).toContain('排期已按真实状态同步，可继续更新')
      expect(page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')).toBeFalsy()
    } finally {
      page.unmount()
    }
  })

  it('dismisses the overdue modal without immediately reopening it while the same pending status is still mounted', async () => {
    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleFixture : nextSchedulePendingFixture
    })
    apiMocks.getLeadMentorScheduleStatus.mockResolvedValue(statusPendingFixture)

    const page = await mountSchedulePage()

    try {
      const modal = () => page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')
      expect(modal()).toBeTruthy()

      const dismissButton = page.container.querySelector<HTMLButtonElement>(
        '[data-surface-id="modal-lead-force-schedule"] [data-surface-part="backdrop"]',
      )
      expect(dismissButton).toBeTruthy()

      dismissButton?.click()
      await flushUi()
      await flushUi()

      expect(modal()).toBeFalsy()
    } finally {
      page.unmount()
    }
  })

  it('does not fake a saved state when the real save API rejects', async () => {
    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleFixture : nextSchedulePendingFixture
    })
    apiMocks.getLeadMentorScheduleStatus.mockResolvedValue(statusPendingFixture)
    apiMocks.saveLeadMentorNextSchedule.mockRejectedValue(new Error('下周可上课时长必须大于0'))

    const page = await mountSchedulePage()

    try {
      const saveButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.form-footer .btn'))
        .find((button) => button.textContent?.includes('保存下周排期'))
      expect(saveButton).toBeTruthy()

      saveButton?.click()
      await flushUi()

      expect(messageMocks.error).toHaveBeenCalledWith('下周可上课时长必须大于0')
      expect(messageMocks.success).not.toHaveBeenCalled()
      expect(page.container.textContent).toContain('待填写')
    } finally {
      page.unmount()
    }
  })
})
