// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadConfigFromFile } from 'vite'

type ProxyEntry = {
  target?: string
  rewrite?: (path: string) => string
}

type ProxyRecord = Record<string, ProxyEntry>

const ORIGINAL_ENV = { ...process.env }
const PACKAGE_NAMES = ['student', 'mentor', 'lead-mentor', 'assistant', 'admin'] as const
const DEFAULT_PROXY_TARGET = 'http://127.0.0.1:28080'

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }

  Object.assign(process.env, ORIGINAL_ENV)
}

async function loadProxy(packageName: (typeof PACKAGE_NAMES)[number], envOverrides: Record<string, string | undefined> = {}) {
  restoreEnv()

  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  const modulePath = resolve(import.meta.dirname, `../../../${packageName}/vite.config.ts`)
  const loadedConfig = await loadConfigFromFile(
    {
      command: 'serve',
      mode: 'test',
      isSsrBuild: false,
      isPreview: false,
    },
    modulePath,
  )
  const config = loadedConfig?.config

  return (config.server?.proxy ?? {}) as ProxyRecord
}

afterEach(() => {
  restoreEnv()
})

describe('workspace vite proxy contract', () => {
  it('uses the same backend fallback target for all frontend packages when no env override is provided', async () => {
    for (const packageName of PACKAGE_NAMES) {
      const proxy = await loadProxy(packageName, {
        E2E_API_PROXY_TARGET: undefined,
        VITE_API_PROXY_TARGET: undefined,
      })

      for (const entry of Object.values(proxy)) {
        expect(entry.target).toBe(DEFAULT_PROXY_TARGET)
      }
    }
  })

  it('prefers E2E_API_PROXY_TARGET over VITE_API_PROXY_TARGET for all frontend packages', async () => {
    for (const packageName of PACKAGE_NAMES) {
      const proxy = await loadProxy(packageName, {
        E2E_API_PROXY_TARGET: 'http://127.0.0.1:39090',
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:38080',
      })

      for (const entry of Object.values(proxy)) {
        expect(entry.target).toBe('http://127.0.0.1:39090')
      }
    }
  })

  it('keeps mentor-shared /api/mentor routes on the backend /api/mentor namespace for mentor-side packages', async () => {
    for (const packageName of ['mentor', 'assistant'] as const) {
      const proxy = await loadProxy(packageName)
      const mentorApiProxy = proxy['/api/mentor']

      expect(mentorApiProxy).toBeDefined()
      expect(mentorApiProxy.target).toBe(DEFAULT_PROXY_TARGET)
      expect(mentorApiProxy.rewrite?.('/api/mentor/profile') ?? '/api/mentor/profile').toBe('/api/mentor/profile')
    }
  })

  it('rewrites role auth endpoints to their dedicated backend namespaces', async () => {
    const mentorProxy = await loadProxy('mentor')
    expect(mentorProxy['/api/mentor/login'].rewrite?.('/api/mentor/login')).toBe('/mentor/login')
    expect(mentorProxy['/api/mentor/getInfo'].rewrite?.('/api/mentor/getInfo')).toBe('/mentor/getInfo')

    const leadMentorProxy = await loadProxy('lead-mentor')
    expect(leadMentorProxy['/api/lead-mentor/login'].rewrite?.('/api/lead-mentor/login')).toBe('/lead-mentor/login')
    expect(leadMentorProxy['/api/lead-mentor/getInfo'].rewrite?.('/api/lead-mentor/getInfo')).toBe('/lead-mentor/getInfo')

    const assistantProxy = await loadProxy('assistant')
    expect(assistantProxy['/api/assistant/login'].rewrite?.('/api/assistant/login')).toBe('/assistant/login')
    expect(assistantProxy['/api/assistant/getInfo'].rewrite?.('/api/assistant/getInfo')).toBe('/assistant/getInfo')
  })
})
