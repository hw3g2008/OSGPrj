import { test, expect } from '@playwright/test'
import { resolveAuthRuntimeConfig } from './support/auth-config'

test.describe('Auth Runtime Config', () => {
  test('uses defaults when env is empty', () => {
    const config = resolveAuthRuntimeConfig({})

    expect(config.loginPath).toBe('/login')
    expect(config.loginApiPath).toBe('/api/login')
    expect(config.infoPath).toBe('/api/getInfo')
    expect(config.postLoginPath).toBe('/dashboard')
    expect(config.username).toBe('admin')
  })

  test('allows env overrides for login and landing paths', () => {
    const config = resolveAuthRuntimeConfig({
      E2E_LOGIN_PATH: '/auth/sign-in',
      E2E_LOGIN_API_PATH: '/api/auth/login',
      E2E_INFO_PATH: '/api/profile/me',
      E2E_POST_LOGIN_PATH: '/workbench',
      E2E_ADMIN_USERNAME: 'root',
    })

    expect(config.loginPath).toBe('/auth/sign-in')
    expect(config.loginApiPath).toBe('/api/auth/login')
    expect(config.infoPath).toBe('/api/profile/me')
    expect(config.postLoginPath).toBe('/workbench')
    expect(config.username).toBe('root')
  })

  test('uses lead-mentor module defaults that match the live verification runtime', () => {
    const config = resolveAuthRuntimeConfig({
      UI_VISUAL_MODULE: 'lead-mentor',
    })

    expect(config.loginPath).toBe('/login')
    expect(config.loginApiPath).toBe('/api/lead-mentor/login')
    expect(config.infoPath).toBe('/api/lead-mentor/getInfo')
    expect(config.postLoginPath).toBe('/home')
    expect(config.username).toBe('student_demo')
    expect(config.password).toBe('student123')
  })

  test('lead-mentor module defaults still allow explicit env overrides', () => {
    const config = resolveAuthRuntimeConfig({
      UI_VISUAL_MODULE: 'lead-mentor',
      E2E_ADMIN_USERNAME: 'override-user',
      E2E_ADMIN_PASSWORD: 'override-pass',
      E2E_LOGIN_API_PATH: '/api/custom/login',
      E2E_INFO_PATH: '/api/custom/info',
      E2E_POST_LOGIN_PATH: '/custom-home',
    })

    expect(config.username).toBe('override-user')
    expect(config.password).toBe('override-pass')
    expect(config.loginApiPath).toBe('/api/custom/login')
    expect(config.infoPath).toBe('/api/custom/info')
    expect(config.postLoginPath).toBe('/custom-home')
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
