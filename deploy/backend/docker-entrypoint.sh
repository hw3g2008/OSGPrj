#!/usr/bin/env sh
set -eu

read_secret() {
  var_name="$1"
  file_var_name="${var_name}_FILE"
  eval file_path="\${$file_var_name:-}"
  eval current_val="\${$var_name:-}"

  if [ -n "$file_path" ]; then
    if [ ! -f "$file_path" ]; then
      echo "ERROR: secret file not found: $file_path" >&2
      exit 1
    fi
    secret_val="$(cat "$file_path")"
    export "$var_name=$secret_val"
  else
    export "$var_name=$current_val"
  fi
}

read_secret MYSQL_APP_PASSWORD
read_secret REDIS_PASSWORD
read_secret JWT_SECRET

MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-ry-vue}"
MYSQL_APP_USER="${MYSQL_APP_USER:-ruoyi}"
MYSQL_APP_PASSWORD="${MYSQL_APP_PASSWORD:-password}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
RUOYI_PROFILE="${RUOYI_PROFILE:-/data/ruoyi/uploadPath}"

MYSQL_URL="jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}?useUnicode=true&characterEncoding=utf8mb4&zeroDateTimeBehavior=convertToNull&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=GMT%2B8"

export SPRING_DATASOURCE_DRUID_MASTER_URL="$MYSQL_URL"
export SPRING_DATASOURCE_DRUID_MASTER_USERNAME="$MYSQL_APP_USER"
export SPRING_DATASOURCE_DRUID_MASTER_PASSWORD="$MYSQL_APP_PASSWORD"
export SPRING_DATA_REDIS_HOST="$REDIS_HOST"
export SPRING_DATA_REDIS_PORT="$REDIS_PORT"
export SPRING_DATA_REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export TOKEN_SECRET="${JWT_SECRET:-abcdefghijklmnopqrstuvwxyz}"
export RUOYI_PROFILE
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-druid,docker}"

exec java ${JAVA_OPTS:-} -jar /app/ruoyi-admin.jar
