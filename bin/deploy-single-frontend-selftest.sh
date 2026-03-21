#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/deploy-single-frontend-selftest.XXXXXX")"
SOURCE_PROBE="${TMP_DIR}/source-probe.sh"
BUNDLE_ROOT="${TMP_DIR}/bundle"
RENDERED_CONF="${TMP_DIR}/nginx.rendered.conf"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

HELP_OUT="$("${ROOT_DIR}/bin/deploy-test-artifacts.sh" --help)"
grep -q -- '--frontend-app' <<<"${HELP_OUT}" || {
  printf '%s\n' "${HELP_OUT}"
  echo "FAIL: help output should document --frontend-app"
  exit 1
}
grep -q -- '--frontend-only' <<<"${HELP_OUT}" || {
  printf '%s\n' "${HELP_OUT}"
  echo "FAIL: help output should document --frontend-only"
  exit 1
}
grep -q -- '--frontend-api-base' <<<"${HELP_OUT}" || {
  printf '%s\n' "${HELP_OUT}"
  echo "FAIL: help output should document --frontend-api-base"
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

FRONTEND_ONLY=1
TARGET_FRONTEND_APPS=(mentor)
RELEASE_TAG="selftest-single-frontend"

prepare_artifact_bundle "${BUNDLE_ROOT}"
EOF
chmod +x "${SOURCE_PROBE}"

if ! "${SOURCE_PROBE}" "${ROOT_DIR}" "${BUNDLE_ROOT}"; then
  echo "FAIL: deploy-test-artifacts.sh should be sourceable for bundle self-tests"
  exit 1
fi

if [[ -d "${BUNDLE_ROOT}/backend-context" ]]; then
  find "${BUNDLE_ROOT}" -maxdepth 2 -type d | sort
  echo "FAIL: frontend-only bundle should not include backend-context"
  exit 1
fi

if [[ ! -d "${BUNDLE_ROOT}/frontend-contexts/mentor/dist" ]]; then
  find "${BUNDLE_ROOT}" -maxdepth 3 | sort
  echo "FAIL: frontend-only bundle should include mentor dist"
  exit 1
fi

for app in admin student lead-mentor assistant; do
  if [[ -d "${BUNDLE_ROOT}/frontend-contexts/${app}" ]]; then
    find "${BUNDLE_ROOT}/frontend-contexts" -maxdepth 2 -type d | sort
    echo "FAIL: frontend-only bundle should not include ${app}"
    exit 1
  fi
done

API_PROXY_TARGET="http://frontend-only-backend.example:28080" \
TEMPLATE_PATH="${BUNDLE_ROOT}/frontend-contexts/mentor/nginx.conf" \
RENDER_ONLY=1 \
OUTPUT_PATH="${RENDERED_CONF}" \
  "${ROOT_DIR}/deploy/frontend/docker-entrypoint.sh"

grep -q 'proxy_pass http://frontend-only-backend.example:28080/;' "${RENDERED_CONF}" || {
  cat "${RENDERED_CONF}"
  echo "FAIL: rendered nginx config should use explicit API_PROXY_TARGET"
  exit 1
}

echo "PASS: deploy-single-frontend-selftest"
