import { defineConfig, devices } from '@playwright/test'
import { resolveStabilityConfigFromEnv } from './tests/e2e/support/test-stability'
import { loadPlaywrightRuntimeEnv } from './tests/e2e/support/runtime-env'

loadPlaywrightRuntimeEnv()

const reuseExistingServer =
  process.env.PW_E2E_REUSE_SERVER === undefined
    ? !process.env.CI
    : process.env.PW_E2E_REUSE_SERVER === '1'
const parsedWebServerTimeout = Number.parseInt(process.env.PW_WEBSERVER_TIMEOUT_MS ?? '', 10)
const webServerTimeoutMs =
  Number.isFinite(parsedWebServerTimeout) && parsedWebServerTimeout > 0
    ? parsedWebServerTimeout
    : 300_000
const disableWebServerForPrototypeVisualSource = process.env.UI_VISUAL_SOURCE === 'prototype'
const visualModule = process.env.UI_VISUAL_MODULE || 'permission'
const visualContractJson = process.env.UI_VISUAL_CONTRACT_JSON || ''
const useStudentVisualTarget =
  visualModule === 'student' || /\/student\/|student-.*\.json$/i.test(visualContractJson)
const visualBaseURL = useStudentVisualTarget ? 'http://127.0.0.1:4000' : 'http://localhost:4173'
const visualWebServerCommand = useStudentVisualTarget
  ? 'pnpm --dir packages/student build && pnpm --dir packages/student preview --host 127.0.0.1 --port 4000 --strictPort'
  : 'pnpm --dir packages/admin build && pnpm --dir packages/admin preview --host 127.0.0.1 --port 4173 --strictPort'
const visualWebServerPort = useStudentVisualTarget ? 4000 : 4173

const snapshotPathTemplate = process.env.PW_VISUAL_SNAPSHOT_TEMPLATE
const stability = resolveStabilityConfigFromEnv()

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/tmp-*.spec.ts'],
  fullyParallel: true,
  snapshotPathTemplate: snapshotPathTemplate || undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: visualBaseURL,
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

  webServer: disableWebServerForPrototypeVisualSource
    ? undefined
    : {
        command: visualWebServerCommand,
        port: visualWebServerPort,
        reuseExistingServer,
        timeout: webServerTimeoutMs,
      },
})
