import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }
  return value
}

export function normalizeRuntimeEnvValue(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const normalized = trimmed.toLowerCase()
  if (normalized === 'undefined' || normalized === 'null') {
    return undefined
  }
  return trimmed
}

function parseDotEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
    const key = line.slice(0, separatorIndex).trim()
    const value = normalizeRuntimeEnvValue(stripWrappingQuotes(line.slice(separatorIndex + 1).trim()))
    if (key && value !== undefined) {
      result[key] = value
    }
  }
  return result
}

function parseShellAssignments(output: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || !line.includes('=')) {
      continue
    }
    const separatorIndex = line.indexOf('=')
    const key = line.slice(0, separatorIndex).trim()
    const value = normalizeRuntimeEnvValue(stripWrappingQuotes(line.slice(separatorIndex + 1).trim()))
    if (key && value !== undefined) {
      result[key] = value
    }
  }
  return result
}

function parseToolEnvJson(value: string | undefined): Record<string, string> {
  const normalized = normalizeRuntimeEnvValue(value)
  if (!normalized) {
    return {}
  }
  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, raw]) => [key, normalizeRuntimeEnvValue(typeof raw === 'string' ? raw : String(raw))] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0]) && entry[1] !== undefined),
    )
  } catch {
    return {}
  }
}

function applyDefaults(
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  values: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(values)) {
    if (env[key] != null) {
      continue
    }
    if (key.endsWith('_PATH')) {
      env[key] = resolveFromRepoRoot(value, repoRoot)
      continue
    }
    env[key] = value
  }
}

function resolveFromRepoRoot(pathValue: string, repoRoot: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(repoRoot, pathValue)
}

interface LoadRuntimeEnvOptions {
  repoRoot?: string
  runtimeContractVars?: Record<string, string>
}

export function loadPlaywrightRuntimeEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: LoadRuntimeEnvOptions = {},
): void {
  const repoRoot = options.repoRoot || resolve(__dirname, '../../../..')
  const defaultEnvFile = resolve(repoRoot, 'deploy/.env.dev')
  const explicitApiProxyTarget = normalizeRuntimeEnvValue(env.E2E_API_PROXY_TARGET)
  let runtimeContractVars: Record<string, string> = options.runtimeContractVars || {}

  if (!options.runtimeContractVars) {
    try {
      const resolved = execSync('bash bin/resolve-runtime-contract.sh', {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      runtimeContractVars = parseShellAssignments(resolved)
    } catch {
      runtimeContractVars = {}
    }
  }

  const envFilePath = runtimeContractVars.RESOLVED_RUNTIME_ENV_FILE
    ? resolveFromRepoRoot(runtimeContractVars.RESOLVED_RUNTIME_ENV_FILE, repoRoot)
    : defaultEnvFile
  const preconfiguredProviderLogPath = normalizeRuntimeEnvValue(env.PASSWORD_RESET_PROVIDER_LOG_PATH)
  if (preconfiguredProviderLogPath) {
    env.PASSWORD_RESET_PROVIDER_LOG_PATH = resolveFromRepoRoot(preconfiguredProviderLogPath, repoRoot)
  }
  if (existsSync(envFilePath)) {
    const dotenvVars = parseDotEnvFile(readFileSync(envFilePath, 'utf-8'))
    applyDefaults(env, repoRoot, dotenvVars)
  }

  const toolEnv = parseToolEnvJson(runtimeContractVars.RESOLVED_RUNTIME_TOOL_ENV_JSON)
  applyDefaults(env, repoRoot, toolEnv)

  const resolvedApiProxyTarget = normalizeRuntimeEnvValue(runtimeContractVars.RESOLVED_E2E_API_PROXY_TARGET)
  if (explicitApiProxyTarget) {
    env.E2E_API_PROXY_TARGET = explicitApiProxyTarget
  } else if (resolvedApiProxyTarget) {
    env.E2E_API_PROXY_TARGET = resolvedApiProxyTarget
  }
  env.E2E_REDIS_HOST ||= env.SPRING_DATA_REDIS_HOST
  env.E2E_REDIS_PORT ||= env.SPRING_DATA_REDIS_PORT
  env.E2E_REDIS_PASSWORD ||= env.SPRING_DATA_REDIS_PASSWORD
}
