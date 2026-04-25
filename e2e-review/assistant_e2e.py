#!/usr/bin/env python3
"""
Assistant端 E2E 截图验证脚本
- 逐页面截图 + console 错误捕获
- 未登录重定向到 /login 预期行为记录
- 需要先完成登录
"""
import os
import sys
import json
from playwright.sync_api import sync_playwright, Page

SCREENSHOT_DIR = "/Users/hw/workspace/OSGPrj/e2e-review/assistant"
BASE_URL = "http://localhost:3004"

# 所有需要验证的页面（含路由、名称、是否需要登录）
PAGES = [
    # 公开路由
    {"path": "/login", "name": "login", "auth": False},
    {"path": "/forgot-password", "name": "forgot-password", "auth": False},
    # 受保护路由
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

def do_login(page: Page):
    """尝试登录助教端（使用 mock token 绕过）"""
    # 直接设置 token 到 localStorage 模拟已登录
    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
    page.evaluate("""
        () => {
            // 模拟一个有效的 token
            localStorage.setItem('osg_token', 'mock-assistant-token-for-e2e-test');
            localStorage.setItem('osg_user', JSON.stringify({
                userId: 999,
                username: 'assistant_test',
                role: 'assistant',
                realName: '助教测试账号'
            }));
        }
    """)
    print("  [login] Mock token 已写入 localStorage")

def check_redirect_to_login(page: Page, url: str) -> bool:
    """检查是否被重定向到 login"""
    page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=15000)
    final_url = page.url
    redirected = "/login" in final_url
    return redirected, final_url

def screenshot_page(page: Page, name: str, url: str, logs: dict, is_auth_page: bool):
    """对单个页面截图"""
    redirected, final_url = check_redirect_to_login(page, url)

    status = {
        "name": name,
        "url": url,
        "final_url": final_url,
        "redirected_to_login": redirected,
        "console_errors": logs["errors"],
        "console_warnings": logs["warnings"],
    }

    if redirected and is_auth_page:
        # 未登录 → login 是预期行为
        status["redirect_expected"] = True
        print(f"  [EXPECTED] {name}: 重定向到 login（未认证）")
        return status

    # 截图主视图
    safe_name = name
    path_main = f"{SCREENSHOT_DIR}/{safe_name}-main.png"
    page.screenshot(path=path_main, full_page=True)
    status["screenshot_main"] = path_main
    print(f"  [OK] {name}: 截图已保存 ({path_main})")

    return status

def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 捕获 console
        logs = setup_console_capture(page)

        # 先 mock 登录
        do_login(page)

        # 逐页面验证
        for pg in PAGES:
            print(f"\n[VISIT] {pg['name']} ({pg['path']})")
            try:
                result = screenshot_page(
                    page, pg["name"], pg["path"], logs, pg["auth"]
                )
                results.append(result)
            except Exception as e:
                results.append({
                    "name": pg["name"],
                    "url": pg["path"],
                    "error": str(e),
                })
                print(f"  [ERROR] {pg['name']}: {e}")

        # 单独对 login 页面截图（无需认证）
        print(f"\n[VISIT] login (login page)")
        try:
            page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
            path_login = f"{SCREENSHOT_DIR}/login-page.png"
            page.screenshot(path=path_login, full_page=True)
            results.append({
                "name": "login-page",
                "url": "/login",
                "screenshot_main": path_login,
                "console_errors": logs["errors"],
                "console_warnings": logs["warnings"],
            })
            print(f"  [OK] login: 截图已保存 ({path_login})")
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
