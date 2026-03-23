import { loadPlaywrightRuntimeEnv, normalizeRuntimeEnvValue } from './runtime-env'

export { normalizeRuntimeEnvValue } from './runtime-env'

export interface AuthRuntimeConfig {
  username: string
  password: string
  captchaCode: string
  redisHost: string
  redisPort: string
  redisPassword: string
  redisContainer: string
  loginPath: string
  loginApiPath: string
  infoPath: string
  postLoginPath: string
}

interface AuthRuntimeDefaults {
  username: string
  password: string
  loginPath: string
  loginApiPath: string
  infoPath: string
  postLoginPath: string
}

function resolveModuleDefaults(env: Record<string, string | undefined>): AuthRuntimeDefaults {
  const moduleName =
    normalizeRuntimeEnvValue(env.UI_VISUAL_MODULE) ||
    normalizeRuntimeEnvValue(env.E2E_MODULE) ||
    ''

  if (moduleName === 'lead-mentor') {
    return {
      username: 'student_demo',
      password: 'student123',
      loginPath: '/login',
      loginApiPath: '/api/lead-mentor/login',
      infoPath: '/api/lead-mentor/getInfo',
      postLoginPath: '/home',
    }
  }

  return {
    username: 'admin',
    password: 'Osg@2025',
    loginPath: '/login',
    loginApiPath: '/api/login',
    infoPath: '/api/getInfo',
    postLoginPath: '/dashboard',
  }
}

export function resolveAuthRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): AuthRuntimeConfig {
  if (env === process.env) {
    loadPlaywrightRuntimeEnv(process.env)
  }
  const moduleDefaults = resolveModuleDefaults(env)
  const username = normalizeRuntimeEnvValue(env.E2E_ADMIN_USERNAME)
  const password = normalizeRuntimeEnvValue(env.E2E_ADMIN_PASSWORD)
  const captchaCode = normalizeRuntimeEnvValue(env.E2E_CAPTCHA_CODE)
  const redisHost = normalizeRuntimeEnvValue(env.E2E_REDIS_HOST) || normalizeRuntimeEnvValue(env.SPRING_DATA_REDIS_HOST)
  const redisPort = normalizeRuntimeEnvValue(env.E2E_REDIS_PORT) || normalizeRuntimeEnvValue(env.SPRING_DATA_REDIS_PORT)
  const redisPassword = normalizeRuntimeEnvValue(env.E2E_REDIS_PASSWORD) || normalizeRuntimeEnvValue(env.SPRING_DATA_REDIS_PASSWORD)
  const redisContainer = normalizeRuntimeEnvValue(env.E2E_REDIS_CONTAINER)
  const loginPath = normalizeRuntimeEnvValue(env.E2E_LOGIN_PATH)
  const loginApiPath = normalizeRuntimeEnvValue(env.E2E_LOGIN_API_PATH)
  const infoPath = normalizeRuntimeEnvValue(env.E2E_INFO_PATH)
  const postLoginPath = normalizeRuntimeEnvValue(env.E2E_POST_LOGIN_PATH)
  return {
    username: username || moduleDefaults.username,
    password: password || moduleDefaults.password,
    captchaCode: captchaCode || '',
    redisHost: redisHost || '127.0.0.1',
    redisPort: redisPort || '26379',
    redisPassword: redisPassword || 'redis123456',
    redisContainer: redisContainer || '',
    loginPath: loginPath || moduleDefaults.loginPath,
    loginApiPath: loginApiPath || moduleDefaults.loginApiPath,
    infoPath: infoPath || moduleDefaults.infoPath,
    postLoginPath: postLoginPath || moduleDefaults.postLoginPath,
  }
}
