export interface CaptchaChallenge {
  uuid?: string
  code: string
}

export interface ResolvedCaptchaChallenge extends CaptchaChallenge {
  source: 'initial' | 'refresh' | 'api' | 'fallback'
}

export interface ResolveCaptchaChallengeInput {
  fetchInitialChallenge: () => Promise<CaptchaChallenge | null>
  fetchRefreshedChallenge: () => Promise<CaptchaChallenge | null>
  fetchApiChallenge: () => Promise<CaptchaChallenge | null>
  fallbackCaptchaCode: string
}

function withSource(
  challenge: CaptchaChallenge | null,
  source: ResolvedCaptchaChallenge['source'],
): ResolvedCaptchaChallenge | null {
  if (!challenge?.code) {
    return null
  }
  return {
    uuid: challenge.uuid,
    code: challenge.code,
    source,
  }
}

export async function resolveCaptchaChallengeForLogin(
  input: ResolveCaptchaChallengeInput,
): Promise<ResolvedCaptchaChallenge | null> {
  const initialChallenge = withSource(await input.fetchInitialChallenge(), 'initial')
  if (initialChallenge) {
    return initialChallenge
  }

  const refreshedChallenge = withSource(await input.fetchRefreshedChallenge(), 'refresh')
  if (refreshedChallenge) {
    return refreshedChallenge
  }

  const apiChallenge = withSource(await input.fetchApiChallenge(), 'api')
  if (apiChallenge) {
    return apiChallenge
  }

  const fallbackCaptchaCode = input.fallbackCaptchaCode.trim()
  if (!fallbackCaptchaCode) {
    return null
  }

  return {
    uuid: undefined,
    code: fallbackCaptchaCode,
    source: 'fallback',
  }
}
