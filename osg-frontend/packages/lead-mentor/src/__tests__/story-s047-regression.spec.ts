import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type {
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
  info: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    userId: 810,
    userName: 'leadmentor',
    nickName: 'Jess Lead Mentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

const currentScheduleView: LeadMentorScheduleView = {
  staffId: 810,
  staffName: 'Test Lead Mentor',
  weekScope: 'current',
  readonly: true,
  filled: true,
  availableHours: 12,
  availableDayCount: 2,
  selectedSlotKeys: ['1-morning', '3-evening'],
  note: '本周固定排期',
  weekRange: '03/23 - 03/29',
  days: [
    { weekday: 1, label: '周一', date: '03/23', selectedSlots: ['morning'], selectedSlotLabels: ['上午 9-12'] },
    { weekday: 2, label: '周二', date: '03/24', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 3, label: '周三', date: '03/25', selectedSlots: ['evening'], selectedSlotLabels: ['晚上 19-22'] },
    { weekday: 4, label: '周四', date: '03/26', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 5, label: '周五', date: '03/27', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 6, label: '周六', date: '03/28', selectedSlots: [], selectedSlotLabels: [] },
    { weekday: 7, label: '周日', date: '03/29', selectedSlots: [], selectedSlotLabels: [] },
  ],
}

const nextSchedulePendingView: LeadMentorScheduleView = {
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

const nextScheduleSavedView: LeadMentorScheduleView = {
  ...nextSchedulePendingView,
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
}

const pendingStatusView: LeadMentorScheduleStatusView = {
  staffId: 810,
  forceScheduleModal: true,
  nextWeekFilled: false,
  scheduleStatus: '待填写',
  bannerTitle: '请在周日前更新下周排期',
  bannerDetail: '未填写排期将无法被安排课程，系统将发送邮件提醒',
  currentWeek: currentScheduleView,
  nextWeek: nextSchedulePendingView,
}

const savedStatusView: LeadMentorScheduleStatusView = {
  ...pendingStatusView,
  forceScheduleModal: false,
  nextWeekFilled: true,
  scheduleStatus: '已提交',
  bannerDetail: '排期已按真实状态同步，可继续更新',
  nextWeek: nextScheduleSavedView,
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStory(initialPath = '/profile/schedule') {
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
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('S-047 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the current-week snapshot readonly, auto-opens the overdue modal, and refreshes saved next-week state', async () => {
    let nextScheduleView: LeadMentorScheduleView = nextSchedulePendingView
    let statusView: LeadMentorScheduleStatusView = pendingStatusView

    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleView : nextScheduleView
    })
    apiMocks.getLeadMentorScheduleStatus.mockImplementation(async () => statusView)
    apiMocks.saveLeadMentorNextSchedule.mockImplementation(async () => {
      nextScheduleView = nextScheduleSavedView
      statusView = savedStatusView
      return {
        ...nextScheduleSavedView,
        selectedSlotCount: 2,
        affectedRows: 21,
      }
    })

    const page = await mountStory()

    try {
      expect(page.container.textContent).toContain('本周排期')
      expect(page.container.textContent).toContain('上午 9-12')
      expect(page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')).toBeTruthy()

      const hoursInput = page.container.querySelector<HTMLInputElement>('#lead-next-weekly-hours')
      expect(hoursInput).toBeTruthy()
      hoursInput!.value = '18'
      hoursInput!.dispatchEvent(new Event('input', { bubbles: true }))
      await flushUi()

      const dayCards = Array.from(page.container.querySelectorAll<HTMLElement>('.editable-day'))
      dayCards[0]?.querySelector<HTMLInputElement>('input[value="morning"]')?.click()
      dayCards[2]?.querySelector<HTMLInputElement>('input[value="evening"]')?.click()
      await flushUi()

      const noteField = page.container.querySelector<HTMLTextAreaElement>('.form-textarea')
      expect(noteField).toBeTruthy()
      noteField!.value = '周三晚上保留面试时段'
      noteField!.dispatchEvent(new Event('input', { bubbles: true }))
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

  it('keeps boundary failures visible when the real schedule save rejects', async () => {
    apiMocks.getLeadMentorSchedule.mockImplementation(async (weekScope: 'current' | 'next') => {
      return weekScope === 'current' ? currentScheduleView : nextSchedulePendingView
    })
    apiMocks.getLeadMentorScheduleStatus.mockResolvedValue(pendingStatusView)
    apiMocks.saveLeadMentorNextSchedule.mockRejectedValue(new Error('下周可上课时长必须大于0'))

    const page = await mountStory()

    try {
      const saveButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.form-footer .btn'))
        .find((button) => button.textContent?.includes('保存下周排期'))
      expect(saveButton).toBeTruthy()

      saveButton?.click()
      await flushUi()

      expect(messageMocks.error).toHaveBeenCalledWith('下周可上课时长必须大于0')
      expect(messageMocks.success).not.toHaveBeenCalled()
      expect(page.container.textContent).toContain('待填写')
      expect(page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })
})
