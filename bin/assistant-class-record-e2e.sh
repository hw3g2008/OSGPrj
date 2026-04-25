#!/usr/bin/env bash
# ────────────────────────────────────────────────────────
# assistant-class-record-e2e.sh
# 完全对齐前端 resolvePayloadCourseType / resolvePayloadClassStatus
#                 resolveTopics / resolveComments 的输出
# ────────────────────────────────────────────────────────
set -euo pipefail

TOKEN="${1:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Usage: $0 <osg_token>"
  exit 1
fi

BASE="${BASE_URL:-http://localhost:3004/api}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
PASS=0; FAIL=0

post_record() {
  local label="$1"; shift
  local body="$1"
  echo -n "  [$label] ... "
  local resp
  resp=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH" -H "$CT" "$BASE/assistant/class-records" -d "$body")
  local http_code=$(echo "$resp" | tail -1)
  local json=$(echo "$resp" | sed '$d')
  local code=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))" 2>/dev/null || echo "parse_err")
  local msg=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('msg','?'))" 2>/dev/null || echo "?")
  if [[ "$code" == "200" ]]; then
    echo "PASS (http=$http_code code=$code)"
    PASS=$((PASS+1))
  else
    echo "FAIL (http=$http_code code=$code msg=$msg)"
    echo "    resp: $json"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Step 0: 验证 token ==="
resp=$(curl -s -H "$AUTH" "$BASE/assistant/class-records/stats?scope=mine")
code=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',999))" 2>/dev/null || echo "err")
if [[ "$code" != "200" ]]; then
  echo "FAIL: token 无效 ($resp)"
  exit 1
fi
echo "  token OK"

SID=34072

# ================================================================
# 1) 岗位辅导 (job-coaching) → courseType=job_coaching
#    jobContentOptions 8 种 → classStatus
#    positionLabel → topics
#    resolveComments → "学员状态: 正常上课" + context-specific
# ================================================================
echo ""
echo "=== 1. 岗位辅导 × 8 种课程内容 ==="

# 1-1 技术的 (technical) — 无特殊反馈区
post_record "岗位辅导→技术的" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"technical\",
  \"classDate\":\"2026-04-23\",\"durationHours\":1.0,
  \"feedbackContent\":\"讲解了DCF估值模型的核心框架，包括WACC计算和终值估算。学员已能独立搭建基础DCF模型，对自由现金流的理解有明显进步。\",
  \"topics\":\"Goldman Sachs · IB Analyst · Hong Kong\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 1-2 行为训练 (behavioral) — 无特殊反馈区
post_record "岗位辅导→行为训练" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"behavioral\",
  \"classDate\":\"2026-04-23\",\"durationHours\":1.0,
  \"feedbackContent\":\"练习了STAR方法回答行为面试问题。重点训练了领导力和团队合作两类故事，学员叙述逻辑有改善但需要更多量化细节。\",
  \"topics\":\"Morgan Stanley · IBD Analyst · New York\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 1-3 简历更新 (resume_update) — isResumeContext=true，简历上传区（curl无法上传文件）
post_record "岗位辅导→简历更新" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"resume_update\",
  \"classDate\":\"2026-04-22\",\"durationHours\":1.0,
  \"feedbackContent\":\"优化了实习经历描述，增加了量化指标。调整了项目经验的排版格式，突出了与IB相关的技能和成果。\",
  \"topics\":\"Goldman Sachs · IB Analyst · Hong Kong\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 1-4 模拟面试的课程 (mock_interview) — isMockInterviewContext=true
#   topics: positionLabel + mockPurpose + mockConcepts + mockWeakTopics
#   comments: 学员状态 + 学员表现
post_record "岗位辅导→模拟面试的课程" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"mock_interview\",
  \"classDate\":\"2026-04-22\",\"durationHours\":1.5,
  \"feedbackContent\":\"进行了全真IB技术面试模拟。学员在会计三大报表问题上回答准确，但DCF估值假设的合理性解释不够清晰。\",
  \"topics\":\"Goldman Sachs · IB Analyst · Hong Kong\n全真模拟IB技术面试\nDCF估值、LBO分析、Merger Model\n估值假设合理性、技术深度\",
  \"comments\":\"学员状态: 正常上课\n学员表现: 好的\"
}"

# 1-5 人际关系的课程 (networking_midterm) — isNetworkingContext=true
#   comments: 学员状态 + 推荐意见 + 5项评分
post_record "岗位辅导→人际关系的课程" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"networking_midterm\",
  \"classDate\":\"2026-04-21\",\"durationHours\":1.0,
  \"feedbackContent\":\"讲解了Cold Email写作技巧和Networking策略。学员完成了3封Coffee Chat邀请邮件的撰写练习。\",
  \"topics\":\"McKinsey · Business Analyst · Shanghai\",
  \"comments\":\"学员状态: 正常上课\n推荐意见: 或许 - 如果他们能改进一下就好了\n电子邮件质量 (1-5分): 4\n电子邮件礼仪 (1-5分): 3\n闲聊/自我介绍质量 (1-10分): 6\n通话质量 (1-10分): 5\n感谢邮件 (1-3分): 2\"
}"

# 1-6 模拟期中考试 (mock_midterm) — isMidtermContext=true
#   topics: positionLabel + midtermAnalysis
#   comments: 学员状态 + 模拟期中分数 + 进度评估
post_record "岗位辅导→模拟期中考试" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"mock_midterm\",
  \"classDate\":\"2026-04-21\",\"durationHours\":2.0,
  \"feedbackContent\":\"进行了模拟期中考试测验。学员在会计和估值部分表现优秀，LBO建模部分需要加强对杠杆比率的理解。\",
  \"topics\":\"Goldman Sachs · IB Analyst · Hong Kong\nQ1会计(5/5) Q2估值(4/5) Q3-LBO(3/5) Q4并购(4/5)\",
  \"comments\":\"学员状态: 正常上课\n模拟期中分数: 82\n进度评估: 太好了 - 进展顺利\"
}"

# 1-7 咨询案例准备 (case_prep) — 无特殊反馈区
post_record "岗位辅导→咨询案例准备" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"case_prep\",
  \"classDate\":\"2026-04-20\",\"durationHours\":1.0,
  \"feedbackContent\":\"练习了Market Sizing案例框架搭建。学员对问题拆解逻辑有显著提升，需要注意假设的合理性和计算速度。\",
  \"topics\":\"McKinsey · Business Analyst · Shanghai\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 1-8 其他 (other) — 无特殊反馈区
post_record "岗位辅导→其他" "{
  \"studentId\":$SID,\"courseType\":\"job_coaching\",\"classStatus\":\"other\",
  \"classDate\":\"2026-04-20\",\"durationHours\":0.5,
  \"feedbackContent\":\"进行了求职规划讨论，帮助学员梳理了目标公司列表和申请时间线。\",
  \"topics\":\"Goldman Sachs · IB Analyst · Hong Kong\",
  \"comments\":\"学员状态: 正常上课\"
}"

# ================================================================
# 2) 模拟面试 (mock-interview) → courseType=mock_practice
#    classStatus 固定 mock_interview
#    无 positionLabel; topics: mockPurpose+mockConcepts+mockWeakTopics
#    comments: 学员状态 + 学员表现
# ================================================================
echo ""
echo "=== 2. 模拟面试 ==="

post_record "模拟面试" "{
  \"studentId\":$SID,\"courseType\":\"mock_practice\",\"classStatus\":\"mock_interview\",
  \"classDate\":\"2026-04-19\",\"durationHours\":1.5,
  \"feedbackContent\":\"完整模拟了投行技术面试流程。学员在Behavioral问题上回答流畅自然，技术问题中对Enterprise Value和Equity Value的区别解释清晰。需要加强对LBO模型的理解深度。\",
  \"topics\":\"IB技术面试全真模拟\nDCF估值、LBO分析、Enterprise Value vs Equity Value\n加强LBO建模和杠杆收购逻辑\",
  \"comments\":\"学员状态: 正常上课\n学员表现: 很好\"
}"

# ================================================================
# 3) 人际关系 (networking) → courseType=mock_practice
#    classStatus 固定 networking_midterm
#    无 positionLabel; topics 为空
#    comments: 学员状态 + 推荐意见 + 5项评分
# ================================================================
echo ""
echo "=== 3. 人际关系 ==="

post_record "人际关系" "{
  \"studentId\":$SID,\"courseType\":\"mock_practice\",\"classStatus\":\"networking_midterm\",
  \"classDate\":\"2026-04-18\",\"durationHours\":1.0,
  \"feedbackContent\":\"进行了Networking能力综合评估。学员的Email写作质量有明显提升，电话沟通中的自我介绍部分需要更加简洁有力。\",
  \"comments\":\"学员状态: 正常上课\n推荐意见: 是的 - 我相信这位学生很适合我的团队\n电子邮件质量 (1-5分): 4\n电子邮件礼仪 (1-5分): 4\n闲聊/自我介绍质量 (1-10分): 7\n通话质量 (1-10分): 6\n感谢邮件 (1-3分): 2\"
}"

# ================================================================
# 4) 模拟期中 (mock-midterm) → courseType=mock_practice
#    classStatus 固定 mock_midterm
#    无 positionLabel; topics: midtermAnalysis
#    comments: 学员状态 + 模拟期中分数 + 进度评估
# ================================================================
echo ""
echo "=== 4. 模拟期中 ==="

post_record "模拟期中" "{
  \"studentId\":$SID,\"courseType\":\"mock_practice\",\"classStatus\":\"mock_midterm\",
  \"classDate\":\"2026-04-17\",\"durationHours\":2.0,
  \"feedbackContent\":\"进行了期中综合测试。学员整体表现稳定，会计基础扎实，估值方法运用恰当。建议加强对行业分析和并购交易结构的理解。\",
  \"topics\":\"Q1会计基础(5/5) Q2财务建模(4/5) Q3估值分析(5/5) Q4行业分析(3/5) Q5并购(3/5)\",
  \"comments\":\"学员状态: 正常上课\n模拟期中分数: 85\n进度评估: 非常棒 - 进展顺利，会取得好成绩\"
}"

# ================================================================
# 5) 基础课程 (basic) → courseType=basic_course
#    basicContentOptions 5 种 → classStatus
#    无 positionLabel; topics 为空
#    comments: 学员状态: 正常上课
# ================================================================
echo ""
echo "=== 5. 基础课程 × 5 种课程内容 ==="

# 5-1 技术的
post_record "基础课程→技术的" "{
  \"studentId\":$SID,\"courseType\":\"basic_course\",\"classStatus\":\"technical\",
  \"classDate\":\"2026-04-16\",\"durationHours\":1.0,
  \"feedbackContent\":\"讲解了会计基础知识，包括三大财务报表的结构和勾稽关系。学员已掌握资产负债表与利润表之间的核心逻辑。\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 5-2 行为训练
post_record "基础课程→行为训练" "{
  \"studentId\":$SID,\"courseType\":\"basic_course\",\"classStatus\":\"behavioral\",
  \"classDate\":\"2026-04-16\",\"durationHours\":1.0,
  \"feedbackContent\":\"讲解了行为面试的基本框架和STAR方法论。学员完成了自我介绍和克服困难经历两个问题的初步准备。\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 5-3 简历更新 — isResumeContext=true（curl无法上传文件，comments不含简历字段）
post_record "基础课程→简历更新" "{
  \"studentId\":$SID,\"courseType\":\"basic_course\",\"classStatus\":\"resume_update\",
  \"classDate\":\"2026-04-15\",\"durationHours\":1.0,
  \"feedbackContent\":\"进行了简历基础格式培训，讲解了投行简历的标准结构和排版规范。学员完成了简历初稿的基本框架搭建。\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 5-4 咨询案例准备
post_record "基础课程→咨询案例准备" "{
  \"studentId\":$SID,\"courseType\":\"basic_course\",\"classStatus\":\"case_prep\",
  \"classDate\":\"2026-04-15\",\"durationHours\":1.0,
  \"feedbackContent\":\"讲解了咨询案例分析的基本框架，包括盈利性分析、市场进入和并购评估三种常见类型。\",
  \"comments\":\"学员状态: 正常上课\"
}"

# 5-5 其他
post_record "基础课程→其他" "{
  \"studentId\":$SID,\"courseType\":\"basic_course\",\"classStatus\":\"other\",
  \"classDate\":\"2026-04-14\",\"durationHours\":0.5,
  \"feedbackContent\":\"进行了学习计划制定和求职资源推荐。帮助学员建立了每周学习时间表和目标公司研究清单。\",
  \"comments\":\"学员状态: 正常上课\"
}"

# ================================================================
# 6) 旷课未到场 → classStatus=absent
#    Absent 契约（"有就是有，没有就没有"）：
#      - 不传 courseType（没发生的课没有类型）
#      - 不传 durationHours（没上课哪来时长）
#      - 不传 feedbackContent（没上课没反馈）
#      - 不传 topics（没课内容）
#    comments: 学员状态: 旷课未到场 + 旷课备注
# ================================================================
echo ""
echo "=== 6. 旷课未到场 ==="

post_record "旷课未到场" "{
  \"studentId\":$SID,\"classStatus\":\"absent\",
  \"classDate\":\"2026-04-14\",
  \"comments\":\"学员状态: 旷课未到场\n旷课备注: 学员未到场，已通知班主任跟进\"
}"

# ================================================================
# 验证
# ================================================================
echo ""
echo "=== 7. 查询列表验证 ==="
list_resp=$(curl -s -H "$AUTH" "$BASE/assistant/class-records/list?scope=mine&pageNum=1&pageSize=50")
total=$(echo "$list_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
echo "  总记录数: $total"
echo "$list_resp" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('rows',[]):
    rid=r.get('recordId','-')
    ct=r.get('courseType') or '(null)'
    cs=r.get('classStatus') or '(null)'
    dt=str(r.get('classDate') or '-')[:10]
    fb=str(r.get('feedbackContent') or '')[:40]
    dh=r.get('durationHours')
    dh_s='-' if dh is None else str(dh)
    print(f'  ID={rid}  type={ct:<16} status={cs:<20} date={dt}  dur={dh_s:<5} fb={fb}')
"

echo ""
echo "=== 8. 统计验证 ==="
stats_resp=$(curl -s -H "$AUTH" "$BASE/assistant/class-records/stats?scope=mine")
echo "$stats_resp" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{})
print(f'  totalCount={d.get(\"totalCount\",0)} pendingCount={d.get(\"pendingCount\",0)} approvedCount={d.get(\"approvedCount\",0)} mineCount={d.get(\"mineCount\",0)}')
"

echo ""
echo "==============================="
echo "  PASS: $PASS  FAIL: $FAIL"
echo "==============================="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
