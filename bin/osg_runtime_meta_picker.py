from __future__ import annotations

import json
from typing import Any


def _coerce_positive_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = int(text)
    except ValueError:
        return None
    if parsed <= 0:
        return None
    return parsed


def pick_positive_mentor_count(meta_payload: str) -> str:
    payload = json.loads(meta_payload)
    mentor_counts = payload.get("data", {}).get("filterOptions", {}).get("mentorCounts", [])
    for option in mentor_counts:
        if not isinstance(option, dict):
            continue
        value = option.get("value")
        if _coerce_positive_int(value) is not None:
            return str(value).strip()
    raise ValueError("no positive mentor count option found")


def pick_request_course_type(meta_payload: str) -> str:
    payload = json.loads(meta_payload)
    options = payload.get("data", {}).get("requestCourseOptions", [])
    for option in options:
        if not isinstance(option, dict):
            continue
        for field in ("value", "type"):
            value = option.get(field)
            text = "" if value is None else str(value).strip()
            if text:
                return text
    raise ValueError("no request course option found")


def main() -> int:
    import sys

    try:
        if len(sys.argv) > 1 and sys.argv[1] == "request-course-type":
            print(pick_request_course_type(sys.stdin.read()))
        else:
            print(pick_positive_mentor_count(sys.stdin.read()))
        return 0
    except Exception as exc:  # pragma: no cover - exercised via CLI in shell runtime
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
