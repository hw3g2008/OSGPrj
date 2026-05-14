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
  // §B7: 后端 controller mapping 已统一为 /mentor/...（不带 /api/ 前缀）。
  // 前端 axios baseURL='/api' + url='/mentor/...' → 浏览器请求 /api/mentor/...，vite proxy
  // 走 /api 默认 strip 后送到 backend /mentor/...，无需 mentor 端特殊路由配置。

  it('strips /api prefix so backend receives /mentor/* namespace', async () => {
    const proxy = await loadProxy()

    expect(proxy['/api'].target).toBe('http://127.0.0.1:28080')
    expect(proxy['/api'].rewrite?.('/api/mentor/login')).toBe('/mentor/login')
    expect(proxy['/api'].rewrite?.('/api/mentor/class-records/reference-candidates')).toBe('/mentor/class-records/reference-candidates')
    expect(proxy['/api'].rewrite?.('/api/mentor/forgot-password/send-code')).toBe('/mentor/forgot-password/send-code')
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
