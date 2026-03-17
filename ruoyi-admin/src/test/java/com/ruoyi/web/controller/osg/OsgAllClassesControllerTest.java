package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

class OsgAllClassesControllerTest
{
    @Test
    void allClassesControllerSourceShouldExposeProtectedListAndDetailEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgAllClassesController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/all-classes\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@GetMapping(\"/{recordId}/detail\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:all-classes:list')"));
    }

    @Test
    void listShouldReturnPaginatedRowsAndFiveTabSummary() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "studentName", "学员A", "mentorName", "导师A", "courseType", "onboarding_interview", "status", "pending"),
                Map.of("recordId", 2L, "studentName", "学员B", "mentorName", "导师B", "courseType", "mock_interview", "status", "approved"),
                Map.of("recordId", 3L, "studentName", "学员C", "mentorName", "导师C", "courseType", "written_test", "status", "approved"),
                Map.of("recordId", 4L, "studentName", "学员D", "mentorName", "导师D", "courseType", "midterm_exam", "status", "rejected")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("unpaid", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(2, ((List<?>) result.get("rows")).size());
        assertEquals(2, result.get("total"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) result.get("summary");
        assertEquals(4, summary.get("allCount"));
        assertEquals(1, summary.get("pendingCount"));
        assertEquals(2, summary.get("unpaidCount"));
        assertEquals(0, summary.get("paidCount"));
        assertEquals(1, summary.get("rejectedCount"));
        assertEquals("unpaid", summary.get("selectedTab"));
    }

    @Test
    void detailShouldDecorateCourseRecordWithModalVariantAndGradientTone() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportDetail(88L))
            .thenReturn(Map.of(
                "recordId", 88L,
                "courseType", "communication_midterm",
                "status", "approved",
                "studentName", "学员Z"
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.detail(88L);
        assertEquals(200, result.get("code"));

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) result.get("data");
        assertEquals("networking", detail.get("modalType"));
        assertEquals("violet", detail.get("headerTone"));
        assertEquals("未支付", detail.get("displayStatusLabel"));
    }
}
