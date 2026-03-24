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
const requestedModule = process.env.UI_VISUAL_MODULE || process.env.E2E_MODULE || 'permission'
const visualContractJson = process.env.UI_VISUAL_CONTRACT_JSON || ''
const explicitFrontendBaseURL = process.env.E2E_FRONTEND_BASE_URL?.trim() || ''

interface E2ETarget {
  baseURL: string
  webServerCommand: string
  webServerPort: number
}

function resolveE2ETarget(moduleName: string, contractJsonPath: string): E2ETarget {
  const normalizedModule = moduleName.trim().toLowerCase()
  const inferredStudentModule =
    normalizedModule === 'student' || /\/student\/|student-.*\.json$/i.test(contractJsonPath)

  if (inferredStudentModule) {
      return {
        baseURL: 'http://127.0.0.1:4000',
        webServerCommand:
          'pnpm --dir packages/student build && pnpm --dir packages/student exec vite preview --host 127.0.0.1 --port 4000 --strictPort',
        webServerPort: 4000,
      }
  }

  switch (normalizedModule) {
    case 'mentor':
      return {
        baseURL: 'http://127.0.0.1:4175',
        webServerCommand:
          'pnpm --dir packages/mentor exec vite build && pnpm --dir packages/mentor exec vite preview --host 127.0.0.1 --port 4175 --strictPort',
        webServerPort: 4175,
      }
    case 'lead-mentor':
      return {
        baseURL: 'http://127.0.0.1:4174',
        webServerCommand:
          'pnpm --dir packages/lead-mentor exec vite build && pnpm --dir packages/lead-mentor exec vite preview --host 127.0.0.1 --port 4174 --strictPort',
        webServerPort: 4174,
      }
    case 'assistant':
      return {
        baseURL: 'http://127.0.0.1:4176',
        webServerCommand:
          'pnpm --dir packages/assistant exec vite build && pnpm --dir packages/assistant exec vite preview --host 127.0.0.1 --port 4176 --strictPort',
        webServerPort: 4176,
      }
    case 'permission':
    case 'admin':
    default:
      return {
        baseURL: 'http://localhost:4173',
        webServerCommand:
          'pnpm --dir packages/admin build && pnpm --dir packages/admin exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
        webServerPort: 4173,
      }
  }
}

const e2eTarget = resolveE2ETarget(requestedModule, visualContractJson)

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
    baseURL: explicitFrontendBaseURL || e2eTarget.baseURL,
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

  webServer: disableWebServerForPrototypeVisualSource || explicitFrontendBaseURL
    ? undefined
    : {
        command: e2eTarget.webServerCommand,
        port: e2eTarget.webServerPort,
        reuseExistingServer,
        timeout: webServerTimeoutMs,
      },
})
