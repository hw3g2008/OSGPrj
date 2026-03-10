import { test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
const stability = resolveStabilityConfigFromEnv()

test('login without stability', async ({ page }) => {
  await loginAsAdmin(page)
})

test('login with stability', async ({ page }) => {
  await applyStabilityToPage(page, stability)
  await loginAsAdmin(page)
})
