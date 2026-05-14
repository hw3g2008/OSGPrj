package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewServiceImplTest
{
    @InjectMocks
    private OsgJobOverviewServiceImpl service;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void assignMentorsStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7001L)).thenReturn(null);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(coachingMapper.insertCoaching(any(OsgCoaching.class))).thenReturn(1);
        when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class))).thenReturn(1);

        Map<String, Object> result = service.assignMentors(
            Map.of(
                "applicationId", 7001L,
                "mentorIds", List.of(9201L, 9202L),
                "mentorNames", List.of("Jerry Li", "Mike Wang"),
                "assignNote", "优先覆盖 First Round 题型"),
            "admin_jobs");

        assertEquals(List.of(9001L, 9002L), result.get("mentorIds"));

        ArgumentCaptor<OsgCoaching> captor = ArgumentCaptor.forClass(OsgCoaching.class);
        verify(coachingMapper).insertCoaching(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());

        verify(identityResolver).resolveUserIdByStaffId(9201L);
        verify(identityResolver).resolveUserIdByStaffId(9202L);
    }

    @Test
    void assignMentorsRejectsWhenResolverCannotResolveStaffId()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setAssignStatus("pending");

        when(identityResolver.resolveUserIdByStaffId(9201L)).thenThrow(new ServiceException("员工账号不存在，无法完成导师分配"));

        ServiceException error = assertThrows(ServiceException.class, () -> service.assignMentors(
            Map.of(
                "applicationId", 7001L,
                "mentorIds", List.of(9201L),
                "mentorNames", List.of("Jerry Li")),
            "admin_jobs"));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }

    @Test
    void allTabExportMapsStageAndCoachingToHumanLabelsAndKeepsSubmittedAt()
    {
        Date submittedAt = new Date(1_700_000_000_000L);
        OsgJobApplication app = sampleApplication("Alice", "Goldman", "first_round", "pending", submittedAt);
        app.setRegion("北美");
        app.setCity("New York");
        app.setStageUpdated(Boolean.TRUE);
        app.setLeadMentorName("Sara LM");

        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(app.getApplicationId());
        coaching.setStatus("coaching");
        coaching.setMentorName("Jerry");
        coaching.setMentorBackground("Ex-GS IBD");
        coaching.setTotalHours(8);
        coaching.setFeedbackSummary("阶段反馈：进展顺利");

        when(jobApplicationMapper.selectJobApplicationList(any())).thenReturn(List.of(app));
        when(coachingMapper.selectCoachingList(any())).thenReturn(List.of(coaching));

        List<Map<String, Object>> rows = service.selectJobOverviewExportRows(null, null, null, null, null, "all");

        assertEquals(1, rows.size());
        Map<String, Object> row = rows.get(0);
        assertEquals("First Round", row.get("currentStage"));
        assertEquals("辅导中", row.get("coachingStatus"));
        assertEquals("需确认", row.get("stageUpdatedLabel"));
        assertEquals("北美", row.get("region"));
        assertEquals("New York", row.get("city"));
        assertEquals("Ex-GS IBD", row.get("mentorBackground"));
        assertEquals("Jerry", row.get("mentorName"));
        assertEquals("Sara LM", row.get("leadMentorName"));
        assertEquals(submittedAt, row.get("submittedAt"));
        assertEquals(8, row.get("hoursUsed"));
        assertEquals("阶段反馈：进展顺利", row.get("feedbackSummary"));
        assertEquals("待分配", row.get("assignedStatusLabel"));
    }

    @Test
    void allTabExportFallsBackToLeadMentorWhenMentorMissing()
    {
        OsgJobApplication app = sampleApplication("Bob", "Morgan", "applied", "pending", new Date());
        app.setLeadMentorName("Sara LM");

        when(jobApplicationMapper.selectJobApplicationList(any())).thenReturn(List.of(app));
        when(coachingMapper.selectCoachingList(any())).thenReturn(Collections.emptyList());

        Map<String, Object> row = service.selectJobOverviewExportRows(null, null, null, null, null, "all").get(0);

        assertEquals("Sara LM", row.get("mentorName"));
        assertEquals("已投递", row.get("currentStage"));
        // coachingStatus 在 coaching 为空时由 toOverviewPayload 兜底为 raw 枚举（none / pending），
        // toAllExportPayload 再 label 化 → 「未申请」或「待分配导师」之一，这里 requestedMentorCount=0 → none。
        assertEquals("未申请", row.get("coachingStatus"));
        assertEquals("", row.get("stageUpdatedLabel"));
    }

    @Test
    void pendingTabExportLabelsStageAndIncludesRegionCity()
    {
        Date submittedAt = new Date(1_700_000_000_000L);
        OsgJobApplication app = sampleApplication("Carol", "JPM", "hirevue", "pending", submittedAt);
        app.setRegion("亚太");
        app.setCity("Hong Kong");
        app.setRequestedMentorCount(2);
        app.setPreferredMentorNames("Jerry, Mike");

        when(jobApplicationMapper.selectJobApplicationList(any())).thenReturn(List.of(app));

        Map<String, Object> row = service.selectJobOverviewExportRows(null, null, null, null, null, "pending").get(0);

        assertEquals("HireVue", row.get("currentStage"));
        assertEquals("亚太", row.get("region"));
        assertEquals("Hong Kong", row.get("city"));
        assertEquals("待分配导师", row.get("coachingStatus"));
        assertEquals("待分配", row.get("assignedStatusLabel"));
        assertEquals("Jerry, Mike", row.get("preferredMentorNames"));
        assertEquals(submittedAt, row.get("submittedAt"));
        assertNull(row.get("mentorName"));
        assertNull(row.get("mentorBackground"));
    }

    @Test
    void stageUpdatedLabelHandlesNullAndFalseAndUnknownStage()
    {
        OsgJobApplication app = sampleApplication("Dan", "Citi", "unknown_stage", "assigned", new Date());
        app.setStageUpdated(null);

        when(jobApplicationMapper.selectJobApplicationList(any())).thenReturn(List.of(app));
        when(coachingMapper.selectCoachingList(any())).thenReturn(Collections.emptyList());

        Map<String, Object> row = service.selectJobOverviewExportRows(null, null, null, null, null, "all").get(0);

        assertEquals("", row.get("stageUpdatedLabel"));
        // 未知 stage 值不在映射表里，应原样回退
        assertEquals("unknown_stage", row.get("currentStage"));
        assertEquals("已分配", row.get("assignedStatusLabel"));
    }

    @Test
    void overviewPayloadIncludesSubmittedAtForListEndpoint()
    {
        Date submittedAt = new Date(1_700_000_000_000L);
        OsgJobApplication app = sampleApplication("Eve", "MS", "offer", "assigned", submittedAt);

        when(jobApplicationMapper.selectJobApplicationList(any())).thenReturn(List.of(app));
        when(coachingMapper.selectCoachingList(any())).thenReturn(Collections.emptyList());

        Map<String, Object> row = service.selectJobOverviewList(null, null, null, null, null).get(0);

        assertNotNull(row.get("submittedAt"));
        assertEquals(submittedAt, row.get("submittedAt"));
    }

    private static OsgJobApplication sampleApplication(String studentName,
                                                       String companyName,
                                                       String stage,
                                                       String assignStatus,
                                                       Date submittedAt)
    {
        OsgJobApplication app = new OsgJobApplication();
        app.setApplicationId(7001L);
        app.setStudentId(3001L);
        app.setStudentName(studentName);
        app.setCompanyName(companyName);
        app.setPositionName("Summer Analyst");
        app.setCurrentStage(stage);
        app.setAssignStatus(assignStatus);
        app.setSubmittedAt(submittedAt);
        return app;
    }
}
