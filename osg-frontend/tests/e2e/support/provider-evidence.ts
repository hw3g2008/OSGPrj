import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { normalizeRuntimeEnvValue } from './runtime-env'

function readHostEvidence(pathValue: string): string | undefined {
  if (!existsSync(pathValue)) {
    return undefined
  }
  return readFileSync(pathValue, 'utf-8')
}

function readContainerEvidence(container: string, pathValue: string): string | undefined {
  try {
    return execFileSync('docker', ['exec', container, 'cat', pathValue], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return undefined
  }
}

export function readProviderEvidenceText(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const evidencePath = normalizeRuntimeEnvValue(env.PASSWORD_RESET_PROVIDER_LOG_PATH)
  const evidenceContainer = normalizeRuntimeEnvValue(env.E2E_PROVIDER_LOG_CONTAINER)
  if (!evidencePath) {
    return undefined
  }

  const hostText = readHostEvidence(evidencePath)
  if (hostText !== undefined) {
    return hostText
  }

  if (evidenceContainer) {
    return readContainerEvidence(evidenceContainer, evidencePath)
  }
  return undefined
}
