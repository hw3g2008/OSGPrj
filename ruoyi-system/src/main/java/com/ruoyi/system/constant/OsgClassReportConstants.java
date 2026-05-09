package com.ruoyi.system.constant;

import java.math.BigDecimal;

public final class OsgClassReportConstants
{
    // ── 调用端标识（§5.2）────────────────────────────────────────────────────────
    public static final String END_MENTOR = "mentor";
    public static final String END_LEAD_MENTOR = "lead-mentor";
    public static final String END_ASSISTANT = "assistant";
    public static final String END_STUDENT = "student";

    // ── 课程类型 ─────────────────────────────────────────────────────────────────
    public static final String COURSE_TYPE_JOB_COACHING = "job_coaching";
    public static final String COURSE_TYPE_MOCK_INTERVIEW = "mock_interview";
    public static final String COURSE_TYPE_RELATION_TEST = "relation_test";
    public static final String COURSE_TYPE_COMMUNICATION_TEST = "communication_test";
    public static final String COURSE_TYPE_BASE_COURSE = "base_course";

    // ── 学员状态 ─────────────────────────────────────────────────────────────────
    public static final String MEMBER_STATUS_NORMAL = "normal";
    public static final String MEMBER_STATUS_ABSENT = "absent";

    // ── 关联类型 ─────────────────────────────────────────────────────────────────
    public static final String REFERENCE_TYPE_APPLICATION = "application";
    public static final String REFERENCE_TYPE_MOCK_INTERVIEW = "mock_interview";
    public static final String REFERENCE_TYPE_RELATION_TEST = "relation_test";
    public static final String REFERENCE_TYPE_COMMUNICATION_TEST = "communication_test";

    // ── 基础课二级类型 ────────────────────────────────────────────────────────────
    public static final String BASE_CATEGORY_TECH = "tech";
    public static final String BASE_CATEGORY_BEHAVIOR = "behavior";
    public static final String BASE_CATEGORY_NEW_RESUME = "new_resume";
    public static final String BASE_CATEGORY_RESUME_UPDATE = "resume_update";
    public static final String BASE_CATEGORY_CASE_STUDY = "case_study";
    public static final String BASE_CATEGORY_OTHER = "other";

    // ── 旷课默认课时 ─────────────────────────────────────────────────────────────
    public static final BigDecimal ABSENT_DEFAULT_HOURS = new BigDecimal("0.5");

    private OsgClassReportConstants()
    {
    }
}
