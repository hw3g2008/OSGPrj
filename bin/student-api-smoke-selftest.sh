#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/student-api-smoke-selftest.XXXXXX")"
PORT=38124
SERVER_LOG="${TMP_DIR}/server.log"
RUN_LOG="${TMP_DIR}/student-api-smoke.out"
REQUEST_LOG="${TMP_DIR}/requests.jsonl"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

export REQUEST_LOG
export SELFTEST_PORT="${PORT}"

python3 - <<'PY' > "${SERVER_LOG}" 2>&1 &
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ["SELFTEST_PORT"])
REQUEST_LOG = os.environ["REQUEST_LOG"]
TOKEN = "selftest-token"

state = {
    "favorite_updates": [],
    "applied": False,
    "practice_requests": [],
    "class_requests": [],
    "ratings": [],
    "profile_updates": [],
}


def log_request(method, path, body):
    with open(REQUEST_LOG, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"method": method, "path": path, "body": body}, ensure_ascii=False) + "\n")


def require_auth(handler):
    if handler.path == "/student/login":
        return True
    return handler.headers.get("Authorization") == f"Bearer {TOKEN}"


def positions_payload():
    return [
        {
            "id": 101,
            "title": "IB Analyst",
            "url": "https://example.test/ib-analyst",
            "category": "summer",
            "categoryText": "暑期实习",
            "department": "Investment Banking",
            "location": "Hong Kong",
            "recruitCycle": "2026 Summer",
            "publishDate": "03-01",
            "deadline": "12-31",
            "company": "Goldman Sachs",
            "companyKey": "gs",
            "companyCode": "GS",
            "careerUrl": "https://example.test/careers/gs",
            "industry": "ib",
            "sourceType": "global",
            "favorited": bool(state["favorite_updates"] and state["favorite_updates"][-1] is True),
            "applied": state["applied"],
            "progressStage": "applied" if state["applied"] else "",
            "progressNote": "selftest progress note",
        }
    ]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self):
        length = int(self.headers.get("Content-Length") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def do_GET(self):
        if not require_auth(self):
            self._send(401, {"code": 401, "msg": "unauthorized"})
            return

        log_request("GET", self.path, None)

        if self.path == "/getInfo":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "user": {"userName": "student_demo"},
                "roles": ["student"],
                "permissions": [],
                "firstLogin": False,
            }})
            return

        if self.path == "/student/position/list":
            self._send(200, {"code": 200, "msg": "ok", "data": positions_payload()})
            return

        if self.path == "/student/position/meta":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "intentSummary": {
                    "recruitmentCycle": "2026 Summer",
                    "targetRegion": "Hong Kong",
                    "primaryDirection": "Investment Banking",
                },
                "filterOptions": {
                    "categories": [{"value": "summer", "label": "暑期实习"}],
                    "industries": [{"value": "ib", "label": "Investment Banking"}],
                    "companies": [{"value": "gs", "label": "Goldman Sachs"}],
                    "locations": [{"value": "Hong Kong", "label": "Hong Kong"}],
                    "applyMethods": [{"value": "官网投递", "label": "官网投递"}],
                    "progressStages": [{"value": "first", "label": "一面"}],
                    "coachingStages": [{"value": "hirevue", "label": "HireVue"}],
                    "mentorCounts": [{"value": "2位导师", "label": "2位导师"}],
                },
            }})
            return

        if self.path == "/student/application/list":
            applications = []
            if state["applied"]:
                applications.append({
                    "id": 101,
                    "company": "Goldman Sachs",
                    "position": "IB Analyst",
                    "location": "Hong Kong",
                    "bucket": "applied",
                    "companyType": "ib",
                    "stage": "applied",
                    "stageLabel": "已投递",
                    "stageColor": "blue",
                    "interviewTime": "待安排",
                    "interviewHint": "",
                    "coachingStatus": "pending",
                    "coachingStatusLabel": "待审批",
                    "coachingColor": "orange",
                    "mentor": "-",
                    "mentorMeta": "-",
                    "hoursFeedback": "0 / 待反馈",
                    "feedback": "-",
                    "interviewAt": "",
                    "appliedDate": "2026-03-20",
                    "applyMethod": "官网投递",
                    "progressNote": "selftest progress note",
                })
            self._send(200, {"code": 200, "msg": "ok", "data": {"applications": applications}})
            return

        if self.path == "/student/application/meta":
            count = 1 if state["applied"] else 0
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "pageSummary": {"titleZh": "我的求职", "titleEn": "Applications", "subtitle": "subtitle"},
                "tabCounts": {"all": count, "applied": count, "ongoing": 0, "completed": 0},
                "filterOptions": {
                    "progressStages": [{"value": "applied", "label": "已投递"}],
                    "coachingStatuses": [{"value": "pending", "label": "待审批"}],
                    "companyTypes": [{"value": "ib", "label": "Investment Banking"}],
                    "applyMethods": [{"value": "官网投递", "label": "官网投递"}],
                },
                "schedule": [],
            }})
            return

        if self.path == "/student/mock-practice/overview":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "practiceRecords": [{
                    "id": "PR-1",
                    "type": "模拟面试",
                    "typeValue": "mock",
                    "typeColor": "blue",
                    "content": "Mock interview",
                    "appliedAt": "2026-03-20 10:00",
                    "submittedAtValue": "2026-03-20 10:00",
                    "mentor": "Mentor A",
                    "mentorMeta": "IB",
                    "hours": "1h",
                    "feedback": "pending",
                    "feedbackHint": "-",
                    "status": "处理中",
                    "statusValue": "Processing",
                    "statusColor": "orange",
                }],
                "requestRecords": [{
                    "id": "CR-1",
                    "type": "岗位辅导",
                    "typeValue": "interview",
                    "typeColor": "blue",
                    "company": "Goldman Sachs",
                    "status": "处理中",
                    "statusValue": "Processing",
                    "statusColor": "orange",
                    "submittedAt": "2026-03-20 10:00",
                    "submittedAtValue": "2026-03-20 10:00",
                    "courseType": "interview",
                    "jobStatus": "applied",
                    "remark": "",
                }],
            }})
            return

        if self.path == "/student/mock-practice/meta":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "pageSummary": {"titleZh": "模拟应聘", "titleEn": "Mock Practice", "subtitle": "subtitle"},
                "practiceSection": {
                    "recordsTitle": "记录",
                    "keywordPlaceholder": "关键词",
                    "typePlaceholder": "类型",
                    "statusPlaceholder": "状态",
                    "rangePlaceholder": "时间范围",
                },
                "practiceCards": [{
                    "id": "mock",
                    "badge": "MO",
                    "title": "模拟面试",
                    "description": "desc",
                    "cta": "申请",
                    "buttonType": "primary",
                    "gradient": "linear-gradient(#000,#111)",
                    "modalTitle": "申请模拟面试",
                }],
                "practiceFilters": {
                    "typeOptions": [{"value": "mock", "label": "模拟面试"}],
                    "statusOptions": [{"value": "Processing", "label": "处理中"}],
                    "rangeOptions": [{"value": "all", "label": "全部"}],
                },
                "practiceForm": {
                    "mentorCountOptions": [{"value": "2位导师", "label": "2位导师"}],
                },
                "requestSection": {
                    "titleZh": "课程申请",
                    "titleEn": "Request",
                    "subtitle": "subtitle",
                    "heroTitle": "hero",
                    "heroSubtitle": "hero",
                    "actionButtonText": "申请课程",
                    "tableTitle": "table",
                    "keywordPlaceholder": "关键词",
                    "typePlaceholder": "类型",
                    "statusPlaceholder": "状态",
                    "modalTitle": "申请课程",
                },
                "requestTabs": [
                    {"key": "all", "label": "全部", "count": 1},
                    {"key": "processing", "label": "处理中", "count": 1},
                    {"key": "completed", "label": "已完成", "count": 0},
                ],
                "requestFilters": {
                    "typeOptions": [{"value": "interview", "label": "岗位辅导"}],
                    "statusOptions": [{"value": "Processing", "label": "处理中"}],
                },
                "requestCourseOptions": [{
                    "value": "interview",
                    "label": "岗位辅导",
                    "badge": "IV",
                    "gradient": "linear-gradient(#123,#456)",
                    "requestType": "岗位辅导",
                    "requestContent": "request content",
                }],
                "requestForm": {
                    "companyOptions": [{"value": "Goldman Sachs", "label": "Goldman Sachs"}],
                    "jobStatusOptions": [{"value": "applied", "label": "已投递"}],
                },
            }})
            return

        if self.path == "/student/class-records/meta":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "pageSummary": {"titleZh": "课程记录", "titleEn": "Courses", "subtitle": "subtitle"},
                "reminderBanner": {
                    "iconLabel": "new",
                    "title": "待评价课程",
                    "leadText": "您有",
                    "mentorName": "Mentor A",
                    "middleText": "老师的",
                    "newRecordCount": 1,
                    "suffixText": "条记录待评价",
                    "ctaLabel": "去评价",
                },
                "tabDefinitions": [
                    {"key": "all", "label": "全部", "displayLabel": "全部", "count": 1},
                    {"key": "pending", "label": "待评价", "displayLabel": "待评价", "count": 1},
                    {"key": "evaluated", "label": "已评价", "displayLabel": "已评价", "count": 0},
                ],
                "filters": {
                    "keywordPlaceholder": "搜索导师",
                    "coachingTypePlaceholder": "辅导类型",
                    "courseContentPlaceholder": "课程内容",
                    "timeRangePlaceholder": "时间范围",
                    "resetLabel": "重置",
                    "coachingTypeOptions": [{"value": "岗位辅导", "label": "岗位辅导"}],
                    "courseContentOptions": [{"value": "Mock interview", "label": "Mock interview"}],
                    "timeRangeOptions": [{"value": "all", "label": "全部"}],
                },
                "tableHeaders": {
                    "recordId": "ID",
                    "coachingDetail": "辅导详情",
                    "courseContent": "课程内容",
                    "mentor": "导师",
                    "classDate": "上课日期",
                    "duration": "时长",
                    "rating": "评分",
                    "action": "操作",
                },
                "detailDialog": {
                    "closeLabel": "关闭",
                    "confirmLabel": "去评价",
                    "fields": {
                        "recordId": "ID",
                        "coachingDetail": "辅导详情",
                        "courseContent": "课程内容",
                        "mentor": "导师",
                        "classDate": "上课日期",
                        "duration": "时长",
                    },
                },
                "ratingDialog": {
                    "title": "课程评价",
                    "scoreLabel": "评分",
                    "tagLabel": "标签",
                    "feedbackLabel": "反馈",
                    "tagPlaceholder": "请选择标签",
                    "feedbackPlaceholder": "反馈",
                    "cancelLabel": "取消",
                    "submitLabel": "提交",
                    "successMessage": "评价成功",
                    "tagOptions": [{"value": "专业能力强", "label": "专业能力强"}],
                },
            }})
            return

        if self.path == "/student/class-records/list":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "records": [{
                    "recordId": "#R001",
                    "coachingType": "岗位辅导",
                    "coachingDetail": "GS mock",
                    "coachingTagColor": "blue",
                    "courseContent": "Mock interview",
                    "contentTagColor": "green",
                    "mentor": "Mentor A",
                    "mentorRole": "IB Mentor",
                    "classDate": "2026-03-20",
                    "classDateRaw": "2026-03-20",
                    "isNew": True,
                    "duration": "60 min",
                    "ratingScoreValue": "5",
                    "ratingLabel": "待评价",
                    "ratingColor": "orange",
                    "actionLabel": "去评价",
                    "actionKind": "rate",
                    "detailTitle": "detail",
                    "tab": "pending",
                    "ratingTags": "",
                    "ratingFeedback": "",
                    "newBadgeLabel": "NEW",
                }]
            }})
            return

        if self.path == "/student/profile":
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "profile": {
                    "studentCode": "STU001",
                    "fullName": "Student Demo",
                    "englishName": "Student Demo",
                    "email": "student@example.test",
                    "sexLabel": "女",
                    "statusLabel": "正常",
                    "leadMentor": "Mentor Lead",
                    "assistantName": "Assistant",
                    "school": "UCL",
                    "major": "Finance",
                    "graduationYear": "2026",
                    "highSchool": "Test High School",
                    "postgraduatePlan": "否",
                    "visaStatus": "F1",
                    "targetRegion": "Hong Kong",
                    "recruitmentCycle": "2026 Summer",
                    "primaryDirection": "Investment Banking",
                    "secondaryDirection": "Sales & Trading",
                    "phone": "123456",
                    "wechatId": "student-demo",
                },
                "pendingChanges": [],
                "pendingCount": 0,
            }})
            return

        self._send(404, {"code": 404, "msg": "not found"})

    def do_POST(self):
        if not require_auth(self):
            self._send(401, {"code": 401, "msg": "unauthorized"})
            return

        body = self._json()
        log_request("POST", self.path, body)

        if self.path == "/student/login":
            if body != {"username": "student_demo", "password": "student123"}:
                self._send(400, {"code": 400, "msg": "bad login payload"})
                return
            self._send(200, {"code": 200, "msg": "ok", "token": TOKEN})
            return

        if self.path == "/student/position/favorite":
            if body.get("positionId") != 101:
                self._send(400, {"code": 400, "msg": "unexpected favorite position"})
                return
            state["favorite_updates"].append(bool(body.get("favorited")))
            self._send(200, {"code": 200, "msg": "ok", "data": None})
            return

        if self.path == "/student/position/apply":
            if body.get("positionId") != 101 or body.get("applied") is not True:
                self._send(400, {"code": 400, "msg": "unexpected apply payload"})
                return
            if not body.get("date") or not body.get("method"):
                self._send(400, {"code": 400, "msg": "missing apply fields"})
                return
            state["applied"] = True
            self._send(200, {"code": 200, "msg": "ok", "data": None})
            return

        if self.path == "/student/position/progress":
            if body.get("positionId") != 101 or not body.get("stage"):
                self._send(400, {"code": 400, "msg": "unexpected progress payload"})
                return
            self._send(200, {"code": 200, "msg": "ok", "data": None})
            return

        if self.path == "/student/position/coaching":
            if body.get("positionId") != 101 or not body.get("stage") or not body.get("mentorCount"):
                self._send(400, {"code": 400, "msg": "unexpected coaching payload"})
                return
            self._send(200, {"code": 200, "msg": "ok", "data": None})
            return

        if self.path == "/student/position/manual":
            if not all(body.get(key) for key in ("category", "title", "company", "location")):
                self._send(400, {"code": 400, "msg": "manual position incomplete"})
                return
            self._send(200, {"code": 200, "msg": "ok", "data": {"positionId": 999}})
            return

        if self.path == "/student/mock-practice/practice-request":
            if body.get("type") != "mock" or body.get("mentorCount") != "2位导师":
                self._send(400, {"code": 400, "msg": "unexpected practice payload"})
                return
            state["practice_requests"].append(body)
            self._send(200, {"code": 200, "msg": "ok", "data": {"requestId": 501}})
            return

        if self.path == "/student/mock-practice/class-request":
            if body.get("courseType") != "interview" or body.get("company") != "Goldman Sachs" or body.get("status") != "applied":
                self._send(400, {"code": 400, "msg": "unexpected class payload"})
                return
            state["class_requests"].append(body)
            self._send(200, {"code": 200, "msg": "ok", "data": {"requestId": 601}})
            return

        if self.path == "/student/class-records/rate":
            if body.get("recordId") != "#R001" or body.get("rating") != 5:
                self._send(400, {"code": 400, "msg": "unexpected rate payload"})
                return
            state["ratings"].append(body)
            self._send(200, {"code": 200, "msg": "ok", "data": None})
            return

        self._send(404, {"code": 404, "msg": "not found"})

    def do_PUT(self):
        if not require_auth(self):
            self._send(401, {"code": 401, "msg": "unauthorized"})
            return

        body = self._json()
        log_request("PUT", self.path, body)

        if self.path == "/student/profile":
            expected_keys = {
                "school",
                "major",
                "graduationYear",
                "highSchool",
                "postgraduatePlan",
                "visaStatus",
                "recruitmentCycle",
                "targetRegion",
                "primaryDirection",
                "secondaryDirection",
                "phone",
                "wechatId",
            }
            if set(body.keys()) != expected_keys:
                self._send(400, {"code": 400, "msg": "unexpected profile payload"})
                return
            state["profile_updates"].append(body)
            self._send(200, {"code": 200, "msg": "ok", "data": {
                "profile": {
                    "studentCode": "STU001",
                    "fullName": "Student Demo",
                    "englishName": "Student Demo",
                    "email": "student@example.test",
                    "sexLabel": "女",
                    "statusLabel": "正常",
                    "leadMentor": "Mentor Lead",
                    "assistantName": "Assistant",
                    **body,
                },
                "pendingChanges": [],
                "pendingCount": 0,
            }})
            return

        self._send(404, {"code": 404, "msg": "not found"})

    def log_message(self, fmt, *args):
        return


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
PY
SERVER_PID="$!"

for _ in {1..30}; do
  if python3 - <<'PY'
import os
import urllib.request

url = f"http://127.0.0.1:{os.environ['SELFTEST_PORT']}/student/login"
try:
    urllib.request.urlopen(urllib.request.Request(url, data=b"{}", method="POST"), timeout=0.5)
except Exception:
    pass
PY
  then
    break
  fi
  sleep 0.2
done

set +e
BASE_URL="http://127.0.0.1:${PORT}" \
STUDENT_USERNAME="student_demo" \
STUDENT_PASSWORD="student123" \
bash "${ROOT_DIR}/bin/student-api-smoke.sh" > "${RUN_LOG}" 2>&1
RC=$?
set -e

if [[ "${RC}" -ne 0 ]]; then
  cat "${RUN_LOG}"
  echo "FAIL: student-api-smoke should pass against the selftest stub runtime"
  exit 1
fi

for pattern in \
  "PASS: login" \
  "PASS: positions.list" \
  "PASS: positions.manual" \
  "PASS: applications.list" \
  "PASS: mock-practice.practice-request" \
  "PASS: class-records.rate" \
  "PASS: profile.update"
do
  grep -q "${pattern}" "${RUN_LOG}" || {
    cat "${RUN_LOG}"
    echo "FAIL: missing output pattern: ${pattern}"
    exit 1
  }
done

for pattern in \
  '"path": "/student/position/favorite"' \
  '"path": "/student/position/apply"' \
  '"path": "/student/position/progress"' \
  '"path": "/student/position/coaching"' \
  '"path": "/student/position/manual"' \
  '"path": "/student/mock-practice/practice-request"' \
  '"path": "/student/mock-practice/class-request"' \
  '"path": "/student/class-records/rate"' \
  '"path": "/student/profile"'
do
  grep -q "${pattern}" "${REQUEST_LOG}" || {
    cat "${REQUEST_LOG}"
    echo "FAIL: expected request missing: ${pattern}"
    exit 1
  }
done

echo "PASS: student-api-smoke-selftest"
