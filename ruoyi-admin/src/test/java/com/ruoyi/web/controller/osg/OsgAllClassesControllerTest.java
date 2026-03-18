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
    @Test
    void listShouldReturnAllRowsWhenTabIsAll() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "onboarding_interview", "status", "pending", "courseSource", "clerk"),
                Map.of("recordId", 2L, "courseType", "mock_interview", "status", "paid", "courseSource", "assistant"),
                Map.of("recordId", 3L, "courseType", "written_test", "status", "rejected", "courseSource", "assistant_report")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(3, ((List<?>) result.get("rows")).size());
        assertEquals(3, result.get("total"));
    }

    @Test
    void listShouldReturnPendingTabRows() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "onboarding_interview", "status", "pending", "courseSource", "clerk_submit"),
                Map.of("recordId", 2L, "courseType", "mock_interview", "status", "paid", "courseSource", "assistant_submit")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("pending", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(1, ((List<?>) result.get("rows")).size());
    }

    @Test
    void listShouldReturnPaidTabRows() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "midterm_exam", "status", "paid", "courseSource", "mentor")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("paid", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(1, ((List<?>) result.get("rows")).size());
    }

    @Test
    void listShouldReturnRejectedTabRows() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "written_test", "status", "rejected", "courseSource", "clerk")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("rejected", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(1, ((List<?>) result.get("rows")).size());

        @SuppressWarnings("unchecked")
        Map<String, Object> row = ((List<Map<String, Object>>) result.get("rows")).get(0);
        assertEquals("rejected", row.get("modalType"));
        assertEquals("red", row.get("headerTone"));
        assertEquals("已驳回", row.get("headerTitle"));
        assertEquals("已驳回", row.get("displayStatusLabel"));
        assertEquals("笔试辅导", row.get("courseTypeLabel"));
        assertEquals("班主任端", row.get("sourceLabel"));
    }

    @Test
    void listShouldHandleInvalidTabAsAll() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "mock_interview", "status", "pending", "courseSource", "")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("invalid_tab", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(1, ((List<?>) result.get("rows")).size());
    }

    @Test
    void listShouldHandleNullTab() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "unknown_type", "status", "unknown_status", "courseSource", "unknown_source")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list(null, null, 1, 10);
        assertEquals(200, result.get("code"));

        @SuppressWarnings("unchecked")
        Map<String, Object> row = ((List<Map<String, Object>>) result.get("rows")).get(0);
        assertEquals("unpaid", row.get("displayStatus"));
        assertEquals("未支付", row.get("displayStatusLabel"));
        assertEquals("entry", row.get("modalType"));
        assertEquals("blue", row.get("headerTone"));
        assertEquals("入职面试", row.get("headerTitle"));
        assertEquals("入职面试", row.get("courseTypeLabel"));
        assertEquals("导师端", row.get("sourceLabel"));
    }

    @Test
    void listShouldHandleEmptyRows() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(null);

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(0, ((List<?>) result.get("rows")).size());
    }

    @Test
    void listShouldHandleNullPageNumAndPageSize() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "onboarding_interview", "status", "pending", "courseSource", "clerk")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, null, null);
        assertEquals(200, result.get("code"));
        assertEquals(1, result.get("pageNum"));
        assertEquals(10, result.get("pageSize"));
    }

    @Test
    void listShouldHandlePageExceedingTotal() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "onboarding_interview", "status", "pending", "courseSource", "clerk")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, 100, 10);
        assertEquals(200, result.get("code"));
        assertEquals(0, ((List<?>) result.get("rows")).size());
    }

    @Test
    void detailShouldDecorateMidtermExamWithAmberTone() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportDetail(99L))
            .thenReturn(Map.of(
                "recordId", 99L,
                "courseType", "midterm_exam",
                "status", "pending",
                "studentName", "学员X"
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.detail(99L);
        assertEquals(200, result.get("code"));

        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) result.get("data");
        assertEquals("midterm", detail.get("modalType"));
        assertEquals("amber", detail.get("headerTone"));
        assertEquals("模拟期中考试", detail.get("headerTitle"));
        assertEquals("模拟期中考试", detail.get("courseTypeLabel"));
    }

    @Test
    void detailShouldDecorateWrittenTestWithRoseTone() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportDetail(98L))
            .thenReturn(Map.of(
                "recordId", 98L,
                "courseType", "written_test",
                "status", "approved",
                "studentName", "学员Y"
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.detail(98L);
        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) result.get("data");
        assertEquals("written", detail.get("modalType"));
        assertEquals("rose", detail.get("headerTone"));
        assertEquals("笔试辅导", detail.get("headerTitle"));
    }

    @Test
    void detailShouldDecorateMockInterviewWithEmeraldTone() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportDetail(97L))
            .thenReturn(Map.of(
                "recordId", 97L,
                "courseType", "mock_interview",
                "status", "approved",
                "studentName", "学员W",
                "courseSource", "assistant"
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.detail(97L);
        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) result.get("data");
        assertEquals("mock", detail.get("modalType"));
        assertEquals("emerald", detail.get("headerTone"));
        assertEquals("模拟面试", detail.get("headerTitle"));
        assertEquals("模拟面试", detail.get("courseTypeLabel"));
        assertEquals("助教端", detail.get("sourceLabel"));
    }


    @Test
    void listShouldHandleNegativePageNumAndPageSize() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of(
                Map.of("recordId", 1L, "courseType", "onboarding_interview", "status", "pending", "courseSource", "clerk")
            ));

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, -1, -5);
        assertEquals(200, result.get("code"));
        assertEquals(1, result.get("pageNum"));
        assertEquals(10, result.get("pageSize"));
    }

    @Test
    void listShouldHandleEmptyRowsFromService() throws Exception
    {
        OsgClassRecordServiceImpl classRecordService = mock(OsgClassRecordServiceImpl.class);
        when(classRecordService.selectReportList(eq(null), eq(null), eq(null), eq(null)))
            .thenReturn(List.of());

        OsgAllClassesController controller = new OsgAllClassesController();
        ReflectionTestUtils.setField(controller, "classRecordService", classRecordService);

        AjaxResult result = controller.list("all", null, 1, 10);
        assertEquals(200, result.get("code"));
        assertEquals(0, ((List<?>) result.get("rows")).size());
    }


}
