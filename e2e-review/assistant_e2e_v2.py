#!/usr/bin/env python3
"""
Assistant端 E2E 截图验证脚本 v2 - 使用 API Mock 绕过登录
"""
import os
import json
from playwright.sync_api import sync_playwright, Page, Route

SCREENSHOT_DIR = "/Users/hw/workspace/OSGPrj/e2e-review/assistant"
BASE_URL = "http://localhost:3004"
# 使用本地前端代理到远程后端
API_BASE = "http://47.94.213.128:28080"

# 有效 mock token（后端会验证 JWT 签名，这里只能骗过前端 router guard）
MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5OTksInVzZXJuYW1lIjoidGVzdCIsInJvbGVzIjpbImFzc2lzdGFudCJdLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.mock"

MOCK_USER_INFO = {
    "user": {
        "userId": 999,
        "username": "assistant_test",
        "realName": "助教测试账号",
        "phonenumber": "13800138000",
        "email": "test@example.com",
        "avatar": "",
        "deptId": 100,
        "deptName": "助教部"
    },
    "roles": ["assistant"],
    "permissions": ["*"]
}

# 所有需要验证的页面
PAGES = [
    # 公开路由
    {"path": "/login", "name": "login", "auth": False},
    {"path": "/forgot-password", "name": "forgot-password", "auth": False},
    # 受保护路由（需要拦截 login/getInfo API）
    {"path": "/home", "name": "home", "auth": True},
    {"path": "/career/positions", "name": "career-positions", "auth": True},
    {"path": "/career/job-overview", "name": "career-job-overview", "auth": True},
    {"path": "/career/mock-practice", "name": "career-mock-practice", "auth": True},
    {"path": "/students", "name": "students", "auth": True},
    {"path": "/communication", "name": "communication", "auth": True},
    {"path": "/class-records", "name": "class-records", "auth": True},
    {"path": "/settlement", "name": "settlement", "auth": True},
    {"path": "/expense", "name": "expense", "auth": True},
    {"path": "/files", "name": "files", "auth": True},
    {"path": "/online-test-bank", "name": "online-test-bank", "auth": True},
    {"path": "/interview-bank", "name": "interview-bank", "auth": True},
    {"path": "/profile", "name": "profile", "auth": True},
    {"path": "/schedule", "name": "schedule", "auth": True},
    {"path": "/notice", "name": "notice", "auth": True},
    {"path": "/faq", "name": "faq", "auth": True},
]


def setup_api_mock(page: Page):
    """拦截登录相关 API，返回 mock 数据"""

    def mock_login(route: Route):
        route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({
                "code": 200,
                "msg": "操作成功",
                "data": {"token": MOCK_TOKEN}
            })
        )

    def mock_get_info(route: Route):
        route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({
                "code": 200,
                "msg": "操作成功",
                "data": MOCK_USER_INFO
            })
        )

    # 拦截登录 API
    page.route(
        lambda url: "/api/assistant/login" in url or "/assistant/login" in url,
        mock_login
    )
    # 拦截获取用户信息 API
    page.route(
        lambda url: "/api/assistant/getInfo" in url or "/assistant/getInfo" in url,
        mock_get_info
    )


def setup_console_capture(page: Page):
    """捕获 console 错误和警告"""
    logs = {"errors": [], "warnings": [], "infos": []}

    def on_console(msg):
        if msg.type == "error":
            logs["errors"].append(msg.text)
        elif msg.type == "warning":
            logs["warnings"].append(msg.text)
        elif msg.type == "info":
            logs["infos"].append(msg.text)

    page.on("console", on_console)
    return logs


def do_mock_login(page: Page):
    """通过 API mock 完成登录流程"""
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
    setup_api_mock(page)

    # 填写登录表单
    page.fill("#login-username", "test_assistant")
    page.fill("#login-password", "test123")
    page.click("#login-btn")

    # 等待登录完成（应该被 mock 拦截）
    page.wait_for_timeout(3000)

    # 检查是否还在 login 页面（如果 token 被后端验证会失败）
    final_url = page.url
    if "/login" in final_url:
        print("  [FALLBACK] API mock 失败，使用 localStorage 方式")
        # fallback: 直接设置 localStorage
        page.evaluate(f"""
            () => {{
                localStorage.setItem('osg_token', '{MOCK_TOKEN}');
                localStorage.setItem('osg_user', JSON.stringify({json.dumps(MOCK_USER_INFO)}));
            }}
        """)
    else:
        print(f"  [OK] API mock 成功登录，URL: {final_url}")


def screenshot_page(page: Page, name: str, url: str, logs: dict, auth: bool):
    """对单个页面截图"""
    if auth:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=20000)
    else:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=15000)

    page.wait_for_timeout(1000)

    final_url = page.url
    redirected_to_login = "/login" in final_url and auth

    status = {
        "name": name,
        "path": url,
        "final_url": final_url,
        "redirected_to_login": redirected_to_login,
        "console_errors": logs["errors"],
        "console_warnings": logs["warnings"],
    }

    if redirected_to_login:
        status["result"] = "REDIRECTED_TO_LOGIN"
        print(f"  [BLOCKED] {name}: 重定向到 login（未认证）")
        return status

    # 截图
    safe_name = name
    path_main = f"{SCREENSHOT_DIR}/{safe_name}-main.png"
    page.screenshot(path=path_main, full_page=True)
    status["screenshot_main"] = path_main

    print(f"  [OK] {name}: 截图已保存")

    return status


def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        logs = setup_console_capture(page)

        # Mock 登录
        print("[LOGIN] 开始 mock 登录...")
        do_mock_login(page)

        # 重新设置 API mock（登录后可能还需要 getInfo）
        setup_api_mock(page)

        # 逐页面截图
        for pg in PAGES:
            print(f"\n[VISIT] {pg['name']} ({pg['path']})")
            try:
                result = screenshot_page(page, pg["name"], pg["path"], logs, pg["auth"])
                # 清空 console logs 避免累积
                logs["errors"] = []
                logs["warnings"] = []
                results.append(result)
            except Exception as e:
                results.append({
                    "name": pg["name"],
                    "path": pg["path"],
                    "error": str(e),
                })
                print(f"  [ERROR] {pg['name']}: {e}")
                import traceback
                traceback.print_exc()

        # 截图 login 页面
        print(f"\n[VISIT] login (登录页截图)")
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
            path_login = f"{SCREENSHOT_DIR}/login-page.png"
            page.screenshot(path=path_login, full_page=True)
            results.append({
                "name": "login-page",
                "path": "/login",
                "screenshot_main": path_login,
            })
            print(f"  [OK] login: 截图已保存")
        except Exception as e:
            print(f"  [ERROR] login: {e}")

        # 保存结果
        report_path = f"{SCREENSHOT_DIR}/e2e-results.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n[DONE] 结果已保存到 {report_path}")

        browser.close()


if __name__ == "__main__":
    main()
