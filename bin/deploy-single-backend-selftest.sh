#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/deploy-single-backend-selftest.XXXXXX")"
SOURCE_PROBE="${TMP_DIR}/source-probe.sh"
BUNDLE_ROOT="${TMP_DIR}/bundle"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

HELP_OUT="$("${ROOT_DIR}/bin/deploy-test-artifacts.sh" --help)"
grep -q -- '--backend-only' <<<"${HELP_OUT}" || {
  printf '%s\n' "${HELP_OUT}"
  echo "FAIL: help output should document --backend-only"
  exit 1
}

cat > "${SOURCE_PROBE}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$1"
BUNDLE_ROOT="$2"

export DEPLOY_TEST_ARTIFACTS_SOURCE_ONLY=1
# shellcheck source=/dev/null
source "${ROOT_DIR}/bin/deploy-test-artifacts.sh"

BACKEND_ONLY=1
TARGET_FRONTEND_APPS=()
RELEASE_TAG="selftest-single-backend"

prepare_artifact_bundle "${BUNDLE_ROOT}"
EOF
chmod +x "${SOURCE_PROBE}"

if ! "${SOURCE_PROBE}" "${ROOT_DIR}" "${BUNDLE_ROOT}"; then
  echo "FAIL: deploy-test-artifacts.sh should be sourceable for backend-only bundle self-tests"
  exit 1
fi

if [[ ! -f "${BUNDLE_ROOT}/backend-context/ruoyi-admin.jar" ]]; then
  find "${BUNDLE_ROOT}" -maxdepth 3 | sort
  echo "FAIL: backend-only bundle should include backend jar"
  exit 1
fi

if [[ ! -f "${BUNDLE_ROOT}/deploy/backend/Dockerfile.artifact" ]]; then
  find "${BUNDLE_ROOT}" -maxdepth 3 | sort
  echo "FAIL: backend-only bundle should include backend artifact Dockerfile"
  exit 1
fi

if [[ -d "${BUNDLE_ROOT}/frontend-contexts" ]] && find "${BUNDLE_ROOT}/frontend-contexts" -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  find "${BUNDLE_ROOT}/frontend-contexts" -maxdepth 2 -type d | sort
  echo "FAIL: backend-only bundle should not include frontend contexts"
  exit 1
fi

echo "PASS: deploy-single-backend-selftest"
