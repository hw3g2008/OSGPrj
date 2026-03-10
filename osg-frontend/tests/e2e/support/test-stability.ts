import type { Page } from '@playwright/test'

export interface StabilityConfig {
  timezoneId: string
  locale: string
  fixedTimeMs?: number
  deviceScaleFactor: number
  userAgent: string
  fontFamily: string
  disableAnimation: boolean
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

function parsePositiveNumber(value: string, field: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive number, got '${value}'`)
  }
  return parsed
}

export function resolveStabilityConfigFromEnv(): StabilityConfig {
  const timezoneId = (process.env.UI_VISUAL_STABILITY_TZ || 'Asia/Shanghai').trim()
  const locale = (process.env.UI_VISUAL_STABILITY_LOCALE || 'zh-CN').trim()
  const enforceZhLocale = (process.env.UI_VISUAL_ENFORCE_ZH_LOCALE || '1').trim() !== '0'
  const deviceScaleFactor = parsePositiveNumber(
    (process.env.UI_VISUAL_STABILITY_DEVICE_SCALE_FACTOR || '1').trim(),
    'UI_VISUAL_STABILITY_DEVICE_SCALE_FACTOR',
  )
  const userAgent = (
    process.env.UI_VISUAL_STABILITY_USER_AGENT ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  ).trim()
  const fontFamily = (
    process.env.UI_VISUAL_STABILITY_FONT_FAMILY ||
    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  ).trim()
  const disableAnimation = (process.env.UI_VISUAL_DISABLE_ANIMATION || '1').trim() !== '0'

  if (!timezoneId) {
    throw new Error('UI_VISUAL_STABILITY_TZ must not be empty')
  }
  if (!locale) {
    throw new Error('UI_VISUAL_STABILITY_LOCALE must not be empty')
  }
  if (enforceZhLocale && locale !== 'zh-CN') {
    throw new Error(`UI visual baseline locale must stay zh-CN, got '${locale}'`)
  }
  if (!userAgent) {
    throw new Error('UI_VISUAL_STABILITY_USER_AGENT must not be empty')
  }
  if (!fontFamily) {
    throw new Error('UI_VISUAL_STABILITY_FONT_FAMILY must not be empty')
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
    deviceScaleFactor,
    userAgent,
    fontFamily,
    disableAnimation,
  }
}

export async function applyStabilityToPage(page: Page, config: StabilityConfig): Promise<void> {
  await page.addInitScript(
    ({ fontFamily, locale, disableAnimation, fixedTimeMs }) => {
      const applyFixedTime = () => {
        if (typeof fixedTimeMs !== 'number') {
          return
        }

        const OriginalDate = Date
        class FixedDate extends OriginalDate {
          constructor(...args: ConstructorParameters<typeof Date>) {
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

        Object.setPrototypeOf(FixedDate, OriginalDate)
        Object.defineProperty(FixedDate, 'name', { value: 'Date' })
        FixedDate.parse = OriginalDate.parse.bind(OriginalDate)
        FixedDate.UTC = OriginalDate.UTC.bind(OriginalDate)
        ;(globalThis as typeof window).Date = FixedDate as typeof Date
      }

      const applyStyleGuards = () => {
        applyFixedTime()
        document.documentElement.setAttribute('lang', locale)
        if (typeof fixedTimeMs === 'number') {
          document.documentElement.setAttribute('data-ui-visual-fixed-time', String(fixedTimeMs))
        } else {
          document.documentElement.removeAttribute('data-ui-visual-fixed-time')
        }
        const styleId = '__ui_visual_stability_style__'
        let style = document.getElementById(styleId) as HTMLStyleElement | null
        if (!style) {
          style = document.createElement('style')
          style.id = styleId
          document.head.appendChild(style)
        }

        const rules = [
          `html, body, input, button, textarea, select { font-family: ${fontFamily} !important; }`,
        ]
        if (disableAnimation) {
          rules.push(
            '* { animation: none !important; transition: none !important; }',
            '*::before { animation: none !important; transition: none !important; }',
            '*::after { animation: none !important; transition: none !important; }',
          )
        }
        style.textContent = rules.join('\n')
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyStyleGuards, { once: true })
      } else {
        applyStyleGuards()
      }
    },
    {
      fontFamily: config.fontFamily,
      locale: config.locale,
      disableAnimation: config.disableAnimation,
      fixedTimeMs: config.fixedTimeMs,
    },
  )
}
