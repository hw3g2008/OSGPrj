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

  test('applies runtime contract tool_env overrides for host-side tools', () => {
    const repoRoot = resolve(__dirname, '../../..')
    const env: NodeJS.ProcessEnv = {}
    loadPlaywrightRuntimeEnv(env, {
      repoRoot,
      runtimeContractVars: {
        RESOLVED_RUNTIME_ENV_FILE: 'deploy/.env.test',
        RESOLVED_E2E_API_PROXY_TARGET: 'http://127.0.0.1:28080',
        RESOLVED_RUNTIME_TOOL_ENV_JSON: JSON.stringify({
          SPRING_DATA_REDIS_HOST: '127.0.0.1',
          SPRING_DATA_REDIS_PORT: '26379',
          SPRING_DATA_REDIS_PASSWORD: 'redis123456',
          E2E_REDIS_HOST: '127.0.0.1',
          E2E_REDIS_PORT: '26379',
          E2E_REDIS_PASSWORD: 'redis123456',
          E2E_REDIS_CONTAINER: 'osg_test-redis-1',
          E2E_PROVIDER_LOG_CONTAINER: 'osg_test-backend-1',
          PASSWORD_RESET_PROVIDER_LOG_PATH: '/data/ruoyi/uploadPath/audit/password-reset-mailbox.log',
        }),
      },
    })

    expect(env.SPRING_DATA_REDIS_HOST).toBe('127.0.0.1')
    expect(env.SPRING_DATA_REDIS_PORT).toBe('26379')
    expect(env.E2E_REDIS_CONTAINER).toBe('osg_test-redis-1')
    expect(env.E2E_PROVIDER_LOG_CONTAINER).toBe('osg_test-backend-1')
    expect(env.PASSWORD_RESET_PROVIDER_LOG_PATH).toBe('/data/ruoyi/uploadPath/audit/password-reset-mailbox.log')
    expect(env.E2E_API_PROXY_TARGET).toBe('http://127.0.0.1:28080')
  })

  test('does not override explicitly provided env values with tool_env', () => {
    const repoRoot = resolve(__dirname, '../../..')
    const env: NodeJS.ProcessEnv = {
      SPRING_DATA_REDIS_HOST: 'custom-host',
      E2E_REDIS_CONTAINER: 'custom-redis',
    }
    loadPlaywrightRuntimeEnv(env, {
      repoRoot,
      runtimeContractVars: {
        RESOLVED_RUNTIME_ENV_FILE: 'deploy/.env.test',
        RESOLVED_E2E_API_PROXY_TARGET: 'http://127.0.0.1:28080',
        RESOLVED_RUNTIME_TOOL_ENV_JSON: JSON.stringify({
          SPRING_DATA_REDIS_HOST: '127.0.0.1',
          E2E_REDIS_CONTAINER: 'osg_test-redis-1',
        }),
      },
    })

    expect(env.SPRING_DATA_REDIS_HOST).toBe('custom-host')
    expect(env.E2E_REDIS_CONTAINER).toBe('custom-redis')
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
