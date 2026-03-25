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

describe('lead-mentor vite proxy contract', () => {
  it('routes runtime /api traffic through the shared backend fallback target', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api'].rewrite?.('/api/getInfo')).toBe('/getInfo')
  })

  it('rewrites lead-mentor auth endpoints to the backend /lead-mentor namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api/lead-mentor/login'].rewrite?.('/api/lead-mentor/login')).toBe('/lead-mentor/login')
    expect(proxy['/api/lead-mentor/getInfo'].rewrite?.('/api/lead-mentor/getInfo')).toBe('/lead-mentor/getInfo')
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
    expect(loadedConfig?.config.preview?.port).toBe(4174)
  })
})
