#!/usr/bin/env bash
set -euo pipefail

exec bash bin/run-backend-dev.sh deploy/.env.dev
