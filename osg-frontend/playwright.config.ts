import { defineConfig, devices } from '@playwright/test'
import { resolveStabilityConfigFromEnv } from './tests/e2e/support/test-stability'
import { loadPlaywrightRuntimeEnv } from './tests/e2e/support/runtime-env'

loadPlaywrightRuntimeEnv()

const reuseExistingServer =
  process.env.PW_E2E_REUSE_SERVER === undefined
    ? !process.env.CI
    : process.env.PW_E2E_REUSE_SERVER === '1'

const snapshotPathTemplate = process.env.PW_VISUAL_SNAPSHOT_TEMPLATE
const stability = resolveStabilityConfigFromEnv()

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  snapshotPathTemplate: snapshotPathTemplate || undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: stability.locale,
    timezoneId: stability.timezoneId,
    deviceScaleFactor: stability.deviceScaleFactor,
    userAgent: stability.userAgent,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm --dir packages/admin build && pnpm --dir packages/admin preview --port 4173',
    port: 4173,
    reuseExistingServer,
    timeout: 120_000,
  },
})
