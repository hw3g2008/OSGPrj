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
  if (existsSync(envFilePath)) {
    const dotenvVars = parseDotEnvFile(readFileSync(envFilePath, 'utf-8'))
    env.SPRING_DATA_REDIS_HOST ||= dotenvVars.SPRING_DATA_REDIS_HOST
    env.SPRING_DATA_REDIS_PORT ||= dotenvVars.SPRING_DATA_REDIS_PORT
    env.SPRING_DATA_REDIS_PASSWORD ||= dotenvVars.SPRING_DATA_REDIS_PASSWORD
    const providerLogPath =
      normalizeRuntimeEnvValue(env.PASSWORD_RESET_PROVIDER_LOG_PATH) ||
      dotenvVars.PASSWORD_RESET_PROVIDER_LOG_PATH
    if (providerLogPath) {
      env.PASSWORD_RESET_PROVIDER_LOG_PATH = resolveFromRepoRoot(providerLogPath, repoRoot)
    }
    env.E2E_RESET_EMAIL ||= dotenvVars.E2E_RESET_EMAIL
    env.E2E_ADMIN_USERNAME ||= dotenvVars.E2E_ADMIN_USERNAME
    env.E2E_ADMIN_PASSWORD ||= dotenvVars.E2E_ADMIN_PASSWORD
    env.E2E_RESET_PASSWORD ||= dotenvVars.E2E_RESET_PASSWORD
  }

  env.E2E_API_PROXY_TARGET ||= runtimeContractVars.RESOLVED_E2E_API_PROXY_TARGET
  env.E2E_REDIS_HOST ||= env.SPRING_DATA_REDIS_HOST
  env.E2E_REDIS_PORT ||= env.SPRING_DATA_REDIS_PORT
  env.E2E_REDIS_PASSWORD ||= env.SPRING_DATA_REDIS_PASSWORD
}
