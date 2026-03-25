import type { ProxyOptions } from 'vite'

export const DEFAULT_API_PROXY_TARGET = 'http://127.0.0.1:28080'

interface CreateApiProxyConfigOptions {
  authNamespace?: string
  passthroughPrefixes?: string[]
  customRewritePrefixes?: Record<string, (path: string) => string>
}

export function resolveApiProxyTarget() {
  return process.env.E2E_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET
}

function createProxyEntry(target: string, rewrite?: (path: string) => string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    ...(rewrite ? { rewrite } : {}),
  }
}

export function createApiProxyConfig(options: CreateApiProxyConfigOptions = {}) {
  const target = resolveApiProxyTarget()
  const proxy: Record<string, ProxyOptions> = {}

  if (options.authNamespace) {
    proxy[`/api/${options.authNamespace}/login`] = createProxyEntry(
      target,
      () => `/${options.authNamespace}/login`,
    )
    proxy[`/api/${options.authNamespace}/getInfo`] = createProxyEntry(
      target,
      () => `/${options.authNamespace}/getInfo`,
    )
  }

  for (const [prefix, rewrite] of Object.entries(options.customRewritePrefixes ?? {})) {
    proxy[prefix] = createProxyEntry(target, rewrite)
  }

  for (const prefix of options.passthroughPrefixes ?? []) {
    proxy[prefix] = createProxyEntry(target)
  }

  proxy['/api'] = createProxyEntry(target, (path) => path.replace(/^\/api/, ''))

  return proxy
}
