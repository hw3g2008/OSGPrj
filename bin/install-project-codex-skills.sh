#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_SOURCE_DIR="${ROOT_DIR}/.codex/project-skills"
CODEX_HOME_DIR="${CODEX_HOME:-${HOME}/.codex}"
SKILL_TARGET_DIR="${CODEX_HOME_DIR}/skills"

mkdir -p "${SKILL_TARGET_DIR}"

find "${SKILL_SOURCE_DIR}" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
  if [[ ! -f "${skill_dir}/SKILL.md" ]]; then
    continue
  fi

  skill_name="$(basename "${skill_dir}")"
  ln -sfn "${skill_dir}" "${SKILL_TARGET_DIR}/${skill_name}"
done

echo "PASS: install-project-codex-skills -> ${SKILL_TARGET_DIR}"
