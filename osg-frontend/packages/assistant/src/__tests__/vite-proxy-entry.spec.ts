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

  // §B7: mentor controller mapping 已去 /api/ 前缀，assistant 端不再需要 /api/mentor passthrough。
  //      跨端调用走默认 /api strip → backend /mentor/... 即可。

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
