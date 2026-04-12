#!/usr/bin/env bash
# =============================================================================
# Admin 端 API Curl 测试脚本
# 生成日期: 2026-04-10
# 用法: bash docs/admin-curl-tests.sh [section]
#   section: all | auth | dashboard | student | staff | contract | schedule
#            | class | report | feedback | communication | position | job
#            | mock | finance | expense | file | qbank | question | interview
#            | testbank | notice | mailjob | complaint | log | menu | role
#            | user | basedata | allclasses
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:28080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-Osg@2026}"
SECTION="${1:-all}"
TOKEN=""

# ---------- 颜色 ----------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# ---------- 工具函数 ----------
header() { echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════${NC}"; }
subheader() { echo -e "\n${YELLOW}--- $1 ---${NC}"; }

api() {
  local method="$1" path="$2" desc="$3"
  shift 3
  local url="${BASE_URL}${path}"
  echo -ne "  ${method} ${path} ... "

  local http_code body
  body=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "$@" 2>&1)
  http_code=$(echo "$body" | tail -1)
  body=$(echo "$body" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo -e "${GREEN}${http_code} OK${NC}  # ${desc}"
    ((PASS_COUNT++))
  elif [[ "$http_code" == "401" ]]; then
    echo -e "${RED}${http_code} UNAUTHORIZED${NC}  # ${desc}"
    ((FAIL_COUNT++))
  else
    echo -e "${RED}${http_code} FAIL${NC}  # ${desc}"
    # 打印前200字符帮助调试
    echo "    Response: $(echo "$body" | head -c 200)"
    ((FAIL_COUNT++))
  fi
  echo "$body" > /tmp/admin_curl_last_response.json
}

api_extract() {
  # 调用api并提取JSON字段
  local method="$1" path="$2" desc="$3" field="$4"
  shift 4
  local url="${BASE_URL}${path}"

  local body
  body=$(curl -s -X "$method" "$url" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "$@" 2>&1)
  echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d${field})" 2>/dev/null || echo ""
}

should_run() {
  [[ "$SECTION" == "all" || "$SECTION" == "$1" ]]
}

# =============================================================================
# 1. 认证 (Auth)
# =============================================================================
if should_run "auth"; then
  header "1. 认证 Auth"

  subheader "1.1 获取验证码"
  CAPTCHA_RESP=$(curl -s "${BASE_URL}/captchaImage")
  CAPTCHA_ENABLED=$(echo "$CAPTCHA_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('captchaEnabled', True))" 2>/dev/null || echo "True")
  UUID=$(echo "$CAPTCHA_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uuid',''))" 2>/dev/null || echo "")
  echo -e "  GET /captchaImage ... ${GREEN}OK${NC}  captchaEnabled=${CAPTCHA_ENABLED}, uuid=${UUID:0:8}..."
  ((PASS_COUNT++))

  subheader "1.2 登录"
  # 策略: 先尝试无验证码登录，失败再带验证码重试
  LOGIN_BODY="{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\",\"rememberMe\":true}"
  LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_BODY")
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; t=json.load(sys.stdin).get('token',''); print(t if t else '')" 2>/dev/null || echo "")

  if [[ -z "$TOKEN" || "$TOKEN" == "None" || "$TOKEN" == "" ]]; then
    echo -e "  POST /login (无验证码) ... ${YELLOW}需要验证码，重试中${NC}"
    # 重新获取验证码
    CAPTCHA_RESP=$(curl -s "${BASE_URL}/captchaImage")
    UUID=$(echo "$CAPTCHA_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uuid',''))" 2>/dev/null || echo "")
    LOGIN_BODY="{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\",\"code\":\"1\",\"uuid\":\"${UUID}\",\"rememberMe\":true}"
    LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
      -H "Content-Type: application/json" \
      -d "$LOGIN_BODY")
    TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; t=json.load(sys.stdin).get('token',''); print(t if t else '')" 2>/dev/null || echo "")
  fi

  if [[ -n "$TOKEN" && "$TOKEN" != "None" && "$TOKEN" != "" ]]; then
    echo -e "  POST /login ... ${GREEN}200 OK${NC}  token=${TOKEN:0:20}..."
    ((PASS_COUNT++))
  else
    echo -e "  POST /login ... ${RED}FAIL${NC}"
    echo "  Response: $(echo "$LOGIN_RESP" | head -c 300)"
    ((FAIL_COUNT++))
    echo -e "\n${RED}登录失败。请提供 TOKEN:  export TOKEN_ENV=<token>${NC}"

    if [[ -n "${TOKEN_ENV:-}" ]]; then
      TOKEN="$TOKEN_ENV"
      echo -e "  ${YELLOW}使用环境变量 TOKEN_ENV${NC}"
    else
      exit 1
    fi
  fi

  subheader "1.3 获取用户信息"
  api GET "/getInfo" "当前登录用户信息（角色/权限）"

  subheader "1.4 获取路由"
  api GET "/getRouters" "动态路由菜单"
fi

# 如果不是只跑 auth，但 TOKEN 为空，先登录
if [[ -z "$TOKEN" ]]; then
  # 静默登录: 先无验证码，失败再 fallback
  LOGIN_BODY="{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\",\"rememberMe\":true}"
  TOKEN=$(curl -s -X POST "${BASE_URL}/login" -H "Content-Type: application/json" -d "$LOGIN_BODY" \
    | python3 -c "import sys,json; t=json.load(sys.stdin).get('token',''); print(t if t else '')" 2>/dev/null || echo "")
  if [[ -z "$TOKEN" || "$TOKEN" == "None" || "$TOKEN" == "" ]]; then
    TOKEN="${TOKEN_ENV:-}"
  fi
  if [[ -z "$TOKEN" ]]; then
    echo -e "${RED}无法获取 TOKEN，请设置环境变量: export TOKEN_ENV=<token>${NC}"
    exit 1
  fi
fi

# =============================================================================
# 2. Dashboard
# =============================================================================
if should_run "dashboard"; then
  header "2. Dashboard 首页"
  api GET "/dashboard/stats" "首页统计数据"
  api GET "/dashboard/todos" "待办事项"
  api GET "/dashboard/activities" "最近活动"
  api GET "/dashboard/student-status" "学员状态分布"
  api GET "/dashboard/monthly" "月度趋势"
fi

# =============================================================================
# 3. 学员管理
# =============================================================================
if should_run "student"; then
  header "3. 学员管理"
  api GET "/admin/student/list?pageNum=1&pageSize=10" "学员列表"
  api GET "/admin/student/export" "导出学员"

  subheader "3.1 学员详情（取第一个学员ID）"
  FIRST_STUDENT_ID=$(api_extract GET "/admin/student/list?pageNum=1&pageSize=1" "学员列表" "['rows'][0]['studentId']")
  if [[ -n "$FIRST_STUDENT_ID" && "$FIRST_STUDENT_ID" != "" ]]; then
    api GET "/admin/student/${FIRST_STUDENT_ID}" "学员详情 #${FIRST_STUDENT_ID}"
    api GET "/admin/student/${FIRST_STUDENT_ID}/contracts" "学员合同 #${FIRST_STUDENT_ID}"
  else
    echo -e "  ${YELLOW}SKIP${NC} 无学员数据"
    ((SKIP_COUNT++))
  fi

  subheader "3.2 学员变更审核"
  api GET "/admin/student/change-request/list?pageNum=1&pageSize=10" "变更审核列表"

  subheader "3.3 学员状态变更（仅测试接口可达性，不实际修改）"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/student/status — 需要业务数据，跳过"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/student/blacklist — 需要业务数据，跳过"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/student/reset-password — 需要业务数据，跳过"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 4. 导师/员工管理
# =============================================================================
if should_run "staff"; then
  header "4. 导师/员工管理"
  api GET "/admin/staff/list?pageNum=1&pageSize=10" "员工列表"
  api GET "/admin/staff/export" "导出员工"

  subheader "4.1 员工详情（取第一个）"
  FIRST_STAFF_ID=$(api_extract GET "/admin/staff/list?pageNum=1&pageSize=1" "员工列表" "['rows'][0]['staffId']")
  if [[ -n "$FIRST_STAFF_ID" && "$FIRST_STAFF_ID" != "" ]]; then
    api GET "/admin/staff/${FIRST_STAFF_ID}" "员工详情 #${FIRST_STAFF_ID}"
  else
    echo -e "  ${YELLOW}SKIP${NC} 无员工数据"
    ((SKIP_COUNT++))
  fi

  subheader "4.2 员工变更审核"
  api GET "/admin/staff/change-request/list?pageNum=1&pageSize=10" "变更审核列表"

  subheader "4.3 写操作（跳过）"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/staff/status — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/staff/blacklist — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/staff/reset-password — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/staff/change-request — 需要业务数据"
  ((SKIP_COUNT+=4))
fi

# =============================================================================
# 5. 合同管理
# =============================================================================
if should_run "contract"; then
  header "5. 合同管理"
  api GET "/admin/contract/list?pageNum=1&pageSize=10" "合同列表"
  api GET "/admin/contract/stats" "合同统计"
  api GET "/admin/contract/export" "导出合同"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/contract/renew — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/contract/upload — 需要文件"
  ((SKIP_COUNT+=2))
fi

# =============================================================================
# 6. 排期管理
# =============================================================================
if should_run "schedule"; then
  header "6. 排期管理"
  api GET "/admin/schedule/list?pageNum=1&pageSize=10" "排期列表"
  api GET "/admin/schedule/export" "导出排期"

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/schedule/edit — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} POST /admin/schedule/remind-all — 会发送通知"
  ((SKIP_COUNT+=2))
fi

# =============================================================================
# 7. 课时记录
# =============================================================================
if should_run "class"; then
  header "7. 课时记录"
  api GET "/admin/class-record/list?pageNum=1&pageSize=10" "课时列表"
  api GET "/admin/class-record/stats" "课时统计"
  api GET "/admin/class-record/export" "导出课时"
fi

# =============================================================================
# 8. 全部课时（全局视图）
# =============================================================================
if should_run "allclasses"; then
  header "8. 全部课时（全局视图）"
  api GET "/admin/all-classes/list?pageNum=1&pageSize=10" "全部课时列表"

  FIRST_RECORD_ID=$(api_extract GET "/admin/all-classes/list?pageNum=1&pageSize=1" "全部课时" "['rows'][0]['recordId']")
  if [[ -n "$FIRST_RECORD_ID" && "$FIRST_RECORD_ID" != "" ]]; then
    api GET "/admin/all-classes/${FIRST_RECORD_ID}/detail" "课时详情 #${FIRST_RECORD_ID}"
  else
    echo -e "  ${YELLOW}SKIP${NC} 无课时数据"
    ((SKIP_COUNT++))
  fi
fi

# =============================================================================
# 9. 周报/报告
# =============================================================================
if should_run "report"; then
  header "9. 周报/报告"
  api GET "/admin/report/list?pageNum=1&pageSize=10" "报告列表"

  FIRST_REPORT_ID=$(api_extract GET "/admin/report/list?pageNum=1&pageSize=1" "报告列表" "['rows'][0]['recordId']")
  if [[ -n "$FIRST_REPORT_ID" && "$FIRST_REPORT_ID" != "" ]]; then
    api GET "/admin/report/${FIRST_REPORT_ID}" "报告详情 #${FIRST_REPORT_ID}"
  else
    echo -e "  ${YELLOW}SKIP${NC} 无报告数据"
    ((SKIP_COUNT++))
  fi

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/report/{id}/approve — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/report/{id}/reject — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/report/batch-approve — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/report/batch-reject — 需要业务数据"
  ((SKIP_COUNT+=4))
fi

# =============================================================================
# 10. 教学反馈
# =============================================================================
if should_run "feedback"; then
  header "10. 教学反馈"
  api GET "/admin/feedback/list?pageNum=1&pageSize=10" "反馈列表"
fi

# =============================================================================
# 11. 沟通记录
# =============================================================================
if should_run "communication"; then
  header "11. 沟通记录"
  api GET "/admin/communication/list?pageNum=1&pageSize=10" "沟通记录列表"
fi

# =============================================================================
# 12. 岗位管理
# =============================================================================
if should_run "position"; then
  header "12. 岗位管理"
  api GET "/admin/position/list?pageNum=1&pageSize=10" "岗位列表"
  api GET "/admin/position/stats" "岗位统计"
  api GET "/admin/position/meta" "岗位元数据"
  api GET "/admin/position/company-options" "公司选项"
  api GET "/admin/position/drill-down?field=company" "岗位下钻"
  api GET "/admin/position/export" "导出岗位"

  FIRST_POS_ID=$(api_extract GET "/admin/position/list?pageNum=1&pageSize=1" "岗位列表" "['rows'][0]['positionId']")
  if [[ -n "$FIRST_POS_ID" && "$FIRST_POS_ID" != "" ]]; then
    api GET "/admin/position/${FIRST_POS_ID}/students" "岗位学员 #${FIRST_POS_ID}"
  else
    echo -e "  ${YELLOW}SKIP${NC} 无岗位数据"
    ((SKIP_COUNT++))
  fi

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/position/batch-upload — 需要文件"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 13. 求职总览
# =============================================================================
if should_run "job"; then
  header "13. 求职总览"
  api GET "/admin/job-overview/list?pageNum=1&pageSize=10" "求职列表"
  api GET "/admin/job-overview/stats" "求职统计"
  api GET "/admin/job-overview/funnel" "漏斗分析"
  api GET "/admin/job-overview/hot-companies" "热门公司"
  api GET "/admin/job-overview/unassigned" "未分配列表"
  api GET "/admin/job-overview/export" "导出求职数据"

  subheader "13.1 求职跟踪"
  api GET "/admin/job-tracking/list?pageNum=1&pageSize=10" "跟踪列表"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/job-overview/assign-mentor — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/job-overview/stage-update — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/job-tracking/{id}/update — 需要业务数据"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 14. 模拟应聘
# =============================================================================
if should_run "mock"; then
  header "14. 模拟应聘"
  api GET "/admin/mock-practice/list?pageNum=1&pageSize=10" "模拟列表"
  api GET "/admin/mock-practice/stats" "模拟统计"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/mock-practice/assign — 需要业务数据"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 15. 财务结算
# =============================================================================
if should_run "finance"; then
  header "15. 财务结算"
  api GET "/admin/finance/list?pageNum=1&pageSize=10" "结算列表"
  api GET "/admin/finance/stats" "结算统计"

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/finance/{id}/mark-paid — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/finance/batch-pay — 需要业务数据"
  ((SKIP_COUNT+=2))
fi

# =============================================================================
# 16. 报销管理
# =============================================================================
if should_run "expense"; then
  header "16. 报销管理"
  api GET "/admin/expense/list?pageNum=1&pageSize=10" "报销列表"

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/expense/{id}/review — 需要业务数据"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 17. 文件管理
# =============================================================================
if should_run "file"; then
  header "17. 文件管理"
  api GET "/admin/file/list?pageNum=1&pageSize=10" "文件列表"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/file/folder — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/file/auth — 需要业务数据"
  ((SKIP_COUNT+=2))
fi

# =============================================================================
# 18. 题库管理
# =============================================================================
if should_run "qbank"; then
  header "18. 题库管理"
  api GET "/admin/qbank/list?pageNum=1&pageSize=10" "题库列表"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/qbank/folder — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/qbank/auth — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/qbank/expiry — 需要业务数据"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 19. 题目管理
# =============================================================================
if should_run "question"; then
  header "19. 题目管理"
  api GET "/admin/question/list?pageNum=1&pageSize=10" "题目列表"

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/question/batch-approve — 需要业务数据"
  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/question/batch-reject — 需要业务数据"
  ((SKIP_COUNT+=2))
fi

# =============================================================================
# 20. 面试题库
# =============================================================================
if should_run "interview"; then
  header "20. 面试题库"
  api GET "/admin/interview-bank/list?pageNum=1&pageSize=10" "面试题库列表"
fi

# =============================================================================
# 21. 笔试题库
# =============================================================================
if should_run "testbank"; then
  header "21. 笔试题库"
  api GET "/admin/test-bank/list?pageNum=1&pageSize=10" "笔试题库列表"
fi

# =============================================================================
# 22. 公告管理
# =============================================================================
if should_run "notice"; then
  header "22. 公告管理"
  api GET "/admin/notice/list?pageNum=1&pageSize=10" "公告列表"

  echo -e "  ${YELLOW}SKIP${NC} POST /admin/notice/send — 会发送通知"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 23. 邮件任务
# =============================================================================
if should_run "mailjob"; then
  header "23. 邮件任务"
  api GET "/admin/mailjob/list?pageNum=1&pageSize=10" "邮件任务列表"
fi

# =============================================================================
# 24. 投诉管理
# =============================================================================
if should_run "complaint"; then
  header "24. 投诉管理"
  api GET "/admin/complaint/list?pageNum=1&pageSize=10" "投诉列表"

  echo -e "  ${YELLOW}SKIP${NC} PUT /admin/complaint/{id}/status — 需要业务数据"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 25. 操作日志
# =============================================================================
if should_run "log"; then
  header "25. 操作日志"
  api GET "/admin/log/list?pageNum=1&pageSize=10" "日志列表"
  api GET "/admin/log/export" "导出日志"
fi

# =============================================================================
# 26. 菜单管理
# =============================================================================
if should_run "menu"; then
  header "26. 菜单管理"
  api GET "/system/menu/list" "菜单列表"
  api GET "/system/menu/treeselect" "菜单树"

  FIRST_MENU_ID=$(api_extract GET "/system/menu/list" "菜单" "['data'][0]['menuId']")
  if [[ -n "$FIRST_MENU_ID" && "$FIRST_MENU_ID" != "" ]]; then
    api GET "/system/menu/${FIRST_MENU_ID}" "菜单详情 #${FIRST_MENU_ID}"
  fi

  echo -e "  ${YELLOW}SKIP${NC} POST /system/menu — 写操作"
  echo -e "  ${YELLOW}SKIP${NC} PUT /system/menu — 写操作"
  echo -e "  ${YELLOW}SKIP${NC} DELETE /system/menu/{id} — 写操作"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 27. 角色管理
# =============================================================================
if should_run "role"; then
  header "27. 角色管理"
  api GET "/system/role/list?pageNum=1&pageSize=10" "角色列表"
  api GET "/system/role/optionselect" "角色选项"

  FIRST_ROLE_ID=$(api_extract GET "/system/role/list?pageNum=1&pageSize=1" "角色" "['rows'][0]['roleId']")
  if [[ -n "$FIRST_ROLE_ID" && "$FIRST_ROLE_ID" != "" ]]; then
    api GET "/system/role/${FIRST_ROLE_ID}" "角色详情 #${FIRST_ROLE_ID}"
    api GET "/system/role/deptTree/${FIRST_ROLE_ID}" "角色部门树"
    api GET "/system/menu/roleMenuTreeselect/${FIRST_ROLE_ID}" "角色菜单树"
  fi

  echo -e "  ${YELLOW}SKIP${NC} POST/PUT/DELETE /system/role — 写操作"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 28. 后台用户管理
# =============================================================================
if should_run "user"; then
  header "28. 后台用户管理"
  api GET "/system/user/list?pageNum=1&pageSize=10" "用户列表"
  api GET "/system/user/deptTree" "部门树"

  subheader "28.1 个人中心"
  api GET "/system/user/profile" "个人资料"

  echo -e "  ${YELLOW}SKIP${NC} PUT /system/user/profile — 写操作"
  echo -e "  ${YELLOW}SKIP${NC} PUT /system/user/profile/updatePwd — 写操作"
  echo -e "  ${YELLOW}SKIP${NC} POST /system/user/profile/avatar — 需要文件"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 29. 基础数据/字典管理
# =============================================================================
if should_run "basedata"; then
  header "29. 基础数据/字典管理"
  api GET "/system/basedata/list?pageNum=1&pageSize=10" "基础数据列表"
  api GET "/system/basedata/categories" "数据分类"
  api GET "/system/admin-dict/registry" "字典注册表"

  subheader "29.1 若依字典"
  api GET "/system/dict/type/list?pageNum=1&pageSize=10" "字典类型列表"
  api GET "/system/dict/data/list?pageNum=1&pageSize=10&dictType=sys_normal_disable" "字典数据列表"

  echo -e "  ${YELLOW}SKIP${NC} PUT /system/basedata/changeStatus — 写操作"
  ((SKIP_COUNT++))
fi

# =============================================================================
# 30. 忘记密码
# =============================================================================
if should_run "password"; then
  header "30. 忘记密码"
  echo -e "  ${YELLOW}SKIP${NC} POST /system/password/sendCode — 会发邮件"
  echo -e "  ${YELLOW}SKIP${NC} POST /system/password/verify — 需要验证码"
  echo -e "  ${YELLOW}SKIP${NC} POST /system/password/reset — 需要验证码"
  ((SKIP_COUNT+=3))
fi

# =============================================================================
# 汇总
# =============================================================================
echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  测试汇总${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "  ${GREEN}通过: ${PASS_COUNT}${NC}"
echo -e "  ${RED}失败: ${FAIL_COUNT}${NC}"
echo -e "  ${YELLOW}跳过: ${SKIP_COUNT}${NC}"
echo -e "  总计: $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "${GREEN}✅ 所有测试通过！${NC}"
else
  echo -e "${RED}❌ 有 ${FAIL_COUNT} 个测试失败${NC}"
  exit 1
fi
