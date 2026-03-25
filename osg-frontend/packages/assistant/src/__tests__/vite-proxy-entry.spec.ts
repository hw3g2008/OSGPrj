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

describe('assistant vite proxy contract', () => {
  it('rewrites assistant auth endpoints to the backend assistant namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/assistant/login'].rewrite?.('/api/assistant/login')).toBe('/assistant/login')
    expect(proxy['/api/assistant/getInfo'].rewrite?.('/api/assistant/getInfo')).toBe('/assistant/getInfo')
  })

  it('keeps mentor shared /api/mentor APIs on the backend /api/mentor namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/mentor'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api/mentor'].rewrite?.('/api/mentor/profile') ?? '/api/mentor/profile').toBe('/api/mentor/profile')
  })

  it('keeps a generic /api proxy and preview parity for local verification', async () => {
    const loadedConfig = await loadConfigFromFile(
      {
        command: 'serve',
        mode: 'test',
        isSsrBuild: false,
        isPreview: false,
      },
      MODULE_PATH,
    )
    const proxy = (loadedConfig?.config.server?.proxy ?? {}) as ProxyRecord

    expect(proxy['/api'].rewrite?.('/api/system/user/list')).toBe('/system/user/list')
    expect(loadedConfig?.config.preview?.proxy).toEqual(loadedConfig?.config.server?.proxy)
    expect(loadedConfig?.config.preview?.port).toBe(4176)
  })
})
