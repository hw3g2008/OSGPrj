import { onBeforeUnmount, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { logout as logoutApi } from '../api/auth'
import { clearAuth } from '../utils/storage'
import { http } from '../utils/request'

/**
 * 空闲自动登出配置（单一来源）。
 * - IDLE_MS：无操作多久后退出（60 分钟）
 * - PING_THROTTLE_MS：用户活动时主动 ping /getInfo 的节流（10 分钟）
 *   设为 10 分钟是为了配合后端 verifyToken 续期阈值（剩余 ≤ 20 分钟才续期），
 *   每次 ping 都能命中续期窗口，让活跃用户的 token 永不过期。
 * - ACTIVITY_DEBOUNCE_MS：高频事件（如 scroll）触发计时器重置的节流。
 */
const IDLE_MS = 60 * 60 * 1000
const PING_THROTTLE_MS = 10 * 60 * 1000
const ACTIVITY_DEBOUNCE_MS = 1000

/**
 * 监听的用户活动事件。
 * 不监听 mousemove 以避免极高频带来的复杂度——下面 5 个事件已足够覆盖
 * "用户在主动操作"的语义（点击、键盘、触屏、滚动）。
 */
const ACTIVITY_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
]

export interface UseIdleLogoutOptions {
  /**
   * idle 超时阈值（ms）。默认 60 分钟。
   */
  idleMs?: number
  /**
   * ping 节流阈值（ms）。默认 10 分钟。
   */
  pingThrottleMs?: number
  /**
   * 自定义 logout 跳转。默认 window.location.href = '/login'。
   * 一般情况下不需要传——5 端登录页路径都是 /login。
   */
  onLogout?: () => void
}

/**
 * 5 端共享的"无操作自动退出"composable。
 *
 * 行为：
 * 1. 在 onMounted 时启动 idle 倒计时，监听 mousedown / keydown / touchstart / scroll / click。
 * 2. 任一事件触发"用户活动"，重置倒计时（节流 1s）。
 * 3. 用户活动同时触发节流的 ping /getInfo，保活后端 token。
 * 4. 倒计时归零 → 调 logout API → clearAuth → message.warning 提示 → 跳 /login。
 * 5. 在 onBeforeUnmount 时清理 listeners + timer。
 *
 * 使用：在受保护的 layout（如 MainLayout.vue）的 setup 中调用一次。
 */
export function useIdleLogout(options: UseIdleLogoutOptions = {}) {
  const idleMs = options.idleMs ?? IDLE_MS
  const pingThrottleMs = options.pingThrottleMs ?? PING_THROTTLE_MS

  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let lastActivityResetAt = 0
  let lastPingAt = 0
  let loggingOut = false

  const clearIdleTimer = () => {
    if (idleTimer != null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const doLogout = async () => {
    if (loggingOut) {
      return
    }
    loggingOut = true
    clearIdleTimer()
    try {
      await logoutApi()
    } catch (_e) {
      // 即使后端 logout 失败，前端也强制清理本地登录态
    }
    clearAuth()
    message.warning('因长时间未操作，已自动退出')
    if (options.onLogout) {
      options.onLogout()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const resetIdleTimer = () => {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      void doLogout()
    }, idleMs)
  }

  const pingBackend = async () => {
    try {
      // /getInfo 现成接口，触发 TokenService.verifyToken → 命中续期阈值时续期
      await http.get('/getInfo', { skipErrorMessage: true } as Parameters<typeof http.get>[1])
    } catch (_e) {
      // 401 由全局 interceptor 处理（清 token + 跳 /login）；此处吞掉以免 console 噪音
    }
  }

  const handleActivity = () => {
    if (loggingOut) {
      return
    }
    const now = Date.now()
    if (now - lastActivityResetAt >= ACTIVITY_DEBOUNCE_MS) {
      lastActivityResetAt = now
      resetIdleTimer()
    }
    if (now - lastPingAt >= pingThrottleMs) {
      lastPingAt = now
      void pingBackend()
    }
  }

  const attachListeners = () => {
    if (typeof window === 'undefined') {
      return
    }
    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, handleActivity, { passive: true })
    })
  }

  const detachListeners = () => {
    if (typeof window === 'undefined') {
      return
    }
    ACTIVITY_EVENTS.forEach((ev) => {
      window.removeEventListener(ev, handleActivity)
    })
  }

  onMounted(() => {
    attachListeners()
    resetIdleTimer()
  })

  onBeforeUnmount(() => {
    detachListeners()
    clearIdleTimer()
  })

  // 暴露内部行为给单测 / 业务层手动触发（极少用到）
  return {
    forceLogout: doLogout,
    triggerActivity: handleActivity,
  }
}
