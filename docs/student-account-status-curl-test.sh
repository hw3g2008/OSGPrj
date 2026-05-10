#!/usr/bin/env bash
# 学员账号状态联动后端校验 — curl 回归测试
# 详见 docs/student-account-status-spec.md § 5.1（共 18 用例）
#
# 用法：
#   bash docs/student-account-status-curl-test.sh
# 退出码：失败用例数（0 = 全过）
#
# 前置：
#   - 后端跑在 BASE_URL（默认 http://localhost:28080）
#   - 共享测试库 DB / Redis 已就绪（见 deploy/.env.dev）
#   - 测试学员 student_id=46706 / story1.test@osg.test / Osg@2026
#   - 测试导师 user_id=12814 / test-lead-mentor@osg-test.local / Osg@2026
#   - 测试助教 user_id=12813 / test-assistant@osg-test.local / Osg@2026
#
# 数据准备 / 还原：每个用例运行前重置 status，全部跑完后恢复 status=0 + 移黑名单 + 删测试 class_record。

set -u

BASE_URL=${BASE_URL:-http://localhost:28080}
MYSQL_BIN=${MYSQL_BIN:-/usr/local/opt/mysql-client/bin/mysql}
MYSQL_HOST=${MYSQL_HOST:-47.94.213.128}
MYSQL_PORT=${MYSQL_PORT:-23306}
MYSQL_USER=${MYSQL_USER:-ruoyi}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-app123456}
MYSQL_DB=${MYSQL_DB:-ry-vue}
REDIS_HOST=${REDIS_HOST:-47.94.213.128}
REDIS_PORT=${REDIS_PORT:-26379}
REDIS_PASSWORD=${REDIS_PASSWORD:-redis123456}

STUDENT_ID=46706
STUDENT_EMAIL='story1.test@osg.test'
STUDENT_PASS='Osg@2026'
LM_USER='test-lead-mentor@osg-test.local'
LM_PASS='Osg@2026'
AS_USER='test-assistant@osg-test.local'
AS_PASS='Osg@2026'
ADMIN_USER='admin'
ADMIN_PASS='Osg@2026'
SENTINEL='ACCOUNT_STATUS_TEST_ROW'

PASS=0; FAIL=0
declare -a FAILED_CASES

mysql_exec() {
  "$MYSQL_BIN" -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DB" -N -B -e "$1" 2>/dev/null
}

redis_exec() {
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning "$@" 2>/dev/null
}

set_status()        { mysql_exec "update osg_student set account_status='$1' where student_id=$STUDENT_ID;"; }
set_blacklist_on()  { mysql_exec "insert ignore into osg_student_blacklist(student_id, blacklist_reason, added_at) values($STUDENT_ID, 'test', now());"; }
set_blacklist_off() { mysql_exec "delete from osg_student_blacklist where student_id=$STUDENT_ID;"; }

# 助教 staff 可能被冻结（osg_staff.account_status='frozen'），需暂时解冻才能登助教端
ORIGINAL_AS_STAFF_STATUS=''
unfreeze_assistant_staff() {
  ORIGINAL_AS_STAFF_STATUS=$(mysql_exec "select account_status from osg_staff where email='$AS_USER';")
  mysql_exec "update osg_staff set account_status='active' where email='$AS_USER';"
}
restore_assistant_staff() {
  if [[ -n "$ORIGINAL_AS_STAFF_STATUS" && "$ORIGINAL_AS_STAFF_STATUS" != 'NULL' ]]; then
    mysql_exec "update osg_staff set account_status='$ORIGINAL_AS_STAFF_STATUS' where email='$AS_USER';"
  fi
}

# ----- captcha helpers (admin/login 需要 captcha；student/lead-mentor/assistant /login 走 loginWithoutCaptcha 不需要) -----
admin_token() {
  local resp uuid code
  resp=$(curl -s "$BASE_URL/captchaImage")
  uuid=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("uuid",""))')
  code='abcd'
  redis_exec SET "captcha_codes:$uuid" "\"$code\"" EX 60 >/dev/null
  curl -s -X POST "$BASE_URL/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"code\":\"$code\",\"uuid\":\"$uuid\"}" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("token",""))'
}

login_no_captcha() {
  # $1=path  $2=username  $3=password
  curl -s -X POST "$BASE_URL$1" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$2\",\"password\":\"$3\"}"
}

# ----- assertion helpers -----
expect() {
  # $1=case_id  $2=desc  $3=actual_body  $4=mode(token|msg)  $5=expected_substr
  local id="$1" desc="$2" body="$3" mode="$4" want="$5"
  local ok=0 actual=''
  if [[ "$mode" == 'token' ]]; then
    actual=$(printf '%s' "$body" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("token",""))' 2>/dev/null)
    if [[ -n "$actual" ]]; then ok=1; fi
  elif [[ "$mode" == 'msg_contains' ]]; then
    actual=$(printf '%s' "$body" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("msg",""))' 2>/dev/null)
    if [[ "$actual" == *"$want"* ]]; then ok=1; fi
  elif [[ "$mode" == 'code200' ]]; then
    actual=$(printf '%s' "$body" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("code",""))' 2>/dev/null)
    if [[ "$actual" == '200' ]]; then ok=1; fi
  fi
  if [[ "$ok" == 1 ]]; then
    echo "  ✓ $id  $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ $id  $desc"
    echo "      mode=$mode want='$want' actual='$actual'"
    echo "      body=$body"
    FAIL=$((FAIL+1))
    FAILED_CASES+=("$id $desc")
  fi
}

# ----- main -----
trap cleanup EXIT
cleanup() {
  echo
  echo '== 还原数据 =='
  set_status 0
  set_blacklist_off
  restore_assistant_staff
  mysql_exec "delete from osg_class_record_attachment where record_id in (select id from osg_class_record where feedback_content like '${SENTINEL}%');"
  mysql_exec "delete from osg_class_record where feedback_content like '${SENTINEL}%';"
  echo "已恢复 student_id=$STUDENT_ID account_status=0 / 移除黑名单 / 还原助教 staff 状态 / 删除哨兵 class_record"
}

# 进入测试前先暂时解冻助教 staff，让 /assistant/login 可通过门禁
unfreeze_assistant_staff

echo "BASE_URL=$BASE_URL  STUDENT_ID=$STUDENT_ID"
echo
echo '== 登录类（5 用例）=='
# 登 1: 正常登录
set_status 0
RESP=$(login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS")
expect '登1' '正常登录(0) → token' "$RESP" token ''
# 登 2: 冻结禁登
set_status 1
RESP=$(login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS")
expect '登2' '冻结禁登(1) → msg≈冻结' "$RESP" msg_contains '冻结'
# 登 3: 已结束可登录
set_status 2
RESP=$(login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS")
expect '登3' '已结束登录(2) → token' "$RESP" token ''
# 登 4: 退费禁登
set_status 3
RESP=$(login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS")
expect '登4' '退费禁登(3) → msg≈退费' "$RESP" msg_contains '退费'
# 登 5: 黑名单可登录（不拦登录）
set_status 0
set_blacklist_on
RESP=$(login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS")
expect '登5' '黑名单登录(0+bl) → token' "$RESP" token ''
set_blacklist_off

echo
echo '== 求职可见性（3 用例）=='
get_student_token() {
  set_status "$1"; [[ "$2" == bl ]] && set_blacklist_on || set_blacklist_off
  login_no_captcha /student/login "$STUDENT_EMAIL" "$STUDENT_PASS" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))'
}
# 求 1: 正常查求职
TOK=$(get_student_token 0 '')
RESP=$(curl -s -H "Authorization: Bearer $TOK" "$BASE_URL/student/position/list")
expect '求1' '正常(0) → code 200' "$RESP" code200 ''
# 求 2: 已结束禁查
TOK=$(get_student_token 2 '')
RESP=$(curl -s -H "Authorization: Bearer $TOK" "$BASE_URL/student/position/list")
expect '求2' '已结束(2) → msg≈合同已结束' "$RESP" msg_contains '合同已结束'
# 求 3: 黑名单禁查
TOK=$(get_student_token 0 bl)
RESP=$(curl -s -H "Authorization: Bearer $TOK" "$BASE_URL/student/position/list")
expect '求3' '黑名单(0+bl) → msg≈黑名单' "$RESP" msg_contains '黑名单'
set_blacklist_off

echo
echo '== lead-mentor 申报课消（5 用例）=='
LM_TOKEN=$(login_no_captcha /lead-mentor/login "$LM_USER" "$LM_PASS" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
if [[ -z "$LM_TOKEN" ]]; then
  echo '  !! lead-mentor 登录失败，跳过 5 个用例'
  FAIL=$((FAIL+5))
else
  post_lm() {
    local fb="$1"
    curl -s -X POST "$BASE_URL/lead-mentor/class-records" \
      -H "Authorization: Bearer $LM_TOKEN" -H 'Content-Type: application/json' \
      -d "{\"studentId\":$STUDENT_ID,\"classDate\":\"2026-05-08\",\"classStatus\":\"completed\",\"durationHours\":1.0,\"courseType\":\"base_course\",\"feedbackContent\":\"$fb\"}"
  }
  # 申 LM 1: status=0 → 成功 (code 200)
  set_status 0; set_blacklist_off
  RESP=$(post_lm "${SENTINEL}_LM1")
  expect '申LM1' '正常(0) → code 200' "$RESP" code200 ''
  # 申 LM 2: status=1 → frozen
  set_status 1
  RESP=$(post_lm "${SENTINEL}_LM2")
  expect '申LM2' '冻结(1) → msg≈冻结' "$RESP" msg_contains '冻结'
  # 申 LM 3: status=2 → 成功 (合同结束不拦申报)
  set_status 2
  RESP=$(post_lm "${SENTINEL}_LM3")
  expect '申LM3' '已结束(2) → code 200' "$RESP" code200 ''
  # 申 LM 4: status=3 → refunded
  set_status 3
  RESP=$(post_lm "${SENTINEL}_LM4")
  expect '申LM4' '退费(3) → msg≈退费' "$RESP" msg_contains '退费'
  # 申 LM 5: status=0+bl → 成功 (黑名单不拦申报)
  set_status 0; set_blacklist_on
  RESP=$(post_lm "${SENTINEL}_LM5")
  expect '申LM5' '黑名单(0+bl) → code 200' "$RESP" code200 ''
  set_blacklist_off
fi

echo
echo '== assistant 申报课消（5 用例）=='
AS_TOKEN=$(login_no_captcha /assistant/login "$AS_USER" "$AS_PASS" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
if [[ -z "$AS_TOKEN" ]]; then
  echo '  !! assistant 登录失败，跳过 5 个用例'
  FAIL=$((FAIL+5))
else
  post_as() {
    local fb="$1"
    curl -s -X POST "$BASE_URL/assistant/class-records" \
      -H "Authorization: Bearer $AS_TOKEN" -H 'Content-Type: application/json' \
      -d "{\"studentId\":$STUDENT_ID,\"classDate\":\"2026-05-08\",\"classStatus\":\"completed\",\"durationHours\":1.0,\"courseType\":\"base_course\",\"feedbackContent\":\"$fb\"}"
  }
  set_status 0; set_blacklist_off
  RESP=$(post_as "${SENTINEL}_AS1")
  expect '申AS1' '正常(0) → code 200' "$RESP" code200 ''
  set_status 1
  RESP=$(post_as "${SENTINEL}_AS2")
  expect '申AS2' '冻结(1) → msg≈冻结' "$RESP" msg_contains '冻结'
  set_status 2
  RESP=$(post_as "${SENTINEL}_AS3")
  expect '申AS3' '已结束(2) → code 200' "$RESP" code200 ''
  set_status 3
  RESP=$(post_as "${SENTINEL}_AS4")
  expect '申AS4' '退费(3) → msg≈退费' "$RESP" msg_contains '退费'
  set_status 0; set_blacklist_on
  RESP=$(post_as "${SENTINEL}_AS5")
  expect '申AS5' '黑名单(0+bl) → code 200' "$RESP" code200 ''
  set_blacklist_off
fi

echo
echo '== 汇总 =='
echo "PASS=$PASS  FAIL=$FAIL  TOTAL=$((PASS+FAIL))"
if (( FAIL > 0 )); then
  echo '失败用例：'
  for c in "${FAILED_CASES[@]}"; do echo "  - $c"; done
fi
exit "$FAIL"
