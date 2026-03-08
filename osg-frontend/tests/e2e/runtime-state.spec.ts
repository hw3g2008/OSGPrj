import { test, expect } from '@playwright/test'
import { buildIpRateLimitKey } from './support/redis-runtime'

test.describe('Runtime State Helpers', () => {
  test('builds ip-based rate limiter keys deterministically', async () => {
    expect(
      buildIpRateLimitKey({
        keyPrefix: 'pwd_reset_code:',
        targetClass: 'com.ruoyi.web.controller.system.SysPasswordController',
        methodName: 'sendCode',
        ip: '127.0.0.1',
      }),
    ).toBe('pwd_reset_code:127.0.0.1-com.ruoyi.web.controller.system.SysPasswordController-sendCode')
  })

  test('defaults ip to localhost when none is provided', async () => {
    expect(
      buildIpRateLimitKey({
        keyPrefix: 'demo:',
        targetClass: 'com.example.DemoController',
        methodName: 'submit',
      }),
    ).toBe('demo:127.0.0.1-com.example.DemoController-submit')
  })
})
