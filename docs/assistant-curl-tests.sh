#!/usr/bin/env bash
# ============================================================
# 助教端 (assistant) 全页面 curl 接口测试
# 测试账号: testassistant@osg.test / Osg@2026
# 后端: 47.94.213.128:28080
# 日期: 2026-04-06
# ============================================================

set -euo pipefail
BASE="http://47.94.213.128:28080"
PASS=0
FAIL=0
WARN=0
RESULTS=""

log_result() {
  local status="$1" page="$2" api="$3" detail="$4"
  RESULTS="${RESULTS}\n${status} | ${page} | ${api} | ${detail}"
  case "$status" in
    PASS) ((PASS++)) ;;
    FAIL) ((FAIL++)) ;;
    WARN) ((WARN++)) ;;
  esac
}

check_api() {
  local page="$1" api="$2" method="${3:-GET}" body="${4:-}"
  local http_code response

  if [ "$method" = "POST" ] && [ -n "$body" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE$api" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" 2>&1)
  elif [ "$method" = "PUT" ] && [ -n "$body" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE$api" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" "$BASE$api" \
      -H "Authorization: Bearer $TOKEN" 2>&1)
  fi

  http_code=$(echo "$response" | tail -1)
  local json_body=$(echo "$response" | sed '$d')
  local code=$(echo "$json_body" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('code',''))" 2>/dev/null || echo "parse_error")
  local msg=$(echo "$json_body" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('msg','')[:60])" 2>/dev/null || echo "parse_error")
  local row_count=$(echo "$json_body" | python3 -c "import sys,json;d=json.load(sys.stdin);r=d.get('rows',d.get('data',[]));print(len(r) if isinstance(r,list) else '-')" 2>/dev/null || echo "-")

  if [ "$code" = "200" ]; then
    if echo "$api" | grep -qE "^/assistant/"; then
      log_result "PASS" "$page" "$api" "code=$code, rows=$row_count — $msg"
    else
      log_result "WARN" "$page" "$api" "code=$code, rows=$row_count — 非assistant接口！归属错误"
    fi
  else
    log_result "FAIL" "$page" "$api" "HTTP=$http_code, code=$code — $msg"
  fi
}

echo "=============================="
echo "助教端接口测试开始"
echo "=============================="

# ---- Step 0: Login ----
echo "[0] 登录..."
LOGIN_RESP=$(curl -s -X POST "$BASE/assistant/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testassistant@osg.test","password":"Osg@2026"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "FATAL: 登录失败"
  echo "$LOGIN_RESP"
  exit 1
fi
log_result "PASS" "auth" "/assistant/login" "登录成功, token获取"
echo "  Token: ${TOKEN:0:30}..."

# ---- Step 1: getInfo ----
echo "[1] getInfo..."
check_api "auth" "/assistant/getInfo"

# ---- Step 2: Job Overview ----
echo "[2] Job Overview..."
check_api "job-overview" "/assistant/job-overview/list"
check_api "job-overview" "/assistant/job-overview/calendar"
# 详情（取第一条的id）
FIRST_ID=$(curl -s "$BASE/assistant/job-overview/list" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;rows=json.load(sys.stdin).get('rows',[]);print(rows[0]['id'] if rows else '')" 2>/dev/null)
if [ -n "$FIRST_ID" ]; then
  check_api "job-overview" "/assistant/job-overview/$FIRST_ID"
else
  log_result "WARN" "job-overview" "/assistant/job-overview/{id}" "无数据，跳过详情测试"
fi

# 带筛选参数
check_api "job-overview-filter" "/assistant/job-overview/list?coachingStatus=new"
check_api "job-overview-filter" "/assistant/job-overview/list?studentName=YS"

# ---- Step 3: Mock Practice ----
echo "[3] Mock Practice..."
check_api "mock-practice" "/api/mentor/mock-practice/list"
check_api "mock-practice-filter" "/api/mentor/mock-practice/list?practiceType=mock_interview"
check_api "mock-practice-filter" "/api/mentor/mock-practice/list?status=scheduled"

# ---- Step 4: Positions ----
echo "[4] Positions..."
check_api "positions" "/admin/position/stats"
check_api "positions" "/admin/position/drill-down"
# 取第一个 positionId 测试关联学员
FIRST_POS=$(curl -s "$BASE/admin/position/drill-down" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
data=json.load(sys.stdin).get('data',[])
for ind in data:
  for comp in ind.get('companies',[]):
    for pos in comp.get('positions',[]):
      if pos.get('positionId'):
        print(pos['positionId'])
        sys.exit()
" 2>/dev/null)
if [ -n "$FIRST_POS" ]; then
  check_api "positions" "/admin/position/$FIRST_POS/students"
else
  log_result "WARN" "positions" "/admin/position/{id}/students" "无positionId，跳过"
fi

# ---- Step 5: Students ----
echo "[5] Students..."
check_api "students" "/admin/student/list"
check_api "students-filter" "/admin/student/list?keyword=YS"

# ---- Step 6: Class Records ----
echo "[6] Class Records..."
check_api "class-records" "/admin/class-record/list"
check_api "class-records" "/admin/class-record/stats"
check_api "class-records-filter" "/admin/class-record/list?status=approved"

# ---- Step 7: Profile ----
echo "[7] Profile..."
check_api "profile" "/api/mentor/profile"

# ---- Step 8: Schedule ----
echo "[8] Schedule..."
check_api "schedule" "/api/mentor/schedule"
check_api "schedule" "/api/mentor/schedule/last-week"

# ---- Step 9: 班主任接口鉴权测试（助教 token 不应能访问） ----
echo "[9] 鉴权隔离测试..."
LM_RESP=$(curl -s "$BASE/lead-mentor/mock-practice/list" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('code',''))" 2>/dev/null)
if [ "$LM_RESP" = "403" ]; then
  log_result "PASS" "鉴权隔离" "/lead-mentor/mock-practice/list" "正确返回403拒绝"
else
  log_result "FAIL" "鉴权隔离" "/lead-mentor/mock-practice/list" "期望403但得到code=$LM_RESP"
fi

LM_RESP2=$(curl -s "$BASE/lead-mentor/job-overview/list" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('code',''))" 2>/dev/null)
if [ "$LM_RESP2" = "403" ]; then
  log_result "PASS" "鉴权隔离" "/lead-mentor/job-overview/list" "正确返回403拒绝"
else
  log_result "FAIL" "鉴权隔离" "/lead-mentor/job-overview/list" "期望403但得到code=$LM_RESP2"
fi

# ============================================================
# 汇总
# ============================================================
echo ""
echo "=============================="
echo "测试结果汇总"
echo "=============================="
echo "PASS: $PASS  |  FAIL: $FAIL  |  WARN: $WARN"
echo ""
echo "状态 | 页面 | 接口 | 详情"
echo "---- | ---- | ---- | ----"
echo -e "$RESULTS"
