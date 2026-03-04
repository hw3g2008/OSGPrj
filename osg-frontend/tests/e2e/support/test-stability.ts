import type { Page } from '@playwright/test'

export interface StabilityConfig {
  timezoneId: string
  locale: string
  fixedTimeMs?: number
}

function parseFixedTime(value?: string): number | undefined {
  if (!value || !value.trim()) {
    return undefined
  }
  const epochMs = Number(value)
  if (Number.isFinite(epochMs) && epochMs > 0) {
    return epochMs
  }
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return parsed
  }
  throw new Error(`E2E_FIXED_TIME is invalid: '${value}'`)
}

export function resolveStabilityConfigFromEnv(): StabilityConfig {
  const timezoneId = (process.env.UI_VISUAL_STABILITY_TZ || 'Asia/Shanghai').trim()
  const locale = (process.env.UI_VISUAL_STABILITY_LOCALE || 'zh-CN').trim()
  if (!timezoneId) {
    throw new Error('UI_VISUAL_STABILITY_TZ must not be empty')
  }
  if (!locale) {
    throw new Error('UI_VISUAL_STABILITY_LOCALE must not be empty')
  }

  const requireFixed = process.env.UI_VISUAL_REQUIRE_FIXED_TIME === '1'
  const fixedTimeMs = parseFixedTime(process.env.E2E_FIXED_TIME)
  if (requireFixed && fixedTimeMs === undefined) {
    throw new Error('UI_VISUAL_REQUIRE_FIXED_TIME=1 but E2E_FIXED_TIME is not set')
  }

  return {
    timezoneId,
    locale,
    fixedTimeMs,
  }
}

export async function applyStabilityToPage(page: Page, config: StabilityConfig): Promise<void> {
  if (typeof config.fixedTimeMs !== 'number') {
    return
  }
  await page.addInitScript(
    ({ fixedTimeMs }) => {
      const OriginalDate = Date
      class FixedDate extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(fixedTimeMs)
            return
          }
          super(...args)
        }

        static now() {
          return fixedTimeMs
        }
      }
      ;(window as unknown as { Date: DateConstructor }).Date = FixedDate as unknown as DateConstructor
    },
    { fixedTimeMs: config.fixedTimeMs },
  )
}
