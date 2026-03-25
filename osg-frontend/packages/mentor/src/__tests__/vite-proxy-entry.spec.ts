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
const MODULE_PATH = resolve(import.meta.dirname, '../../vite.config.ts')

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }

  Object.assign(process.env, ORIGINAL_ENV)
}

async function loadProxy() {
  restoreEnv()
  const loadedConfig = await loadConfigFromFile(
    {
      command: 'serve',
      mode: 'test',
      isSsrBuild: false,
      isPreview: false,
    },
    MODULE_PATH,
  )

  return (loadedConfig?.config.server?.proxy ?? {}) as ProxyRecord
}

afterEach(() => {
  restoreEnv()
})

describe('mentor vite proxy contract', () => {
  it('rewrites mentor auth routes to the backend mentor namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/mentor/login'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api/mentor/login'].rewrite?.('/api/mentor/login')).toBe('/mentor/login')
    expect(proxy['/api/mentor/getInfo'].rewrite?.('/api/mentor/getInfo')).toBe('/mentor/getInfo')
  })

  it('keeps mentor shared /api/mentor APIs on the backend /api/mentor namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/mentor'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api/mentor'].rewrite?.('/api/mentor/profile') ?? '/api/mentor/profile').toBe('/api/mentor/profile')
  })

  it('rewrites forgot-password requests by stripping only the /api prefix', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/mentor/forgot-password'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api/mentor/forgot-password'].rewrite?.('/api/mentor/forgot-password/send-code')).toBe(
      '/mentor/forgot-password/send-code',
    )
  })

  it('keeps preview proxy parity for local verification', async () => {
    const loadedConfig = await loadConfigFromFile(
      {
        command: 'serve',
        mode: 'test',
        isSsrBuild: false,
        isPreview: false,
      },
      MODULE_PATH,
    )

    expect(loadedConfig?.config.preview?.proxy).toEqual(loadedConfig?.config.server?.proxy)
    expect(loadedConfig?.config.preview?.port).toBe(4175)
  })
})
