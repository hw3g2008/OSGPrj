package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.service.impl.OsgIdentityResolver;
import com.ruoyi.system.service.impl.OsgJobOverviewServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewControllerTest
{
    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    private OsgJobOverviewController controller;

    private List<OsgJobApplication> applications;

    private List<OsgCoaching> coachings;

    @BeforeEach
    void setUp()
    {
        OsgJobOverviewServiceImpl service = new OsgJobOverviewServiceImpl();
        ReflectionTestUtils.setField(service, "jobApplicationMapper", jobApplicationMapper);
        ReflectionTestUtils.setField(service, "coachingMapper", coachingMapper);
        ReflectionTestUtils.setField(service, "identityResolver", identityResolver);

        controller = new OsgJobOverviewController();
        ReflectionTestUtils.setField(controller, "jobOverviewService", service);

        applications = new ArrayList<>(buildApplications());
        coachings = new ArrayList<>(buildCoachings());

        lenient().when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class)))
            .thenAnswer(invocation -> selectApplications(invocation.getArgument(0)));
        lenient().when(jobApplicationMapper.selectJobApplicationByApplicationId(anyLong()))
            .thenAnswer(invocation -> applications.stream()
                .filter(item -> Objects.equals(item.getApplicationId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        lenient().when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class)))
            .thenAnswer(invocation -> applyAssignmentUpdate(invocation.getArgument(0)));
        lenient().when(jobApplicationMapper.updateJobApplicationStage(any(OsgJobApplication.class)))
            .thenAnswer(invocation -> applyStageUpdate(invocation.getArgument(0)));
        lenient().when(coachingMapper.selectCoachingList(any(OsgCoaching.class)))
            .thenAnswer(invocation -> selectCoachings(invocation.getArgument(0)));
        lenient().when(coachingMapper.selectCoachingByApplicationId(anyLong()))
            .thenAnswer(invocation -> coachings.stream()
                .filter(item -> Objects.equals(item.getApplicationId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        lenient().when(identityResolver.resolveUserIdByStaffId(anyLong()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(coachingMapper.insertCoaching(any(OsgCoaching.class)))
            .thenAnswer(invocation -> insertCoaching(invocation.getArgument(0)));
        lenient().when(coachingMapper.updateCoaching(any(OsgCoaching.class)))
            .thenAnswer(invocation -> updateCoaching(invocation.getArgument(0)));
    }

    @Test
    void statsShouldReturnFiveKpisAndYoySummary()
    {
        AjaxResult result = controller.stats(null, null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertNotNull(data);
        assertEquals(5, data.get("appliedCount"));
        assertEquals(1, data.get("interviewingCount"));
        assertEquals(1, data.get("offerCount"));
        assertEquals(1, data.get("rejectedCount"));
        assertEquals(1, data.get("withdrawnCount"));
        assertTrue(data.containsKey("offerRateYoY"));
        assertTrue(data.containsKey("interviewPassRateYoY"));
    }

    @Test
    void funnelShouldReturnSubmittedInterviewingAndOfferStages()
    {
        AjaxResult result = controller.funnel(null, null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
        assertEquals(3, data.size());
        assertEquals("已投递", data.get(0).get("label"));
        assertEquals(5, data.get(0).get("count"));
        assertEquals("面试中", data.get(1).get("label"));
        assertEquals(1, data.get(1).get("count"));
        assertEquals("获Offer", data.get(2).get("label"));
        assertEquals(1, data.get(2).get("count"));
    }

    @Test
    void hotCompaniesShouldGroupApplicationsAndComputeOfferRate()
    {
        AjaxResult result = controller.hotCompanies(null, null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
        assertFalse(data.isEmpty());
        assertEquals("Goldman Sachs", data.get(0).get("companyName"));
        assertEquals(2, data.get(0).get("applicationCount"));
        assertEquals(0, data.get(0).get("offerCount"));
        assertEquals(0, data.get(0).get("offerRate"));
    }

    @Test
    void listShouldMergeMentorFeedbackIntoOverviewRows()
    {
        AjaxResult result = controller.list(null, null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(5, rows.size());
        Map<String, Object> assignedRow = rows.stream()
            .filter(item -> Long.valueOf(2L).equals(item.get("applicationId")))
            .findFirst()
            .orElseThrow();
        assertEquals("辅导中", assignedRow.get("coachingStatus"));
        assertEquals("Jess", assignedRow.get("mentorName"));
        assertEquals(6, assignedRow.get("hoursUsed"));
        assertEquals("拆分 case study 讲解后通过率提升", assignedRow.get("feedbackSummary"));
    }

    @Test
    void unassignedShouldExcludeAlreadyAssignedApplications()
    {
        AjaxResult result = controller.unassigned(null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(3, rows.size());
        assertTrue(rows.stream().noneMatch(item -> Long.valueOf(2L).equals(item.get("applicationId"))));
        assertTrue(rows.stream().anyMatch(item -> Long.valueOf(4L).equals(item.get("applicationId"))));
    }

    @Test
    void assignMentorShouldPersistAssignedStatusAndHideFromUnassignedList()
    {
        AjaxResult assignResult = controller.assignMentor(Map.of(
            "applicationId", 1L,
            "mentorIds", List.of(9001L, 9002L),
            "mentorNames", List.of("Jerry Li", "Mike Lee"),
            "assignNote", "优先覆盖 First Round 题型"));

        assertEquals(200, assignResult.get("code"));
        assertEquals("assigned", assignResult.get("status"));
        assertEquals("辅导中", assignResult.get("coachingStatus"));
        assertEquals("Jerry Li, Mike Lee", assignResult.get("mentorNames"));

        OsgCoaching createdCoaching = coachings.stream()
            .filter(item -> Long.valueOf(1L).equals(item.getApplicationId()))
            .findFirst()
            .orElseThrow();
        assertEquals(0, createdCoaching.getTotalHours());

        AjaxResult unassigned = controller.unassigned(null, null, null, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> unassignedRows = (List<Map<String, Object>>) unassigned.get("rows");
        assertEquals(2, unassignedRows.size());
        assertTrue(unassignedRows.stream().noneMatch(item -> Long.valueOf(1L).equals(item.get("applicationId"))));

        AjaxResult list = controller.list(null, null, null, null, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) list.get("rows");
        Map<String, Object> assignedRow = rows.stream()
            .filter(item -> Long.valueOf(1L).equals(item.get("applicationId")))
            .findFirst()
            .orElseThrow();
        assertEquals("辅导中", assignedRow.get("coachingStatus"));
        assertEquals("Jerry Li", assignedRow.get("mentorName"));
    }

    @Test
    void stageUpdateShouldPersistNotificationFlag()
    {
        AjaxResult updateResult = controller.stageUpdate(Map.of(
            "applicationId", 1L,
            "currentStage", "second_round",
            "stageUpdated", true));

        assertEquals(200, updateResult.get("code"));
        assertEquals("second_round", updateResult.get("currentStage"));
        assertEquals(Boolean.TRUE, updateResult.get("stageUpdated"));

        AjaxResult listAfterUpdate = controller.list(null, null, null, null, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) listAfterUpdate.get("rows");
        Map<String, Object> updatedRow = rows.stream()
            .filter(item -> Long.valueOf(1L).equals(item.get("applicationId")))
            .findFirst()
            .orElseThrow();
        assertEquals("second_round", updatedRow.get("currentStage"));
        assertEquals(Boolean.TRUE, updatedRow.get("stageUpdated"));

        AjaxResult confirmResult = controller.stageUpdate(Map.of(
            "applicationId", 1L,
            "stageUpdated", false));
        assertEquals(200, confirmResult.get("code"));
        assertEquals(Boolean.FALSE, confirmResult.get("stageUpdated"));
    }

    private List<OsgJobApplication> buildApplications()
    {
        return List.of(
            buildApplication(1L, 101L, "Alice", "Goldman Sachs", "Summer Analyst", "New York", "applied", "pending", 2, "Jess, Amy", null, previousMonth(12)),
            buildApplication(2L, 102L, "Bob", "Goldman Sachs", "Quant Research", "New York", "first_round", "assigned", 1, "Jess", "Amy", currentMonth(5)),
            buildApplication(3L, 103L, "Cathy", "McKinsey", "Business Analyst", "London", "offer", "assigned", 1, "Jess", "Jess", currentMonth(3)),
            buildApplication(4L, 104L, "David", "Google", "Product Strategy", "Singapore", "rejected", "pending", 2, "Amy, Jess", "Amy", currentMonth(2)),
            buildApplication(5L, 105L, "Ella", "JP Morgan", "Markets Analyst", "Hong Kong", "withdrawn", "pending", 2, "Jess, Amy", "Jess", previousMonth(18))
        );
    }

    private List<OsgCoaching> buildCoachings()
    {
        OsgCoaching first = new OsgCoaching();
        first.setCoachingId(201L);
        first.setApplicationId(2L);
        first.setStudentId(102L);
        first.setMentorId(9001L);
        first.setMentorName("Jess");
        first.setMentorBackground("PE / MBB");
        first.setStatus("辅导中");
        first.setTotalHours(6);
        first.setFeedbackSummary("拆分 case study 讲解后通过率提升");

        OsgCoaching second = new OsgCoaching();
        second.setCoachingId(202L);
        second.setApplicationId(3L);
        second.setStudentId(103L);
        second.setMentorId(9002L);
        second.setMentorName("Amy");
        second.setMentorBackground("IBD / ECM");
        second.setStatus("辅导中");
        second.setTotalHours(10);
        second.setFeedbackSummary("Offer 后进入谈薪阶段");

        return List.of(first, second);
    }

    private OsgJobApplication buildApplication(Long applicationId,
                                               Long studentId,
                                               String studentName,
                                               String companyName,
                                               String positionName,
                                               String city,
                                               String currentStage,
                                               String assignStatus,
                                               Integer requestedMentorCount,
                                               String preferredMentorNames,
                                               String leadMentorName,
                                               Timestamp submittedAt)
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(applicationId);
        application.setStudentId(studentId);
        application.setStudentName(studentName);
        application.setCompanyName(companyName);
        application.setPositionName(positionName);
        application.setCity(city);
        application.setCurrentStage(currentStage);
        application.setAssignStatus(assignStatus);
        application.setRequestedMentorCount(requestedMentorCount);
        application.setPreferredMentorNames(preferredMentorNames);
        application.setLeadMentorName(leadMentorName);
        application.setSubmittedAt(submittedAt);
        application.setInterviewTime(Timestamp.valueOf(LocalDateTime.now().plusDays(applicationId)));
        return application;
    }

    private Timestamp currentMonth(int day)
    {
        return Timestamp.valueOf(LocalDateTime.of(2026, 3, day, 10, 0));
    }

    private Timestamp previousMonth(int day)
    {
        return Timestamp.valueOf(LocalDateTime.of(2026, 2, day, 10, 0));
    }

    private List<OsgJobApplication> selectApplications(OsgJobApplication query)
    {
        return applications.stream()
            .filter(item -> query == null || query.getStudentName() == null || item.getStudentName().contains(query.getStudentName()))
            .filter(item -> query == null || query.getCompanyName() == null || query.getCompanyName().isBlank() || Objects.equals(item.getCompanyName(), query.getCompanyName()))
            .filter(item -> query == null || query.getCurrentStage() == null || query.getCurrentStage().isBlank() || Objects.equals(item.getCurrentStage(), query.getCurrentStage()))
            .filter(item -> query == null || query.getLeadMentorId() == null || Objects.equals(item.getLeadMentorId(), query.getLeadMentorId()))
            .filter(item -> query == null || query.getAssignStatus() == null || query.getAssignStatus().isBlank() || Objects.equals(item.getAssignStatus(), query.getAssignStatus()))
            .toList();
    }

    private List<OsgCoaching> selectCoachings(OsgCoaching query)
    {
        return coachings.stream()
            .filter(item -> query == null || query.getApplicationId() == null || Objects.equals(item.getApplicationId(), query.getApplicationId()))
            .filter(item -> query == null || query.getStudentId() == null || Objects.equals(item.getStudentId(), query.getStudentId()))
            .filter(item -> query == null || query.getStatus() == null || query.getStatus().isBlank() || Objects.equals(item.getStatus(), query.getStatus()))
            .toList();
    }

    private int applyAssignmentUpdate(OsgJobApplication update)
    {
        OsgJobApplication target = applications.stream()
            .filter(item -> Objects.equals(item.getApplicationId(), update.getApplicationId()))
            .findFirst()
            .orElse(null);
        if (target == null)
        {
            return 0;
        }
        target.setAssignStatus(update.getAssignStatus());
        target.setCoachingStatus(update.getCoachingStatus());
        target.setUpdateBy(update.getUpdateBy());
        target.setUpdateTime(new Timestamp(System.currentTimeMillis()));
        target.setRemark(update.getRemark());
        return 1;
    }

    private int applyStageUpdate(OsgJobApplication update)
    {
        OsgJobApplication target = applications.stream()
            .filter(item -> Objects.equals(item.getApplicationId(), update.getApplicationId()))
            .findFirst()
            .orElse(null);
        if (target == null)
        {
            return 0;
        }
        if (update.getCurrentStage() != null)
        {
            target.setCurrentStage(update.getCurrentStage());
        }
        if (update.getInterviewTime() != null)
        {
            target.setInterviewTime(update.getInterviewTime());
        }
        if (update.getStageUpdated() != null)
        {
            target.setStageUpdated(update.getStageUpdated());
        }
        target.setUpdateBy(update.getUpdateBy());
        target.setUpdateTime(new Timestamp(System.currentTimeMillis()));
        target.setRemark(update.getRemark());
        return 1;
    }

    private int insertCoaching(OsgCoaching coaching)
    {
        coaching.setCoachingId(300L + coachings.size());
        coachings.add(coaching);
        return 1;
    }

    private int updateCoaching(OsgCoaching update)
    {
        OsgCoaching target = coachings.stream()
            .filter(item -> Objects.equals(item.getCoachingId(), update.getCoachingId()))
            .findFirst()
            .orElse(null);
        if (target == null)
        {
            return 0;
        }
        target.setMentorId(update.getMentorId());
        target.setMentorName(update.getMentorName());
        target.setMentorIds(update.getMentorIds());
        target.setMentorNames(update.getMentorNames());
        target.setMentorBackground(update.getMentorBackground());
        target.setStatus(update.getStatus());
        target.setTotalHours(update.getTotalHours());
        target.setFeedbackSummary(update.getFeedbackSummary());
        target.setAssignNote(update.getAssignNote());
        target.setAssignedAt(update.getAssignedAt());
        target.setConfirmedAt(update.getConfirmedAt());
        target.setUpdateBy(update.getUpdateBy());
        target.setUpdateTime(new Timestamp(System.currentTimeMillis()));
        target.setRemark(update.getRemark());
        return 1;
    }
}
