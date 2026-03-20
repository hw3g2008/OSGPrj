#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"

usage() {
  cat <<'EOF'
Usage:
  bash bin/render-test-artifact-image-env.sh <tag>
EOF
}

if [[ -z "${TAG}" ]]; then
  usage >&2
  exit 1
fi

cat <<EOF
BACKEND_IMAGE=osg-test-artifact-backend:${TAG}
ADMIN_IMAGE=osg-test-artifact-admin:${TAG}
STUDENT_IMAGE=osg-test-artifact-student:${TAG}
MENTOR_IMAGE=osg-test-artifact-mentor:${TAG}
LEAD_MENTOR_IMAGE=osg-test-artifact-lead-mentor:${TAG}
ASSISTANT_IMAGE=osg-test-artifact-assistant:${TAG}
EOF
