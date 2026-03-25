from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


def load_osg_runtime_meta_picker_module():
    module_path = Path(__file__).resolve().parents[2] / "bin" / "osg_runtime_meta_picker.py"
    spec = importlib.util.spec_from_file_location("osg_runtime_meta_picker", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


class OsgRuntimeMetaPickerTest(unittest.TestCase):
    def test_pick_positive_mentor_count_skips_zero_value_option(self):
        module = load_osg_runtime_meta_picker_module()
        payload = json.dumps(
            {
                "data": {
                    "filterOptions": {
                        "mentorCounts": [
                            {"label": "0 位（仅资料）", "value": "0"},
                            {"label": "1 位导师", "value": "1"},
                            {"label": "2 位导师", "value": "2"},
                        ]
                    }
                }
            }
        )

        picked = module.pick_positive_mentor_count(payload)

        self.assertEqual("1", picked)

    def test_pick_positive_mentor_count_rejects_payload_without_positive_option(self):
        module = load_osg_runtime_meta_picker_module()
        payload = json.dumps(
            {
                "data": {
                    "filterOptions": {
                        "mentorCounts": [
                            {"label": "0 位（仅资料）", "value": "0"},
                            {"label": "空字符串", "value": ""},
                        ]
                    }
                }
            }
        )

        with self.assertRaisesRegex(ValueError, "no positive mentor count option found"):
            module.pick_positive_mentor_count(payload)

    def test_pick_request_course_type_prefers_current_value_field(self):
        module = load_osg_runtime_meta_picker_module()
        payload = json.dumps(
            {
                "data": {
                    "requestCourseOptions": [
                        {
                            "value": "interview",
                            "type": "legacy-interview",
                            "label": "我有一个入职面试",
                        }
                    ]
                }
            }
        )

        picked = module.pick_request_course_type(payload)

        self.assertEqual("interview", picked)

    def test_pick_request_course_type_falls_back_to_legacy_type_field(self):
        module = load_osg_runtime_meta_picker_module()
        payload = json.dumps(
            {
                "data": {
                    "requestCourseOptions": [
                        {
                            "type": "legacy-interview",
                            "label": "我有一个入职面试",
                        }
                    ]
                }
            }
        )

        picked = module.pick_request_course_type(payload)

        self.assertEqual("legacy-interview", picked)


if __name__ == "__main__":
    unittest.main()
