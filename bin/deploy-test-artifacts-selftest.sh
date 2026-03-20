#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/deploy-test-artifacts-selftest.XXXXXX")"
TAG="selftest-20260320"
COMPOSE_OUT="${TMP_DIR}/compose.rendered.yml"
ENV_OUT="${TMP_DIR}/artifact-images.env"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

bash "${ROOT_DIR}/bin/render-test-artifact-image-env.sh" "${TAG}" > "${ENV_OUT}"

grep -q '^BACKEND_IMAGE=osg-test-artifact-backend:selftest-20260320$' "${ENV_OUT}" || {
  cat "${ENV_OUT}"
  echo "FAIL: backend artifact image env did not render expected tag"
  exit 1
}

grep -q '^ADMIN_IMAGE=osg-test-artifact-admin:selftest-20260320$' "${ENV_OUT}" || {
  cat "${ENV_OUT}"
  echo "FAIL: admin artifact image env did not render expected tag"
  exit 1
}

pushd "${ROOT_DIR}" >/dev/null
docker compose \
  --env-file deploy/.env.test \
  --env-file "${ENV_OUT}" \
  -f deploy/compose.test.artifact.yml \
  config > "${COMPOSE_OUT}"
popd >/dev/null

grep -q 'image: osg-test-artifact-backend:selftest-20260320' "${COMPOSE_OUT}" || {
  cat "${COMPOSE_OUT}"
  echo "FAIL: rendered compose missing backend artifact image"
  exit 1
}

grep -q 'image: osg-test-artifact-admin:selftest-20260320' "${COMPOSE_OUT}" || {
  cat "${COMPOSE_OUT}"
  echo "FAIL: rendered compose missing admin artifact image"
  exit 1
}

if grep -q '^ *build:' "${COMPOSE_OUT}"; then
  cat "${COMPOSE_OUT}"
  echo "FAIL: artifact override should remove build directives from rendered compose"
  exit 1
fi

echo "PASS: deploy-test-artifacts-selftest"
