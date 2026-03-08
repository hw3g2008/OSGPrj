import { execSync } from 'node:child_process'
import { resolveAuthRuntimeConfig } from './auth-config'

export interface IpRateLimitKeyInput {
  keyPrefix: string
  targetClass: string
  methodName: string
  ip?: string
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`
}

function normalizeRedisValue(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) {
    return null
  }
  let value = lines[lines.length - 1]
  if (value === '(nil)') {
    return null
  }
  value = value.replace(/^"(.*)"$/, '$1')
  return value || null
}

function resolveRedisShellContext() {
  const authConfig = resolveAuthRuntimeConfig()
  const redisDb = (process.env.E2E_REDIS_DB || process.env.SPRING_DATA_REDIS_DATABASE || '0').trim()
  const baseArgs = [
    '--raw',
    '-h', authConfig.redisHost,
    '-p', authConfig.redisPort,
    '-n', redisDb,
  ]
  const redisEnv = authConfig.redisPassword
    ? [`REDISCLI_AUTH=${shellQuote(authConfig.redisPassword)}`]
    : []
  return {
    authConfig,
    baseArgs,
    redisDb,
    redisEnv,
  }
}

function runRedisCommand(args: string[]): string {
  const { authConfig, baseArgs, redisEnv } = resolveRedisShellContext()
  const directCmd = [
    ...redisEnv,
    'redis-cli',
    ...baseArgs.map((item) => shellQuote(item)),
    ...args.map((item) => shellQuote(item)),
  ].join(' ')
  try {
    return execSync(`bash -lc ${shellQuote(directCmd)}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch (directError) {
    if (!authConfig.redisContainer) {
      throw directError
    }
    const dockerInner = [
      ...redisEnv,
      'redis-cli',
      ...baseArgs
        .filter((item) => item !== '-h' && item !== authConfig.redisHost && item !== '-p' && item !== authConfig.redisPort)
        .map((item) => shellQuote(item)),
      ...args.map((item) => shellQuote(item)),
    ].join(' ')
    const dockerCmd = `docker exec ${shellQuote(authConfig.redisContainer)} sh -lc ${shellQuote(dockerInner)}`
    return execSync(`bash -lc ${shellQuote(dockerCmd)}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  }
}

export function readRedisValue(key: string): string | null {
  return normalizeRedisValue(runRedisCommand(['GET', key]))
}

export function deleteRedisKeys(keys: string[]): number {
  if (keys.length === 0) {
    return 0
  }
  const output = runRedisCommand(['DEL', ...keys])
  const normalized = normalizeRedisValue(output)
  const deleted = normalized == null ? Number.NaN : Number(normalized)
  if (!Number.isFinite(deleted) || deleted < 0) {
    throw new Error(`DEL should return non-negative integer, got '${output}'`)
  }
  return deleted
}

export function buildIpRateLimitKey(input: IpRateLimitKeyInput): string {
  const ip = (input.ip || process.env.E2E_CLIENT_IP || '127.0.0.1').trim()
  return `${input.keyPrefix}${ip}-${input.targetClass}-${input.methodName}`
}
