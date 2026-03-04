import { defineConfig, devices } from '@playwright/test'

const reuseExistingServer =
  process.env.PW_E2E_REUSE_SERVER === undefined
    ? !process.env.CI
    : process.env.PW_E2E_REUSE_SERVER === '1'

const snapshotPathTemplate = process.env.PW_VISUAL_SNAPSHOT_TEMPLATE

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
