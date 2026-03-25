package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewMentorControllerTest
{
    @InjectMocks
    private OsgJobOverviewController controller;

    @Mock
    private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

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
        when(leadMentorJobOverviewService.selectOverviewList(eq("coaching"), any(OsgJobApplication.class), eq(100L)))
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
        verify(leadMentorJobOverviewService).selectOverviewList(eq("coaching"), any(OsgJobApplication.class), eq(100L));
    }

    @Test
    void confirmShouldPersistMainChainConfirmation()
    {
        when(leadMentorJobOverviewService.confirmCoaching(5L, 100L, "system"))
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
        verify(leadMentorJobOverviewService).confirmCoaching(5L, 100L, "system");
    }

    @Test
    void calendarShouldExposeLegacyEventShapeFromMainChainRows()
    {
        when(leadMentorJobOverviewService.selectOverviewList(eq("coaching"), any(OsgJobApplication.class), eq(100L)))
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
        verify(leadMentorJobOverviewService).selectOverviewList(eq("coaching"), any(OsgJobApplication.class), eq(100L));
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
