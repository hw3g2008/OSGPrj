package com.ruoyi.system.constant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class OsgClassReportConstantsTest
{
    @Test
    void testCourseTypeConstants()
    {
        assertEquals("job_coaching", OsgClassReportConstants.COURSE_TYPE_JOB_COACHING);
        assertEquals("mock_interview", OsgClassReportConstants.COURSE_TYPE_MOCK_INTERVIEW);
        assertEquals("relation_test", OsgClassReportConstants.COURSE_TYPE_RELATION_TEST);
        assertEquals("communication_test", OsgClassReportConstants.COURSE_TYPE_COMMUNICATION_TEST);
        assertEquals("base_course", OsgClassReportConstants.COURSE_TYPE_BASE_COURSE);
    }

    @Test
    void testMemberStatusConstants()
    {
        assertEquals("normal", OsgClassReportConstants.MEMBER_STATUS_NORMAL);
        assertEquals("absent", OsgClassReportConstants.MEMBER_STATUS_ABSENT);
    }

    @Test
    void testReferenceTypeConstants()
    {
        assertEquals("application", OsgClassReportConstants.REFERENCE_TYPE_APPLICATION);
        assertEquals("mock_interview", OsgClassReportConstants.REFERENCE_TYPE_MOCK_INTERVIEW);
        assertEquals("relation_test", OsgClassReportConstants.REFERENCE_TYPE_RELATION_TEST);
        assertEquals("communication_test", OsgClassReportConstants.REFERENCE_TYPE_COMMUNICATION_TEST);
    }

    @Test
    void testBaseCategoryConstants()
    {
        assertEquals("tech", OsgClassReportConstants.BASE_CATEGORY_TECH);
        assertEquals("behavior", OsgClassReportConstants.BASE_CATEGORY_BEHAVIOR);
        assertEquals("new_resume", OsgClassReportConstants.BASE_CATEGORY_NEW_RESUME);
        assertEquals("resume_update", OsgClassReportConstants.BASE_CATEGORY_RESUME_UPDATE);
        assertEquals("case_study", OsgClassReportConstants.BASE_CATEGORY_CASE_STUDY);
        assertEquals("other", OsgClassReportConstants.BASE_CATEGORY_OTHER);
    }

    @Test
    void testAbsentDefaultHours()
    {
        assertEquals(0, OsgClassReportConstants.ABSENT_DEFAULT_HOURS.compareTo(new BigDecimal("0.5")));
    }
}
