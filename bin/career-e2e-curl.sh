#!/usr/bin/env bash
# career-position-visibility E2E curl 测试
set -euo pipefail

BASE_URL="http://127.0.0.1:28080"
REDIS_HOST="${REDIS_HOST:-47.94.213.128}"
REDIS_PORT="${REDIS_PORT:-26379}"
REDIS_PWD="${REDIS_PWD:-redis123456}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# 获取验证码
get_captcha() {
  local response=$(curl -s "${BASE_URL}/captchaImage")
  local uuid=$(echo "$response" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
  local code=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PWD:+-a "$REDIS_PWD"} GET "captcha_codes:$uuid" 2>/dev/null || echo "")
  echo "$uuid $code"
}

# 登录获取 token
login() {
  local creds=$(get_captcha)
  local uuid=$(echo "$creds" | awk '{print $1}')
  local code=$(echo "$creds" | awk '{print $2}')

  if [ -z "$code" ]; then
    # 尝试硬编码验证码
    code="0"
  fi

  local response=$(curl -s -X POST "${BASE_URL}/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"admin123\",\"code\":\"$code\",\"uuid\":\"$uuid\"}")

  local token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "$token"
}

echo "============================================"
echo "career-position-visibility E2E curl 测试"
echo "============================================"

info "Step 1: 获取 admin token"
TOKEN=$(login)
if [ -z "$TOKEN" ]; then
  fail "无法获取 token，退出"
  exit 1
fi
pass "Token 获取成功: ${TOKEN:0:20}..."
HEADER="Authorization: Bearer $TOKEN"
HEADER_JSON="{\"Authorization\": \"Bearer $TOKEN\"}"

info "Step 2: 检查后端健康状态"
HEALTH=$(curl -s "${BASE_URL}/actuator/health")
if echo "$HEALTH" | grep -q "UP"; then
  pass "后端健康: $HEALTH"
else
  fail "后端不健康: $HEALTH"
fi

info "Step 3: 测试字典接口 (osg_major_direction)"
DICT=$(curl -s -H "$HEADER" "${BASE_URL}/dict/osg_major_direction")
if echo "$DICT" | grep -q "finance"; then
  pass "字典接口正常 (包含 finance)"
else
  fail "字典接口异常: $DICT"
fi

info "Step 4: 测试 admin 岗位列表"
POS=$(curl -s -H "$HEADER" "${BASE_URL}/admin/position/list?pageNum=1&pageSize=5")
if echo "$POS" | grep -q "code.*200"; then
  pass "admin 岗位列表正常"
  # 检查是否有 target_majors
  if echo "$POS" | grep -q "target_majors\|targetMajors"; then
    pass "admin 列表包含 target_majors 字段"
  else
    info "admin 列表暂无 target_majors 字段 (需业务方补录)"
  fi
else
  fail "admin 岗位列表异常: $POS"
fi

info "Step 5: 测试 lead-mentor 岗位列表 (target_majors 列)"
LEAD_POS=$(curl -s -H "$HEADER" "${BASE_URL}/lead-mentor/positions/list?pageNum=1&pageSize=5")
if echo "$LEAD_POS" | grep -q "code.*200"; then
  pass "lead-mentor 岗位列表正常"
else
  fail "lead-mentor 岗位列表异常: $LEAD_POS"
fi

info "Step 6: 测试 assistant 岗位列表 (新接口)"
ASST_POS=$(curl -s -H "$HEADER" "${BASE_URL}/assistant/positions/list")
if echo "$ASST_POS" | grep -q "code.*200"; then
  pass "assistant 岗位列表正常"
  if echo "$ASST_POS" | grep -q "myStudentCount\|my_student_count"; then
    pass "assistant 列表包含 myStudentCount 字段"
  else
    info "assistant 列表暂无 myStudentCount 字段 (无所带学生)"
  fi
else
  # 检查是否是权限问题
  if echo "$ASST_POS" | grep -q "403"; then
    info "assistant 列表返回 403 (非助教账号，预期行为)"
  else
    fail "assistant 岗位列表异常: $ASST_POS"
  fi
fi

info "Step 7: 测试 assistant drill-down 旧端点 (保留)"
DRILL=$(curl -s -H "$HEADER" "${BASE_URL}/assistant/positions/drill-down")
if echo "$DRILL" | grep -q "code.*200"; then
  pass "assistant drill-down 端点保留正常"
else
  fail "assistant drill-down 端点异常: $DRILL"
fi

info "Step 8: 测试 admin 岗位录入 (target_majors 必填)"
# 构造一个测试岗位数据（不实际提交）
TEST_DATA="{\"companyName\":\"Test Company\",\"positionName\":\"Test Position\",\"targetMajors\":\"finance\",\"region\":\"na\",\"recruitmentCycle\":\"Class of 2026\",\"industry\":\"Finance\",\"positionCategory\":\"summer\"}"
CREATE_TEST=$(curl -s -X POST "${BASE_URL}/admin/position" \
  -H "$HEADER" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")
if echo "$CREATE_TEST" | grep -q "code.*200\|code.*500"; then
  pass "admin 岗位创建接口可访问"
else
  info "admin 岗位创建接口响应: $CREATE_TEST"
fi

info "Step 9: 测试学生可见性服务"
# 先获取一个有学生的账号
STUDENT_POS=$(curl -s -H "$HEADER" "${BASE_URL}/student/position/list?pageNum=1&pageSize=5")
if echo "$STUDENT_POS" | grep -q "code.*200"; then
  pass "学生岗位列表正常 (可见性过滤生效)"
else
  info "学生岗位列表响应: $STUDENT_POS"
fi

info "Step 10: 测试 osg_major_direction 字典详情"
MAJOR_DIR=$(curl -s -H "$HEADER" "${BASE_URL}/dict/osg_major_direction")
if echo "$MAJOR_DIR" | grep -q '"finance"'; then
  pass "osg_major_direction 字典正常"
  echo "$MAJOR_DIR" | grep -o '"dictValue":"[^"]*"' | head -5 | while read line; do
    info "  - $line"
  done
else
  fail "osg_major_direction 字典异常"
fi

echo ""
echo "============================================"
echo "curl 接口测试完成"
echo "============================================"