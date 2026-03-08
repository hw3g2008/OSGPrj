import { test, expect } from '@playwright/test'
import { resolveAuthRuntimeConfig } from './support/auth-config'

test.describe('Auth Runtime Config', () => {
  test('uses defaults when env is empty', () => {
    const config = resolveAuthRuntimeConfig({})

    expect(config.loginPath).toBe('/login')
    expect(config.infoPath).toBe('/api/getInfo')
    expect(config.postLoginPath).toBe('/dashboard')
    expect(config.username).toBe('admin')
  })

  test('allows env overrides for login and landing paths', () => {
    const config = resolveAuthRuntimeConfig({
      E2E_LOGIN_PATH: '/auth/sign-in',
      E2E_INFO_PATH: '/api/profile/me',
      E2E_POST_LOGIN_PATH: '/workbench',
      E2E_ADMIN_USERNAME: 'root',
    })

    expect(config.loginPath).toBe('/auth/sign-in')
    expect(config.infoPath).toBe('/api/profile/me')
    expect(config.postLoginPath).toBe('/workbench')
    expect(config.username).toBe('root')
  })

  test('falls back to spring redis env when e2e redis env is absent', () => {
    const config = resolveAuthRuntimeConfig({
      SPRING_DATA_REDIS_HOST: '47.94.213.128',
      SPRING_DATA_REDIS_PORT: '26379',
      SPRING_DATA_REDIS_PASSWORD: 'redis123456',
    })

    expect(config.redisHost).toBe('47.94.213.128')
    expect(config.redisPort).toBe('26379')
    expect(config.redisPassword).toBe('redis123456')
    expect(config.captchaCode).toBe('')
  })

  test('e2e redis env overrides spring redis env', () => {
    const config = resolveAuthRuntimeConfig({
      E2E_REDIS_HOST: '10.0.0.2',
      E2E_REDIS_PORT: '36379',
      E2E_REDIS_PASSWORD: 'override',
      SPRING_DATA_REDIS_HOST: '47.94.213.128',
      SPRING_DATA_REDIS_PORT: '26379',
      SPRING_DATA_REDIS_PASSWORD: 'redis123456',
    })

    expect(config.redisHost).toBe('10.0.0.2')
    expect(config.redisPort).toBe('36379')
    expect(config.redisPassword).toBe('override')
  })
})
