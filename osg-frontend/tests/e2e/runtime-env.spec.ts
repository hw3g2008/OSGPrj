import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { loadPlaywrightRuntimeEnv } from './support/runtime-env'

test.describe('Playwright Runtime Env', () => {
  test('resolves relative runtime env file path against repo root', () => {
    const env: NodeJS.ProcessEnv = {}
    loadPlaywrightRuntimeEnv(env, {
      repoRoot: resolve(__dirname, '../../..'),
      runtimeContractVars: {
        RESOLVED_RUNTIME_ENV_FILE: 'deploy/.env.dev',
        RESOLVED_E2E_API_PROXY_TARGET: 'http://127.0.0.1:28080',
      },
    })

    expect(env.SPRING_DATA_REDIS_HOST).toBe('47.94.213.128')
    expect(env.SPRING_DATA_REDIS_PORT).toBe('26379')
    expect(env.SPRING_DATA_REDIS_PASSWORD).toBe('redis123456')
    expect(env.E2E_REDIS_HOST).toBe('47.94.213.128')
    expect(env.E2E_API_PROXY_TARGET).toBe('http://127.0.0.1:28080')
  })

  test('normalizes preconfigured relative provider log path against repo root', () => {
    const repoRoot = resolve(__dirname, '../../..')
    const env: NodeJS.ProcessEnv = {
      PASSWORD_RESET_PROVIDER_LOG_PATH: 'osg-spec-docs/tasks/audit/password-reset-mailbox.log',
    }
    loadPlaywrightRuntimeEnv(env, {
      repoRoot,
      runtimeContractVars: {
        RESOLVED_RUNTIME_ENV_FILE: 'deploy/.env.dev',
        RESOLVED_E2E_API_PROXY_TARGET: 'http://127.0.0.1:28080',
      },
    })

    expect(env.PASSWORD_RESET_PROVIDER_LOG_PATH).toBe(
      resolve(repoRoot, 'osg-spec-docs/tasks/audit/password-reset-mailbox.log'),
    )
  })
})
