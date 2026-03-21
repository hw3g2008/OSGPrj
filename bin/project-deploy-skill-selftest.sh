#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d "${TMPDIR:-/tmp}/project-deploy-skill-home.XXXXXX")"

cleanup() {
  rm -rf "${TMP_HOME}"
}
trap cleanup EXIT

CONFIG_FILE="${ROOT_DIR}/.claude/project/config.yaml"
CLAUDE_SKILL="${ROOT_DIR}/.claude/skills/deploy-frontend/SKILL.md"
CODEX_SKILL="${ROOT_DIR}/.codex/project-skills/deploy-frontend/SKILL.md"
INSTALL_SCRIPT="${ROOT_DIR}/bin/install-project-codex-skills.sh"

grep -q 'deploy_frontend_single:' "${CONFIG_FILE}" || {
  echo "FAIL: config should define commands.ops.deploy_frontend_single"
  exit 1
}

[[ -f "${CLAUDE_SKILL}" ]] || {
  echo "FAIL: missing Claude deploy frontend skill"
  exit 1
}

[[ -f "${CODEX_SKILL}" ]] || {
  echo "FAIL: missing Codex project deploy frontend skill"
  exit 1
}

[[ -x "${INSTALL_SCRIPT}" ]] || {
  echo "FAIL: missing executable Codex skill install script"
  exit 1
}

HOME="${TMP_HOME}" CODEX_HOME="${TMP_HOME}/.codex" "${INSTALL_SCRIPT}"

LINK_PATH="${TMP_HOME}/.codex/skills/deploy-frontend"
[[ -L "${LINK_PATH}" ]] || {
  ls -la "${TMP_HOME}/.codex/skills" 2>/dev/null || true
  echo "FAIL: install script should create a symlinked Codex skill"
  exit 1
}

TARGET_PATH="$(readlink "${LINK_PATH}")"
EXPECTED_TARGET="${ROOT_DIR}/.codex/project-skills/deploy-frontend"
[[ "${TARGET_PATH}" == "${EXPECTED_TARGET}" ]] || {
  printf 'actual=%s\nexpected=%s\n' "${TARGET_PATH}" "${EXPECTED_TARGET}"
  echo "FAIL: Codex skill symlink target mismatch"
  exit 1
}

echo "PASS: project-deploy-skill-selftest"
