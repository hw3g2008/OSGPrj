import { describe, expect, it, vi } from 'vitest'
import { resolveCaptchaChallengeForLogin } from '../../../../tests/e2e/support/auth-captcha'

describe('auth captcha fallback helper', () => {
  it('falls back to API challenge when page captcha sources fail', async () => {
    const apiFetcher = vi.fn().mockResolvedValue({
      uuid: 'api-uuid',
      code: '2468',
    })

    const result = await resolveCaptchaChallengeForLogin({
      fetchInitialChallenge: async () => null,
      fetchRefreshedChallenge: async () => null,
      fetchApiChallenge: apiFetcher,
      fallbackCaptchaCode: '',
    })

    expect(apiFetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      uuid: 'api-uuid',
      code: '2468',
      source: 'api',
    })
  })

  it('uses configured fallback captcha code only when all live sources fail', async () => {
    const apiFetcher = vi.fn().mockResolvedValue(null)

    const result = await resolveCaptchaChallengeForLogin({
      fetchInitialChallenge: async () => null,
      fetchRefreshedChallenge: async () => null,
      fetchApiChallenge: apiFetcher,
      fallbackCaptchaCode: '9999',
    })

    expect(apiFetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      uuid: undefined,
      code: '9999',
      source: 'fallback',
    })
  })
})
