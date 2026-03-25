import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DEFAULT_DEV_ENV_FILE = '/tmp/student-final-closure.env'
const REPO_DEV_ENV_FILE = path.resolve(__dirname, '../../../../..', 'deploy/.env.dev')
const CLASS_DIR = path.join(os.tmpdir(), 'student-e2e-java')
const SOURCE_FILE = path.resolve(__dirname, 'java/CreateStudentDemoUser.java')

function resolveFirstExistingPath(paths: string[]): string {
  const existing = paths.find((candidate) => fs.existsSync(candidate))
  if (!existing) {
    throw new Error(`Required runtime dependency is missing. Checked: ${paths.join(', ')}`)
  }
  return existing
}

function resolveVersionedJar(groupPath: string, artifactName: string, versions: string[]): string {
  return resolveFirstExistingPath(
    versions.map((version) =>
      path.join(
        os.homedir(),
        '.m2',
        'repository',
        ...groupPath.split('/'),
        artifactName,
        version,
        `${artifactName}-${version}.jar`,
      ),
    ),
  )
}

function resolveStudentSeedClasspath(): string {
  return [
    resolveVersionedJar('com/mysql', 'mysql-connector-j', ['8.4.0', '8.3.0', '8.2.0']),
    resolveVersionedJar('org/springframework/security', 'spring-security-crypto', ['6.5.7', '6.5.3', '6.3.3', '5.7.11']),
    resolveVersionedJar('org/springframework', 'spring-core', ['6.2.14', '6.2.9', '6.1.12', '6.0.23', '5.3.31']),
    resolveVersionedJar('commons-logging', 'commons-logging', ['1.2']),
  ].join(path.delimiter)
}

function resolveEnvFile(): string | null {
  const candidates = [process.env.DEV_ENV_FILE, DEFAULT_DEV_ENV_FILE, REPO_DEV_ENV_FILE].filter(Boolean) as string[]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

export function hydrateStudentDbEnvFromRuntimeFile() {
  const envFile = resolveEnvFile()
  if (!envFile) {
    return
  }

  const source = fs.readFileSync(envFile, 'utf-8')
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (process.env[key]) {
      continue
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

function compileStudentDemoUser() {
  fs.mkdirSync(CLASS_DIR, { recursive: true })
  execFileSync('javac', ['-cp', resolveStudentSeedClasspath(), '-d', CLASS_DIR, SOURCE_FILE], {
    stdio: 'pipe',
    env: process.env,
  })
  return CLASS_DIR
}

function isRetryableDbSeedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Communications link failure|EOFException|Connection reset|Connection refused/i.test(message)
}

export function reseedStudentDemoUser(password: string = 'student123') {
  hydrateStudentDbEnvFromRuntimeFile()
  const classDir = compileStudentDemoUser()

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      execFileSync(
        'java',
        ['-cp', `${classDir}${path.delimiter}${resolveStudentSeedClasspath()}`, 'CreateStudentDemoUser', password],
        {
          stdio: 'pipe',
          env: process.env,
        },
      )
      return
    } catch (error) {
      if (attempt >= 3 || !isRetryableDbSeedError(error)) {
        throw error
      }
    }
  }
}
