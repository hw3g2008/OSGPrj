import { test, expect } from '@playwright/test'
import { applyStabilityToPage, type StabilityConfig } from './support/test-stability'

const fixedTimeMs = Date.parse('2025-12-19T01:00:00.000Z')

const stability: StabilityConfig = {
  timezoneId: 'Asia/Shanghai',
  locale: 'zh-CN',
  fixedTimeMs,
  deviceScaleFactor: 1,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  disableAnimation: true,
}

test('applyStabilityToPage freezes Date APIs when fixedTimeMs is provided', async ({ page }) => {
  await applyStabilityToPage(page, stability)
  await page.goto('data:text/html,<html><body><div id="app"></div></body></html>')

  const snapshot = await page.evaluate(() => ({
    now: Date.now(),
    iso: new Date().toISOString(),
  }))

  expect(snapshot.now).toBe(fixedTimeMs)
  expect(snapshot.iso).toBe(new Date(fixedTimeMs).toISOString())
})
