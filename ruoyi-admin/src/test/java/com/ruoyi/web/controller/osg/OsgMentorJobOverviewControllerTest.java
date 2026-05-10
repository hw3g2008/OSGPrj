package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgUserJobOverviewService;

@ExtendWith(MockitoExtension.class)
class OsgMentorJobOverviewControllerTest
{
    @InjectMocks
    private OsgMentorJobOverviewController controller;

    @Mock
    private IOsgUserJobOverviewService userJobOverviewService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void mentorListShouldAdaptMainChainRowsIntoLegacyPayload()
    {
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(100L)))
            .thenReturn(List.of(Map.of(
                "applicationId", 7L,
                "studentId", 843L,
                "studentName", "Curl Student",
                "companyName", "Browser Smoke Capital 3",
                "positionName", "Consultant",
                "city", "Shanghai",
                "currentStage", "Round 1",
                "interviewTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 9, 0)),
                "hoursUsed", 0,
                "feedbackSummary", "-"
            )));

        TableDataInfo result = controller.mentorList(new OsgJobApplication());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.getRows();

        assertEquals(1, rows.size());
        assertEquals(7L, rows.get(0).get("id"));
        assertEquals("Browser Smoke Capital 3", rows.get(0).get("company"));
        assertEquals("Consultant", rows.get(0).get("position"));
        assertEquals("Shanghai", rows.get(0).get("location"));
        assertEquals("Round 1", rows.get(0).get("interviewStage"));
        assertEquals("new", rows.get(0).get("coachingStatus"));
        verify(userJobOverviewService).listByMentor(any(OsgJobApplication.class), eq(100L));
    }

    @Test
    void confirmShouldPersistMainChainConfirmation()
    {
        when(userJobOverviewService.confirmCoaching(5L, 100L, "system"))
            .thenReturn(Map.of(
                "applicationId", 5L,
                "coachingStatus", "coaching"
            ));

        AjaxResult result = controller.confirm(5L);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals(5L, data.get("applicationId"));
        assertEquals("coaching", data.get("coachingStatus"));
        verify(userJobOverviewService).confirmCoaching(5L, 100L, "system");
    }

    @Test
    void calendarShouldExposeLegacyEventShapeFromMainChainRows()
    {
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(100L)))
            .thenReturn(Collections.singletonList(buildCalendarRow()));

        AjaxResult result = controller.calendar();

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
        assertNotNull(data);
        assertEquals(1, data.size());
        assertEquals(7L, data.get(0).get("id"));
        assertEquals("Round 1", data.get(0).get("stage"));
        assertTrue(data.get(0).containsKey("day"));
        assertTrue(data.get(0).containsKey("weekday"));
        assertTrue(data.get(0).containsKey("color"));
        verify(userJobOverviewService).listByMentor(any(OsgJobApplication.class), eq(100L));
    }

    @Test
    void mentorListShouldIsolateRowsAcrossDifferentMentorIds()
    {
        // FIX-F: 跨用户隔离 — controller 用 SecurityUtils.getUserId() 作为 listByMentor 的 mentorId 参数，
        // 不同 mentor 必须各自只看到 service 按其 id 返回的行；不能跨用户泄漏
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(200L)))
            .thenReturn(List.of(Map.of(
                "applicationId", 1L,
                "studentId", 11L,
                "studentName", "Mentor200 Student",
                "companyName", "Co200",
                "positionName", "P200",
                "city", "City200",
                "currentStage", "Round 1",
                "hoursUsed", 0,
                "feedbackSummary", "-"
            )));
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(300L)))
            .thenReturn(List.of(Map.of(
                "applicationId", 2L,
                "studentId", 22L,
                "studentName", "Mentor300 Student",
                "companyName", "Co300",
                "positionName", "P300",
                "city", "City300",
                "currentStage", "Final",
                "hoursUsed", 0,
                "feedbackSummary", "-"
            )));

        securityMock.when(SecurityUtils::getUserId).thenReturn(200L);
        TableDataInfo result200 = controller.mentorList(new OsgJobApplication());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows200 = (List<Map<String, Object>>) result200.getRows();
        assertEquals(1, rows200.size());
        assertEquals(1L, rows200.get(0).get("id"));
        assertEquals("Co200", rows200.get(0).get("company"));

        securityMock.when(SecurityUtils::getUserId).thenReturn(300L);
        TableDataInfo result300 = controller.mentorList(new OsgJobApplication());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows300 = (List<Map<String, Object>>) result300.getRows();
        assertEquals(1, rows300.size());
        assertEquals(2L, rows300.get(0).get("id"));
        assertEquals("Co300", rows300.get(0).get("company"));

        // 关键校验：每个 mentorId 都被以自己的 id（不是其他人的）传入 service
        verify(userJobOverviewService).listByMentor(any(OsgJobApplication.class), eq(200L));
        verify(userJobOverviewService).listByMentor(any(OsgJobApplication.class), eq(300L));
    }

    @Test
    void calendarShouldIsolateEventsAcrossDifferentMentorIds()
    {
        // FIX-F: calendar 同样按 SecurityUtils.getUserId() 隔离，不能渲染他人事件
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(200L)))
            .thenReturn(Collections.singletonList(buildCalendarRowFor(101L, "Mentor200 Student", "Co200")));
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(300L)))
            .thenReturn(Collections.singletonList(buildCalendarRowFor(102L, "Mentor300 Student", "Co300")));

        securityMock.when(SecurityUtils::getUserId).thenReturn(200L);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> events200 = (List<Map<String, Object>>) controller.calendar().get("data");
        assertEquals(1, events200.size());
        assertEquals(101L, events200.get(0).get("id"));
        assertEquals("Co200", events200.get(0).get("company"));

        securityMock.when(SecurityUtils::getUserId).thenReturn(300L);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> events300 = (List<Map<String, Object>>) controller.calendar().get("data");
        assertEquals(1, events300.size());
        assertEquals(102L, events300.get(0).get("id"));
        assertEquals("Co300", events300.get(0).get("company"));
    }

    @Test
    void mentorListShouldExposeCoachingAnchorAndLessonStats()
    {
        // Step3-F1: service 已输出 coachingId/lessonCount/lessonReported；controller adapter 必须透传
        Map<String, Object> serviceRow = new LinkedHashMap<>();
        serviceRow.put("applicationId", 7L);
        serviceRow.put("coachingId", 7701L);
        serviceRow.put("studentId", 843L);
        serviceRow.put("studentName", "Curl Student");
        serviceRow.put("companyName", "Browser Smoke Capital 3");
        serviceRow.put("positionName", "Consultant");
        serviceRow.put("city", "Shanghai");
        serviceRow.put("currentStage", "Round 1");
        serviceRow.put("interviewTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 9, 0)));
        serviceRow.put("lessonCount", 2);
        serviceRow.put("lessonReported", true);
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(100L)))
            .thenReturn(Collections.singletonList(serviceRow));

        TableDataInfo result = controller.mentorList(new OsgJobApplication());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.getRows();

        assertEquals(1, rows.size());
        // 旧字段保留：id 仍然 = applicationId（避免破坏 mentor 前端 record.id 用法）
        assertEquals(7L, rows.get(0).get("id"));
        // 新字段：coachingId / applicationId / lessonCount / lessonReported
        assertEquals(7L, rows.get(0).get("applicationId"));
        assertEquals(7701L, rows.get(0).get("coachingId"));
        assertEquals(2, rows.get(0).get("lessonCount"));
        assertEquals(true, rows.get(0).get("lessonReported"));
    }

    @Test
    void mentorListShouldFallbackWhenCoachingIdMissing()
    {
        // Step3-F1: legacy fallback — service row 缺 coachingId（旧数据/无 coaching 行）时不抛 NPE
        Map<String, Object> serviceRow = new LinkedHashMap<>();
        serviceRow.put("applicationId", 9L);
        serviceRow.put("coachingId", null);
        serviceRow.put("studentId", 99L);
        serviceRow.put("studentName", "Legacy Student");
        serviceRow.put("companyName", "Legacy Co");
        serviceRow.put("positionName", "Legacy Pos");
        serviceRow.put("city", "Legacy City");
        serviceRow.put("currentStage", "Round 0");
        serviceRow.put("lessonCount", 0);
        serviceRow.put("lessonReported", false);

        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(100L)))
            .thenReturn(Collections.singletonList(serviceRow));

        TableDataInfo result = controller.mentorList(new OsgJobApplication());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.getRows();

        assertEquals(1, rows.size());
        assertEquals(9L, rows.get(0).get("id"));
        assertEquals(9L, rows.get(0).get("applicationId"));
        assertNull(rows.get(0).get("coachingId"));
        assertEquals(0, rows.get(0).get("lessonCount"));
        assertEquals(false, rows.get(0).get("lessonReported"));
    }

    @Test
    void mentorCalendarShouldExposeCoachingId()
    {
        // Step3-F1: calendar 端点同步透出 coachingId，便于前端按 coaching 锚点对应日历事件
        Map<String, Object> calendarRow = buildCalendarRow();
        calendarRow.put("coachingId", 9999L);
        when(userJobOverviewService.listByMentor(any(OsgJobApplication.class), eq(100L)))
            .thenReturn(Collections.singletonList(calendarRow));

        AjaxResult result = controller.calendar();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
        assertNotNull(data);
        assertEquals(1, data.size());
        assertEquals(7L, data.get(0).get("id"));
        assertEquals(9999L, data.get(0).get("coachingId"));
    }

    private Map<String, Object> buildCalendarRowFor(long applicationId, String studentName, String companyName)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("applicationId", applicationId);
        row.put("studentId", 800L + applicationId);
        row.put("studentName", studentName);
        row.put("companyName", companyName);
        row.put("positionName", "Position");
        row.put("city", "Hong Kong");
        row.put("currentStage", "Round 1");
        row.put("interviewTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 9, 0)));
        row.put("confirmedAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 21, 10, 0)));
        row.put("hoursUsed", 1);
        row.put("feedbackSummary", "feedback");
        return row;
    }

    private Map<String, Object> buildCalendarRow()
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("applicationId", 7L);
        row.put("studentId", 843L);
        row.put("studentName", "Curl Student");
        row.put("companyName", "Browser Smoke Capital 3");
        row.put("positionName", "Consultant");
        row.put("city", "Shanghai");
        row.put("currentStage", "Round 1");
        row.put("interviewTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 9, 0)));
        row.put("confirmedAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 21, 10, 0)));
        row.put("hoursUsed", 1);
        row.put("feedbackSummary", "feedback");
        return row;
    }
}
