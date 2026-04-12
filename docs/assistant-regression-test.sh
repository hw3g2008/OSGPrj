#!/usr/bin/env bash
# Assistant API 回归测试脚本
# 用法: bash docs/assistant-regression-test.sh [BASE_URL]
# 示例: bash docs/assistant-regression-test.sh http://localhost:28080
#       bash docs/assistant-regression-test.sh http://47.94.213.128:28080

set -euo pipefail

BASE="${1:-http://47.94.213.128:28080}"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

check() {
  local label="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL+1))
  if [[ "$actual" == *"$expected"* ]]; then
    green "  ✅ $label"
    PASS=$((PASS+1))
  else
    red "  ❌ $label (expected: $expected, got: $actual)"
    FAIL=$((FAIL+1))
  fi
}

bold "=== Assistant API Regression Test ==="
bold "Base URL: $BASE"
echo ""

# --- 1. Login ---
bold "[1/10] POST /assistant/login"
LOGIN_RESP=$(curl -s -X POST "$BASE/assistant/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"testassistant@osg.test","password":"Osg@2026"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
if [[ -n "$TOKEN" && "$TOKEN" != "None" ]]; then
  check "login returns token" "eyJ" "${TOKEN:0:3}"
else
  red "  ❌ Login failed, cannot continue"
  echo "$LOGIN_RESP" | head -3
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# --- 2. getInfo ---
bold "[2/10] GET /assistant/getInfo"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/getInfo")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "getInfo code=200" "200" "$CODE"

# --- 3. job-overview ---
bold "[3/10] GET /assistant/job-overview/list"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/job-overview/list")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
ROWS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('rows',[])))" 2>/dev/null || echo "0")
check "job-overview code=200" "200" "$CODE"
check "job-overview has rows" "true" "$([ "$ROWS" -gt 0 ] 2>/dev/null && echo true || echo false)"

# --- 4. positions/stats ---
bold "[4/10] GET /assistant/positions/stats"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/positions/stats")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "positions/stats code=200" "200" "$CODE"

# --- 5. positions/drill-down ---
bold "[5/10] GET /assistant/positions/drill-down"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/positions/drill-down")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "positions/drill-down code=200" "200" "$CODE"

# --- 6. positions/{id}/students (was P0 403) ---
bold "[6/10] GET /assistant/positions/1/students"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/positions/1/students")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "positions/1/students code=200 (was 403)" "200" "$CODE"

# --- 7. mock-practice/list ---
bold "[7/10] GET /assistant/mock-practice/list"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/mock-practice/list")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "mock-practice/list code=200" "200" "$CODE"

# --- 8. students/list ---
bold "[8/10] GET /assistant/students/list?pageNum=1&pageSize=5"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/students/list?pageNum=1&pageSize=5")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
ROWS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('rows',[])))" 2>/dev/null || echo "0")
check "students/list code=200" "200" "$CODE"
# Check leadMentorName is not just a number
if [[ "$ROWS" -gt 0 ]]; then
  MENTOR_NAME=$(echo "$RESP" | python3 -c "import sys,json; rows=json.load(sys.stdin).get('rows',[]); print(rows[0].get('leadMentorName','-') if rows else '-')")
  IS_NUMERIC=$(echo "$MENTOR_NAME" | grep -cE '^[0-9]+$' || true)
  if [[ "$IS_NUMERIC" == "0" || "$MENTOR_NAME" == "-" ]]; then
    check "leadMentorName is name not ID" "true" "true"
  else
    check "leadMentorName is name not ID" "name" "$MENTOR_NAME (still numeric)"
  fi
fi

# --- 9. class-records ---
bold "[9/10] GET /assistant/class-records/list + /stats"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/class-records/list")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "class-records/list code=200" "200" "$CODE"

RESP=$(curl -s -H "$AUTH" "$BASE/assistant/class-records/stats")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "class-records/stats code=200" "200" "$CODE"

# --- 10. profile + schedule ---
bold "[10/10] GET /assistant/profile + /assistant/schedule"
RESP=$(curl -s -H "$AUTH" "$BASE/assistant/profile")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "profile code=200" "200" "$CODE"

RESP=$(curl -s -H "$AUTH" "$BASE/assistant/schedule")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "schedule code=200" "200" "$CODE"

RESP=$(curl -s -H "$AUTH" "$BASE/assistant/schedule/last-week")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))")
check "schedule/last-week code=200" "200" "$CODE"

# --- Summary ---
echo ""
bold "=== Summary ==="
echo "Total: $TOTAL  Pass: $PASS  Fail: $FAIL"
if [[ "$FAIL" -eq 0 ]]; then
  green "🎉 All tests passed!"
else
  red "⚠️  $FAIL test(s) failed"
fi
