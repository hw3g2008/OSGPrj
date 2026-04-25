#!/usr/bin/env python3
"""E2E review: Login to lead-mentor, navigate all pages, take screenshots."""

import os, base64, io
from playwright.sync_api import sync_playwright
import requests

BASE = "http://127.0.0.1:3003"
BACKEND = "http://127.0.0.1:28080"
OUT_DIR = "e2e-review/lead-mentor"
os.makedirs(OUT_DIR, exist_ok=True)


def get_lead_mentor_token() -> str | None:
    """
    Login to /lead-mentor/login endpoint (no captcha required).
    Valid credentials: lead_mentor_demo / Osg@2026
    """
    try:
        r = requests.post(
            f"{BACKEND}/lead-mentor/login",
            json={"username": "lead_mentor_demo", "password": "Osg@2026"},
            timeout=10
        )
        result = r.json()
        if result.get("code") == 200:
            token = result.get("token") or (result.get("data") or {}).get("token")
            print(f"  [AUTH] ✓ Logged in as lead_mentor_demo")
            return token
        else:
            print(f"  [AUTH] Login failed: {result}")
            return None
    except Exception as e:
        print(f"  [AUTH] Login error: {e}")
        return None


def main():
    console_errors = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
        )
        page = context.new_page()

        def on_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text[:200])
        page.on("console", on_console)

        # ── 1. Login page screenshot ─────────────────────────────────────────
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT_DIR}/00-login.png", full_page=True)
        print(f"[SCR] 00-login.png @ {page.url}")

        # ── 2. Get token and inject auth ─────────────────────────────────────
        token = get_lead_mentor_token()
        if not token:
            print("[!] Could not get login token")
            browser.close()
            return

        # Inject token via page.goto to set localStorage before router guard runs
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=15000)
        page.evaluate(f"""
            localStorage.setItem('osg_token', '{token}');
            localStorage.setItem('osg_user', JSON.stringify({{
                userId: 970,
                username: 'lead_mentor_demo',
                nickName: 'Lead Demo',
                roles: ['clerk', 'lead-mentor'],
                email: 'lead_mentor_demo@osg.local'
            }}));
        """)
        # Navigate to home (router guard reads token from localStorage)
        page.goto(f"{BASE}/home", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        print(f"[URL] After auth: {page.url}")
        page.screenshot(path=f"{OUT_DIR}/01-home.png", full_page=True)
        print(f"[SCR] 01-home.png (title={page.title()})")

        # ── 3. Navigate all routes via Vue Router (SPA navigation) ──────────
        routes = [
            ("02-career-positions",        "/career/positions"),
            ("03-career-job-overview",     "/career/job-overview"),
            ("04-career-mock-practice",     "/career/mock-practice"),
            ("05-teaching-students",        "/teaching/students"),
            ("06-teaching-class-records",  "/teaching/class-records"),
            ("07-classes",                 "/classes"),
            ("08-mentors",                 "/mentors"),
            ("09-reports",                 "/reports"),
            ("10-profile-basic",            "/profile/basic"),
            ("11-profile-schedule",         "/profile/schedule"),
        ]

        for name, path in routes:
            try:
                # Use Vue Router's pushState (no page reload, token preserved)
                page.evaluate(f"""
                    (() => {{
                        const app = document.querySelector('#app');
                        const vueApp = app && app.__vue_app__;
                        const router = vueApp && (vueApp._instance && vueApp._instance.provides && vueApp._instance.provides.$router)
                            || (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$router);
                        if (router) {{
                            router.push('{path}');
                        }} else {{
                            window.history.pushState(null, '', '{path}');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                    }})();
                """)
                page.wait_for_timeout(3000)
                page.screenshot(path=f"{OUT_DIR}/{name}.png", full_page=True)
                print(f"[SCR] {name}.png @ {page.url}")
            except Exception as e:
                print(f"[ERR] {name}: {e}")

        # ── 4. Console errors ─────────────────────────────────────────────
        if console_errors:
            print(f"\n  Console errors ({len(console_errors)}):")
            for err in console_errors[:10]:
                print(f"    {err[:200]}")
        else:
            print("\n  [OK] No console errors")

        browser.close()


if __name__ == "__main__":
    main()
